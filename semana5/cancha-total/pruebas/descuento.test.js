'use strict';

// Descuento de cliente frecuente — condiciones E-07, E-08, E-09, E-10 de ESPECIFICACION.md
//
// Nivel: es una regla de negocio con casos borde, así que **le corresponde nivel unidad**. Se
// prueba a nivel integración porque el conteo del mes y el descuento viven dentro de la ruta que
// crea la reserva, sin función propia y sin nada exportado (H-11).

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const s = require('./servidor-de-pruebas');

before(s.levantarLaAplicacion);
after(s.bajarLaAplicacion);

// Prepara N reservas del mismo cliente en días seguidos del mismo mes, y devuelve sus números.
async function prepararReservas(cantidad, { cancha, mes, primerDia, hora, telefono, cliente }) {
  const numeros = [];
  for (let i = 0; i < cantidad; i++) {
    const dia = String(primerDia + i).padStart(2, '0');
    const pagina = await s.reservar({ cancha, fecha: `${mes}-${dia}`, hora, cliente, telefono });
    const numero = s.numeroDeLaReserva(pagina);
    assert.ok(numero, `no se pudo preparar la reserva ${i + 1} de ${cantidad}`);
    numeros.push(numero);
  }
  return numeros;
}

test('P-08 · con tres reservas activas en el mes, la cuarta lleva 10% de descuento', async () => {
  // Falla si el umbral del cliente frecuente deja de ser cuatro, o si el descuento deja de ser
  // del 10%, o si la reserva que se está haciendo deja de contarse.
  const mes = s.mesEnMeses(2);
  const telefono = '80000008';
  await prepararReservas(3, {
    cancha: 1, mes, primerDia: 5, hora: 9, telefono, cliente: 'Frecuente de prueba',
  });

  const cuarta = await s.reservar({
    cancha: 1, fecha: `${mes}-08`, hora: 9, cliente: 'Frecuente de prueba', telefono,
  });
  assert.equal(s.precioAnunciado(cuarta), 13500);
});

test('P-09 · con dos reservas activas en el mes, la tercera va sin descuento', async () => {
  // Falla si el umbral se afloja a tres reservas.
  const mes = s.mesEnMeses(2);
  const telefono = '80000009';
  await prepararReservas(2, {
    cancha: 1, mes, primerDia: 9, hora: 9, telefono, cliente: 'Casi frecuente',
  });

  const tercera = await s.reservar({
    cancha: 1, fecha: `${mes}-11`, hora: 9, cliente: 'Casi frecuente', telefono,
  });
  assert.equal(s.precioAnunciado(tercera), 15000);
});

test(
  'P-10 · una reserva cancelada no cuenta para el descuento',
  { todo: 'H-02' },
  async () => {
    // Frecuente es el que juega, no el que aparta: con una de las tres cancelada quedan dos
    // activas, y la nueva es la tercera, no la cuarta. Falla si el conteo del mes vuelve a
    // incluir las canceladas, que es lo que hace el sistema hoy.
    const mes = s.mesEnMeses(2);
    const telefono = '80000010';
    const numeros = await prepararReservas(3, {
      cancha: 1, mes, primerDia: 12, hora: 9, telefono, cliente: 'Aparta y cancela',
    });

    await s.cancelar(numeros[0]);
    assert.equal(s.leerReserva(numeros[0]).estado, 'cancelada', 'no se pudo cancelar la primera');

    const cuarta = await s.reservar({
      cancha: 1, fecha: `${mes}-15`, hora: 9, cliente: 'Aparta y cancela', telefono,
    });
    assert.equal(s.precioAnunciado(cuarta), 15000);
  }
);

test('P-11 · el mes que cuenta es el del partido, no el de cuando se apartó', async () => {
  // Las cuatro reservas se hacen hoy, o sea en el mismo mes de creación. Si el conteo mirara la
  // fecha en que se apartó, la cuarta llevaría descuento. Tiene que ir sin descuento, porque en
  // el mes en que se juega es la primera. Falla si el conteo pasa a mirar la fecha de creación.
  const mesDeLasTres = s.mesEnMeses(3);
  const mesDeLaCuarta = s.mesEnMeses(4);
  const telefono = '80000011';
  await prepararReservas(3, {
    cancha: 1, mes: mesDeLasTres, primerDia: 5, hora: 9, telefono, cliente: 'Cruza de mes',
  });

  const cuarta = await s.reservar({
    cancha: 1, fecha: `${mesDeLaCuarta}-05`, hora: 9, cliente: 'Cruza de mes', telefono,
  });
  assert.equal(s.precioAnunciado(cuarta), 15000);
});

test('P-12 · un teléfono no hereda el descuento ganado por otro', async () => {
  // Falla si el conteo deja de distinguir clientes por teléfono, por ejemplo si agrupa por
  // nombre o si suma todas las reservas del mes sin importar de quién son.
  const mes = s.mesEnMeses(2);
  await prepararReservas(3, {
    cancha: 2, mes, primerDia: 5, hora: 9, telefono: '80000012', cliente: 'Dueño del descuento',
  });

  const deOtro = await s.reservar({
    cancha: 2, fecha: `${mes}-08`, hora: 9, cliente: 'Cliente nuevo', telefono: '80000013',
  });
  assert.equal(s.precioAnunciado(deOtro), 15000);
});

test('P-13 · con descuento, un bloque diurno queda cobrado en ₡13.500', async () => {
  // Comprueba el monto que quedó guardado, no solo el que se mostró en pantalla. Falla si el
  // descuento se calcula sobre otra base o se redondea distinto.
  const mes = s.mesEnMeses(2);
  const telefono = '80000014';
  await prepararReservas(3, {
    cancha: 2, mes, primerDia: 9, hora: 9, telefono, cliente: 'Diurno con descuento',
  });

  const cuarta = await s.reservar({
    cancha: 2, fecha: `${mes}-12`, hora: 9, cliente: 'Diurno con descuento', telefono,
  });
  const guardada = s.leerReserva(s.numeroDeLaReserva(cuarta));
  assert.equal(guardada.precio, 13500);
});

test(
  'P-14 · con descuento, un bloque de las 17:00 queda cobrado en ₡18.000',
  { todo: 'H-01' },
  async () => {
    // El 10% se aplica sobre la tarifa con luz, que a las 17:00 es ₡20.000. Falla mientras la
    // hora de la luz esté equivocada: hoy cobra ₡13.500, o sea el descuento sobre la tarifa
    // diurna.
    const mes = s.mesEnMeses(2);
    const telefono = '80000015';
    await prepararReservas(3, {
      cancha: 2, mes, primerDia: 13, hora: 9, telefono, cliente: 'Frecuente con luz',
    });

    const cuarta = await s.reservar({
      cancha: 2, fecha: `${mes}-16`, hora: 17, cliente: 'Frecuente con luz', telefono,
    });
    assert.equal(s.precioAnunciado(cuarta), 18000);
  }
);
