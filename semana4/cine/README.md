# Cine Variedades — prototipo del sistema de venta de boletos

Prototipo del sistema de venta de boletos del Cine Variedades, construido por *vertical slices*
sobre `../ESPECIFICACION.md`, `../DISENO.md` y `../PLAN.md`. El aspecto de las pantallas lo manda
`../VISUALS.md`.

**Todos los datos son inventados.** No hay personas, negocios ni credenciales reales, y el pago
está simulado: el sistema nunca se conecta a ningún medio de pago.

## Qué hace hoy

Lo construido hasta ahora son los **vertical slices 1, 2 y 3**: con eso, un cliente puede
comprar su boleto de punta a punta, sin cuenta, desde la cartelera hasta el código de
confirmación.

**Vertical slice 1 — Cartelera y mapa de asientos:**

- El cliente, **sin cuenta**, ve la cartelera **un día a la vez**: los siete días de la semana
  están en fila arriba, elige uno con un clic, y ve para ese día cada sala con su película, su
  afiche y los horarios. Desde ahí entra al mapa de asientos de cualquier función.
- El personal entra con **nombre de usuario y contraseña**, desde el enlace del pie de página.
- Solo una cuenta con rol de **administración** puede cargar la cartelera de la semana y subir el
  afiche de cada película; la cuenta de **taquilla** no puede.

**Vertical slice 2 — Reserva temporal de asiento:**

- En el mapa, el cliente **marca los asientos que quiere** y se le ponen **amarillos**. Cada
  butaca libre es una casilla de verificación, así que marcar y desmarcar no le pide nada al
  servidor: es el propio navegador el que las pinta, con CSS.
- Al apretar **Reservar**, esos asientos quedan tomados **3 minutos**. Cualquier otro cliente que
  mire el mismo mapa los ve **en gris**, igual que un asiento vendido.
- El cliente pasa a la pantalla de su reserva: película, sala, horario, sus asientos, la hora en
  que vencen y una barra que se va vaciando.
- Si pasan los 3 minutos sin pagar, los asientos **vuelven a estar disponibles** solos.
- Si dos clientes eligen el mismo asiento casi al mismo tiempo, **uno lo consigue** y al otro se
  le avisa y se le muestra el mapa actualizado.

**Vertical slice 3 — Compra en línea completa:**

- En la pantalla de la reserva, el cliente escribe su **nombre** y su **número de identificación**.
  No se crea ninguna cuenta: el dato sirve para que taquilla lo reconozca si pierde su código.
- Reparte sus asientos entre **entrada regular** y **estudiante** en una tabla con contador, como
  la de una boletería: cada fila muestra su precio, su cantidad y su subtotal, y abajo el total.
  Las dos filas siempre suman los asientos que ya eligió en el mapa, así que subir una baja la
  otra y no se puede pasar del límite. Así ve lo que va a pagar **antes** de pagarlo.
- **Los miércoles la tabla tiene una sola fila y no hay contador**, porque ese día todos los
  boletos pagan la mitad y declararse estudiante no cambiaría nada (el 50% le gana al 30% y no se
  acumulan). Un mensaje lo explica, para que la fila única no parezca un error.
- Ese contador es la única parte de la aplicación con JavaScript, y **funciona igual sin él**:
  cada `−` y `+` es un botón de envío de verdad, así que si el navegador no ejecuta nada, el
  servidor recalcula y devuelve la pantalla. El JavaScript solo evita la recarga.
- El precio sale de `config.json`: **₡4.000** el boleto, **mitad** los miércoles y **30% menos**
  para estudiantes. Si los dos descuentos le tocan al mismo boleto se aplica solo el mayor, sin
  sumarse — o sea que un miércoles todos pagan la mitad, sean estudiantes o no.
- Al apretar **Pagar**, la compra queda registrada como pagada —el pago es simulado— y el cliente
  recibe su **código de confirmación** (`CV-7K3M9Q`), con la película, la sala, el horario y sus
  asientos. Esa pantalla se puede volver a abrir: no hay boleto impreso, es su único comprobante.
- Un asiento **vendido no vuelve a liberarse nunca**, a diferencia de una reserva sin pagar.
- Si se pasaron los 3 minutos, ya no se puede pagar: hay que elegir asientos de nuevo.

Falta la venta en taquilla (vertical slice 4), recuperar una compra por identificación
(vertical slice 5), cancelar funciones (6) y los reportes (7 y 8).

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

El comando **también borra las compras**. Tiene que hacerlo: una compra apunta a una función, así
que no se pueden recrear las funciones dejando compras viejas colgando de ellas.

### Un detalle sobre las fechas

La semana del cine va de **jueves a miércoles**, porque los estrenos entran los jueves
(`../ESPECIFICACION.md`, glosario "Cartelera"). Los datos de prueba llenan **los siete días** de
esa semana, así que algunas funciones ya habrán pasado según el día y la hora en que corras el
comando: el cliente solo ve y compra las que todavía no empezaron.

Si recreás los datos un miércoles por la noche, cuando la semana ya se está terminando, puede que
no quede ninguna función futura. En ese caso el comando te avisa en la terminal y te dice qué
hacer.

## Cómo correr las comprobaciones

```bash
npm test
```

Corre las comprobaciones de los vertical slices 1, 2 y 3 —**94 en total**—: levanta el servidor de
verdad y una base SQLite de verdad en un archivo temporal, y revisa cada condición del plan. No
toca tu base de datos. Tardan alrededor de un minuto.

Las del vencimiento de la reserva **no esperan 3 minutos**: le restan minutos a la fecha de la
reserva dentro de la base, que es la forma de comprobar el plazo sin que las comprobaciones tarden
una eternidad. Que el plazo también funcione con el reloj de verdad se comprobó a mano, y quedó
anotado en `../PLAN.md`.

## Qué hay en cada carpeta

```
cine/
  config.json          configuración: puerto, dónde vive la base, y el precio y los descuentos
  src/                 el código
    index.js           arranca el servidor
    servidor.js        atiende los pedidos del navegador
    vistas.js          arma las pantallas (HTML)
    base-de-datos.js   abre SQLite y crea las tablas
    datos-de-prueba.js borra y recrea los datos de prueba
    reservas.js        decide si un asiento está libre, toma las reservas y cobra el pago
    precios.js         el precio de cada boleto y el código de confirmación
    semana.js          la regla de "la semana vigente" (jueves a miércoles)
    contrasenas.js     cifra y verifica las contraseñas del personal
  public/css/          las hojas de estilo (Pico.css + la propia del cine)
  public/fonts/        las tipografías, guardadas acá para no depender de internet
  public/images/       el logo de la marca (logo.webp)
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

### Qué se rompe si alguna desaparece

Ninguna de estas dependencias es difícil de reemplazar, y **cuatro de las siete ya están copiadas
dentro del proyecto**, así que si el paquete original desapareciera de internet la aplicación
seguiría funcionando igual.

| Dependencia | Qué queda atado a ella | Qué pasa si desaparece |
|---|---|---|
| Express | Todo el servidor: `src/servidor.js` está escrito con su forma de declarar rutas | Es lo más atado de todo. Habría que reescribir `servidor.js` con otro servidor (el propio `node:http`, o Fastify). Las pantallas, el cálculo de precios y la base **no** se tocarían: viven en archivos aparte |
| express-session | Solo dos líneas de `servidor.js`, y el objeto `req.session` que usan la reserva y el ingreso del personal | Se reemplaza por una cookie firmada escrita a mano con `node:crypto`. Es lo que se descartó al elegirlo, así que la salida ya está pensada |
| multer | Solo la subida del afiche, en `servidor.js` | Se cae la carga de imágenes; el resto del sistema sigue igual. El afiche es opcional (RF-12), así que la cartelera se seguiría cargando sin él |
| Pico.css | El aspecto de campos, botones y tablas | **Nada se rompe**: el archivo está copiado en `public/css/`. Y ya está decidido sacarlo al cerrar el vertical slice 8, reemplazándolo por CSS propio (`../DISENO.md`) |
| Manrope, Work Sans, JetBrains Mono | El aspecto de los textos | **Nada se rompe**: los `.woff2` están copiados en `public/fonts/`. Si faltaran, el navegador usaría la tipografía de reserva que declara la hoja de estilos |

Lo que **no** está atado a ninguna dependencia externa: la base de datos (`node:sqlite`), el cifrado
de contraseñas y los códigos de confirmación (`node:crypto`), y las comprobaciones (`node:test`).
Los tres vienen dentro de Node.js.

Estas piezas vienen **incluidas en Node.js**, así que no son dependencias que haya que instalar,
pero conviene saber que se usan:

| Módulo de Node.js | Para qué |
|---|---|
| `node:sqlite` | El motor de base de datos SQLite |
| `node:crypto` | Cifrar las contraseñas del personal (scrypt) y sortear los códigos de confirmación |
| `node:test` | Correr las comprobaciones |
