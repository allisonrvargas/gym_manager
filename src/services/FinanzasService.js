import { ObjectId } from 'mongodb';
import dayjs from 'dayjs';

export class FinanzasService {
  constructor(db) {
    this.db = db;
    this.coleccion = db.collection('movimientos');
  }

  async generarReporteMensual({ mes, anio, clienteId = null }) {
    const fechaInicio = dayjs(`${anio}-${mes}-01`).startOf('month').toDate();
    const fechaFin = dayjs(`${anio}-${mes}-01`).endOf('month').toDate();

    const matchStage = {
      fecha: { $gte: fechaInicio,$lte: fechaFin }
    };

    if (clienteId) {
      matchStage.clienteId = new ObjectId(clienteId);
    }

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: { tipo: '$tipo', categoria: '$categoria' },
          total: { $sum: '$monto' },
          cantidad: { $sum: 1 }         }       },       {$group: {
          _id: '$_id.tipo',
          categorias: {
            $push: {
              categoria: '$_id.categoria',
              monto: '$total',
              cantidad: '$cantidad'
            }
          },
          subtotal: { $sum: '$total' }
        }
      }
    ];

    const resultados = await this.coleccion.aggregate(pipeline).toArray();

    let totalIngresos = 0;
    let totalEgresos = 0;
    const desgloseIngresos = {};
    const desgloseEgresos = {};

    resultados.forEach((grupo) => {
      if (grupo._id === 'INGRESO') {
        totalIngresos = grupo.subtotal;
        grupo.categorias.forEach((c) => (desgloseIngresos[c.categoria] = c.monto));
      } else if (grupo._id === 'EGRESO') {
        totalEgresos = grupo.subtotal;
        grupo.categorias.forEach((c) => (desgloseEgresos[c.categoria] = c.monto));
      }
    });

    return {
      periodo: `${mes}/${anio}`,
      totalIngresos,
      totalEgresos,
      balanceNeto: totalIngresos - totalEgresos,
      desglose: {
        ingresos: desgloseIngresos,
        egresos: desgloseEgresos
      }
    };
  }
}
