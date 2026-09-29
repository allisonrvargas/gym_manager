import inquirer from 'inquirer';
import { esFechaValida, parseFecha, formatFecha, FORMATO_FECHA } from './dates.js';


const preguntar = async (pregunta) => (await inquirer.prompt([{ name: 'valor', ...pregunta }])).valor;
const aNumero = (texto) => Number(String(texto).trim().replace(',', '.'));

export const prompts = {
  async texto(message, { requerido = true, defecto, validar } = {}) {
    const valor = await preguntar({
      type: 'input',
      message,
      default: defecto,
      validate: (x) => {
        if (requerido && !x.trim()) return 'Campo obligatorio';
        return validar ? validar(x) : true;
      },
    });
    return valor.trim();
  },

  async numero(message, { min, max, requerido = true, defecto, entero = false } = {}) {
    const valor = await preguntar({
      type: 'input',
      message,
      default: defecto !== undefined ? String(defecto) : undefined,
      validate: (x) => {
        if (!String(x).trim()) return requerido ? 'Campo obligatorio' : true;
        const n = aNumero(x);
        if (!Number.isFinite(n)) return 'Debe ser un número';
        if (entero && !Number.isInteger(n)) return 'Debe ser un número entero';
        if (min !== undefined && n < min) return `Mínimo ${min}`;
        if (max !== undefined && n > max) return `Máximo ${max}`;
        return true;
      },
    });
    return String(valor).trim() ? aNumero(valor) : undefined;
  },

  async fecha(message, { requerido = true, defecto } = {}) {
    const valor = await preguntar({
      type: 'input',
      message: `${message} (${FORMATO_FECHA})`,
      default: defecto ? formatFecha(defecto) : undefined,
      validate: (x) => {
        if (!x.trim()) return requerido ? 'Campo obligatorio' : true;
        return esFechaValida(x.trim()) || `Formato esperado ${FORMATO_FECHA}`;
      },
    });
    return valor.trim() ? parseFecha(valor.trim()) : undefined;
  },

  confirmar: (message, defecto = false) => preguntar({ type: 'confirm', message, default: defecto }),

  seleccionar: (message, choices, defecto) => preguntar({ type: 'list', message, choices, default: defecto, pageSize: 14, loop: false }),

  multiple: (message, choices, { minimo = 1 } = {}) => preguntar({
    type: 'checkbox',
    message,
    choices,
    pageSize: 14,
    validate: (sel) => sel.length >= minimo || `Seleccione al menos ${minimo}`,
  }),

  lista: async (message, opciones = {}) => {
    const texto = await prompts.texto(`${message} (separe con comas)`, opciones);
    return texto.split(',').map((s) => s.trim()).filter(Boolean);
  },
};
