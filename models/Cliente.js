import { BaseModel } from './BaseModel.js';
import { PATRONES } from './patrones.js';
import { dayjs } from '../utils/dates.js';

export class Cliente extends BaseModel {
  static collection = 'clientes';
  static inmutables = ['planes', 'creadoEn'];

  static fields = {
    nombre: { type: 'string', required: true, minLength: 2, maxLength: 60, pattern: PATRONES.nombre, message: 'solo letras y espacios' },
    apellido: { type: 'string', required: true, minLength: 2, maxLength: 60, pattern: PATRONES.nombre, message: 'solo letras y espacios' },
    documento: { type: 'string', required: true, pattern: PATRONES.documento, message: 'debe tener entre 6 y 12 dígitos' },
    email: { type: 'string', required: true, maxLength: 120, pattern: PATRONES.email, message: 'formato de correo inválido' },
    telefono: { type: 'string', required: true, pattern: PATRONES.telefono, message: 'entre 7 y 15 dígitos (opcionalmente con +)' },
    fechaNacimiento: {
      type: 'date',
      required: true,
      validate: (v) => {
        const edad = dayjs().diff(v, 'year');
        return edad < 14 || edad > 100 ? 'la edad debe estar entre 14 y 100 años' : null;
      },
    },
    objetivo: { type: 'string', required: false, maxLength: 200 },
    planes: { type: 'array', required: true, items: { type: 'objectId' } }, // planes con contrato ACTIVO
    activo: { type: 'boolean', required: true },
    creadoEn: { type: 'date', required: true },
    actualizadoEn: { type: 'date', required: true },
  };
}
