import { Movimiento } from '../models/index.js';
import { redondear } from '../utils/numeros.js';

const DESCRIPCIONES = {
  mensualidad: 'Pago de mensualidad',
  sesion_individual: 'Sesión de entrenamiento individual',
  otro_ingreso: 'Ingreso varios',
  servicio: 'Pago de servicio',
  suplemento: 'Compra de suplementos',
  gasto_operativo: 'Gasto operativo',
  otro_egreso: 'Egreso varios',
};

export class MovimientoFactory {
  crearIngreso(datos) {
    return this.#crear('ingreso', datos);
  }

  crearEgreso(datos) {
    return this.#crear('egreso', datos);
  }

  #crear(tipo, { categoria, monto, descripcion, metodoPago = 'efectivo', fecha = new Date(), clienteId, contratoId }) {
    return Movimiento.build({
      tipo,
      categoria,
      monto: redondear(monto),
      descripcion: descripcion || DESCRIPCIONES[categoria] || 'Movimiento',
      metodoPago,
      fecha,
      clienteId,
      contratoId,
      estado: 'registrado',
      creadoEn: new Date(),
    });
  }
}
