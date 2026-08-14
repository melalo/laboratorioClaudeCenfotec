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

### 2026-08-14 (tarde) — Vertical slice 3: compra en línea completa

**Encargo:** construir el vertical slice 3 del `PLAN.md`, que es el que convierte una reserva
temporal en una compra pagada con su código de confirmación.

**Tres datos del negocio que no existían en ningún documento, y que se preguntaron en vez de
inventarse.** El agente los buscó primero en `PROMPT.md`, en la consigna, en `ESPECIFICACION.md`,
en `DISENO.md`, en `PLAN.md` y en `SEGUIMIENTO.md`, y no estaban en ninguno:

- **Cuánto vale la entrada.** RN-1 decía que hay un precio base igual para todas las funciones,
  pero nunca cuál. La estudiante fijó **₡4.000**.
- **Qué forma tiene el código de confirmación.** RF-10 lo exigía sin decir cómo se ve. Se eligió
  **`CV-XXXXXX`**, descartando un número corrido —cualquiera probaría el de al lado y vería la
  compra ajena— y un identificador largo de máquina, imposible de dictar por teléfono.
- **A cuántos asientos alcanza el descuento de estudiante.** Se le ofrecieron tres opciones con su
  costo. Eligió **preguntar cuántos** de los asientos son de estudiante.

**Corrección del propio agente al plantear esa tercera pregunta.** La primera vez la formuló sin
haber leído RN-5, que pone la verificación del carné **en la puerta de la sala**. Ese dato cambia
el análisis por completo: el sistema no necesita vigilar que nadie declare de más, porque el cine
ya lo resuelve al entrar, cobrando la diferencia. La estudiante pidió que se la volviera a hacer,
y el agente la rehízo con ese dato a la vista y con el costo real de cada opción. Sin esa
corrección, la decisión se habría tomado sobre una premisa incompleta.

**Lo que esa decisión obligó a corregir antes de escribir código.** Si una compra puede llevar
boletos de estudiante y boletos sin descuento, el descuento y el precio dejan de ser datos de la
compra. Se corrigieron primero los documentos y después el código, en ese orden: `ESPECIFICACION.md`
(RF-5, REG-1, RN-3 y RN-4), `DISENO.md` (aparece la entidad **Boleto** en el modelo de datos) y
`PLAN.md` (las condiciones y comprobaciones del slice, reescritas antes de construir).

**Diez decisiones nuevas escritas en `DISENO.md` antes de construir.** Ninguna se dio por supuesta:
el precio base y la moneda; cómo se declaran los estudiantes; a qué boletos va el descuento cuando
no alcanza para todos; el redondeo al colón; la forma del código; qué pasa al volver a una compra
ya pagada; qué se valida del nombre y la identificación; que la disponibilidad cuente también las
compras pagadas; dónde vive la entidad Boleto en la base; y que este slice ya guarde el método de
compra "en línea", porque RN-8 lo exige de toda compra.

**El desglose, primer intento.** El plan pedía que el cliente viera lo que va a pagar **antes** de
pagarlo, y el total depende de cuántos estudiantes declare. Un total que se actualiza solo exige
JavaScript, y el prototipo no tenía una sola línea. Se resolvió con **botones de opción donde cada
opción muestra su propio total** —"2 boletos de estudiante · 1 × ₡4.000 + 2 × ₡2.800 · ₡9.600"—,
calculados todos por el servidor. Funcionaba, pero crecía de a una línea por asiento. La estudiante
lo vio y pidió otra cosa; ver la entrada siguiente.

**Corrección de rumbo: la regla de "cero JavaScript" no era de nadie.** Al revisar la pantalla, la
estudiante trajo el ejemplo de una boletería de cine real —una tabla con Tipo, Precio, Cantidad y
Subtotal, y un contador `− 0 +`— y pidió esa forma. El agente le expuso que un contador instantáneo
necesita JavaScript y que eso chocaba con la regla del proyecto. **Ella preguntó de dónde salía esa
regla: si la pedía la consigna o la había decidido ella.** Al buscarla apareció que no salía de
ninguno de los dos:

- `consigna-semana4.txt` no la menciona. Solo fija que la base sea un motor real y que *"cambiar
  una tecnología requiere actualizar primero `DISENO.md`, con la razón del cambio"*.
- `PROMPT.md` no la menciona.
- La decisión escrita en `DISENO.md` dice *"HTML simple, **sin herramientas de compilación**"*, que
  no es lo mismo: unas líneas escritas dentro de la página no compilan nada.

O sea que **el agente había estirado esa decisión más de lo que decía**, la había repetido como
razón en tres decisiones posteriores, y con ella había descartado dos cosas que la estudiante había
pedido: el conteo regresivo del vertical slice 2 y ahora el contador. La pregunta de la estudiante
fue lo que lo destapó. Quedó escrita la decisión nueva —JavaScript sí, dentro de la página, sin
librerías ni compilación— con una frontera que sí importa: **el navegador nunca decide nada que
importe**; el precio, la disponibilidad y el vencimiento los resuelve siempre el servidor. Hay una
comprobación que lo fija, mandando un pago con precios inventados.

**Y se usó lo mínimo.** El agente ofreció además revisar las otras pantallas donde la regla había
hecho elegir peor. La estudiante decidió **conservar la barra del plazo** —el vertical slice 2 ya
estaba cerrado y no valía la pena reabrirlo por eso— y que el permiso se usara **solo** en la
tabla. La pantalla de confirmación quedó sin nada de JavaScript, con una comprobación que lo fija:
es el único comprobante del cliente y no puede depender de que el navegador ejecute algo.

**La tabla funciona sin JavaScript también.** Cada `−` y `+` es un botón de envío de verdad, con su
propia dirección: si el navegador no ejecuta nada, el servidor recalcula y devuelve la pantalla. El
JavaScript solo ataja el clic para evitar la recarga. Ningún botón queda muerto. Las dos formas se
comprobaron a mano.

**Diferencia con el ejemplo de la boletería, aclarada con la estudiante.** En una boletería la
cantidad decide cuántas entradas se compran; acá los asientos ya se eligieron en el mapa, así que
el total está fijo y la tabla solo los **reparte**. Fue la propia estudiante quien propuso
resolverlo así —"el contador limitado a la cantidad de asientos que eligió antes"— para no tener
que cambiar nada del recorrido de los vertical slices 1 y 2.

**Un defecto viejo que este slice sacó a la luz.** Verificando el arranque desde cero se descubrió
que `npm run datos-de-prueba` **fallaba** si ya había alguna compra: el comando borra las funciones
y una compra apunta a una función. Venía roto desde el vertical slice 2, que creó la tabla de
compras, pero solo se notaba si alguien había reservado antes de volver a sembrar; este slice lo
hizo mucho más probable, porque una compra pagada ya no desaparece sola. Se escribió la
comprobación, se la vio fallar, y recién entonces se arregló.

**Correcciones a documentos anteriores de la misma carpeta,** aplicadas por la regla de propagar
hacia atrás: `ESPECIFICACION.md` RF-1 todavía decía que el día se elige "en una lista desplegable",
cuando el vertical slice 1 terminó con los siete días en fila; y el `README.md` describía unos
datos de prueba de "tres funciones" que hace dos revisiones son 42.

**Cómo se construyó.** Documentos primero, después las comprobaciones, y solo entonces el código.
Las 22 comprobaciones iniciales se escribieron antes que nada y se las vio fallar: **21 de 22**. La
única que pasaba de entrada era la que exige que estas pantallas no traigan JavaScript, cierta de
antemano porque no había ninguna línea en toda la aplicación; se dejó igual, como red de seguridad.
La comprobación 23 es la del comando de datos de prueba, y también se la vio fallar primero.

**Segunda corrección sobre la tabla: los miércoles no se pregunta.** Con la tabla ya funcionando,
la estudiante la miró en una función de miércoles y señaló que era confusa: los dos contadores
estaban ahí, invitando a elegir, pero mover cualquiera de los dos **no cambiaba ni un colón**,
porque el 50% del día le gana al 30% del estudiante y no se acumulan (RN-4). Tenía razón: mostrar
un control que no hace nada es peor que no mostrarlo, porque hace dudar de si uno se equivocó. Se
le ofrecieron tres formas y eligió **la misma tabla con una sola fila**, sin contador, y el mensaje
que explica por qué. Dos cosas quedaron escritas antes de construir:

- La condición no es "es miércoles" sino "**el descuento de estudiante cambiaría algún precio**".
  Escrita así, la pantalla sigue siendo correcta si alguna vez se ajustan los porcentajes en
  `config.json` y el de estudiante pasa a ganarle al del día.
- La consecuencia para el vertical slice 7: como esos días no se pregunta, toda compra de un
  miércoles queda con **0 boletos de estudiante**. El agente lo planteó **antes** de construir y la
  estudiante lo aprobó sabiendo el costo. Significa "no se preguntó", no "no fueron estudiantes", y
  así quedó en `DISENO.md` y en `SEGUIMIENTO.md` para que dentro de tres slices nadie lea ese cero
  al revés.

También se corrigieron dos textos de esa pantalla a pedido de la estudiante: el aviso del carné
pasó a "Carné de estudiante se debe presentar a la entrada", y a la nota del número de
identificación se le quitó la aclaración de que no se crea ninguna cuenta.

**Retoques visuales pedidos por la estudiante, con la aplicación ya funcionando.** Se sacó de la
app el aviso "el pago es simulado" —tanto el del formulario como el del pie—, porque es
información para nosotros y no para el cliente; sigue documentado en `ESPECIFICACION.md`,
`DISENO.md` y el `README.md`, así que no se pierde nada de la defensa. Se reemplazaron dos verdes
de la paleta en `VISUALS.md`, `DISENO.md` y la hoja de estilos. El código de confirmación, su
rótulo y el borde de **su** caja pasaron a ese verde, dejando en gris las demás fichas de la misma
pantalla para que el verde señale una sola cosa. Y se agregó el logo del cine al lado del nombre,
copiado a `cine/public/images/` con el mismo criterio que las tipografías y Pico: lo que la
aplicación necesita para verse bien vive dentro de la aplicación.

**Pico.css: preguntado, medido, y con fecha de salida.** La estudiante preguntó si Pico sigue
haciendo falta ahora que `VISUALS.md` manda el aspecto. Antes de opinar se midió: Pico pesa 81 KB
contra 26 KB del CSS propio, se le reasignan 47 variables a los valores de `VISUALS.md`, y hoy
viste 11 campos de texto, 11 etiquetas, 6 botones, 5 formularios y 4 tablas sin que se les ponga
un nombre de estilo. Con eso a la vista se le explicó que son capas distintas —un documento de
decisiones no es código— y se le ofrecieron tres caminos con su costo. Eligió **sacarlo al cerrar
el vertical slice 8**, no antes, porque los slices 4 a 8 son los que traen más formularios y
tablas. Quedó escrito en `DISENO.md` con su razón y en `SEGUIMIENTO.md` como deuda asumida con
fecha, no como algo que se dio por bueno.

**Entradas de gobernanza:**

- **El control del puerto se aplicó solo, sin que hiciera falta recordarlo, y volvió a hacer
  falta.** La comprobación a mano se hizo desde el principio levantando un servidor propio en un
  puerto libre y con base propia, que es el refuerzo que había quedado escrito ayer. Más tarde, al
  ir a mostrarle la aplicación a la estudiante, **apareció el problema por tercera vez**: en el
  puerto 3000 había un servidor arrancado a las 12:41, anterior al código del slice 3, que
  respondía la pantalla de pago sin la tabla de boletos. Se detectó comparando la hora de arranque
  del proceso contra la de los archivos —13:30 a 13:34— antes de sacar ninguna conclusión, y se
  reinició. Si no se hubiera hecho, la estudiante habría visto la pantalla vieja y habría concluido
  que lo construido no funcionaba.
- **Una regla inventada por el agente, detectada por la estudiante.** Durante tres sesiones el
  agente sostuvo que el prototipo "no usa JavaScript" como si fuera una restricción del proyecto, y
  la usó para descartar dos pedidos concretos de la estudiante. No era una restricción de nadie:
  era una decisión propia del agente, estirada de una que decía otra cosa, y nunca marcada como
  tal. **Se detectó porque la estudiante preguntó de dónde salía**, en vez de aceptarla. **Control
  que queda establecido:** cuando el agente invoque una regla para descartar algo que se pide, la
  regla se cita con su fuente exacta —consigna, `PROMPT.md` o la fila de `DISENO.md`— **en el mismo
  momento**, y si la fuente no dice literalmente eso, se dice que es una decisión del agente y se
  ofrece cambiarla.
- **Nada se afirmó sin la salida que lo respalde.** Cada resultado anotado en la evidencia de
  `PLAN.md` —los totales, el código `CV-687Q2F`, los estados 400/404/409, el desglose de las dos
  funciones, la migración de la base real— viene de una corrida real cuya salida se leyó. La
  migración se verificó además sobre la base que ya existía en la carpeta, con 42 funciones y 3
  compras adentro, y no solo sobre bases de prueba recién creadas.

**Estado al cierre de la sesión:** vertical slice 3 cerrado, con **94 comprobaciones automatizadas
que pasan** —67 de los slices 1 y 2, una de ellas corregida, y 27 nuevas— más el recorrido completo de
compra hecho a mano contra la aplicación en marcha, con su salida anotada en `PLAN.md`. Con esto
son **tres piezas cerradas**, que es lo mínimo que exige la consigna.
