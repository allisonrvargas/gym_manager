export const NIVELES = Object.freeze(['principiante', 'intermedio', 'avanzado']);
export const ESTADOS_PLAN = Object.freeze(['activo', 'inactivo']);
export const ESTADOS_CONTRATO = Object.freeze(['activo', 'finalizado', 'cancelado', 'renovado']);
export const COMIDAS = Object.freeze(['desayuno', 'almuerzo', 'cena', 'snack']);
export const TIPOS_MOVIMIENTO = Object.freeze(['ingreso', 'egreso']);
export const CATEGORIAS = Object.freeze({
  ingreso: ['mensualidad', 'sesion_individual', 'otro_ingreso'],
  egreso: ['servicio', 'suplemento', 'gasto_operativo', 'otro_egreso'],
});
export const METODOS_PAGO = Object.freeze(['efectivo', 'tarjeta', 'transferencia']);
export const ESTADOS_MOVIMIENTO = Object.freeze(['registrado', 'anulado']);
