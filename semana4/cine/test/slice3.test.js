// Comprobaciones del vertical slice 3: "Compra en linea completa" (PLAN.md).
// Cada prueba corresponde a una condicion del "Que tiene que ser cierto" o a una linea
// del "Con que se comprueba" del plan. Todas usan el servidor de verdad y una base
// SQLite de verdad, en un archivo temporal.
//
// Precio base ₡4.000, descuento de miercoles 50%, de estudiante 30% (config.json y
// DISENO.md, "Otras decisiones"). La semana de prueba va del jueves 13 al miercoles 19
// de agosto de 2026, asi que el 19 es el unico miercoles y el 13 sirve de dia comun.

import test from 'node:test';
import assert from 'node:assert/strict';

import { configuracion } from '../src/config.js';
import { sembrarDatosDePrueba } from '../src/datos-de-prueba.js';
import {
  levantarApp,
  compraGuardada,
  JUEVES_DE_PRUEBA,
  contarAsientosDisponibles,
  contarAsientosEligiendo,
  contarAsientosOcupados,
  funcionDelDia,
  idDelRedirect,
  DIA_COMUN_DE_PRUEBA,
  MIERCOLES_DE_PRUEBA,
} from './ayuda.js';

// Un codigo de confirmacion: 'CV-' y seis caracteres del alfabeto sin O, I, S, 0, 1 ni 5
// (DISENO.md, "Que forma tiene el codigo de confirmacion").
const FORMA_DEL_CODIGO = /CV-[A-HJ-NP-RT-Z2-46-9]{6}/;

const CLIENTE = { nombre: 'Marta Solano', identificacion: '1-2345-6789' };

// Envejecer la reserva en la base evita esperar tres minutos de verdad. La comprobacion
// con el reloj real se hace a mano, una sola vez (igual que en el vertical slice 2).
function envejecerReservas(db, minutos) {
  db.prepare(`UPDATE compras SET creada_en = datetime(creada_en, '-${minutos} minutes')`).run();
}

// Reservar y pagar de una sentada, que es el recorrido completo del cliente en linea.
async function comprar(app, { dia, asientos, estudiantes = 0, datos = CLIENTE, capacidad = 120 }) {
  const funcion = funcionDelDia(app.db, dia, capacidad);
  const cliente = app.navegador();

  const reservada = await cliente.enviar(`/funciones/${funcion.id}/reservar`, { asientos });
  const compraId = idDelRedirect(reservada);

  const pagada = await cliente.enviar(`/reservas/${compraId}/pagar`, { ...datos, estudiantes });
  return { funcion, cliente, compraId, respuesta: pagada };
}

// ---------------------------------------------------------------------------
// El precio y los descuentos (RF-8, RN-1 a RN-4)
// ---------------------------------------------------------------------------

test('la configuracion trae el precio base y los dos porcentajes acordados', () => {
  assert.equal(configuracion.precioBase, 4000, 'el precio base acordado es ₡4.000');
  assert.equal(configuracion.descuentoMiercoles, 50, 'RN-2: la mitad del precio base');
  assert.equal(configuracion.descuentoEstudiante, 30, 'RN-3: 30% sobre el precio base');
});

test('un miercoles sin estudiantes se cobra la mitad del precio base (RN-2)', async () => {
  const app = await levantarApp();
  try {
    const { compraId, respuesta } = await comprar(app, {
      dia: MIERCOLES_DE_PRUEBA,
      asientos: ['B3'],
    });

    assert.equal(respuesta.status, 302);
    const compra = compraGuardada(app.db, compraId);
    assert.equal(compra.estado, 'pagada');
    assert.equal(compra.total, 2000);
    assert.deepEqual(compra.boletos, [{ codigo: 'B3', descuento: 'miercoles', precio: 2000 }]);
  } finally {
    await app.cerrar();
  }
});

test('un dia comun, un boleto de estudiante paga el 70% del precio base (RN-3)', async () => {
  const app = await levantarApp();
  try {
    const { compraId } = await comprar(app, {
      dia: DIA_COMUN_DE_PRUEBA,
      asientos: ['B3'],
      estudiantes: 1,
    });

    const compra = compraGuardada(app.db, compraId);
    assert.equal(compra.total, 2800);
    assert.deepEqual(compra.boletos, [{ codigo: 'B3', descuento: 'estudiante', precio: 2800 }]);
  } finally {
    await app.cerrar();
  }
});

test('un miercoles, un estudiante paga la mitad y no los dos descuentos sumados (RN-4)', async () => {
  const app = await levantarApp();
  try {
    const { compraId } = await comprar(app, {
      dia: MIERCOLES_DE_PRUEBA,
      asientos: ['B3'],
      estudiantes: 1,
    });

    const compra = compraGuardada(app.db, compraId);
    // 50% le gana a 30%. Sumados darian ₡1.400, y ese numero no debe aparecer nunca.
    assert.equal(compra.total, 2000);
    assert.equal(compra.boletos[0].descuento, 'miercoles', 'se registra el descuento que se aplico');
  } finally {
    await app.cerrar();
  }
});

test('de 3 asientos, solo los 2 declarados de estudiante llevan descuento (RF-5)', async () => {
  const app = await levantarApp();
  try {
    const { compraId } = await comprar(app, {
      dia: DIA_COMUN_DE_PRUEBA,
      asientos: ['D1', 'D2', 'D3'],
      estudiantes: 2,
    });

    const compra = compraGuardada(app.db, compraId);
    assert.equal(compra.total, 9600, '2 x ₡2.800 + 1 x ₡4.000');
    assert.equal(compra.estudiantes, 2);

    const conDescuento = compra.boletos.filter((b) => b.descuento === 'estudiante');
    const sinDescuento = compra.boletos.filter((b) => b.descuento === 'ninguno');
    assert.equal(conDescuento.length, 2);
    assert.equal(sinDescuento.length, 1);
    assert.deepEqual(conDescuento.map((b) => b.precio), [2800, 2800]);
    assert.deepEqual(sinDescuento.map((b) => b.precio), [4000]);
  } finally {
    await app.cerrar();
  }
});

test('sin declarar estudiantes se paga el precio base completo (RN-1)', async () => {
  const app = await levantarApp();
  try {
    const { compraId } = await comprar(app, { dia: DIA_COMUN_DE_PRUEBA, asientos: ['E5', 'E6'] });

    const compra = compraGuardada(app.db, compraId);
    assert.equal(compra.total, 8000);
    assert.ok(compra.boletos.every((b) => b.descuento === 'ninguno' && b.precio === 4000));
  } finally {
    await app.cerrar();
  }
});

test('el precio sale de la configuracion, no esta escrito dentro del codigo', async () => {
  const app = await levantarApp({
    tarifas: { precioBase: 5000, descuentoMiercoles: 50, descuentoEstudiante: 30 },
  });
  try {
    const { compraId } = await comprar(app, { dia: DIA_COMUN_DE_PRUEBA, asientos: ['F1'] });
    assert.equal(compraGuardada(app.db, compraId).total, 5000);

    const otro = await comprar(app, { dia: MIERCOLES_DE_PRUEBA, asientos: ['F2'] });
    assert.equal(compraGuardada(app.db, otro.compraId).total, 2500, 'la mitad del nuevo precio base');
  } finally {
    await app.cerrar();
  }
});

// ---------------------------------------------------------------------------
// Los datos del cliente (RF-6, RN-14) y lo que no se acepta
// ---------------------------------------------------------------------------

test('la compra guarda el nombre y la identificacion del cliente, sin crear cuenta', async () => {
  const app = await levantarApp();
  try {
    const { compraId } = await comprar(app, { dia: DIA_COMUN_DE_PRUEBA, asientos: ['A1'] });

    const compra = compraGuardada(app.db, compraId);
    assert.equal(compra.nombre, CLIENTE.nombre);
    assert.equal(compra.identificacion, CLIENTE.identificacion);
    assert.equal(compra.metodo, 'linea', 'RN-8: toda compra queda con su metodo');

    // RN-14: comprar no crea ninguna cuenta. Las unicas son las dos del personal.
    const { cuantas } = app.db.prepare('SELECT COUNT(*) AS cuantas FROM cuentas').get();
    assert.equal(cuantas, 2);
  } finally {
    await app.cerrar();
  }
});

test('no se puede pagar sin nombre ni sin numero de identificacion', async () => {
  const app = await levantarApp();
  try {
    const funcion = funcionDelDia(app.db, DIA_COMUN_DE_PRUEBA);
    const cliente = app.navegador();
    const compraId = idDelRedirect(
      await cliente.enviar(`/funciones/${funcion.id}/reservar`, { asientos: ['G1'] }),
    );

    const sinNombre = await cliente.enviar(`/reservas/${compraId}/pagar`, {
      nombre: '   ',
      identificacion: '1-2345-6789',
      estudiantes: 0,
    });
    assert.equal(sinNombre.status, 400);

    const sinCedula = await cliente.enviar(`/reservas/${compraId}/pagar`, {
      nombre: 'Marta Solano',
      identificacion: '',
      estudiantes: 0,
    });
    assert.equal(sinCedula.status, 400);

    assert.equal(compraGuardada(app.db, compraId).estado, 'reservada', 'la compra no se pago');
  } finally {
    await app.cerrar();
  }
});

test('no se pueden declarar mas estudiantes que asientos reservados', async () => {
  const app = await levantarApp();
  try {
    const funcion = funcionDelDia(app.db, DIA_COMUN_DE_PRUEBA);
    const cliente = app.navegador();
    const compraId = idDelRedirect(
      await cliente.enviar(`/funciones/${funcion.id}/reservar`, { asientos: ['H1', 'H2'] }),
    );

    const respuesta = await cliente.enviar(`/reservas/${compraId}/pagar`, { ...CLIENTE, estudiantes: 3 });

    assert.equal(respuesta.status, 400);
    assert.match(await respuesta.text(), /estudiante/i);
    assert.equal(compraGuardada(app.db, compraId).estado, 'reservada');
  } finally {
    await app.cerrar();
  }
});

test('nadie puede pagar la reserva hecha desde otro navegador', async () => {
  const app = await levantarApp();
  try {
    const funcion = funcionDelDia(app.db, DIA_COMUN_DE_PRUEBA);
    const compraId = idDelRedirect(
      await app.navegador().enviar(`/funciones/${funcion.id}/reservar`, { asientos: ['I1'] }),
    );

    const intruso = await app.navegador().enviar(`/reservas/${compraId}/pagar`, { ...CLIENTE, estudiantes: 0 });

    assert.equal(intruso.status, 404);
    assert.equal(compraGuardada(app.db, compraId).estado, 'reservada');
  } finally {
    await app.cerrar();
  }
});

// ---------------------------------------------------------------------------
// El pago simulado y el codigo de confirmacion (RF-9, RF-10)
// ---------------------------------------------------------------------------

test('la pantalla de la reserva muestra la tabla de tipos de boleto antes de pagar', async () => {
  const app = await levantarApp();
  try {
    const funcion = funcionDelDia(app.db, DIA_COMUN_DE_PRUEBA);
    const cliente = app.navegador();
    const compraId = idDelRedirect(
      await cliente.enviar(`/funciones/${funcion.id}/reservar`, { asientos: ['J1', 'J2'] }),
    );

    const html = await (await cliente.ver(`/reservas/${compraId}`)).text();

    // Las dos filas de la tabla, cada una con su precio (DISENO.md, "Como se muestra y
    // se elige el reparto entre boletos regulares y de estudiante").
    assert.match(html, /Entrada regular/i);
    assert.match(html, /Estudiante/i);
    assert.match(html, /₡4\.000/, 'el precio de la entrada regular');
    assert.match(html, /₡2\.800/, 'el precio del boleto de estudiante');

    // Arranca con los 2 asientos como entrada regular: ₡8.000 de subtotal y de total.
    assert.match(html, /₡8\.000/);

    assert.match(html, /<form method="post" action="\/reservas\/\d+\/pagar"/);
    assert.match(html, /name="nombre"/);
    assert.match(html, /name="identificacion"/);
    assert.match(html, /name="estudiantes"/);
    assert.doesNotMatch(html, /<button disabled/, 'el boton de pagar ya no esta desactivado');
  } finally {
    await app.cerrar();
  }
});

test('un miercoles la tabla tiene una sola fila y ningun contador', async () => {
  const app = await levantarApp();
  try {
    const funcion = funcionDelDia(app.db, MIERCOLES_DE_PRUEBA);
    const cliente = app.navegador();
    const compraId = idDelRedirect(
      await cliente.enviar(`/funciones/${funcion.id}/reservar`, { asientos: ['H1', 'H2', 'H3', 'H4'] }),
    );

    const html = await (await cliente.ver(`/reservas/${compraId}`)).text();

    // Un miercoles el 50% le gana al 30% en todos los boletos (RN-4), asi que no hay nada
    // que repartir: mostrar el contador seria invitar a elegir algo que no cambia nada
    // (DISENO.md, "Que muestra la tabla cuando declarar estudiantes no cambiaria el precio").
    assert.doesNotMatch(html, /data-ajuste/, 'no hay botones − ni +');
    assert.doesNotMatch(html, /<script/i, 'sin contador no hace falta nada de JavaScript');
    assert.doesNotMatch(html, /Entrada regular/i, 'la fila de entrada regular no aparece');

    assert.match(html, /Entrada · miércoles/i, 'la unica fila dice que descuento se aplico');
    assert.match(html, /₡2\.000/, 'la mitad del precio base');
    assert.match(html, /₡8\.000/, '4 boletos a ₡2.000');
    assert.match(
      html,
      /Miércoles: todos los boletos pagan la mitad del boleto regular/,
      'el mensaje que explica por que no hay nada que elegir',
    );

    // El campo sigue viajando, en cero: la forma del pedido de pago no cambia.
    assert.match(html, /name="estudiantes"/);
  } finally {
    await app.cerrar();
  }
});

test('una compra de miercoles queda con 0 boletos de estudiante declarados', async () => {
  const app = await levantarApp();
  try {
    const { compraId } = await comprar(app, {
      dia: MIERCOLES_DE_PRUEBA,
      asientos: ['H5', 'H6'],
    });

    const compra = compraGuardada(app.db, compraId);
    assert.equal(compra.total, 4000, '2 boletos a ₡2.000');
    // No significa "ese dia no fueron estudiantes": significa que no se pregunto, porque
    // no habria cambiado el precio. Asi hay que leerlo en los reportes del slice 7.
    assert.equal(compra.estudiantes, 0);
    assert.ok(compra.boletos.every((b) => b.descuento === 'miercoles'));
  } finally {
    await app.cerrar();
  }
});

test('el contador de la tabla no deja pasarse de los asientos reservados', async () => {
  const app = await levantarApp();
  try {
    const funcion = funcionDelDia(app.db, DIA_COMUN_DE_PRUEBA);
    const cliente = app.navegador();
    const compraId = idDelRedirect(
      // La Sala 1 tiene filas A a J: la fila G existe, la K no.
      await cliente.enviar(`/funciones/${funcion.id}/reservar`, { asientos: ['G5', 'G6', 'G7'] }),
    );

    const html = await (await cliente.ver(`/reservas/${compraId}`)).text();

    // El limite viaja en la propia tabla, y el campo que se envia tampoco puede pasarse:
    // asi el navegador no puede mandar un numero fuera de rango ni por descuido.
    assert.match(html, /data-asientos="3"/, 'la tabla sabe cuantos asientos hay que repartir');
    assert.match(html, /name="estudiantes"[^>]*max="3"/, 'el campo tampoco deja pasarse');
    assert.match(html, /3 de 3/, 'la tabla dice cuantos asientos se estan repartiendo');
  } finally {
    await app.cerrar();
  }
});

test('al pagar aparece el codigo de confirmacion con pelicula, sala, funcion y asientos (RF-10)', async () => {
  const app = await levantarApp();
  try {
    const { funcion, cliente, compraId } = await comprar(app, {
      dia: DIA_COMUN_DE_PRUEBA,
      asientos: ['C7', 'C8'],
    });

    const html = await (await cliente.ver(`/reservas/${compraId}`)).text();

    assert.match(html, FORMA_DEL_CODIGO, 'el codigo tiene la forma CV-XXXXXX');
    assert.match(html, new RegExp(funcion.pelicula));
    assert.match(html, new RegExp(funcion.sala));
    assert.match(html, /jueves 13 de agosto/, 'el dia y la hora de la funcion');
    assert.match(html, /C7/);
    assert.match(html, /C8/);

    // El codigo que se ve es el mismo que quedo guardado.
    assert.ok(html.includes(compraGuardada(app.db, compraId).codigo));
  } finally {
    await app.cerrar();
  }
});

test('dos compras distintas reciben codigos de confirmacion distintos', async () => {
  const app = await levantarApp();
  try {
    const una = await comprar(app, { dia: DIA_COMUN_DE_PRUEBA, asientos: ['A5'] });
    const otra = await comprar(app, { dia: DIA_COMUN_DE_PRUEBA, asientos: ['A6'] });

    const codigoUna = compraGuardada(app.db, una.compraId).codigo;
    const codigoOtra = compraGuardada(app.db, otra.compraId).codigo;

    assert.match(codigoUna, FORMA_DEL_CODIGO);
    assert.match(codigoOtra, FORMA_DEL_CODIGO);
    assert.notEqual(codigoUna, codigoOtra);
  } finally {
    await app.cerrar();
  }
});

test('volver a la direccion de una compra pagada muestra el codigo otra vez, sin cancelarla (RN-13)', async () => {
  const app = await levantarApp();
  try {
    const { cliente, compraId } = await comprar(app, { dia: DIA_COMUN_DE_PRUEBA, asientos: ['B7'] });
    const codigo = compraGuardada(app.db, compraId).codigo;

    const otraVez = await cliente.ver(`/reservas/${compraId}`);
    const html = await otraVez.text();

    assert.equal(otraVez.status, 200);
    assert.ok(html.includes(codigo), 'el codigo sigue estando: es la unica copia del cliente');
    assert.doesNotMatch(html, /cancelar/i, 'RN-13: una compra pagada es final');
    assert.doesNotMatch(html, /venci/i, 'una compra pagada no vence');
  } finally {
    await app.cerrar();
  }
});

test('el precio lo decide el servidor: no le cree ningun numero al navegador', async () => {
  const app = await levantarApp();
  try {
    const funcion = funcionDelDia(app.db, DIA_COMUN_DE_PRUEBA);
    const cliente = app.navegador();
    const compraId = idDelRedirect(
      await cliente.enviar(`/funciones/${funcion.id}/reservar`, { asientos: ['D7', 'D8'] }),
    );

    // La tabla del navegador muestra subtotales, pero son solo una comodidad visual. Acá
    // se manda un pedido con precios y totales inventados, como haría alguien que edita
    // la página: el servidor tiene que ignorarlos y cobrar lo que corresponde
    // (DISENO.md, "Si las pantallas pueden usar JavaScript": la frontera del servidor).
    await cliente.enviar(`/reservas/${compraId}/pagar`, {
      ...CLIENTE,
      estudiantes: 1,
      total: 1,
      precio: 1,
      subtotal: 1,
      descuento: 'estudiante',
    });

    const compra = compraGuardada(app.db, compraId);
    assert.equal(compra.total, 6800, '1 × ₡4.000 + 1 × ₡2.800, no el ₡1 que mandó el navegador');
    assert.deepEqual(
      compra.boletos.map((b) => b.precio).sort((a, b) => a - b),
      [2800, 4000],
    );
  } finally {
    await app.cerrar();
  }
});

test('la pantalla de confirmacion se lee sin JavaScript', async () => {
  const app = await levantarApp();
  try {
    const { cliente, compraId } = await comprar(app, { dia: DIA_COMUN_DE_PRUEBA, asientos: ['D7'] });

    const html = await (await cliente.ver(`/reservas/${compraId}`)).text();

    // El comprobante del cliente no puede depender de que el navegador ejecute nada: es
    // lo único que se lleva, y no hay boleto impreso (RF-10). El JavaScript que se
    // permitió vive solo en la tabla de la pantalla anterior.
    assert.doesNotMatch(html, /<script/i);
    assert.match(html, FORMA_DEL_CODIGO);
  } finally {
    await app.cerrar();
  }
});

// ---------------------------------------------------------------------------
// El plazo de la reserva frente al pago (RF-4, y el asiento vendido que no vuelve)
// ---------------------------------------------------------------------------

test('una reserva vencida ya no se puede pagar: hay que elegir de nuevo', async () => {
  const app = await levantarApp();
  try {
    const funcion = funcionDelDia(app.db, DIA_COMUN_DE_PRUEBA);
    const cliente = app.navegador();
    const compraId = idDelRedirect(
      await cliente.enviar(`/funciones/${funcion.id}/reservar`, { asientos: ['E1'] }),
    );

    envejecerReservas(app.db, 4);

    const respuesta = await cliente.enviar(`/reservas/${compraId}/pagar`, { ...CLIENTE, estudiantes: 0 });

    assert.equal(respuesta.status, 409);
    assert.match(await respuesta.text(), /venci/i);
    assert.notEqual(compraGuardada(app.db, compraId).estado, 'pagada');
  } finally {
    await app.cerrar();
  }
});

test('un asiento pagado no vuelve a estar disponible al pasar el plazo de la reserva', async () => {
  const app = await levantarApp();
  try {
    const { funcion } = await comprar(app, { dia: DIA_COMUN_DE_PRUEBA, asientos: ['A1', 'A2'] });

    // Mucho mas que el plazo de la reserva: una compra pagada no vence nunca.
    envejecerReservas(app.db, 60);

    const html = await (await app.navegador().ver(`/funciones/${funcion.id}/asientos`)).text();

    assert.equal(contarAsientosOcupados(html), 2, 'los dos asientos vendidos siguen ocupados');
    assert.equal(contarAsientosDisponibles(html), 118);
  } finally {
    await app.cerrar();
  }
});

test('otro cliente que intenta reservar un asiento ya vendido es rechazado', async () => {
  const app = await levantarApp();
  try {
    const { funcion } = await comprar(app, { dia: DIA_COMUN_DE_PRUEBA, asientos: ['A1'] });
    envejecerReservas(app.db, 60);

    const respuesta = await app.navegador().enviar(`/funciones/${funcion.id}/reservar`, { asientos: ['A1'] });

    assert.equal(respuesta.status, 409);
    assert.match(await respuesta.text(), /no está disponible/i);
  } finally {
    await app.cerrar();
  }
});

test('al propio comprador sus asientos ya pagados se le muestran en gris, no en amarillo', async () => {
  const app = await levantarApp();
  try {
    const { funcion, cliente } = await comprar(app, { dia: DIA_COMUN_DE_PRUEBA, asientos: ['A1', 'A2'] });

    const html = await (await cliente.ver(`/funciones/${funcion.id}/asientos`)).text();

    // El amarillo significa "lo estas eligiendo"; una compra pagada ya no se elige
    // (DISENO.md, "Que hace que un asiento deje de estar disponible").
    assert.equal(contarAsientosEligiendo(html), 0);
    assert.equal(contarAsientosOcupados(html), 2);
  } finally {
    await app.cerrar();
  }
});

test('pagar dos veces la misma compra no la cobra dos veces', async () => {
  const app = await levantarApp();
  try {
    const { cliente, compraId } = await comprar(app, { dia: DIA_COMUN_DE_PRUEBA, asientos: ['B1'] });
    const primera = compraGuardada(app.db, compraId);

    await cliente.enviar(`/reservas/${compraId}/pagar`, {
      nombre: 'Otro Nombre',
      identificacion: '9-9999-9999',
      estudiantes: 1,
    });

    const segunda = compraGuardada(app.db, compraId);
    assert.equal(segunda.codigo, primera.codigo, 'el codigo no cambia');
    assert.equal(segunda.total, primera.total, 'el total no cambia');
    assert.equal(segunda.nombre, primera.nombre, 'los datos del cliente no se pisan');
  } finally {
    await app.cerrar();
  }
});

test('recrear los datos de prueba funciona aunque ya haya compras pagadas', async () => {
  const app = await levantarApp();
  try {
    await comprar(app, { dia: DIA_COMUN_DE_PRUEBA, asientos: ['A1'] });

    // El comando borra las funciones para recrearlas, y una compra pagada apunta a una
    // funcion: si no se borran antes las compras, la base lo impide y el comando falla.
    sembrarDatosDePrueba(app.db, JUEVES_DE_PRUEBA, app.carpetaAfiches);

    const { cuantas } = app.db.prepare('SELECT COUNT(*) AS cuantas FROM compras').get();
    assert.equal(cuantas, 0, 'las compras viejas se van con los datos que recrea el comando');
    const funciones = app.db.prepare('SELECT COUNT(*) AS cuantas FROM funciones').get();
    assert.equal(funciones.cuantas, 42, 'la cartelera vuelve a quedar completa');
  } finally {
    await app.cerrar();
  }
});

test('la marca lleva el logo al lado del nombre, y el archivo se sirve', async () => {
  const app = await levantarApp();
  try {
    const html = await (await app.navegador().ver('/')).text();

    // El logo va adentro del enlace de la marca, junto al nombre. Su texto alternativo va
    // vacio a proposito: el nombre del cine ya esta escrito al lado, y repetirlo haria que
    // un lector de pantalla dijera "Cine Variedades" dos veces seguidas.
    assert.match(html, /<a href="\/" class="marca">\s*<img class="logo" src="\/images\/logo\.webp" alt=""/);
    assert.match(html, /Cine Variedades/);

    // Y el archivo tiene que existir de verdad, no solo estar nombrado en el HTML.
    const imagen = await app.navegador().ver('/images/logo.webp');
    assert.equal(imagen.status, 200);
    assert.match(imagen.headers.get('content-type'), /image\/webp/);
  } finally {
    await app.cerrar();
  }
});

// ---------------------------------------------------------------------------
// Persistencia: lo pagado sobrevive al reinicio del servidor
// ---------------------------------------------------------------------------

test('la compra pagada sigue estando despues de reiniciar el servidor', async () => {
  const app = await levantarApp();
  let compraId;
  let codigo;
  try {
    ({ compraId } = await comprar(app, { dia: DIA_COMUN_DE_PRUEBA, asientos: ['J11', 'J12'] }));
    codigo = compraGuardada(app.db, compraId).codigo;
  } finally {
    await app.cerrar({ borrarArchivo: false });
  }

  // Un servidor nuevo sobre el mismo archivo .db, sin volver a sembrar nada.
  const reabierta = await levantarApp({ ruta: app.ruta, sembrar: false });
  try {
    const compra = compraGuardada(reabierta.db, compraId);
    assert.equal(compra.estado, 'pagada');
    assert.equal(compra.codigo, codigo);
    assert.equal(compra.total, 8000);
    assert.equal(compra.boletos.length, 2);
  } finally {
    await reabierta.cerrar();
  }
});
