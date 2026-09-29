import { BusinessRuleError } from './errors.js';

export class MaquinaEstadosContrato {
  static TRANSICIONES = Object.freeze({
    activo: ['finalizado', 'cancelado', 'renovado'],
    finalizado: ['renovado'],
    cancelado: [],
    renovado: [],
  });

  static puedeTransicionar(actual, nuevo) {
    return (MaquinaEstadosContrato.TRANSICIONES[actual] ?? []).includes(nuevo);
  }

  static asegurarTransicion(actual, nuevo) {
    if (!MaquinaEstadosContrato.puedeTransicionar(actual, nuevo)) {
      throw new BusinessRuleError(`Transición no permitida: un contrato "${actual}" no puede pasar a "${nuevo}"`);
    }
  }
}
