import { ui } from '../utils/ui.js';
import { AppError } from '../utils/errors.js';

/**
 * INVOCADOR del patrón Command: ejecuta cualquier comando, centraliza el
 * manejo de errores y guarda un historial de la sesión.
 */
export class CommandInvoker {
  #historial = [];

  constructor({ debug = false } = {}) {
    this.debug = debug;
  }

  async ejecutar(comando) {
    const registro = { comando: comando.nombre, fecha: new Date() };
    try {
      await comando.execute();
      this.#historial.push({ ...registro, ok: true });
    } catch (error) {
      if (error?.name === 'ExitPromptError') throw error; // Ctrl+C
      this.#historial.push({ ...registro, ok: false, error: error.message.split('\n')[0] });
      if (error instanceof AppError) {
        ui.error(error.message);
      } else {
        ui.error(`Error inesperado: ${error.message}`);
        if (this.debug) console.error(error);
      }
    }
  }

  get historial() {
    return [...this.#historial];
  }
}
