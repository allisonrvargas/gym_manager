import { PlanNutricional, RegistroAlimento, COMIDAS } from '../models/index.js';
import { NotFoundError, BusinessRuleError } from '../utils/errors.js';
import { toObjectId } from '../utils/ids.js';
import { dayjs, formatFecha } from '../utils/dates.js';
import { redondear } from '../utils/numeros.js';

export class NutricionService {
  constructor({ planNutricionalRepo, registroAlimentoRepo, contratoRepo, tx, zonaHoraria }) {
    Object.assign(this, { planNutricionalRepo, registroAlimentoRepo, contratoRepo, tx, zonaHoraria });
  }


  async crearPlan(contratoId, datos) {
    const _id = toObjectId(contratoId);
    return this.tx.run('crearPlanNutricional', async (session) => {
      const contrato = await this.contratoRepo.findById(_id, session);
      if (!contrato) throw new NotFoundError('Contrato', contratoId);
      if (contrato.estado !== 'activo') throw new BusinessRuleError('Solo se crean planes nutricionales sobre contratos activos');

      const plan = PlanNutricional.build({
        ...datos,
        clienteId: contrato.clienteId,
        contratoId: _id,
        planId: contrato.planId,
        estado: 'activo',
        creadoEn: new Date(),
      });
      await this.planNutricionalRepo.updateMany({ contratoId: _id, estado: 'activo' }, { $set: { estado: 'inactivo' } }, session);
      return this.planNutricionalRepo.insert(plan, session);
    });
  }

  listarPorCliente(clienteId, { soloActivos = false } = {}) {
    const filtro = { clienteId: toObjectId(clienteId) };
    if (soloActivos) filtro.estado = 'activo';
    return this.planNutricionalRepo.find(filtro, { sort: { creadoEn: -1 } });
  }

  async registrarAlimento(planNutricionalId, datos) {
    const _id = toObjectId(planNutricionalId);
    const plan = await this.planNutricionalRepo.findById(_id);
    if (!plan) throw new NotFoundError('Plan nutricional', planNutricionalId);
    if (plan.estado !== 'activo') throw new BusinessRuleError('El plan nutricional está inactivo');

    const contrato = await this.contratoRepo.findById(plan.contratoId);
    if (contrato?.estado !== 'activo') throw new BusinessRuleError('El contrato asociado no está activo');

    const fecha = datos.fecha ?? dayjs().startOf('day').toDate();
    if (fecha < contrato.fechaInicio || fecha >= contrato.fechaFin) {
      throw new BusinessRuleError(`La fecha debe estar dentro de la vigencia (${formatFecha(contrato.fechaInicio)} a ${formatFecha(contrato.fechaFin)})`);
    }
    if (dayjs(fecha).isAfter(dayjs().endOf('day'))) throw new BusinessRuleError('No se registran alimentos en fechas futuras');

    const registro = RegistroAlimento.build({ ...datos, fecha, planNutricionalId: _id, clienteId: plan.clienteId, creadoEn: new Date() });
    return this.registroAlimentoRepo.insert(registro);
  }

  /** Reporte de lunes a domingo de la semana que contiene `fechaReferencia`. */
  async reporteSemanal(planNutricionalId, fechaReferencia = new Date()) {
    const _id = toObjectId(planNutricionalId);
    const plan = await this.planNutricionalRepo.findById(_id);
    if (!plan) throw new NotFoundError('Plan nutricional', planNutricionalId);

    const desde = dayjs(fechaReferencia).startOf('isoWeek');
    const hasta = dayjs(fechaReferencia).endOf('isoWeek');
    const filas = await this.registroAlimentoRepo.resumenPorDia(_id, desde.toDate(), hasta.toDate(), this.zonaHoraria);

    const dias = Array.from({ length: 7 }, (_, i) => {
      const dia = desde.add(i, 'day');
      const clave = dia.format('YYYY-MM-DD');
      const porComida = Object.fromEntries(COMIDAS.map((c) => [c, 0]));
      filas.filter((f) => f._id.dia === clave).forEach((f) => { porComida[f._id.comida] = redondear(f.calorias, 1); });
      const total = redondear(Object.values(porComida).reduce((a, b) => a + b, 0), 1);
      return { fecha: clave, diaSemana: dia.format('dddd'), porComida, total, diferencia: redondear(total - plan.caloriasObjetivo, 1) };
    });

    const conRegistro = dias.filter((d) => d.total > 0);
    const totalSemana = redondear(dias.reduce((a, d) => a + d.total, 0), 1);
    return {
      plan,
      desde: desde.toDate(),
      hasta: hasta.toDate(),
      dias,
      totalSemana,
      promedioDiario: conRegistro.length ? redondear(totalSemana / conRegistro.length, 1) : 0,
      diasRegistrados: conRegistro.length,
      diasSobreObjetivo: conRegistro.filter((d) => d.diferencia > 0).length,
    };
  }
}
