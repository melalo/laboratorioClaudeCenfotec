'use strict';

// Tarifas — condiciones E-03, E-04, E-05, E-06 de ESPECIFICACION.md
//
// Nivel: la condición es un cálculo con bordes exactos, así que **le corresponde nivel unidad**.
// Se prueba a nivel integración porque `server.js` no exporta la función que calcula la tarifa:
// no hay ninguna manera de llamarla sin levantar la aplicación entera (H-11).

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const s = require('./servidor-de-pruebas');

before(s.levantarLaAplicacion);
after(s.bajarLaAplicacion);

test('P-01 · el bloque de las 8:00 cuesta ₡15.000', async () => {
  // Falla si se cambia la tarifa diurna, o si la hora en que se enciende la luz se mueve
  // antes de las 8:00.
  const cotizacion = await s.cotizar({ fecha: s.fechaEnDias(40), hora: 8 });
  assert.equal(cotizacion.precio, 15000);
});

test('P-02 · el bloque de las 16:00 cuesta ₡15.000, es el último diurno', async () => {
  // Falla si la luz se adelanta a las 16:00 o antes.
  const cotizacion = await s.cotizar({ fecha: s.fechaEnDias(40), hora: 16 });
  assert.equal(cotizacion.precio, 15000);
});

test(
  'P-03 · el bloque de las 17:00 cuesta ₡20.000: la luz ya está encendida',
  async () => {
    // Falla si la luz se atrasa de las 17:00, que es justo lo que hace el sistema hoy.
    const cotizacion = await s.cotizar({ fecha: s.fechaEnDias(40), hora: 17 });
    assert.equal(cotizacion.precio, 20000);
  }
);

test('P-04 · el bloque de las 21:00 cuesta ₡20.000', async () => {
  // Falla si la tarifa con luz cambia, o si el último bloque del día deja de existir.
  const cotizacion = await s.cotizar({ fecha: s.fechaEnDias(40), hora: 21 });
  assert.equal(cotizacion.precio, 20000);
});

test(
  'P-05 · a las 17:00 cobran ₡20.000 los tres caminos: la tabla, la cotización y la reserva',
  async () => {
    // La tarifa está escrita en tres lugares distintos del código (H-15), así que hay que
    // comprobar los tres. Falla si alguno de los tres se queda atrás cuando se corrija la hora
    // de la luz: hoy fallan los tres.
    const fecha = s.fechaEnDias(41);

    const inicio = await s.verPagina(`/?fecha=${fecha}`);
    assert.equal(s.tarifaEnLaTabla(inicio, 17), 20000, 'la tabla de disponibilidad');

    const cotizacion = await s.cotizar({ fecha, hora: 17 });
    assert.equal(cotizacion.precio, 20000, 'la cotización previa');

    const confirmacion = await s.reservar({
      cancha: 1,
      fecha,
      hora: 17,
      cliente: 'Prueba tarifa con luz',
      telefono: '80000005',
    });
    assert.equal(s.precioAnunciado(confirmacion), 20000, 'el precio cobrado');
  }
);

test('P-06 · el 25 de diciembre cuesta lo mismo que cualquier otro día', async () => {
  // Falla si se reactivan los precios de temporada alta que el proveedor dejó apagados
  // (₡18.000 y ₡25.000 para diciembre y enero).
  const navidad = s.proximaNavidad();
  const pagina = await s.verPagina(`/?fecha=${navidad}`);
  assert.equal(s.tarifaEnLaTabla(pagina, 10), 15000, 'un bloque diurno de navidad');
  assert.equal(s.tarifaEnLaTabla(pagina, 19), 20000, 'un bloque con luz de navidad');
});

test('P-07 · un feriado se puede reservar como cualquier otro día', async () => {
  // Falla si se vuelve a usar la lista de feriados que quedó en el código para bloquear días.
  const feriado = s.proximoPrimeroDeEnero();
  const confirmacion = await s.reservar({
    cancha: 2,
    fecha: feriado,
    hora: 10,
    cliente: 'Prueba feriado',
    telefono: '80000007',
  });
  assert.ok(s.numeroDeLaReserva(confirmacion), 'la reserva del feriado tenía que crearse');
  assert.equal(s.precioAnunciado(confirmacion), 15000);
});
