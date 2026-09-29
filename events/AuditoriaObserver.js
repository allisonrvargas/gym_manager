import { EVENTOS } from './EventBus.js';

export class AuditoriaObserver {
  constructor(db) {
    this.collection = db.collection('auditoria');
  }

  suscribir(eventBus) {
    Object.values(EVENTOS).forEach((evento) => {
      eventBus.on(evento, (payload) => this.#registrar(evento, payload));
    });
  }

  #registrar(evento, payload) {
    this.collection.insertOne({ evento, payload, fecha: new Date() }).catch(() => {
      /* la auditoría nunca debe romper el flujo principal */
    });
  }
}
