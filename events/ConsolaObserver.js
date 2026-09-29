import chalk from 'chalk';
import { EVENTOS } from './EventBus.js';

/** Observador que hace VISIBLE en consola el resultado de cada transacción. */
export class ConsolaObserver {
  suscribir(eventBus) {
    eventBus.on(EVENTOS.TX_COMMIT, ({ operacion }) => {
      console.log(chalk.gray(`  🔒 Transacción "${operacion}" confirmada (COMMIT)`));
    });
    eventBus.on(EVENTOS.TX_ROLLBACK, ({ operacion, motivo }) => {
      console.log(chalk.yellow(`  ↩  Transacción "${operacion}" revertida (ROLLBACK): ${motivo.split('\n')[0]}`));
    });
  }
}
