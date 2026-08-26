'use strict';

// Reservar un bloque de hoy — condiciones E-19 y E-20 de ESPECIFICACION.md
//
// Nivel: **integración**. El recorrido es intentar apartar un bloque y ver si quedó guardado.
//
// Este archivo tampoco existía cuando se escribió la suite. El borde de E-20 —un bloque de hoy que
// ya empezó también se rechaza— depende de la hora, y el reloj no se podía fijar (H-14). Pagada
// esa deuda, se puede.
//
// **El reloj queda clavado el martes 25 de agosto de 2026 a las 14:00.** Contra esa hora, el bloque
// de las 10:00 de hoy ya pasó, el de las 14:00 arranca justo en este instante, y el de las 15:00
// todavía no empezó.

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const s = require('./servidor-de-pruebas');

const AHORA = '2026-08-25T14:00:00';
const HOY = '2026-08-25';

before(s.levantarLaAplicacionConReloj(AHORA));
after(s.bajarLaAplicacion);

test(
  'P-46 · no se reserva un bloque de hoy que ya pasó',
  { todo: 'H-06' },
  async () => {
    // Son las 14:00 y alguien intenta apartar el bloque de las 10:00 de hoy. Falla mientras la
    // comprobación mire solo la fecha y no la hora, que es lo que hace hoy: acepta cualquier cosa.
    await s.reservar({
      cancha: 1, fecha: HOY, hora: 10, cliente: 'Llega cuatro horas tarde', telefono: '88112233',
    });
    assert.equal(await s.buscarReserva({ cancha: 1, fecha: HOY, hora: 10 }), undefined);
  }
);

test(
  'P-47 · no se reserva el bloque que arranca justo en este instante',
  { todo: 'H-06' },
  async () => {
    // El borde de E-20, con su número exacto: son las 14:00 en punto y el bloque de las 14:00 ya
    // empezó. Falla si el borde se afloja y deja vender un partido que arrancó.
    await s.reservar({
      cancha: 1, fecha: HOY, hora: 14, cliente: 'Llega justo tarde', telefono: '88112233',
    });
    assert.equal(await s.buscarReserva({ cancha: 1, fecha: HOY, hora: 14 }), undefined);
  }
);

test('P-48 · sí se reserva un bloque de hoy que todavía no empezó', async () => {
  // El otro lado del borde, y está para que el arreglo no se pase de estricto: a las 14:00 el
  // bloque de las 15:00 se tiene que poder vender. Sin esta prueba, "rechazar el pasado" podría
  // implementarse cerrando todo el día de hoy y la cancha perdería siete horas de venta.
  const confirmacion = await s.reservar({
    cancha: 2, fecha: HOY, hora: 15, cliente: 'Llega a tiempo', telefono: '88112233',
  });
  assert.ok(s.numeroDeLaReserva(confirmacion), 'la reserva tenía que crearse');
});
