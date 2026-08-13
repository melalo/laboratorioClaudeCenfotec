# Cine Variedades — prototipo del sistema de venta de boletos

Prototipo del sistema de venta de boletos del Cine Variedades, construido por *vertical slices*
sobre `../ESPECIFICACION.md`, `../DISENO.md` y `../PLAN.md`. El aspecto de las pantallas lo manda
`../VISUALS.md`.

**Todos los datos son inventados.** No hay personas, negocios ni credenciales reales, y el pago
está simulado: el sistema nunca se conecta a ningún medio de pago.

## Qué hace hoy

Lo construido hasta ahora es el **vertical slice 1: Cartelera y mapa de asientos**.

- El cliente, **sin cuenta**, ve la cartelera **un día a la vez**: elige el día en una lista
  desplegable y ve, para ese día, cada sala con su película, su afiche y los horarios. Desde ahí
  entra al mapa de asientos de cualquier función.
- El personal entra con **nombre de usuario y contraseña**, desde el enlace del pie de página.
- Solo una cuenta con rol de **administración** puede cargar la cartelera de la semana y subir el
  afiche de cada película; la cuenta de **taquilla** no puede.

Todavía no se puede reservar ni comprar: eso llega en los vertical slices 2 y 3.

## Qué hace falta tener instalado

- **Node.js 24 o superior.** Se descarga de [nodejs.org](https://nodejs.org/es). Para saber qué
  versión tenés, abrí una terminal y escribí `node --version`.

No hace falta nada más: ni base de datos aparte, ni compiladores, ni herramientas de construcción.

## Cómo ponerlo a andar

Parado en esta carpeta (`semana4/cine`), en una terminal:

```bash
npm install              # 1. baja las dependencias (solo la primera vez)
npm run datos-de-prueba  # 2. crea la base de datos y la llena con datos de prueba
npm start                # 3. arranca la aplicación
```

Después abrí el navegador en **http://localhost:3000**.

Para apagarla, volvé a la terminal y apretá `Ctrl + C`.

## Cómo recrear los datos de prueba

```bash
npm run datos-de-prueba
```

Ese comando **borra todo y lo vuelve a crear desde cero**. Sirve cuando quedaste con datos raros
de tanto probar y querés volver al punto de partida. Se puede correr con la aplicación apagada o
encendida; si está encendida, recargá la página del navegador para ver el resultado.

Deja creado:

| Qué | Detalle |
|---|---|
| 2 cuentas de personal | `admin` / `admin123` (rol administración) y `taquilla` / `taquilla123` (rol taquilla) |
| 2 salas | **Sala 1**: 10 filas (A–J) de 12 asientos = 120. **Sala 2**: 6 filas (A–F) de 10 asientos = 60 |
| 180 asientos | Todos los de las dos salas, cada uno con su fila y su número |
| 2 películas | *Sombras en el puerto* en la Sala 1 y *Camino al faro* en la Sala 2, cada una con su afiche. Cada sala proyecta **una sola película** toda la semana (RN-15) |
| 2 afiches | Se copian de `afiches-de-muestra/` a `datos/afiches/`. Son dibujos inventados para este proyecto: **no** son afiches de películas reales. En esa carpeta hay dos dibujos más sin usar, por si querés probar la subida de afiches desde la pantalla de administración |
| 42 funciones | La semana completa: **3 funciones diarias en cada sala**, los 7 días, como programa el cine de verdad. Sala 1 a las 14:00, 17:30 y 20:30; Sala 2 a las 15:00, 18:00 y 21:00. Doblada y subtitulada se van alternando |

El comando imprime en la terminal exactamente qué creó, con las cuentas y cuántas funciones le
tocaron a cada película. También dice cuántas de esas funciones todavía no empezaron: son las que
el cliente puede ver y comprar.

### Un detalle sobre las fechas

La semana del cine va de **jueves a miércoles**, porque los estrenos entran los jueves
(`../ESPECIFICACION.md`, glosario "Cartelera"). Los datos de prueba colocan las tres funciones en
horarios de esa semana **que todavía no pasaron**, empezando por el miércoles.

Si recreás los datos un miércoles por la noche, cuando la semana ya se está terminando, puede que
no quepan tres funciones futuras. En ese caso el comando te avisa en la terminal y te dice qué
hacer.

## Cómo correr las comprobaciones

```bash
npm test
```

Corre las comprobaciones del vertical slice 1: levanta el servidor de verdad y una base SQLite de
verdad en un archivo temporal, y revisa cada condición del plan. No toca tu base de datos.

## Qué hay en cada carpeta

```
cine/
  config.json          configuración: puerto y dónde vive la base de datos
  src/                 el código
    index.js           arranca el servidor
    servidor.js        atiende los pedidos del navegador
    vistas.js          arma las pantallas (HTML)
    base-de-datos.js   abre SQLite y crea las tablas
    datos-de-prueba.js borra y recrea los datos de prueba
    semana.js          la regla de "la semana vigente" (jueves a miércoles)
    contrasenas.js     cifra y verifica las contraseñas del personal
  public/css/          las hojas de estilo (Pico.css + la propia del cine)
  public/fonts/        las tipografías, guardadas acá para no depender de internet
  afiches-de-muestra/  los dos afiches inventados que usan los datos de prueba
  test/                las comprobaciones
  datos/cine.db        la base de datos (se crea sola; no se sube al repositorio)
  datos/afiches/       los afiches que sube administración (tampoco se suben al repositorio)
```

## Dependencias adoptadas

| Dependencia | Versión | Para qué | Repositorio oficial |
|---|---|---|---|
| Express | 5.2.1 | El servidor web: recibe los pedidos del navegador y responde las pantallas | https://github.com/expressjs/express |
| express-session | 1.19.0 | Recuerda que una cuenta de personal ya ingresó, de una pantalla a la otra | https://github.com/expressjs/session |
| multer | 2.2.0 | Recibe el archivo del afiche cuando administración lo sube, y lo guarda en disco con un nombre puesto por el sistema | https://github.com/expressjs/multer |
| Pico.css | 2.1.1 | Base de estilos: da formularios, tablas y botones prolijos sin ensuciar el HTML. Sus colores, tipografías y formas se reasignan a las de `VISUALS.md`. Está **copiada** dentro del proyecto, en `public/css/pico.min.css`, así que la aplicación se ve igual sin conexión | https://github.com/picocss/pico |
| Manrope | 5.3.0 (OFL-1.1) | Tipografía de títulos que pide `VISUALS.md`. Archivo `.woff2` **copiado** en `public/fonts/` | https://github.com/sharanda/manrope |
| Work Sans | 5.3.0 (OFL-1.1) | Tipografía del texto corrido. Archivo `.woff2` **copiado** en `public/fonts/` | https://github.com/weiweihuanghuang/Work-Sans |
| JetBrains Mono | 5.3.0 (OFL-1.1) | Tipografía monoespaciada para datos: horas, capacidades y números de asiento. Archivo `.woff2` **copiado** en `public/fonts/` | https://github.com/JetBrains/JetBrainsMono |

Los archivos `.woff2` de las tres tipografías se tomaron de los paquetes de
[Fontsource](https://github.com/fontsource/font-files) versión 5.3.0, que los empaqueta listos para
usar. Se guardaron solo los 5 grosores que `VISUALS.md` necesita (unos 92 KB en total) y los
paquetes se desinstalaron: por eso no aparecen en `package.json`. Las tres tienen licencia
**OFL-1.1**, que permite redistribuirlas dentro de un proyecto.

Estas piezas vienen **incluidas en Node.js**, así que no son dependencias que haya que instalar,
pero conviene saber que se usan:

| Módulo de Node.js | Para qué |
|---|---|
| `node:sqlite` | El motor de base de datos SQLite |
| `node:crypto` | Cifrar las contraseñas del personal (scrypt) |
| `node:test` | Correr las comprobaciones |
