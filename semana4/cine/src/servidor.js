// El servidor: atiende los pedidos del navegador y arma las pantallas.
// Node.js + Express, con las pantallas servidas por el mismo servidor (DISENO.md).

import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

import express from 'express';
import session from 'express-session';
import multer from 'multer';

import { carpetaAfichesDe } from './base-de-datos.js';
import { configuracion, raizDelProyecto } from './config.js';
import { coincide } from './contrasenas.js';
import { comoTextoFechaHora, semanaVigente } from './semana.js';
import * as vistas from './vistas.js';

const FORMATOS = ['doblada', 'subtitulada'];

// Solo imagenes, y hasta 2 MB (DISENO.md, "Otras decisiones").
const TIPOS_DE_AFICHE = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
};
const PESO_MAXIMO_AFICHE = 2 * 1024 * 1024;

// La cartelera se ve un dia a la vez, y ese dia se agrupa por sala: cada sala con la
// pelicula que proyecta y sus horarios (RF-1, RN-15).
//
// RN-15 dice que una sala da una sola pelicula por semana, pero el sistema no lo impide
// (DISENO.md): por eso cada sala guarda una lista de peliculas y no una sola. Si alguna
// vez hay dos, la pantalla dibuja dos bloques bajo el mismo encabezado de sala.
export function agruparPorSala(funciones) {
  const salas = [];
  const porNombre = new Map();

  for (const funcion of funciones) {
    let sala = porNombre.get(funcion.sala);
    if (!sala) {
      sala = { nombre: funcion.sala, capacidad: funcion.capacidad, peliculas: [] };
      porNombre.set(funcion.sala, sala);
      salas.push(sala);
    }

    let pelicula = sala.peliculas.find((p) => p.id === funcion.pelicula_id);
    if (!pelicula) {
      pelicula = { id: funcion.pelicula_id, nombre: funcion.pelicula, afiche: funcion.afiche, funciones: [] };
      sala.peliculas.push(pelicula);
    }
    pelicula.funciones.push(funcion);
  }

  return salas;
}

export function crearServidor(db, opciones = {}) {
  // El reloj se puede reemplazar desde las comprobaciones, para que no dependan del
  // dia en que se corran.
  const ahora = opciones.ahora ?? (() => new Date());
  const carpetaAfiches = opciones.carpetaAfiches ?? carpetaAfichesDe(configuracion.rutaBaseDeDatos);
  fs.mkdirSync(carpetaAfiches, { recursive: true });

  const app = express();
  app.use(express.urlencoded({ extended: false }));
  app.use(express.static(path.join(raizDelProyecto, 'public')));
  app.use('/afiches', express.static(carpetaAfiches));

  // El nombre del archivo lo pone el sistema, nunca el que sube la imagen: un nombre
  // ajeno podria traer barras y terminar escribiendo fuera de esta carpeta.
  const recibirAfiche = multer({
    limits: { fileSize: PESO_MAXIMO_AFICHE, files: 1 },
    fileFilter: (req, archivo, listo) => {
      if (TIPOS_DE_AFICHE[archivo.mimetype]) return listo(null, true);
      listo(new Error('TIPO_NO_PERMITIDO'));
    },
    storage: multer.diskStorage({
      destination: (req, archivo, listo) => listo(null, carpetaAfiches),
      filename: (req, archivo, listo) => listo(null, `${randomUUID()}${TIPOS_DE_AFICHE[archivo.mimetype]}`),
    }),
  }).single('afiche');

  // Si el archivo no sirve, no se corta el pedido: se anota el problema y el formulario
  // lo muestra junto a los demas errores.
  function recibirAficheSinRomperse(req, res, siguiente) {
    recibirAfiche(req, res, (falla) => {
      if (falla) {
        req.problemaConElAfiche =
          falla.code === 'LIMIT_FILE_SIZE'
            ? 'El afiche no puede pesar más de 2 MB.'
            : 'El afiche tiene que ser una imagen (PNG, JPG, WEBP o SVG).';
      }
      siguiente();
    });
  }
  app.use(
    session({
      secret: configuracion.claveDeSesion,
      resave: false,
      saveUninitialized: false,
    }),
  );

  const consultas = {
    // Los dias de la semana vigente en los que todavia queda alguna funcion por dar.
    diasConFunciones: db.prepare(`
      SELECT DISTINCT substr(fecha_hora, 1, 10) AS dia
        FROM funciones
       WHERE fecha_hora >= ? AND fecha_hora <= ? AND fecha_hora > ?
       ORDER BY dia`),
    // Las funciones de un dia, con la sala grande primero.
    funcionesDelDia: db.prepare(`
      SELECT f.id, f.fecha_hora, f.formato,
             p.id AS pelicula_id, p.nombre AS pelicula, p.afiche,
             s.nombre AS sala, s.capacidad
        FROM funciones f
        JOIN peliculas p ON p.id = f.pelicula_id
        JOIN salas s ON s.id = f.sala_id
       WHERE substr(f.fecha_hora, 1, 10) = ? AND f.fecha_hora > ?
       ORDER BY s.capacidad DESC, s.nombre, f.fecha_hora`),
    todasLasFunciones: db.prepare(`
      SELECT f.id, p.nombre AS pelicula, s.nombre AS sala, f.fecha_hora, f.formato
        FROM funciones f
        JOIN peliculas p ON p.id = f.pelicula_id
        JOIN salas s ON s.id = f.sala_id
       ORDER BY f.fecha_hora`),
    funcionPorId: db.prepare(`
      SELECT f.id, f.fecha_hora, f.formato, p.nombre AS pelicula,
             s.id AS sala_id, s.nombre AS sala, s.capacidad
        FROM funciones f
        JOIN peliculas p ON p.id = f.pelicula_id
        JOIN salas s ON s.id = f.sala_id
       WHERE f.id = ?`),
    asientosDeSala: db.prepare('SELECT fila, numero FROM asientos WHERE sala_id = ? ORDER BY fila, numero'),
    salas: db.prepare('SELECT id, nombre, capacidad FROM salas ORDER BY capacidad DESC'),
    salaPorId: db.prepare('SELECT id FROM salas WHERE id = ?'),
    cuentaPorUsuario: db.prepare('SELECT id, usuario, rol, contrasena_cifrada, sal FROM cuentas WHERE usuario = ?'),
    peliculaPorNombre: db.prepare('SELECT id, afiche FROM peliculas WHERE nombre = ?'),
    crearPelicula: db.prepare('INSERT INTO peliculas (nombre, afiche) VALUES (?, ?) RETURNING id'),
    cambiarAfiche: db.prepare('UPDATE peliculas SET afiche = ? WHERE id = ?'),
    crearFuncion: db.prepare('INSERT INTO funciones (pelicula_id, sala_id, fecha_hora, formato) VALUES (?, ?, ?, ?)'),
  };

  // --- Cliente, sin cuenta (RF-1, RF-2) ------------------------------------

  app.get('/', (req, res) => {
    const semana = semanaVigente(ahora());
    const estaMomento = comoTextoFechaHora(ahora());

    const dias = consultas.diasConFunciones
      .all(semana.inicio, `${semana.fin} 23:59`, estaMomento)
      .map((fila) => fila.dia);

    // Si piden un dia que no esta en la lista —porque ya paso, porque es de otra semana
    // o porque lo escribieron a mano—, se muestra el primero que si tiene funciones.
    const pedido = String(req.query.dia ?? '');
    const diaElegido = dias.includes(pedido) ? pedido : dias[0];

    const funciones = diaElegido ? consultas.funcionesDelDia.all(diaElegido, estaMomento) : [];

    res.send(vistas.carteleraCliente({ salas: agruparPorSala(funciones), dias, diaElegido, semana }));
  });

  app.get('/funciones/:id/asientos', (req, res) => {
    const funcion = consultas.funcionPorId.get(Number(req.params.id));
    if (!funcion) {
      return res.status(404).send(
        vistas.pantallaAviso({ titulo: 'Función no encontrada', mensaje: 'Esa función no existe en la cartelera.' }),
      );
    }

    // Los asientos se agrupan por fila para dibujar el mapa como se ve la sala.
    const filas = [];
    for (const asiento of consultas.asientosDeSala.all(funcion.sala_id)) {
      let fila = filas.at(-1);
      if (!fila || fila.fila !== asiento.fila) {
        fila = { fila: asiento.fila, numeros: [] };
        filas.push(fila);
      }
      fila.numeros.push(asiento.numero);
    }

    res.send(vistas.mapaDeAsientos({ funcion, filas }));
  });

  // --- Ingreso del personal (RN-9) -----------------------------------------

  app.get('/personal/ingresar', (req, res) => {
    if (req.session.cuenta) return res.redirect('/personal');
    res.send(vistas.pantallaIngreso());
  });

  app.post('/personal/ingresar', (req, res) => {
    const usuario = (req.body.usuario ?? '').trim();
    const contrasena = req.body.contrasena ?? '';
    const cuenta = consultas.cuentaPorUsuario.get(usuario);

    // El mismo mensaje para usuario inexistente y contrasena equivocada: no conviene
    // avisar cual de las dos cosas fallo.
    if (!cuenta || !coincide(contrasena, cuenta.sal, cuenta.contrasena_cifrada)) {
      return res
        .status(401)
        .send(vistas.pantallaIngreso({ errores: ['Usuario o contraseña incorrectos.'], usuario }));
    }

    req.session.cuenta = { id: cuenta.id, usuario: cuenta.usuario, rol: cuenta.rol };
    res.redirect('/personal');
  });

  app.post('/personal/salir', (req, res) => {
    req.session.destroy(() => res.redirect('/'));
  });

  function exigeIngreso(req, res, next) {
    if (!req.session.cuenta) return res.redirect('/personal/ingresar');
    next();
  }

  function exigeAdministracion(req, res, next) {
    if (req.session.cuenta.rol !== 'administracion') {
      return res.status(403).send(
        vistas.pantallaAviso({
          titulo: 'No tenés permiso',
          mensaje: 'La cartelera solo la puede cargar una cuenta con rol de administración (RN-12).',
          cuenta: req.session.cuenta,
        }),
      );
    }
    next();
  }

  app.get('/personal', exigeIngreso, (req, res) => {
    res.send(vistas.panelPersonal({ cuenta: req.session.cuenta }));
  });

  // --- Carga de la cartelera, solo administracion (RF-12, RN-12) -----------

  function pantallaDeCarga(req, extra = {}) {
    const semana = semanaVigente(ahora());
    const funciones = consultas.todasLasFunciones.all().map((f) => ({
      ...f,
      fuera_de_semana: f.fecha_hora.slice(0, 10) < semana.inicio || f.fecha_hora.slice(0, 10) > semana.fin,
    }));
    return vistas.pantallaCarteleraAdmin({
      cuenta: req.session.cuenta,
      salas: consultas.salas.all(),
      funciones,
      semana,
      ...extra,
    });
  }

  app.get('/personal/cartelera', exigeIngreso, exigeAdministracion, (req, res) => {
    res.send(pantallaDeCarga(req));
  });

  app.post('/personal/cartelera', exigeIngreso, exigeAdministracion, recibirAficheSinRomperse, (req, res) => {
    const pelicula = (req.body.pelicula ?? '').trim();
    const fecha = req.body.fecha ?? '';
    const hora = req.body.hora ?? '';
    const formato = req.body.formato ?? '';
    const sala = consultas.salaPorId.get(Number(req.body.sala_id));

    const errores = [];
    if (!pelicula) errores.push('Falta el nombre de la película.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) errores.push('La fecha no es válida.');
    if (!/^\d{2}:\d{2}$/.test(hora)) errores.push('La hora no es válida.');
    if (!FORMATOS.includes(formato)) errores.push('Hay que indicar si la función es doblada o subtitulada.');
    if (!sala) errores.push('Hay que elegir una sala.');
    if (req.problemaConElAfiche) errores.push(req.problemaConElAfiche);

    if (errores.length > 0) {
      // La imagen ya quedó en disco: si la carga no prospera, se borra para no dejar basura.
      if (req.file) fs.rmSync(path.join(carpetaAfiches, req.file.filename), { force: true });
      return res.status(400).send(pantallaDeCarga(req, { errores, formulario: req.body }));
    }

    // El afiche es de la película, no de la función (REG-4). Si la película ya existía y
    // suben uno nuevo, reemplaza al anterior.
    const existente = consultas.peliculaPorNombre.get(pelicula);
    let pelicula_id;
    if (existente) {
      pelicula_id = existente.id;
      if (req.file) {
        if (existente.afiche) fs.rmSync(path.join(carpetaAfiches, existente.afiche), { force: true });
        consultas.cambiarAfiche.run(req.file.filename, pelicula_id);
      }
    } else {
      pelicula_id = consultas.crearPelicula.get(pelicula, req.file ? req.file.filename : null).id;
    }

    consultas.crearFuncion.run(pelicula_id, sala.id, `${fecha} ${hora}`, formato);

    res.redirect('/personal/cartelera');
  });

  app.use((req, res) => {
    res.status(404).send(
      vistas.pantallaAviso({ titulo: 'Página no encontrada', mensaje: 'Esa dirección no existe.' }),
    );
  });

  return app;
}
