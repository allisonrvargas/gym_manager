import { prompts } from '../utils/prompts.js';
import { BusinessRuleError } from '../utils/errors.js';
import { formatFecha } from '../utils/dates.js';
import { dinero, nombreCompleto } from '../utils/format.js';

/** Listas interactivas reutilizables (DRY) para elegir entidades existentes. */
export class Selectores {
  constructor(servicios) {
    this.servicios = servicios;
  }

  static #noVacio(lista, mensaje) {
    if (!lista.length) throw new BusinessRuleError(mensaje);
    return lista;
  }

  static etiquetaContrato(c) {
    return `${c.planNombre} · ${c.clienteNombre} · ${formatFecha(c.fechaInicio)} → ${formatFecha(c.fechaFin)} · [${c.estado}]`;
  }

  async #opcionesClientes() {
    const clientes = Selectores.#noVacio(await this.servicios.clientes.listar(), 'No hay clientes registrados');
    return clientes.map((c) => ({ name: `${nombreCompleto(c)} · doc ${c.documento}`, value: c }));
  }

  async #opcionesPlanes(soloActivos) {
    const planes = Selectores.#noVacio(await this.servicios.planes.listar({ soloActivos }), soloActivos ? 'No hay planes activos' : 'No hay planes registrados');
    return planes.map((p) => ({ name: `${p.nombre} · ${p.nivel} · ${p.duracionSemanas} sem · ${dinero(p.precioMensual)}/mes${p.estado === 'inactivo' ? ' [inactivo]' : ''}`, value: p }));
  }

  async cliente(mensaje = 'Seleccione el cliente') {
    return prompts.seleccionar(mensaje, await this.#opcionesClientes());
  }

  async clientes(mensaje = 'Seleccione los clientes (espacio para marcar)') {
    return prompts.multiple(mensaje, await this.#opcionesClientes());
  }

  async plan(mensaje = 'Seleccione el plan', { soloActivos = false } = {}) {
    return prompts.seleccionar(mensaje, await this.#opcionesPlanes(soloActivos));
  }

  async planes(mensaje = 'Seleccione los planes (espacio para marcar)') {
    return prompts.multiple(mensaje, await this.#opcionesPlanes(true));
  }

  async contrato({ clienteId, estados, mensaje = 'Seleccione el contrato' } = {}) {
    const contratos = Selectores.#noVacio(
      await this.servicios.contratos.listar({ clienteId, estados }),
      `No hay contratos${estados ? ` en estado ${estados.join('/')}` : ''}`,
    );
    return prompts.seleccionar(mensaje, contratos.map((c) => ({ name: Selectores.etiquetaContrato(c), value: c })));
  }

  async contratoDeCliente({ estados, mensaje } = {}) {
    const cliente = await this.cliente();
    return this.contrato({ clienteId: cliente._id, estados, mensaje });
  }

  async planNutricional({ soloActivos = true } = {}) {
    const cliente = await this.cliente();
    const planes = Selectores.#noVacio(
      await this.servicios.nutricion.listarPorCliente(cliente._id, { soloActivos }),
      'El cliente no tiene planes nutricionales',
    );
    return prompts.seleccionar('Seleccione el plan nutricional', planes.map((p) => ({
      name: `${p.nombre} · ${p.caloriasObjetivo} kcal/día · [${p.estado}]`, value: p,
    })));
  }
}
