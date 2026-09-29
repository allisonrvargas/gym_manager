import { BaseModel } from './BaseModel.js';
import { COMIDAS } from './constantes.js';

export class RegistroAlimento extends BaseModel {
  static collection = 'registrosAlimentos';

  static fields = {
    planNutricionalId: { type: 'objectId', required: true },
    clienteId: { type: 'objectId', required: true },
    fecha: { type: 'date', required: true },
    comida: { type: 'string', required: true, enum: COMIDAS },
    alimento: { type: 'string', required: true, minLength: 2, maxLength: 100 },
    cantidad: { type: 'string', required: true, minLength: 1, maxLength: 50 },
    calorias: { type: 'number', required: true, min: 0, max: 5000, decimals: 1 },
    creadoEn: { type: 'date', required: true },
  };
}
