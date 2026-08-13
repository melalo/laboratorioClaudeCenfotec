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
  const app = crearServidor(db, { ahora: () => opciones.hoy ?? JUEVES_DE_PRUEBA, carpetaAfiches });
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

  return {
    ver: (camino) => pedir(camino),
    enviar: (camino, datos) =>
      pedir(camino, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(datos).toString(),
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
