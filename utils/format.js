import { config } from '../config/env.js';

const formateador = new Intl.NumberFormat(config.locale, {
  style: 'currency',
  currency: config.moneda,
  maximumFractionDigits: 2,
});

export const dinero = (n) => formateador.format(n ?? 0);
export const nombreCompleto = (c) => (c ? `${c.nombre} ${c.apellido}` : '-');
export const opcional = (v, sufijo = '') => (v === undefined || v === null || v === '' ? '-' : `${v}${sufijo}`);
