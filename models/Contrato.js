import { BaseModel } from './BaseModel.js';
import { ESTADOS_CONTRATO } from './constantes.js';

export class Contrato extends BaseModel {
  static collection = 'contratos';

  static fields = {
    clienteId: { type: 'objectId', required: true },
    planId: { type: 'objectId', required: true },
    clienteNombre: { type: 'string', required: true, maxLength: 130 }, // snapshot histórico
    planNombre: { type: 'string', required: true, maxLength: 80 },     // snapshot histórico
    condiciones: { type: 'string', required: true, minLength: 10, maxLength: 2000 },
    duracionSemanas: { type: 'integer', required: true, min: 1, max: 104 },
    precio: { type: 'number', required: true, min: 0, decimals: 2 },
    montoPagado: { type: 'number', required: true, min: 0, decimals: 2 },
    saldoPendiente: { type: 'number', required: true, min: 0, decimals: 2 },
    fechaInicio: { type: 'date', required: true },
    fechaFin: { type: 'date', required: true },
    estado: { type: 'string', required: true, enum: ESTADOS_CONTRATO },
    historialEstados: {
      type: 'array',
      required: true,
      minLength: 1,
      items: {
        type: 'object',
        schema: {
          estado: { type: 'string', required: true, enum: ESTADOS_CONTRATO },
          fecha: { type: 'date', required: true },
          motivo: { type: 'string', required: false, maxLength: 200 },
        },
      },
    },
    totalSeguimientos: { type: 'integer', required: true, min: 0 },
    pagos: { type: 'array', required: false, items: { type: 'objectId' } },
    contratoAnteriorId: { type: 'objectId', required: false },
    ultimoSeguimiento: { type: 'date', required: false },
    saldoAnulado: { type: 'number', required: false, min: 0 },  // saldo condonado al cancelar
    canceladoEn: { type: 'date', required: false },
    finalizadoEn: { type: 'date', required: false },
    renovadoEn: { type: 'date', required: false },
    creadoEn: { type: 'date', required: true },
  };

  static reglas(doc) {
    const errores = [];
    if (doc.fechaFin <= doc.fechaInicio) errores.push('fechaFin: debe ser posterior a fechaInicio');
    if (Math.abs(doc.montoPagado + doc.saldoPendiente - doc.precio) > 0.01) {
      errores.push('saldo: montoPagado + saldoPendiente debe ser igual al precio');
    }
    return errores;
  }
}
