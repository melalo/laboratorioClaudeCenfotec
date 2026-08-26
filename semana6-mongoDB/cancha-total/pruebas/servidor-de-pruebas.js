'use strict';

// Andamio de las pruebas de integración: levanta la aplicación real, le habla por HTTP como
// lo haría una persona con el navegador, y al terminar deja todo como estaba.
//
// Por qué hace falta tanto andamio, y no es capricho de las pruebas:
//
//   - `server.js` arranca la aplicación completa; ninguna regla se puede probar por separado, así
//     que hay que levantarla entera y hablarle por HTTP. (H-11)
//   - el puerto 3000 está fijo en el código, así que la verificación no puede correr con otra
//     aplicación levantada en ese puerto. (H-13)
//
// Los dos son hallazgos de estructura anotados en HALLAZGOS.md. Este archivo los rodea; no los
// arregla, porque el código de producción no se toca.
//
// La base de datos, en cambio, dejó de ser un problema al migrar a MongoDB, y vale la pena decir
// por qué. Cuando la base era el archivo `reservas.db`, la suite tenía que **apartar la base real**
// antes de correr y **devolverla** al terminar, con el riesgo de perderla si una corrida se cortaba
// a la mitad: ese era el hallazgo H-12. Ahora cada corrida levanta su **propio MongoDB temporal**,
// que nace vacío y desaparece al terminar. La base de verdad no se toca en ningún momento, así que
// ya no hay nada que apartar ni nada que perder.

const { spawn } = require('node:child_process');
const { once } = require('node:events');
const path = require('node:path');
const { MongoMemoryServer } = require('mongodb-memory-server');

const RAIZ = path.join(__dirname, '..');
const DIRECCION = 'http://127.0.0.1:3000';

let proceso = null;
let mongoDePrueba = null;
let baseDeDatos = null;

function esperar(milisegundos) {
  return new Promise((seguir) => setTimeout(seguir, milisegundos));
}

// -- La base de datos ------------------------------------------------------------------------

// Levanta un MongoDB temporal y hace que TODOS le hablen a él: tanto la aplicación que se lanza en
// otro proceso —a la que se le pasa la dirección por el entorno— como este mismo archivo, que
// necesita sembrar y leer reservas para comprobar los efectos.
//
// Que los dos apunten a la misma base es lo que hace que una prueba pueda sembrar una reserva y
// después preguntarle a la aplicación qué hizo con ella.
async function levantarLaBaseTemporal() {
  mongoDePrueba = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoDePrueba.getUri();
  process.env.MONGODB_DB = 'cancha_total_pruebas';
  // Se carga después de fijar el entorno, para que se conecte a esta base y no levante otra.
  baseDeDatos = require('../basededatos');
  return process.env.MONGODB_URI;
}

async function bajarLaBaseTemporal() {
  if (baseDeDatos) {
    await baseDeDatos.cerrar();
    baseDeDatos = null;
  }
  if (mongoDePrueba) {
    await mongoDePrueba.stop();
    mongoDePrueba = null;
  }
  delete process.env.MONGODB_URI;
  delete process.env.MONGODB_DB;
}

// -- Levantar y bajar la aplicación ----------------------------------------------------------

// ¿Hay alguien más escuchando en el puerto 3000? Si lo hay, la suite no puede correr: el puerto
// está fijo en el código (H-13) y las pruebas terminarían hablándole a otra aplicación y dando
// resultados inventados. Se comprueba ANTES de levantar nada, para no dejar cosas a medio armar.
async function elPuertoEstaLibre() {
  try {
    const respuesta = await fetch(DIRECCION + '/', { signal: AbortSignal.timeout(2000) });
    await respuesta.text();
    return false;
  } catch {
    return true;
  }
}

async function arrancar(entornoExtra) {
  if (!(await elPuertoEstaLibre())) {
    throw new Error(
      'Hay otra aplicación escuchando en el puerto 3000, así que la verificación no puede ' +
        'correr: el puerto está fijo en server.js (H-13). Cerrá esa aplicación y volvé a ' +
        'correr la verificación.'
    );
  }

  const direccionDeLaBase = await levantarLaBaseTemporal();

  proceso = spawn(process.execPath, [path.join(RAIZ, 'server.js')], {
    cwd: RAIZ,
    stdio: 'ignore',
    env: {
      ...process.env,
      MONGODB_URI: direccionDeLaBase,
      MONGODB_DB: process.env.MONGODB_DB,
      ...entornoExtra,
    },
  });

  const limite = Date.now() + 30000;
  while (Date.now() < limite) {
    if (proceso.exitCode !== null) {
      await bajarLaBaseTemporal();
      throw new Error(
        'La aplicación se cerró al arrancar. Lo más probable: el puerto 3000 está ocupado (H-13).'
      );
    }
    try {
      const respuesta = await fetch(DIRECCION + '/');
      if (respuesta.ok) {
        const pagina = await respuesta.text();
        // Confirmar que quien contesta es esta aplicación y no otra que agarró el puerto.
        if (pagina.includes('Cancha Total F5')) return;
        await bajarLaAplicacion();
        throw new Error('En el puerto 3000 contesta otra aplicación, no Cancha Total F5 (H-13).');
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('H-13')) throw error;
      // Todavía no está escuchando.
    }
    await esperar(120);
  }
  await bajarLaAplicacion();
  throw new Error('La aplicación no respondió en 30 segundos.');
}

// Arranca la aplicación con el reloj del sistema, que es lo normal.
async function levantarLaAplicacion() {
  return arrancar({});
}

// Arranca la aplicación con el reloj **fijado** en un momento exacto, en formato local sin zona:
// '2026-08-25T23:00:00'. Devuelve la función que hay que pasarle a `before`, así:
//
//     before(s.levantarLaAplicacionConReloj('2026-08-25T23:00:00'));
//
// Es lo que permite probar las reglas que dependen de la hora sin que el resultado cambie según
// cuándo se corra la suite. Antes esto no se podía: era el hallazgo H-14, ya pagado.
function levantarLaAplicacionConReloj(momento) {
  return async () => arrancar({ CANCHA_TOTAL_AHORA: momento });
}

async function bajarLaAplicacion() {
  if (proceso && proceso.exitCode === null) {
    proceso.kill();
    await once(proceso, 'exit');
  }
  proceso = null;
  await bajarLaBaseTemporal();
}

// -- Hablarle a la aplicación como una persona -----------------------------------------------

async function verPagina(ruta) {
  const respuesta = await fetch(DIRECCION + ruta);
  return respuesta.text();
}

async function reservar(datos) {
  // Solo se manda lo que el formulario tendría lleno: una clave con valor `undefined` se omite,
  // que es lo que pasa cuando la persona deja el campo en blanco y el navegador no lo envía.
  const cuerpo = new URLSearchParams();
  for (const [clave, valor] of Object.entries(datos)) {
    if (valor !== undefined) cuerpo.set(clave, String(valor));
  }
  const respuesta = await fetch(DIRECCION + '/reservas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: cuerpo.toString(),
  });
  return respuesta.text();
}

async function cancelar(id) {
  const respuesta = await fetch(DIRECCION + `/reservas/${id}/cancelar`, { method: 'POST' });
  return respuesta.text();
}

async function cotizar(consulta) {
  const parametros = new URLSearchParams();
  for (const [clave, valor] of Object.entries(consulta)) {
    if (valor !== undefined) parametros.set(clave, String(valor));
  }
  const respuesta = await fetch(DIRECCION + '/api/cotizar?' + parametros.toString());
  return respuesta.json();
}

// Siembra una reserva escribiéndola directo en la base, sin pasar por el formulario.
// Se usa solo cuando la prueba necesita que exista una reserva que el formulario no dejaría
// crear —por ejemplo una de hoy, para probar la regla de cancelación—. Los datos los sigue
// creando la prueba; lo único que se saltea es la puerta de entrada.
async function sembrarReserva({ cancha, fecha, hora, cliente, telefono, precio, estado }) {
  return baseDeDatos.insertarReserva({
    cancha,
    fecha,
    hora,
    cliente,
    telefono,
    precio,
    estado: estado || 'activa',
  });
}

// -- Leer el efecto observable ---------------------------------------------------------------

async function buscarReserva({ cancha, fecha, hora }) {
  return baseDeDatos.buscarEnElBloque({ cancha, fecha, hora });
}

async function leerReserva(id) {
  return baseDeDatos.buscarPorNumero(id);
}

async function contarReservas() {
  return baseDeDatos.contarTodas();
}

async function reservasDelDia(fecha) {
  return baseDeDatos.reservasDelDia(fecha);
}

// -- Leer la pantalla ------------------------------------------------------------------------

// '₡20.000' -> 20000
function montoDelTexto(texto) {
  if (!texto) return null;
  const encontrado = texto.match(/₡([\d.]+)/);
  return encontrado ? Number(encontrado[1].replace(/\./g, '')) : null;
}

// El número de reserva que la pantalla de confirmación anuncia: 'Reserva #12 creada.'
function numeroDeLaReserva(pagina) {
  const encontrado = pagina.match(/Reserva #(\d+) creada/);
  return encontrado ? Number(encontrado[1]) : null;
}

// El precio que la pantalla de confirmación dice que se cobró.
function precioAnunciado(pagina) {
  const encontrado = pagina.match(/Precio: (₡[\d.]+)/);
  return encontrado ? montoDelTexto(encontrado[1]) : null;
}

// La tarifa que la tabla de disponibilidad de la página de inicio muestra en un bloque.
function tarifaEnLaTabla(pagina, hora) {
  const encontrado = pagina.match(
    new RegExp(`<td>${hora}:00</td><td[^>]*>[^<]*</td><td>(₡[\\d.]+)</td>`)
  );
  return encontrado ? montoDelTexto(encontrado[1]) : null;
}

// 'libre' u 'ocupado', según cómo la pantalla pinta un bloque.
function estadoDelBloque(pagina, hora) {
  const encontrado = pagina.match(new RegExp(`<td>${hora}:00</td><td class="(libre|ocupado)"`));
  return encontrado ? encontrado[1] : null;
}

function cuantosBloquesMuestra(pagina) {
  const encontrados = pagina.match(/<td>\d+:00<\/td>/g);
  return encontrados ? encontrados.length : 0;
}

// -- Fechas ----------------------------------------------------------------------------------
//
// Las pruebas nunca dependen de la hora del día: usan fechas relativas a hoy, de modo que la
// fecha cambia en cada corrida pero el resultado esperado es siempre el mismo.

function fechaEnDias(dias) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

function hoy() {
  return fechaEnDias(0);
}

// 'AAAA-MM' del mes que viene dentro de N meses. Sirve para las pruebas del descuento, que
// necesitan varias reservas dentro de un mismo mes sin chocar con las de otra prueba.
function mesEnMeses(meses) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + meses);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// El próximo 25 de diciembre que todavía no pasó.
function proximaNavidad() {
  const d = new Date();
  const anio = d.getMonth() === 11 && d.getDate() > 25 ? d.getFullYear() + 1 : d.getFullYear();
  return `${anio}-12-25`;
}

// El próximo 1 de enero, que es feriado y está siempre en el futuro.
function proximoPrimeroDeEnero() {
  return `${new Date().getFullYear() + 1}-01-01`;
}

module.exports = {
  DIRECCION,
  levantarLaAplicacion,
  levantarLaAplicacionConReloj,
  bajarLaAplicacion,
  verPagina,
  reservar,
  cancelar,
  cotizar,
  sembrarReserva,
  buscarReserva,
  leerReserva,
  contarReservas,
  reservasDelDia,
  montoDelTexto,
  numeroDeLaReserva,
  precioAnunciado,
  tarifaEnLaTabla,
  estadoDelBloque,
  cuantosBloquesMuestra,
  fechaEnDias,
  hoy,
  mesEnMeses,
  proximaNavidad,
  proximoPrimeroDeEnero,
};
