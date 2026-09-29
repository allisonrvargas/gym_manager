import { Command } from './Command.js';
import { ui } from '../utils/ui.js';
import { prompts } from '../utils/prompts.js';
import { formatFecha, dayjs } from '../utils/dates.js';
import { dinero } from '../utils/format.js';
import { CATEGORIAS, METODOS_PAGO } from '../models/index.js';
import { Selectores } from './Selectores.js';

const mostrarBalance = (b) => {
  ui.detalle({ Ingresos: dinero(b.ingresos), Egresos: dinero(b.egresos), Balance: dinero(b.balance) });
  ui.tabla(['Tipo', 'Categoría', 'Cantidad', 'Total'], b.porCategoria.map((c) => [c.tipo, c.categoria, c.cantidad, dinero(c.total)]));
};

export class RegistrarIngresoCommand extends Command {
  constructor(ctx) { super('Registrar ingreso (pago)', ctx); }

  async execute() {
    const categoria = await prompts.seleccionar('Tipo de ingreso:', CATEGORIAS.ingreso);
    const datos = { categoria };

    if (categoria === 'mensualidad') {
      const contrato = await this.selectores.contratoDeCliente({ estados: ['activo'] });
      if (contrato.saldoPendiente <= 0) {
        ui.aviso('Este contrato ya está totalmente pagado');
        return;
      }
      ui.info(`Saldo pendiente: ${dinero(contrato.saldoPendiente)}`);
      Object.assign(datos, { clienteId: contrato.clienteId, contratoId: contrato._id });
      datos.monto = await prompts.numero('Monto:', { min: 0.01, max: contrato.saldoPendiente, defecto: contrato.saldoPendiente });
    } else {
      if (categoria === 'sesion_individual' || await prompts.confirmar('¿Asociar a un cliente?')) {
        datos.clienteId = (await this.selectores.cliente())._id;
      }
      datos.monto = await prompts.numero('Monto:', { min: 0.01 });
    }
    datos.metodoPago = await prompts.seleccionar('Método de pago:', METODOS_PAGO);
    datos.fecha = await prompts.fecha('Fecha', { defecto: new Date() });
    datos.descripcion = await prompts.texto('Descripción (opcional):', { requerido: false });

    const mov = await this.servicios.finanzas.registrarIngreso(datos);
    ui.exito(`Ingreso registrado: ${dinero(mov.monto)} (${mov.categoria})`);
  }
}

export class RegistrarEgresoCommand extends Command {
  constructor(ctx) { super('Registrar egreso', ctx); }

  async execute() {
    const datos = {
      categoria: await prompts.seleccionar('Tipo de egreso:', CATEGORIAS.egreso),
      monto: await prompts.numero('Monto:', { min: 0.01 }),
      metodoPago: await prompts.seleccionar('Método de pago:', METODOS_PAGO),
      fecha: await prompts.fecha('Fecha', { defecto: new Date() }),
      descripcion: await prompts.texto('Descripción:'),
    };
    const mov = await this.servicios.finanzas.registrarEgreso(datos);
    ui.exito(`Egreso registrado: ${dinero(mov.monto)} (${mov.categoria})`);
  }
}

export class ListarMovimientosCommand extends Command {
  constructor(ctx) { super('Listar movimientos', ctx); }

  async execute() {
    const desde = await prompts.fecha('Desde', { defecto: dayjs().startOf('month').toDate() });
    const hasta = await prompts.fecha('Hasta', { defecto: new Date() });
    const movs = await this.servicios.finanzas.listarMovimientos({ desde, hasta, limite: 100 });
    ui.tabla(
      ['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Método', 'Monto', 'Estado'],
      movs.map((m) => [formatFecha(m.fecha), m.tipo, m.categoria, m.descripcion, m.metodoPago,
        `${m.tipo === 'egreso' ? '-' : '+'}${dinero(m.monto)}`, m.estado]),
    );
  }
}

export class AnularMovimientoCommand extends Command {
  constructor(ctx) { super('Anular movimiento', ctx); }

  async execute() {
    const movs = (await this.servicios.finanzas.listarMovimientos({ limite: 30 })).filter((m) => m.estado === 'registrado');
    if (!movs.length) {
      ui.aviso('No hay movimientos para anular');
      return;
    }
    const mov = await prompts.seleccionar('Movimiento a anular:', movs.map((m) => ({
      name: `${formatFecha(m.fecha)} · ${m.tipo} · ${m.categoria} · ${dinero(m.monto)} · ${m.descripcion}`, value: m,
    })));
    const motivo = await prompts.texto('Motivo de la anulación:');
    await this.servicios.finanzas.anular(mov._id, motivo);
    ui.exito('Movimiento anulado');
  }
}

export class BalancePorFechasCommand extends Command {
  constructor(ctx) { super('Balance por rango de fechas', ctx); }

  async execute() {
    const desde = await prompts.fecha('Desde', { defecto: dayjs().startOf('month').toDate() });
    const hasta = await prompts.fecha('Hasta', { defecto: new Date() });
    ui.titulo(`Balance ${formatFecha(desde)} → ${formatFecha(hasta)}`);
    mostrarBalance(await this.servicios.finanzas.balancePorFechas(desde, hasta));
  }
}

export class BalancePorClienteCommand extends Command {
  constructor(ctx) { super('Balance por cliente', ctx); }

  async execute() {
    const cliente = await this.selectores.cliente();
    const b = await this.servicios.finanzas.balancePorCliente(cliente._id);
    ui.titulo(`Balance de ${cliente.nombre} ${cliente.apellido}`);
    mostrarBalance(b);
    ui.titulo('Estado de cuenta de contratos activos');
    ui.detalle({
      'Total contratado': dinero(b.totalContratado),
      'Total pagado': dinero(b.totalPagadoContratos),
      'Saldo pendiente': dinero(b.saldoPendiente),
    });
    ui.tabla(['Contrato', 'Precio', 'Pagado', 'Saldo'], b.contratos.map((c) => [Selectores.etiquetaContrato(c), dinero(c.precio), dinero(c.montoPagado), dinero(c.saldoPendiente)]));
  }
}
