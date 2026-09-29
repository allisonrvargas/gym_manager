import { BaseModel } from './BaseModel.js';
import { TIPOS_MOVIMIENTO, CATEGORIAS, METODOS_PAGO, ESTADOS_MOVIMIENTO } from './constantes.js';

export class Movimiento extends BaseModel {
  static collection = 'movimientos';

  static fields = {
    tipo: { type: 'string', required: true, enum: TIPOS_MOVIMIENTO },
    categoria: {
      type: 'string',
      required: true,
      validate: (valor, doc) => (CATEGORIAS[doc.tipo]?.includes(valor)
        ? null
        : `para "${doc.tipo}" debe ser una de [${(CATEGORIAS[doc.tipo] ?? []).join(', ')}]`),
    },
    monto: { type: 'number', required: true, min: 0.01, max: 1_000_000_000, decimals: 2 },
    fecha: { type: 'date', required: true },
    descripcion: { type: 'string', required: true, minLength: 3, maxLength: 200 },
    metodoPago: { type: 'string', required: true, enum: METODOS_PAGO },
    clienteId: { type: 'objectId', required: false },
    contratoId: { type: 'objectId', required: false },
    estado: { type: 'string', required: true, enum: ESTADOS_MOVIMIENTO },
    motivoAnulacion: { type: 'string', required: false, maxLength: 200 },
    anuladoEn: { type: 'date', required: false },
    creadoEn: { type: 'date', required: true },
  };

  static reglas(doc) {
    const errores = [];
    if (doc.categoria === 'mensualidad' && (!doc.clienteId || !doc.contratoId)) {
      errores.push('una mensualidad requiere clienteId y contratoId');
    }
    if (doc.categoria === 'sesion_individual' && !doc.clienteId) {
      errores.push('una sesión individual requiere clienteId');
    }
    if (doc.tipo === 'egreso' && doc.contratoId) {
      errores.push('un egreso no puede asociarse a un contrato');
    }
    if (doc.fecha > new Date()) errores.push('fecha: no puede ser futura');
    return errores;
  }
}
