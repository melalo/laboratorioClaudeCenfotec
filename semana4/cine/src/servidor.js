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
import { preciosPorTipo, tarifasDe } from './precios.js';
import { crearReservas, MINUTOS_DE_RESERVA, PagoRechazado, ReservaRechazada } from './reservas.js';
import { comoTextoFechaHora, diasDeLaSemana, semanaVigente } from './semana.js';
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
      pelicula = { id: funcion.pelicula_id, nombre: funcion.pelicula, afiche: funcion.afiche, formatos: [] };
      sala.peliculas.push(pelicula);
    }

    // Los horarios se agrupan por formato, para no repetir "Subtitulada" en cada hora
    // (DISENO.md, "Como se muestran los horarios de una sala").
    let grupo = pelicula.formatos.find((f) => f.formato === funcion.formato);
    if (!grupo) {
      grupo = { formato: funcion.formato, funciones: [] };
      pelicula.formatos.push(grupo);
    }
    grupo.funciones.push(funcion);
  }

  return salas;
}

export function crearServidor(db, opciones = {}) {
  // El reloj se puede reemplazar desde las comprobaciones, para que no dependan del
  // dia en que se corran.
  const ahora = opciones.ahora ?? (() => new Date());
  // El precio base y los dos porcentajes salen de config.json. Se pueden reemplazar desde
  // las comprobaciones, que es como se verifica que no esten escritos dentro del codigo.
  const tarifas = opciones.tarifas ?? tarifasDe(configuracion);
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
    salas: db.prepare('SELECT id, nombre, capacidad FROM salas ORDER BY capacidad DESC'),
    salaPorId: db.prepare('SELECT id FROM salas WHERE id = ?'),
    cuentaPorUsuario: db.prepare('SELECT id, usuario, rol, contrasena_cifrada, sal FROM cuentas WHERE usuario = ?'),
    peliculaPorNombre: db.prepare('SELECT id, afiche FROM peliculas WHERE nombre = ?'),
    crearPelicula: db.prepare('INSERT INTO peliculas (nombre, afiche) VALUES (?, ?) RETURNING id'),
    cambiarAfiche: db.prepare('UPDATE peliculas SET afiche = ? WHERE id = ?'),
    crearFuncion: db.prepare('INSERT INTO funciones (pelicula_id, sala_id, fecha_hora, formato) VALUES (?, ?, ?, ?)'),
  };

  // Todo lo que decide si un asiento esta libre u ocupado vive en su propio modulo.
  const reservas = crearReservas(db);

  // --- Cliente, sin cuenta (RF-1, RF-2) ------------------------------------

  app.get('/', (req, res) => {
    const semana = semanaVigente(ahora());
    const estaMomento = comoTextoFechaHora(ahora());

    // La fila de arriba muestra los siete dias de la semana, siempre. Los que ya no
    // tienen funciones por dar van apagados, no se esconden (DISENO.md).
    const conFunciones = new Set(
      consultas.diasConFunciones.all(semana.inicio, `${semana.fin} 23:59`, estaMomento).map((f) => f.dia),
    );
    const dias = diasDeLaSemana(ahora()).map((dia) => ({ dia, disponible: conFunciones.has(dia) }));

    // Si piden un dia sin funciones —porque ya paso, porque es de otra semana o porque
    // lo escribieron a mano—, se muestra el primero que si tenga.
    const pedido = String(req.query.dia ?? '');
    const diaElegido = conFunciones.has(pedido) ? pedido : dias.find((d) => d.disponible)?.dia;

    const funciones = diaElegido ? consultas.funcionesDelDia.all(diaElegido, estaMomento) : [];

    res.send(vistas.carteleraCliente({ salas: agruparPorSala(funciones), dias, diaElegido, semana }));
  });

  // --- Reserva temporal de asientos (RF-3, RF-4, RN-6, RN-7) ---------------

  // Que compra tiene este cliente en esta funcion. Vive en su sesion: es lo unico que
  // distingue "los asientos que yo estoy tomando" —el amarillo— de los ajenos, que van
  // en gris (DISENO.md, representacion visual del mapa).
  function reservaDeLaSesion(req, funcionId) {
    return req.session.reservas?.[String(funcionId)] ?? null;
  }

  function funcionOAviso(req, res) {
    const funcion = consultas.funcionPorId.get(Number(req.params.id));
    if (funcion) return funcion;
    res.status(404).send(
      vistas.pantallaAviso({ titulo: 'Función no encontrada', mensaje: 'Esa función no existe en la cartelera.' }),
    );
    return null;
  }

  // Arma el mapa de una funcion tal como lo ve quien lo pide. Lo usan tanto la pantalla
  // del mapa como la respuesta a quien perdio la carrera por un asiento.
  function armarMapa(funcion, req, errores = []) {
    // Antes de dibujar, se deja escrito en la base lo que el plazo ya decidio.
    reservas.vencerLasPasadasDePlazo(funcion.id, ahora());

    const tomados = reservas.ocupacionDe(funcion.id, ahora());
    const mia = reservaDeLaSesion(req, funcion.id);

    // Los asientos se agrupan por fila para dibujar el mapa como se ve la sala.
    const filas = [];
    for (const asiento of reservas.asientosDeSala(funcion.sala_id)) {
      let fila = filas.at(-1);
      if (!fila || fila.fila !== asiento.fila) {
        fila = { fila: asiento.fila, asientos: [] };
        filas.push(fila);
      }
      // Amarillo solo para lo que este cliente esta eligiendo, o sea su reserva vigente.
      // Lo que ya pago va en gris como cualquier asiento ocupado: una compra pagada ya no
      // se elige (DISENO.md, "Que hace que un asiento deje de estar disponible").
      const tomado = tomados.get(asiento.id);
      const estado = !tomado
        ? 'disponible'
        : tomado.estado === 'reservada' && tomado.compraId === mia
          ? 'eligiendo'
          : 'ocupado';
      fila.asientos.push({ numero: asiento.numero, codigo: asiento.codigo, estado });
    }

    return vistas.mapaDeAsientos({ funcion, filas, errores });
  }

  app.get('/funciones/:id/asientos', (req, res) => {
    const funcion = funcionOAviso(req, res);
    if (funcion) res.send(armarMapa(funcion, req));
  });

  const RECHAZOS = {
    SIN_ASIENTOS: { codigo: 400, mensaje: 'Hay que marcar al menos un asiento para reservar.' },
    ASIENTO_DESCONOCIDO: { codigo: 400, mensaje: 'Alguno de los asientos elegidos no existe en esta sala.' },
    ASIENTO_TOMADO: {
      codigo: 409,
      mensaje: 'Alguno de los asientos que elegiste ya no está disponible. Elegí otro en el mapa.',
    },
  };

  app.post('/funciones/:id/reservar', (req, res) => {
    const funcion = funcionOAviso(req, res);
    if (!funcion) return;

    // El formulario manda un "asientos" por cada butaca marcada: uno solo llega como
    // texto, varios llegan como lista, y ninguno no llega.
    const marcados = req.body.asientos;
    const codigos = marcados === undefined ? [] : [].concat(marcados);

    try {
      const compraId = reservas.reservar({
        funcionId: funcion.id,
        salaId: funcion.sala_id,
        codigos,
        ahora: ahora(),
        // Si ya tenia una reserva en esta funcion, la nueva la reemplaza (DISENO.md).
        reservaPrevia: reservaDeLaSesion(req, funcion.id),
      });

      req.session.reservas = { ...(req.session.reservas ?? {}), [funcion.id]: compraId };
      res.redirect(`/reservas/${compraId}`);
    } catch (falla) {
      if (!(falla instanceof ReservaRechazada)) throw falla;
      const { codigo, mensaje } = RECHAZOS[falla.motivo];
      // Se le muestra el mapa actualizado, con el asiento perdido ya en gris
      // (DISENO.md, "Manejo de errores").
      res.status(codigo).send(armarMapa(funcion, req, [mensaje]));
    }
  });

  // --- El pago y la confirmacion (RF-5, RF-6, RF-8, RF-9, RF-10) -----------

  // Una compra solo se le muestra a quien la hizo. Mientras es una reserva vive en
  // `reservas`, indexada por funcion, porque el mapa necesita saber cual es la de este
  // cliente en esa funcion. Al pagarse se muda a `compras`: deja de ser una eleccion en
  // curso y pasa a ser algo que el cliente ya tiene, y que puede volver a mirar.
  function compraPropia(req, compraId) {
    const reservadas = Object.values(req.session.reservas ?? {});
    const pagadas = req.session.compras ?? [];
    return reservadas.includes(compraId) || pagadas.includes(compraId);
  }

  function compraOAviso(req, res) {
    const compraId = Number(req.params.id);
    const compra = compraPropia(req, compraId) ? reservas.reservaPorId(compraId, ahora()) : null;
    if (compra) return compra;
    res.status(404).send(
      vistas.pantallaAviso({
        titulo: 'Compra no encontrada',
        mensaje: 'Esa compra no existe, o fue hecha desde otro navegador.',
      }),
    );
    return null;
  }

  // Los boletos de una compra, juntados por precio: "2 boletos de estudiante a ₡2.800".
  // Van del mas caro al mas barato, que es como se lee una factura.
  function agruparPorPrecio(boletos) {
    const grupos = [];
    for (const boleto of boletos) {
      let grupo = grupos.find((g) => g.descuento === boleto.descuento);
      if (!grupo) {
        grupo = { descuento: boleto.descuento, precio: boleto.precio, cuantos: 0 };
        grupos.push(grupo);
      }
      grupo.cuantos += 1;
    }
    return grupos.sort((a, b) => b.precio - a.precio);
  }

  // Cuantos boletos de estudiante hay declarados en este momento. Nunca menos de cero ni
  // mas que los asientos reservados: lo que llegue fuera de rango se recorta.
  function estudiantesDeclarados(compra, valor) {
    return Math.min(compra.asientos.length, Math.max(0, Number(valor) || 0));
  }

  // Lo que la tabla de tipos de boleto necesita: cuantos asientos hay que repartir,
  // cuantos son de estudiante ahora mismo, y cuanto paga un boleto de cada tipo en esta
  // funcion (DISENO.md, "Como se muestra y se elige el reparto...").
  function datosDeLaTabla(compra, estudiantes) {
    const { regular, estudiante } = preciosPorTipo({ fechaHora: compra.fecha_hora, tarifas });
    return { asientos: compra.asientos.length, estudiantes, regular, estudiante };
  }

  // Una compra pagada muestra su codigo de confirmacion; una reserva todavia viva, el
  // formulario de pago; una vencida, el aviso de que ya no sirve.
  function pantallaDeLaCompra(compra, extra = {}) {
    if (compra.pagada) {
      return vistas.pantallaCompraConfirmada({ compra, renglones: agruparPorPrecio(compra.boletos) });
    }
    return vistas.pantallaReserva({
      reserva: compra,
      minutosDePlazo: MINUTOS_DE_RESERVA,
      tabla: compra.vigente
        ? datosDeLaTabla(compra, estudiantesDeclarados(compra, extra.formulario?.estudiantes))
        : null,
      ...extra,
    });
  }

  app.get('/reservas/:id', (req, res) => {
    const compra = compraOAviso(req, res);
    if (compra) res.send(pantallaDeLaCompra(compra));
  });

  // El − y el + de la tabla de boletos. Cada botón es un envío de formulario de verdad,
  // así que la tabla funciona aunque el navegador no ejecute nada: el servidor recalcula
  // y devuelve la misma pantalla con el reparto nuevo. Cuando el JavaScript de la página
  // sí corre, ataja el clic y hace la misma cuenta sin recargar (DISENO.md, "Si las
  // pantallas pueden usar JavaScript").
  app.post('/reservas/:id/ajustar', (req, res) => {
    const compra = compraOAviso(req, res);
    if (!compra) return;
    if (compra.pagada) return res.redirect(`/reservas/${compra.id}`);

    const paso = Number(req.body.ajuste ?? 0) || 0;
    const estudiantes = estudiantesDeclarados(compra, (Number(req.body.estudiantes) || 0) + paso);

    // Se conserva lo que el cliente ya había escrito, para no borrárselo al mover el contador.
    res.send(pantallaDeLaCompra(compra, { formulario: { ...req.body, estudiantes } }));
  });

  const PAGOS_RECHAZADOS = {
    RESERVA_VENCIDA: { codigo: 409, mensaje: 'La reserva venció antes de completarse el pago.' },
    DEMASIADOS_ESTUDIANTES: { codigo: 400, mensaje: 'Declaraste más boletos de estudiante que asientos.' },
    NO_EXISTE: { codigo: 404, mensaje: 'Esa compra ya no existe.' },
  };

  app.post('/reservas/:id/pagar', (req, res) => {
    const compra = compraOAviso(req, res);
    if (!compra) return;

    // Volver a pagar algo ya pagado no lo cobra de nuevo: se lo lleva a su codigo.
    if (compra.pagada) return res.redirect(`/reservas/${compra.id}`);

    // Si el plazo ya paso no hay nada que validar: los asientos volvieron a estar libres
    // y hay que elegir de nuevo (RF-4).
    if (!compra.vigente) return res.status(409).send(pantallaDeLaCompra(compra));

    const nombre = (req.body.nombre ?? '').trim();
    const identificacion = (req.body.identificacion ?? '').trim();
    const estudiantes = Number(req.body.estudiantes ?? 0);
    const cuantosAsientos = compra.asientos.length;

    // No se exige ningun formato de identificacion: el sistema no verifica identidades,
    // el dato existe para que taquilla reconozca al cliente que perdio su codigo (RN-14,
    // DISENO.md). Solo se pide que no vengan vacios y que no sean desmedidos.
    const errores = [];
    if (!nombre) errores.push('Hay que indicar tu nombre.');
    else if (nombre.length > 120) errores.push('El nombre es demasiado largo.');
    if (!identificacion) errores.push('Hay que indicar tu número de identificación.');
    else if (identificacion.length > 40) errores.push('El número de identificación es demasiado largo.');
    if (!Number.isInteger(estudiantes) || estudiantes < 0 || estudiantes > cuantosAsientos) {
      errores.push(`Los boletos de estudiante tienen que ser entre 0 y ${cuantosAsientos}.`);
    }

    if (errores.length > 0) {
      return res
        .status(400)
        .send(pantallaDeLaCompra(compra, { errores, formulario: { nombre, identificacion, estudiantes } }));
    }

    try {
      reservas.pagar({
        compraId: compra.id,
        nombre,
        identificacion,
        estudiantes,
        // RN-8: toda compra queda registrada con su metodo. Las de este slice son todas
        // en linea; las de taquilla las construye el vertical slice 4.
        metodo: 'linea',
        tarifas,
        ahora: ahora(),
      });
    } catch (falla) {
      if (!(falla instanceof PagoRechazado)) throw falla;
      const { codigo, mensaje } = PAGOS_RECHAZADOS[falla.motivo] ?? { codigo: 500, mensaje: 'No se pudo completar el pago.' };
      const alDia = reservas.reservaPorId(compra.id, ahora());
      return res.status(codigo).send(pantallaDeLaCompra(alDia ?? compra, { errores: [mensaje] }));
    }

    // Deja de ser una reserva en curso y pasa a ser una compra hecha. Si no se sacara de
    // `reservas`, el mapa de esa funcion se la seguiria mostrando en amarillo, como si el
    // cliente todavia la estuviera eligiendo.
    if (req.session.reservas) delete req.session.reservas[String(compra.funcion_id)];
    req.session.compras = [...(req.session.compras ?? []), compra.id];

    res.redirect(`/reservas/${compra.id}`);
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
