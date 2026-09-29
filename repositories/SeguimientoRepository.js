import { BaseRepository } from './BaseRepository.js';
import { Seguimiento } from '../models/index.js';

export class SeguimientoRepository extends BaseRepository {
  constructor(db) {
    super(db, Seguimiento.collection);
  }

  findByContrato(contratoId, session) {
    return this.find({ contratoId }, { sort: { semana: 1 }, session });
  }
}
