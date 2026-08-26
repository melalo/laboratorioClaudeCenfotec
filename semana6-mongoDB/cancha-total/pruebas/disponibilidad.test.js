'use strict';

// Qué se alquila y qué está libre — condiciones E-01, E-02, E-17, E-18, E-27 de ESPECIFICACION.md
//
// Nivel: **integración**. Son recorridos del negocio: mirar el día y vender un bloque. El efecto
// observable es lo que la pantalla muestra y lo que quedó guardado.

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const s = require('./servidor-de-pruebas');

before(s.levantarLaAplicacion);
after(s.bajarLaAplicacion);

test('P-25 · cada cancha muestra 14 bloques de una hora, de 8:00 a 21:00', async () => {
  // Falla si se agrega o se quita un bloque en cualquiera de las dos puntas del día, o si una
  // de las dos canchas desaparece de la pantalla.
  const fecha = s.fechaEnDias(60);

  for (const cancha of [1, 2]) {
    const pagina = await s.verPagina(`/disponibilidad/cancha${cancha}?fecha=${fecha}`);
    assert.equal(s.cuantosBloquesMuestra(pagina), 14, `la cancha ${cancha} tenía que mostrar 14`);
    for (let hora = 8; hora <= 21; hora++) {
      assert.ok(pagina.includes(`<td>${hora}:00</td>`), `falta el bloque de las ${hora}:00`);
    }
    assert.ok(!pagina.includes('<td>7:00</td>'), 'no tenía que haber bloque de 7:00');
    assert.ok(!pagina.includes('<td>22:00</td>'), 'no tenía que haber bloque de 22:00');
  }

  const inicio = await s.verPagina(`/?fecha=${fecha}`);
  assert.equal(s.cuantosBloquesMuestra(inicio), 28, 'la portada muestra las dos canchas juntas');
});

test('P-26 · un bloque reservado se muestra ocupado, y solo en su cancha', async () => {
  // Falla si la disponibilidad deja de mirar la cancha y una reserva bloquea las dos.
  const fecha = s.fechaEnDias(61);
  await s.reservar({
    cancha: 1, fecha, hora: 10, cliente: 'Ocupa la cancha 1', telefono: '88112233',
  });

  const cancha1 = await s.verPagina(`/disponibilidad/cancha1?fecha=${fecha}`);
  assert.equal(s.estadoDelBloque(cancha1, 10), 'ocupado');

  const cancha2 = await s.verPagina(`/disponibilidad/cancha2?fecha=${fecha}`);
  assert.equal(s.estadoDelBloque(cancha2, 10), 'libre');
});

test('P-27 · un bloque ya vendido no se vuelve a vender', async () => {
  // Falla si dos clientes pueden quedarse con la misma hora en la misma cancha, que es la
  // manera más caliente de romper este negocio.
  const fecha = s.fechaEnDias(62);
  const primera = await s.reservar({
    cancha: 1, fecha, hora: 12, cliente: 'Llegó primero', telefono: '88112233',
  });
  assert.ok(s.numeroDeLaReserva(primera), 'la primera reserva tenía que crearse');

  await s.reservar({ cancha: 1, fecha, hora: 12, cliente: 'Llegó después', telefono: '87654321' });

  const enEseBloque = (await s.reservasDelDia(fecha)).filter((r) => r.cancha === 1 && r.hora === 12);
  assert.equal(enEseBloque.length, 1, 'tenía que quedar una sola reserva en ese bloque');
  assert.equal(enEseBloque[0].cliente, 'Llegó primero');
});

test('P-28 · un bloque cancelado queda libre otra vez y se puede vender de nuevo', async () => {
  // Falla si una cancelación deja el bloque muerto y la cancha se queda sin vender esa hora.
  const fecha = s.fechaEnDias(63);
  const primera = await s.reservar({
    cancha: 2, fecha, hora: 14, cliente: 'Se arrepintió', telefono: '88112233',
  });
  await s.cancelar(s.numeroDeLaReserva(primera));

  const pagina = await s.verPagina(`/disponibilidad/cancha2?fecha=${fecha}`);
  assert.equal(s.estadoDelBloque(pagina, 14), 'libre');

  const segunda = await s.reservar({
    cancha: 2, fecha, hora: 14, cliente: 'Aprovechó el hueco', telefono: '87654321',
  });
  assert.ok(s.numeroDeLaReserva(segunda), 'el bloque liberado tenía que poder venderse otra vez');
});
