# Sistema de venta de boletos en línea — Cine Variedades — Diseño

## Panorama de la arquitectura

El sistema es una sola aplicación con tres tipos de acceso: el **cliente** (sin cuenta, desde su
teléfono), el **personal de taquilla** (con cuenta, vende presencial) y el **personal de
administración** (con cuenta, carga la cartelera y cancela funciones). Los tres comparten los
mismos datos en tiempo real — un asiento vendido en taquilla desaparece al instante del mapa que
ve un cliente en línea, y viceversa.

Se eligió esta forma (un solo sistema con roles) en vez de aplicaciones separadas por audiencia
porque es la más simple de las consideradas, cubre lo que pide la especificación, y no agrega
infraestructura ni complejidad operativa que un cine de dos salas no necesita (ver Decisiones
mayores).

Por dentro, el sistema se organiza en cuatro responsabilidades: la **cartelera** (películas y
funciones), las **ventas** (elegir asiento, reservar, pagar, generar el código de confirmación),
los **reportes e indicadores** (lo que la dueña quiere consultar), y las **cuentas del personal**
con sus permisos. Una vez al mes, sin que nadie lo dispare, el sistema arma el reporte de boletos
vendidos y lo envía por correo a la dueña.

## Componentes

### Componente 1: Cartelera
**Propósito**: mantener las películas y funciones de la semana vigente, y si están activas o
canceladas.

**Responsabilidades**:
- Guardar, por función, la película, sala, horario y si es doblada o subtitulada.
- Permitir que administración cargue la cartelera de la semana.
- Permitir marcar una función como cancelada.

**Límite con el resto**: Ventas y Reportes solo leen de Cartelera — ninguno de los dos puede
modificarla.

### Componente 2: Ventas
**Propósito**: manejar el ciclo completo de una compra — mapa de asientos, reserva temporal,
descuentos, pago simulado, código de confirmación.

**Responsabilidades**:
- Mostrar el mapa de asientos de una función y su disponibilidad.
- Reservar un asiento al elegirlo, y liberarlo si no se paga dentro del plazo (ver Otras
  decisiones).
- Calcular el precio aplicando el descuento que corresponda (miércoles o estudiante, el mayor de
  los dos).
- Registrar el pago simulado y generar el código de confirmación con nombre e identificación del
  cliente.
- Permitir que taquilla busque una compra por nombre o identificación, cuando el cliente perdió
  su código.

**Límite con el resto**: solo lee de Cartelera (para saber qué funciones existen) y de Cuentas
(para validar que quien vende en taquilla tiene permiso). Reportes lee de Ventas, sin
modificarla.

### Componente 3: Reportes
**Propósito**: calcular los indicadores que la dueña quiere consultar, y entregarle el reporte
mensual.

**Responsabilidades**:
- Calcular boletos vendidos por película por mes, ocupación por día/horario, el efecto del
  descuento de miércoles, el efecto de doblada/subtitulada en la asistencia, y la comparación de
  ventas en línea vs. taquilla.
- Generar y enviar por correo el reporte mensual de boletos por película, automáticamente, sin
  que nadie lo dispare (ver Decisiones mayores).
- Mantener el reporte disponible dentro del sistema.

**Límite con el resto**: solo lee de Ventas y Cartelera.

**Limitaciones**: si el envío por correo falla, el reporte sigue disponible dentro del sistema —
la dueña no pierde el dato, solo el aviso por correo ese mes.

### Componente 4: Cuentas y permisos
**Propósito**: distinguir las cuentas de personal (taquilla / administración) y verificar sus
permisos.

**Responsabilidades**:
- Guardar las cuentas del personal y su rol.
- Confirmar que quien hace una acción (cargar cartelera, cancelar función, vender en taquilla)
  tiene el permiso correspondiente.

**Límite con el resto**: Cartelera y Ventas le preguntan a este componente si hay permiso antes
de dejar actuar a alguien; este componente no sabe nada de asientos, funciones ni reportes.

## Modelo de datos

**Entidades:**

- **Sala** — id, nombre, capacidad (120 o 60). Tiene muchos Asientos.
- **Asiento** — pertenece a una Sala; fila (letra) y número (columna). Es fijo, no depende de la
  función.
- **Película** — id, nombre, afiche (el nombre del archivo de imagen; puede estar vacío).
- **Función** — película, sala, fecha y hora, si es doblada o subtitulada, y si está activa o
  cancelada.
- **Compra** — función; nombre y número de identificación del cliente; método de compra (en
  línea/taquilla); cuántos de sus boletos se declararon de estudiante; total pagado; estado
  (reservada temporalmente, pagada, o vencida); fecha y hora en que se creó la reserva (para
  calcular cuándo vence, según el plazo de la tabla de Otras decisiones); código de confirmación;
  y, si fue en taquilla, qué cuenta de personal la vendió.
- **Boleto** — el derecho a un asiento dentro de una Compra: guarda el asiento, qué descuento se
  le aplicó (ninguno, miércoles o estudiante) y el precio que se pagó por él. Una compra de tres
  asientos son tres boletos. *(Precisado al construir el vertical slice 3: antes el descuento y
  el precio eran datos de la Compra. Como el cliente declara **cuántos** de sus asientos son de
  estudiante y no un sí/no para toda la compra —RF-5—, una misma compra puede llevar boletos con
  descuento y boletos sin él, así que los dos datos bajan al boleto. REG-1 se corrigió igual.)*
- **Cuenta de personal** — nombre de usuario, contraseña y rol (taquilla o administración).

**Relaciones:**

```
Sala 1 ── tiene muchos ──> Asiento
Película 1 ── aparece en muchas ──> Función
Sala 1 ── se usa en muchas ──> Función
Función 1 ── tiene muchas ──> Compra
Compra 1 ── tiene uno o más ──> Boleto
Asiento 1 ── puede estar en muchos ──> Boleto (uno por cada función distinta)
Cuenta de personal 1 ── puede vender muchas ──> Compra (solo si es en taquilla)
```

Un asiento está disponible para una función si no existe ninguna Compra vigente (pagada, o
reservada y todavía no vencida) para esa combinación de función y asiento — así es como el mapa
sabe mostrarlo libre, reservado o vendido (RF-2).

Con esto se contesta lo que pide "Qué queda registrado" de la especificación: boletos por
película y mes (Boleto → Compra → Función → Película), ocupación por día/horario (Función +
conteo de Boletos), efecto del descuento de miércoles y del formato (el descuento aplicado a cada
boleto y el formato de la Función), y la comparación en línea vs. taquilla (el método de compra).

## Manejo de errores

- **Dos clientes eligen el mismo asiento casi al mismo tiempo:** al confirmar la reserva, el
  sistema comprueba de nuevo que el asiento sigue libre. Si ya no lo está, le informa a quien
  perdió esa carrera y le muestra el mapa actualizado para que elija otro. No queda registro del
  intento fallido — solo se guarda la Compra que sí se concretó.
- **El cliente no completa el pago a tiempo:** al vencerse el plazo de la reserva, el sistema
  marca esa Compra como "vencida" y el asiento vuelve a aparecer disponible. Si el cliente paga
  justo después de vencido el plazo, se trata como una compra nueva — puede que el asiento ya no
  esté libre.
- **Falla el proyector y se cancela una función:** el personal marca la Función como cancelada.
  El sistema no intenta ninguna devolución de dinero por sí mismo — solo deja disponible, para
  taquilla, la lista de compras (con nombre e identificación) asociadas a esa función, para que
  la devolución se resuelva en persona (efectivo o vale de cambio).
- **El carné de estudiante no es válido al entrar:** esto se resuelve en la puerta de la sala,
  fuera del sistema — quien controla la entrada cobra la diferencia o niega el ingreso. La
  Compra ya quedó registrada con el descuento que se aplicó al momento de comprar; el sistema no
  necesita hacer nada distinto en ese momento.
- **El cliente perdió su código de confirmación:** taquilla busca la Compra por nombre y número
  de identificación (RF-7), y la confirma comparando esos datos con el documento de identidad.

## Decisiones mayores

### Cómo el cliente prueba su compra sin tener cuenta

**Por qué es una decisión mayor:** afecta qué tan fácil es para el cliente recuperar o mostrar su
compra, y qué tan expuesto queda el sistema a que alguien use el código de otra persona.

| | Opción A: código simple, sin vínculo a nada | Opción B: código ligado a un correo | Opción C: nombre + identificación, recuperable en taquilla |
|---|---|---|---|
| **Experiencia de uso** | Inmediato; si se pierde, no hay forma de recuperarlo | Un paso más al comprar; permite reenvío por correo | Un paso más al comprar; se recupera en persona con el documento de identidad |
| **Rendimiento** | Sin impacto | Sin impacto | Sin impacto |
| **Recursos** | Ninguno adicional | Requiere envío de correos | Ninguno adicional — reutiliza el proceso presencial que ya existe para reembolsos |
| **Complejidad** | Mínima | Media — hay que guardar el correo y ofrecer reenvío | Baja — se guarda un dato más de la compra, y taquilla ya resuelve cosas en persona |
| **Riesgo** | Alguien podría usar el código de otro (bajo, sin dinero real en juego) | Se recolecta un dato de contacto sin cuenta | Ninguno adicional relevante |

**Elección:** Opción C — el cliente indica su nombre y número de identificación al comprar; si
pierde su código, lo recupera en taquilla presentando su identificación. Es más simple que la B
(no depende de correos) y usa un dato que el cliente ya trae encima, además de encajar con cómo
ya se resuelven los reembolsos (en persona, en taquilla).

---

### Cómo se dispara el reporte mensual automático

**Por qué es una decisión mayor:** determina si el sistema necesita ejecutar una tarea por sí
solo en una fecha (infraestructura adicional) o si basta con que alguien la pida cuando quiera.

| | Opción A: proceso programado, sin que nadie lo dispare | Opción B: alguien de administración lo genera cuando quiere |
|---|---|---|
| **Experiencia de uso** | La dueña recibe el correo cada mes sin depender de que alguien se acuerde | Depende de que alguien se acuerde de generarlo cada mes |
| **Rendimiento** | Sin impacto — tarea pequeña, una vez al mes | Sin impacto |
| **Recursos** | Necesita poder ejecutar una tarea en una fecha programada | Ninguno adicional — mismo patrón de pedir/responder que el resto del sistema |
| **Complejidad** | Un poco más, para construir y vigilar que la tarea corra | Más simple de construir |
| **Riesgo** | Si la tarea o el correo fallan, nadie se entera al momento (aunque el reporte queda disponible dentro del sistema) | Si nadie lo genera ese mes, la dueña se queda sin el reporte |

**Elección:** Opción A — proceso programado y automático. Es lo que se pidió explícitamente al
definir este requisito (un reporte "automatizadamente generado"), y el costo adicional es bajo
para una tarea mensual tan simple.

---

## Otras decisiones

| Decisión | Opciones consideradas | Elección | Razón |
|---|---|---|---|
| Duración del plazo de reserva temporal | 5, 10, 15 minutos | **3 minutos** | Tiempo suficiente para completar el pago sin dejar el asiento bloqueado demasiado tiempo si el cliente abandona (RN-7). *Corregido al construir el vertical slice 2:* el plazo bajó de 5 a 3 minutos. El pago es simulado y no pide datos de tarjeta, así que completar la compra toma menos de un minuto; 5 minutos dejaban el asiento bloqueado mucho más de lo que la compra tarda. Ni `PROMPT.md` ni la consigna fijan un número: el plazo es una decisión nuestra y por eso se puede ajustar. |
| Permisos del personal | Roles fijos (taquilla/administración) vs. permisos configurables por cuenta | Roles fijos | Solo existen dos roles necesarios (RN-9, RN-12); permisos configurables agregarían complejidad sin beneficio real a este tamaño de negocio. |
| Representación visual del mapa de asientos | Dos colores (verde/gris), tres (verde/amarillo/gris) o cuatro (separando además "reservado por otro" de "vendido") | **Tres estados**, con los códigos de color de `VISUALS.md`: verde `#7ac77a` = disponible; amarillo `#F1C40F` = **el asiento que este cliente está eligiendo**, todavía sin confirmar; gris `#4A4A4A` = no disponible, sin distinguir si otro cliente lo tiene reservado o si ya está vendido | El amarillo le contesta al cliente "¿cuál estoy tomando?" justo mientras elige, que es cuando se equivoca. En cambio, separar "reservado por otro" de "vendido" no le sirve de nada: en los dos casos no lo puede elegir, y un cuarto color solo confundiría en un mapa de 120 butacas. Ojo: `VISUALS.md` define el amarillo como "reservado por otro"; acá se le da otro significado, a propósito. El amarillo aparece con el vertical slice 2, que es donde se construye elegir asientos; el vertical slice 1 solo muestra verde. Ningún color significa "fuera de servicio": eso está fuera de alcance (`ESPECIFICACION.md`). *Precisado al construir el vertical slice 2:* el amarillo cubre dos momentos del mismo asunto —"cuál estoy tomando"—, el asiento que el cliente acaba de marcar y todavía no confirmó, y el que ya tiene reservado y sigue vigente. Para el propio cliente son la misma cosa, así que comparten color; para cualquier otro cliente los dos casos son gris. |
| Motor de base de datos | Motor real (SQLite, exigido por la consigna del Caso práctico 4) vs. archivo JSON | SQLite | Fijado por la consigna: "la base de datos usa un motor real; SQLite es suficiente. Un archivo JSON no cuenta como base de datos." |
| Tecnología del servidor y las pantallas | Node.js + Express (JavaScript) vs. Python + Flask | Node.js + Express, con pantallas en HTML simple servidas por el mismo servidor, sin herramientas de compilación adicionales | Un solo lenguaje de punta a punta, el mismo que ya se usó en semana1 (carrito.js); más simple de instalar y depurar para quien no tiene background técnico en programación. |
| Si las pantallas pueden usar JavaScript, y hasta dónde | Nada de JavaScript; JavaScript escrito dentro de la propia página; o un framework del navegador (React, Vue) con sus herramientas de compilación | **JavaScript sí, escrito dentro de la propia página**, en cantidades chicas y sin ninguna librería ni herramienta de compilación. Queda descartado el framework. Y queda fijada una frontera: **el navegador nunca decide nada que importe** —el precio, la disponibilidad de un asiento y el vencimiento de una reserva los decide siempre el servidor, y los recalcula al recibir el pedido, sin creerle al navegador ningún número— | *Corregido al construir el vertical slice 3.* Hasta acá se venía diciendo "el prototipo no usa JavaScript" y se rechazaban cosas por eso. Al revisarlo con la estudiante se vio que **eso nunca fue una decisión**: ni la consigna ni `PROMPT.md` lo piden, y la fila de arriba solo dice "HTML simple, **sin herramientas de compilación**", que no es lo mismo — unas líneas escritas dentro de la página no compilan nada. La regla se había estirado sola, de decisión en decisión, y llegó a descartar cosas que la estudiante había pedido. La frontera del servidor es la que sí importa y se mantiene entera: sin ella, cualquiera podría cambiar un número en su navegador y pagar menos. La consigna, además, marca el procedimiento para este cambio: *"cambiar una tecnología requiere actualizar primero `DISENO.md`, con la razón del cambio"* (`consigna-semana4.txt`), que es exactamente lo que hace esta fila. **Lo que no cambia:** los siete días en fila, el mapa de asientos con casillas y la barra del plazo de la reserva se quedan **exactamente como están**. Los dos primeros se eligieron por razones propias —un clic en vez de dos, y armar la selección antes de confirmarla— que siguen siendo válidas y nunca dependieron de esta regla. La barra sí se había elegido por esta regla, y la estudiante decidió conservarla igual (ver la fila "Cómo se muestra cuánto tiempo queda de la reserva"). Este permiso se usa **solo** en la tabla de tipos de boleto del vertical slice 3. |
| Cómo se identifica el personal | Elegir la cuenta de una lista, sin contraseña, vs. nombre de usuario y contraseña | Nombre de usuario y contraseña | RN-9 exige que el personal tenga cuenta para usar el sistema; una lista sin contraseña dejaría que cualquiera actúe como administración y cargue o cancele la cartelera. |
| Dónde viven el precio base y los porcentajes de descuento | Valor fijo en la configuración de la aplicación vs. editable por administración desde una pantalla | Configuración de la aplicación: precio base, porcentaje de miércoles (50%) y porcentaje de estudiante (30%) | RN-1 fija un mismo precio base para todas las funciones, y RN-3 marca el 30% como valor temporal ajustable; tenerlos en configuración permite ajustarlos sin cambiar la regla ni agregar entidades ni pantallas que la especificación no pidió. |
| Cómo se envía el correo mensual a la dueña | Correo real por SMTP vs. correo simulado guardado en una carpeta local | Correo simulado: el sistema escribe el correo generado (destinatario, asunto y cuerpo) en una carpeta local legible | Coherente con que el pago también es simulado; no depende de credenciales ni de un servicio externo para poder demostrarse. |
| Qué comprende "la semana vigente" | Lunes a domingo del calendario vs. jueves a miércoles vs. los próximos 7 días corridos desde hoy | Jueves a miércoles | Los estrenos del cine entran los jueves, así que la semana comercial arranca ese día (dato del negocio, aportado al construir el vertical slice 1; no estaba escrito en ningún documento anterior). Como consecuencia, toda semana vigente contiene exactamente un miércoles, el día del descuento de RN-2. |
| Qué funciones de la semana vigente ve el cliente | Todas las de la semana, incluidas las que ya empezaron, vs. solo las que todavía no empezaron | Solo las funciones cuya fecha y hora todavía no pasaron | No tiene sentido ofrecerle asientos a alguien para una función que ya empezó; si se consulta el sistema un sábado, el jueves y el viernes de esa misma semana ya no se pueden comprar. Las funciones pasadas siguen guardadas y cuentan para los reportes (RF-15) — solo dejan de ofrecerse para comprar. |
| Cómo se distribuyen las filas y columnas de cada sala | No estaba definido: la especificación fija las capacidades (120 y 60) pero no la forma de la sala | Sala 1: 10 filas (A–J) de 12 asientos = 120. Sala 2: 6 filas (A–F) de 10 asientos = 60 | Es la distribución rectangular más pareja para cada capacidad; se lee bien de un vistazo y entra en la pantalla de un teléfono, que es desde donde compra el cliente. |
| Con qué se habla con SQLite | Paquete externo que hay que instalar (`better-sqlite3`, `sqlite3`) vs. el módulo `node:sqlite` incluido en Node.js | Módulo `node:sqlite`, incluido en Node.js 24 | El motor sigue siendo SQLite real, como exige la consigna, pero no hay que instalar ni compilar nada: en Windows los paquetes externos de SQLite suelen requerir herramientas de compilación. Una dependencia menos que declarar y menos que pueda fallar al instalar. |
| Cómo se guardan las contraseñas del personal | Texto plano vs. cifradas con un paquete externo (`bcrypt`) vs. cifradas con `node:crypto` (scrypt), incluido en Node.js | Cifradas con scrypt, del módulo `node:crypto` | Guardar contraseñas legibles es indefendible aunque sea un prototipo con datos inventados; scrypt viene incluido en Node.js, así que no agrega dependencias ni compilación. |
| Cómo recuerda el sistema que una cuenta de personal ya ingresó | Escribir a mano una cookie firmada vs. usar `express-session` | `express-session`, con la sesión guardada en la memoria del servidor | Es la pieza estándar de Express para esto y evita escribir a mano el manejo de cookies firmadas, que es fácil de equivocar. Contrapartida aceptada: al reiniciar el servidor el personal debe volver a ingresar; no afecta a los datos, que viven en SQLite. |
| Apariencia de las pantallas | CSS propio a mano vs. librería de estilos traída de internet (CDN) vs. librería guardada dentro del proyecto | **`VISUALS.md` es la fuente del estilo.** Pico.css se conserva como base, guardada dentro del proyecto, y se le reasignan sus variables de color, tipografía y forma a las de `VISUALS.md`; encima va el CSS propio con lo que ninguna librería trae | Pico.css deja prolijo el HTML simple sin ensuciarlo con nombres de estilo en cada etiqueta, coherente con la fila "Tecnología del servidor y las pantallas". Como Pico se configura con variables, adoptar el sistema de diseño no obligó a tirarlo ni a duplicar su trabajo con formularios y tablas. Guardarlo dentro del proyecto, en vez de traerlo de internet, hace que la aplicación se vea igual sin conexión. El mapa de asientos no lo resuelve ninguna librería: va entero en el CSS propio. *Revisado al construir el vertical slice 3, y con fecha de salida:* la estudiante preguntó si Pico sigue haciendo falta ahora que `VISUALS.md` manda el aspecto. Son capas distintas —`VISUALS.md` es un documento de decisiones, no código; Pico es lo que viste las etiquetas simples sin ponerles un nombre de estilo a cada una—, y hoy está vistiendo 11 campos de texto, 11 etiquetas, 6 botones, 5 formularios y 4 tablas. **Se decidió sacarlo, pero al cerrar el vertical slice 8, no antes:** los slices 4 a 8 son justamente los que traen más formularios y tablas (taquilla, búsqueda, reportes), así que recién al final se sabe qué CSS propio hay que escribir para reemplazarlo, en vez de adivinarlo ahora y volver a escribirlo en cada slice. Queda como **pendiente explícito**, no como algo que se dio por bueno. |
| Dónde se guardan los afiches | La imagen adentro de la base de datos vs. el archivo en una carpeta del servidor y solo su nombre en la base | El archivo en la carpeta `datos/afiches/`, y en la base solo el nombre del archivo | Guardar imágenes adentro de SQLite infla la base, hace lentas las consultas que no las necesitan y complica las copias de respaldo. Con archivos sueltos, además, se pueden ver y reemplazar con el explorador de archivos, sin abrir el sistema. Viven junto a la base de datos porque son datos del cine, no parte del programa. |
| Cómo se reciben los archivos que sube administración | Escribir a mano la lectura del formulario con archivo adjunto vs. usar `multer` | `multer`, guardando el archivo en disco con un nombre generado por el sistema | Un formulario con archivo adjunto viaja en un formato distinto al de un formulario común y hay que desarmarlo a mano, cosa fácil de equivocar y con riesgo de seguridad. `multer` es la pieza del propio equipo de Express para esto. Se renombra el archivo en vez de confiar en el nombre que traiga, para que nadie pueda escribir fuera de la carpeta de afiches. Se aceptan solo imágenes y hasta 2 MB. |
| Qué se muestra cuando una película no tiene afiche | Rechazar la carga hasta que suban uno vs. mostrar un hueco vacío vs. mostrar un bloque con el título | Un bloque de color con el título de la película | El afiche es opcional (RF-12): exigirlo trabaría la carga de la cartelera por una imagen que quizá todavía no llegó. Un bloque con el título mantiene la tarjeta pareja con las demás y se lee igual. |
| Cómo se organiza la cartelera que ve el cliente | Una tarjeta por función (lista corrida), todas las películas con sus siete días a la vista, o **un día a la vez** elegido por el cliente | **Un día a la vez**: arriba, los siete días de la semana en fila, todos a la vista, con el elegido marcado; debajo, una tarjeta por sala con su película, su afiche y los horarios de ese día | Una semana tiene entre 42 y 56 funciones (`ESPECIFICACION.md`, glosario "Cartelera"): mostrarlas todas de una vez es ilegible en cualquier forma que se pruebe. Con el día elegido, la pantalla queda en dos tarjetas —una por sala— que es exactamente lo que el cine ofrece ese día (RN-15). Encabezar por sala, y no por película, deja a la vista cuál es la sala grande y cuál la chica, dato que el cliente necesita antes de elegir asiento. |
| Qué pasa si una sala termina con más de una película en un día | Impedirlo al cargar la cartelera vs. permitirlo y mostrarlo | Se permite: la pantalla dibuja un bloque por cada película de esa sala, bajo el mismo encabezado de sala | RN-15 dice cómo programa el cine, no es algo que el sistema tenga que vigilar: administración es personal del propio cine y sabe lo que carga. Impedirlo obligaría a inventar mensajes de error y a decidir qué hacer con las funciones ya vendidas de la película anterior — complejidad que nadie pidió. La pantalla, en cambio, no se rompe si pasa. |
| Cómo elige el día el cliente | Una lista desplegable con un botón, o los siete días en fila, cada uno un enlace | **Los siete días en fila**, cada uno un enlace. Sin nada de JavaScript y sin botón: un clic y listo | Con la lista desplegable hay que abrirla para saber qué días hay, y hace falta un segundo clic para confirmar. En fila se ve la semana entera de un vistazo y se elige en un solo clic. Mantiene la decisión de "pantallas en HTML simple, sin herramientas de compilación", y el día sigue viajando en la dirección de la página (`/?dia=...`), así que la cartelera de un día se puede compartir por enlace. |
| Qué pasa con los días de la semana que ya pasaron | Esconderlos, o mostrarlos apagados | Se muestran los **siete** días siempre; los que ya no tienen funciones por dar aparecen apagados y no se pueden elegir | Esconderlos haría que la fila cambiara de tamaño según el día, y el cliente perdería la referencia de en qué parte de la semana está. Apagados comunican dos cosas a la vez: qué semana es y hasta dónde llegó. |
| Cómo se acomoda la tarjeta de sala en pantallas chicas | El afiche siempre al lado del texto vs. apilado en teléfonos | Abajo de 480px el afiche va **arriba**, ocupando todo el ancho y recortado a lo ancho, con el título y los horarios debajo. De 480px en adelante el afiche va al lado, con su forma de afiche; desde 768px, más grande | `VISUALS.md` pide que en móvil la pantalla se reacomode en una sola columna. Con el afiche al lado en una pantalla de 360px, la columna de texto queda tan angosta que los horarios se apilan de a uno. El recorte muestra el dibujo del afiche y no su título, porque el título ya está al lado. |
| Cómo se muestran los horarios de una sala | Una etiqueta de formato pegada a cada hora, o los horarios agrupados por formato | **Agrupados por formato**: dentro de cada sala, un bloque por formato con su etiqueta arriba y, debajo, solo las horas | Con la etiqueta pegada a cada hora, "Subtitulada" se repetía tres veces en la misma línea y competía con lo único que el cliente está eligiendo, que es la hora. Agrupando, la etiqueta aparece una vez por bloque y las horas quedan limpias. |
| Dónde vive el acceso del personal | En el encabezado, junto a la marca, vs. en el pie de página | En el **pie de página**. El personal que ya entró sí ve su cuenta y el botón de salir en el encabezado | La cartelera es la pantalla del cliente: el acceso del personal no debería competir ahí con la marca ni con las funciones. En el pie sigue estando a un clic para quien lo busca, que es alguien que trabaja en el cine y ya sabe dónde está. Una vez adentro, en cambio, el encabezado tiene que recordarle con qué cuenta está trabajando, porque de eso dependen sus permisos. |
| De qué color va el código de confirmación | El dorado de la marca (`#f2ca50`), que es el color de lo importante en el resto de las pantallas, o el verde de "disponible" (`#7ac77a`) | El **verde**, tomado de la variable del asiento disponible y no del valor suelto, para que ese verde siga viviendo en un solo lugar. Va en el código **y en su rótulo** ("Tu código de confirmación"): los dos son una sola pieza | El dorado es el color de la marca y de la acción principal: en la pantalla anterior lo lleva el botón "Pagar". Una vez pagado ya no hay ninguna acción que hacer, y el código no es un botón: es la confirmación de que salió bien. El verde es el color que en este sistema ya significa "todo bien" —es el del asiento disponible en el mapa—, así que reutilizarlo no agrega un color nuevo a la paleta de `VISUALS.md`. Lo pidió la estudiante al ver la pantalla terminada. |
| El logo de la marca | No tener logo, solo el nombre en dorado; o un dibujo al lado del nombre | Un **dibujo de un rollo de película** a la izquierda del nombre, a la misma altura que la línea del texto (36px, y 28px en teléfonos). El archivo vive en `cine/public/images/logo.webp` | Lo aportó la estudiante. Se mide por el **alto** y no por el ancho, para que quede alineado con el nombre sin depender de la forma del dibujo. Su texto alternativo va **vacío** a propósito: el nombre del cine está escrito justo al lado, así que describir la imagen haría que un lector de pantalla dijera "Cine Variedades" dos veces seguidas. El archivo se copió dentro de `public/`, que es la carpeta que el servidor entrega, con el mismo criterio que ya se usó con Pico.css y las tipografías: lo que la aplicación necesita para verse bien vive dentro de la aplicación. El original que subió la estudiante queda en `semana4/images/`. |
| Tamaño de la marca "Cine Variedades" | El tamaño de texto corriente (16px) vs. un tamaño propio | 28px, en la tipografía de títulos y en dorado | `VISUALS.md` no define un tamaño para la marca: define 20px para `headline-md` y 32px para `headline-lg`. Se fijó en 28px, entre los dos, para que la marca sea lo primero que se lee sin taparle el lugar al título de cada pantalla. |
| Modo claro u oscuro | Claro, oscuro, o seguir la preferencia del sistema operativo | Oscuro siempre | `VISUALS.md` lo fija: el fondo oscuro imita la sala a oscuras y hace que el semáforo de asientos resalte. No se sigue la preferencia del sistema porque la paleta clara no está definida en ningún lado. |
| Cómo se cargan las tipografías de `VISUALS.md` | Traerlas de Google Fonts vs. guardar los archivos dentro del proyecto vs. usar las que ya tenga la computadora | Los archivos `.woff2` de Manrope, Work Sans y JetBrains Mono guardados en `public/fonts/` | Mismo criterio que con Pico.css: la aplicación se ve igual sin conexión y queda completa dentro del repositorio. Se guardan solo los 5 grosores que `VISUALS.md` usa, unos 92 KB en total. Las tres tipografías tienen licencia OFL-1.1, que permite redistribuirlas dentro del proyecto. |
| Cómo elige el cliente los asientos en el mapa | Cada asiento libre es un enlace que reserva de una vez, o el mapa es un formulario con una casilla de verificación por asiento y un botón para confirmar | **Formulario con casillas**: cada asiento libre es una casilla de verificación disfrazada de butaca; al marcarla se pone amarilla con CSS, y un botón "Reservar" manda la selección completa. Los asientos no disponibles no son casillas, así que no se pueden marcar | Mantiene la decisión de pantallas sin JavaScript, porque el amarillo lo pinta el propio navegador al marcar la casilla, sin pedirle nada al servidor. Con enlaces, cada asiento reservaría en el acto: RF-3 pide elegir **uno o más** asientos, y hacerlo de a uno obligaría a una ida y vuelta al servidor por butaca, y a inventar un enlace de "quitar" para corregirse. Con el formulario, el cliente arma su selección, la ve, y recién entonces la confirma. |
| Qué ve el cliente inmediatamente después de reservar | Volver al mapa con un aviso arriba, o una pantalla propia de la reserva | **Una pantalla propia**: película, sala, horario, asientos, hora de vencimiento y el lugar del pago | El pago (vertical slice 3) necesita una pantalla donde vivir, y es la continuación natural de reservar. Resolverlo con un aviso sobre el mapa obligaría al vertical slice 3 a inventar esa pantalla igual, y a mudar lo ya construido. El mapa, además, es la pantalla de elegir; una vez elegido, mostrarlo otra vez invita a volver a elegir. |
| Cómo se muestra cuánto tiempo queda de la reserva | Un conteo regresivo con números que bajan (necesita JavaScript), una barra que se vacía sola (solo CSS), o solo la hora de vencimiento en texto | **La barra de CSS más la hora de vencimiento en texto.** La barra arranca en la parte que corresponda: si quedan 2 de los 3 minutos, arranca a dos tercios | Un conteo con números exige JavaScript, y hasta acá el prototipo no usa nada de JavaScript; romper esa racha por un adorno no se justifica cuando quien decide si la reserva venció es siempre el servidor. La barra da la sensación de urgencia sin código en el navegador, y la hora en texto da el dato exacto que la barra no puede dar. Los dos juntos cubren lo mismo que el conteo. **Revisado al construir el vertical slice 3, y confirmado:** la razón original de esta fila —"el prototipo no usa nada de JavaScript"— **dejó de ser cierta** cuando se permitió JavaScript en la página, así que se le volvió a preguntar a la estudiante, que era quien había pedido el conteo con números. Decidió **conservar la barra**: el vertical slice 2 ya estaba cerrado, la barra cumple con lo que tiene que comunicar, y no vale la pena reabrir una pieza terminada por esto. La decisión se mantiene, pero ahora se sostiene en esa razón y no en la vieja. |
| Qué pasa si el cliente vuelve al mapa y reserva otra vez en la misma función | Sumar los asientos nuevos a la reserva anterior, impedirlo, o reemplazar la reserva anterior | **Reemplazar**: la reserva vigente pasa a ser exactamente lo que quedó marcado en el mapa. Los asientos que el cliente soltó vuelven a estar disponibles. En el mapa, sus asientos ya reservados aparecen amarillos **y ya marcados**, así que no reservar nada nuevo tampoco pierde nada | Es lo que la pantalla ya está diciendo: el mapa muestra marcado lo que el cliente tiene tomado, así que apretar "Reservar" debería dejarlo tal como se ve. Sumar haría que desmarcar no sirviera para nada y no habría forma de soltar un asiento. Impedirlo dejaría al cliente encerrado con una elección equivocada durante los 3 minutos. |
| Cómo caduca una reserva sin pagar | Un proceso que corre en segundo plano cada tanto revisando reservas vencidas, o marcarlas al momento de consultar | **Al consultar**: cada vez que se pide el mapa de una función, las reservas de esa función que ya pasaron el plazo se marcan como "vencida" antes de dibujarlo. Además, la consulta de disponibilidad nunca cuenta como ocupada una reserva pasada de plazo, aunque todavía no la haya marcado nadie | Un proceso en segundo plano agrega una pieza que hay que arrancar, parar y vigilar, para un prototipo de un cine de dos salas. Marcar al consultar cumple lo que dice "Manejo de errores" —que el sistema marca la Compra como vencida— y deja el estado escrito en la base para los reportes (vertical slice 7). La doble red importa: si nadie consulta el mapa, la reserva sigue figurando "reservada", pero la disponibilidad ya la ignora, así que el asiento nunca queda bloqueado de más. |
| Cómo se evita que dos clientes tomen el mismo asiento a la vez | Un índice único en la base, o comprobar y guardar dentro de una misma transacción | **Una transacción**: la comprobación de que los asientos siguen libres y el guardado de la reserva ocurren dentro del mismo bloque `BEGIN IMMEDIATE … COMMIT`, que SQLite trata como una sola operación indivisible | `node:sqlite` trabaja de forma sincrónica y Node atiende un pedido por vez, así que ningún otro pedido puede colarse entre la comprobación y el guardado. Un índice único no alcanza: "ocupado" depende del estado de la compra **y** de cuánto tiempo pasó, y un índice de SQLite no puede consultar la hora ni cruzar dos tablas. La transacción, además, deja la reserva completa o no deja nada: no puede quedar media reserva con un asiento sí y otro no (`Manejo de errores`). |
| Qué campos de la entidad Compra se crean en el vertical slice 2 | Todos los del modelo de datos de una vez, o solo los que este slice usa | **Solo los que usa**: función, estado, fecha y hora de creación, y sus asientos. Nombre, identificación, si es estudiante, descuento aplicado, precio pagado, código de confirmación, método de compra y cuenta vendedora los agrega el vertical slice 3, con el mismo mecanismo de "ponerse al día" que el vertical slice 1 usó para sumar la columna del afiche sin borrar la base | Es la regla del plan: nada de andamiaje fuera del vertical slice que lo necesita. Columnas vacías esperando a un slice futuro invitan a llenarlas antes de tiempo y esconden qué construyó cada pieza. El mecanismo para agregarlas después ya existe y ya se probó. |
| Cuánto vale la entrada, y en qué moneda | Ningún documento lo decía: ni `PROMPT.md`, ni la consigna, ni la especificación, que en RN-1 solo dice que hay un precio base igual para todas las funciones | **₡4.000 colones costarricenses**, en `config.json`, junto con los dos porcentajes (50% de miércoles, 30% de estudiante) | El monto lo aportó la estudiante al construir el vertical slice 3, porque no existía en ningún lado y no se podía inventar en silencio. Se eligió una cifra que da números redondos con los dos descuentos —₡2.000 el miércoles, ₡2.800 el estudiante—, así que las comprobaciones y la pantalla no dependen de ninguna regla de redondeo para leerse bien. Vive en la configuración y no en el código ni en la base (ver la fila "Dónde viven el precio base y los porcentajes de descuento"), así que cambiarlo es editar un archivo de texto. |
| Cómo declara el cliente que hay estudiantes en su compra | Una casilla "soy estudiante" que abarca toda la compra; el descuento solo al primer asiento; o preguntar **cuántos** de los asientos son de estudiante | **Preguntar cuántos**: un número, de 0 a la cantidad de asientos reservados | La casilla única le daba el 30% a toda una compra familiar por un solo carné, y limitarlo a un asiento obligaba a dos estudiantes que van juntos a hacer dos compras separadas. Preguntar cuántos es lo que taquilla haría en persona. Cuesta un campo numérico y, en el modelo de datos, que el descuento y el precio bajen de la Compra al Boleto. El sistema **no** pide el número de carné ni lo vigila: RN-5 pone esa verificación en la puerta de la sala, así que declarar de más se corrige ahí, cobrando la diferencia. |
| Cómo se muestra y se elige el reparto entre boletos regulares y de estudiante | Un botón de opción por cada reparto posible, cada uno con su total; una lista desplegable con la cantidad; o una **tabla de tipos de boleto** con un contador `−  0  +` por fila, como la que usan las boleterías de cine | **La tabla**, con una fila por tipo —"Entrada regular" y "Estudiante"—, y cuatro columnas: tipo, precio, cantidad y subtotal, más el total abajo. Las dos filas **siempre suman los asientos ya reservados**: subir una baja la otra, y los botones que se pasarían del límite quedan apagados | La estudiante trajo el ejemplo de una boletería real y pidió esa forma. Es la que la gente ya conoce de comprar entradas, y muestra las dos cosas que importan —el precio de cada tipo y el subtotal de cada uno— sin obligar a leer una lista de combinaciones. Los botones de opción que se habían construido primero funcionaban, pero crecían de a una línea por asiento: con 6 asientos eran 7 renglones para elegir un solo número. **Diferencia con el ejemplo de la boletería:** ahí la cantidad decide cuántas entradas se compran; acá los asientos ya se eligieron en el mapa, así que el total está fijo y la tabla solo **reparte** ese total. Por eso los dos contadores se mueven juntos y ninguno es libre. El campo que viaja al servidor sigue siendo uno solo —cuántos boletos de estudiante—, y el servidor recalcula el precio sin creerle al navegador (ver "Si las pantallas pueden usar JavaScript"). |
| Qué muestra la tabla cuando declarar estudiantes no cambiaría el precio (los miércoles) | Mostrar las dos filas igual; mostrarlas con los contadores apagados; o **mostrar una sola fila, sin contador** | **Una sola fila**, con el nombre del descuento que sí se aplicó —"Entrada · miércoles"—, la cantidad como texto y el subtotal, más el mensaje que explica por qué no hay nada que elegir. La tabla y su lugar en la pantalla son los mismos: lo que desaparece es la fila y los botones que no servirían | Un miércoles el 50% le gana al 30% en todos los boletos (RN-4), así que mover el contador no cambia ni un colón. Dejarlo puesto es peor que no mostrarlo: parece que el cliente está eligiendo algo cuando no está eligiendo nada, y lo hace dudar de si se equivocó. La condición no es "es miércoles" sino "**el descuento de estudiante no cambiaría ningún precio**": escrita así, la pantalla sigue siendo correcta si alguna vez se ajustan los porcentajes en `config.json` y el de estudiante pasa a ganarle al del día. **Consecuencia que hay que tener presente en el vertical slice 7:** como esos días no se pregunta, toda compra de un miércoles queda registrada con **0 boletos de estudiante**. Eso no significa "ese día no fueron estudiantes", sino "ese día no se preguntó porque no habría cambiado el precio", y así hay que leerlo en el indicador del efecto del descuento de estudiante. |
| Cómo se reparte el descuento de estudiante entre los asientos de una compra | Al azar, al que el cliente elija, o a los más caros primero | A los boletos **más caros primero** | Con el precio base parejo de RN-1 todos los boletos de una función valen lo mismo, así que hoy la regla no cambia ningún total: da igual a cuál se le aplique. Se deja escrita igual para que la respuesta no dependa del orden en que la base devuelva los asientos, y para que siga siendo la correcta si alguna vez los precios dejan de ser todos iguales. Los miércoles el reparto no se usa: el 50% le gana al 30% en todos los boletos (RN-4). |
| Cómo se redondea el precio | Al colón, a la decena, o guardar céntimos | **Al colón entero**, redondeando hacia arriba desde la mitad | En Costa Rica no circulan céntimos, y un precio con decimales en la pantalla de un cine se ve mal y no se puede cobrar. Con ₡4.000 los dos descuentos dan enteros exactos y la regla no llega a usarse; existe para que ajustar el precio base a una cifra impar no rompa nada. |
| Qué forma tiene el código de confirmación | Un número corrido (1, 2, 3…), un código de letras y números corto, o un identificador largo generado por la máquina | **`CV-XXXXXX`**: el prefijo `CV` de Cine Variedades y seis caracteres al azar, sin las letras y números que se confunden al dictarlos (O con 0, I con 1, S con 5) | Un número corrido deja que cualquiera pruebe el de al lado y vea la compra ajena. Un identificador largo es imposible de dictar por teléfono o de copiar a mano, que es justo lo que el cliente va a tener que hacer si se le apaga el teléfono. Seis caracteres de un alfabeto de 30 dan 729 millones de combinaciones: de sobra para un cine de dos salas, y corto para leerlo en voz alta. El código se genera al pagar, y la base tiene un índice único que impide que dos compras terminen con el mismo. |
| Qué pasa si el cliente vuelve a la dirección de una compra que ya pagó | Mostrar un error, redirigirlo a la cartelera, o volver a mostrarle su código | **Volver a mostrarle el código de confirmación**, con los mismos datos de siempre | Es la razón por la que la pantalla existe: RF-10 dice que el código se muestra en pantalla y no hay boleto impreso, así que la única copia que el cliente tiene es esa página. Sigue siendo visible solo desde el navegador que hizo la compra; si lo pierde, se recupera en taquilla (RN-14, vertical slice 5). Una compra pagada es final (RN-13): la pantalla no ofrece ninguna forma de cancelarla. |
| Qué se valida del nombre y el número de identificación | Exigir un formato de cédula costarricense, o solo exigir que no vengan vacíos | **Solo que no vengan vacíos**, y un largo máximo para que no entre un texto desmedido | La especificación no fija ningún formato, y el sistema no verifica identidades: el dato existe para que taquilla pueda reconocer al cliente que perdió su código (RN-14), comparándolo contra el documento que trae en la mano. Exigir un formato dejaría afuera a un turista con pasaporte, que también compra entradas. |
| Qué hace que un asiento deje de estar disponible, ahora que existe el pago | Solo las reservas vigentes, como en el vertical slice 2, o también las compras pagadas | **Las dos cosas**: la consulta de disponibilidad cuenta como ocupado un asiento con una reserva todavía vigente **o** con una compra pagada. La compra pagada no vence nunca | Es lo que ya decía el modelo de datos ("no existe ninguna Compra vigente: pagada, o reservada y todavía no vencida"), pero el vertical slice 2 solo pudo construir la mitad, porque el estado "pagada" no existía. Sin esta corrección, un asiento vendido volvería a aparecer verde a los tres minutos y se podría vender dos veces. Los asientos que el **propio** cliente ya pagó también se le muestran en gris, y no en amarillo: el amarillo significa "lo estás eligiendo", y una compra pagada ya no se elige (RN-13). |
| Dónde vive la entidad Boleto en la base de datos | Una tabla nueva llamada `boletos`, o las columnas nuevas en la tabla `compras_asientos` que ya existe | Las columnas de descuento y precio se agregan a **`compras_asientos`**, la tabla que el vertical slice 2 creó para unir una compra con sus asientos | Esa tabla ya guarda exactamente un renglón por boleto: renombrarla obligaría a tocar las comprobaciones del vertical slice 2 sin cambiar nada de lo que hace. Queda anotado acá y en un comentario de la propia tabla para que nadie busque una tabla `boletos` que no existe. |
| Qué método de compra guarda el vertical slice 3 | Dejar el campo para el vertical slice 4, que es el que introduce taquilla, o guardarlo desde ya | Se guarda desde ya, con el valor **"en línea"** en toda compra de este slice | RN-8 dice que **toda** compra queda registrada con su método, y las de este slice ya son de un método concreto. Dejarlo vacío obligaría al vertical slice 7 a adivinar que "sin método" significa "en línea", que es exactamente el tipo de supuesto silencioso que este proyecto no admite. La cuenta vendedora, en cambio, sí queda para el vertical slice 4: en una compra en línea no hay ninguna. |

## Decisiones dejadas abiertas

| Qué no se decidió | Quién lo decide y cuándo |
|---|---|
| Formato exacto del reporte dentro del sistema (tabla, gráfico, etc.) | Quien construya el sistema, en el plan de la próxima sesión. |
| Redacción exacta del correo mensual a la dueña | Quien construya el sistema; se puede ajustar sin afectar este diseño. |
