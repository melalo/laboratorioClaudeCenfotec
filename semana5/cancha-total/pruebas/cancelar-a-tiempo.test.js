'use strict';

// La regla de las 24 horas — condiciones E-21 y E-23 de ESPECIFICACION.md
//
// Nivel: es una regla con un borde exacto, así que **le corresponde nivel unidad**. Se prueba a
// nivel integración porque la comprobación vive dentro de la ruta que cancela y `server.js` no
// exporta nada (H-11).
//
// Este archivo no existía cuando se escribió la suite: no se podía escribir. El sistema leía el
// reloj directo y una prueba de esta regla daba un resultado distinto según la hora en que se
// corriera (H-14). Pagada esa deuda, el reloj se puede fijar, y con el reloj fijo la respuesta
// correcta es siempre la misma.
//
// **El reloj queda clavado el martes 25 de agosto de 2026 a las 23:00**, que es la hora del
// ejemplo que dio la administradora. El borde exacto de las 24 horas se prueba aparte, en
// `cancelar-en-el-borde.test.js`, porque con el reloj en las 23:00 no hay ningún bloque del día
// que caiga a exactamente 24 horas: los bloques van de 8:00 a 21:00.

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const s = require('./servidor-de-pruebas');

const AHORA = '2026-08-25T23:00:00';

before(s.levantarLaAplicacionConReloj(AHORA));
after(s.bajarLaAplicacion);

test(
  'P-41 · con el partido mañana a las 8:00 y ya las 23:00 de hoy, no se puede cancelar',
  { todo: 'H-10' },
  async () => {
    // Es el caso que describió la administradora, palabra por palabra: faltan 9 horas, no hay
    // marcha atrás y se cobra completo. Falla mientras la regla compare solo días y no mire la
    // hora, que es lo que hace hoy: el sistema cancela igual porque el partido es "de mañana".
    const numero = s.sembrarReserva({
      cancha: 1, fecha: '2026-08-26', hora: 8, cliente: 'Cancela a las once de la noche',
      telefono: '88112233', precio: 15000,
    });

    await s.cancelar(numero);
    assert.equal(s.leerReserva(numero).estado, 'activa');
  }
);

test('P-44 · con 33 horas de aviso se puede cancelar', async () => {
  // El caso holgado, que ya funcionaba: el partido es pasado mañana a las 8:00. Está para que el
  // arreglo de la regla no se pase de estricto y cierre cancelaciones legítimas.
  const numero = s.sembrarReserva({
    cancha: 1, fecha: '2026-08-27', hora: 8, cliente: 'Avisa con tiempo',
    telefono: '88112233', precio: 15000,
  });

  await s.cancelar(numero);
  assert.equal(s.leerReserva(numero).estado, 'cancelada');
});

test(
  'P-45 · al rechazar por el plazo, el mensaje nombra el plazo que se comprobó',
  { todo: 'H-10' },
  async () => {
    // E-23: el mensaje tiene que decir el motivo verdadero. Falla mientras el sistema ni siquiera
    // rechace este caso: hoy lo cancela y muestra la pantalla de cancelación, así que el mensaje
    // del plazo no aparece nunca cuando de verdad corresponde.
    const numero = s.sembrarReserva({
      cancha: 2, fecha: '2026-08-26', hora: 9, cliente: 'Quiere saber por qué',
      telefono: '88112233', precio: 15000,
    });

    const respuesta = await s.cancelar(numero);
    assert.match(respuesta, /24 horas/);
    assert.match(respuesta, /no se puede cancelar/i);
  }
);
