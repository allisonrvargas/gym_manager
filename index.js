#!/usr/bin/env node
import { config } from './config/env.js';
import { Database } from './config/Database.js';
import { crearContenedor } from './config/container.js';
import { EventBus } from './events/EventBus.js';
import { ConsolaObserver } from './events/ConsolaObserver.js';
import { AuditoriaObserver } from './events/AuditoriaObserver.js';
import { CommandInvoker } from './commands/CommandInvoker.js';
import { construirMenuPrincipal } from './commands/menuPrincipal.js';
import { ui } from './utils/ui.js';
import 'dayjs/locale/es.js';
import { dayjs } from './utils/dates.js';

dayjs.locale('es');

async function main() {
  ui.banner();
  const database = Database.getInstance();
  const db = await ui.conSpinner('Conectando a MongoDB (replica set)...', () => database.connect());

  const eventBus = new EventBus();
  new ConsolaObserver().suscribir(eventBus);
  new AuditoriaObserver(db).suscribir(eventBus);

  const servicios = crearContenedor({ db, client: database.client, eventBus });
  const invoker = new CommandInvoker({ debug: config.debug });

  try {
    await construirMenuPrincipal(servicios, invoker).execute();
  } catch (error) {
    if (error?.name !== 'ExitPromptError') throw error;
  } finally {
    await database.disconnect();
    ui.info('Conexión cerrada. ¡Hasta pronto! 💪');
  }
}

main().catch(async (error) => {
  ui.error(error.message);
  await Database.getInstance().disconnect().catch(() => {});
  process.exit(1);
});
