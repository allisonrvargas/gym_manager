import { BaseModel } from './BaseModel.js';
import { NIVELES, ESTADOS_PLAN } from './constantes.js';

export class PlanEntrenamiento extends BaseModel {
  static collection = 'planes';
  static inmutables = ['clientes', 'creadoEn'];

  static fields = {
    nombre: { type: 'string', required: true, minLength: 3, maxLength: 80 },
    descripcion: { type: 'string', required: false, maxLength: 300 },
    duracionSemanas: { type: 'integer', required: true, min: 1, max: 104 },
    metas: {
      type: 'array', required: true, minLength: 1, maxLength: 10,
      items: { type: 'string', minLength: 3, maxLength: 100 },
    },
    nivel: { type: 'string', required: true, enum: NIVELES },
    precioMensual: { type: 'number', required: true, min: 0, max: 100_000_000, decimals: 2 },
    clientes: { type: 'array', required: true, items: { type: 'objectId' } }, // clientes con contrato ACTIVO
    estado: { type: 'string', required: true, enum: ESTADOS_PLAN },
    creadoEn: { type: 'date', required: true },
    actualizadoEn: { type: 'date', required: true },
  };
}
