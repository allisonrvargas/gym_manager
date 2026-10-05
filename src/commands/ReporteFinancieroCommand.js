import fs from 'fs/promises';
import path from 'path';
import { Command } from './Command.js';
import { ui } from '../utils/ui.js';
import { prompts } from '../utils/prompts.js';
import { dinero } from '../utils/format.js';

export class ReporteFinancieroCommand extends Command {
  constructor(ctx) {
    super('Generar reporte financiero mensual', ctx);
  }

  async execute() {
    ui.titulo('Reporte Financiero Mensual');

    const mes = await prompts.texto('Ingrese el mes (MM, ej. 07):', { defecto: '07' });
    const anio = await prompts.texto('Ingrese el año (YYYY, ej. 2025):', { defecto: '2025' });

    const filtrarCliente = await prompts.confirmar('¿Desea filtrar por un cliente específico?', false);
    let cliente = null;

    if (filtrarCliente) {
      cliente = await this.selectores.cliente('Seleccione el cliente:');
    }

    const reporte = await this.servicios.finanzas.generarReporteMensual({
      mes,
      anio,
      clienteId: cliente ? cliente._id : null
    });

    ui.titulo(`Resumen Financiero - ${reporte.periodo} ${cliente ? `(${cliente.nombre})` : '[Consolidado Gym]'}`);

    ui.info('INGRESOS');
    ui.tabla(
      ['Categoría', 'Monto'],
      [
        ['Mensualidades', dinero(reporte.desglose.ingresos['mensualidad'] || 0)],
        ['Sesiones Individuales', dinero(reporte.desglose.ingresos['sesion'] || 0)],
        ['Otros Ingresos', dinero(reporte.desglose.ingresos['otros'] || 0)],
        ['TOTAL INGRESOS', dinero(reporte.totalIngresos)]
      ]
    );

    ui.info('EGRESOS');
    ui.tabla(
      ['Categoría', 'Monto'],
      [
        ['Gastos Operativos', dinero(reporte.desglose.egresos['operativo'] || 0)],
        ['Suplementos', dinero(reporte.desglose.egresos['suplementos'] || 0)],
        ['Devoluciones', dinero(reporte.desglose.egresos['devolucion'] || 0)],
        ['TOTAL EGRESOS', dinero(reporte.totalEgresos)]
      ]
    );

    const estado = reporte.balanceNeto >= 0 ? 'GANANCIA' : 'PÉRDIDA';
    ui.detalle({
      'Total Ingresos': dinero(reporte.totalIngresos),
      'Total Egresos': dinero(reporte.totalEgresos),
      'Balance Neto': `${dinero(reporte.balanceNeto)} (${estado})`
    });

    const exportar = await prompts.confirmar('¿Desea exportar este reporte a un archivo?', false);
    if (exportar) {
      const formato = await prompts.seleccion('Elija el formato de exportación:', ['JSON', 'CSV']);
      await this.exportarReporte(reporte, formato.toLowerCase());
    }
  }

  async exportarReporte(reporte, formato) {
    const nombreArchivo = `reporte_financiero_${reporte.periodo.replace('/', '_')}.${formato}`;
    const rutaDestino = path.join(process.cwd(), nombreArchivo);

    if (formato === 'json') {
      await fs.writeFile(rutaDestino, JSON.stringify(reporte, null, 2));
    } else if (formato === 'csv') {
      const contenidoCSV = [
        'Tipo,Categoria,Monto',
        ...Object.entries(reporte.desglose.ingresos).map(([cat, val]) => `Ingreso,${cat},${val}`),
        ...Object.entries(reporte.desglose.egresos).map(([cat, val]) => `Egreso,${cat},${val}`),
        `Resumen,Total Ingresos,${reporte.totalIngresos}`,
        `Resumen,Total Egresos,${reporte.totalEgresos}`,
        `Resumen,Balance Neto,${reporte.balanceNeto}`
      ].join('\n');

      await fs.writeFile(rutaDestino, contenidoCSV);
    }

    ui.exito(`Reporte exportado con éxito en: ${nombreArchivo}`);
  }
}

