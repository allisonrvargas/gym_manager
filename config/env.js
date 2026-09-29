import dotenv from 'dotenv';

dotenv.config();

const faltantes = ['MONGO_URI', 'DB_NAME'].filter((clave) => !process.env[clave]);
if (faltantes.length) {
  throw new Error(`Faltan variables de entorno: ${faltantes.join(', ')}. Copie .env.example a .env`);
}

if (process.env.TIMEZONE) process.env.TZ = process.env.TIMEZONE;

export const config = Object.freeze({
  mongoUri: process.env.MONGO_URI,
  dbName: process.env.DB_NAME,
  moneda: process.env.CURRENCY || 'COP',
  locale: process.env.LOCALE || 'es-CO',
  zonaHoraria: process.env.TIMEZONE || Intl.DateTimeFormat().resolvedOptions().timeZone,
  debug: process.env.DEBUG === 'true',
});
