import {
  ClienteRepository, PlanRepository, ContratoRepository, SeguimientoRepository,
  PlanNutricionalRepository, RegistroAlimentoRepository, MovimientoRepository,
} from '../repositories/index.js';
import {
  ClienteService, PlanService, ContratoService, SeguimientoService, NutricionService, FinanzasService,
} from '../services/index.js';
import { ContratoFactory } from '../factories/ContratoFactory.js';
import { MovimientoFactory } from '../factories/MovimientoFactory.js';
import { TransactionManager } from '../utils/TransactionManager.js';
import { config } from './env.js';


export function crearContenedor({ db, client, eventBus }) {
  const repos = {
    clienteRepo: new ClienteRepository(db),
    planRepo: new PlanRepository(db),
    contratoRepo: new ContratoRepository(db),
    seguimientoRepo: new SeguimientoRepository(db),
    planNutricionalRepo: new PlanNutricionalRepository(db),
    registroAlimentoRepo: new RegistroAlimentoRepository(db),
    movimientoRepo: new MovimientoRepository(db),
  };
  const dependencias = {
    ...repos,
    tx: new TransactionManager(client, eventBus),
    eventBus,
    contratoFactory: new ContratoFactory(),
    movimientoFactory: new MovimientoFactory(),
    zonaHoraria: config.zonaHoraria,
  };

  return {
    clientes: new ClienteService(dependencias),
    planes: new PlanService(dependencias),
    contratos: new ContratoService(dependencias),
    seguimiento: new SeguimientoService(dependencias),
    nutricion: new NutricionService(dependencias),
    finanzas: new FinanzasService(dependencias),
  };
}
