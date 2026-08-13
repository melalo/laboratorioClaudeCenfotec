// Comprobaciones de la regla "semana vigente".
// La semana del cine va de jueves a miercoles, porque los estrenos entran los jueves
// (ESPECIFICACION.md, glosario "Cartelera"; DISENO.md, "Otras decisiones").

import test from 'node:test';
import assert from 'node:assert/strict';

import { semanaVigente, diasDeLaSemana } from '../src/semana.js';

test('si hoy es jueves, la semana vigente arranca hoy y termina el miercoles siguiente', () => {
  // jueves 13 de agosto de 2026
  assert.deepEqual(semanaVigente(new Date(2026, 7, 13, 10, 0)), {
    inicio: '2026-08-13',
    fin: '2026-08-19',
  });
});

test('si hoy es sabado, la semana vigente sigue siendo la que arranco el jueves anterior', () => {
  // sabado 15 de agosto de 2026
  assert.deepEqual(semanaVigente(new Date(2026, 7, 15, 10, 0)), {
    inicio: '2026-08-13',
    fin: '2026-08-19',
  });
});

test('el miercoles es el ultimo dia de la semana vigente, no el primero de la siguiente', () => {
  // miercoles 19 de agosto de 2026
  assert.deepEqual(semanaVigente(new Date(2026, 7, 19, 23, 0)), {
    inicio: '2026-08-13',
    fin: '2026-08-19',
  });
});

test('el jueves siguiente empieza una semana vigente nueva', () => {
  // jueves 20 de agosto de 2026
  assert.deepEqual(semanaVigente(new Date(2026, 7, 20, 0, 1)), {
    inicio: '2026-08-20',
    fin: '2026-08-26',
  });
});

test('la semana vigente se calcula bien cuando cruza de un mes al otro', () => {
  // martes 1 de setiembre de 2026: el jueves anterior fue el 27 de agosto
  assert.deepEqual(semanaVigente(new Date(2026, 8, 1, 12, 0)), {
    inicio: '2026-08-27',
    fin: '2026-09-02',
  });
});

test('la hora del dia no cambia cual es la semana vigente', () => {
  const temprano = semanaVigente(new Date(2026, 7, 15, 0, 1));
  const tarde = semanaVigente(new Date(2026, 7, 15, 23, 59));
  assert.deepEqual(temprano, tarde);
});

test('la semana vigente tiene 7 dias, del jueves al miercoles, en orden', () => {
  const dias = diasDeLaSemana(new Date(2026, 7, 15, 10, 0));
  assert.equal(dias.length, 7);
  assert.equal(dias[0], '2026-08-13'); // jueves
  assert.equal(dias[6], '2026-08-19'); // miercoles
});
