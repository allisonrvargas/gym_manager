import { Database } from '../config/Database.js';
import { crearContenedor } from '../config/container.js';
import { EventBus } from '../events/EventBus.js';
import { dayjs } from '../utils/dates.js';
import { ui } from '../utils/ui.js';

const hace = (dias) => dayjs().subtract(dias, 'day').startOf('day').toDate();

async function seed() {
  const database = Database.getInstance();
  let db = await database.connect();

  if (process.argv.includes('--reset')) {
    await db.dropDatabase();
    await database.disconnect();
    db = await database.connect(); // recrea índices
    ui.aviso('Base de datos reiniciada');
  }

  const s = crearContenedor({ db, client: database.client, eventBus: new EventBus() });

  const ana = await s.clientes.crear({ nombre: 'Ana', apellido: 'Gómez', documento: '10203040', email: 'ana@correo.com', telefono: '3001234567', fechaNacimiento: new Date(1995, 4, 12), objetivo: 'Bajar grasa corporal' });
  const luis = await s.clientes.crear({ nombre: 'Luis', apellido: 'Pérez', documento: '50607080', email: 'luis@correo.com', telefono: '3017654321', fechaNacimiento: new Date(1990, 8, 3), objetivo: 'Ganar masa muscular' });
  const sofia = await s.clientes.crear({ nombre: 'Sofía', apellido: 'Ramírez', documento: '90807060', email: 'sofia@correo.com', telefono: '3109876543', fechaNacimiento: new Date(2000, 1, 20) });

  const quema = await s.planes.crear({ nombre: 'Quema Grasa 12', descripcion: 'HIIT + fuerza', duracionSemanas: 12, metas: ['Reducir 5% de grasa', 'Mejorar resistencia'], nivel: 'principiante', precioMensual: 120000 });
  const hiper = await s.planes.crear({ nombre: 'Hipertrofia Pro', descripcion: 'Rutina dividida 5 días', duracionSemanas: 8, metas: ['Ganar 3 kg de masa magra'], nivel: 'avanzado', precioMensual: 150000 });
  await s.planes.crear({ nombre: 'Movilidad Senior', duracionSemanas: 4, metas: ['Mejorar flexibilidad'], nivel: 'principiante', precioMensual: 80000 });

  // Contratos generados automáticamente (inician hace 4 semanas para tener historial)
  const [cAna, cSofia] = await s.contratos.asignar({ clienteIds: [ana._id, sofia._id], planIds: [quema._id], fechaInicio: hace(28) });
  const [cLuis] = await s.contratos.asignar({ clienteIds: [luis._id], planIds: [hiper._id], fechaInicio: hace(21) });

  // Avances semanales
  const pesosAna = [72.5, 71.8, 71.0, 70.4];
  for (let i = 0; i < pesosAna.length; i += 1) {
    await s.seguimiento.registrar(cAna._id, { fecha: hace(28 - i * 7), peso: pesosAna[i], grasaCorporal: 30 - i * 0.8, medidas: { cintura: 82 - i, cadera: 100 - i * 0.5 }, comentarios: i === 0 ? 'Medición inicial' : 'Buena adherencia' });
  }
  for (let i = 0; i < 3; i += 1) {
    await s.seguimiento.registrar(cLuis._id, { fecha: hace(21 - i * 7), peso: 78 + i * 0.6, grasaCorporal: 16 - i * 0.3 });
  }

  // Nutrición
  const nutri = await s.nutricion.crearPlan(cAna._id, { nombre: 'Déficit moderado', caloriasObjetivo: 1800, descripcion: 'Alta proteína' });
  const comidas = [['desayuno', 'Avena con fruta', '1 taza', 350], ['almuerzo', 'Pollo con arroz', '250 g', 650], ['cena', 'Ensalada con atún', '1 plato', 420], ['snack', 'Yogur griego', '150 g', 150]];
  for (let d = 0; d < 5; d += 1) {
    for (const [comida, alimento, cantidad, calorias] of comidas) {
      await s.nutricion.registrarAlimento(nutri._id, { fecha: hace(d), comida, alimento, cantidad, calorias: calorias + d * 15 });
    }
  }

  // Finanzas
  await s.finanzas.registrarIngreso({ categoria: 'mensualidad', clienteId: ana._id, contratoId: cAna._id, monto: 120000, metodoPago: 'tarjeta', fecha: hace(27) });
  await s.finanzas.registrarIngreso({ categoria: 'mensualidad', clienteId: luis._id, contratoId: cLuis._id, monto: 300000, metodoPago: 'transferencia', fecha: hace(20) });
  await s.finanzas.registrarIngreso({ categoria: 'mensualidad', clienteId: sofia._id, contratoId: cSofia._id, monto: 120000, metodoPago: 'efectivo', fecha: hace(25) });
  await s.finanzas.registrarIngreso({ categoria: 'sesion_individual', clienteId: sofia._id, monto: 40000, metodoPago: 'efectivo', fecha: hace(3) });
  await s.finanzas.registrarEgreso({ categoria: 'servicio', monto: 250000, descripcion: 'Energía eléctrica', metodoPago: 'transferencia', fecha: hace(10) });
  await s.finanzas.registrarEgreso({ categoria: 'suplemento', monto: 180000, descripcion: 'Proteína whey para tienda', metodoPago: 'tarjeta', fecha: hace(6) });

  ui.exito('Datos de demostración cargados: 3 clientes, 3 planes, 3 contratos, avances, nutrición y finanzas');
  await database.disconnect();
}

seed().catch(async (e) => {
  ui.error(e.message);
  await Database.getInstance().disconnect().catch(() => {});
  process.exit(1);
});
