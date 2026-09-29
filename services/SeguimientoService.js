import { Seguimiento } from '../models/index.js';
import { NotFoundError, BusinessRuleError } from '../utils/errors.js';
import { toObjectId } from '../utils/ids.js';
import { dayjs, formatFecha } from '../utils/dates.js';
import { redondear } from '../utils/numeros.js';
import { EVENTOS } from '../events/EventBus.js';

export class SeguimientoService {
  constructor({ seguimientoRepo, contratoRepo, tx, eventBus }) {
    Object.assign(this, { seguimientoRepo, contratoRepo, tx, eventBus });
  }

  static calcularSemana(fechaInicio, fecha) {
    const dias = dayjs(fecha).startOf('day').diff(dayjs(fechaInicio).startOf('day'), 'day');
    return Math.floor(dias / 7) + 1;
  }


  async registrar(contratoId, datos) {
    const _id = toObjectId(contratoId);
    const registro = await this.tx.run('registrarSeguimiento', async (session) => {
      const contrato = await this.contratoRepo.findById(_id, session);
      if (!contrato) throw new NotFoundError('Contrato', contratoId);
      if (contrato.estado !== 'activo') throw new BusinessRuleError(`Solo se registran avances en contratos activos (estado: ${contrato.estado})`);

      const fecha = datos.fecha ?? dayjs().startOf('day').toDate();
      if (fecha < contrato.fechaInicio || fecha >= contrato.fechaFin) {
        throw new BusinessRuleError(`La fecha debe estar dentro de la vigencia (${formatFecha(contrato.fechaInicio)} a ${formatFecha(contrato.fechaFin)})`);
      }
      if (dayjs(fecha).isAfter(dayjs().endOf('day'))) throw new BusinessRuleError('No se registran avances en fechas futuras');

      const semana = SeguimientoService.calcularSemana(contrato.fechaInicio, fecha);
      if (await this.seguimientoRepo.findOne({ contratoId: _id, semana }, session)) {
        throw new BusinessRuleError(`Ya existe un registro para la semana ${semana} de este contrato`);
      }

      const doc = Seguimiento.build({
        ...datos, fecha, semana,
        clienteId: contrato.clienteId, contratoId: _id, planId: contrato.planId, creadoEn: new Date(),
      });
      const insertado = await this.seguimientoRepo.insert(doc, session);
      await this.contratoRepo.updateById(_id, { $inc: { totalSeguimientos: 1 }, $max: { ultimoSeguimiento: fecha } }, session);
      return insertado;
    });
    this.eventBus.emit(EVENTOS.SEGUIMIENTO_REGISTRADO, { seguimientoId: registro._id, contratoId: _id });
    return registro;
  }

  /** Progreso cronológico con variaciones respecto a la semana anterior y a la línea base. */
  async progreso(contratoId) {
    const _id = toObjectId(contratoId);
    const contrato = await this.contratoRepo.findById(_id);
    if (!contrato) throw new NotFoundError('Contrato', contratoId);
    const registros = await this.seguimientoRepo.findByContrato(_id);

    const conVariacion = registros.map((r, i) => {
      const previo = registros[i - 1];
      return {
        ...r,
        deltaPeso: previo ? redondear(r.peso - previo.peso) : null,
        deltaGrasa: previo && r.grasaCorporal != null && previo.grasaCorporal != null
          ? redondear(r.grasaCorporal - previo.grasaCorporal, 1) : null,
      };
    });

    const inicial = registros[0];
    const actual = registros.at(-1);
    const resumen = inicial ? {
      pesoInicial: inicial.peso,
      pesoActual: actual.peso,
      cambioPeso: redondear(actual.peso - inicial.peso),
      grasaInicial: inicial.grasaCorporal,
      grasaActual: actual.grasaCorporal,
      semanasRegistradas: registros.length,
    } : null;

    return { contrato, registros: conVariacion, resumen };
  }

 
  async eliminar(seguimientoId) {
    const _id = toObjectId(seguimientoId);
    const eliminado = await this.tx.run('eliminarSeguimiento', async (session) => {
      const seguimiento = await this.seguimientoRepo.findById(_id, session);
      if (!seguimiento) throw new NotFoundError('Registro de seguimiento', seguimientoId);
      const contrato = await this.contratoRepo.findById(seguimiento.contratoId, session);
      if (!contrato) throw new NotFoundError('Contrato', seguimiento.contratoId);

      // --- Escritura ---
      await this.seguimientoRepo.deleteById(_id, session);
      await this.contratoRepo.updateById(contrato._id, { $inc: { totalSeguimientos: -1 } }, session);

      // --- Verificación de consistencia (si falla → ROLLBACK) ---
      if (contrato.estado !== 'activo') {
        throw new BusinessRuleError(`El contrato está "${contrato.estado}": su historial es inmutable`);
      }
      const restantes = await this.seguimientoRepo.findByContrato(contrato._id, session);
      if (seguimiento.semana === 1 && restantes.length > 0) {
        throw new BusinessRuleError('No se puede eliminar la medición inicial (semana 1) mientras existan registros posteriores: es la línea base del plan');
      }
      const actualizado = await this.contratoRepo.findById(contrato._id, session);
      if (actualizado.totalSeguimientos !== restantes.length) {
        throw new BusinessRuleError('Inconsistencia en el contador de seguimientos del contrato');
      }

      const ultimo = restantes.at(-1);
      await this.contratoRepo.updateById(
        contrato._id,
        ultimo ? { $set: { ultimoSeguimiento: ultimo.fecha } } : { $unset: { ultimoSeguimiento: '' } },
        session,
      );
      return seguimiento;
    });
    this.eventBus.emit(EVENTOS.SEGUIMIENTO_ELIMINADO, { seguimientoId: _id, contratoId: eliminado.contratoId });
    return eliminado;
  }
}
