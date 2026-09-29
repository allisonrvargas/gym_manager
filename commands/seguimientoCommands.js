import { Command } from './Command.js';
import { ui } from '../utils/ui.js';
import { prompts } from '../utils/prompts.js';
import { formatFecha } from '../utils/dates.js';
import { opcional } from '../utils/format.js';

const conSigno = (v, sufijo = '') => (v === null || v === undefined ? '-' : `${v > 0 ? '+' : ''}${v}${sufijo}`);

export class RegistrarAvanceCommand extends Command {
  constructor(ctx) { super('Registrar avance semanal', ctx); }

  async execute() {
    const contrato = await this.selectores.contratoDeCliente({ estados: ['activo'] });
    const datos = {
      fecha: await prompts.fecha('Fecha de la medición', { defecto: new Date() }),
      peso: await prompts.numero('Peso (kg):', { min: 25, max: 350 }),
      grasaCorporal: await prompts.numero('Grasa corporal (%) (opcional):', { min: 2, max: 70, requerido: false }),
    };
    if (await prompts.confirmar('¿Registrar medidas corporales (cm)?')) {
      const medidas = {};
      for (const parte of ['cintura', 'cadera', 'pecho', 'brazo', 'pierna']) {
        const valor = await prompts.numero(`  ${parte} (opcional):`, { min: 10, max: 300, requerido: false });
        if (valor !== undefined) medidas[parte] = valor;
      }
      if (Object.keys(medidas).length) datos.medidas = medidas;
    }
    const fotos = await prompts.lista('Fotos: rutas o URLs (opcional)', { requerido: false });
    if (fotos.length) datos.fotos = fotos;
    datos.comentarios = await prompts.texto('Comentarios (opcional):', { requerido: false });

    const registro = await this.servicios.seguimiento.registrar(contrato._id, datos);
    ui.exito(`Avance de la semana ${registro.semana} registrado`);
  }
}

export class VerProgresoCommand extends Command {
  constructor(ctx) { super('Ver progreso cronológico', ctx); }

  async execute() {
    const contrato = await this.selectores.contratoDeCliente();
    const { registros, resumen } = await this.servicios.seguimiento.progreso(contrato._id);
    if (!registros.length) {
      ui.aviso('Este contrato no tiene avances registrados');
      return;
    }
    ui.tabla(
      ['Semana', 'Fecha', 'Peso', 'Δ Peso', 'Grasa', 'Δ Grasa', 'Cintura', 'Fotos', 'Comentarios'],
      registros.map((r) => [r.semana, formatFecha(r.fecha), `${r.peso} kg`, conSigno(r.deltaPeso, ' kg'),
        opcional(r.grasaCorporal, '%'), conSigno(r.deltaGrasa, '%'), opcional(r.medidas?.cintura, ' cm'),
        r.fotos?.length ?? 0, opcional(r.comentarios)]),
    );
    ui.titulo('Evolución del peso');
    ui.barras(registros.map((r) => [`Semana ${r.semana}`, r.peso]), { sufijo: ' kg' });
    ui.info(`Cambio total: ${conSigno(resumen.cambioPeso, ' kg')} en ${resumen.semanasRegistradas} registros`);
  }
}

export class EliminarAvanceCommand extends Command {
  constructor(ctx) { super('Eliminar registro de avance', ctx); }

  async execute() {
    const contrato = await this.selectores.contratoDeCliente();
    const { registros } = await this.servicios.seguimiento.progreso(contrato._id);
    if (!registros.length) {
      ui.aviso('Este contrato no tiene avances registrados');
      return;
    }
    const registro = await prompts.seleccionar('Registro a eliminar:', registros.map((r) => ({
      name: `Semana ${r.semana} · ${formatFecha(r.fecha)} · ${r.peso} kg`, value: r,
    })));
    if (!(await prompts.confirmar('¿Confirma la eliminación?'))) return;
    await this.servicios.seguimiento.eliminar(registro._id);
    ui.exito('Registro eliminado');
  }
}
