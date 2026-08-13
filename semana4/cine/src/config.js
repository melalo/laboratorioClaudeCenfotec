// Lee config.json, el archivo de configuracion de la aplicacion.
// El vertical slice 3 le agregara el precio base y los porcentajes de descuento.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const raizDelProyecto = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const leido = JSON.parse(fs.readFileSync(path.join(raizDelProyecto, 'config.json'), 'utf8'));

export const configuracion = {
  ...leido,
  rutaBaseDeDatos: path.resolve(raizDelProyecto, leido.archivoBaseDeDatos),
};
