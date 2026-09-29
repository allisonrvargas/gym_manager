export class Command {
  constructor(nombre, contexto = {}) {
    if (new.target === Command) throw new Error('Command es abstracta y no puede instanciarse');
    this.nombre = nombre;
    this.servicios = contexto.servicios;
    this.selectores = contexto.selectores;
  }

  async execute() {
    throw new Error(`${this.constructor.name} debe implementar execute()`);
  }
}
