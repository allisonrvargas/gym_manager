import { Command } from './Command.js';
import { ui } from '../utils/ui.js';

/** Muestra el historial de comandos de la sesión*/
export class HistorialSesionCommand extends Command {
  constructor(ctx, invoker) {
    super('Historial de la sesión', ctx);
    this.invoker = invoker;
  }

  async execute() {
    ui.tabla(
      ['Hora', 'Comando', 'Resultado'],
      this.invoker.historial.map((h) => [h.fecha.toLocaleTimeString(), h.comando, h.ok ? '✔ ok' : `✖ ${h.error}`]),
    );
  }
}
