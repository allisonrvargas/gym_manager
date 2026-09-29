import { BaseModel } from './BaseModel.js';
import { ESTADOS_PLAN } from './constantes.js';

export class PlanNutricional extends BaseModel {
  static collection = 'planesNutricionales';

  static fields = {
    clienteId: { type: 'objectId', required: true },
    contratoId: { type: 'objectId', required: true },
    planId: { type: 'objectId', required: true },
    nombre: { type: 'string', required: true, minLength: 3, maxLength: 80 },
    caloriasObjetivo: { type: 'integer', required: true, min: 800, max: 6000 }, // kcal diarias
    descripcion: { type: 'string', required: false, maxLength: 500 },
    estado: { type: 'string', required: true, enum: ESTADOS_PLAN },
    creadoEn: { type: 'date', required: true },
  };
}
