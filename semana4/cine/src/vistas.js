// Las pantallas. Son HTML simple armado con texto, servido por el mismo servidor,
// sin herramientas de compilacion (DISENO.md, "Otras decisiones").

import { fechaLegible } from './semana.js';

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
      <ul><li><a href="/" class="marca"><strong>Cine Variedades</strong></a></li></ul>
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
    <p class="pie-nota">Prototipo del Caso práctico 4 · Datos inventados · El pago es simulado</p>
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

  if (dias.length === 0) {
    return pagina({
      titulo: 'Cartelera',
      contenido: `${encabezado}<p>Por ahora no hay funciones disponibles en esta semana.</p>`,
    });
  }

  // El dia elegido viaja en la direccion de la pagina, asi que esta pantalla se puede
  // compartir por enlace y no hace falta nada de JavaScript (DISENO.md).
  const selector = `
    <form class="selector-dia" method="get" action="/">
      <label for="dia">Función del día</label>
      <select name="dia" id="dia">
        ${dias
          .map(
            (dia) =>
              `<option value="${escapar(dia)}"${dia === diaElegido ? ' selected' : ''}>${escapar(soloElDia(dia))}</option>`,
          )
          .join('')}
      </select>
      <button type="submit">Ver</button>
    </form>`;

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
          <div class="horarios">${pelicula.funciones
            .map(
              (f) => `
            <a class="horario" href="/funciones/${f.id}/asientos">
              <span class="hora">${escapar(f.fecha_hora.slice(11))}</span>
              <span class="pastilla ${escapar(f.formato)}">${escapar(conMayuscula(f.formato))}</span>
            </a>`,
            )
            .join('')}</div>
        </div>
      </div>`,
        )
        .join('')}
    </article>`,
    )
    .join('');

  return pagina({ titulo: 'Cartelera', contenido: `${encabezado}${selector}${tarjetas}` });
}

export function mapaDeAsientos({ funcion, filas }) {
  const dibujo = filas
    .map(
      ({ fila, numeros }) => `
      <div class="fila-asientos">
        <span class="etiqueta-fila">${escapar(fila)}</span>
        ${numeros
          .map(
            (n) =>
              `<span class="asiento disponible" data-asiento="${escapar(fila + n)}" title="Fila ${escapar(fila)}, asiento ${n}">${n}</span>`,
          )
          .join('')}
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
    <div class="marco-mapa">
      <p class="pantalla-sala">P A N T A L L A</p>
      <div class="mapa">${dibujo}</div>
    </div>
    <p class="leyenda">
      <span><span class="asiento-muestra disponible"></span>Disponible</span>
      <span><span class="asiento-muestra ocupado"></span>No disponible</span>
    </p>
    <p><a href="/">← Volver a la cartelera</a></p>
  `;

  return pagina({ titulo: funcion.pelicula, contenido });
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
