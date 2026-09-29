import { BaseRepository } from './BaseRepository.js';
import { PlanNutricional } from '../models/index.js';

export class PlanNutricionalRepository extends BaseRepository {
  constructor(db) {
    super(db, PlanNutricional.collection);
  }
}
