import { NotFoundError, BusinessRuleError } from '../utils/errors.js';
import { toObjectId } from '../utils/ids.js';
import { dayjs } from '../utils/dates.js';
import { redondear } from '../utils/numeros.js';
import { EVENTOS } from '../events/EventBus.js';

export class FinanzasService {
  constructor({ movimientoRepo, contratoRepo, clienteRepo, movimientoFactory, tx, eventBus }) {
    Object.assign(this, { movimientoRepo, contratoRepo, clienteRepo, movimientoFactory, tx, eventBus });
  }


  async registrarIngreso(datos) {
    const movimiento = this.movimientoFactory.crearIngreso({
      ...datos,
      clienteId: datos.clienteId && toObjectId(datos.clienteId),
      contratoId: datos.contratoId && toObjectId(datos.contratoId),
    });

    const registrado = await this.tx.run('registrarPago', async (session) => {
      if (movimiento.clienteId && !(await this.clienteRepo.findById(movimiento.clienteId, session))) {
        throw new NotFoundError('Cliente', movimiento.clienteId);
      }

      if (movimiento.categoria === 'mensualidad') {
        const contrato = await this.contratoRepo.findById(movimiento.contratoId, session);
        if (!contrato) throw new NotFoundError('Contrato', movimiento.contratoId);
        if (!contrato.clienteId.equals(movimiento.clienteId)) throw new BusinessRuleError('El contrato no pertenece al cliente indicado');
        if (contrato.estado !== 'activo') throw new BusinessRuleError(`No se reciben pagos en contratos "${contrato.estado}"`);
        if (movimiento.monto > contrato.saldoPendiente) {
          throw new BusinessRuleError(`El monto (${movimiento.monto}) supera el saldo pendiente (${contrato.saldoPendiente})`);
        }
      }

      const insertado = await this.movimientoRepo.insert(movimiento, session);

      if (movimiento.categoria === 'mensualidad') {
        const upd = await this.contratoRepo.aplicarPago(movimiento.contratoId, insertado._id, movimiento.monto, session);
        if (upd.modifiedCount !== 1) {
          // el saldo cambió concurrentemente → se revierte también el insert del movimiento
          throw new BusinessRuleError('No se pudo aplicar el pago al contrato (saldo modificado por otra operación)');
        }
      }
      return insertado;
    });

    this.eventBus.emit(EVENTOS.PAGO_REGISTRADO, { movimientoId: registrado._id, monto: registrado.monto, categoria: registrado.categoria });
    return registrado;
  }

  async registrarEgreso(datos) {
    const movimiento = this.movimientoFactory.crearEgreso({ ...datos, clienteId: datos.clienteId && toObjectId(datos.clienteId) });
    return this.tx.run('registrarEgreso', async (session) => {
      if (movimiento.clienteId && !(await this.clienteRepo.findById(movimiento.clienteId, session))) {
        throw new NotFoundError('Cliente', movimiento.clienteId);
      }
      return this.movimientoRepo.insert(movimiento, session);
    });
  }

  
  async anular(movimientoId, motivo) {
    const _id = toObjectId(movimientoId);
    const anulado = await this.tx.run('anularMovimiento', async (session) => {
      const mov = await this.movimientoRepo.findById(_id, session);
      if (!mov) throw new NotFoundError('Movimiento', movimientoId);
      if (mov.estado === 'anulado') throw new BusinessRuleError('El movimiento ya está anulado');

      const upd = await this.movimientoRepo.updateOne(
        { _id, estado: 'registrado' },
        { $set: { estado: 'anulado', motivoAnulacion: motivo, anuladoEn: new Date() } },
        session,
      );
      if (upd.modifiedCount !== 1) throw new BusinessRuleError('El movimiento fue modificado por otra operación');

      if (mov.categoria === 'mensualidad') {
        const contrato = await this.contratoRepo.findById(mov.contratoId, session);
        if (contrato?.estado !== 'activo') throw new BusinessRuleError('Solo se anulan mensualidades de contratos activos');
        const rev = await this.contratoRepo.aplicarPago(mov.contratoId, _id, -mov.monto, session);
        if (rev.modifiedCount !== 1) throw new BusinessRuleError('No se pudo revertir el pago en el contrato');
      }
      return mov;
    });
    this.eventBus.emit(EVENTOS.MOVIMIENTO_ANULADO, { movimientoId: _id, motivo });
    return anulado;
  }

  listarMovimientos({ desde, hasta, tipo, clienteId, limite = 50 } = {}) {
    const filtro = {};
    if (desde || hasta) filtro.fecha = {};
    if (desde) filtro.fecha.$gte = dayjs(desde).startOf('day').toDate();
    if (hasta) filtro.fecha.$lte = dayjs(hasta).endOf('day').toDate();
    if (tipo) filtro.tipo = tipo;
    if (clienteId) filtro.clienteId = toObjectId(clienteId);
    return this.movimientoRepo.find(filtro, { sort: { fecha: -1, creadoEn: -1 }, limit: limite });
  }

  async balancePorFechas(desde, hasta) {
    if (hasta < desde) throw new BusinessRuleError('La fecha final debe ser posterior a la inicial');
    const filtro = { fecha: { $gte: dayjs(desde).startOf('day').toDate(), $lte: dayjs(hasta).endOf('day').toDate() } };
    return this.#armarBalance(await this.movimientoRepo.balance(filtro));
  }

  async balancePorCliente(clienteId) {
    const _id = toObjectId(clienteId);
    const balance = this.#armarBalance(await this.movimientoRepo.balance({ clienteId: _id }));
    const contratos = await this.contratoRepo.find({ clienteId: _id }, { sort: { creadoEn: -1 } });
    const activos = contratos.filter((c) => c.estado === 'activo');
    return {
      ...balance,
      contratos,
      totalContratado: redondear(activos.reduce((a, c) => a + c.precio, 0)),
      totalPagadoContratos: redondear(activos.reduce((a, c) => a + c.montoPagado, 0)),
      saldoPendiente: redondear(activos.reduce((a, c) => a + c.saldoPendiente, 0)),
    };
  }

  #armarBalance({ porTipo = [], porCategoria = [] } = {}) {
    const total = (tipo) => redondear(porTipo.find((t) => t._id === tipo)?.total ?? 0);
    const ingresos = total('ingreso');
    const egresos = total('egreso');
    return {
      ingresos,
      egresos,
      balance: redondear(ingresos - egresos),
      porCategoria: porCategoria.map((c) => ({ tipo: c._id.tipo, categoria: c._id.categoria, total: redondear(c.total), cantidad: c.cantidad })),
    };
  }
}
