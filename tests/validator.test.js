import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ObjectId } from 'mongodb';
import { Cliente, Movimiento, Seguimiento } from '../models/index.js';
import { ValidationError } from '../utils/errors.js';

const clienteValido = () => ({
  nombre: 'Ana', apellido: 'Gómez', documento: '10203040', email: 'ana@correo.com', telefono: '3001234567',
  fechaNacimiento: new Date(1995, 4, 12), planes: [], activo: true, creadoEn: new Date(), actualizadoEn: new Date(),
});

test('construye un cliente válido', () => {
  assert.doesNotThrow(() => Cliente.build(clienteValido()));
});

test('rechaza email y documento con formato inválido', () => {
  assert.throws(
    () => Cliente.build({ ...clienteValido(), email: 'no-es-email', documento: '12' }),
    (e) => e instanceof ValidationError && e.errores.length === 2,
  );
});

test('rechaza campos obligatorios ausentes', () => {
  const { nombre, ...sinNombre } = clienteValido();
  assert.throws(() => Cliente.build(sinNombre), /nombre: es obligatorio/);
});

test('rechaza edad fuera de rango', () => {
  assert.throws(() => Cliente.build({ ...clienteValido(), fechaNacimiento: new Date() }), /edad/);
});

test('actualización parcial no permite campos inmutables', () => {
  assert.throws(() => Cliente.buildUpdate({ planes: [] }), /no se pueden modificar/);
});

test('mensualidad sin contrato viola regla cruzada', () => {
  assert.throws(() => Movimiento.build({
    tipo: 'ingreso', categoria: 'mensualidad', monto: 100, fecha: new Date(Date.now() - 1000),
    descripcion: 'Pago', metodoPago: 'efectivo', estado: 'registrado', creadoEn: new Date(), clienteId: new ObjectId(),
  }), /requiere clienteId y contratoId/);
});

test('categoría debe corresponder al tipo', () => {
  assert.throws(() => Movimiento.build({
    tipo: 'egreso', categoria: 'mensualidad', monto: 100, fecha: new Date(Date.now() - 1000),
    descripcion: 'X pago', metodoPago: 'efectivo', estado: 'registrado', creadoEn: new Date(),
  }), /categoria/);
});

test('valida objetos anidados (medidas) y rangos', () => {
  const base = { clienteId: new ObjectId(), contratoId: new ObjectId(), planId: new ObjectId(), fecha: new Date(), semana: 1, peso: 70, creadoEn: new Date() };
  assert.doesNotThrow(() => Seguimiento.build({ ...base, medidas: { cintura: 80 } }));
  assert.throws(() => Seguimiento.build({ ...base, medidas: { cintura: 5 } }), /medidas\.cintura/);
  assert.throws(() => Seguimiento.build({ ...base, peso: 1000 }), /peso/);
});
