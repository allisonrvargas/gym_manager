export class AppError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends AppError {
  constructor(errores) {
    super(`Datos inválidos:\n  - ${errores.join('\n  - ')}`);
    this.errores = errores;
  }
}

export class NotFoundError extends AppError {
  constructor(entidad, id) {
    super(`${entidad} no encontrado${id ? ` (id: ${id})` : ''}`);
  }
}

/** Violación de una regla de negocio. Dentro de una transacción provoca ROLLBACK. */
export class BusinessRuleError extends AppError {}
