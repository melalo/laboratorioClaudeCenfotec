// Las pantallas. Son HTML simple armado con texto, servido por el mismo servidor,
// sin herramientas de compilacion (DISENO.md, "Otras decisiones").

import { enColones } from './precios.js';
import { fechaLegible, partesDelDia } from './semana.js';

// Todo lo que viene de afuera (nombres de peliculas, usuarios) pasa por aca antes de
// entrar al HTML, para que un nombre con simbolos no pueda romper ni alterar la pagina.
export function escapar(texto) {
  return String(texto ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

const ETIQUETA_ROL = { administracion: 'administración', taquilla: 'taquilla' };

function conMayuscula(texto) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function pagina({ titulo, contenido, cuenta = null }) {
  // El encabezado es del cliente: solo muestra algo cuando hay personal adentro, para que
  // sepa con qué cuenta está trabajando. El acceso del personal vive en el pie.
  const sesion = cuenta
    ? `<li><small>${escapar(cuenta.usuario)} · ${escapar(ETIQUETA_ROL[cuenta.rol])}</small></li>
       <li><form method="post" action="/personal/salir"><button class="secondary outline">Salir</button></form></li>`
    : '';

  const acceso = cuenta
    ? `<a href="/personal">Panel del personal</a>`
    : `<a href="/personal/ingresar">Acceso del personal</a>`;

  return `<!DOCTYPE html>
<html lang="es" data-theme="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapar(titulo)} — Cine Variedades</title>
  <link rel="stylesheet" href="/css/pico.min.css">
  <link rel="stylesheet" href="/css/cine.css">
</head>
<body>
  <header class="container">
    <nav>
      <ul><li><a href="/" class="marca">
        <img class="logo" src="/images/logo.webp" alt="" width="96" height="62">
        <strong>Cine Variedades</strong>
      </a></li></ul>
      <ul>${sesion}</ul>
    </nav>
  </header>
  <main class="container">
    <h2>${escapar(titulo)}</h2>
    ${contenido}
  </main>
  <footer class="container pie">
    <div class="pie-columnas">
      <div>
        <p class="pie-marca">Cine Variedades</p>
        <p>Cine independiente de dos salas, desde 1978.</p>
      </div>
      <div>
        <p>Avenida Central, contiguo a la antigua estación</p>
        <p>Teléfono 2000-0000 · Todos los días de 14:00 a 23:00</p>
      </div>
      <div class="pie-acceso">${acceso}</div>
    </div>
  </footer>
</body>
</html>
`;
}

function avisos(errores) {
  if (!errores || errores.length === 0) return '';
  return `<article class="aviso-error">${errores.map((e) => `<p>${escapar(e)}</p>`).join('')}</article>`;
}

// --- Cliente ---------------------------------------------------------------

// El afiche es opcional (RF-12). Si la pelicula no tiene uno cargado, en su lugar va un
// bloque con el titulo, para que la tarjeta quede pareja con las demas (DISENO.md).
function dibujarAfiche(pelicula) {
  return pelicula.afiche
    ? `<img class="afiche" src="/afiches/${escapar(pelicula.afiche)}" alt="Afiche de ${escapar(pelicula.nombre)}">`
    : `<div class="afiche afiche-vacio"><span>${escapar(pelicula.nombre)}</span></div>`;
}

// '2026-08-19 20:00' -> 'miércoles 19 de agosto' (sin la hora)
function soloElDia(dia) {
  return fechaLegible(`${dia} 00:00`).replace(', 00:00', '');
}

export function carteleraCliente({ salas, dias, diaElegido, semana }) {
  const encabezado = `<p class="semana">Semana del ${escapar(soloElDia(semana.inicio))}
    al ${escapar(soloElDia(semana.fin))}.</p>`;

  // Los siete dias en fila, cada uno un enlace: se ve la semana entera de un vistazo y
  // se elige en un clic, sin nada de JavaScript. El dia viaja en la direccion de la
  // pagina, asi que la cartelera de un dia se puede compartir por enlace (DISENO.md).
  const filaDeDias = `
    <nav class="dias-semana" aria-label="Días de la semana">
      ${dias
        .map(({ dia, disponible }) => {
          const { corto, numero } = partesDelDia(dia);
          const adentro = `<span class="dia-corto">${escapar(corto)}</span><span class="dia-numero">${numero}</span>`;
          if (!disponible) {
            return `<span class="dia-chip apagado" title="Ya no quedan funciones este día">${adentro}</span>`;
          }
          const marcado = dia === diaElegido ? ' elegido' : '';
          const actual = dia === diaElegido ? ' aria-current="page"' : '';
          return `<a class="dia-chip${marcado}" href="/?dia=${escapar(dia)}"${actual}>${adentro}</a>`;
        })
        .join('')}
    </nav>`;

  if (!diaElegido) {
    return pagina({
      titulo: 'Cartelera',
      contenido: `${encabezado}${filaDeDias}<p>Por ahora no hay funciones disponibles en esta semana.</p>`,
    });
  }

  const tarjetas = salas
    .map(
      (sala) => `
    <article class="sala">
      <p class="sala-encabezado">
        <span class="nombre-sala">${escapar(sala.nombre)}</span>
        <span class="capacidad-sala">${sala.capacidad} asientos</span>
      </p>
      ${sala.peliculas
        .map(
          (pelicula) => `
      <div class="en-cartel">
        ${dibujarAfiche(pelicula)}
        <div class="datos-pelicula">
          <h3>${escapar(pelicula.nombre)}</h3>
          ${pelicula.formatos
            .map(
              (grupo) => `
          <div class="grupo-formato">
            <span class="pastilla ${escapar(grupo.formato)}">${escapar(conMayuscula(grupo.formato))}</span>
            <div class="horarios">${grupo.funciones
              .map(
                (f) =>
                  `<a class="horario" href="/funciones/${f.id}/asientos"><span class="hora">${escapar(f.fecha_hora.slice(11))}</span></a>`,
              )
              .join('')}</div>
          </div>`,
            )
            .join('')}
        </div>
      </div>`,
        )
        .join('')}
    </article>`,
    )
    .join('');

  return pagina({ titulo: 'Cartelera', contenido: `${encabezado}${filaDeDias}${tarjetas}` });
}

// Un asiento libre es una casilla de verificacion disfrazada de butaca: al marcarla, el
// propio navegador la pinta de amarillo con CSS, sin pedirle nada al servidor (DISENO.md,
// "Otras decisiones"). Uno no disponible no es casilla, asi que no se puede marcar.
function dibujarAsiento({ numero, codigo, estado }, fila) {
  const butaca = `<span class="asiento ${estado}" data-asiento="${escapar(codigo)}" title="Fila ${escapar(fila)}, asiento ${numero}">${numero}</span>`;
  if (estado === 'ocupado') return butaca;

  // 'eligiendo' es un asiento que este cliente ya tiene reservado: llega marcado, para
  // que volver a reservar no le quite lo que ya tomo.
  const marcada = estado === 'eligiendo' ? ' checked' : '';
  return `<label class="butaca"><input type="checkbox" name="asientos" value="${escapar(codigo)}"${marcada}>${butaca}</label>`;
}

export function mapaDeAsientos({ funcion, filas, errores = [] }) {
  const dibujo = filas
    .map(
      ({ fila, asientos }) => `
      <div class="fila-asientos">
        <span class="etiqueta-fila">${escapar(fila)}</span>
        ${asientos.map((asiento) => dibujarAsiento(asiento, fila)).join('')}
      </div>`,
    )
    .join('');

  const contenido = `
    <p class="ficha-funcion">
      <strong>${escapar(funcion.sala)}</strong> ·
      ${escapar(fechaLegible(funcion.fecha_hora))} ·
      ${escapar(conMayuscula(funcion.formato))} ·
      ${funcion.capacidad} asientos
    </p>
    ${avisos(errores)}
    <form method="post" action="/funciones/${funcion.id}/reservar">
      <div class="marco-mapa">
        <p class="pantalla-sala">P A N T A L L A</p>
        <div class="mapa">${dibujo}</div>
      </div>
      <p class="leyenda">
        <span><span class="asiento-muestra disponible"></span>Disponible</span>
        <span><span class="asiento-muestra eligiendo"></span>Los estás eligiendo</span>
        <span><span class="asiento-muestra ocupado"></span>No disponible</span>
      </p>
      <button type="submit">Reservar los asientos marcados</button>
    </form>
    <p><a href="/">← Volver a la cartelera</a></p>
  `;

  return pagina({ titulo: funcion.pelicula, contenido });
}

// Como se llama en pantalla cada uno de los tres descuentos posibles (RN-2, RN-3).
const ETIQUETA_DESCUENTO = {
  ninguno: 'Precio normal',
  miercoles: 'Miércoles, mitad de precio',
  estudiante: 'Estudiante, 30% menos',
};

// Un botón − o + del contador. Es un botón de envío de verdad, con su propia dirección:
// sin JavaScript recarga la pantalla con el reparto nuevo, y con JavaScript el clic se
// ataja antes de que eso pase (DISENO.md, "Si las pantallas pueden usar JavaScript").
function botonDelContador({ compraId, ajuste, signo, etiqueta }) {
  return `<button type="submit" class="paso" formaction="/reservas/${compraId}/ajustar"
      name="ajuste" value="${ajuste}" data-ajuste="${ajuste}"
      aria-label="${escapar(etiqueta)}">${signo}</button>`;
}

// La tabla de tipos de boleto: una fila por tipo, con su precio, su cantidad y su
// subtotal, y el total abajo. Las dos cantidades siempre suman los asientos reservados,
// porque esos ya se eligieron en el mapa: la tabla los **reparte**, no los agrega
// (DISENO.md, "Cómo se muestra y se elige el reparto...").
function tablaDeBoletos({ compraId, tabla }) {
  const regulares = tabla.asientos - tabla.estudiantes;

  const encabezado = `<thead>
        <tr><th>Tipo</th><th>Precio</th><th>Cantidad</th><th>Subtotal</th></tr>
      </thead>`;

  const pie = (leyenda, total) => `<tfoot>
        <tr>
          <td colspan="2" class="reparto">${escapar(leyenda)}</td>
          <td class="rotulo-total">Total</td>
          <td class="monto total" data-total>${escapar(enColones(total))}</td>
        </tr>
      </tfoot>`;

  // Cuando declarar estudiantes no cambiaría ningún precio —los miércoles, porque el 50%
  // le gana al 30% en todos los boletos (RN-4)— no hay nada que repartir: la tabla queda
  // con una sola fila y sin contador, para no invitar a elegir algo que no cambia nada
  // (DISENO.md, "Qué muestra la tabla cuando declarar estudiantes no cambiaría el precio").
  if (!hayQueRepartir(tabla)) {
    const precio = tabla.regular.precio;
    const nombre = tabla.regular.descuento === 'miercoles' ? 'Entrada · miércoles' : 'Entrada';
    return `
    <table class="tabla-boletos">
      ${encabezado}
      <tbody>
        <tr>
          <th scope="row">${escapar(nombre)}</th>
          <td class="precio">${escapar(enColones(precio))}</td>
          <td class="cantidad"><span class="numero">${tabla.asientos}</span></td>
          <td class="monto">${escapar(enColones(tabla.asientos * precio))}</td>
        </tr>
      </tbody>
      ${pie(`${tabla.asientos} ${tabla.asientos === 1 ? 'asiento' : 'asientos'}`, tabla.asientos * precio)}
    </table>
    <input type="hidden" name="estudiantes" value="0">`;
  }

  const fila = ({ tipo, nombre, precio, cantidad, campo }) => `
      <tr>
        <th scope="row">${escapar(nombre)}</th>
        <td class="precio">${escapar(enColones(precio))}</td>
        <td class="cantidad">
          ${botonDelContador({ compraId, ajuste: tipo === 'estudiante' ? -1 : 1, signo: '−', etiqueta: `Un ${nombre} menos` })}
          ${campo}
          ${botonDelContador({ compraId, ajuste: tipo === 'estudiante' ? 1 : -1, signo: '+', etiqueta: `Un ${nombre} más` })}
        </td>
        <td class="monto" data-subtotal="${tipo}">${escapar(enColones(cantidad * precio))}</td>
      </tr>`;

  // La cantidad de estudiantes es el único número que viaja al servidor; la de regulares
  // sale de restarla, así que se muestra como texto y no como campo.
  const campoEstudiantes = `<input type="number" name="estudiantes" class="numero"
      value="${tabla.estudiantes}" min="0" max="${tabla.asientos}" step="1"
      inputmode="numeric" aria-label="Cuántos boletos de estudiante">`;
  const numeroRegulares = `<span class="numero" data-numero="regular">${regulares}</span>`;

  return `
    <table class="tabla-boletos" data-tabla-boletos
           data-asientos="${tabla.asientos}"
           data-precio-regular="${tabla.regular.precio}"
           data-precio-estudiante="${tabla.estudiante.precio}">
      ${encabezado}
      <tbody>
        ${fila({ tipo: 'regular', nombre: 'Entrada regular', precio: tabla.regular.precio, cantidad: regulares, campo: numeroRegulares })}
        ${fila({ tipo: 'estudiante', nombre: 'Estudiante', precio: tabla.estudiante.precio, cantidad: tabla.estudiantes, campo: campoEstudiantes })}
      </tbody>
      ${pie(
        `${tabla.asientos} de ${tabla.asientos} asientos repartidos`,
        regulares * tabla.regular.precio + tabla.estudiantes * tabla.estudiante.precio,
      )}
    </table>`;
}

// ¿Tiene sentido preguntar cuántos boletos son de estudiante? Solo si ese descuento
// cambiaría algún precio. La pregunta se hace así, y no "¿es miércoles?", para que la
// pantalla siga siendo correcta si alguna vez se ajustan los porcentajes en config.json.
function hayQueRepartir(tabla) {
  return tabla.estudiante.precio < tabla.regular.precio;
}

// El contador, del lado del navegador. La pantalla funciona igual sin esto —cada botón
// es un envío que el servidor recalcula—: lo único que agrega es evitar la recarga.
// Ningún precio se decide acá: el servidor los vuelve a calcular al cobrar.
const GUION_DEL_CONTADOR = `
<script>
(function () {
  var tabla = document.querySelector('[data-tabla-boletos]');
  if (!tabla) return;
  var campo = tabla.querySelector('[name="estudiantes"]');
  var asientos = Number(tabla.dataset.asientos);
  var precios = {
    regular: Number(tabla.dataset.precioRegular),
    estudiante: Number(tabla.dataset.precioEstudiante)
  };

  function enColones(monto) {
    return '₡' + String(monto).replace(/\\B(?=(\\d{3})+$)/g, '.');
  }

  function dibujar() {
    var estudiantes = Math.min(asientos, Math.max(0, Number(campo.value) || 0));
    campo.value = estudiantes;
    var cantidades = { estudiante: estudiantes, regular: asientos - estudiantes };
    var total = 0;
    ['regular', 'estudiante'].forEach(function (tipo) {
      var subtotal = cantidades[tipo] * precios[tipo];
      total += subtotal;
      var numero = tabla.querySelector('[data-numero="' + tipo + '"]');
      if (numero) numero.textContent = cantidades[tipo];
      tabla.querySelector('[data-subtotal="' + tipo + '"]').textContent = enColones(subtotal);
    });
    // El total aparece dos veces: al pie de la tabla y dentro del boton de pagar.
    Array.prototype.forEach.call(document.querySelectorAll('[data-total]'), function (donde) {
      donde.textContent = enColones(total);
    });

    // Se apaga el boton que se pasaria del limite, en vez de dejar que no haga nada.
    Array.prototype.forEach.call(tabla.querySelectorAll('[data-ajuste]'), function (boton) {
      var destino = estudiantes + Number(boton.dataset.ajuste);
      boton.disabled = destino < 0 || destino > asientos;
    });
  }

  tabla.addEventListener('click', function (evento) {
    var boton = evento.target.closest('[data-ajuste]');
    if (!boton) return;
    evento.preventDefault(); // sin esto, el boton enviaria el formulario y recargaria
    campo.value = (Number(campo.value) || 0) + Number(boton.dataset.ajuste);
    dibujar();
  });
  tabla.addEventListener('input', dibujar);
  dibujar();
})();
</script>`;

// La pantalla de la reserva: la película, los asientos, cuánto queda de plazo, y el
// formulario del pago (DISENO.md, "Qué ve el cliente inmediatamente después de reservar").
export function pantallaReserva({ reserva, minutosDePlazo, tabla = null, errores = [], formulario = {} }) {
  const volverAlMapa = `<p><a href="/funciones/${reserva.funcion_id}/asientos">← Volver al mapa de asientos</a></p>`;

  if (!reserva.vigente) {
    return pagina({
      titulo: 'La reserva venció',
      contenido: `<article class="aviso-error">
          <p>Esta reserva venció: pasaron más de ${minutosDePlazo} minutos sin completar el pago,
             así que los asientos volvieron a quedar disponibles para cualquiera.</p>
        </article>
        ${volverAlMapa}`,
    });
  }

  // La barra se vacia sola, con una animacion de CSS: sin nada de JavaScript. Arranca
  // en la parte que corresponda —si ya pasaron 40 de los 180 segundos, arranca ahi—
  // usando una espera negativa, que es como se le pide a CSS que empiece a mitad de
  // camino (DISENO.md, "Otras decisiones").
  const plazoEnSegundos = minutosDePlazo * 60;
  const transcurridos = Math.max(0, plazoEnSegundos - reserva.segundos_restantes);
  const barra = `<div class="barra-plazo" role="img"
      aria-label="Quedan menos de ${minutosDePlazo} minutos para completar el pago">
      <span style="animation-duration: ${plazoEnSegundos}s; animation-delay: -${transcurridos}s"></span>
    </div>`;

  // Cuando no hay nada que repartir hay que decir por qué, o la fila única parece un
  // error. El caso real es el miércoles: la mitad de precio le gana al 30% (RN-4).
  const explicacion = !hayQueRepartir(tabla)
    ? `<p class="nota-descuento">Miércoles: todos los boletos pagan la mitad del boleto regular.</p>`
    : `<p class="nota-descuento">Carné de estudiante se debe presentar a la entrada.</p>`;

  const totalActual =
    (tabla.asientos - tabla.estudiantes) * tabla.regular.precio + tabla.estudiantes * tabla.estudiante.precio;

  const contenido = `
    <article class="ficha-reserva">
      <h3>${escapar(reserva.pelicula)}</h3>
      <p class="ficha-funcion">
        <strong>${escapar(reserva.sala)}</strong> ·
        ${escapar(fechaLegible(reserva.fecha_hora))} ·
        ${escapar(conMayuscula(reserva.formato))}
      </p>
      <p class="asientos-reservados">
        ${reserva.asientos.map((a) => `<span class="pastilla-asiento">${escapar(a)}</span>`).join('')}
      </p>
      <p>Guardados hasta las <strong>${escapar(reserva.vence.slice(11, 16))}</strong>.
         Si no se paga antes, vuelven a quedar libres.</p>
      ${barra}
    </article>

    ${avisos(errores)}

    <form method="post" action="/reservas/${reserva.id}/pagar" class="formulario-pago">
      ${tablaDeBoletos({ compraId: reserva.id, tabla })}
      ${explicacion}

      <label>Nombre completo
        <input name="nombre" value="${escapar(formulario.nombre ?? '')}" maxlength="120"
               autocomplete="name" required>
      </label>
      <label>Número de identificación
        <input name="identificacion" value="${escapar(formulario.identificacion ?? '')}" maxlength="40"
               required>
        <small>Cédula, pasaporte o el documento que traigas. Sirve para recuperar tu compra
           en taquilla si perdés el código.</small>
      </label>

      <button type="submit">Pagar <span data-total>${escapar(enColones(totalActual))}</span></button>
    </form>
    ${volverAlMapa}
    ${hayQueRepartir(tabla) ? GUION_DEL_CONTADOR : ''}
  `;

  return pagina({ titulo: 'Reserva tomada', contenido });
}

// La compra ya pagada: el código de confirmación (RF-10). Es la única copia que el
// cliente tiene, porque no hay boleto impreso, así que esta pantalla se puede volver a
// abrir cuantas veces quiera. Una compra pagada es final (RN-13): acá no hay forma de
// deshacerla.
export function pantallaCompraConfirmada({ compra, renglones }) {
  const cuentas = renglones
    .map(
      (r) => `<tr>
          <td>${escapar(ETIQUETA_DESCUENTO[r.descuento] ?? r.descuento)}</td>
          <td class="cuantos">${r.cuantos} × ${escapar(enColones(r.precio))}</td>
          <td class="monto">${escapar(enColones(r.cuantos * r.precio))}</td>
        </tr>`,
    )
    .join('');

  const contenido = `
    <article class="ficha-reserva ficha-codigo">
      <p class="rotulo-codigo">Tu código de confirmación</p>
      <p class="codigo-confirmacion">${escapar(compra.codigo)}</p>
      <p><small>Mostralo al entrar a la sala. No hay boleto impreso: esta pantalla es tu
         comprobante.</small></p>
    </article>

    <article class="ficha-reserva">
      <h3>${escapar(compra.pelicula)}</h3>
      <p class="ficha-funcion">
        <strong>${escapar(compra.sala)}</strong> ·
        ${escapar(fechaLegible(compra.fecha_hora))} ·
        ${escapar(conMayuscula(compra.formato))}
      </p>
      <p class="asientos-reservados">
        ${compra.asientos.map((a) => `<span class="pastilla-asiento comprado">${escapar(a)}</span>`).join('')}
      </p>

      <table class="cuentas-compra">
        <tbody>
          ${cuentas}
          <tr class="renglon-total">
            <td>Total pagado</td>
            <td class="cuantos">${compra.asientos.length} ${compra.asientos.length === 1 ? 'boleto' : 'boletos'}</td>
            <td class="monto">${escapar(enColones(compra.total))}</td>
          </tr>
        </tbody>
      </table>

      <p class="datos-del-cliente">
        A nombre de <strong>${escapar(compra.nombre)}</strong>,
        identificación <span class="dato">${escapar(compra.identificacion)}</span>.
      </p>
    </article>

    <p><small>Si perdés este código, en la taquilla del cine lo recuperan con tu
       identificación.</small></p>
    <p><a href="/">← Volver a la cartelera</a></p>
  `;

  return pagina({ titulo: 'Compra confirmada', contenido });
}

// --- Personal --------------------------------------------------------------

export function pantallaIngreso({ errores = [], usuario = '' } = {}) {
  const contenido = `
    ${avisos(errores)}
    <form method="post" action="/personal/ingresar">
      <label>Nombre de usuario
        <input name="usuario" value="${escapar(usuario)}" autocomplete="username" required>
      </label>
      <label>Contraseña
        <input name="contrasena" type="password" autocomplete="current-password" required>
      </label>
      <button type="submit">Entrar</button>
    </form>
    <p><small>Solo el personal del cine necesita cuenta. El cliente compra sin cuenta.</small></p>
  `;
  return pagina({ titulo: 'Ingreso del personal', contenido });
}

export function panelPersonal({ cuenta }) {
  const deAdministracion =
    cuenta.rol === 'administracion'
      ? `<li><a href="/personal/cartelera" role="button">Cargar la cartelera de la semana</a></li>`
      : `<li><small>La cartelera la carga la cuenta de administración.</small></li>`;

  const contenido = `
    <p>Entraste como <strong>${escapar(cuenta.usuario)}</strong>, con rol de
       <strong>${escapar(ETIQUETA_ROL[cuenta.rol])}</strong>.</p>
    <ul class="acciones">${deAdministracion}</ul>
  `;
  return pagina({ titulo: 'Panel del personal', contenido, cuenta });
}

export function pantallaCarteleraAdmin({ cuenta, salas, funciones, semana, errores = [], formulario = {} }) {
  const opcionesDeSala = salas
    .map(
      (s) =>
        `<option value="${s.id}"${String(formulario.sala_id) === String(s.id) ? ' selected' : ''}>${escapar(s.nombre)} (${s.capacidad} asientos)</option>`,
    )
    .join('');

  const listado =
    funciones.length === 0
      ? '<p>Todavía no hay ninguna función cargada.</p>'
      : `<table>
          <thead><tr><th>Película</th><th>Sala</th><th>Cuándo</th><th>Formato</th></tr></thead>
          <tbody>${funciones
            .map(
              (f) => `<tr${f.fuera_de_semana ? ' class="fuera-de-semana"' : ''}>
                  <td>${escapar(f.pelicula)}</td>
                  <td>${escapar(f.sala)}</td>
                  <td>${escapar(fechaLegible(f.fecha_hora))}${f.fuera_de_semana ? ' <small>(fuera de la semana vigente)</small>' : ''}</td>
                  <td>${escapar(conMayuscula(f.formato))}</td>
                </tr>`,
            )
            .join('')}</tbody>
        </table>`;

  const contenido = `
    <p class="semana">Semana vigente: del ${escapar(semana.inicio)} al ${escapar(semana.fin)} (jueves a miércoles).</p>
    ${avisos(errores)}
    <form method="post" action="/personal/cartelera" enctype="multipart/form-data">
      <label>Película
        <input name="pelicula" value="${escapar(formulario.pelicula ?? '')}" placeholder="Nombre de la película" required>
      </label>
      <label>Afiche <small>(opcional, hasta 2 MB)</small>
        <input name="afiche" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml">
        <small>Si la película ya tenía afiche, el que subas ahora lo reemplaza.</small>
      </label>
      <div class="grid">
        <label>Sala<select name="sala_id" required>${opcionesDeSala}</select></label>
        <label>Fecha<input name="fecha" type="date" value="${escapar(formulario.fecha ?? '')}" min="${escapar(semana.inicio)}" required></label>
        <label>Hora<input name="hora" type="time" value="${escapar(formulario.hora ?? '')}" required></label>
        <label>Formato
          <select name="formato" required>
            <option value="doblada"${formulario.formato === 'doblada' ? ' selected' : ''}>Doblada</option>
            <option value="subtitulada"${formulario.formato === 'subtitulada' ? ' selected' : ''}>Subtitulada</option>
          </select>
        </label>
      </div>
      <button type="submit">Agregar función</button>
    </form>
    <h3>Funciones cargadas</h3>
    ${listado}
  `;

  return pagina({ titulo: 'Cartelera de la semana', contenido, cuenta });
}

// --- Avisos ----------------------------------------------------------------

export function pantallaAviso({ titulo, mensaje, cuenta = null }) {
  return pagina({
    titulo,
    cuenta,
    contenido: `<article class="aviso-error"><p>${escapar(mensaje)}</p></article>
                <p><a href="/">← Volver a la cartelera</a></p>`,
  });
}
