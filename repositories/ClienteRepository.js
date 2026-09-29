import { BaseRepository } from './BaseRepository.js';
import { Cliente } from '../models/index.js';

export class ClienteRepository extends BaseRepository {
  constructor(db) {
    super(db, Cliente.collection);
  }

  findByDocumento(documento, session) {
    return this.findOne({ documento }, session);
  }
}
