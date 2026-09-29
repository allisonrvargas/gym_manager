import { MenuCommand } from './MenuCommand.js';
import { Selectores } from './Selectores.js';
import * as C from './clienteCommands.js';
import * as P from './planCommands.js';
import * as K from './contratoCommands.js';
import * as S from './seguimientoCommands.js';
import * as N from './nutricionCommands.js';
import * as F from './finanzasCommands.js';
import { HistorialSesionCommand } from './sistemaCommands.js';

/** Arma el árbol de menús. Agregar una opción = agregar un comando aquí. */
export function construirMenuPrincipal(servicios, invoker) {
  const ctx = { servicios, selectores: new Selectores(servicios) };
  const menu = (nombre, ...clases) => new MenuCommand(nombre, invoker).agregar(...clases.map((Clase) => new Clase(ctx)));

  return new MenuCommand('MENÚ PRINCIPAL', invoker, { esRaiz: true }).agregar(
    menu('Clientes', C.RegistrarClienteCommand, C.ListarClientesCommand, C.DetalleClienteCommand,
      C.ActualizarClienteCommand, C.EliminarClienteCommand, C.AsignarPlanesAClienteCommand),
    menu('Planes de entrenamiento', P.CrearPlanCommand, P.ListarPlanesCommand, P.ActualizarPlanCommand,
      P.EliminarPlanCommand, P.AsignarPlanAClientesCommand),
    menu('Contratos', K.ListarContratosCommand, K.DetalleContratoCommand, K.RenovarContratoCommand,
      K.FinalizarContratoCommand, K.CancelarContratoCommand),
    menu('Seguimiento físico', S.RegistrarAvanceCommand, S.VerProgresoCommand, S.EliminarAvanceCommand),
    menu('Nutrición', N.CrearPlanNutricionalCommand, N.RegistrarAlimentoCommand, N.ReporteNutricionalCommand),
    menu('Finanzas', F.RegistrarIngresoCommand, F.RegistrarEgresoCommand, F.ListarMovimientosCommand,
      F.AnularMovimientoCommand, F.BalancePorFechasCommand, F.BalancePorClienteCommand),
    new HistorialSesionCommand(ctx, invoker),
  );
}
