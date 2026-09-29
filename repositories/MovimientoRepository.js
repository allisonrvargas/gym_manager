import { BaseRepository } from './BaseRepository.js';
import { Movimiento } from '../models/index.js';

export class MovimientoRepository extends BaseRepository {
  constructor(db) {
    super(db, Movimiento.collection);
  }

  /** Totales por tipo y por categoría (solo movimientos no anulados). */
  async balance(filtro) {
    const [resultado] = await this.aggregate([
      { $match: { ...filtro, estado: 'registrado' } },
      {
        $facet: {
          porTipo: [{ $group: { _id: '$tipo', total: { $sum: '$monto' }, cantidad: { $sum: 1 } } }],
          porCategoria: [
            { $group: { _id: { tipo: '$tipo', categoria: '$categoria' }, total: { $sum: '$monto' }, cantidad: { $sum: 1 } } },
            { $sort: { '_id.tipo': 1, total: -1 } },
          ],
        },
      },
    ]);
    return resultado;
  }
}
