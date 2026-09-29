import { BaseRepository } from './BaseRepository.js';
import { PlanEntrenamiento } from '../models/index.js';

export class PlanRepository extends BaseRepository {
  constructor(db) {
    super(db, PlanEntrenamiento.collection);
  }

  findActivos() {
    return this.find({ estado: 'activo' }, { sort: { nombre: 1 } });
  }
}
