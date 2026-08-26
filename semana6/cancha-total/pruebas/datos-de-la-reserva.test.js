'use strict';

// Los datos de una reserva — condiciones E-11 a E-16 y E-40 de ESPECIFICACION.md
//
// Nivel: **integración**. Cada condición describe el recorrido de crear una reserva, desde el
// formulario hasta el efecto observable: la reserva quedó guardada, o no quedó. Una prueba así
// sobrevive a que el código se reordene por dentro, que es justo lo que hace falta antes de
// refactorizar.

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const s = require('./servidor-de-pruebas');

before(s.levantarLaAplicacion);
after(s.bajarLaAplicacion);

test('P-15 · sin teléfono no se crea la reserva', async () => {
  // El teléfono es la forma de ubicar al cliente y de reconocerlo como frecuente, así que es
  // obligatorio. Falla si el teléfono vuelve a ser opcional, que es lo que pasa hoy.
  const fecha = s.fechaEnDias(50);
  await s.reservar({ cancha: 1, fecha, hora: 10, cliente: 'Sin teléfono' });
  assert.equal(s.buscarReserva({ cancha: 1, fecha, hora: 10 }), undefined);
});

test('P-16 · un teléfono de 7 dígitos se rechaza', async () => {
  // Falla si se acepta un teléfono más corto que 8 dígitos. Hoy se acepta cualquier cosa.
  const fecha = s.fechaEnDias(51);
  await s.reservar({ cancha: 1, fecha, hora: 10, cliente: 'Corto', telefono: '8811223' });
  assert.equal(s.buscarReserva({ cancha: 1, fecha, hora: 10 }), undefined);
});

test('P-17 · un teléfono de 9 dígitos se rechaza', async () => {
  // Falla si se acepta un teléfono más largo que 8 dígitos.
  const fecha = s.fechaEnDias(52);
  await s.reservar({ cancha: 1, fecha, hora: 10, cliente: 'Largo', telefono: '881122334' });
  assert.equal(s.buscarReserva({ cancha: 1, fecha, hora: 10 }), undefined);
});

test('P-18 · un teléfono con letras se rechaza', async () => {
  // Son 8 dígitos, no 8 caracteres. Falla si se acepta algo que no sean números.
  const fecha = s.fechaEnDias(53);
  await s.reservar({ cancha: 1, fecha, hora: 10, cliente: 'Con letras', telefono: '8811ab33' });
  assert.equal(s.buscarReserva({ cancha: 1, fecha, hora: 10 }), undefined);
});

test('P-19 · un teléfono de 8 dígitos se acepta', async () => {
  // El otro lado del borde: la validación del teléfono no puede quedar tan dura que rechace lo
  // que sí es válido. Falla si se exige un formato distinto de 8 dígitos.
  const fecha = s.fechaEnDias(54);
  const confirmacion = await s.reservar({
    cancha: 1, fecha, hora: 10, cliente: 'Teléfono correcto', telefono: '88112233',
  });
  assert.ok(s.numeroDeLaReserva(confirmacion), 'la reserva tenía que crearse');
  assert.equal(s.buscarReserva({ cancha: 1, fecha, hora: 10 }).telefono, '88112233');
});

test('P-20 · sin el nombre del cliente no se crea la reserva', async () => {
  // Falla si el nombre pasa a ser opcional.
  const fecha = s.fechaEnDias(55);
  const respuesta = await s.reservar({ cancha: 1, fecha, hora: 10, telefono: '88112233' });
  assert.equal(s.buscarReserva({ cancha: 1, fecha, hora: 10 }), undefined);
  assert.match(respuesta, /nombre del cliente/i, 'la pantalla tenía que decir qué falta');
});

test('P-21 · una cancha que no es 1 ni 2 se rechaza', async () => {
  // Hay exactamente dos canchas. Falla si aparece una tercera por la puerta de atrás.
  const fecha = s.fechaEnDias(56);
  await s.reservar({ cancha: 3, fecha, hora: 10, cliente: 'Cancha inventada', telefono: '88112233' });
  assert.equal(s.buscarReserva({ cancha: 3, fecha, hora: 10 }), undefined);
});

test('P-22 · las horas 7:00 y 22:00 se rechazan: están fuera del día de alquiler', async () => {
  // Los bloques van de 8:00 a 21:00. Falla si el día de alquiler se estira por cualquiera de
  // sus dos puntas.
  const antes = s.fechaEnDias(57);
  await s.reservar({ cancha: 1, fecha: antes, hora: 7, cliente: 'Muy temprano', telefono: '88112233' });
  assert.equal(s.buscarReserva({ cancha: 1, fecha: antes, hora: 7 }), undefined);

  const despues = s.fechaEnDias(58);
  await s.reservar({ cancha: 1, fecha: despues, hora: 22, cliente: 'Muy tarde', telefono: '88112233' });
  assert.equal(s.buscarReserva({ cancha: 1, fecha: despues, hora: 22 }), undefined);
});

test('P-23 · una fecha que no existe en el calendario se rechaza', { todo: 'H-05' }, async () => {
  // El 30 de febrero no existe ningún año: una reserva ahí queda en un día al que nadie puede
  // llegar. Falla si solo se revisa la forma de la fecha y no que el día exista, que es lo que
  // pasa hoy.
  const imposible = `${new Date().getFullYear() + 1}-02-30`;
  await s.reservar({
    cancha: 1, fecha: imposible, hora: 10, cliente: 'Fecha imposible', telefono: '88112233',
  });
  assert.equal(s.buscarReserva({ cancha: 1, fecha: imposible, hora: 10 }), undefined);
});

test('P-24 · la reserva guarda el precio que se le cobró al cliente', async () => {
  // Falla si lo que se muestra en la confirmación y lo que queda guardado se separan; ahí es
  // donde nacen las quejas por cobros.
  const fecha = s.fechaEnDias(59);
  const confirmacion = await s.reservar({
    cancha: 2, fecha, hora: 19, cliente: 'Precio guardado', telefono: '88112233',
  });
  const guardada = s.leerReserva(s.numeroDeLaReserva(confirmacion));
  assert.equal(guardada.precio, s.precioAnunciado(confirmacion));
  assert.equal(guardada.precio, 20000);
});
