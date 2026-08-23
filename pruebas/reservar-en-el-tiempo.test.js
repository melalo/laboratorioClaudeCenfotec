'use strict';

// Cuándo se puede reservar — condiciones E-19 y E-20 de ESPECIFICACION.md
//
// Nivel: **integración**. El recorrido es intentar apartar un bloque y ver si quedó guardado.
//
// Lo que este archivo NO prueba, y por qué: E-20 pide que un bloque de hoy que ya empezó también
// se rechace. Esa condición depende de la hora exacta en que se corra la suite, y el sistema lee
// el reloj directo sin manera de fijarlo desde una prueba (H-14). Una prueba así pasaría en
// algunas corridas y fallaría en otras, y una prueba que falla una de cada diez veces destruye la
// puerta de calidad: la gente aprende a ignorarla. Queda anotada como bloqueada, no escrita.

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const s = require('./servidor-de-pruebas');

before(s.levantarLaAplicacion);
after(s.bajarLaAplicacion);

test('P-29 · no se reserva una fecha que ya pasó', { todo: 'H-06' }, async () => {
  // Una cancha no se alquila hacia atrás. Se usa el último bloque de hace tres días, que está en
  // el pasado a cualquier hora en que se corra la prueba. Falla si se acepta cualquier fecha con
  // la forma correcta, que es lo que hace el sistema hoy.
  const fechaPasada = s.fechaEnDias(-3);
  await s.reservar({
    cancha: 1, fecha: fechaPasada, hora: 21, cliente: 'Partido de ayer', telefono: '88112233',
  });
  assert.equal(s.buscarReserva({ cancha: 1, fecha: fechaPasada, hora: 21 }), undefined);
});
