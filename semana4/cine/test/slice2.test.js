// Comprobaciones del vertical slice 2: "Reserva temporal de asiento" (PLAN.md).
// Cada prueba corresponde a una condicion del "Que tiene que ser cierto" o a una linea
// del "Con que se comprueba" del plan. Todas usan el servidor de verdad y una base
// SQLite de verdad, en un archivo temporal.
//
// El plazo de la reserva es de 3 minutos (DISENO.md, "Otras decisiones").

import test from 'node:test';
import assert from 'node:assert/strict';

import { MINUTOS_DE_RESERVA } from '../src/reservas.js';
import {
  levantarApp,
  contarAsientos,
  contarAsientosDisponibles,
  contarAsientosEligiendo,
  contarAsientosOcupados,
  unaFuncion,
} from './ayuda.js';

// Envejecer la reserva en la base es la forma de comprobar el vencimiento sin esperar
// tres minutos de verdad. SQLite sabe restarle minutos a una fecha escrita como texto.
function envejecerReservas(db, minutos) {
  db.prepare(`UPDATE compras SET creada_en = datetime(creada_en, '-${minutos} minutes')`).run();
}

function compras(db) {
  return db.prepare('SELECT id, funcion_id, estado, creada_en FROM compras ORDER BY id').all();
}

function asientosDeLaCompra(db, compraId) {
  return db
    .prepare(
      `SELECT a.fila || a.numero AS codigo
         FROM compras_asientos ca JOIN asientos a ON a.id = ca.asiento_id
        WHERE ca.compra_id = ? ORDER BY a.fila, a.numero`,
    )
    .all(compraId)
    .map((a) => a.codigo);
}

// ---------------------------------------------------------------------------
// El mapa deja elegir asientos (RF-3)
// ---------------------------------------------------------------------------

test('el mapa ofrece cada asiento disponible como una casilla para marcar', async () => {
  const app = await levantarApp();
  try {
    const funcion = unaFuncion(app.db);
    const html = await (await app.navegador().ver(`/funciones/${funcion.id}/asientos`)).text();

    const casillas = html.match(/<input type="checkbox" name="asientos"/g) ?? [];
    assert.equal(casillas.length, 120, 'las 120 butacas libres deberian ser casillas');
    assert.match(html, /<form method="post" action="\/funciones\/\d+\/reservar"/);
    assert.match(html, /Reservar/);
  } finally {
    await app.cerrar();
  }
});

test('el mapa no deja marcar un asiento que no esta disponible', async () => {
  const app = await levantarApp();
  try {
    const funcion = unaFuncion(app.db);
    const otro = app.navegador();
    await otro.enviar(`/funciones/${funcion.id}/reservar`, { asientos: ['A1', 'A2'] });

    const html = await (await app.navegador().ver(`/funciones/${funcion.id}/asientos`)).text();

    // Los dos que otro cliente tomo estan, pero no como casillas: no se pueden marcar.
    assert.equal(contarAsientosOcupados(html), 2);
    assert.equal((html.match(/<input type="checkbox" name="asientos"/g) ?? []).length, 118);
  } finally {
    await app.cerrar();
  }
});

test('el cliente elige dos asientos y quedan reservados temporalmente', async () => {
  const app = await levantarApp();
  try {
    const funcion = unaFuncion(app.db);
    const cliente = app.navegador();

    const respuesta = await cliente.enviar(`/funciones/${funcion.id}/reservar`, {
      asientos: ['C4', 'C5'],
    });

    assert.equal(respuesta.status, 302);
    assert.match(respuesta.headers.get('location'), /^\/reservas\/\d+$/);

    const guardadas = compras(app.db);
    assert.equal(guardadas.length, 1);
    assert.equal(guardadas[0].estado, 'reservada');
    assert.equal(guardadas[0].funcion_id, funcion.id);
    assert.ok(guardadas[0].creada_en, 'la reserva tiene que guardar cuando se creo');
    assert.deepEqual(asientosDeLaCompra(app.db, guardadas[0].id), ['C4', 'C5']);
  } finally {
    await app.cerrar();
  }
});

test('no se puede reservar sin haber marcado ningun asiento', async () => {
  const app = await levantarApp();
  try {
    const funcion = unaFuncion(app.db);
    const respuesta = await app.navegador().enviar(`/funciones/${funcion.id}/reservar`, {});

    assert.equal(respuesta.status, 400);
    assert.match(await respuesta.text(), /al menos un asiento/i);
    assert.equal(compras(app.db).length, 0);
  } finally {
    await app.cerrar();
  }
});

test('no se puede reservar un asiento que no existe en esa sala', async () => {
  const app = await levantarApp();
  try {
    // La sala de 120 llega hasta la fila J; la Z no existe.
    const funcion = unaFuncion(app.db);
    const respuesta = await app.navegador().enviar(`/funciones/${funcion.id}/reservar`, {
      asientos: ['Z9'],
    });

    assert.equal(respuesta.status, 400);
    assert.equal(compras(app.db).length, 0);
  } finally {
    await app.cerrar();
  }
});

// ---------------------------------------------------------------------------
// El amarillo: lo que este cliente esta tomando (DISENO.md)
// ---------------------------------------------------------------------------

test('en su propio mapa, el cliente ve en amarillo los asientos que tomo', async () => {
  const app = await levantarApp();
  try {
    const funcion = unaFuncion(app.db);
    const cliente = app.navegador();
    await cliente.enviar(`/funciones/${funcion.id}/reservar`, { asientos: ['C4', 'C5'] });

    const html = await (await cliente.ver(`/funciones/${funcion.id}/asientos`)).text();

    assert.equal(contarAsientosEligiendo(html), 2, 'sus dos asientos van en amarillo');
    assert.equal(contarAsientosDisponibles(html), 118);
    assert.equal(contarAsientosOcupados(html), 0, 'para el, ninguno esta en gris');
    // Y quedan marcados, para que volver a reservar no le quite lo que ya tiene.
    assert.equal((html.match(/name="asientos" value="C[45]" checked/g) ?? []).length, 2);
  } finally {
    await app.cerrar();
  }
});

test('otro cliente ve en gris los asientos que el primero tomo, sin distinguirlos de vendidos', async () => {
  const app = await levantarApp();
  try {
    const funcion = unaFuncion(app.db);
    const primero = app.navegador();
    await primero.enviar(`/funciones/${funcion.id}/reservar`, { asientos: ['C4', 'C5'] });

    const html = await (await app.navegador().ver(`/funciones/${funcion.id}/asientos`)).text();

    assert.equal(contarAsientos(html), 120, 'el mapa sigue mostrando la sala entera');
    assert.equal(contarAsientosOcupados(html), 2, 'los dos ajenos van en gris');
    assert.equal(contarAsientosDisponibles(html), 118);
    assert.equal(contarAsientosEligiendo(html), 0, 'el amarillo es solo de quien eligio');
  } finally {
    await app.cerrar();
  }
});

test('la leyenda del mapa muestra los tres estados', async () => {
  const app = await levantarApp();
  try {
    const funcion = unaFuncion(app.db);
    const html = await (await app.navegador().ver(`/funciones/${funcion.id}/asientos`)).text();

    const muestras = html.match(/asiento-muestra/g) ?? [];
    assert.equal(muestras.length, 3, 'la leyenda debe tener exactamente tres estados');
    assert.match(html, /Disponible/);
    assert.match(html, /Los estás eligiendo/);
    assert.match(html, /No disponible/);
  } finally {
    await app.cerrar();
  }
});

// ---------------------------------------------------------------------------
// La reserva vence a los 3 minutos (RF-4, RN-7)
// ---------------------------------------------------------------------------

test('el plazo de la reserva es de 3 minutos', () => {
  assert.equal(MINUTOS_DE_RESERVA, 3);
});

test('pasado el plazo, los asientos vuelven a aparecer disponibles', async () => {
  const app = await levantarApp();
  try {
    const funcion = unaFuncion(app.db);
    const cliente = app.navegador();
    await cliente.enviar(`/funciones/${funcion.id}/reservar`, { asientos: ['C4', 'C5'] });

    const antes = await (await app.navegador().ver(`/funciones/${funcion.id}/asientos`)).text();
    assert.equal(contarAsientosDisponibles(antes), 118);

    envejecerReservas(app.db, MINUTOS_DE_RESERVA + 1);

    const despues = await (await app.navegador().ver(`/funciones/${funcion.id}/asientos`)).text();
    assert.equal(contarAsientosDisponibles(despues), 120, 'los dos asientos volvieron a estar libres');
    assert.equal(contarAsientosOcupados(despues), 0);
  } finally {
    await app.cerrar();
  }
});

test('al consultar el mapa, la reserva pasada de plazo queda marcada como vencida', async () => {
  const app = await levantarApp();
  try {
    const funcion = unaFuncion(app.db);
    await app.navegador().enviar(`/funciones/${funcion.id}/reservar`, { asientos: ['C4'] });
    envejecerReservas(app.db, MINUTOS_DE_RESERVA + 1);

    await app.navegador().ver(`/funciones/${funcion.id}/asientos`);

    assert.equal(compras(app.db)[0].estado, 'vencida');
  } finally {
    await app.cerrar();
  }
});

test('quien tenia la reserva vencida tampoco la ve en amarillo', async () => {
  const app = await levantarApp();
  try {
    const funcion = unaFuncion(app.db);
    const cliente = app.navegador();
    await cliente.enviar(`/funciones/${funcion.id}/reservar`, { asientos: ['C4'] });
    envejecerReservas(app.db, MINUTOS_DE_RESERVA + 1);

    const html = await (await cliente.ver(`/funciones/${funcion.id}/asientos`)).text();

    assert.equal(contarAsientosEligiendo(html), 0);
    assert.equal(contarAsientosDisponibles(html), 120);
  } finally {
    await app.cerrar();
  }
});

test('el asiento liberado lo puede tomar otro cliente', async () => {
  const app = await levantarApp();
  try {
    const funcion = unaFuncion(app.db);
    await app.navegador().enviar(`/funciones/${funcion.id}/reservar`, { asientos: ['C4'] });
    envejecerReservas(app.db, MINUTOS_DE_RESERVA + 1);

    const respuesta = await app
      .navegador()
      .enviar(`/funciones/${funcion.id}/reservar`, { asientos: ['C4'] });

    assert.equal(respuesta.status, 302);
    const vigentes = compras(app.db).filter((c) => c.estado === 'reservada');
    assert.equal(vigentes.length, 1);
  } finally {
    await app.cerrar();
  }
});

// ---------------------------------------------------------------------------
// Dos clientes, el mismo asiento (RN-6, DISENO.md "Manejo de errores")
// ---------------------------------------------------------------------------

test('si el asiento ya lo tiene otro, la reserva se rechaza con el mapa actualizado', async () => {
  const app = await levantarApp();
  try {
    const funcion = unaFuncion(app.db);
    await app.navegador().enviar(`/funciones/${funcion.id}/reservar`, { asientos: ['C4'] });

    const segundo = await app
      .navegador()
      .enviar(`/funciones/${funcion.id}/reservar`, { asientos: ['C4'] });

    assert.equal(segundo.status, 409);
    const html = await segundo.text();
    assert.match(html, /ya no est[áa] disponible/i);
    assert.equal(contarAsientos(html), 120, 'se le muestra el mapa actualizado');
    assert.equal(contarAsientosOcupados(html), 1, 'con el asiento perdido ya en gris');
  } finally {
    await app.cerrar();
  }
});

test('si dos clientes piden el mismo asiento a la vez, exactamente uno lo consigue', async () => {
  const app = await levantarApp();
  try {
    const funcion = unaFuncion(app.db);

    const [uno, otro] = await Promise.all([
      app.navegador().enviar(`/funciones/${funcion.id}/reservar`, { asientos: ['F7'] }),
      app.navegador().enviar(`/funciones/${funcion.id}/reservar`, { asientos: ['F7'] }),
    ]);

    const estados = [uno.status, otro.status].sort();
    assert.deepEqual(estados, [302, 409], 'uno gana y al otro se le avisa');

    const vigentes = compras(app.db).filter((c) => c.estado === 'reservada');
    assert.equal(vigentes.length, 1, 'solo se guarda la reserva que si se concreto');
    assert.deepEqual(asientosDeLaCompra(app.db, vigentes[0].id), ['F7']);
  } finally {
    await app.cerrar();
  }
});

test('una reserva de varios asientos no queda a medias si uno ya esta tomado', async () => {
  const app = await levantarApp();
  try {
    const funcion = unaFuncion(app.db);
    await app.navegador().enviar(`/funciones/${funcion.id}/reservar`, { asientos: ['C5'] });

    const segundo = await app
      .navegador()
      .enviar(`/funciones/${funcion.id}/reservar`, { asientos: ['C4', 'C5', 'C6'] });

    assert.equal(segundo.status, 409);
    // C4 y C6 estaban libres, pero la reserva entera se rechaza: no queda media compra.
    const html = await (await app.navegador().ver(`/funciones/${funcion.id}/asientos`)).text();
    assert.equal(contarAsientosOcupados(html), 1);
  } finally {
    await app.cerrar();
  }
});

// ---------------------------------------------------------------------------
// La pantalla de la reserva
// ---------------------------------------------------------------------------

test('la pantalla de la reserva muestra pelicula, sala, horario y asientos', async () => {
  const app = await levantarApp();
  try {
    const funcion = unaFuncion(app.db);
    const datos = app.db
      .prepare(
        `SELECT p.nombre AS pelicula, s.nombre AS sala, f.fecha_hora
           FROM funciones f JOIN peliculas p ON p.id = f.pelicula_id
           JOIN salas s ON s.id = f.sala_id WHERE f.id = ?`,
      )
      .get(funcion.id);

    const cliente = app.navegador();
    const respuesta = await cliente.enviar(`/funciones/${funcion.id}/reservar`, {
      asientos: ['C4', 'C5'],
    });
    const html = await (await cliente.ver(respuesta.headers.get('location'))).text();

    assert.match(html, new RegExp(datos.pelicula));
    assert.match(html, new RegExp(datos.sala));
    assert.match(html, new RegExp(datos.fecha_hora.slice(11)));
    assert.match(html, /C4/);
    assert.match(html, /C5/);
  } finally {
    await app.cerrar();
  }
});

test('la pantalla de la reserva dice a que hora vence y muestra la barra del plazo', async () => {
  const app = await levantarApp();
  try {
    const funcion = unaFuncion(app.db);
    const cliente = app.navegador();
    const respuesta = await cliente.enviar(`/funciones/${funcion.id}/reservar`, { asientos: ['C4'] });
    const html = await (await cliente.ver(respuesta.headers.get('location'))).text();

    // El reloj de las pruebas esta clavado a las 10:00, asi que vence a las 10:03.
    assert.match(html, /10:03/);
    assert.match(html, /barra-plazo/, 'la barra que se vacia en lo que queda del plazo');

    // La barra sigue siendo CSS puro: se vacia con una animacion declarada en la hoja de
    // estilos, y en la etiqueta solo viaja cuanto dura y desde donde arranca.
    //
    // Esta comprobacion antes exigia que la pantalla entera no trajera ninguna etiqueta
    // <script>. Dejo de hacerlo al construir el vertical slice 3, que puso en esta misma
    // pantalla la tabla de tipos de boleto con su contador, y con eso se permitio
    // JavaScript dentro de la pagina (DISENO.md, "Si las pantallas pueden usar
    // JavaScript"). No es una regresion del vertical slice 2: la barra no cambio en nada,
    // y lo que se dejo de afirmar es una regla del proyecto que dejo de existir.
    assert.match(html, /animation-duration: \d+s/, 'cuanto dura la animacion lo escribe el servidor');
    assert.doesNotMatch(html, /barra[^<]*<script/, 'la barra no la mueve ningun JavaScript');
  } finally {
    await app.cerrar();
  }
});

test('la pantalla de una reserva vencida lo dice y ofrece volver al mapa', async () => {
  const app = await levantarApp();
  try {
    const funcion = unaFuncion(app.db);
    const cliente = app.navegador();
    const respuesta = await cliente.enviar(`/funciones/${funcion.id}/reservar`, { asientos: ['C4'] });
    const donde = respuesta.headers.get('location');

    envejecerReservas(app.db, MINUTOS_DE_RESERVA + 1);

    const html = await (await cliente.ver(donde)).text();
    assert.match(html, /venci[óo]/i);
    assert.match(html, new RegExp(`/funciones/${funcion.id}/asientos`));
  } finally {
    await app.cerrar();
  }
});

test('la reserva de un cliente no se le muestra a otro', async () => {
  const app = await levantarApp();
  try {
    const funcion = unaFuncion(app.db);
    const cliente = app.navegador();
    const respuesta = await cliente.enviar(`/funciones/${funcion.id}/reservar`, { asientos: ['C4'] });

    const ajeno = await app.navegador().ver(respuesta.headers.get('location'));

    assert.equal(ajeno.status, 404);
  } finally {
    await app.cerrar();
  }
});

// ---------------------------------------------------------------------------
// Volver al mapa y cambiar la eleccion (DISENO.md, "Otras decisiones")
// ---------------------------------------------------------------------------

test('reservar de nuevo en la misma funcion reemplaza la reserva anterior', async () => {
  const app = await levantarApp();
  try {
    const funcion = unaFuncion(app.db);
    const cliente = app.navegador();
    await cliente.enviar(`/funciones/${funcion.id}/reservar`, { asientos: ['C4', 'C5'] });

    // Suelta C5 y toma C6 en su lugar.
    await cliente.enviar(`/funciones/${funcion.id}/reservar`, { asientos: ['C4', 'C6'] });

    const vigentes = compras(app.db).filter((c) => c.estado === 'reservada');
    assert.equal(vigentes.length, 1, 'sigue habiendo una sola reserva vigente');
    assert.deepEqual(asientosDeLaCompra(app.db, vigentes[0].id), ['C4', 'C6']);

    const html = await (await app.navegador().ver(`/funciones/${funcion.id}/asientos`)).text();
    assert.equal(contarAsientosOcupados(html), 2, 'C5 quedo libre y C6 tomado');
  } finally {
    await app.cerrar();
  }
});

test('la reserva de una funcion no ocupa asientos en otra funcion', async () => {
  const app = await levantarApp();
  try {
    const funciones = app.db
      .prepare(
        `SELECT f.id FROM funciones f JOIN salas s ON s.id = f.sala_id
          WHERE s.capacidad = 120 ORDER BY f.fecha_hora LIMIT 2`,
      )
      .all();

    await app.navegador().enviar(`/funciones/${funciones[0].id}/reservar`, { asientos: ['C4'] });

    const otra = await (await app.navegador().ver(`/funciones/${funciones[1].id}/asientos`)).text();
    assert.equal(contarAsientosDisponibles(otra), 120);
  } finally {
    await app.cerrar();
  }
});

// ---------------------------------------------------------------------------
// La reserva vive en SQLite, no en la memoria del servidor
// ---------------------------------------------------------------------------

test('la reserva sigue ocupando el asiento despues de reiniciar el servidor', async () => {
  const primera = await levantarApp();
  const ruta = primera.ruta;
  try {
    const funcion = unaFuncion(primera.db);
    await primera.navegador().enviar(`/funciones/${funcion.id}/reservar`, { asientos: ['C4'] });
    await primera.cerrar({ borrarArchivo: false });

    const segunda = await levantarApp({ ruta, sembrar: false });
    try {
      const html = await (await segunda.navegador().ver(`/funciones/${funcion.id}/asientos`)).text();
      assert.equal(contarAsientosOcupados(html), 1);
    } finally {
      await segunda.cerrar();
    }
  } catch (falla) {
    await primera.cerrar().catch(() => {});
    throw falla;
  }
});
