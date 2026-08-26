'use strict';

// Andamio de las pruebas de integración: levanta la aplicación real, le habla por HTTP como
// lo haría una persona con el navegador, y al terminar deja todo como estaba.
//
// Por qué hace falta tanto andamio, y no es capricho de las pruebas:
//
//   - `server.js` no exporta nada y arranca a escuchar en cuanto se carga, así que ninguna
//     regla se puede probar por separado: hay que levantar la aplicación completa. (H-11)
//   - la base de datos está en una ruta fija, así que la suite tiene que apartar la base real
//     y devolverla al terminar. (H-12)
//   - el puerto 3000 está fijo en el código, así que la verificación no puede correr con otra
//     aplicación levantada en ese puerto. (H-13)
//
// Los tres son hallazgos de estructura anotados en HALLAZGOS.md. Este archivo los rodea; no los
// arregla, porque el código de producción no se toca.

const { spawn } = require('node:child_process');
const { once } = require('node:events');
const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const RAIZ = path.join(__dirname, '..');
const RUTA_BASE = path.join(RAIZ, 'reservas.db');
const RUTA_RESPALDO = path.join(RAIZ, 'reservas.db.respaldo-de-pruebas');
const DIRECCION = 'http://127.0.0.1:3000';

let proceso = null;

function esperar(milisegundos) {
  return new Promise((seguir) => setTimeout(seguir, milisegundos));
}

// -- La base de datos ------------------------------------------------------------------------

function apartarLaBaseReal() {
  // Si quedó un respaldo de una corrida que se cortó a la mitad, la base real es el respaldo:
  // se devuelve a su lugar antes de seguir, para no perderla nunca.
  if (fs.existsSync(RUTA_RESPALDO)) {
    if (fs.existsSync(RUTA_BASE)) fs.rmSync(RUTA_BASE, { force: true });
    fs.renameSync(RUTA_RESPALDO, RUTA_BASE);
  }
  if (fs.existsSync(RUTA_BASE)) fs.renameSync(RUTA_BASE, RUTA_RESPALDO);
}

function devolverLaBaseReal() {
  // Si no hay respaldo, esta corrida nunca apartó nada —por ejemplo porque abortó por el puerto
  // ocupado—, así que acá no hay nada que devolver y **no se borra nada**. Sin este candado, la
  // limpieza borraría la base real de la administradora al salir por la puerta de emergencia.
  if (!fs.existsSync(RUTA_RESPALDO)) return;
  if (fs.existsSync(RUTA_BASE)) fs.rmSync(RUTA_BASE, { force: true });
  fs.renameSync(RUTA_RESPALDO, RUTA_BASE);
}

function abrirLaBase(soloLectura) {
  return new Database(RUTA_BASE, { readonly: Boolean(soloLectura) });
}

// -- Levantar y bajar la aplicación ----------------------------------------------------------

// ¿Hay alguien más escuchando en el puerto 3000? Si lo hay, la suite no puede correr: el puerto
// está fijo en el código (H-13) y las pruebas terminarían hablándole a otra aplicación y dando
// resultados inventados. Se comprueba ANTES de tocar la base, para no mover nada si hay que abortar.
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
  apartarLaBaseReal();
  proceso = spawn(process.execPath, [path.join(RAIZ, 'server.js')], {
    cwd: RAIZ,
    stdio: 'ignore',
    env: { ...process.env, ...entornoExtra },
  });

  const limite = Date.now() + 15000;
  while (Date.now() < limite) {
    if (proceso.exitCode !== null) {
      devolverLaBaseReal();
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
  throw new Error('La aplicación no respondió en 15 segundos.');
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
  // Windows suelta el archivo de la base un instante después de que el proceso muere.
  await esperar(200);
  devolverLaBaseReal();
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
function sembrarReserva({ cancha, fecha, hora, cliente, telefono, precio, estado }) {
  const base = abrirLaBase(false);
  const resultado = base
    .prepare(
      `INSERT INTO reservas (cancha, fecha, hora, cliente, telefono, precio, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(cancha, fecha, hora, cliente, telefono, precio, estado || 'activa');
  base.close();
  return Number(resultado.lastInsertRowid);
}

// -- Leer el efecto observable ---------------------------------------------------------------

function buscarReserva({ cancha, fecha, hora }) {
  const base = abrirLaBase(true);
  const fila = base
    .prepare('SELECT * FROM reservas WHERE cancha = ? AND fecha = ? AND hora = ?')
    .get(cancha, fecha, hora);
  base.close();
  return fila;
}

function leerReserva(id) {
  const base = abrirLaBase(true);
  const fila = base.prepare('SELECT * FROM reservas WHERE id = ?').get(id);
  base.close();
  return fila;
}

function contarReservas() {
  const base = abrirLaBase(true);
  const fila = base.prepare('SELECT COUNT(*) AS total FROM reservas').get();
  base.close();
  return fila.total;
}

function reservasDelDia(fecha) {
  const base = abrirLaBase(true);
  const filas = base
    .prepare('SELECT * FROM reservas WHERE fecha = ? ORDER BY cancha, hora')
    .all(fecha);
  base.close();
  return filas;
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
