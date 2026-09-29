import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ObjectId } from 'mongodb';
import { ContratoFactory } from '../factories/ContratoFactory.js';
import { dayjs } from '../utils/dates.js';

const cliente = { _id: new ObjectId(), nombre: 'Ana', apellido: 'Gómez' };
const plan = { _id: new ObjectId(), nombre: 'Quema Grasa', nivel: 'principiante', duracionSemanas: 10, precioMensual: 100000 };

test('genera contrato automático con fechas, precio y saldo', () => {
  const inicio = new Date(2026, 0, 5);
  const contrato = new ContratoFactory().crear({ cliente, plan, fechaInicio: inicio });
  assert.equal(contrato.estado, 'activo');
  assert.equal(contrato.precio, 300000); // 10 semanas → 3 mensualidades
  assert.equal(contrato.saldoPendiente, contrato.precio);
  assert.equal(contrato.montoPagado, 0);
  assert.equal(dayjs(contrato.fechaFin).diff(inicio, 'week'), 10);
  assert.match(contrato.condiciones, /Quema Grasa/);
});

test('respeta condiciones personalizadas y referencia de renovación', () => {
  const anterior = new ObjectId();
  const contrato = new ContratoFactory().crear({ cliente, plan, condiciones: 'Condiciones especiales pactadas', contratoAnteriorId: anterior });
  assert.equal(contrato.condiciones, 'Condiciones especiales pactadas');
  assert.ok(contrato.contratoAnteriorId.equals(anterior));
});
