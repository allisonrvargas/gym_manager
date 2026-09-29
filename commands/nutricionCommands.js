import { Command } from './Command.js';
import { ui } from '../utils/ui.js';
import { prompts } from '../utils/prompts.js';
import { formatFecha } from '../utils/dates.js';
import { COMIDAS } from '../models/index.js';

export class CrearPlanNutricionalCommand extends Command {
  constructor(ctx) { super('Crear plan de alimentación', ctx); }

  async execute() {
    const contrato = await this.selectores.contratoDeCliente({ estados: ['activo'], mensaje: 'Plan de entrenamiento asociado' });
    const plan = await this.servicios.nutricion.crearPlan(contrato._id, {
      nombre: await prompts.texto('Nombre del plan de alimentación:'),
      caloriasObjetivo: await prompts.numero('Calorías objetivo por día (kcal):', { min: 800, max: 6000, entero: true }),
      descripcion: await prompts.texto('Indicaciones (opcional):', { requerido: false }),
    });
    ui.exito(`Plan nutricional "${plan.nombre}" creado (${plan.caloriasObjetivo} kcal/día)`);
  }
}

export class RegistrarAlimentoCommand extends Command {
  constructor(ctx) { super('Registrar alimento del día', ctx); }

  async execute() {
    const plan = await this.selectores.planNutricional();
    let continuar = true;
    while (continuar) {
      const registro = await this.servicios.nutricion.registrarAlimento(plan._id, {
        fecha: await prompts.fecha('Fecha', { defecto: new Date() }),
        comida: await prompts.seleccionar('Comida:', COMIDAS),
        alimento: await prompts.texto('Alimento:'),
        cantidad: await prompts.texto('Cantidad (ej. 200 g, 1 taza):'),
        calorias: await prompts.numero('Calorías estimadas (kcal):', { min: 0, max: 5000 }),
      });
      ui.exito(`${registro.alimento} registrado (${registro.calorias} kcal)`);
      continuar = await prompts.confirmar('¿Registrar otro alimento?', true);
    }
  }
}

export class ReporteNutricionalCommand extends Command {
  constructor(ctx) { super('Reporte nutricional semanal', ctx); }

  async execute() {
    const plan = await this.selectores.planNutricional({ soloActivos: false });
    const referencia = await prompts.fecha('Fecha dentro de la semana a consultar', { defecto: new Date() });
    const r = await this.servicios.nutricion.reporteSemanal(plan._id, referencia);

    ui.titulo(`Semana ${formatFecha(r.desde)} → ${formatFecha(r.hasta)} · objetivo ${r.plan.caloriasObjetivo} kcal/día`);
    ui.tabla(
      ['Día', 'Fecha', ...COMIDAS, 'Total', 'vs objetivo'],
      r.dias.map((d) => [d.diaSemana, d.fecha, ...COMIDAS.map((c) => d.porComida[c] || '-'), d.total,
        d.total ? `${d.diferencia > 0 ? '+' : ''}${d.diferencia}` : '-']),
    );
    ui.barras(r.dias.filter((d) => d.total > 0).map((d) => [d.fecha, d.total]), { sufijo: ' kcal' });
    ui.detalle({
      'Total semanal': `${r.totalSemana} kcal`,
      'Promedio diario': `${r.promedioDiario} kcal`,
      'Días registrados': `${r.diasRegistrados}/7`,
      'Días sobre el objetivo': r.diasSobreObjetivo,
    });
  }
}
