import { BaseRepository } from './BaseRepository.js';
import { RegistroAlimento } from '../models/index.js';

export class RegistroAlimentoRepository extends BaseRepository {
  constructor(db) {
    super(db, RegistroAlimento.collection);
  }

  /** Calorías agrupadas por día y comida dentro de un rango de fechas. */
  resumenPorDia(planNutricionalId, desde, hasta, zonaHoraria) {
    return this.aggregate([
      { $match: { planNutricionalId, fecha: { $gte: desde, $lte: hasta } } },
      {
        $group: {
          _id: {
            dia: { $dateToString: { format: '%Y-%m-%d', date: '$fecha', timezone: zonaHoraria } },
            comida: '$comida',
          },
          calorias: { $sum: '$calorias' },
          items: { $sum: 1 },
        },
      },
      { $sort: { '_id.dia': 1 } },
    ]);
  }
}
