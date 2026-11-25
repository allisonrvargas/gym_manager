import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ObjectId } from 'mongodb';
import { FinanzasService } from '../services/FinanzasService.js';
import { BusinessRuleError } from '../utils/errors.js';
import { Command } from '../commands/Command.js';
// Los comandos cargan la configuración de la app, que exige estas variables (no se conecta a nada en estas pruebas)
process.env.MONGO_URI ??= 'mongodb://localhost:27017/?directConnection=true';
process.env.DB_NAME ??= 'gym_manager_test';
const F = await import('../commands/finanzasCommands.js');

// Repositorio falso: guarda el filtro recibido y devuelve un balance como el del repositorio real
const crearServicio = (resultado) => {
  const llamadas = [];
  const movimientoRepo = { balance: async (filtro) => { llamadas.push(filtro); return resultado; } };
  return { servicio: new FinanzasService({ movimientoRepo }), llamadas };
};

const balanceDeEjemplo = {
  porTipo: [{ _id: 'ingreso', total: 1500.5, cantidad: 3 }, { _id: 'egreso', total: 400.25, cantidad: 2 }],
  porCategoria: [
    { _id: { tipo: 'ingreso', categoria: 'mensualidad' }, total: 1200, cantidad: 2 },
    { _id: { tipo: 'ingreso', categoria: 'sesion_individual' }, total: 300.5, cantidad: 1 },
    { _id: { tipo: 'egreso', categoria: 'servicio' }, total: 400.25, cantidad: 2 },
  ],
};

test('el reporte mensual arma totales, balance y desglose con las categorías reales', async () => {
  const { servicio } = crearServicio(balanceDeEjemplo);
  const r = await servicio.generarReporteMensual({ mes: '07', anio: '2026' });
  assert.equal(r.periodo, '07/2026');
  assert.equal(r.totalIngresos, 1500.5);
  assert.equal(r.totalEgresos, 400.25);
  assert.equal(r.balanceNeto, 1100.25);
  assert.deepEqual(r.desglose.ingresos, { mensualidad: 1200, sesion_individual: 300.5 });
  assert.deepEqual(r.desglose.egresos, { servicio: 400.25 });
});

test('el filtro cubre exactamente el mes (del día 1 a las 23:59:59.999 del último día)', async () => {
  const { servicio, llamadas } = crearServicio({});
  await servicio.generarReporteMensual({ mes: 2, anio: 2024 }); // 2024 es bisiesto
  const { $gte, $lte } = llamadas[0].fecha;
  assert.equal($gte.getFullYear(), 2024); assert.equal($gte.getMonth(), 1); assert.equal($gte.getDate(), 1);
  assert.equal($gte.getHours(), 0);
  assert.equal($lte.getDate(), 29);
  assert.equal($lte.getHours(), 23); assert.equal($lte.getMinutes(), 59);

  await servicio.generarReporteMensual({ mes: 12, anio: 2026 });
  assert.equal(llamadas[1].fecha.$lte.getDate(), 31);
  await servicio.generarReporteMensual({ mes: 2, anio: 2026 });
  assert.equal(llamadas[2].fecha.$lte.getDate(), 28);
});

test('puede filtrar por cliente y, si no se pide, no agrega el filtro', async () => {
  const { servicio, llamadas } = crearServicio({});
  const id = new ObjectId();
  await servicio.generarReporteMensual({ mes: 5, anio: 2026, clienteId: id.toString() });
  assert.ok(llamadas[0].clienteId.equals(id));
  await servicio.generarReporteMensual({ mes: 5, anio: 2026 });
  assert.equal('clienteId' in llamadas[1], false);
});

test('un mes sin movimientos da todo en cero', async () => {
  const { servicio } = crearServicio(undefined); // el agregado devuelve undefined si no hay datos
  const r = await servicio.generarReporteMensual({ mes: 3, anio: 2026 });
  assert.deepEqual([r.totalIngresos, r.totalEgresos, r.balanceNeto], [0, 0, 0]);
  assert.deepEqual(r.desglose, { ingresos: {}, egresos: {} });
});

test('una pérdida da balance negativo', async () => {
  const { servicio } = crearServicio({ porTipo: [{ _id: 'egreso', total: 90 }, { _id: 'ingreso', total: 40 }], porCategoria: [] });
  assert.equal((await servicio.generarReporteMensual({ mes: 1, anio: 2026 })).balanceNeto, -50);
});

test('rechaza meses y años inválidos', async () => {
  const { servicio } = crearServicio({});
  for (const [mes, anio] of [[0, 2026], [13, 2026], ['ab', 2026], [1.5, 2026], [6, 1999], [6, 2101], [6, 'x']]) {
    await assert.rejects(servicio.generarReporteMensual({ mes, anio }), BusinessRuleError, `aceptó mes=${mes}, año=${anio}`);
  }
});

test('el comando del reporte está conectado al menú de Finanzas', () => {
  assert.equal(typeof F.ReporteFinancieroCommand, 'function');
  assert.ok(Object.getPrototypeOf(F.ReporteFinancieroCommand) === Command);
  assert.equal(new F.ReporteFinancieroCommand({}).nombre, 'Generar reporte financiero mensual');
});