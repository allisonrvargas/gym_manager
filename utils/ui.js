import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';

/** Presentación en consola */
export const ui = {
  banner() {
    console.log(chalk.bold.cyan(`
  ╔════════════════════════════════════════════╗
  ║             GYM MANAGER CLI                ║
  ║   Clientes · Planes · Progreso · Finanzas  ║
  ╚════════════════════════════════════════════╝`));
  },
  titulo: (texto) => console.log(`\n${chalk.bold.cyan(`━━━ ${texto} ━━━`)}`),
  exito: (texto) => console.log(chalk.green(`✔ ${texto}`)),
  error: (texto) => console.log(chalk.red(`✖ ${texto}`)),
  aviso: (texto) => console.log(chalk.yellow(`⚠ ${texto}`)),
  info: (texto) => console.log(chalk.blue(`ℹ ${texto}`)),
  sistema: (texto) => console.log(chalk.gray(`  ${texto}`)),

  tabla(cabeceras, filas) {
    if (!filas.length) {
      ui.aviso('No hay registros para mostrar');
      return;
    }
    const tabla = new Table({ head: cabeceras.map((c) => chalk.bold.white(c)), style: { head: [], border: ['gray'] } });
    filas.forEach((f) => tabla.push(f.map((celda) => (celda === undefined || celda === null ? '-' : String(celda)))));
    console.log(tabla.toString());
  },

  detalle(objeto) {
    const tabla = new Table({ style: { border: ['gray'] } });
    Object.entries(objeto).forEach(([k, v]) => tabla.push({ [chalk.bold(k)]: String(v ?? '-') }));
    console.log(tabla.toString());
  },

  /** Gráfico de barras horizontal en texto (evolución de peso, calorías, etc.). */
  barras(pares, { ancho = 30, sufijo = '' } = {}) {
    if (!pares.length) return;
    const valores = pares.map(([, v]) => v);
    const min = Math.min(...valores);
    const max = Math.max(...valores);
    const rango = max - min || 1;
    pares.forEach(([etiqueta, valor]) => {
      const largo = Math.max(1, Math.round(((valor - min) / rango) * ancho));
      console.log(`  ${chalk.gray(String(etiqueta).padEnd(12))} ${chalk.magenta('█'.repeat(largo))} ${valor}${sufijo}`);
    });
  },

  async conSpinner(texto, tarea) {
    const spinner = ora(texto).start();
    try {
      const resultado = await tarea();
      spinner.succeed();
      return resultado;
    } catch (error) {
      spinner.fail();
      throw error;
    }
  },
};
