import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('ningún archivo del repositorio se repite cambiando solo mayúsculas y minúsculas', () => {
  // En Windows y macOS dos archivos así se pisan al clonar y git muestra cambios fantasma
  const archivos = execFileSync('git', ['ls-files'], { cwd: raiz, encoding: 'utf8' }).split('\n').filter(Boolean);
  const vistos = new Map();
  const repetidos = [];
  for (const a of archivos) {
    const clave = a.toLowerCase();
    if (vistos.has(clave)) repetidos.push(`${vistos.get(clave)}  <->  ${a}`);
    else vistos.set(clave, a);
  }
  assert.deepEqual(repetidos, []);
});

function archivosJs(carpeta) {
  const lista = [];
  for (const nombre of readdirSync(carpeta)) {
    if (['node_modules', '.git', 'docs'].includes(nombre)) continue;
    const ruta = join(carpeta, nombre);
    if (statSync(ruta).isDirectory()) lista.push(...archivosJs(ruta));
    else if (nombre.endsWith('.js')) lista.push(ruta);
  }
  return lista;
}

test('todo import relativo apunta a un archivo que existe, con las mayúsculas exactas', () => {
  const problemas = [];
  for (const archivo of archivosJs(raiz)) {
    const codigo = readFileSync(archivo, 'utf8');
    for (const m of codigo.matchAll(/(?:import|export)\s[^'"]*?from\s+['"](\.{1,2}\/[^'"]+)['"]|import\(['"](\.{1,2}\/[^'"]+)['"]\)/g)) {
      const destino = resolve(dirname(archivo), m[1] ?? m[2]);
      const existe = existsSync(destino) && readdirSync(dirname(destino)).includes(destino.split(/[\\/]/).pop());
      if (!existe) problemas.push(`${archivo.replace(raiz, '.')} importa ${m[1] ?? m[2]}`);
    }
  }
  assert.deepEqual(problemas, []);
});