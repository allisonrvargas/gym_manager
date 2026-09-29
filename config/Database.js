import { MongoClient } from 'mongodb';
import { config } from './env.js';
import {
  Cliente, PlanEntrenamiento, Contrato, Seguimiento,
  PlanNutricional, RegistroAlimento, Movimiento,
} from '../models/index.js';

export class Database {
  static #instancia = null;
  static #token = Symbol('Database');

  #client = null;
  #db = null;

  constructor(token) {
    if (token !== Database.#token) {
      throw new Error('Use Database.getInstance() en lugar de new Database()');
    }
  }

  static getInstance() {
    if (!Database.#instancia) Database.#instancia = new Database(Database.#token);
    return Database.#instancia;
  }

  async connect() {
    if (this.#db) return this.#db;
    this.#client = new MongoClient(config.mongoUri, { serverSelectionTimeoutMS: 8000 });
    await this.#client.connect();
    this.#db = this.#client.db(config.dbName);
    await this.#verificarSoporteTransacciones();
    await this.#crearIndices();
    return this.#db;
  }

  get db() {
    if (!this.#db) throw new Error('La base de datos no está conectada');
    return this.#db;
  }

  get client() {
    if (!this.#client) throw new Error('La base de datos no está conectada');
    return this.#client;
  }

  async disconnect() {
    if (this.#client) await this.#client.close();
    this.#client = null;
    this.#db = null;
  }

  /** Las transacciones multi-documento solo funcionan en Replica Set o Sharded Cluster. */
  async #verificarSoporteTransacciones() {
    const hello = await this.#db.admin().command({ hello: 1 });
    const esReplicaSet = Boolean(hello.setName);
    const esMongos = hello.msg === 'isdbgrid';
    if (!esReplicaSet && !esMongos) {
      throw new Error(
        'MongoDB no está corriendo como Replica Set: las transacciones no están disponibles. ' +
        'Use "docker compose up -d" o un cluster de MongoDB Atlas.',
      );
    }
  }

  /**
   * Los índices son la última línea de defensa de la consistencia:
   * aunque dos operaciones concurrentes pasen las validaciones de la capa de servicio,
   * la base de datos rechaza los que son duplicados.
   */
  async #crearIndices() {
    const db = this.#db;
    await Promise.all([
      db.collection(Cliente.collection).createIndex({ documento: 1 }, { unique: true }),
      db.collection(Cliente.collection).createIndex({ email: 1 }, { unique: true }),
      db.collection(PlanEntrenamiento.collection).createIndex({ nombre: 1 }, { unique: true }),
      // Un cliente no puede tener dos contratos ACTIVOS del mismo plan
      db.collection(Contrato.collection).createIndex(
        { clienteId: 1, planId: 1 },
        { unique: true, partialFilterExpression: { estado: 'activo' }, name: 'uniq_contrato_activo' },
      ),
      db.collection(Contrato.collection).createIndex({ estado: 1, fechaFin: 1 }),
      // Un solo registro de avance por semana y contrato
      db.collection(Seguimiento.collection).createIndex({ contratoId: 1, semana: 1 }, { unique: true }),
      db.collection(Seguimiento.collection).createIndex({ clienteId: 1, fecha: 1 }),
      db.collection(PlanNutricional.collection).createIndex({ contratoId: 1, estado: 1 }),
      db.collection(RegistroAlimento.collection).createIndex({ planNutricionalId: 1, fecha: 1 }),
      db.collection(Movimiento.collection).createIndex({ fecha: 1, tipo: 1 }),
      db.collection(Movimiento.collection).createIndex({ clienteId: 1 }),
    ]);
  }
}
