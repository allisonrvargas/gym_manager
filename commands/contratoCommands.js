import { Command } from './Command.js';
import { ui } from '../utils/ui.js';
import { prompts } from '../utils/prompts.js';
import { formatFecha } from '../utils/dates.js';
import { dinero } from '../utils/format.js';
import { ESTADOS_CONTRATO } from '../models/index.js';

export class ListarContratosCommand extends Command {
  constructor(ctx) { super('Listar contratos', ctx); }

  async execute() {
    const estados = await prompts.multiple('Estados a mostrar:', ESTADOS_CONTRATO.map((e) => ({ name: e, value: e, checked: e === 'activo' })));
    const contratos = await this.servicios.contratos.listar({ estados });
    ui.tabla(
      ['Cliente', 'Plan', 'Inicio', 'Fin', 'Estado', 'Precio', 'Pagado', 'Saldo', 'Avances'],
      contratos.map((c) => [c.clienteNombre, c.planNombre, formatFecha(c.fechaInicio), formatFecha(c.fechaFin), c.estado,
        dinero(c.precio), dinero(c.montoPagado), dinero(c.saldoPendiente), c.totalSeguimientos]),
    );
  }
}

export class DetalleContratoCommand extends Command {
  constructor(ctx) { super('Ver contrato', ctx); }

  async execute() {
    const c = await this.selectores.contratoDeCliente();
    ui.detalle({
      Cliente: c.clienteNombre,
      Plan: c.planNombre,
      Vigencia: `${formatFecha(c.fechaInicio)} → ${formatFecha(c.fechaFin)} (${c.duracionSemanas} semanas)`,
      Estado: c.estado,
      Precio: dinero(c.precio),
      Pagado: `${dinero(c.montoPagado)} (${c.pagos?.length ?? 0} pagos)`,
      'Saldo pendiente': dinero(c.saldoPendiente),
      'Avances registrados': c.totalSeguimientos,
      Condiciones: c.condiciones,
    });
    ui.titulo('Historial de estados');
    ui.tabla(['Fecha', 'Estado', 'Motivo'], c.historialEstados.map((h) => [formatFecha(h.fecha), h.estado, h.motivo]));
  }
}

export class RenovarContratoCommand extends Command {
  constructor(ctx) { super('Renovar plan', ctx); }

  async execute() {
    const c = await this.selectores.contratoDeCliente({ estados: ['activo', 'finalizado'] });
    if (!(await prompts.confirmar(`¿Renovar "${c.planNombre}" para ${c.clienteNombre}?`, true))) return;
    const nuevo = await this.servicios.contratos.renovar(c._id);
    ui.exito(`Nuevo contrato: ${formatFecha(nuevo.fechaInicio)} → ${formatFecha(nuevo.fechaFin)} · ${dinero(nuevo.precio)}`);
  }
}

export class FinalizarContratoCommand extends Command {
  constructor(ctx) { super('Finalizar plan', ctx); }

  async execute() {
    const c = await this.selectores.contratoDeCliente({ estados: ['activo'] });
    if (!(await prompts.confirmar(`¿Finalizar "${c.planNombre}" de ${c.clienteNombre}?`))) return;
    await this.servicios.contratos.finalizar(c._id);
    ui.exito('Plan finalizado');
  }
}

export class CancelarContratoCommand extends Command {
  constructor(ctx) { super('Cancelar plan (rollback de seguimiento)', ctx); }

  async execute() {
    const c = await this.selectores.contratoDeCliente({ estados: ['activo'] });
    ui.aviso('Se eliminarán TODOS los avances físicos y datos nutricionales de este contrato.');
    if (!(await prompts.confirmar(`¿Cancelar "${c.planNombre}" de ${c.clienteNombre}?`))) return;
    const motivo = await prompts.texto('Motivo de la cancelación:');
    const r = await this.servicios.contratos.cancelar(c._id, motivo);
    ui.exito(`Plan cancelado. Revertidos: ${r.seguimientosEliminados} avances, ${r.planesNutricionalesEliminados} planes nutricionales, ${r.alimentosEliminados} registros de alimentos.`);
  }
}
