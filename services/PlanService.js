import { PlanEntrenamiento } from '../models/index.js';
import { NotFoundError, BusinessRuleError } from '../utils/errors.js';
import { toObjectId } from '../utils/ids.js';

const esDuplicado = (e) => e?.code === 11000;

export class PlanService {
  constructor({ planRepo, contratoRepo, tx }) {
    Object.assign(this, { planRepo, contratoRepo, tx });
  }

  async crear(datos) {
    const ahora = new Date();
    const plan = PlanEntrenamiento.build({ ...datos, clientes: [], estado: 'activo', creadoEn: ahora, actualizadoEn: ahora });
    try {
      return await this.planRepo.insert(plan);
    } catch (e) {
      if (esDuplicado(e)) throw new BusinessRuleError(`Ya existe un plan llamado "${plan.nombre}"`);
      throw e;
    }
  }

  listar({ soloActivos = false } = {}) {
    return soloActivos ? this.planRepo.findActivos() : this.planRepo.find({}, { sort: { nombre: 1 } });
  }

  async obtener(id) {
    const plan = await this.planRepo.findById(toObjectId(id));
    if (!plan) throw new NotFoundError('Plan', id);
    return plan;
  }

  /** Los cambios de precio/duración solo afectan contratos FUTUROS (los contratos guardan sus propios valores). */
  async actualizar(id, cambios) {
    const _id = toObjectId(id);
    const doc = PlanEntrenamiento.buildUpdate({ ...cambios, actualizadoEn: new Date() });
    try {
      const { matchedCount } = await this.planRepo.updateById(_id, { $set: doc });
      if (!matchedCount) throw new NotFoundError('Plan', id);
    } catch (e) {
      if (esDuplicado(e)) throw new BusinessRuleError('Ya existe otro plan con ese nombre');
      throw e;
    }
    return this.obtener(_id);
  }


  async eliminar(id) {
    const _id = toObjectId(id);
    return this.tx.run('eliminarPlan', async (session) => {
      const plan = await this.planRepo.findById(_id, session);
      if (!plan) throw new NotFoundError('Plan', id);
      const contratos = await this.contratoRepo.count({ planId: _id }, session);
      if (contratos > 0) {
        throw new BusinessRuleError(`El plan tiene ${contratos} contrato(s) asociados. Inactívelo en lugar de eliminarlo.`);
      }
      await this.planRepo.deleteById(_id, session);
      return plan;
    });
  }
}
