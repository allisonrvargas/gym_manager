import { ObjectId } from 'mongodb';
import { ValidationError } from './errors.js';

/** Verificadores de tipo soportados por las reglas de los modelos. */
const TIPOS = {
  string: (v) => typeof v === 'string',
  number: (v) => typeof v === 'number' && Number.isFinite(v),
  integer: (v) => Number.isInteger(v),
  boolean: (v) => typeof v === 'boolean',
  date: (v) => v instanceof Date && !Number.isNaN(v.getTime()),
  objectId: (v) => v instanceof ObjectId,
  array: (v) => Array.isArray(v),
  object: (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
    && !(v instanceof Date) && !(v instanceof ObjectId),
};

const estaVacio = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');


export class Validator {
  static collect(data, fields, { partial = false } = {}) {
    if (!TIPOS.object(data)) return ['el documento debe ser un objeto'];
    const errores = [];

    for (const [campo, regla] of Object.entries(fields)) {
      const valor = data[campo];
      if (estaVacio(valor)) {
        if (regla.required && !partial) errores.push(`${campo}: es obligatorio`);
        continue;
      }
      Validator.#validarValor(campo, valor, regla, data, errores);
    }

    const desconocidos = Object.keys(data).filter((k) => k !== '_id' && !(k in fields));
    if (desconocidos.length) errores.push(`campos no permitidos: ${desconocidos.join(', ')}`);
    return errores;
  }

  static validate(data, fields, opciones) {
    const errores = Validator.collect(data, fields, opciones);
    if (errores.length) throw new ValidationError(errores);
    return true;
  }

  static #validarValor(campo, valor, regla, data, errores) {
    const verificar = TIPOS[regla.type];
    if (!verificar) throw new Error(`Tipo de regla desconocido: ${regla.type}`);
    if (!verificar(valor)) {
      errores.push(`${campo}: debe ser de tipo ${regla.type}`);
      return;
    }

    if (regla.enum && !regla.enum.includes(valor)) {
      errores.push(`${campo}: debe ser uno de [${regla.enum.join(', ')}]`);
    }

    if (typeof valor === 'number') {
      if (regla.min !== undefined && valor < regla.min) errores.push(`${campo}: debe ser mayor o igual a ${regla.min}`);
      if (regla.max !== undefined && valor > regla.max) errores.push(`${campo}: debe ser menor o igual a ${regla.max}`);
      if (regla.decimals !== undefined && !Validator.#decimalesValidos(valor, regla.decimals)) {
        errores.push(`${campo}: máximo ${regla.decimals} decimales`);
      }
    }

    if (typeof valor === 'string' || Array.isArray(valor)) {
      const longitud = typeof valor === 'string' ? valor.trim().length : valor.length;
      const unidad = typeof valor === 'string' ? 'caracteres' : 'elementos';
      if (regla.minLength !== undefined && longitud < regla.minLength) errores.push(`${campo}: mínimo ${regla.minLength} ${unidad}`);
      if (regla.maxLength !== undefined && longitud > regla.maxLength) errores.push(`${campo}: máximo ${regla.maxLength} ${unidad}`);
    }

    if (regla.pattern && typeof valor === 'string' && !regla.pattern.test(valor)) {
      errores.push(`${campo}: ${regla.message ?? 'formato inválido'}`);
    }

    if (regla.items && Array.isArray(valor)) {
      valor.forEach((item, i) => {
        if (estaVacio(item)) errores.push(`${campo}[${i}]: elemento vacío`);
        else Validator.#validarValor(`${campo}[${i}]`, item, regla.items, data, errores);
      });
    }

    if (regla.schema && TIPOS.object(valor)) {
      errores.push(...Validator.collect(valor, regla.schema).map((e) => `${campo}.${e}`));
    }

    if (typeof regla.validate === 'function') {
      const mensaje = regla.validate(valor, data);
      if (mensaje) errores.push(`${campo}: ${mensaje}`);
    }
  }

  static #decimalesValidos(valor, decimales) {
    const escalado = valor * 10 ** decimales;
    return Math.abs(Math.round(escalado) - escalado) < 1e-6;
  }
}
