// Cancha Total F5 - sistema de reservas
// Node + Express + MongoDB, vistas renderizadas en el servidor.

const express = require('express');
const baseDeDatos = require('./basededatos');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Este archivo ya no escribe ni una consulta: se las pide a `basededatos.js`, que es el unico que
// sabe que del otro lado hay MongoDB. Antes aca vivia el SQL, y estaba escrito tambien en
// `datos.js` y en el andamio de las pruebas: tres copias que podian quedar distintas entre si.

// Envolver una ruta que consulta la base.
//
// Express 4 no sabe que hacer cuando una ruta `async` falla: la peticion se queda colgada para
// siempre y el navegador gira sin fin. Este envoltorio agarra el error y se lo entrega a Express,
// que responde con un 500 visible en vez de un silencio.
function conBase(manejador) {
  return (req, res, next) => Promise.resolve(manejador(req, res, next)).catch(next);
}

// La base tiene que estar lista antes de atender a nadie.
//
// Conectarse a MongoDB lleva su tiempo, asi que es una promesa. El `app.use` de abajo hace que cada
// visita espere a que esa promesa termine antes de entrar a su ruta: sin el, la primera visita
// podria llegar a una base que todavia no esta conectada.
const baseLista = baseDeDatos.estaLista();

// Si la conexion falla, el error se reporta en la primera visita, en el `app.use` de abajo. Este
// `catch` vacio esta solo para que Node no tumbe el proceso entero mientras todavia no llego nadie.
baseLista.catch(() => {});

app.use((req, res, next) => {
  baseLista.then(() => next(), next);
});

// -----------------------------------------------------------------------
// Función vieja que ya no usa nadie. Quedó del primer borrador cuando se
// pensó en bloquear reservas en feriados. Se deja por si se retoma la idea.
function esFeriado(fecha) {
  const feriados = ['01-01', '04-11', '05-01', '07-25', '08-15', '09-15', '12-25'];
  const mesDia = fecha.slice(5);
  return feriados.includes(mesDia);
}

// Precios de temporada alta (plan viejo, ya no se usa - se dejó de cobrar
// distinto en temporada alta porque el dueño lo canceló). No borrar por si
// se retoma en diciembre.
// const PRECIO_TEMPORADA_ALTA_DIURNO = 18000;
// const PRECIO_TEMPORADA_ALTA_NOCTURNO = 25000;
// function esTemporadaAlta(fecha) {
//   const mes = Number(fecha.slice(5, 7));
//   return mes === 12 || mes === 1;
// }
// -----------------------------------------------------------------------

// La tarifa de un bloque, en un solo lugar.
//
// Antes este cálculo estaba escrito tres veces: al pintar la disponibilidad, al crear la reserva
// y al cotizar. Cambiar la hora en que se enciende la luz obligaba a tocar los tres lugares, y
// tocar uno solo dejaba la aplicación mostrando un precio y cobrando otro. Ahora hay un solo
// lugar donde cambiarla, y los tres caminos preguntan acá.
const TARIFA_DIURNA = 15000;
const TARIFA_CON_LUZ = 20000;
// La luz se enciende a las 17:00, así que el partido de las 5 de la tarde ya va con luz. Estaba
// en 18, y por eso el bloque de las 17:00 se cobraba como diurno: fue el hallazgo H-01.
const HORA_EN_QUE_SE_ENCIENDE_LA_LUZ = 17;

function tarifaDelBloque(hora) {
  return hora >= HORA_EN_QUE_SE_ENCIENDE_LA_LUZ ? TARIFA_CON_LUZ : TARIFA_DIURNA;
}

// El precio de una reserva, en un solo lugar: la tarifa del bloque, y el 10% de descuento si el
// cliente es frecuente.
//
// Antes este cálculo vivía dentro de la ruta que crea la reserva, así que era el único lugar del
// programa que sabía calcular un precio completo. La cotización previa no podía preguntárselo y
// terminaba mostrando solo la tarifa del horario: por eso la pantalla mostraba un número y se
// cobraba otro. Sacarlo acá es lo que permite que los dos caminos den la misma respuesta.
//
// Devuelve el monto y si el descuento aplicó, porque quien muestra el precio necesita poder
// explicar por qué es ese.
// La forma de un teléfono válido, en un solo lugar: exactamente 8 dígitos, sin espacios ni
// guiones. La preguntan la validación del formulario y la cotización, que necesita saber si ya
// puede decir el precio con descuento.
function telefonoEsValido(telefono) {
  return /^\d{8}$/.test(telefono || '');
}

async function precioDeLaReserva({ hora, fecha, telefono }) {
  const tarifa = tarifaDelBloque(hora);

  const mesDelPartido = fecha.slice(0, 7);
  const conteoMes = await baseDeDatos.contarDelTelefonoEnElMes(telefono, mesDelPartido);

  const totalConEstaReserva = conteoMes + 1;
  const aplicaDescuento = totalConEstaReserva >= 4;

  return {
    precio: aplicaDescuento ? tarifa * 0.9 : tarifa,
    aplicaDescuento,
  };
}

function formatColones(monto) {
  return '₡' + Math.round(monto).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

async function checkDisponible(cancha, fecha, hora) {
  const activas = await baseDeDatos.contarActivasEnElBloque(cancha, fecha, hora);
  return activas === 0;
}

async function getReservasDelDia(fecha) {
  return baseDeDatos.reservasDelDia(fecha);
}

async function crearReserva(datos) {
  return baseDeDatos.insertarReserva({ ...datos, estado: 'activa' });
}

// El reloj, en un solo lugar.
//
// Sin nada configurado devuelve la hora del sistema, que es exactamente lo que hacía antes cada
// lugar de este archivo que necesitaba saber la fecha. La variable de entorno CANCHA_TOTAL_AHORA
// permite fijarlo, y es lo que hace posible comprobar las reglas que dependen de la hora: sin
// poder fijar el reloj, una prueba de la regla de las 24 horas da un resultado distinto según la
// hora en que se corra, y una prueba así no sirve de red.
//
// El formato es hora local, sin zona: "2026-08-25T23:00:00".
function ahora() {
  const fijado = process.env.CANCHA_TOTAL_AHORA;
  if (!fijado) return new Date();

  const fijada = new Date(fijado);
  if (Number.isNaN(fijada.getTime())) {
    throw new Error(`CANCHA_TOTAL_AHORA no es una fecha válida: ${fijado}`);
  }
  return fijada;
}

function hoyISO() {
  const d = ahora();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

function layout(titulo, contenido) {
  return `<!DOCTYPE html>
<html lang="es-CR">
<head>
<meta charset="UTF-8">
<title>${titulo} - Cancha Total F5</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 900px; margin: 20px auto; padding: 0 15px; color: #222; }
  h1 { color: #145a32; }
  h2 { border-bottom: 1px solid #ccc; padding-bottom: 4px; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
  th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
  th { background: #eef7ee; }
  .libre { color: #145a32; font-weight: bold; }
  .ocupado { color: #a33; }
  .cancelada { color: #999; text-decoration: line-through; }
  .error { background: #fdecea; border: 1px solid #f5c2c0; color: #a33; padding: 10px; margin-bottom: 15px; }
  .ok { background: #eaf7ea; border: 1px solid #b8e0b8; color: #145a32; padding: 10px; margin-bottom: 15px; }
  form.reserva label { display: block; margin-top: 8px; }
  form.reserva input, form.reserva select { padding: 4px; width: 250px; }
  button { padding: 6px 12px; margin-top: 10px; cursor: pointer; }
  nav a { margin-right: 15px; }
</style>
</head>
<body>
<nav>
  <a href="/">Inicio</a>
  <a href="/disponibilidad/cancha1">Cancha 1</a>
  <a href="/disponibilidad/cancha2">Cancha 2</a>
</nav>
<h1>Cancha Total Fútbol 5</h1>
${contenido}
</body>
</html>`;
}

// GET / -------------------------------------------------------------------
// Disponibilidad del día para ambas canchas + formulario de reserva.
app.get('/', conBase(async (req, res) => {
  const fecha = req.query.fecha || hoyISO();

  let filasCancha1 = '';
  let filasCancha2 = '';
  for (let hora = 8; hora <= 21; hora++) {
    // Tarifa del bloque para pintar la disponibilidad.
    const precio = tarifaDelBloque(hora);

    const libre1 = await checkDisponible(1, fecha, hora);
    filasCancha1 += `<tr><td>${hora}:00</td><td class="${libre1 ? 'libre' : 'ocupado'}">${libre1 ? 'Libre' : 'Ocupado'}</td><td>${formatColones(precio)}</td></tr>`;

    const libre2 = await checkDisponible(2, fecha, hora);
    filasCancha2 += `<tr><td>${hora}:00</td><td class="${libre2 ? 'libre' : 'ocupado'}">${libre2 ? 'Libre' : 'Ocupado'}</td><td>${formatColones(precio)}</td></tr>`;
  }

  const contenido = `
<h2>Disponibilidad - ${fecha}</h2>
<form method="get" action="/">
  <label>Fecha: <input type="date" name="fecha" value="${fecha}"></label>
  <button type="submit">Ver</button>
</form>

<h3>Cancha 1</h3>
<table><tr><th>Hora</th><th>Estado</th><th>Tarifa</th></tr>${filasCancha1}</table>

<h3>Cancha 2</h3>
<table><tr><th>Hora</th><th>Estado</th><th>Tarifa</th></tr>${filasCancha2}</table>

<h2>Nueva reserva</h2>
<form class="reserva" method="post" action="/reservas">
  <input type="hidden" name="fecha" value="${fecha}">
  <label>Cancha:
    <select name="cancha">
      <option value="1">Cancha 1</option>
      <option value="2">Cancha 2</option>
    </select>
  </label>
  <label>Hora de inicio:
    <select name="hora" id="hora">
      ${Array.from({ length: 14 }, (_, i) => 8 + i).map(h => `<option value="${h}">${h}:00</option>`).join('')}
    </select>
  </label>
  <label>Precio estimado: <span id="precioEstimado">-</span></label>
  <label>Nombre del cliente: <input type="text" name="cliente"></label>
  <label>Teléfono: <input type="text" name="telefono" id="telefono"></label>
  <button type="submit">Reservar</button>
</form>

<p><a href="/dia/${fecha}">Ver lista de reservas del ${fecha}</a></p>

<script>
  function actualizarPrecio() {
    var hora = document.getElementById('hora').value;
    var telefono = document.getElementById('telefono').value;
    fetch('/api/cotizar?fecha=${fecha}&hora=' + hora + '&telefono=' + encodeURIComponent(telefono))
      .then(function (r) { return r.json(); })
      .then(function (d) { document.getElementById('precioEstimado').textContent = d.precioFormateado; });
  }
  document.getElementById('hora').addEventListener('change', actualizarPrecio);
  document.getElementById('telefono').addEventListener('input', actualizarPrecio);
  actualizarPrecio();
</script>
`;

  res.send(layout('Inicio', contenido));
}));

// GET /disponibilidad/cancha1 y /disponibilidad/cancha2 -------------------
app.get('/disponibilidad/cancha1', conBase(async (req, res) => {
  const fecha = req.query.fecha || hoyISO();
  let filas = '';
  for (let hora = 8; hora <= 21; hora++) {
    const libre = await checkDisponible(1, fecha, hora);
    filas += `<tr><td>${hora}:00</td><td class="${libre ? 'libre' : 'ocupado'}">${libre ? 'Libre' : 'Ocupado'}</td></tr>`;
  }
  const contenido = `
<h2>Disponibilidad Cancha 1 - ${fecha}</h2>
<form method="get" action="/disponibilidad/cancha1">
  <label>Fecha: <input type="date" name="fecha" value="${fecha}"></label>
  <button type="submit">Ver</button>
</form>
<table><tr><th>Hora</th><th>Estado</th></tr>${filas}</table>
`;
  res.send(layout('Cancha 1', contenido));
}));

app.get('/disponibilidad/cancha2', conBase(async (req, res) => {
  const fecha = req.query.fecha || hoyISO();
  let filas = '';
  for (let hora = 8; hora <= 21; hora++) {
    const libre = await checkDisponible(2, fecha, hora);
    filas += `<tr><td>${hora}:00</td><td class="${libre ? 'libre' : 'ocupado'}">${libre ? 'Libre' : 'Ocupado'}</td></tr>`;
  }
  const contenido = `
<h2>Disponibilidad Cancha 2 - ${fecha}</h2>
<form method="get" action="/disponibilidad/cancha2">
  <label>Fecha: <input type="date" name="fecha" value="${fecha}"></label>
  <button type="submit">Ver</button>
</form>
<table><tr><th>Hora</th><th>Estado</th></tr>${filas}</table>
`;
  res.send(layout('Cancha 2', contenido));
}));

// POST /reservas ------------------------------------------------------------
app.post('/reservas', conBase(async (req, res) => {
  // Paso 1: leer y normalizar lo que mandó el formulario.
  const canchaTexto = req.body.cancha;
  const fecha = req.body.fecha;
  const horaTexto = req.body.hora;
  const clienteTexto = req.body.cliente;
  const telefono = req.body.telefono;

  const cancha = Number(canchaTexto);
  const hora = Number(horaTexto);
  const cliente = (clienteTexto || '').trim();

  // Paso 2: validar cada campo.
  const errores = [];

  if (canchaTexto === undefined || canchaTexto === '') {
    errores.push('Falta indicar la cancha.');
  } else if (cancha !== 1 && cancha !== 2) {
    errores.push('La cancha debe ser 1 o 2.');
  }

  if (!fecha) {
    errores.push('Falta la fecha.');
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    errores.push('El formato de la fecha es inválido.');
  }

  if (horaTexto === undefined || horaTexto === '') {
    errores.push('Falta la hora de inicio.');
  } else if (!Number.isInteger(hora) || hora < 8 || hora > 21) {
    errores.push('La hora debe ser un bloque entre las 08:00 y las 21:00.');
  }

  if (!cliente) {
    errores.push('Falta el nombre del cliente.');
  }

  // El teléfono es obligatorio y son exactamente 8 dígitos: es la forma de ubicar al cliente y de
  // reconocerlo como frecuente. Antes no se revisaba nada, así que entraba vacío, con letras, con
  // 3 dígitos o con 20 (hallazgos H-03 y H-04).
  if (!telefono) {
    errores.push('Falta el teléfono.');
  } else if (!telefonoEsValido(telefono)) {
    errores.push('El teléfono tiene que ser de 8 dígitos, sin espacios ni guiones.');
  }

  if (errores.length > 0) {
    const listaErrores = errores.map(e => `<li>${e}</li>`).join('');
    const contenidoError = `<div class="error"><p>No se pudo crear la reserva:</p><ul>${listaErrores}</ul></div><p><a href="/">Volver</a></p>`;
    return res.send(layout('Error', contenidoError));
  }

  // Paso 3: verificar que el bloque siga libre.
  const disponible = await checkDisponible(cancha, fecha, hora);
  if (!disponible) {
    const contenidoOcupado = `<div class="error">Ese bloque ya está ocupado para la cancha ${cancha} el ${fecha} a las ${hora}:00.</div><p><a href="/">Volver</a></p>`;
    return res.send(layout('Error', contenidoOcupado));
  }

  // Paso 4: calcular el precio, que es la tarifa del bloque con el descuento si aplica.
  const { precio, aplicaDescuento } = await precioDeLaReserva({ hora, fecha, telefono });

  // Paso 6: guardar la reserva.
  const id = await crearReserva({ cancha, fecha, hora, cliente, telefono, precio });

  // Paso 7: armar la página de confirmación.
  const notaDescuento = aplicaDescuento ? ' (con 10% de descuento por cliente frecuente)' : '';
  const contenido = `
<div class="ok">
  <p>Reserva #${id} creada.</p>
  <p>Cancha ${cancha}, ${fecha} a las ${hora}:00, cliente ${cliente}.</p>
  <p>Precio: ${formatColones(precio)}${notaDescuento}</p>
</div>
<p><a href="/dia/${fecha}">Ver lista del día</a> | <a href="/">Volver</a></p>
`;
  res.send(layout('Reserva creada', contenido));
}));

// POST /reservas/:id/cancelar ------------------------------------------------
app.post('/reservas/:id/cancelar', conBase(async (req, res) => {
  const id = Number(req.params.id);
  const reserva = await baseDeDatos.buscarPorNumero(id);

  if (!reserva) {
    return res.send(layout('Error', `<div class="error">No existe la reserva #${id}.</div>`));
  }
  if (reserva.estado === 'cancelada') {
    return res.send(layout('Error', `<div class="error">La reserva #${id} ya estaba cancelada.</div><p><a href="/dia/${reserva.fecha}">Volver</a></p>`));
  }

  // Regla de las 24 horas: se puede cancelar hasta 24 horas antes de la HORA de inicio del
  // partido, no del día. Si faltan exactamente 24 horas, todavía alcanza.
  //
  // Antes esto comparaba solo fechas, y con eso alcanzaba que el partido fuera de un día
  // posterior a hoy. Dejaba pasar el caso que la administradora describió: partido mañana a las
  // 8:00, ya son las 23:00 de hoy, faltan 9 horas, y se cancelaba igual.
  const VEINTICUATRO_HORAS_EN_MILISEGUNDOS = 24 * 60 * 60 * 1000;
  const horaDeInicio = String(reserva.hora).padStart(2, '0');
  const inicioDelPartido = new Date(`${reserva.fecha}T${horaDeInicio}:00:00`);
  const loQueFalta = inicioDelPartido.getTime() - ahora().getTime();

  if (loQueFalta >= VEINTICUATRO_HORAS_EN_MILISEGUNDOS) {
    await baseDeDatos.cancelarPorNumero(id);
    return res.send(layout('Cancelada', `<div class="ok">Reserva #${id} cancelada.</div><p><a href="/dia/${reserva.fecha}">Volver</a></p>`));
  } else {
    return res.send(layout('Error', `<div class="error">La reserva #${id} no se puede cancelar: falta menos de 24 horas para el inicio del partido.</div><p><a href="/dia/${reserva.fecha}">Volver</a></p>`));
  }
}));

// GET /dia/:fecha -------------------------------------------------------------
app.get('/dia/:fecha', conBase(async (req, res) => {
  const fecha = req.params.fecha;
  const reservas = await getReservasDelDia(fecha);

  const filas = reservas.map(r => {
    const claseFila = r.estado === 'cancelada' ? 'cancelada' : '';
    const botonCancelar = r.estado === 'activa'
      ? `<form method="post" action="/reservas/${r.id}/cancelar" style="display:inline"><button type="submit">Cancelar</button></form>`
      : '-';
    return `<tr class="${claseFila}"><td>${r.hora}:00</td><td>Cancha ${r.cancha}</td><td>${r.cliente}</td><td>${r.telefono || ''}</td><td>${formatColones(r.precio)}</td><td>${r.estado}</td><td>${botonCancelar}</td></tr>`;
  }).join('');

  const contenido = `
<h2>Reservas del ${fecha}</h2>
<table>
  <tr><th>Hora</th><th>Cancha</th><th>Cliente</th><th>Teléfono</th><th>Precio</th><th>Estado</th><th></th></tr>
  ${filas || '<tr><td colspan="7">No hay reservas para esta fecha.</td></tr>'}
</table>
<p><a href="/?fecha=${fecha}">Volver a disponibilidad</a></p>
`;
  res.send(layout('Reservas del día', contenido));
}));

// GET /api/cotizar --------------------------------------------------------
// Precio previo de un bloque, usado por el formulario de la página de inicio.
app.get('/api/cotizar', conBase(async (req, res) => {
  const hora = Number(req.query.hora);
  const fecha = req.query.fecha;
  const telefono = req.query.telefono;

  // Sin el teléfono completo no hay manera de saber si el cliente es frecuente, así que se muestra
  // la tarifa del bloque y se dice que falta el teléfono para saber el total. Antes se mostraba el
  // número pelado, que podía no ser el que se cobraba, y no se avisaba (hallazgo H-09).
  if (!telefonoEsValido(telefono)) {
    const tarifa = tarifaDelBloque(hora);
    return res.json({
      precio: tarifa,
      precioFormateado: `${formatColones(tarifa)} (escribí el teléfono para saber si aplica descuento)`,
    });
  }

  // Con el teléfono completo se cotiza lo mismo que se va a cobrar, y se explica por qué.
  // Antes esta cotización miraba solo el horario: mostraba ₡15.000 y se cobraba ₡13.500 (H-08).
  const { precio, aplicaDescuento } = await precioDeLaReserva({ hora, fecha, telefono });
  const explicacion = aplicaDescuento ? ' (con 10% de descuento por cliente frecuente)' : '';

  res.json({ precio, precioFormateado: formatColones(precio) + explicacion });
}));

// Arrancar por cuenta propia, o dejarse usar por quien nos llame.
//
// En la computadora, `npm start` corre este archivo directo: ahí sí hay que quedarse escuchando en
// el puerto 3000, igual que siempre. Las 48 pruebas hacen lo mismo, lanzan `node server.js`, así
// que para ellas nada cambia.
//
// En Vercel no hay ningún servidor prendido: por cada visita se despierta una función, se corre y
// se apaga. Esa función no quiere que nos pongamos a escuchar un puerto, quiere que le entreguemos
// la aplicación para llamarla ella. Por eso el `listen` queda dentro de la pregunta «¿me
// ejecutaron a mí directamente?» (`require.main === module`) y la aplicación se exporta al final:
// `api/index.js` la toma de ahí.
const PUERTO = 3000;

if (require.main === module) {
  app.listen(PUERTO, () => {
    console.log(`Cancha Total F5 escuchando en el puerto ${PUERTO}`);
  });
}

module.exports = app;
