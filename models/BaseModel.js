import { Validator } from '../utils/Validator.js';
import { ValidationError } from '../utils/errors.js';

export class BaseModel {
  static collection = null;
  static fields = {};
  static inmutables = ['creadoEn'];

  static reglas(/* doc */) {
    return [];
  }

  static validate(data, { partial = false } = {}) {
    const errores = Validator.collect(data, this.fields, { partial });
    if (!partial && errores.length === 0) errores.push(...this.reglas(data));
    if (errores.length) throw new ValidationError(errores);
    return true;
  }

  /** Conserva solo campos declarados, recorta textos y descarta vacíos. */
  static sanitize(data = {}) {
    const doc = {};
    for (const campo of Object.keys(this.fields)) {
      let valor = data[campo];
      if (typeof valor === 'string') valor = valor.trim();
      if (valor === undefined || valor === null || valor === '') continue;
      doc[campo] = valor;
    }
    return doc;
  }

  /** Crea un documento completo y válido listo para insertarse. */
  static build(data) {
    const doc = this.sanitize(data);
    this.validate(doc);
    return doc;
  }

  /** Valida un conjunto parcial de cambios para un update. */
  static buildUpdate(cambios) {
    const prohibidos = Object.keys(cambios).filter((c) => this.inmutables.includes(c));
    if (prohibidos.length) throw new ValidationError([`no se pueden modificar: ${prohibidos.join(', ')}`]);
    const doc = this.sanitize(cambios);
    this.validate(doc, { partial: true });
    return doc;
  }
}
