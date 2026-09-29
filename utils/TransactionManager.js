import { EVENTOS } from '../events/EventBus.js';

export class TransactionManager {
  static OPCIONES = Object.freeze({
    readConcern: { level: 'snapshot' },
    writeConcern: { w: 'majority' },
    readPreference: 'primary',
  });

  constructor(client, eventBus, { maxIntentos = 3 } = {}) {
    this.client = client;
    this.eventBus = eventBus;
    this.maxIntentos = maxIntentos;
  }

  async run(nombreOperacion, unidadDeTrabajo) {
    for (let intento = 1; ; intento += 1) {
      const session = this.client.startSession();
      try {
        session.startTransaction(TransactionManager.OPCIONES);
        const resultado = await unidadDeTrabajo(session);
        await session.commitTransaction(); // COMMIT
        this.eventBus?.emit(EVENTOS.TX_COMMIT, { operacion: nombreOperacion });
        return resultado;
      } catch (error) {
        if (session.inTransaction()) await session.abortTransaction(); // ROLLBACK
        const esTransitorio = error?.hasErrorLabel?.('TransientTransactionError');
        if (esTransitorio && intento < this.maxIntentos) continue; // reintento seguro
        this.eventBus?.emit(EVENTOS.TX_ROLLBACK, { operacion: nombreOperacion, motivo: error.message });
        throw error;
      } finally {
        await session.endSession();
      }
    }
  }
}
