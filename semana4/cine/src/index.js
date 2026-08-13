// Punto de arranque: abre la base y pone el servidor a escuchar.
//   npm start

import { abrirBase } from './base-de-datos.js';
import { configuracion } from './config.js';
import { crearServidor } from './servidor.js';

const db = abrirBase(configuracion.rutaBaseDeDatos);
const app = crearServidor(db);

app.listen(configuracion.puerto, () => {
  console.log(`Cine Variedades funcionando en http://localhost:${configuracion.puerto}`);
  console.log(`Base de datos: ${configuracion.rutaBaseDeDatos}`);
});
