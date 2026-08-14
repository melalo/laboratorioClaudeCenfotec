# Bitácora — Caso práctico 4: prototipo del Cine Variedades

Registro fechado de las decisiones tomadas y su justificación, los encargos que resultaron
determinantes, y los momentos en que se corrigió el rumbo del agente. Incluye, marcadas como
**entradas de gobernanza**, las afirmaciones falsas del agente que se detectaron durante la
construcción: qué afirmó, cómo se detectó, y qué control quedó establecido.

## Declaración de supervisión

- **Se revisa siempre:** cada decisión que cambie lo que el sistema hace o cómo se ve, antes de
  que quede tomada. Ninguna se toma en silencio: toda restricción o supuesto que se adopta queda
  escrito como decisión, con su razón, en `ESPECIFICACION.md` o `DISENO.md`.
- **Se delega sin revisión previa** (pero se lee y se prueba después): la redacción de los
  documentos y el código que implementa lo ya decidido.
- **Cómo se detecta una afirmación falsa del agente:** contrastando lo que el agente dice haber
  hecho contra el resultado real — releer el archivo, correr la comprobación, abrir la aplicación
  en el navegador. Ninguna afirmación de "funciona" se acepta sin la salida que la respalde.

## Entradas

### 2026-08-13 — Vertical slice 1: cartelera y mapa de asientos

**Encargo determinante:** a mitad de la sesión, la estudiante aportó `VISUALS.md`, un sistema de
diseño completo (paleta oscura, tres tipografías, escala de espaciado, formas y componentes) que
no existía cuando se escribieron `ESPECIFICACION.md` y `DISENO.md`. Pasó a ser la fuente del
estilo, y obligó a revisar decisiones ya tomadas sobre la apariencia.

**Decisiones tomadas y su justificación:**

*Sobre la construcción del vertical slice 1:*
- **SQLite a través del módulo `node:sqlite` incluido en Node.js 24**, en vez de un paquete
  externo. El motor sigue siendo SQLite real, como exige la consigna, pero no hay que instalar ni
  compilar nada — en Windows los paquetes externos de SQLite suelen requerir herramientas de
  compilación.
- **Contraseñas cifradas con scrypt** (`node:crypto`), no guardadas legibles, aunque sean
  inventadas. No agrega dependencias.
- **Forma de las salas:** Sala 1 con 10 filas (A–J) de 12 asientos, Sala 2 con 6 filas (A–F) de
  10. La especificación fijaba la capacidad (120 y 60) pero nunca la forma.
- **Los afiches se guardan como archivo** en `datos/afiches/`, con solo el nombre en la base.
  Guardar imágenes dentro de SQLite infla la base y complica las copias.
- **RN-15 no se hace cumplir por software:** el sistema deja cargar dos películas en la misma
  sala. Impedirlo obligaría a inventar mensajes de error y a decidir qué pasa con las funciones ya
  vendidas de la película anterior. La pantalla, en cambio, no se rompe si ocurre.

*Sobre la apariencia, tras incorporar `VISUALS.md`:*
- **Pico.css se conserva como base y se re-configura** con las variables de `VISUALS.md`, en vez
  de descartarlo. `VISUALS.md` define colores, tipografías y formas, pero no cómo se comporta un
  campo de texto, un selector de fecha o una tabla; Pico sigue haciendo ese trabajo, ya pintado
  con la paleta del cine.
- **Las tres tipografías se guardan dentro del proyecto** (`public/fonts/`, 5 archivos, ~92 KB,
  licencia OFL-1.1), no se traen de Google Fonts. Mismo criterio que con Pico.css: la aplicación
  se ve igual sin conexión.
- **Modo oscuro fijo**, sin seguir la preferencia del sistema operativo, porque `VISUALS.md` no
  define una paleta clara.
- **La marca "Cine Variedades" a 28px**, un valor que `VISUALS.md` no define (define 20px y 32px
  para títulos).
- **El acceso del personal se movió al pie de página.** La cartelera es la pantalla del cliente;
  el acceso del personal no debe competir ahí con la marca ni con las funciones. Una vez adentro,
  el encabezado sí muestra la cuenta, porque de eso dependen los permisos.
- **Abajo de 480px la tarjeta se apila** (afiche arriba a lo ancho, textos debajo); de 480px en
  adelante el afiche va al lado. `VISUALS.md` pide que en móvil todo se reacomode en una columna.

*Sobre lo que se dejó explícitamente fuera:*
- **Asientos fuera de servicio — fuera de alcance, por escrito.** La estudiante recordaba una
  regla sobre butacas deshabilitadas en la sala pequeña. Se buscó en las dos consignas, en el
  `PROMPT.md`, en los documentos congelados del Caso práctico 3 y en todo el repositorio: no
  existe. Quedó anotado como fuera de alcance en `ESPECIFICACION.md` para que no vuelva a
  discutirse como un hueco silencioso.

**Hallazgos: tres datos del negocio que nunca habían llegado a la especificación.** Los tres
estaban en la consigna original del Caso práctico 3 y se incorporaron hoy:

1. **La semana del cine va de jueves a miércoles**, porque los estrenos entran los jueves. Lo
   aportó la estudiante de memoria al preguntarle qué era "la semana vigente"; después se confirmó
   textualmente en la consigna. Como consecuencia, toda semana vigente contiene exactamente un
   miércoles — el día del descuento de RN-2.
2. **El cine programa entre tres y cuatro funciones diarias en cada sala**, así que una cartelera
   semanal tiene entre 42 y 56 funciones, no tres.
3. **Cada sala proyecta una sola película en toda la semana** (RN-15). Antes de adoptarlo se
   verificó, a pedido de la estudiante, que ninguna consigna exigiera un número mínimo de
   películas. No lo exige.

**Correcciones de rumbo:**
- **El agente construyó la cartelera con tres funciones en total.** El plan pedía como
  comprobación "al menos 2 películas y 3 funciones" —un mínimo para verificar— y el agente sembró
  exactamente ese mínimo, presentando el vertical slice como cerrado. La estudiante notó que una
  cartelera real no se ve así. De ahí salió el hallazgo 2.
- **Estados del mapa de asientos: tres → dos → tres, con otro significado.** El agente adoptó el
  semáforo de tres colores de `VISUALS.md` (verde / amarillo "reservado por otro" / gris). La
  estudiante lo corrigió a dos estados, porque a quien mira le da igual si un asiento está
  reservado o vendido: no lo puede elegir. Más tarde volvió sobre el tema y reintrodujo el
  amarillo, pero con un significado **distinto** al de `VISUALS.md`: *lo que este cliente está
  eligiendo ahora*. Quedó escrito así, señalando la diferencia con `VISUALS.md` a propósito. El
  comportamiento se construye en el vertical slice 2.
- **Cuatro películas → dos.** El agente había propuesto cuatro películas rotando entre salas y
  días. La estudiante pidió algo más simple y fiel al negocio: una película por sala.
- **Los horarios dejaron de ser botones con recuadro.** El agente los había dibujado como cajas;
  la estudiante pidió solo la hora, en texto, con la etiqueta de doblada o subtitulada más chica.
- **La cartelera pasó a verse un día a la vez**, con un desplegable de días, a pedido de la
  estudiante. Se construyó sin nada de JavaScript: el día viaja en la dirección de la página, así
  que la pantalla se puede compartir por enlace.
- **El desplegable duró poco: los días pasaron a una fila, todos a la vista.** La estudiante
  encontró una cartelera de cine real y prefirió su distribución. Se tomó **solo la distribución**:
  quedaron afuera el buscador, los filtros y los datos que el sistema no guarda (género, duración,
  clasificación, sinopsis), porque agregarlos significaba cambiar la especificación y el modelo de
  datos, y ninguna consigna los pide. Antes de decidirlo se le expuso el costo: cada vuelta más
  sobre el vertical slice 1 retrasa los slices 2 y 3, que son los que faltan para poder entregar.
  De paso, agrupar los horarios por formato resolvió mejor un pedido anterior de la estudiante: la
  etiqueta "Subtitulada" aparece ahora una vez por grupo en lugar de pegada a cada hora.
- **La estudiante ajustó directamente el ritmo base de la hoja de estilos** de 8px a 16px. Se
  respetó sin revertirlo.

**Entradas de gobernanza:**

- **El agente reportó como resultado de la aplicación en marcha una salida que venía de un
  servidor viejo.** Al verificar un cambio en la cartelera, el agente consultó la aplicación y
  concluyó que el cambio no se había aplicado. En realidad, un proceso anterior del servidor había
  sobrevivido al intento de apagarlo y seguía respondiendo en el mismo puerto con el código
  anterior. **Cómo se detectó:** el agente comparó la hora de modificación de los archivos de
  código contra la hora de arranque del proceso que estaba respondiendo, y vio que el proceso era
  13 minutos anterior a los archivos. **Control que quedó establecido:** antes de dar por buena una
  verificación contra la aplicación en marcha, confirmar que el proceso que responde arrancó
  *después* del último cambio de código; y al reiniciar, comprobar que no queda ningún proceso
  vivo, en vez de asumir que el pedido de apagado bastó. Ocurrió dos veces antes de establecerse
  el control.

**Estado al cierre de la sesión:** vertical slice 1 cerrado, con **44 comprobaciones automatizadas**
que pasan y su evidencia anotada en `PLAN.md`. La comprobación de "arrancar desde cero siguiendo
únicamente el `README.md`" se volvió a correr al final, ya con todas las dependencias, tipografías
y afiches que se fueron sumando durante el día. El trabajo quedó en dos commits: uno con el slice
cerrado y otro con el ajuste de la cartelera a la fila de días. Los vertical slices 2 y 3 quedan
pendientes: la consigna exige al menos tres piezas cerradas.

---

### 2026-08-14 — Vertical slice 2: reserva temporal de asiento

**Encargo de la sesión:** continuar el prototipo construyendo el vertical slice 2, revisando antes
todo lo que ya había. Conversación propia, como exige la consigna: un vertical slice por
conversación.

**Cómo arrancó.** Antes de tocar nada se revisó la carpeta entera y se buscó, en
`ESPECIFICACION.md`, `DISENO.md`, `PLAN.md`, `VISUALS.md` y `PROMPT.md`, todo lo que este slice
necesitaba. Aparecieron **siete decisiones que ningún documento resolvía**. Dos se le preguntaron a
la estudiante, porque cambian lo que se ve en pantalla y lo que hay que defender; las otras cinco
las tomó el agente y quedaron escritas con su razón en `DISENO.md`, **antes** de escribir código.

**Decisiones tomadas por la estudiante:**

- **El mapa se elige con casillas de verificación, no con enlaces.** Cada butaca libre es una
  casilla disfrazada de butaca: al marcarla se pone amarilla sola, con puro CSS. Se descartó que
  cada asiento fuera un enlace que reservara en el acto, porque RF-3 pide elegir *uno o más*
  asientos y hacerlo de a uno obligaba a una ida y vuelta al servidor por butaca.
- **Después de reservar, una pantalla propia de la reserva**, no un aviso sobre el mapa. Es donde
  el vertical slice 3 va a colgar el pago, así que no habrá que rehacerla.
- **El plazo de la reserva bajó de 5 a 3 minutos**, a pedido de la estudiante, "en todo lugar".
  Antes de cambiarlo se verificó que fuera legítimo: ni `PROMPT.md` ni la consigna fijan minutos, y
  `DISENO.md` lo registraba como elección propia entre 5, 10 y 15. Se propagó a `DISENO.md`,
  `PLAN.md` —incluido el vertical slice 3, que también decía 5— y `SEGUIMIENTO.md`.

**Corrección de rumbo: el contador regresivo que no se hizo.** La estudiante pidió un conteo
regresivo con los minutos bajando. El agente no lo construyó de una: un conteo que se mueve exige
JavaScript, y hasta acá el prototipo no usa una sola línea, así que se le expuso el choque con la
decisión escrita y se le ofrecieron tres salidas. Eligió **una barra que se vacía sola con una
animación de CSS**, más la hora exacta de vencimiento en texto. La racha de cero JavaScript se
mantiene, y hay una comprobación que fija que esa pantalla no traiga ninguna etiqueta `<script>`.

**Decisiones tomadas por el agente, escritas en `DISENO.md`:** que reservar de nuevo en la misma
función **reemplace** la reserva anterior y libere lo que el cliente soltó; que las reservas venzan
**al consultar el mapa** y no con un proceso en segundo plano; que la carrera entre dos clientes se
resuelva con una **transacción** de SQLite y no con un índice único —porque "ocupado" depende del
estado de la compra *y* del tiempo transcurrido, y un índice no puede consultar la hora—; que el
amarillo cubra tanto el asiento recién marcado como el que este cliente ya tiene reservado; y que
la tabla de Compras se cree con **solo los campos que este slice usa**.

**Cómo se construyó.** Primero los documentos, después las comprobaciones, y solo entonces el
código. Las 23 comprobaciones del slice se escribieron antes que nada y **se las vio fallar** —el
módulo que iban a probar todavía no existía—, que es lo que demuestra que comprueban algo de
verdad.

**Entradas de gobernanza:**

- **El control establecido ayer funcionó.** Al ir a hacer la comprobación a mano, el puerto 3000
  estaba ocupado por un servidor arrancado **el 13 de agosto a las 18:09**, de la sesión anterior.
  El primer pedido devolvió el mapa sin casillas, o sea el código viejo. En vez de concluir que el
  código estaba mal, el agente aplicó el control que había quedado escrito: verificó la fecha de
  arranque del proceso antes de sacar ninguna conclusión, y rehizo la comprobación levantando su
  propio servidor en un puerto libre. **Refuerzo del control:** las comprobaciones contra la
  aplicación en marcha se hacen desde ahora en un puerto libre y con base propia, en vez de contra
  el servidor del puerto 3000, para que un proceso viejo no pueda contaminar el resultado.

**Estado al cierre de la sesión:** vertical slice 2 cerrado, con **67 comprobaciones automatizadas**
que pasan —44 del slice 1, una de ellas corregida, y 23 nuevas— más la comprobación a mano del
plazo con el reloj de verdad, cuya salida quedó anotada en `PLAN.md`. Falta el **vertical slice 3**
para llegar a las tres piezas cerradas que exige la consigna.
