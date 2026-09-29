import inquirer from 'inquirer';
import chalk from 'chalk';
import { Command } from './Command.js';
import { ui } from '../utils/ui.js';
import { prompts } from '../utils/prompts.js';

/**
 * Menú compuesto (Command + Composite): un menú ES un comando que contiene comandos.
 * Así los submenús se anidan sin código especial
 */
export class MenuCommand extends Command {
  #hijos = [];

  constructor(nombre, invoker, { esRaiz = false } = {}) {
    super(nombre);
    this.invoker = invoker;
    this.esRaiz = esRaiz;
  }

  agregar(...comandos) {
    this.#hijos.push(...comandos);
    return this;
  }

  async execute() {
    for (;;) {
      ui.titulo(this.nombre);
      const opciones = this.#hijos.map((c, i) => ({ name: c.nombre, value: i }));
      opciones.push(new inquirer.Separator(), { name: this.esRaiz ? chalk.red('Salir') : chalk.gray('← Volver'), value: -1 });

      const indice = await prompts.seleccionar('¿Qué desea hacer?', opciones);
      if (indice === -1) return;
      await this.invoker.ejecutar(this.#hijos[indice]);
    }
  }
}
