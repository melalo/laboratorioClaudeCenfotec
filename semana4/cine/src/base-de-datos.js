// Abre la base SQLite y se asegura de que existan las tablas.
// SQLite viene incluido en Node.js 24 (modulo node:sqlite), asi que no hay que
// instalar ni compilar nada (DISENO.md, "Otras decisiones").

import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export function abrirBase(rutaArchivo) {
  const carpeta = path.dirname(rutaArchivo);
  if (carpeta && carpeta !== '.') fs.mkdirSync(carpeta, { recursive: true });

  const db = new DatabaseSync(rutaArchivo);
  db.exec('PRAGMA foreign_keys = ON');
  crearTablas(db);
  ponerseAlDia(db);
  return db;
}

// Las tablas solo se crean si no existen, asi que una base creada antes de un cambio
// se quedaria sin las columnas nuevas. Esto se las agrega sin borrar lo que ya hay.
function ponerseAlDia(db) {
  agregarColumnaSiFalta(db, 'peliculas', 'afiche', 'TEXT');
}

function agregarColumnaSiFalta(db, tabla, columna, tipo) {
  const { cuantas } = db
    .prepare('SELECT COUNT(*) AS cuantas FROM pragma_table_info(?) WHERE name = ?')
    .get(tabla, columna);
  if (cuantas === 0) db.exec(`ALTER TABLE ${tabla} ADD COLUMN ${columna} ${tipo}`);
}

// Los afiches viven junto a la base de datos: son datos del cine, no parte del programa
// (DISENO.md, "Otras decisiones").
export function carpetaAfichesDe(rutaBaseDeDatos) {
  return path.join(path.dirname(rutaBaseDeDatos), 'afiches');
}

// Solo las entidades que necesitan los vertical slices ya construidos. Cada slice
// agrega lo suyo cuando le hace falta, no antes (PLAN.md, "Como usar este plan").
function crearTablas(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS salas (
      id        INTEGER PRIMARY KEY,
      nombre    TEXT    NOT NULL UNIQUE,
      filas     INTEGER NOT NULL,
      columnas  INTEGER NOT NULL,
      capacidad INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS asientos (
      id      INTEGER PRIMARY KEY,
      sala_id INTEGER NOT NULL REFERENCES salas(id),
      fila    TEXT    NOT NULL,
      numero  INTEGER NOT NULL,
      UNIQUE (sala_id, fila, numero)
    );

    CREATE TABLE IF NOT EXISTS peliculas (
      id     INTEGER PRIMARY KEY,
      nombre TEXT    NOT NULL UNIQUE,
      afiche TEXT
    );

    CREATE TABLE IF NOT EXISTS funciones (
      id          INTEGER PRIMARY KEY,
      pelicula_id INTEGER NOT NULL REFERENCES peliculas(id),
      sala_id     INTEGER NOT NULL REFERENCES salas(id),
      fecha_hora  TEXT    NOT NULL,
      formato     TEXT    NOT NULL CHECK (formato IN ('doblada', 'subtitulada'))
    );

    CREATE TABLE IF NOT EXISTS cuentas (
      id                 INTEGER PRIMARY KEY,
      usuario            TEXT NOT NULL UNIQUE,
      contrasena_cifrada TEXT NOT NULL,
      sal                TEXT NOT NULL,
      rol                TEXT NOT NULL CHECK (rol IN ('administracion', 'taquilla'))
    );

    -- Una Compra del vertical slice 2: por ahora solo la reserva temporal. El nombre y
    -- la identificacion del cliente, el descuento, el precio y el codigo de confirmacion
    -- los agrega el vertical slice 3, con "ponerseAlDia" (DISENO.md, "Otras decisiones").
    -- Los tres estados son los del modelo de datos, aunque este slice solo produzca dos:
    -- 'pagada' la crea el vertical slice 3.
    CREATE TABLE IF NOT EXISTS compras (
      id         INTEGER PRIMARY KEY,
      funcion_id INTEGER NOT NULL REFERENCES funciones(id),
      estado     TEXT    NOT NULL CHECK (estado IN ('reservada', 'pagada', 'vencida')),
      creada_en  TEXT    NOT NULL
    );

    -- Una compra puede llevarse varios asientos (RF-3), asi que la relacion vive aparte.
    -- Al borrarse la compra se van con ella: no existe un asiento comprado sin compra.
    CREATE TABLE IF NOT EXISTS compras_asientos (
      compra_id  INTEGER NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
      asiento_id INTEGER NOT NULL REFERENCES asientos(id),
      PRIMARY KEY (compra_id, asiento_id)
    );
  `);
}
