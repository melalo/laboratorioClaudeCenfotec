// Comprobaciones del vertical slice 1: "Cartelera y mapa de asientos" (PLAN.md).
// Cada prueba corresponde a una condicion del "Que tiene que ser cierto" del plan.
// Todas usan el servidor de verdad y una base SQLite de verdad, en un archivo temporal.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  levantarApp,
  CUENTAS,
  JUEVES_DE_PRUEBA,
  PNG_MINIMO,
  contarAsientos,
  contarAsientosDisponibles,
} from './ayuda.js';

// ---------------------------------------------------------------------------
// Datos de prueba
// ---------------------------------------------------------------------------

test('los datos de prueba crean una cuenta de administracion y una de taquilla', async () => {
  const app = await levantarApp();
  try {
    // SQLite devuelve los resultados en objetos "pelados", asi que se copian a objetos
    // comunes antes de compararlos.
    const cuentas = app.db
      .prepare('SELECT usuario, rol FROM cuentas ORDER BY usuario')
      .all()
      .map((c) => ({ usuario: c.usuario, rol: c.rol }));
    assert.deepEqual(cuentas, [
      { usuario: 'admin', rol: 'administracion' },
      { usuario: 'taquilla', rol: 'taquilla' },
    ]);
  } finally {
    await app.cerrar();
  }
});

test('los datos de prueba crean las dos salas, con 120 y 60 asientos de verdad', async () => {
  const app = await levantarApp();
  try {
    const salas = app.db.prepare('SELECT id, nombre, capacidad FROM salas ORDER BY capacidad DESC').all();
    assert.equal(salas.length, 2);
    assert.equal(salas[0].capacidad, 120);
    assert.equal(salas[1].capacidad, 60);

    for (const sala of salas) {
      const { total } = app.db
        .prepare('SELECT COUNT(*) AS total FROM asientos WHERE sala_id = ?')
        .get(sala.id);
      assert.equal(total, sala.capacidad, `la ${sala.nombre} deberia tener ${sala.capacidad} asientos`);
    }
  } finally {
    await app.cerrar();
  }
});

test('los datos de prueba crean al menos 2 peliculas y 3 funciones, repartidas entre las dos salas', async () => {
  const app = await levantarApp();
  try {
    const { peliculas } = app.db.prepare('SELECT COUNT(*) AS peliculas FROM peliculas').get();
    assert.ok(peliculas >= 2, `se esperaban al menos 2 peliculas, hay ${peliculas}`);

    const funciones = app.db.prepare('SELECT sala_id, fecha_hora FROM funciones').all();
    assert.ok(funciones.length >= 3, `se esperaban al menos 3 funciones, hay ${funciones.length}`);

    const salasUsadas = new Set(funciones.map((f) => f.sala_id));
    assert.equal(salasUsadas.size, 2, 'las funciones de prueba deben usar las dos salas');
  } finally {
    await app.cerrar();
  }
});

test('las funciones de prueba caen dentro de la semana vigente, con al menos una en miercoles y una en otro dia', async () => {
  const app = await levantarApp();
  try {
    const funciones = app.db.prepare('SELECT fecha_hora FROM funciones ORDER BY fecha_hora').all();

    for (const funcion of funciones) {
      assert.ok(
        funcion.fecha_hora >= '2026-08-13' && funcion.fecha_hora <= '2026-08-19 23:59',
        `la funcion ${funcion.fecha_hora} quedo fuera de la semana vigente (13 al 19 de agosto)`,
      );
    }

    const diasSemana = funciones.map((f) => new Date(`${f.fecha_hora.replace(' ', 'T')}:00`).getDay());
    assert.ok(diasSemana.includes(3), 'falta una funcion en miercoles');
    assert.ok(diasSemana.some((d) => d !== 3), 'falta una funcion en un dia que no sea miercoles');
  } finally {
    await app.cerrar();
  }
});

test('los datos de prueba programan tres funciones diarias en cada sala, los siete dias', async () => {
  const app = await levantarApp();
  try {
    // El cine programa entre 3 y 4 funciones diarias en cada sala
    // (ESPECIFICACION.md, glosario "Cartelera").
    const porDiaYSala = app.db
      .prepare(
        `SELECT substr(fecha_hora, 1, 10) AS dia, sala_id, COUNT(*) AS cuantas
           FROM funciones GROUP BY dia, sala_id`,
      )
      .all();

    assert.equal(porDiaYSala.length, 14, 'deberian ser 7 dias por 2 salas');
    for (const fila of porDiaYSala) {
      assert.equal(fila.cuantas, 3, `el ${fila.dia} en la sala ${fila.sala_id} deberia tener 3 funciones`);
    }
    assert.equal(app.db.prepare('SELECT COUNT(*) AS n FROM funciones').get().n, 42);
  } finally {
    await app.cerrar();
  }
});

test('cada sala proyecta una sola pelicula en toda la semana', async () => {
  const app = await levantarApp();
  try {
    // RN-15: cada sala proyecta una sola pelicula durante toda la semana vigente.
    const porSala = app.db
      .prepare(
        `SELECT s.nombre AS sala, COUNT(DISTINCT f.pelicula_id) AS peliculas, COUNT(*) AS funciones
           FROM funciones f JOIN salas s ON s.id = f.sala_id
          GROUP BY s.nombre`,
      )
      .all();

    assert.equal(porSala.length, 2, 'deberian programarse las dos salas');
    for (const sala of porSala) {
      assert.equal(sala.peliculas, 1, `la ${sala.sala} deberia dar una sola pelicula, y da ${sala.peliculas}`);
      assert.equal(sala.funciones, 21, `la ${sala.sala} deberia tener 21 funciones (3 por dia x 7 dias)`);
    }

    const { cuantas } = app.db.prepare('SELECT COUNT(*) AS cuantas FROM peliculas').get();
    assert.equal(cuantas, 2, 'dos salas, una pelicula cada una: la semana tiene dos peliculas');
  } finally {
    await app.cerrar();
  }
});

test('los datos de prueba dejan cada pelicula con su afiche, y el afiche se sirve', async () => {
  const app = await levantarApp();
  try {
    const peliculas = app.db.prepare('SELECT nombre, afiche FROM peliculas').all();
    assert.ok(peliculas.length >= 2);

    const nav = app.navegador();
    for (const pelicula of peliculas) {
      assert.ok(pelicula.afiche, `la pelicula "${pelicula.nombre}" deberia tener afiche`);
      assert.equal(
        (await nav.ver(`/afiches/${pelicula.afiche}`)).status,
        200,
        `no se sirve el afiche de "${pelicula.nombre}"`,
      );
    }
  } finally {
    await app.cerrar();
  }
});

// ---------------------------------------------------------------------------
// Ingreso del personal (RN-9)
// ---------------------------------------------------------------------------

test('la cuenta de administracion entra con su usuario y contrasena', async () => {
  const app = await levantarApp();
  try {
    const nav = app.navegador();
    const respuesta = await nav.ingresar(CUENTAS.administracion);
    assert.equal(respuesta.status, 302);

    const panel = await nav.ver('/personal');
    assert.equal(panel.status, 200);
    const html = await panel.text();
    assert.match(html, /admin/, 'el panel deberia mostrar con que cuenta se entro');
  } finally {
    await app.cerrar();
  }
});

test('la cuenta de taquilla tambien entra con su usuario y contrasena', async () => {
  const app = await levantarApp();
  try {
    const nav = app.navegador();
    const respuesta = await nav.ingresar(CUENTAS.taquilla);
    assert.equal(respuesta.status, 302);
    assert.equal((await nav.ver('/personal')).status, 200);
  } finally {
    await app.cerrar();
  }
});

test('con la contrasena incorrecta el sistema no deja entrar', async () => {
  const app = await levantarApp();
  try {
    const nav = app.navegador();
    const respuesta = await nav.ingresar({ usuario: 'admin', contrasena: 'esta-no-es' });
    assert.equal(respuesta.status, 401);

    const panel = await nav.ver('/personal');
    assert.equal(panel.status, 302, 'sin haber entrado, el panel no se puede ver');
  } finally {
    await app.cerrar();
  }
});

test('con un usuario que no existe el sistema no deja entrar', async () => {
  const app = await levantarApp();
  try {
    const nav = app.navegador();
    const respuesta = await nav.ingresar({ usuario: 'nadie', contrasena: 'admin123' });
    assert.equal(respuesta.status, 401);
  } finally {
    await app.cerrar();
  }
});

test('sin haber ingresado, el panel del personal no se puede ver', async () => {
  const app = await levantarApp();
  try {
    const respuesta = await app.navegador().ver('/personal');
    assert.equal(respuesta.status, 302);
    assert.equal(respuesta.headers.get('location'), '/personal/ingresar');
  } finally {
    await app.cerrar();
  }
});

// ---------------------------------------------------------------------------
// Carga de la cartelera (RF-12, RN-12)
// ---------------------------------------------------------------------------

test('administracion carga una funcion y el cliente la ve en la cartelera', async () => {
  const app = await levantarApp();
  try {
    const salaGrande = app.db.prepare('SELECT id FROM salas WHERE capacidad = 120').get();

    const personal = app.navegador();
    await personal.ingresar(CUENTAS.administracion);
    const creada = await personal.enviar('/personal/cartelera', {
      pelicula: 'La noche mas larga',
      sala_id: salaGrande.id,
      fecha: '2026-08-18',
      hora: '21:30',
      formato: 'doblada',
    });
    assert.equal(creada.status, 302);

    // La cartelera se ve un dia a la vez, asi que se pide el dia de la funcion cargada.
    const cliente = await app.navegador().ver('/?dia=2026-08-18');
    const html = await cliente.text();
    assert.match(html, /La noche mas larga/, 'la pelicula cargada deberia aparecer en la cartelera');
    assert.match(html, /21:30/, 'el horario cargado deberia aparecer en la cartelera');
  } finally {
    await app.cerrar();
  }
});

test('administracion carga una funcion adjuntando un afiche y el cliente lo ve', async () => {
  const app = await levantarApp();
  try {
    const sala = app.db.prepare('SELECT id FROM salas WHERE capacidad = 60').get();

    const personal = app.navegador();
    await personal.ingresar(CUENTAS.administracion);
    const creada = await personal.enviarConArchivo(
      '/personal/cartelera',
      { pelicula: 'Retrato en la niebla', sala_id: sala.id, fecha: '2026-08-18', hora: '19:00', formato: 'doblada' },
      { campo: 'afiche', contenido: PNG_MINIMO, tipo: 'image/png', nombre: 'retrato.png' },
    );
    assert.equal(creada.status, 302);

    const guardada = app.db.prepare('SELECT afiche FROM peliculas WHERE nombre = ?').get('Retrato en la niebla');
    assert.ok(guardada?.afiche, 'la pelicula deberia haber quedado con un afiche');

    const cliente = app.navegador();
    const html = await (await cliente.ver('/?dia=2026-08-18')).text();
    assert.ok(
      html.includes(`src="/afiches/${guardada.afiche}"`),
      'la cartelera deberia mostrar el afiche cargado',
    );
    assert.equal((await cliente.ver(`/afiches/${guardada.afiche}`)).status, 200);
  } finally {
    await app.cerrar();
  }
});

test('una pelicula sin afiche muestra un bloque con el titulo en vez de romperse', async () => {
  const app = await levantarApp();
  try {
    const sala = app.db.prepare('SELECT id FROM salas WHERE capacidad = 60').get();

    const personal = app.navegador();
    await personal.ingresar(CUENTAS.administracion);
    const creada = await personal.enviarConArchivo('/personal/cartelera', {
      pelicula: 'Documental sin afiche',
      sala_id: sala.id,
      fecha: '2026-08-17',
      hora: '16:00',
      formato: 'subtitulada',
    });
    assert.equal(creada.status, 302);

    const html = await (await app.navegador().ver('/?dia=2026-08-17')).text();
    assert.match(html, /afiche-vacio/, 'deberia aparecer el bloque que reemplaza al afiche');
    assert.match(html, /Documental sin afiche/);
  } finally {
    await app.cerrar();
  }
});

test('la cuenta de taquilla no puede abrir la pantalla de carga de cartelera', async () => {
  const app = await levantarApp();
  try {
    const nav = app.navegador();
    await nav.ingresar(CUENTAS.taquilla);
    const respuesta = await nav.ver('/personal/cartelera');
    assert.equal(respuesta.status, 403);
  } finally {
    await app.cerrar();
  }
});

test('la cuenta de taquilla no puede cargar una funcion', async () => {
  const app = await levantarApp();
  try {
    const salaGrande = app.db.prepare('SELECT id FROM salas WHERE capacidad = 120').get();
    const antes = app.db.prepare('SELECT COUNT(*) AS total FROM funciones').get().total;

    const nav = app.navegador();
    await nav.ingresar(CUENTAS.taquilla);
    const respuesta = await nav.enviar('/personal/cartelera', {
      pelicula: 'Pelicula colada por taquilla',
      sala_id: salaGrande.id,
      fecha: '2026-08-18',
      hora: '18:00',
      formato: 'doblada',
    });

    assert.equal(respuesta.status, 403);
    const despues = app.db.prepare('SELECT COUNT(*) AS total FROM funciones').get().total;
    assert.equal(despues, antes, 'no deberia haberse creado ninguna funcion');
  } finally {
    await app.cerrar();
  }
});

test('sin haber ingresado no se puede cargar una funcion', async () => {
  const app = await levantarApp();
  try {
    const salaGrande = app.db.prepare('SELECT id FROM salas WHERE capacidad = 120').get();
    const antes = app.db.prepare('SELECT COUNT(*) AS total FROM funciones').get().total;

    const respuesta = await app.navegador().enviar('/personal/cartelera', {
      pelicula: 'Pelicula sin cuenta',
      sala_id: salaGrande.id,
      fecha: '2026-08-18',
      hora: '18:00',
      formato: 'doblada',
    });

    assert.equal(respuesta.status, 302);
    assert.equal(app.db.prepare('SELECT COUNT(*) AS total FROM funciones').get().total, antes);
  } finally {
    await app.cerrar();
  }
});

// ---------------------------------------------------------------------------
// Cartelera que ve el cliente (RF-1)
// ---------------------------------------------------------------------------

test('el cliente sin cuenta ve pelicula, sala, horario y si la funcion es doblada o subtitulada', async () => {
  const app = await levantarApp();
  try {
    const funcion = app.db
      .prepare(
        `SELECT p.nombre AS pelicula, s.nombre AS sala, f.fecha_hora, f.formato
         FROM funciones f
         JOIN peliculas p ON p.id = f.pelicula_id
         JOIN salas s ON s.id = f.sala_id
         ORDER BY f.fecha_hora LIMIT 1`,
      )
      .get();

    const html = await (await app.navegador().ver('/')).text();

    assert.match(html, new RegExp(funcion.pelicula));
    assert.match(html, new RegExp(funcion.sala));
    assert.match(html, new RegExp(funcion.fecha_hora.slice(11))); // la hora
    assert.match(html, new RegExp(funcion.formato, 'i'));
  } finally {
    await app.cerrar();
  }
});

test('la cartelera dice de que tamano es la sala de cada funcion', async () => {
  const app = await levantarApp();
  try {
    const html = await (await app.navegador().ver('/')).text();

    // Sin esto, el cliente lee "Sala 1" y "Sala 2" y no sabe cual es la grande.
    assert.match(html, /Sala 1[\s\S]{0,160}?120 asientos/, 'la funcion de la sala grande deberia decir 120 asientos');
    assert.match(html, /Sala 2[\s\S]{0,160}?60 asientos/, 'la funcion de la sala pequena deberia decir 60 asientos');
  } finally {
    await app.cerrar();
  }
});

test('la cartelera muestra el formato de cada funcion como una pastilla de color', async () => {
  const app = await levantarApp();
  try {
    const html = await (await app.navegador().ver('/')).text();

    // VISUALS.md le asigna un color propio a cada formato, para distinguirlos de un vistazo.
    assert.match(html, /class="pastilla doblada"/);
    assert.match(html, /class="pastilla subtitulada"/);
  } finally {
    await app.cerrar();
  }
});

test('las tipografias del sistema de diseno se sirven desde el proyecto, sin internet', async () => {
  const app = await levantarApp();
  try {
    const nav = app.navegador();
    const css = await (await nav.ver('/css/cine.css')).text();

    assert.match(css, /@font-face/);
    for (const familia of ['Manrope', 'Work Sans', 'JetBrains Mono']) {
      assert.match(css, new RegExp(familia), `falta la tipografia ${familia} de VISUALS.md`);
    }
    assert.doesNotMatch(css, /https?:\/\//, 'la hoja de estilos no debe traer nada de internet');

    for (const archivo of [
      'manrope-latin-700-normal.woff2',
      'work-sans-latin-400-normal.woff2',
      'jetbrains-mono-latin-700-normal.woff2',
    ]) {
      assert.equal((await nav.ver(`/fonts/${archivo}`)).status, 200, `no se sirve ${archivo}`);
    }
  } finally {
    await app.cerrar();
  }
});

test('la cartelera muestra una tarjeta por sala, con la pelicula de ese dia', async () => {
  const app = await levantarApp();
  try {
    const html = await (await app.navegador().ver('/')).text();

    const tarjetas = (html.match(/<article class="sala"/g) ?? []).length;
    assert.equal(tarjetas, 2, 'un dia cualquiera deberia mostrar las dos salas');

    // Tres funciones por sala ese dia, y ningun dia mas.
    const horarios = (html.match(/class="horario"/g) ?? []).length;
    assert.equal(horarios, 6, 'las dos salas dan 3 funciones cada una');
  } finally {
    await app.cerrar();
  }
});

test('la cartelera muestra los siete dias de la semana en fila, con el elegido marcado', async () => {
  const app = await levantarApp();
  try {
    const html = await (await app.navegador().ver('/?dia=2026-08-16')).text();

    const chips = (html.match(/class="dia-chip/g) ?? []).length;
    assert.equal(chips, 7, 'la semana entera tiene que estar a la vista, no escondida');

    const elegidos = (html.match(/class="dia-chip elegido"/g) ?? []).length;
    assert.equal(elegidos, 1, 'exactamente un dia queda marcado como elegido');
  } finally {
    await app.cerrar();
  }
});

test('un dia de la semana que ya paso se muestra apagado y no se puede elegir', async () => {
  // Sabado 15 a las 22:00: la ultima funcion del dia era a las 21:00, asi que el
  // jueves, el viernes y el sabado ya no tienen nada por dar.
  const app = await levantarApp({ hoy: new Date(2026, 7, 15, 22, 0) });
  try {
    const html = await (await app.navegador().ver('/')).text();

    assert.equal((html.match(/class="dia-chip/g) ?? []).length, 7, 'siguen estando los siete dias');
    assert.equal(
      (html.match(/class="dia-chip apagado"/g) ?? []).length,
      3,
      'jueves, viernes y sabado ya pasaron',
    );
    assert.doesNotMatch(html, /href="\/\?dia=2026-08-14"/, 'un dia pasado no deberia ser un enlace');
    assert.match(html, /href="\/\?dia=2026-08-17"/, 'un dia futuro si deberia serlo');
  } finally {
    await app.cerrar();
  }
});

test('dentro de cada sala, los horarios estan agrupados por formato', async () => {
  const app = await levantarApp();
  try {
    const html = await (await app.navegador().ver('/?dia=2026-08-15')).text();

    // Ese dia la Sala 1 da dos funciones dobladas y una subtitulada: dos grupos.
    const grupos = (html.match(/class="grupo-formato"/g) ?? []).length;
    assert.equal(grupos, 4, 'dos salas con dos formatos cada una ese dia');

    // La etiqueta del formato aparece una vez por grupo, no una por hora.
    assert.equal(
      (html.match(/class="pastilla /g) ?? []).length,
      grupos,
      'la etiqueta de formato va una vez por grupo, no pegada a cada hora',
    );
  } finally {
    await app.cerrar();
  }
});

test('al elegir un dia en la fila, solo se ven las funciones de ese dia', async () => {
  const app = await levantarApp();
  try {
    const delDomingo = app.db
      .prepare("SELECT id FROM funciones WHERE fecha_hora LIKE '2026-08-16%'")
      .all()
      .map((f) => f.id);
    const delSabado = app.db
      .prepare("SELECT id FROM funciones WHERE fecha_hora LIKE '2026-08-15%'")
      .all()
      .map((f) => f.id);

    const html = await (await app.navegador().ver('/?dia=2026-08-16')).text();

    // El dia elegido se reconoce en la fila de arriba, marcado.
    const marcado = html.slice(html.indexOf('class="dia-chip elegido"'), html.indexOf('class="dia-chip elegido"') + 220);
    assert.match(marcado, /dom/, 'el dia marcado deberia ser un domingo');
    assert.match(marcado, />16</, 'y deberia ser el 16');

    for (const id of delDomingo) {
      assert.ok(html.includes(`/funciones/${id}/asientos`), `falta la funcion ${id} del domingo`);
    }
    for (const id of delSabado) {
      assert.ok(!html.includes(`/funciones/${id}/asientos`), `no deberia aparecer la funcion ${id} del sabado`);
    }
  } finally {
    await app.cerrar();
  }
});

test('el acceso del personal vive en el pie de pagina, no en el encabezado', async () => {
  const app = await levantarApp();
  try {
    const html = await (await app.navegador().ver('/')).text();

    const encabezado = html.slice(html.indexOf('<header'), html.indexOf('</header>'));
    const pie = html.slice(html.indexOf('<footer'), html.indexOf('</footer>'));

    assert.ok(pie.includes('/personal/ingresar'), 'el pie de pagina deberia tener el acceso del personal');
    assert.ok(
      !encabezado.includes('/personal/ingresar'),
      'el encabezado ya no deberia ofrecer el acceso del personal: la cartelera es del cliente',
    );
  } finally {
    await app.cerrar();
  }
});

test('la cartelera no muestra funciones de otra semana', async () => {
  const app = await levantarApp();
  try {
    const salaGrande = app.db.prepare('SELECT id FROM salas WHERE capacidad = 120').get();
    const pelicula = app.db.prepare('INSERT INTO peliculas (nombre) VALUES (?) RETURNING id').get('Estreno de la otra semana');
    app.db
      .prepare('INSERT INTO funciones (pelicula_id, sala_id, fecha_hora, formato) VALUES (?, ?, ?, ?)')
      .run(pelicula.id, salaGrande.id, '2026-08-20 20:00', 'doblada'); // jueves siguiente

    const nav = app.navegador();
    assert.doesNotMatch(await (await nav.ver('/')).text(), /Estreno de la otra semana/);
    // Y tampoco si alguien pide ese dia a mano en la direccion.
    assert.doesNotMatch(await (await nav.ver('/?dia=2026-08-20')).text(), /Estreno de la otra semana/);
  } finally {
    await app.cerrar();
  }
});

test('la cartelera no muestra funciones que ya empezaron', async () => {
  const app = await levantarApp();
  try {
    const salaGrande = app.db.prepare('SELECT id FROM salas WHERE capacidad = 120').get();
    const pelicula = app.db.prepare('INSERT INTO peliculas (nombre) VALUES (?) RETURNING id').get('Funcion que ya empezo');
    // La hora de prueba es el jueves 13 a las 10:00; esta funcion arranco a las 09:00.
    app.db
      .prepare('INSERT INTO funciones (pelicula_id, sala_id, fecha_hora, formato) VALUES (?, ?, ?, ?)')
      .run(pelicula.id, salaGrande.id, '2026-08-13 09:00', 'doblada');

    const html = await (await app.navegador().ver('/')).text();
    assert.doesNotMatch(html, /Funcion que ya empezo/);
  } finally {
    await app.cerrar();
  }
});

// ---------------------------------------------------------------------------
// Mapa de asientos (RF-2)
// ---------------------------------------------------------------------------

test('el mapa de una funcion en la sala de 120 muestra 120 asientos, todos disponibles', async () => {
  const app = await levantarApp();
  try {
    const funcion = app.db
      .prepare('SELECT f.id FROM funciones f JOIN salas s ON s.id = f.sala_id WHERE s.capacidad = 120 LIMIT 1')
      .get();

    const respuesta = await app.navegador().ver(`/funciones/${funcion.id}/asientos`);
    assert.equal(respuesta.status, 200);
    const html = await respuesta.text();

    assert.equal(contarAsientos(html), 120);
    assert.equal(contarAsientosDisponibles(html), 120);
  } finally {
    await app.cerrar();
  }
});

test('el mapa de una funcion en la sala de 60 muestra 60 asientos, todos disponibles', async () => {
  const app = await levantarApp();
  try {
    const funcion = app.db
      .prepare('SELECT f.id FROM funciones f JOIN salas s ON s.id = f.sala_id WHERE s.capacidad = 60 LIMIT 1')
      .get();

    const respuesta = await app.navegador().ver(`/funciones/${funcion.id}/asientos`);
    assert.equal(respuesta.status, 200);
    const html = await respuesta.text();

    assert.equal(contarAsientos(html), 60);
    assert.equal(contarAsientosDisponibles(html), 60);
  } finally {
    await app.cerrar();
  }
});

test('cada asiento del mapa se identifica por su fila y su numero', async () => {
  const app = await levantarApp();
  try {
    const funcion = app.db
      .prepare('SELECT f.id FROM funciones f JOIN salas s ON s.id = f.sala_id WHERE s.capacidad = 120 LIMIT 1')
      .get();

    const html = await (await app.navegador().ver(`/funciones/${funcion.id}/asientos`)).text();

    assert.match(html, /data-asiento="A1"/, 'deberia existir el asiento A1');
    assert.match(html, /data-asiento="J12"/, 'la sala de 120 va de la fila A a la J, con 12 asientos por fila');
  } finally {
    await app.cerrar();
  }
});

test('el mapa de asientos distingue tres estados: disponible, eligiendo y no disponible', async () => {
  const app = await levantarApp();
  try {
    const funcion = app.db.prepare('SELECT id FROM funciones LIMIT 1').get();
    const html = await (await app.navegador().ver(`/funciones/${funcion.id}/asientos`)).text();

    // Al escribirse este vertical slice la leyenda tenia dos estados, porque todavia no
    // habia forma de tomar un asiento. El vertical slice 2 estreno el amarillo —"los que
    // este cliente esta eligiendo"— y con el, el tercer estado (DISENO.md, PLAN.md).
    const muestras = html.match(/asiento-muestra/g) ?? [];
    assert.equal(muestras.length, 3, 'la leyenda debe tener exactamente tres estados');
    assert.match(html, /Disponible/);
    assert.match(html, /Los estás eligiendo/);
    assert.match(html, /No disponible/);
  } finally {
    await app.cerrar();
  }
});

test('el mapa de una funcion que no existe avisa en vez de romperse', async () => {
  const app = await levantarApp();
  try {
    const respuesta = await app.navegador().ver('/funciones/9999/asientos');
    assert.equal(respuesta.status, 404);
  } finally {
    await app.cerrar();
  }
});

// ---------------------------------------------------------------------------
// Persistencia: la cartelera vive en SQLite, no en la memoria del servidor
// ---------------------------------------------------------------------------

test('la cartelera cargada sigue estando despues de reiniciar el servidor', async () => {
  const primera = await levantarApp();
  const ruta = primera.ruta;
  try {
    const salaGrande = primera.db.prepare('SELECT id FROM salas WHERE capacidad = 120').get();
    const personal = primera.navegador();
    await personal.ingresar(CUENTAS.administracion);
    await personal.enviar('/personal/cartelera', {
      pelicula: 'Sobrevive al reinicio',
      sala_id: salaGrande.id,
      fecha: '2026-08-17',
      hora: '19:45',
      formato: 'subtitulada',
    });
  } finally {
    await primera.cerrar({ borrarArchivo: false });
  }

  // Se apaga el servidor y se levanta uno nuevo sobre el mismo archivo, sin volver a sembrar.
  const segunda = await levantarApp({ ruta, sembrar: false, hoy: JUEVES_DE_PRUEBA });
  try {
    const html = await (await segunda.navegador().ver('/?dia=2026-08-17')).text();
    assert.match(html, /Sobrevive al reinicio/, 'la funcion cargada antes del reinicio deberia seguir ahi');
  } finally {
    await segunda.cerrar();
  }
});
