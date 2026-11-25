import fs from 'fs/promises';
import path from 'path';
import { Command } from './Command.js';
import { ui } from '../utils/ui.js';
import { prompts } from '../utils/prompts.js';
import { dayjs } from '../utils/dates.js';
import { dinero } from '../utils/format.js';
import { CATEGORIAS } from '../models/index.js';

const etiqueta = (categoria) => categoria.charAt(0).toUpperCase() + categoria.slice(1).replace(/_/g, ' ');

export class ReporteFinancieroCommand extends Command {
  constructor(ctx) {
    super('Generar reporte financiero mensual', ctx);
  }

  async execute() {
    ui.titulo('Reporte Financiero Mensual');

    const mes = await prompts.texto('Mes (1-12):', {
      defecto: dayjs().format('MM'),
      validar: (x) => (/^(0?[1-9]|1[0-2])$/.test(x.trim()) ? true : 'Escribe un mes entre 1 y 12'),
    });
    const anio = await prompts.texto('Año (YYYY):', {
      defecto: dayjs().format('YYYY'),
      validar: (x) => (/^20\d{2}$/.test(x.trim()) ? true : 'Escribe un año entre 2000 y 2099'),
    });

    const cliente = (await prompts.confirmar('¿Filtrar por un cliente específico?', false))
      ? await this.selectores.cliente('Seleccione el cliente:')
      : null;

    const reporte = await this.servicios.finanzas.generarReporteMensual({ mes, anio, clienteId: cliente ? cliente._id : null });

    ui.titulo(`Resumen Financiero - ${reporte.periodo} ${cliente ? `(${cliente.nombre})` : '[Consolidado]'}`);
    ui.info('INGRESOS');
    ui.tabla(['Categoría', 'Monto'], [
      ...CATEGORIAS.ingreso.map((c) => [etiqueta(c), dinero(reporte.desglose.ingresos[c] || 0)]),
      ['TOTAL INGRESOS', dinero(reporte.totalIngresos)],
    ]);
    ui.info('EGRESOS');
    ui.tabla(['Categoría', 'Monto'], [
      ...CATEGORIAS.egreso.map((c) => [etiqueta(c), dinero(reporte.desglose.egresos[c] || 0)]),
      ['TOTAL EGRESOS', dinero(reporte.totalEgresos)],
    ]);
    ui.detalle({
      'Total Ingresos': dinero(reporte.totalIngresos),
      'Total Egresos': dinero(reporte.totalEgresos),
      'Balance Neto': `${dinero(reporte.balanceNeto)} (${reporte.balanceNeto >= 0 ? 'GANANCIA' : 'PÉRDIDA'})`,
    });

    if (await prompts.confirmar('¿Exportar este reporte a un archivo?', false)) {
      const formato = await prompts.seleccionar('Formato de exportación:', ['JSON', 'CSV']);
      await this.exportarReporte(reporte, formato.toLowerCase());
    }
  }

  async exportarReporte(reporte, formato) {
    const nombreArchivo = `reporte_financiero_${reporte.periodo.replace('/', '_')}.${formato}`;
    const rutaDestino = path.join(process.cwd(), nombreArchivo);

    if (formato === 'json') {
      await fs.writeFile(rutaDestino, JSON.stringify(reporte, null, 2));
    } else {
      const csv = [
        'Tipo,Categoria,Monto',
        ...Object.entries(reporte.desglose.ingresos).map(([cat, val]) => `Ingreso,${cat},${val}`),
        ...Object.entries(reporte.desglose.egresos).map(([cat, val]) => `Egreso,${cat},${val}`),
        `Resumen,Total Ingresos,${reporte.totalIngresos}`,
        `Resumen,Total Egresos,${reporte.totalEgresos}`,
        `Resumen,Balance Neto,${reporte.balanceNeto}`,
      ].join('\n');
      await fs.writeFile(rutaDestino, csv);
    }

    ui.exito(`Reporte exportado con éxito en: ${nombreArchivo}`);
  }
}