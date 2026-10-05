import { Command } from './Command.js';
import { ReporteFinancieroCommand } from './ReporteFinancieroCommand.js';

export function getFinanzasCommands(ctx) {
  return [
    new ReporteFinancieroCommand(ctx)
  ];
}
