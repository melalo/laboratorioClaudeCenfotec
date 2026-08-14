// Herramientas compartidas por las comprobaciones: levantar la aplicacion de verdad
// (servidor real + base SQLite real, sin imitaciones) y un "navegador" minimo que
// recuerda la galleta de sesion entre pedidos, como haria un navegador de verdad.

import { once } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

import { abrirBase } from '../src/base-de-datos.js';
import { sembrarDatosDePrueba } from '../src/datos-de-prueba.js';
import { crearServidor } from '../src/servidor.js';

// Las mismas cuentas que crea el comando de datos de prueba. Son inventadas.
export const CUENTAS = {
  administracion: { usuario: 'admin', contrasena: 'admin123' },
  taquilla: { usuario: 'taquilla', contrasena: 'taquilla123' },
};

// Un jueves fijo, para que las comprobaciones no dependan del dia en que se corran.
export const JUEVES_DE_PRUEBA = new Date(2026, 7, 13, 10, 0);

// La semana vigente de ese jueves va del 13 al 19 de agosto de 2026, y como toda semana
// del cine va de jueves a miercoles, contiene exactamente un miercoles: el 19 (RN-2, el
// dia del descuento). El jueves 13 sirve como "un dia que no es miercoles".
export const MIERCOLES_DE_PRUEBA = '2026-08-19';
export const DIA_COMUN_DE_PRUEBA = '2026-08-13';

// Un PNG de 1x1 transparente: lo mas chico que se puede subir y que sea una imagen de verdad.
export const PNG_MINIMO = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

export async function levantarApp(opciones = {}) {
  const ruta = opciones.ruta ?? path.join(os.tmpdir(), `cine-prueba-${randomUUID()}.db`);
  // Los afiches viven junto a la base de datos, asi que en las pruebas caen tambien en
  // la carpeta temporal y no ensucian el proyecto.
  const carpetaAfiches = path.join(path.dirname(ruta), `afiches-${path.basename(ruta, '.db')}`);
  const db = abrirBase(ruta);
  if (opciones.sembrar !== false) {
    sembrarDatosDePrueba(db, opciones.hoy ?? JUEVES_DE_PRUEBA, carpetaAfiches);
  }
  // `tarifas` se puede reemplazar para comprobar que el precio sale de la configuracion
  // y no esta escrito dentro del codigo (vertical slice 3).
  const app = crearServidor(db, {
    ahora: () => opciones.hoy ?? JUEVES_DE_PRUEBA,
    carpetaAfiches,
    ...(opciones.tarifas ? { tarifas: opciones.tarifas } : {}),
  });
  const servidor = app.listen(0, '127.0.0.1');
  await once(servidor, 'listening');
  const direccion = `http://127.0.0.1:${servidor.address().port}`;

  return {
    direccion,
    db,
    ruta,
    carpetaAfiches,
    navegador: () => navegador(direccion),
    async cerrar({ borrarArchivo = true } = {}) {
      await new Promise((listo) => servidor.close(listo));
      db.close();
      if (borrarArchivo) {
        fs.rmSync(ruta, { force: true });
        fs.rmSync(carpetaAfiches, { force: true, recursive: true });
      }
    },
  };
}

// Navegador minimo: guarda la galleta que manda el servidor y la reenvia en cada pedido.
export function navegador(direccion) {
  let galleta = null;

  async function pedir(camino, opciones = {}) {
    const respuesta = await fetch(direccion + camino, {
      ...opciones,
      redirect: 'manual',
      headers: { ...(opciones.headers ?? {}), ...(galleta ? { cookie: galleta } : {}) },
    });
    const recibidas = respuesta.headers.getSetCookie();
    if (recibidas.length > 0) {
      galleta = recibidas.map((c) => c.split(';')[0]).join('; ');
    }
    return respuesta;
  }

  // Un formulario puede mandar varias veces el mismo campo —el mapa manda un "asientos"
  // por cada butaca marcada—, asi que un valor que sea lista se agrega una vez por item.
  function comoFormulario(datos) {
    const campos = new URLSearchParams();
    for (const [campo, valor] of Object.entries(datos)) {
      for (const uno of Array.isArray(valor) ? valor : [valor]) campos.append(campo, String(uno));
    }
    return campos.toString();
  }

  return {
    ver: (camino) => pedir(camino),
    enviar: (camino, datos) =>
      pedir(camino, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: comoFormulario(datos),
      }),
    // Un formulario con archivo adjunto viaja en otro formato: lo arma FormData, y a
    // proposito no se toca la cabecera de tipo de contenido para que fetch la complete.
    enviarConArchivo(camino, datos, archivo = null) {
      const cuerpo = new FormData();
      for (const [campo, valor] of Object.entries(datos)) cuerpo.append(campo, String(valor));
      if (archivo) {
        cuerpo.append(archivo.campo, new Blob([archivo.contenido], { type: archivo.tipo }), archivo.nombre);
      }
      return pedir(camino, { method: 'POST', body: cuerpo });
    },
    async ingresar(cuenta) {
      return pedir('/personal/ingresar', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(cuenta).toString(),
      });
    },
  };
}

// Cuenta cuantos asientos trae una pantalla de mapa de asientos.
export function contarAsientos(html) {
  return (html.match(/data-asiento="/g) ?? []).length;
}

export function contarAsientosDisponibles(html) {
  return (html.match(/class="asiento disponible"/g) ?? []).length;
}

// Los asientos que este mismo cliente tiene tomados: los amarillos (vertical slice 2).
export function contarAsientosEligiendo(html) {
  return (html.match(/class="asiento eligiendo"/g) ?? []).length;
}

export function contarAsientosOcupados(html) {
  return (html.match(/class="asiento ocupado"/g) ?? []).length;
}

// La primera funcion de la cartelera de prueba, con los datos que hacen falta para
// pedir su mapa y comprobar lo que muestra.
export function unaFuncion(db, capacidad = 120) {
  return db
    .prepare(
      `SELECT f.id, s.id AS sala_id, s.capacidad
         FROM funciones f JOIN salas s ON s.id = f.sala_id
        WHERE s.capacidad = ? ORDER BY f.fecha_hora LIMIT 1`,
    )
    .get(capacidad);
}

// La primera funcion de un dia concreto. El vertical slice 3 la necesita para separar
// el miercoles —el dia del descuento de RN-2— de cualquier otro dia.
export function funcionDelDia(db, dia, capacidad = 120) {
  return db
    .prepare(
      `SELECT f.id, f.fecha_hora, f.formato, s.id AS sala_id, s.capacidad,
              s.nombre AS sala, p.nombre AS pelicula
         FROM funciones f
         JOIN salas s ON s.id = f.sala_id
         JOIN peliculas p ON p.id = f.pelicula_id
        WHERE substr(f.fecha_hora, 1, 10) = ? AND s.capacidad = ?
        ORDER BY f.fecha_hora LIMIT 1`,
    )
    .get(dia, capacidad);
}

// La compra tal como quedo guardada, con sus boletos. Es lo que permite comprobar el
// precio y el descuento sin creerle a la pantalla (vertical slice 3).
export function compraGuardada(db, compraId) {
  const guardada = db.prepare('SELECT * FROM compras WHERE id = ?').get(compraId);
  if (!guardada) return null;

  // node:sqlite devuelve los renglones como objetos "pelados", sin el molde comun de
  // JavaScript. Se copian a objetos normales para poder compararlos de igual a igual
  // con los que escribe la prueba.
  const compra = { ...guardada };
  compra.boletos = db
    .prepare(
      `SELECT a.fila || a.numero AS codigo, ca.descuento, ca.precio
         FROM compras_asientos ca JOIN asientos a ON a.id = ca.asiento_id
        WHERE ca.compra_id = ? ORDER BY a.fila, a.numero`,
    )
    .all(compraId)
    .map((boleto) => ({ ...boleto }));
  return compra;
}

// El numero de compra que sale del redirect de /reservar: '/reservas/7' -> 7
export function idDelRedirect(respuesta) {
  return Number(respuesta.headers.get('location').split('/').at(-1));
}
