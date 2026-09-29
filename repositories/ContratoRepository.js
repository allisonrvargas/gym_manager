import { BaseRepository } from './BaseRepository.js';
import { Contrato } from '../models/index.js';

export class ContratoRepository extends BaseRepository {
  constructor(db) {
    super(db, Contrato.collection);
  }

  findActivo(clienteId, planId, session) {
    return this.findOne({ clienteId, planId, estado: 'activo' }, session);
  }

  countActivosPorCliente(clienteId, session) {
    return this.count({ clienteId, estado: 'activo' }, session);
  }

  /**
   * Update CONDICIONADO al estado esperado (control de concurrencia optimista):
   * si otro proceso cambió el estado entre la lectura y la escritura, no modifica nada.
   */
  cambiarEstado(id, estadoEsperado, nuevoEstado, motivo, camposExtra = {}, session) {
    return this.updateOne(
      { _id: id, estado: estadoEsperado },
      {
        $set: { estado: nuevoEstado, ...camposExtra },
        $push: { historialEstados: { estado: nuevoEstado, fecha: new Date(), motivo } },
      },
      session,
    );
  }


  aplicarPago(id, movimientoId, monto, session) {
    const filtro = { _id: id, estado: 'activo' };
    if (monto > 0) filtro.saldoPendiente = { $gte: monto };
    else filtro.montoPagado = { $gte: -monto };

    const pagos = monto > 0
      ? { $concatArrays: [{ $ifNull: ['$pagos', []] }, [movimientoId]] }
      : { $filter: { input: { $ifNull: ['$pagos', []] }, cond: { $ne: ['$$this', movimientoId] } } };

    return this.updateOne(filtro, [{
      $set: {
        montoPagado: { $round: [{ $add: ['$montoPagado', monto] }, 2] },
        saldoPendiente: { $round: [{ $subtract: ['$saldoPendiente', monto] }, 2] },
        pagos,
      },
    }], session);
  }
}
