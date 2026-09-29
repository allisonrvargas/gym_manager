import { ObjectId } from 'mongodb';
import { ValidationError } from './errors.js';

export function toObjectId(id, campo = 'id') {
  if (id instanceof ObjectId) return id;
  if (typeof id === 'string' && /^[a-f\d]{24}$/i.test(id)) return new ObjectId(id);
  throw new ValidationError([`${campo}: no es un identificador válido`]);
}
