'use strict';

// Todo lo que este programa sabe de su base de datos vive acá, y en ningún otro lado.
//
// Antes las consultas estaban escritas en SQL dentro de `server.js`, otra vez dentro de `datos.js`
// y una tercera vez dentro del andamio de las pruebas. Tres copias de las mismas preguntas: cambiar
// de base obligaba a traducirlas tres veces y arriesgarse a que una quedara distinta. Este archivo
// concentra todo eso, así que quien lo use pide «contame las reservas activas de este bloque» y no
// necesita saber cómo se le pregunta a la base.
//
// La base es **SQLite**, la misma de siempre, pero a través de `@libsql/client` en vez de
// `better-sqlite3`. El cambio de biblioteca no cambia el idioma: es el mismo SQL, las mismas
// tablas, las mismas consultas. Lo que agrega es un segundo destino posible.

const path = require('path');
const { createClient } = require('@libsql/client');

// El archivo de la base cuando se trabaja en la computadora.
const ARCHIVO_LOCAL = path.join(__dirname, 'reservas.db');

let conexion = null;

// A qué base hay que hablarle.
//
// Con `TURSO_DATABASE_URL` configurada, a esa: es lo que pasa en el despliegue, donde apunta a una
// base alojada en Turso (SQLite en la nube). `TURSO_AUTH_TOKEN` es la contraseña de esa base.
//
// Sin nada configurado —tu computadora, y las 48 pruebas— la base es el archivo `reservas.db` de
// esta carpeta, igual que toda la vida: `npm start`, `npm run datos` y la verificación siguen
// funcionando sin internet y sin configurar nada.
//
// Ojo con Windows: una dirección de archivo se escribe `file:` seguido de la ruta con barras
// inclinadas normales (`/`), nunca con las invertidas (`\`) que usa Windows. Por eso se cambian
// acá; si no, la biblioteca no encuentra el archivo.
function direccionDeLaBase() {
  if (process.env.TURSO_DATABASE_URL) {
    return {
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
      esLocal: process.env.TURSO_DATABASE_URL.startsWith('file:'),
    };
  }
  return { url: 'file:' + ARCHIVO_LOCAL.replace(/\\/g, '/'), esLocal: true };
}

// La tabla, tal como quedó desde el primer día. Es la única que hay.
const CREAR_TABLA = `
  CREATE TABLE IF NOT EXISTS reservas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cancha INTEGER NOT NULL,
    fecha TEXT NOT NULL,
    hora INTEGER NOT NULL,
    cliente TEXT NOT NULL,
    telefono TEXT,
    precio INTEGER NOT NULL,
    estado TEXT NOT NULL DEFAULT 'activa',
    creada_en TEXT NOT NULL DEFAULT (datetime('now'))
  )
`;

// La conexión, una sola para todo el proceso.
//
// En un despliegue esto no es una optimización sino una necesidad: cada visita despierta una
// función, y si cada una abriera su propia conexión, el cupo del plan gratis se agota enseguida.
// Guardando la promesa en esta variable, las visitas que caen en una función ya despierta
// reutilizan la conexión que ya está abierta.
//
// Si la conexión falla, la variable se limpia para que el próximo intento vuelva a probar en vez
// de quedarse pegado para siempre a un error viejo.
function conectar() {
  if (!conexion) {
    conexion = (async () => {
      const destino = direccionDeLaBase();
      const cliente = createClient({ url: destino.url, authToken: destino.authToken });

      // Solo tienen sentido contra un archivo del disco, no contra una base remota:
      //   - WAL deja que alguien lea mientras otro escribe, en vez de trabarse;
      //   - busy_timeout hace que, si la base está ocupada, se espere hasta 5 segundos en lugar de
      //     fallar en el acto. Hace falta porque durante las pruebas hay DOS programas escribiendo
      //     en el mismo archivo: la aplicación y la prueba que la vigila.
      if (destino.esLocal) {
        await cliente.execute('PRAGMA journal_mode = WAL');
        await cliente.execute('PRAGMA busy_timeout = 5000');
      }

      await cliente.execute(CREAR_TABLA);
      return cliente;
    })().catch((error) => {
      conexion = null;
      throw error;
    });
  }
  return conexion;
}

// Que la base esté lista antes de atender a nadie. `server.js` espera esto en cada visita.
async function estaLista() {
  await conectar();
}

// Hacer una consulta. `argumentos` son los valores que reemplazan a cada `?` del SQL.
//
// Se escriben así, y no pegados dentro del texto de la consulta, porque es lo que impide que un
// nombre de cliente como `'; DROP TABLE reservas; --` se ejecute como si fuera SQL.
async function consultar(sql, ...argumentos) {
  const cliente = await conectar();
  return cliente.execute({ sql, args: argumentos });
}

async function unaFila(sql, ...argumentos) {
  const resultado = await consultar(sql, ...argumentos);
  return resultado.rows[0];
}

// -- Las preguntas que hace la aplicación ----------------------------------------------------

// Cuántas reservas activas hay en este bloque.
async function contarActivasEnElBloque(cancha, fecha, hora) {
  const fila = await unaFila(
    `SELECT COUNT(*) AS total FROM reservas
     WHERE cancha = ? AND fecha = ? AND hora = ? AND estado = 'activa'`,
    cancha,
    fecha,
    hora
  );
  return Number(fila.total);
}

// Cuántas reservas tiene este teléfono en este mes. `substr(fecha, 1, 7)` recorta 'AAAA-MM' de la
// fecha, que es lo que se compara contra el mes.
//
// Ojo: cuenta **todas**, incluidas las canceladas. Eso es el hallazgo H-02, que sigue abierto: acá
// queda tal cual, sin arreglarlo, para que su prueba lo siga delatando.
async function contarDelTelefonoEnElMes(telefono, mes) {
  const fila = await unaFila(
    `SELECT COUNT(*) AS total FROM reservas
     WHERE telefono = ? AND substr(fecha, 1, 7) = ?`,
    telefono,
    mes
  );
  return Number(fila.total);
}

// Las reservas de un día, ordenadas por cancha y hora.
async function reservasDelDia(fecha) {
  const resultado = await consultar(
    `SELECT * FROM reservas WHERE fecha = ? ORDER BY cancha, hora`,
    fecha
  );
  return resultado.rows;
}

// Guardar una reserva y devolver su número.
//
// SQLite reparte los números sola, con `AUTOINCREMENT`: 1, 2, 3... y avisa cuál le tocó a la
// última en `lastInsertRowid`. Viene como número grande (`BigInt`), así que se pasa a número
// común, que es lo que espera el resto del programa para armar la dirección `/reservas/12/cancelar`.
async function insertarReserva({ cancha, fecha, hora, cliente, telefono, precio, estado }) {
  const resultado = await consultar(
    `INSERT INTO reservas (cancha, fecha, hora, cliente, telefono, precio, estado)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    cancha,
    fecha,
    hora,
    cliente,
    telefono,
    precio,
    estado || 'activa'
  );
  return Number(resultado.lastInsertRowid);
}

// Una reserva por su número. Devuelve `undefined` cuando no existe.
async function buscarPorNumero(id) {
  return unaFila(`SELECT * FROM reservas WHERE id = ?`, id);
}

// Una reserva por cancha, fecha y hora. La usa el andamio de las pruebas.
async function buscarEnElBloque({ cancha, fecha, hora }) {
  return unaFila(
    `SELECT * FROM reservas WHERE cancha = ? AND fecha = ? AND hora = ?`,
    cancha,
    fecha,
    hora
  );
}

// Marcar una reserva como cancelada.
async function cancelarPorNumero(id) {
  await consultar(`UPDATE reservas SET estado = 'cancelada' WHERE id = ?`, id);
}

// Cuántas reservas hay en total. La usa el andamio de las pruebas.
async function contarTodas() {
  const fila = await unaFila(`SELECT COUNT(*) AS total FROM reservas`);
  return Number(fila.total);
}

// -- Mantenimiento -----------------------------------------------------------------------------

// Dejar la base vacía y la numeración en cero.
//
// Se tira la tabla entera y se vuelve a crear, en vez de borrar el archivo: contra una base remota
// no hay archivo que tirar a la basura, así que así el comando funciona igual en los dos destinos.
// Y tirar la tabla es lo que reinicia la numeración, de modo que la primera reserva nueva vuelve a
// ser la #1.
async function vaciarTodo() {
  const cliente = await conectar();
  await cliente.execute('DROP TABLE IF EXISTS reservas');
  await cliente.execute(CREAR_TABLA);
}

// Cerrar todo. Hace falta para que un programa de una sola pasada, como `npm run datos`, termine en
// vez de quedarse colgado con la conexión abierta.
async function cerrar() {
  if (conexion) {
    const cliente = await conexion;
    cliente.close();
    conexion = null;
  }
}

module.exports = {
  estaLista,
  contarActivasEnElBloque,
  contarDelTelefonoEnElMes,
  reservasDelDia,
  insertarReserva,
  buscarPorNumero,
  buscarEnElBloque,
  cancelarPorNumero,
  contarTodas,
  vaciarTodo,
  cerrar,
};
