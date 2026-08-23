'use strict';

// Cancelar — condiciones E-21, E-23, E-24, E-26 de ESPECIFICACION.md
//
// Nivel: **integración**. El recorrido es apretar Cancelar y ver si la reserva quedó cancelada.
//
// Lo que este archivo NO prueba, y por qué: el caso central de la regla de las 24 horas —el
// partido es mañana a las 8:00 y ya son las 23:00 de hoy— y su borde exacto (E-21 en su parte
// horaria y E-22) dependen de la hora en que se corra la suite. El sistema lee el reloj directo y
// no hay manera de fijarlo desde una prueba (H-14), así que esas condiciones quedan anotadas como
// bloqueadas en lugar de escribirse como pruebas inestables. Lo que sí se prueba acá son los dos
// extremos que dan siempre la misma respuesta: un partido de dentro de varios días se puede
// cancelar, y un partido de hoy no.

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const s = require('./servidor-de-pruebas');

before(s.levantarLaAplicacion);
after(s.bajarLaAplicacion);

test('P-30 · una reserva de dentro de tres días se puede cancelar', async () => {
  // Faltan más de 24 horas a cualquier hora del día en que se corra. Falla si la cancelación se
  // cierra de más y el cliente pierde el derecho que la administradora le da.
  const fecha = s.fechaEnDias(3);
  const confirmacion = await s.reservar({
    cancha: 1, fecha, hora: 15, cliente: 'Cancela a tiempo', telefono: '88112233',
  });
  const numero = s.numeroDeLaReserva(confirmacion);

  await s.cancelar(numero);
  assert.equal(s.leerReserva(numero).estado, 'cancelada');
});

test('P-31 · una reserva de hoy no se puede cancelar', async () => {
  // Un partido de hoy está a menos de 24 horas a cualquier hora en que se corra la prueba, así
  // que se cobra completo. La reserva se siembra directo en la base porque el formulario no
  // dejaría crearla una vez que E-19 esté implementada. Falla si la regla de las 24 horas se
  // afloja y deja cancelar el mismo día.
  const numero = s.sembrarReserva({
    cancha: 1, fecha: s.hoy(), hora: 21, cliente: 'Cancela tarde', telefono: '88112233',
    precio: 20000,
  });

  await s.cancelar(numero);
  assert.equal(s.leerReserva(numero).estado, 'activa');
});

test('P-32 · al rechazar una cancelación, la pantalla dice el motivo', async () => {
  // Falla si el mensaje deja de nombrar el plazo, y la administradora se queda sin poder
  // explicarle al cliente por qué se le cobra.
  const numero = s.sembrarReserva({
    cancha: 2, fecha: s.hoy(), hora: 20, cliente: 'Quiere saber por qué', telefono: '88112233',
    precio: 20000,
  });

  const respuesta = await s.cancelar(numero);
  assert.match(respuesta, /24 horas/);
  assert.match(respuesta, /no se puede cancelar/i);
});

test('P-33 · una reserva ya cancelada no se vuelve a cancelar', async () => {
  // Falla si cancelar dos veces cambia algo, por ejemplo si pisa la fecha o el estado.
  const fecha = s.fechaEnDias(5);
  const confirmacion = await s.reservar({
    cancha: 1, fecha, hora: 16, cliente: 'Cancela dos veces', telefono: '88112233',
  });
  const numero = s.numeroDeLaReserva(confirmacion);

  await s.cancelar(numero);
  const comoQuedo = s.leerReserva(numero);

  const respuesta = await s.cancelar(numero);
  assert.match(respuesta, /ya estaba cancelada/i);
  assert.deepEqual(s.leerReserva(numero), comoQuedo, 'la segunda cancelación no tenía que cambiar nada');
});

test('P-34 · cancelar una reserva que no existe no cambia nada', async () => {
  // Falla si un número inventado borra, cancela o crea algo.
  const antes = s.contarReservas();

  const respuesta = await s.cancelar(999999);
  assert.match(respuesta, /no existe/i);
  assert.equal(s.contarReservas(), antes);
});
