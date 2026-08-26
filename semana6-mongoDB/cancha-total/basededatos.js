'use strict';

// Todo lo que este programa sabe de MongoDB vive aca, y en ningun otro lado.
//
// Antes las consultas estaban escritas en SQL dentro de `server.js`, otra vez dentro de `datos.js`
// y una tercera vez dentro del andamio de las pruebas. Tres copias de las mismas preguntas: al
// migrar a MongoDB habia que traducirlas tres veces y arriesgarse a que una quedara distinta. Este
// archivo concentra todo eso, asi que quien lo use pide "contame las reservas activas de este
// bloque" y no necesita saber en que idioma se le pregunta a la base.
//
// De tablas a documentos, en una linea: SQLite guardaba **filas** en una tabla de columnas fijas;
// MongoDB guarda **documentos**, que son fichas JSON. Cada reserva paso a ser una ficha asi:
//
//   { id: 12, cancha: 1, fecha: '2026-08-25', hora: 17, cliente: 'Marco',
//     telefono: '88112233', precio: 20000, estado: 'activa', creada_en: '2026-08-25 21:44:55' }
//
// Los mismos campos que tenia la tabla, con los mismos nombres. Lo unico que cambio es la forma de
// preguntar.

const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const NOMBRE_BASE = process.env.MONGODB_DB || 'cancha_total';
const COLECCION = 'reservas';
const COLECCION_CONTADORES = 'contadores';

// Donde guarda sus archivos el MongoDB de repuesto que se levanta cuando no hay nada configurado.
const CARPETA_LOCAL = path.join(__dirname, 'datos-locales');

let conexion = null;
let mongoDeRepuesto = null;

// A que base hay que hablarle.
//
// Con `MONGODB_URI` configurada, a esa: es lo que pasa en Vercel, donde apunta a MongoDB Atlas.
//
// Sin nada configurado -tu computadora, y las 48 pruebas- se levanta un MongoDB **propio y
// local**, con la biblioteca `mongodb-memory-server`. Guarda sus archivos en `datos-locales/`, asi
// que las reservas siguen estando ahi la proxima vez que arranques, igual que cuando la base era un
// archivo. Es lo que permite que `npm start` y `./verificar.sh` sigan funcionando sin internet y
// sin instalarte MongoDB.
//
// Esa biblioteca es de desarrollo, no se instala en Vercel: alla, si faltara `MONGODB_URI`, este
// mensaje dice exactamente que configurar en vez de morir con un error indescifrable.
async function direccionDeLaBase() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;

  let MongoMemoryServer;
  try {
    ({ MongoMemoryServer } = require('mongodb-memory-server'));
  } catch {
    throw new Error(
      'No hay ninguna base configurada: falta la variable de entorno MONGODB_URI. ' +
        'En Vercel hay que cargarla con la cadena de conexion de MongoDB Atlas ' +
        '(la que empieza con mongodb+srv://).'
    );
  }

  fs.mkdirSync(CARPETA_LOCAL, { recursive: true });
  mongoDeRepuesto = await MongoMemoryServer.create({
    instance: { dbName: NOMBRE_BASE, dbPath: CARPETA_LOCAL, storageEngine: 'wiredTiger' },
  });
  return mongoDeRepuesto.getUri();
}

// La conexion, una sola para todo el proceso.
//
// En Vercel esto es obligatorio, no una optimizacion: cada visita despierta una funcion, y si cada
// una abriera su propia conexion, el cupo del plan gratis de Atlas se agota en minutos y el sitio
// empieza a rechazar visitas. Guardando la promesa en esta variable, las visitas que caen en una
// funcion ya despierta reutilizan la conexion que ya esta abierta.
//
// Si la conexion falla, la variable se limpia para que el proximo intento vuelva a probar en vez de
// quedarse pegado para siempre a un error viejo.
function conectar() {
  if (!conexion) {
    conexion = (async () => {
      const cliente = new MongoClient(await direccionDeLaBase());
      await cliente.connect();
      const base = cliente.db(NOMBRE_BASE);
      // MongoDB crea las colecciones solo, cuando llega el primer documento: no hay CREATE TABLE
      // que escribir. Lo unico que si hay que declarar es que dos reservas no pueden compartir
      // numero, que es lo que la tabla garantizaba con su clave primaria.
      await base.collection(COLECCION).createIndex({ id: 1 }, { unique: true });
      return { cliente, base };
    })().catch((error) => {
      conexion = null;
      throw error;
    });
  }
  return conexion;
}

// Que la base este lista antes de atender a nadie. `server.js` espera esto en cada visita.
async function estaLista() {
  await conectar();
}

async function coleccion() {
  const { base } = await conectar();
  return base.collection(COLECCION);
}

// El numero de la reserva.
//
// La tabla los repartia sola, con `AUTOINCREMENT`: 1, 2, 3... MongoDB no hace eso. A cada documento
// le pone un codigo largo tipo `507f1f77bcf86cd799439011`, que serviria para la base pero no para
// la pantalla: la confirmacion dice "Reserva #12 creada" y la direccion para cancelar es
// `/reservas/12/cancelar`. Asi que el contador hay que llevarlo a mano.
//
// Esta coleccion guarda una sola ficha, `{ _id: 'reservas', valor: 12 }`, y `$inc` le suma uno **y
// devuelve el resultado en la misma operacion**. Eso importa: si dos personas reservan en el mismo
// instante, ninguna de las dos se puede llevar el mismo numero, porque el que suma es MongoDB y no
// nuestro programa.
async function siguienteNumero() {
  const { base } = await conectar();
  const resultado = await base.collection(COLECCION_CONTADORES).findOneAndUpdate(
    { _id: 'reservas' },
    { $inc: { valor: 1 } },
    { upsert: true, returnDocument: 'after' }
  );
  // Segun la version del driver, esto viene como el documento pelado o envuelto en `.value`.
  const ficha = resultado && resultado.value ? resultado.value : resultado;
  return ficha.valor;
}

// El sello de cuando se creo, con el mismo formato que ponia SQLite ('AAAA-MM-DD HH:MM:SS', en UTC).
function selloDeAhora() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

// -- Las preguntas que hace la aplicacion ----------------------------------------------------

// Cuantas reservas activas hay en este bloque. Era:
//   SELECT COUNT(*) FROM reservas WHERE cancha=? AND fecha=? AND hora=? AND estado='activa'
async function contarActivasEnElBloque(cancha, fecha, hora) {
  const col = await coleccion();
  return col.countDocuments({ cancha, fecha, hora, estado: 'activa' });
}

// Cuantas reservas tiene este telefono en este mes. Era:
//   SELECT COUNT(*) FROM reservas WHERE telefono=? AND substr(fecha,1,7)=?
//
// `substr(fecha,1,7)` recortaba 'AAAA-MM' de la fecha; aca se pide lo mismo con "que la fecha
// empiece con 'AAAA-MM'", que es lo que significa el `^` del patron.
//
// Ojo: cuenta **todas**, incluidas las canceladas. Eso es el hallazgo H-02, que sigue abierto: la
// migracion lo traduce tal cual, sin arreglarlo, para que su prueba siga delatandolo.
async function contarDelTelefonoEnElMes(telefono, mes) {
  const col = await coleccion();
  return col.countDocuments({ telefono, fecha: new RegExp('^' + mes) });
}

// Las reservas de un dia, ordenadas por cancha y hora. Era:
//   SELECT * FROM reservas WHERE fecha=? ORDER BY cancha, hora
async function reservasDelDia(fecha) {
  const col = await coleccion();
  return col.find({ fecha }).sort({ cancha: 1, hora: 1 }).toArray();
}

// Guardar una reserva y devolver su numero. Era el INSERT.
async function insertarReserva({ cancha, fecha, hora, cliente, telefono, precio, estado }) {
  const col = await coleccion();
  const id = await siguienteNumero();
  await col.insertOne({
    id,
    cancha,
    fecha,
    hora,
    cliente,
    telefono,
    precio,
    estado: estado || 'activa',
    creada_en: selloDeAhora(),
  });
  return id;
}

// Una reserva por su numero. Era: SELECT * FROM reservas WHERE id=?
//
// Devuelve `undefined` cuando no existe, igual que hacia la consulta anterior, porque hay pruebas
// que comprueban exactamente eso. MongoDB devuelve `null`, asi que se traduce aca.
async function buscarPorNumero(id) {
  const col = await coleccion();
  const ficha = await col.findOne({ id });
  return ficha === null ? undefined : ficha;
}

// Una reserva por cancha, fecha y hora. La usa el andamio de las pruebas.
async function buscarEnElBloque({ cancha, fecha, hora }) {
  const col = await coleccion();
  const ficha = await col.findOne({ cancha, fecha, hora });
  return ficha === null ? undefined : ficha;
}

// Marcar una reserva como cancelada. Era: UPDATE reservas SET estado='cancelada' WHERE id=?
async function cancelarPorNumero(id) {
  const col = await coleccion();
  await col.updateOne({ id }, { $set: { estado: 'cancelada' } });
}

// Cuantas reservas hay en total. La usa el andamio de las pruebas.
async function contarTodas() {
  const col = await coleccion();
  return col.countDocuments({});
}

// -- Mantenimiento -----------------------------------------------------------------------------

// Dejar la base vacia y el contador en cero. Es lo que hacia `DROP TABLE`: no solo borraba las
// filas, tambien reiniciaba la numeracion, asi que la primera reserva nueva vuelve a ser la #1.
async function vaciarTodo() {
  const { base } = await conectar();
  await base.collection(COLECCION).deleteMany({});
  await base.collection(COLECCION_CONTADORES).deleteMany({});
}

// Cerrar todo. Hace falta para que un programa de una sola pasada, como `npm run datos`, termine en
// vez de quedarse colgado con la conexion abierta.
async function cerrar() {
  if (conexion) {
    const { cliente } = await conexion;
    await cliente.close();
    conexion = null;
  }
  if (mongoDeRepuesto) {
    await mongoDeRepuesto.stop();
    mongoDeRepuesto = null;
  }
}

module.exports = {
  NOMBRE_BASE,
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
