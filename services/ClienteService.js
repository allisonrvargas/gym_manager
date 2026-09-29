import { Cliente } from '../models/index.js';
import { NotFoundError, BusinessRuleError } from '../utils/errors.js';
import { toObjectId } from '../utils/ids.js';
import { EVENTOS } from '../events/EventBus.js';

const esDuplicado = (e) => e?.code === 11000;

/** SRP: únicamente reglas de negocio de clientes. DIP: recibe sus dependencias por constructor. */
export class ClienteService {
  constructor({ clienteRepo, planRepo, contratoRepo, seguimientoRepo, planNutricionalRepo, registroAlimentoRepo, tx, eventBus }) {
    Object.assign(this, { clienteRepo, planRepo, contratoRepo, seguimientoRepo, planNutricionalRepo, registroAlimentoRepo, tx, eventBus });
  }

  async crear(datos) {
    const ahora = new Date();
    const cliente = Cliente.build({ ...datos, planes: [], activo: true, creadoEn: ahora, actualizadoEn: ahora });
    if (await this.clienteRepo.findByDocumento(cliente.documento)) {
      throw new BusinessRuleError(`Ya existe un cliente con el documento ${cliente.documento}`);
    }
    try {
      return await this.clienteRepo.insert(cliente);
    } catch (e) {
      if (esDuplicado(e)) throw new BusinessRuleError('El documento o el email ya están registrados');
      throw e;
    }
  }

  listar() {
    return this.clienteRepo.find({}, { sort: { apellido: 1, nombre: 1 } });
  }

  async obtener(id) {
    const cliente = await this.clienteRepo.findById(toObjectId(id));
    if (!cliente) throw new NotFoundError('Cliente', id);
    return cliente;
  }

  async actualizar(id, cambios) {
    const _id = toObjectId(id);
    const doc = Cliente.buildUpdate({ ...cambios, actualizadoEn: new Date() });
    try {
      const { matchedCount } = await this.clienteRepo.updateById(_id, { $set: doc });
      if (!matchedCount) throw new NotFoundError('Cliente', id);
    } catch (e) {
      if (esDuplicado(e)) throw new BusinessRuleError('El documento o el email ya pertenecen a otro cliente');
      throw e;
    }
    return this.obtener(_id);
  }


  async eliminar(id) {
    const _id = toObjectId(id);
    const resumen = await this.tx.run('eliminarCliente', async (session) => {
      const cliente = await this.clienteRepo.findById(_id, session);
      if (!cliente) throw new NotFoundError('Cliente', id);

      const activos = await this.contratoRepo.countActivosPorCliente(_id, session);
      if (activos > 0) {
        throw new BusinessRuleError(`El cliente tiene ${activos} contrato(s) activo(s). Cancélelos o finalícelos primero.`);
      }

      const seguimientos = await this.seguimientoRepo.deleteMany({ clienteId: _id }, session);
      const alimentos = await this.registroAlimentoRepo.deleteMany({ clienteId: _id }, session);
      await this.planNutricionalRepo.deleteMany({ clienteId: _id }, session);
      await this.planRepo.updateMany({ clientes: _id }, { $pull: { clientes: _id } }, session);
      await this.clienteRepo.deleteById(_id, session);

      return { cliente, seguimientos: seguimientos.deletedCount, alimentos: alimentos.deletedCount };
    });
    this.eventBus.emit(EVENTOS.CLIENTE_ELIMINADO, { clienteId: _id, documento: resumen.cliente.documento });
    return resumen;
  }
}
