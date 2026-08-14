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
- **Compra** — función; uno o más asientos; nombre y número de identificación del cliente;
  método de compra (en línea/taquilla); si el cliente se declaró estudiante; qué descuento se
  aplicó (ninguno, miércoles o estudiante); precio pagado; estado (reservada temporalmente,
  pagada, o vencida); fecha y hora en que se creó la reserva (para calcular cuándo vence, según
  el plazo de la tabla de Otras decisiones); código de confirmación; y, si fue en taquilla, qué
  cuenta de personal la vendió.
- **Cuenta de personal** — nombre de usuario, contraseña y rol (taquilla o administración).

**Relaciones:**

```
Sala 1 ── tiene muchos ──> Asiento
Película 1 ── aparece en muchas ──> Función
Sala 1 ── se usa en muchas ──> Función
Función 1 ── tiene muchas ──> Compra
Asiento 1 ── puede estar en muchas ──> Compra (una por cada función distinta)
Cuenta de personal 1 ── puede vender muchas ──> Compra (solo si es en taquilla)
```

Un asiento está disponible para una función si no existe ninguna Compra vigente (pagada, o
reservada y todavía no vencida) para esa combinación de función y asiento — así es como el mapa
sabe mostrarlo libre, reservado o vendido (RF-2).

Con esto se contesta lo que pide "Qué queda registrado" de la especificación: boletos por
película y mes (Compra → Función → Película), ocupación por día/horario (Función + conteo de
Compras), efecto del descuento de miércoles y del formato (el descuento aplicado y el formato de
la Función), y la comparación en línea vs. taquilla (el método de compra).

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
| Duración del plazo de reserva temporal | 5, 10, 15 minutos | 5 minutos | Tiempo suficiente para completar el pago sin dejar el asiento bloqueado demasiado tiempo si el cliente abandona (RN-7). |
| Permisos del personal | Roles fijos (taquilla/administración) vs. permisos configurables por cuenta | Roles fijos | Solo existen dos roles necesarios (RN-9, RN-12); permisos configurables agregarían complejidad sin beneficio real a este tamaño de negocio. |
| Representación visual del mapa de asientos | Dos colores (verde/gris), tres (verde/amarillo/gris) o cuatro (separando además "reservado por otro" de "vendido") | **Tres estados**, con los códigos de color de `VISUALS.md`: verde `#2ECC71` = disponible; amarillo `#F1C40F` = **el asiento que este cliente está eligiendo**, todavía sin confirmar; gris `#4A4A4A` = no disponible, sin distinguir si otro cliente lo tiene reservado o si ya está vendido | El amarillo le contesta al cliente "¿cuál estoy tomando?" justo mientras elige, que es cuando se equivoca. En cambio, separar "reservado por otro" de "vendido" no le sirve de nada: en los dos casos no lo puede elegir, y un cuarto color solo confundiría en un mapa de 120 butacas. Ojo: `VISUALS.md` define el amarillo como "reservado por otro"; acá se le da otro significado, a propósito. El amarillo aparece con el vertical slice 2, que es donde se construye elegir asientos; el vertical slice 1 solo muestra verde. Ningún color significa "fuera de servicio": eso está fuera de alcance (`ESPECIFICACION.md`). |
| Motor de base de datos | Motor real (SQLite, exigido por la consigna del Caso práctico 4) vs. archivo JSON | SQLite | Fijado por la consigna: "la base de datos usa un motor real; SQLite es suficiente. Un archivo JSON no cuenta como base de datos." |
| Tecnología del servidor y las pantallas | Node.js + Express (JavaScript) vs. Python + Flask | Node.js + Express, con pantallas en HTML simple servidas por el mismo servidor, sin herramientas de compilación adicionales | Un solo lenguaje de punta a punta, el mismo que ya se usó en semana1 (carrito.js); más simple de instalar y depurar para quien no tiene background técnico en programación. |
| Cómo se identifica el personal | Elegir la cuenta de una lista, sin contraseña, vs. nombre de usuario y contraseña | Nombre de usuario y contraseña | RN-9 exige que el personal tenga cuenta para usar el sistema; una lista sin contraseña dejaría que cualquiera actúe como administración y cargue o cancele la cartelera. |
| Dónde viven el precio base y los porcentajes de descuento | Valor fijo en la configuración de la aplicación vs. editable por administración desde una pantalla | Configuración de la aplicación: precio base, porcentaje de miércoles (50%) y porcentaje de estudiante (30%) | RN-1 fija un mismo precio base para todas las funciones, y RN-3 marca el 30% como valor temporal ajustable; tenerlos en configuración permite ajustarlos sin cambiar la regla ni agregar entidades ni pantallas que la especificación no pidió. |
| Cómo se envía el correo mensual a la dueña | Correo real por SMTP vs. correo simulado guardado en una carpeta local | Correo simulado: el sistema escribe el correo generado (destinatario, asunto y cuerpo) en una carpeta local legible | Coherente con que el pago también es simulado; no depende de credenciales ni de un servicio externo para poder demostrarse. |
| Qué comprende "la semana vigente" | Lunes a domingo del calendario vs. jueves a miércoles vs. los próximos 7 días corridos desde hoy | Jueves a miércoles | Los estrenos del cine entran los jueves, así que la semana comercial arranca ese día (dato del negocio, aportado al construir el vertical slice 1; no estaba escrito en ningún documento anterior). Como consecuencia, toda semana vigente contiene exactamente un miércoles, el día del descuento de RN-2. |
| Qué funciones de la semana vigente ve el cliente | Todas las de la semana, incluidas las que ya empezaron, vs. solo las que todavía no empezaron | Solo las funciones cuya fecha y hora todavía no pasaron | No tiene sentido ofrecerle asientos a alguien para una función que ya empezó; si se consulta el sistema un sábado, el jueves y el viernes de esa misma semana ya no se pueden comprar. Las funciones pasadas siguen guardadas y cuentan para los reportes (RF-15) — solo dejan de ofrecerse para comprar. |
| Cómo se distribuyen las filas y columnas de cada sala | No estaba definido: la especificación fija las capacidades (120 y 60) pero no la forma de la sala | Sala 1: 10 filas (A–J) de 12 asientos = 120. Sala 2: 6 filas (A–F) de 10 asientos = 60 | Es la distribución rectangular más pareja para cada capacidad; se lee bien de un vistazo y entra en la pantalla de un teléfono, que es desde donde compra el cliente. |
| Con qué se habla con SQLite | Paquete externo que hay que instalar (`better-sqlite3`, `sqlite3`) vs. el módulo `node:sqlite` incluido en Node.js | Módulo `node:sqlite`, incluido en Node.js 24 | El motor sigue siendo SQLite real, como exige la consigna, pero no hay que instalar ni compilar nada: en Windows los paquetes externos de SQLite suelen requerir herramientas de compilación. Una dependencia menos que declarar y menos que pueda fallar al instalar. |
| Cómo se guardan las contraseñas del personal | Texto plano vs. cifradas con un paquete externo (`bcrypt`) vs. cifradas con `node:crypto` (scrypt), incluido en Node.js | Cifradas con scrypt, del módulo `node:crypto` | Guardar contraseñas legibles es indefendible aunque sea un prototipo con datos inventados; scrypt viene incluido en Node.js, así que no agrega dependencias ni compilación. |
| Cómo recuerda el sistema que una cuenta de personal ya ingresó | Escribir a mano una cookie firmada vs. usar `express-session` | `express-session`, con la sesión guardada en la memoria del servidor | Es la pieza estándar de Express para esto y evita escribir a mano el manejo de cookies firmadas, que es fácil de equivocar. Contrapartida aceptada: al reiniciar el servidor el personal debe volver a ingresar; no afecta a los datos, que viven en SQLite. |
| Apariencia de las pantallas | CSS propio a mano vs. librería de estilos traída de internet (CDN) vs. librería guardada dentro del proyecto | **`VISUALS.md` es la fuente del estilo.** Pico.css se conserva como base, guardada dentro del proyecto, y se le reasignan sus variables de color, tipografía y forma a las de `VISUALS.md`; encima va el CSS propio con lo que ninguna librería trae | Pico.css deja prolijo el HTML simple sin ensuciarlo con nombres de estilo en cada etiqueta, coherente con la fila "Tecnología del servidor y las pantallas". Como Pico se configura con variables, adoptar el sistema de diseño no obligó a tirarlo ni a duplicar su trabajo con formularios y tablas. Guardarlo dentro del proyecto, en vez de traerlo de internet, hace que la aplicación se vea igual sin conexión. El mapa de asientos no lo resuelve ninguna librería: va entero en el CSS propio. |
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
| Tamaño de la marca "Cine Variedades" | El tamaño de texto corriente (16px) vs. un tamaño propio | 28px, en la tipografía de títulos y en dorado | `VISUALS.md` no define un tamaño para la marca: define 20px para `headline-md` y 32px para `headline-lg`. Se fijó en 28px, entre los dos, para que la marca sea lo primero que se lee sin taparle el lugar al título de cada pantalla. |
| Modo claro u oscuro | Claro, oscuro, o seguir la preferencia del sistema operativo | Oscuro siempre | `VISUALS.md` lo fija: el fondo oscuro imita la sala a oscuras y hace que el semáforo de asientos resalte. No se sigue la preferencia del sistema porque la paleta clara no está definida en ningún lado. |
| Cómo se cargan las tipografías de `VISUALS.md` | Traerlas de Google Fonts vs. guardar los archivos dentro del proyecto vs. usar las que ya tenga la computadora | Los archivos `.woff2` de Manrope, Work Sans y JetBrains Mono guardados en `public/fonts/` | Mismo criterio que con Pico.css: la aplicación se ve igual sin conexión y queda completa dentro del repositorio. Se guardan solo los 5 grosores que `VISUALS.md` usa, unos 92 KB en total. Las tres tipografías tienen licencia OFL-1.1, que permite redistribuirlas dentro del proyecto. |

## Decisiones dejadas abiertas

| Qué no se decidió | Quién lo decide y cuándo |
|---|---|
| Formato exacto del reporte dentro del sistema (tabla, gráfico, etc.) | Quien construya el sistema, en el plan de la próxima sesión. |
| Redacción exacta del correo mensual a la dueña | Quien construya el sistema; se puede ajustar sin afectar este diseño. |
