import { Command } from './Command.js';
import { ui } from '../utils/ui.js';
import { prompts } from '../utils/prompts.js';
import { formatFecha } from '../utils/dates.js';
import { dinero } from '../utils/format.js';
import { NIVELES } from '../models/index.js';

const pedirDatosPlan = async (actual = {}) => ({
  nombre: await prompts.texto('Nombre del plan:', { defecto: actual.nombre }),
  descripcion: await prompts.texto('Descripción (opcional):', { requerido: false, defecto: actual.descripcion }),
  duracionSemanas: await prompts.numero('Duración (semanas):', { min: 1, max: 104, entero: true, defecto: actual.duracionSemanas }),
  metas: await prompts.lista('Metas físicas', { defecto: actual.metas?.join(', ') }),
  nivel: await prompts.seleccionar('Nivel:', NIVELES, actual.nivel),
  precioMensual: await prompts.numero('Precio mensual:', { min: 0, defecto: actual.precioMensual }),
});

export class CrearPlanCommand extends Command {
  constructor(ctx) { super('Crear plan de entrenamiento', ctx); }

  async execute() {
    ui.titulo('Nuevo plan');
    const plan = await this.servicios.planes.crear(await pedirDatosPlan());
    ui.exito(`Plan "${plan.nombre}" creado`);
  }
}

export class ListarPlanesCommand extends Command {
  constructor(ctx) { super('Listar planes', ctx); }

  async execute() {
    const planes = await this.servicios.planes.listar();
    ui.tabla(
      ['Nombre', 'Nivel', 'Semanas', 'Precio/mes', 'Metas', 'Clientes activos', 'Estado'],
      planes.map((p) => [p.nombre, p.nivel, p.duracionSemanas, dinero(p.precioMensual), p.metas.join(', '), p.clientes.length, p.estado]),
    );
  }
}

export class ActualizarPlanCommand extends Command {
  constructor(ctx) { super('Actualizar plan', ctx); }

  async execute() {
    const plan = await this.selectores.plan('¿Qué plan desea actualizar?');
    ui.info('Los cambios aplican solo a contratos nuevos. Enter conserva el valor actual.');
    const cambios = await pedirDatosPlan(plan);
    cambios.estado = await prompts.seleccionar('Estado:', ['activo', 'inactivo'], plan.estado);
    const actualizado = await this.servicios.planes.actualizar(plan._id, cambios);
    ui.exito(`Plan "${actualizado.nombre}" actualizado`);
  }
}

export class EliminarPlanCommand extends Command {
  constructor(ctx) { super('Eliminar plan', ctx); }

  async execute() {
    const plan = await this.selectores.plan('¿Qué plan desea eliminar?');
    if (!(await prompts.confirmar(`¿Eliminar el plan "${plan.nombre}"?`))) return;
    await this.servicios.planes.eliminar(plan._id);
    ui.exito('Plan eliminado');
  }
}

export class AsignarPlanAClientesCommand extends Command {
  constructor(ctx) { super('Asignar plan a clientes (genera contratos)', ctx); }

  async execute() {
    const plan = await this.selectores.plan('Plan a asignar', { soloActivos: true });
    const clientes = await this.selectores.clientes();
    const fechaInicio = await prompts.fecha('Fecha de inicio', { defecto: new Date() });
    const condiciones = await prompts.texto('Condiciones especiales (Enter = condiciones estándar):', { requerido: false });
    const contratos = await this.servicios.contratos.asignar({
      clienteIds: clientes.map((c) => c._id), planIds: [plan._id], fechaInicio, condiciones,
    });
    ui.exito(`${contratos.length} contrato(s) generado(s) automáticamente`);
    ui.tabla(['Cliente', 'Inicio', 'Fin', 'Precio'], contratos.map((c) => [c.clienteNombre, formatFecha(c.fechaInicio), formatFecha(c.fechaFin), dinero(c.precio)]));
  }
}
