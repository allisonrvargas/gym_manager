import { Command } from './Command.js';
import { ui } from '../utils/ui.js';
import { prompts } from '../utils/prompts.js';
import { formatFecha } from '../utils/dates.js';
import { dinero, nombreCompleto, opcional } from '../utils/format.js';

const pedirDatosCliente = async (actual = {}) => ({
  nombre: await prompts.texto('Nombre:', { defecto: actual.nombre }),
  apellido: await prompts.texto('Apellido:', { defecto: actual.apellido }),
  documento: await prompts.texto('Documento:', { defecto: actual.documento }),
  email: await prompts.texto('Email:', { defecto: actual.email }),
  telefono: await prompts.texto('Teléfono:', { defecto: actual.telefono }),
  fechaNacimiento: await prompts.fecha('Fecha de nacimiento', { defecto: actual.fechaNacimiento }),
  objetivo: await prompts.texto('Objetivo personal (opcional):', { requerido: false, defecto: actual.objetivo }),
});

export class RegistrarClienteCommand extends Command {
  constructor(ctx) { super('Registrar cliente', ctx); }

  async execute() {
    ui.titulo('Nuevo cliente');
    const cliente = await this.servicios.clientes.crear(await pedirDatosCliente());
    ui.exito(`Cliente ${nombreCompleto(cliente)} registrado`);
  }
}

export class ListarClientesCommand extends Command {
  constructor(ctx) { super('Listar clientes', ctx); }

  async execute() {
    const clientes = await this.servicios.clientes.listar();
    ui.tabla(
      ['Nombre', 'Documento', 'Email', 'Teléfono', 'Planes activos'],
      clientes.map((c) => [nombreCompleto(c), c.documento, c.email, c.telefono, c.planes.length]),
    );
  }
}

export class DetalleClienteCommand extends Command {
  constructor(ctx) { super('Ver detalle de cliente', ctx); }

  async execute() {
    const cliente = await this.selectores.cliente();
    ui.detalle({
      Nombre: nombreCompleto(cliente),
      Documento: cliente.documento,
      Email: cliente.email,
      Teléfono: cliente.telefono,
      Nacimiento: formatFecha(cliente.fechaNacimiento),
      Objetivo: opcional(cliente.objetivo),
      Registrado: formatFecha(cliente.creadoEn),
    });
    const contratos = await this.servicios.contratos.listar({ clienteId: cliente._id });
    ui.titulo('Contratos');
    ui.tabla(
      ['Plan', 'Inicio', 'Fin', 'Estado', 'Precio', 'Saldo'],
      contratos.map((c) => [c.planNombre, formatFecha(c.fechaInicio), formatFecha(c.fechaFin), c.estado, dinero(c.precio), dinero(c.saldoPendiente)]),
    );
  }
}

export class ActualizarClienteCommand extends Command {
  constructor(ctx) { super('Actualizar cliente', ctx); }

  async execute() {
    const cliente = await this.selectores.cliente('¿Qué cliente desea actualizar?');
    ui.info('Presione Enter para conservar el valor actual');
    const actualizado = await this.servicios.clientes.actualizar(cliente._id, await pedirDatosCliente(cliente));
    ui.exito(`Cliente ${nombreCompleto(actualizado)} actualizado`);
  }
}

export class EliminarClienteCommand extends Command {
  constructor(ctx) { super('Eliminar cliente', ctx); }

  async execute() {
    const cliente = await this.selectores.cliente('¿Qué cliente desea eliminar?');
    if (!(await prompts.confirmar(`¿Eliminar a ${nombreCompleto(cliente)} y todo su seguimiento?`))) return;
    const r = await this.servicios.clientes.eliminar(cliente._id);
    ui.exito(`Cliente eliminado (${r.seguimientos} seguimientos y ${r.alimentos} registros de alimentos eliminados)`);
  }
}

export class AsignarPlanesAClienteCommand extends Command {
  constructor(ctx) { super('Asignar planes a un cliente', ctx); }

  async execute() {
    const cliente = await this.selectores.cliente();
    const planes = await this.selectores.planes();
    const fechaInicio = await prompts.fecha('Fecha de inicio', { defecto: new Date() });
    const contratos = await this.servicios.contratos.asignar({
      clienteIds: [cliente._id], planIds: planes.map((p) => p._id), fechaInicio,
    });
    contratos.forEach((c) => ui.exito(`Contrato generado: ${c.planNombre} · ${dinero(c.precio)} · vence ${formatFecha(c.fechaFin)}`));
  }
}
