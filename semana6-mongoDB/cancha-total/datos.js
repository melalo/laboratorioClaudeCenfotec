// Borra las reservas y las recrea con datos de ejemplo.
// Uso: npm run datos
//
// Trabaja contra la misma base que `server.js`, porque los dos le preguntan a `basededatos.js`:
// el MongoDB local de tu computadora si no hay nada configurado, o el de MongoDB Atlas si esta
// puesta la variable MONGODB_URI. Este archivo no sabe cual de los dos es, y no le hace falta.

const baseDeDatos = require('./basededatos');

function fechaISO(offsetDias) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDias);
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

const reservas = [
  { cancha: 1, fecha: fechaISO(0), hora: 9, cliente: 'Marco Jiménez', telefono: '88112233', precio: 15000, estado: 'activa' },
  { cancha: 2, fecha: fechaISO(0), hora: 19, cliente: 'Sofía Araya', telefono: '87654321', precio: 20000, estado: 'activa' },
  { cancha: 1, fecha: fechaISO(0), hora: 20, cliente: 'Los Tigres FC', telefono: '86001122', precio: 20000, estado: 'cancelada' },
  { cancha: 2, fecha: fechaISO(1), hora: 8, cliente: 'Randall Solano', telefono: '83445566', precio: 15000, estado: 'activa' },
  { cancha: 1, fecha: fechaISO(1), hora: 18, cliente: 'Equipo Amigos del Barrio', telefono: '89998877', precio: 18000, estado: 'activa' },
  { cancha: 2, fecha: fechaISO(2), hora: 10, cliente: 'Marco Jiménez', telefono: '88112233', precio: 15000, estado: 'activa' },
  { cancha: 1, fecha: fechaISO(-1), hora: 17, cliente: 'Kevin Mora', telefono: '84223344', precio: 15000, estado: 'activa' },
  { cancha: 2, fecha: fechaISO(-2), hora: 21, cliente: 'Grupo Fútbol 5 Escazú', telefono: '87001199', precio: 20000, estado: 'cancelada' },
  { cancha: 1, fecha: fechaISO(3), hora: 16, cliente: 'Marco Jiménez', telefono: '88112233', precio: 15000, estado: 'activa' },
  { cancha: 2, fecha: fechaISO(4), hora: 12, cliente: 'Paola Vindas', telefono: '85667788', precio: 15000, estado: 'activa' },
];

async function recrear() {
  // Antes esto era un DROP TABLE, que borraba la tabla entera y de paso reiniciaba la numeracion.
  // MongoDB no tiene tablas que tirar: se vacia la coleccion de reservas y la del contador, que es
  // lo que hace que la primera reserva nueva vuelva a ser la #1.
  await baseDeDatos.vaciarTodo();
  console.log('Reservas anteriores borradas.');

  for (const r of reservas) {
    await baseDeDatos.insertarReserva(r);
  }

  console.log(`Base de datos recreada con ${reservas.length} reservas de ejemplo.`);
}

recrear()
  .catch((error) => {
    console.error('No se pudieron recrear los datos:', error.message);
    process.exitCode = 1;
  })
  .finally(() => baseDeDatos.cerrar());
