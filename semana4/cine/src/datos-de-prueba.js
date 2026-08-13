// Borra y recrea los datos de prueba: las dos cuentas de personal, las dos salas con
// todos sus asientos, y una cartelera de la semana vigente.
//
// Todos los datos son inventados: no hay personas, negocios ni credenciales reales.
//
// Se puede correr solo:  npm run datos-de-prueba

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { carpetaAfichesDe } from './base-de-datos.js';
import { configuracion, raizDelProyecto } from './config.js';
import { cifrar } from './contrasenas.js';
import { comoTextoFechaHora, diasDeLaSemana, fechaLegible } from './semana.js';

// Afiches inventados, dibujados para este proyecto. No son de peliculas reales.
const CARPETA_MUESTRAS = path.join(raizDelProyecto, 'afiches-de-muestra');

// Sala 1: 10 filas (A-J) de 12 asientos = 120. Sala 2: 6 filas (A-F) de 10 = 60.
// (DISENO.md, "Otras decisiones": la especificacion fija la capacidad, no la forma.)
// Cada sala tiene sus tres horarios diarios, escalonados para que no arranquen juntas.
// El cine programa entre 3 y 4 funciones diarias en cada sala (ESPECIFICACION.md,
// glosario "Cartelera"); aca se siembra el minimo de tres.
// `pelicula` es la posicion dentro de PELICULAS: cada sala proyecta una sola pelicula
// durante toda la semana (RN-15).
const SALAS = [
  { nombre: 'Sala 1', filas: 10, columnas: 12, horarios: ['14:00', '17:30', '20:30'], pelicula: 0 },
  { nombre: 'Sala 2', filas: 6, columnas: 10, horarios: ['15:00', '18:00', '21:00'], pelicula: 1 },
];

const CUENTAS = [
  { usuario: 'admin', contrasena: 'admin123', rol: 'administracion' },
  { usuario: 'taquilla', contrasena: 'taquilla123', rol: 'taquilla' },
];

// Una pelicula por sala, y esa es la de toda la semana (RN-15).
const PELICULAS = [
  { nombre: 'Sombras en el puerto', afiche: 'sombras-en-el-puerto.svg' },
  { nombre: 'Camino al faro', afiche: 'camino-al-faro.svg' },
];

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Arma la programacion completa de la semana: por cada dia y cada sala, sus tres
// funciones, todas de la pelicula que esa sala tiene en cartel esa semana.
export function programacionDePrueba(hoy) {
  const dias = diasDeLaSemana(hoy);
  const funciones = [];

  dias.forEach((dia, numeroDeDia) => {
    SALAS.forEach((sala, numeroDeSala) => {
      sala.horarios.forEach((hora, ranura) => {
        funciones.push({
          fecha_hora: `${dia} ${hora}`,
          sala: numeroDeSala,
          pelicula: sala.pelicula,
          // Doblada y subtitulada se alternan a lo largo del dia y de la semana.
          formato: (ranura + numeroDeDia) % 2 === 0 ? 'doblada' : 'subtitulada',
        });
      });
    });
  });

  return funciones;
}

export function sembrarDatosDePrueba(
  db,
  hoy = new Date(),
  carpetaAfiches = carpetaAfichesDe(configuracion.rutaBaseDeDatos),
) {
  // El orden importa: primero lo que depende de otras tablas.
  db.exec('DELETE FROM funciones; DELETE FROM asientos; DELETE FROM peliculas; DELETE FROM salas; DELETE FROM cuentas;');

  for (const cuenta of CUENTAS) {
    const { sal, cifrada } = cifrar(cuenta.contrasena);
    db.prepare('INSERT INTO cuentas (usuario, contrasena_cifrada, sal, rol) VALUES (?, ?, ?, ?)')
      .run(cuenta.usuario, cifrada, sal, cuenta.rol);
  }

  const salas = SALAS.map((sala) => {
    const capacidad = sala.filas * sala.columnas;
    const { id } = db
      .prepare('INSERT INTO salas (nombre, filas, columnas, capacidad) VALUES (?, ?, ?, ?) RETURNING id')
      .get(sala.nombre, sala.filas, sala.columnas, capacidad);

    const insertarAsiento = db.prepare('INSERT INTO asientos (sala_id, fila, numero) VALUES (?, ?, ?)');
    for (let f = 0; f < sala.filas; f++) {
      for (let n = 1; n <= sala.columnas; n++) insertarAsiento.run(id, LETRAS[f], n);
    }
    return { id, ...sala, capacidad };
  });

  // Cada pelicula de prueba viene con su afiche: el archivo se copia a la carpeta donde
  // viven los afiches, y en la base queda solo su nombre (DISENO.md).
  fs.mkdirSync(carpetaAfiches, { recursive: true });
  const peliculas = PELICULAS.map((pelicula) => {
    fs.copyFileSync(path.join(CARPETA_MUESTRAS, pelicula.afiche), path.join(carpetaAfiches, pelicula.afiche));
    return db
      .prepare('INSERT INTO peliculas (nombre, afiche) VALUES (?, ?) RETURNING id')
      .get(pelicula.nombre, pelicula.afiche).id;
  });

  // La semana completa: 3 funciones diarias en cada sala, los 7 dias.
  const programacion = programacionDePrueba(hoy);
  const insertarFuncion = db.prepare(
    'INSERT INTO funciones (pelicula_id, sala_id, fecha_hora, formato) VALUES (?, ?, ?, ?)',
  );
  for (const funcion of programacion) {
    insertarFuncion.run(peliculas[funcion.pelicula], salas[funcion.sala].id, funcion.fecha_hora, funcion.formato);
  }

  const ahora = comoTextoFechaHora(hoy);
  return {
    cuentas: CUENTAS.length,
    salas: salas.length,
    peliculas: peliculas.length,
    funciones: programacion.length,
    aLaVenta: programacion.filter((f) => f.fecha_hora > ahora).length,
  };
}

// Cuando este archivo se corre directamente (npm run datos-de-prueba).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { abrirBase } = await import('./base-de-datos.js');

  const db = abrirBase(configuracion.rutaBaseDeDatos);
  const resumen = sembrarDatosDePrueba(db);

  console.log('Datos de prueba recreados en', configuracion.rutaBaseDeDatos);
  console.log(`  ${resumen.cuentas} cuentas de personal:`);
  for (const cuenta of CUENTAS) console.log(`    - ${cuenta.usuario} / ${cuenta.contrasena}  (rol: ${cuenta.rol})`);
  console.log(`  ${resumen.salas} salas: ${SALAS.map((s) => `${s.nombre} (${s.filas * s.columnas} asientos)`).join(', ')}`);
  console.log(`  ${resumen.peliculas} peliculas, cada una con su afiche, copiados en ${carpetaAfichesDe(configuracion.rutaBaseDeDatos)}`);
  const dias = diasDeLaSemana();
  console.log(`  ${resumen.funciones} funciones: 3 por dia en cada sala, del ${dias[0]} al ${dias[6]}`);
  for (const f of db.prepare(
    `SELECT s.nombre AS sala, p.nombre AS pelicula, COUNT(*) AS cuantas
       FROM funciones f
       JOIN peliculas p ON p.id = f.pelicula_id
       JOIN salas s ON s.id = f.sala_id
      GROUP BY s.nombre, p.nombre ORDER BY s.nombre`,
  ).all()) {
    console.log(`    - ${f.sala}: "${f.pelicula}", ${f.cuantas} funciones en la semana`);
  }
  console.log(`  ${resumen.aLaVenta} de esas funciones todavia no empezaron: son las que ve el cliente.`);

  if (resumen.aLaVenta === 0) {
    console.log('');
    console.log('  Aviso: la semana vigente ya termino, asi que ninguna funcion sigue a la venta.');
    console.log('  La cartelera del cliente va a salir vacia hasta el proximo jueves.');
  }

  db.close();
}
