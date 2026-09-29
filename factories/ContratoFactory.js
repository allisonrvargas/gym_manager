import { Contrato } from '../models/index.js';
import { dayjs, formatFecha } from '../utils/dates.js';
import { redondear } from '../utils/numeros.js';

/**
 * PATRÓN FACTORY
 * Centraliza la lógica de generación AUTOMÁTICA del contrato al asignar un plan:
 * calcula fechas, precio total, saldo inicial, condiciones y estado inicial.
 * Ningún otro módulo construye contratos a mano.
 */
export class ContratoFactory {
  static SEMANAS_POR_MES = 4;

  crear({ cliente, plan, fechaInicio = new Date(), condiciones, contratoAnteriorId }) {
    const inicio = dayjs(fechaInicio).startOf('day');
    const fin = inicio.add(plan.duracionSemanas, 'week');
    const meses = Math.max(1, Math.ceil(plan.duracionSemanas / ContratoFactory.SEMANAS_POR_MES));
    const precio = redondear(plan.precioMensual * meses);

    const doc = {
      clienteId: cliente._id,
      planId: plan._id,
      clienteNombre: `${cliente.nombre} ${cliente.apellido}`,
      planNombre: plan.nombre,
      condiciones: condiciones?.trim() || this.#condicionesPorDefecto(plan, meses, inicio, fin),
      duracionSemanas: plan.duracionSemanas,
      precio,
      montoPagado: 0,
      saldoPendiente: precio,
      fechaInicio: inicio.toDate(),
      fechaFin: fin.toDate(),
      estado: 'activo',
      historialEstados: [{
        estado: 'activo',
        fecha: new Date(),
        motivo: contratoAnteriorId ? 'Renovación de contrato' : 'Asignación de plan',
      }],
      totalSeguimientos: 0,
      pagos: [],
      creadoEn: new Date(),
    };
    if (contratoAnteriorId) doc.contratoAnteriorId = contratoAnteriorId;

    return Contrato.build(doc); // valida antes de devolver
  }

  #condicionesPorDefecto(plan, meses, inicio, fin) {
    return [
      `Plan "${plan.nombre}" (nivel ${plan.nivel}) por ${plan.duracionSemanas} semanas (${meses} mensualidad(es)).`,
      `Vigencia: ${formatFecha(inicio)} a ${formatFecha(fin)}.`,
      'El cliente se compromete a asistir a las sesiones y registrar su avance semanal.',
      'Los pagos se realizan por mensualidad; el contrato solo puede finalizarse con saldo en cero.',
      'La cancelación elimina el seguimiento físico y nutricional asociado al contrato.',
    ].join(' ');
  }
}
