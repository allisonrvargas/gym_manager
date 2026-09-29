import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import isoWeek from 'dayjs/plugin/isoWeek.js';

dayjs.extend(customParseFormat);
dayjs.extend(isoWeek);

export { dayjs };
export const FORMATO_FECHA = 'YYYY-MM-DD';

export const esFechaValida = (texto) => dayjs(texto, FORMATO_FECHA, true).isValid();

export const parseFecha = (texto) => {
  const fecha = dayjs(texto, FORMATO_FECHA, true);
  return fecha.isValid() ? fecha.startOf('day').toDate() : null;
};

export const formatFecha = (fecha) => (fecha ? dayjs(fecha).format(FORMATO_FECHA) : '-');

export const hoy = () => dayjs().startOf('day').toDate();
