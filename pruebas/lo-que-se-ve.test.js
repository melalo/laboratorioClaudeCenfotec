'use strict';

// Lo que la pantalla muestra — condiciones E-28, E-29, E-30, E-33, E-34, E-35 de ESPECIFICACION.md
//
// Nivel: **integración**. Son recorridos que terminan en lo que la persona ve.
//
// Sobre P-39 y P-40: el precio que el formulario muestra antes de confirmar sale de la cotización
// que la página le pide al servidor. Comprobar esa respuesta es comprobar el número que la persona
// ve, sin necesidad de abrir un navegador.

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const s = require('./servidor-de-pruebas');

before(s.levantarLaAplicacion);
after(s.bajarLaAplicacion);

test('P-35 · la lista del día muestra cada reserva con lo que se cobró', async () => {
  // Falla si la lista deja de mostrar el monto, que es el dato con el que la administradora
  // cierra la caja del día.
  const fecha = s.fechaEnDias(70);
  await s.reservar({ cancha: 1, fecha, hora: 9, cliente: 'Partido diurno', telefono: '88112233' });
  await s.reservar({ cancha: 2, fecha, hora: 19, cliente: 'Partido nocturno', telefono: '87654321' });

  const pagina = await s.verPagina(`/dia/${fecha}`);
  assert.match(pagina, /Partido diurno/);
  assert.match(pagina, /Partido nocturno/);
  assert.match(pagina, /₡15\.000/);
  assert.match(pagina, /₡20\.000/);
});

test('P-36 · la lista del día incluye las canceladas, marcadas como tales', async () => {
  // Falla si una cancelada desaparece de la lista o si se muestra igual que una que se juega:
  // en los dos casos la administradora cuenta plata que no entró.
  const fecha = s.fechaEnDias(71);
  const confirmacion = await s.reservar({
    cancha: 1, fecha, hora: 11, cliente: 'Se canceló', telefono: '88112233',
  });
  await s.cancelar(s.numeroDeLaReserva(confirmacion));

  const pagina = await s.verPagina(`/dia/${fecha}`);
  assert.match(pagina, /Se canceló/, 'la cancelada tenía que seguir apareciendo');
  assert.match(pagina, /cancelada/, 'y tenía que estar marcada como cancelada');
});

test('P-37 · un día sin reservas lo dice', async () => {
  // Falla si un día vacío muestra una tabla en blanco, que se lee como una pantalla rota.
  const pagina = await s.verPagina(`/dia/${s.fechaEnDias(72)}`);
  assert.match(pagina, /No hay reservas/i);
});

test('P-38 · un nombre con signos de código se muestra como texto', { todo: 'H-07' }, async () => {
  // Lo que el cliente escribió tiene que verse tal cual, nunca ejecutarse como parte de la
  // página. Falla mientras el nombre se meta en la pantalla sin limpiarlo, que es lo que pasa
  // hoy: el navegador lo interpreta en vez de mostrarlo.
  const fecha = s.fechaEnDias(73);
  await s.reservar({
    cancha: 1, fecha, hora: 13, cliente: 'Los <b>Tigres</b>', telefono: '88112233',
  });

  const pagina = await s.verPagina(`/dia/${fecha}`);
  assert.ok(
    pagina.includes('Los &lt;b&gt;Tigres&lt;/b&gt;'),
    'el nombre tenía que llegar al navegador como texto'
  );
  assert.ok(
    !pagina.includes('Los <b>Tigres</b>'),
    'el nombre no tenía que llegar como parte de la página'
  );
});

test(
  'P-39 · el precio que se muestra antes de confirmar incluye el descuento',
  { todo: 'H-08' },
  async () => {
    // Lo que se muestra tiene que ser lo que se cobra. Falla mientras la cotización mire solo el
    // horario y se olvide del cliente, que es lo que hace hoy: muestra ₡15.000 y cobra ₡13.500.
    const mes = s.mesEnMeses(5);
    const telefono = '80000039';
    for (const dia of ['05', '06', '07']) {
      const pagina = await s.reservar({
        cancha: 1, fecha: `${mes}-${dia}`, hora: 9, cliente: 'Frecuente que cotiza', telefono,
      });
      assert.ok(s.numeroDeLaReserva(pagina), 'no se pudo preparar la reserva previa');
    }

    const cotizacion = await s.cotizar({ fecha: `${mes}-08`, hora: 9, telefono });
    assert.equal(cotizacion.precio, 13500);
  }
);

test(
  'P-40 · sin el teléfono completo, se avisa que falta para saber el precio',
  { todo: 'H-09' },
  async () => {
    // Sin teléfono no se puede saber si hay descuento, así que la pantalla muestra la tarifa del
    // bloque y lo dice. Falla mientras se muestre un número pelado que puede no ser el que se
    // cobra, que es lo que pasa hoy.
    const cotizacion = await s.cotizar({ fecha: s.fechaEnDias(74), hora: 9 });
    assert.equal(cotizacion.precio, 15000, 'igual tiene que mostrar la tarifa del bloque');
    assert.match(
      JSON.stringify(cotizacion),
      /tel[eé]fono/i,
      'la respuesta tenía que avisar que falta el teléfono'
    );
  }
);
