import { EventEmitter } from 'node:events';


export class EventBus extends EventEmitter {}

export const EVENTOS = Object.freeze({
  CLIENTE_ELIMINADO: 'cliente:eliminado',
  CONTRATO_CREADO: 'contrato:creado',
  CONTRATO_CANCELADO: 'contrato:cancelado',
  CONTRATO_FINALIZADO: 'contrato:finalizado',
  CONTRATO_RENOVADO: 'contrato:renovado',
  SEGUIMIENTO_REGISTRADO: 'seguimiento:registrado',
  SEGUIMIENTO_ELIMINADO: 'seguimiento:eliminado',
  PAGO_REGISTRADO: 'finanzas:pago-registrado',
  MOVIMIENTO_ANULADO: 'finanzas:movimiento-anulado',
  TX_COMMIT: 'transaccion:commit',
  TX_ROLLBACK: 'transaccion:rollback',
});
