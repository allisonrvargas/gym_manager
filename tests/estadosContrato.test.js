import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MaquinaEstadosContrato as M } from '../utils/MaquinaEstadosContrato.js';
import { BusinessRuleError } from '../utils/errors.js';

test('transiciones válidas', () => {
  assert.ok(M.puedeTransicionar('activo', 'cancelado'));
  assert.ok(M.puedeTransicionar('activo', 'finalizado'));
  assert.ok(M.puedeTransicionar('finalizado', 'renovado'));
});

test('estados terminales no cambian', () => {
  assert.throws(() => M.asegurarTransicion('cancelado', 'activo'), BusinessRuleError);
  assert.throws(() => M.asegurarTransicion('renovado', 'cancelado'), BusinessRuleError);
  assert.throws(() => M.asegurarTransicion('finalizado', 'cancelado'), BusinessRuleError);
});
