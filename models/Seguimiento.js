import { BaseModel } from './BaseModel.js';
import { PATRONES } from './patrones.js';

const medida = { type: 'number', required: false, min: 10, max: 300, decimals: 1 };

export class Seguimiento extends BaseModel {
  static collection = 'seguimientos';

  static fields = {
    clienteId: { type: 'objectId', required: true },
    contratoId: { type: 'objectId', required: true },
    planId: { type: 'objectId', required: true },
    fecha: { type: 'date', required: true },
    semana: { type: 'integer', required: true, min: 1, max: 104 },
    peso: { type: 'number', required: true, min: 25, max: 350, decimals: 2 }, // kg
    grasaCorporal: { type: 'number', required: false, min: 2, max: 70, decimals: 1 }, // %
    medidas: {
      type: 'object',
      required: false,
      schema: { cintura: medida, cadera: medida, pecho: medida, brazo: medida, pierna: medida }, // cm
    },
    fotos: {
      type: 'array', required: false, maxLength: 10,
      items: { type: 'string', pattern: PATRONES.foto, message: 'debe ser una URL o ruta de imagen (.jpg, .png, .webp)' },
    },
    comentarios: { type: 'string', required: false, maxLength: 500 },
    creadoEn: { type: 'date', required: true },
  };
}
