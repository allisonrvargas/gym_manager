import { NotFoundError, BusinessRuleError } from '../utils/errors.js';
import { toObjectId } from '../utils/ids.js';
import { MaquinaEstadosContrato } from '../utils/MaquinaEstadosContrato.js';
import { dayjs } from '../utils/dates.js';
import { EVENTOS } from '../events/EventBus.js';


export class ContratoService {
  constructor({ contratoRepo, clienteRepo, planRepo, seguimientoRepo, planNutricionalRepo, registroAlimentoRepo, contratoFactory, tx, eventBus }) {
    Object.assign(this, { contratoRepo, clienteRepo, planRepo, seguimientoRepo, planNutricionalRepo, registroAlimentoRepo, contratoFactory, tx, eventBus });
  }

  listar({ clienteId, estados } = {}) {
    const filtro = {};
    if (clienteId) filtro.clienteId = toObjectId(clienteId);
    if (estados?.length) filtro.estado = { $in: estados };
    return this.contratoRepo.find(filtro, { sort: { creadoEn: -1 } });
  }

  async obtener(id) {
    const contrato = await this.contratoRepo.findById(toObjectId(id));
    if (!contrato) throw new NotFoundError('Contrato', id);
    return contrato;
  }

  async asignar({ clienteIds, planIds, fechaInicio, condiciones }) {
    const pares = clienteIds.flatMap((c) => planIds.map((p) => [toObjectId(c), toObjectId(p)]));
    if (!pares.length) throw new BusinessRuleError('Debe indicar al menos un cliente y un plan');

    const creados = await this.tx.run('asignarPlan', async (session) => {
      const contratos = [];
      for (const [clienteId, planId] of pares) {
        contratos.push(await this.#crearContrato(clienteId, planId, { fechaInicio, condiciones }, session));
      }
      return contratos;
    });

    creados.forEach((c) => this.eventBus.emit(EVENTOS.CONTRATO_CREADO, { contratoId: c._id, clienteId: c.clienteId, planId: c.planId }));
    return creados;
  }

  async #crearContrato(clienteId, planId, { fechaInicio, condiciones, contratoAnteriorId }, session) {
    const cliente = await this.clienteRepo.findById(clienteId, session);
    if (!cliente) throw new NotFoundError('Cliente', clienteId);
    const plan = await this.planRepo.findById(planId, session);
    if (!plan) throw new NotFoundError('Plan', planId);
    if (plan.estado !== 'activo') throw new BusinessRuleError(`El plan "${plan.nombre}" está inactivo`);

    if (await this.contratoRepo.findActivo(clienteId, planId, session)) {
      throw new BusinessRuleError(`${cliente.nombre} ${cliente.apellido} ya tiene un contrato activo del plan "${plan.nombre}"`);
    }

    const contrato = this.contratoFactory.crear({ cliente, plan, fechaInicio, condiciones, contratoAnteriorId });
    let insertado;
    try {
      insertado = await this.contratoRepo.insert(contrato, session);
    } catch (e) {
      if (e?.code === 11000) throw new BusinessRuleError('Ya existe un contrato activo para ese cliente y plan');
      throw e;
    }
    await this.clienteRepo.updateById(clienteId, { $addToSet: { planes: planId }, $set: { actualizadoEn: new Date() } }, session);
    await this.planRepo.updateById(planId, { $addToSet: { clientes: clienteId } }, session);
    return insertado;
  }

  async #desasociar(contrato, session) {
    await this.clienteRepo.updateById(contrato.clienteId, { $pull: { planes: contrato.planId }, $set: { actualizadoEn: new Date() } }, session);
    await this.planRepo.updateById(contrato.planId, { $pull: { clientes: contrato.clienteId } }, session);
  }

  static #asegurarModificado(resultado) {
    if (resultado.modifiedCount !== 1) {
      throw new BusinessRuleError('El contrato fue modificado por otra operación. Intente de nuevo.');
    }
  }

 
  async cancelar(id, motivo = 'Cancelado por el cliente') {
    const _id = toObjectId(id);
    const resultado = await this.tx.run('cancelarPlan', async (session) => {
      const contrato = await this.contratoRepo.findById(_id, session);
      if (!contrato) throw new NotFoundError('Contrato', id);
      MaquinaEstadosContrato.asegurarTransicion(contrato.estado, 'cancelado');

      const seguimientos = await this.seguimientoRepo.deleteMany({ contratoId: _id }, session);
      const planesNutri = await this.planNutricionalRepo.find({ contratoId: _id }, { session });
      const alimentos = await this.registroAlimentoRepo.deleteMany({ planNutricionalId: { $in: planesNutri.map((p) => p._id) } }, session);
      await this.planNutricionalRepo.deleteMany({ contratoId: _id }, session);

      const upd = await this.contratoRepo.cambiarEstado(_id, 'activo', 'cancelado', motivo, {
        saldoAnulado: contrato.saldoPendiente,
        saldoPendiente: 0,
        totalSeguimientos: 0,
        canceladoEn: new Date(),
      }, session);
      ContratoService.#asegurarModificado(upd);
      await this.#desasociar(contrato, session);

      return {
        contrato,
        seguimientosEliminados: seguimientos.deletedCount,
        planesNutricionalesEliminados: planesNutri.length,
        alimentosEliminados: alimentos.deletedCount,
      };
    });
    this.eventBus.emit(EVENTOS.CONTRATO_CANCELADO, { contratoId: _id, motivo });
    return resultado;
  }

  /** ⚠️ ACCIÓN CRÍTICA — Finalizar: solo contratos activos y con saldo en cero. */
  async finalizar(id) {
    const _id = toObjectId(id);
    const contrato = await this.tx.run('finalizarPlan', async (session) => {
      const c = await this.contratoRepo.findById(_id, session);
      if (!c) throw new NotFoundError('Contrato', id);
      MaquinaEstadosContrato.asegurarTransicion(c.estado, 'finalizado');
      if (c.saldoPendiente > 0) {
        throw new BusinessRuleError(`No se puede finalizar: el contrato tiene saldo pendiente de ${c.saldoPendiente}`);
      }
      const upd = await this.contratoRepo.cambiarEstado(_id, 'activo', 'finalizado', 'Plan completado', { finalizadoEn: new Date() }, session);
      ContratoService.#asegurarModificado(upd);
      await this.#desasociar(c, session);
      return c;
    });
    this.eventBus.emit(EVENTOS.CONTRATO_FINALIZADO, { contratoId: _id });
    return contrato;
  }

 
  async renovar(id, { condiciones } = {}) {
    const _id = toObjectId(id);
    const nuevo = await this.tx.run('renovarPlan', async (session) => {
      const actual = await this.contratoRepo.findById(_id, session);
      if (!actual) throw new NotFoundError('Contrato', id);
      MaquinaEstadosContrato.asegurarTransicion(actual.estado, 'renovado');
      if (actual.saldoPendiente > 0) {
        throw new BusinessRuleError('No se puede renovar un contrato con saldo pendiente');
      }

      // 1° cerrar el actual (libera el índice único de contrato activo)
      const upd = await this.contratoRepo.cambiarEstado(_id, actual.estado, 'renovado', 'Contrato renovado', { renovadoEn: new Date() }, session);
      ContratoService.#asegurarModificado(upd);

      // 2° generar el nuevo contrato
      const hoy = dayjs().startOf('day');
      const fechaInicio = actual.estado === 'activo' && dayjs(actual.fechaFin).isAfter(hoy) ? actual.fechaFin : hoy.toDate();
      return this.#crearContrato(actual.clienteId, actual.planId, { fechaInicio, condiciones, contratoAnteriorId: _id }, session);
    });
    this.eventBus.emit(EVENTOS.CONTRATO_RENOVADO, { contratoAnteriorId: _id, contratoNuevoId: nuevo._id });
    return nuevo;
  }
}
