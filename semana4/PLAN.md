# Plan de construcción: Sistema de venta de boletos en línea — Cine Variedades

**Objetivo:** Un prototipo funcional del sistema de venta de boletos del Cine Variedades,
construido en vertical slices sobre `ESPECIFICACION.md` y `DISENO.md` del Caso práctico 3, con
las cuentas de personal, la venta en línea y en taquilla, la cancelación de funciones y los
reportes de la dueña funcionando de punta a punta.

**Arquitectura:** Una sola aplicación con tres tipos de acceso — cliente sin cuenta, personal de
taquilla y personal de administración — que comparten los mismos datos en tiempo real. Se
organiza en cuatro componentes: Cartelera, Ventas, Reportes, y Cuentas y permisos (`DISENO.md` →
"Panorama de la arquitectura" y "Componentes").

**Stack:** Node.js + Express (JavaScript) de punta a punta, con pantallas en HTML simple servidas
por el mismo servidor, sin herramientas de compilación adicionales; base de datos SQLite
(`DISENO.md` → "Otras decisiones").

**Restricciones globales:**
- El pago real está fuera de alcance: el sistema registra la compra como pagada sin conectarse a
  ningún medio de pago.
- No se emiten boletos impresos ni códigos de barras.
- El vale de cambio (valor, vencimiento, canje) es papel, fuera del sistema.
- Un solo cine, sus dos salas (120 y 60 asientos), una sola semana de cartelera a la vez.
- El cliente no crea cuenta; solo el personal tiene cuenta.
- Una compra pagada es final: el cliente no puede cancelarla por su cuenta (RN-13). La única
  forma de liberarla es que el cine cancele la función completa (vertical slice 6).

## Cómo usar este plan
- Un vertical slice por conversación. Al cerrar el slice, cerrar también la conversación: el
  contexto arranca limpio y barato en la siguiente.
- El encargo de cada vertical slice referencia `ESPECIFICACION.md` y `DISENO.md`; no los repite.
- Un vertical slice queda cerrado cuando su comprobación se corrió y el resultado quedó anotado
  en su Evidencia.
- Lo que la construcción revele que falta en la especificación o el diseño se corrige primero en
  ese documento, y después en el código.

## Vertical slices
| # | Vertical slice | Depende de | Estado |
|---|---|---|---|
| 1 | Cartelera y mapa de asientos | — | **cerrado** (13 ago 2026) |
| 2 | Reserva temporal de asiento | 1 | pendiente |
| 3 | Compra en línea completa | 2 | pendiente |
| 4 | Venta en taquilla | 3 | pendiente |
| 5 | Código perdido | 3 | pendiente |
| 6 | Cancelar función | 1, 3, 4 | pendiente |
| 7 | Reportes e indicadores | 3, 4, 6 | pendiente |
| 8 | Reporte mensual automático | 7 | pendiente |

## Detalle

### Vertical slice 1: Cartelera y mapa de asientos
**Qué tiene que ser cierto**
- Existen, como datos de prueba, una cuenta de personal con rol administración y otra con rol
  taquilla, cada una con nombre de usuario y contraseña.
- El personal ingresa al sistema con su nombre de usuario y contraseña; con credenciales
  incorrectas el sistema no lo deja entrar (RN-9, `DISENO.md` → "Otras decisiones").
- Existe un `README.md` que explica cómo arrancar la aplicación, cómo recrear los datos de
  prueba, y lista cada dependencia adoptada con el enlace a su repositorio oficial.
- Una cuenta con rol administración puede cargar la cartelera de la semana: por cada función,
  película, sala, fecha y hora, y si es doblada o subtitulada (RF-12).
- Al cargar una función, la cuenta de administración puede adjuntar el afiche de la película. El
  afiche es opcional: una película sin afiche igual se programa (RF-12, REG-4).
- Una cuenta con rol taquilla no puede cargar la cartelera (RN-12).
- El cliente, sin cuenta, ve la cartelera de la semana vigente: películas —con su afiche—,
  horarios, sala —con cuántos asientos tiene—, y si cada función es doblada o subtitulada (RF-1).
  Si una película todavía no tiene afiche, en su lugar aparece un bloque con el título.
- La cartelera se muestra **un día a la vez**: arriba están los siete días de la semana en fila,
  el cliente elige uno, y ve para ese día una tarjeta por sala con su película y sus horarios
  agrupados por formato (RF-1). Los días que ya pasaron se muestran apagados, no se esconden.
- Los datos de prueba reflejan lo que el cine realmente programa: tres funciones diarias en cada
  sala, los siete días de la semana vigente, y **una sola película por sala** en toda la semana
  (`ESPECIFICACION.md`, glosario "Cartelera" y RN-15).
- El cliente elige una función y ve el mapa de asientos de la sala correspondiente, cada asiento
  identificado por fila y número, mostrado disponible (verde) porque todavía no existe ninguna
  compra ni reserva (RF-2).
- El mapa de asientos tiene tantos asientos como la capacidad real de la sala elegida (120 o 60).

**Con qué se comprueba**
- Ingresar con el nombre de usuario y contraseña de la cuenta de administración y verificar que
  entra; intentar con una contraseña incorrecta y verificar que el sistema lo rechaza.
- Siguiendo únicamente lo que dice el `README.md`, arrancar la aplicación desde cero y recrear
  los datos de prueba, y verificar que la cartelera aparece.
- Verificar que el comando de datos de prueba deja tres funciones diarias en cada sala, los siete
  días de la semana vigente, y que cada sala proyecta una sola película en toda la semana.
- Verificar que la cartelera muestra los siete días de la semana en fila, con el elegido marcado,
  y que al elegir un día se muestran solo las funciones de ese día.
- Verificar que un día de la semana que ya pasó aparece en la fila pero apagado, sin poder elegirse.
- Verificar que, elegido el día, aparece una tarjeta por sala con su película, su afiche y los
  horarios de ese día agrupados por formato.
- Con la cuenta de administración, cargar una función más, dentro de la semana vigente, y
  verificar que aparece leyendo la cartelera como cliente, en el día y la sala que le corresponden.
- Con la cuenta de taquilla, intentar cargar la cartelera y verificar que el sistema lo rechaza.
- Como cliente sin cuenta, leer la cartelera y verificar que cada sala dice de qué tamaño es, para
  distinguir la grande de la pequeña sin tener que abrir el mapa.
- Con la cuenta de administración, cargar una función adjuntando una imagen como afiche, y
  verificar que ese afiche aparece en la cartelera que ve el cliente.
- Con la cuenta de administración, cargar una función de una película nueva **sin** adjuntar
  imagen, y verificar que la cartelera muestra el bloque con el título en lugar del afiche, sin
  romperse.
- Como cliente sin cuenta, elegir la función de la sala de 120 y verificar que el mapa muestra
  120 asientos en verde; elegir la de la sala de 60 y verificar que muestra 60.
- Reiniciar el servidor y verificar que la cartelera cargada sigue ahí — confirma que quedó en
  SQLite, no en memoria.

**Toca** *(componentes del diseño involucrados)*: Cartelera, Cuentas y permisos.

**Interfaces**
- Consume: nada (es el primer vertical slice).
- Produce: el modelo de datos de Sala, Asiento, Película, Función y Cuenta de personal
  (`DISENO.md` → "Modelo de datos"), y el comando que borra y recrea los datos de prueba —
  cuentas de personal, las dos salas con sus asientos, y la cartelera de la semana vigente con al
  menos una función en miércoles y una en otro día. El vertical slice 2 lee Función y Asiento de
  aquí; los vertical slices 3, 4 y 6 parten de ese mismo comando para tener datos conocidos.
  También produce el ingreso del personal con usuario y contraseña —que los vertical slices 4, 5
  y 6 reutilizan—, el archivo de configuración de la aplicación, y el `README.md`, al que cada
  vertical slice posterior le agrega las dependencias nuevas que adopte.

**Evidencia** — 13 de agosto de 2026. Código en `cine/`.

*Comprobaciones automatizadas* (`cine/test/`, se corren con `npm test`): **44 de 44 pasan, 0
fallan**. Se escribieron antes del código y se las vio fallar primero por módulo inexistente.
Cubren la regla de la semana vigente (7), los datos de prueba (7), el ingreso del personal (5), la
carga de cartelera y sus permisos (6), la cartelera del cliente y el sistema de diseño (12), el
mapa de asientos (5) y la persistencia (1); la restante es el archivo de apoyo de las pruebas.

Comprobación por comprobación, como las pide este vertical slice:

| Comprobación del plan | Cómo se corrió | Resultado |
|---|---|---|
| Ingresar con administración; rechazar contraseña incorrecta | Automatizada, y a mano contra la aplicación en marcha | Contraseña correcta → 302 (entra). Contraseña incorrecta → 401. Usuario inexistente → 401. Sin haber ingresado, el panel redirige al ingreso. |
| Arrancar desde cero siguiendo únicamente el `README.md` | A mano: se borraron `node_modules/` y `datos/`, y se siguieron los tres pasos del README. **Se volvió a correr al cerrar el slice**, ya con las dependencias, las tipografías y los afiches que se fueron sumando | `npm install`, `npm run datos-de-prueba` y `npm start` funcionaron sin ningún paso extra. Respondieron con éxito la cartelera, la cartelera de otro día, las dos hojas de estilo, las tres tipografías, los dos afiches, el mapa de asientos y la pantalla de ingreso. |
| Cargar con administración ≥2 películas y 3 funciones en las dos salas, dentro de la semana, ≥1 en miércoles y ≥1 en otro día; verificarlas como cliente | El comando de datos de prueba siembra 2 películas y 3 funciones (Sala 1 y Sala 2; lunes 17, martes 18 y **miércoles 19**). Además, a mano, la cuenta de administración cargó 2 funciones más de una tercera película | Las 5 funciones aparecen en la cartelera que ve un cliente sin cuenta, cada una con película, sala, día, hora y si es doblada o subtitulada. |
| Con taquilla, intentar cargar la cartelera | Automatizada y a mano | `GET` y `POST` de la pantalla de cartelera → **403**, y el conteo de funciones no cambia. |
| Verificar que los datos de prueba dejan 3 funciones diarias en cada sala, los 7 días, y una sola película por sala | Automatizada, y a mano corriendo el comando | **42 funciones**: las 14 combinaciones de día y sala tienen exactamente 3. Cada sala tiene **una** película y 21 funciones: *Sombras en el puerto* en la Sala 1 y *Camino al faro* en la Sala 2 (RN-15). |
| Verificar la fila de días y que al elegir uno se ven solo sus funciones | Automatizada, y a mano contra la aplicación en marcha | Los 7 días de la semana aparecen en fila, con exactamente uno marcado. Pidiendo el domingo 16 aparecen sus 6 funciones y ninguna del sábado 15. Un día fuera de la semana, o escrito a mano en la dirección, cae al primer día con funciones. |
| Verificar que un día ya pasado se muestra apagado y no se puede elegir | Automatizada, con el reloj puesto en el sábado 15 a las 22:00 | Los 7 días siguen a la vista; jueves, viernes y sábado quedan apagados y sin enlace, el resto sigue siendo elegible. |
| Verificar que, elegido el día, hay una tarjeta por sala con su película y sus horarios | Automatizada, y a mano | Dos tarjetas —Sala 1 con 120 asientos, Sala 2 con 60—, cada una con su afiche, su título y 3 horarios. |
| Verificar que los horarios se agrupan por formato dentro de cada sala | Automatizada, y a mano | El sábado 15 hay 4 grupos (dos salas × dos formatos) y exactamente 4 etiquetas de formato: una por grupo, no una pegada a cada hora. |
| Cargar una función adjuntando un afiche y verlo en la cartelera del cliente | Automatizada, y a mano contra la aplicación en marcha | El archivo queda guardado en `datos/afiches/` con un nombre puesto por el sistema, la película queda apuntando a él, y la cartelera lo muestra. |
| Cargar una película sin adjuntar afiche | Automatizada | La función se carga igual y la cartelera muestra el bloque con el título en lugar de la imagen, sin romperse. |
| Como cliente, verificar que la cartelera dice de qué tamaño es cada sala | Automatizada, y a mano contra la aplicación en marcha | Cada función muestra `Sala 1 · 120 asientos` o `Sala 2 · 60 asientos`. Antes solo decía "Sala 1" y "Sala 2", y no había forma de saber cuál era la grande sin abrir el mapa. |
| Como cliente, mapa de 120 y de 60 asientos, todos en verde | Automatizada y a mano contra la aplicación en marcha | Función en Sala 1 → **120** asientos; función en Sala 2 → **60**. Todos con `class="asiento disponible"` (verde). Se identifican por fila y número, de `A1` a `J12`. |
| Reiniciar el servidor y verificar que la cartelera sigue ahí | Automatizada: se apaga el servidor, se abre uno nuevo sobre el mismo archivo `.db` sin volver a sembrar | La función cargada antes del reinicio sigue estando. Confirma que quedó en SQLite y no en memoria. |

*Lo que la construcción corrigió en los documentos:* `ESPECIFICACION.md` no definía dónde empieza
y termina "la semana vigente". Quedó definida en el glosario (**jueves a miércoles**, porque los
estrenos entran los jueves), y en `DISENO.md` se agregaron 7 decisiones nuevas con su razón: la
semana vigente, qué funciones ve el cliente, la forma de cada sala (10×12 y 6×10), el módulo
`node:sqlite` en vez de un paquete externo, las contraseñas cifradas con scrypt, `express-session`
para la sesión del personal, y Pico.css guardada dentro del proyecto.

Al revisar el slice ya construido aparecieron dos huecos más, y los dos se corrigieron primero en
la especificación y después en el código:

- **RF-1 no pedía el tamaño de la sala.** El cliente leía "Sala 1" y "Sala 2" sin ninguna forma de
  saber cuál era la grande. RF-1 ahora exige mostrarlo, este vertical slice ganó una condición y su
  comprobación, y la cartelera lo muestra.
- **Asientos fuera de servicio.** Se revisó si existía una regla sobre butacas deshabilitadas en la
  sala pequeña: no aparece en ninguna consigna, ni en el `PROMPT.md`, ni en los documentos
  congelados del Caso práctico 3. Se decidió dejarlo fuera de alcance y quedó escrito como tal en
  `ESPECIFICACION.md`, para que no vuelva a discutirse como un hueco silencioso.

*Sistema de diseño.* Ya cerrado el slice, la estudiante aportó `VISUALS.md` —paleta oscura,
tipografías, escala de espaciado, formas y componentes— y se aplicó a las pantallas construidas.
Qué implicó, además de reescribir la hoja de estilos propia:

- `DISENO.md` sumó tres decisiones: `VISUALS.md` como fuente del estilo con Pico.css conservado
  como base y reconfigurado con sus variables; el modo oscuro fijo; y las tipografías guardadas
  dentro del proyecto (`public/fonts/`, 5 archivos, ~92 KB, licencia OFL-1.1) para no depender de
  internet, mismo criterio que ya se había usado con Pico.css.
- **Conflicto resuelto a favor de `DISENO.md`:** `VISUALS.md` propone un semáforo de tres estados
  para el mapa de asientos, con amarillo para "reservado". Se mantuvieron **dos** estados —verde
  disponible, gris no disponible—, porque al cliente un asiento reservado por otro y uno vendido le
  sirven para lo mismo. El amarillo queda definido y sin usar, y así está escrito en `DISENO.md`
  para que no parezca un olvido. Hay una comprobación que lo fija: la leyenda del mapa debe tener
  exactamente dos estados.
- Comprobaciones nuevas: el formato de cada función se muestra como pastilla con el color que le
  asigna `VISUALS.md`; las tres tipografías se sirven desde el proyecto y la hoja de estilos no
  pide nada a internet; y la de los dos estados del mapa.
- `semana4/CLAUDE.md` sumó `VISUALS.md` a la lista de entregables al repositorio.

*Segunda revisión del sistema de diseño.* Al mirarlo funcionando aparecieron tres cosas más:

- **El amarillo vuelve, con otro significado.** Se revisó la decisión de dos estados: el cliente sí
  necesita ver cuál asiento está tomando mientras elige. El mapa pasa a **tres** estados —verde
  disponible, amarillo *lo que este cliente está eligiendo*, gris no disponible—, y sigue **sin**
  distinguir "reservado por otro" de "vendido", porque para quien mira son lo mismo. Ojo: eso le da
  al amarillo un significado distinto del que le da `VISUALS.md`, y así quedó escrito en
  `DISENO.md`. El comportamiento se construye en el **vertical slice 2**, que es donde se elige
  asiento; este vertical slice sigue mostrando solo verde, y su comprobación de dos estados en la
  leyenda sigue siendo la correcta para lo que hoy existe.
- **Los afiches no se veían porque el sistema no los guardaba.** `VISUALS.md` da por sentado un
  afiche en cada tarjeta, pero la entidad Película era solo `id, nombre` y ningún requisito lo
  pedía. Se corrigió primero la especificación (glosario "Afiche", RF-1, RF-12 y el nuevo REG-4) y
  el modelo de datos de `DISENO.md`, con tres decisiones nuevas: el archivo vive en `datos/afiches/`
  y la base guarda solo su nombre; los archivos subidos se reciben con `multer`, renombrados por el
  sistema, solo imágenes y hasta 2 MB; y una película sin afiche muestra un bloque con su título,
  porque el afiche es opcional. Los dos afiches de los datos de prueba son dibujos inventados para
  este proyecto: no son de películas reales.
- **La marca y el acceso del personal.** "Cine Variedades" pasó a 28px —`VISUALS.md` no define un
  tamaño para la marca—, y el acceso del personal salió del encabezado y se fue a un pie de página
  nuevo, porque la cartelera es la pantalla del cliente. El personal que ya entró sigue viendo su
  cuenta en el encabezado. Las dos decisiones quedaron en `DISENO.md`, y hay una comprobación que
  fija que ese enlace esté en el pie y no en el encabezado.

*Tercera revisión: la cartelera tenía una sola función por película.* Al mirarla se vio que cada
película aparecía una o dos veces en toda la semana. La causa: este vertical slice pedía como
comprobación "al menos 2 películas y 3 funciones", que es un **mínimo para verificar**, y los datos
de prueba se sembraron con exactamente ese mínimo. Buscando en los documentos apareció —otra vez—
un dato del negocio que estaba en la consigna original y nunca había llegado a la especificación:
el cine *"programa entre tres y cuatro funciones diarias en cada uno [de los dos auditorios]"*.
Qué se hizo:

- `ESPECIFICACION.md` incorporó el dato al glosario "Cartelera": una semana típica tiene entre 42 y
  56 funciones. Con eso, RF-1 pasó a exigir que la cartelera se organice **por película**, con los
  horarios de cada una agrupados por día: una lista corrida de decenas de funciones sueltas sería
  ilegible.
- `DISENO.md` sumó la decisión de agrupar por película —descartando agrupar por día, que obligaría
  a repetir el afiche siete veces— y la de cómo se acomoda la tarjeta en pantallas chicas: abajo de
  480px el afiche va arriba, a lo ancho, y los textos debajo.
- Los datos de prueba pasaron de 3 funciones a **42**: 3 diarias en cada sala, los 7 días, con 4
  películas rotando entre los días y entre las dos salas. Se dibujaron dos afiches inventados más.
- Comprobaciones nuevas: que el sembrado deje 3 funciones diarias por sala los 7 días; que cada
  película tenga varias funciones y no una sola; que la cartelera muestre una tarjeta por película
  y no una por función; y que dentro de cada tarjeta los horarios estén agrupados por día.

*Cuarta revisión: la cartelera se ve un día a la vez.* Mostrar los siete días de golpe seguía
siendo demasiado, y además la programación no era la del cine: una misma película saltaba entre las
dos salas. Se revisó la consigna para ver si obligaba a tener más de dos películas —**no dice nada
al respecto**, ni la del Caso práctico 3 ni la del 4 ni el `PROMPT.md`— y con eso se decidió:

- `ESPECIFICACION.md` sumó **RN-15**: cada sala proyecta una sola película durante toda la semana,
  así que una cartelera semanal tiene dos películas, una por sala. Y RF-1 pasó a describir la
  cartelera **un día a la vez**: el cliente elige el día en una lista desplegable y ve, para ese
  día, cada sala con su película y sus horarios.
- `DISENO.md` sumó tres decisiones: mostrar un día a la vez encabezando por sala y no por película;
  que el desplegable funcione **sin JavaScript**, con el día viajando en la dirección de la página
  para que la pantalla se pueda compartir por enlace; y que RN-15 **no se hace cumplir por
  software** —administración es personal del cine y sabe lo que carga—, pero la pantalla no se rompe
  si una sala termina con dos películas: dibuja un bloque por cada una.
- Los horarios dejaron de ser botones con recuadro: ahora son solo la hora, en texto, con la
  etiqueta de doblada o subtitulada en tamaño menor al de la hora, porque es un dato de apoyo.
- Los datos de prueba pasaron de 4 películas a **2**, una por sala, con sus 21 funciones cada una.
  Los otros dos afiches quedan en `afiches-de-muestra/` para probar la subida a mano.

*Quinta revisión: los días en fila, no en un desplegable.* La estudiante encontró una cartelera de
cine real y prefirió su distribución. Se tomó **solo la distribución**, sin los datos que ese
ejemplo trae y que nuestro sistema no guarda —género, duración, clasificación, sinopsis— ni el
buscador y los filtros, que además no filtrarían nada con dos películas en cartel:

- Los siete días de la semana pasan a estar **en fila arriba, todos a la vista**, cada uno un
  enlace. Se ve la semana entera de un vistazo y se elige en un clic, sin el segundo clic que
  pedía el desplegable, y sigue sin usarse nada de JavaScript.
- Los días que ya pasaron **se muestran apagados en vez de esconderse**: así la fila no cambia de
  tamaño y el cliente conserva la referencia de en qué parte de la semana está.
- Los horarios pasaron a **agruparse por formato** dentro de cada sala: la etiqueta "Subtitulada"
  aparece una vez por grupo y no pegada a cada hora, que era lo que la ensuciaba.

*Lo que a propósito NO se construyó,* para no meter andamiaje fuera de su vertical slice: no
existe la tabla de Compras (la crea el vertical slice 2, con la primera reserva) ni el estado
"cancelada" de una Función (lo agrega el vertical slice 6). Por eso el mapa de asientos de este
slice muestra todo disponible: no hay nada que pueda ocuparlo todavía.

---

### Vertical slice 2: Reserva temporal de asiento
**Qué tiene que ser cierto**
- El cliente, desde el mapa de asientos de una función, elige uno o más asientos disponibles
  (RF-3).
- Mientras el cliente los va eligiendo, esos asientos se le muestran **en amarillo** en su propio
  mapa, para que vea cuáles está tomando antes de confirmar (`DISENO.md` → "Otras decisiones",
  representación visual del mapa de asientos). Este es el vertical slice que estrena el amarillo:
  el vertical slice 1 solo muestra verde.
- Al elegirlos, quedan reservados temporalmente: el mapa deja de mostrarlos disponibles para
  cualquier otro cliente que lo consulte (RN-6, RN-7). Los otros clientes los ven **en gris**, sin
  distinguirlos de un asiento ya vendido.
- Si pasan 5 minutos desde la reserva sin que se complete el pago, el asiento vuelve a aparecer
  disponible (RF-4). (Completar el pago se construye en el vertical slice 3; hasta que ese slice
  exista, toda reserva de este slice vence a los 5 minutos porque no hay forma de pagarla.)
- Si dos clientes eligen el mismo asiento casi al mismo tiempo, el sistema revisa de nuevo la
  disponibilidad al confirmar; a quien pierde la carrera se le informa que el asiento ya no está
  disponible y se le muestra el mapa actualizado (`DISENO.md` → "Manejo de errores").

**Con qué se comprueba**
- Como cliente, elegir 2 asientos disponibles y verificar que en el propio mapa quedan en amarillo,
  y que una segunda sesión de cliente que consulta el mismo mapa ya no los ve disponibles: los ve
  en gris, igual que un asiento vendido.
- Prueba automatizada: crear una reserva, retroceder 6 minutos su fecha/hora de creación en la
  base de datos, volver a pedir el mapa, y verificar que esos asientos aparecen disponibles otra
  vez.
- A mano, una sola vez: reservar un asiento, esperar 5 minutos reales sin hacer nada, recargar el
  mapa y verificar que vuelve a estar disponible.
- Prueba automatizada: lanzar dos pedidos de reserva del mismo asiento al mismo tiempo y
  verificar que exactamente uno queda reservado y el otro recibe la respuesta de "asiento ya no
  disponible".

**Toca**: Ventas (reserva), Cartelera (lectura).

**Interfaces**
- Consume: Función y Asiento del vertical slice 1.
- Produce: la Compra en estado "reservada temporalmente", con función, asiento(s) y la fecha/hora
  de creación de la reserva (`DISENO.md` → "Modelo de datos"). En este estado la Compra todavía
  no tiene nombre ni número de identificación del cliente, ni descuento aplicado, ni precio
  pagado, ni código de confirmación: esos campos quedan vacíos y el vertical slice 3 los llena al
  completar el pago.

**Evidencia** *(vacía al escribir el plan; se llena al cerrar el slice, con fecha)*

---

### Vertical slice 3: Compra en línea completa
**Qué tiene que ser cierto**
- Después de reservar asiento(s) (vertical slice 2), el cliente indica su nombre y número de
  identificación (RF-6), sin que esto cree una cuenta (RN-14).
- El cliente puede declarar si es estudiante (RF-5).
- El precio base y los dos porcentajes de descuento (50% de miércoles, 30% de estudiante) se leen
  de la configuración de la aplicación, no están escritos dentro de la regla ni guardados en la
  base de datos (`DISENO.md` → "Otras decisiones").
- El sistema calcula el precio de cada asiento: precio base; mitad del precio base si la función
  es un miércoles (RN-2); 30% de descuento si declaró estudiante (RN-3); si ambos aplican, solo
  el mayor de los dos, sin acumular (RN-4, RF-8).
- El cliente simula el pago; la compra pasa de "reservada" a "pagada" sin conectarse a ningún
  medio de pago real (RF-9).
- Al confirmarse el pago, el sistema muestra en pantalla un código de confirmación con película,
  sala, función y el o los asientos comprados (RF-10).
- Si pasaron más de 5 minutos entre reservar y pagar, la reserva ya venció (vertical slice 2) y
  el sistema no permite completar la compra sobre esos asientos — hay que elegir de nuevo.

**Con qué se comprueba**
- Reservar un asiento en una función de miércoles, pagar sin declararse estudiante, y verificar
  que el precio cobrado es la mitad del precio base.
- Reservar un asiento en una función que no es miércoles, declararse estudiante, pagar, y
  verificar que el precio cobrado es el 70% del precio base y que la compra queda registrada con
  descuento "estudiante".
- Reservar un asiento en una función de miércoles, declararse estudiante, pagar, y verificar que
  el precio cobrado es la mitad del precio base —el descuento de miércoles, que es el mayor de
  los dos— y que la compra queda registrada con descuento "miércoles", no con los dos descuentos
  sumados.
- Completar una compra y verificar que en pantalla aparece un código de confirmación con
  película, sala, función y asiento(s).
- Reservar un asiento, esperar más de 5 minutos, e intentar pagar: verificar que el sistema no lo
  permite e indica que hay que elegir de nuevo.

**Toca**: Ventas (pago y confirmación).

**Interfaces**
- Consume: la Compra en estado "reservada temporalmente" del vertical slice 2, y el archivo de
  configuración del vertical slice 1, al que este slice le agrega el precio base y los dos
  porcentajes de descuento.
- Produce: la Compra en estado "pagada", con nombre e identificación del cliente, si declaró
  estudiante, qué descuento se aplicó, el precio pagado, y el código de confirmación
  (`DISENO.md` → "Modelo de datos", entidad Compra). Los vertical slices 4, 5, 6 y 7 leen estos
  mismos campos.

**Evidencia** *(vacía al escribir el plan; se llena al cerrar el slice, con fecha)*

---

### Vertical slice 4: Venta en taquilla
**Qué tiene que ser cierto**
- Una cuenta con rol taquilla elige una función y asiento(s) disponibles en nombre de un cliente
  presencial, siguiendo el mismo recorrido de reserva, descuento, pago y confirmación de los
  vertical slices 2 y 3 (RF-11).
- La cuenta de taquilla anota el nombre y número de identificación del cliente.
- La compra resultante queda registrada con método de compra "taquilla" (RN-8) y con qué cuenta
  de personal la vendió (`DISENO.md` → "Modelo de datos", entidad Compra).
- Sin ninguna cuenta de personal con rol taquilla identificada, esta acción no se puede realizar.

**Con qué se comprueba**
- Con la cuenta de taquilla, elegir una función, elegir un asiento disponible, anotar nombre e
  identificación de un cliente de prueba, simular el pago, y verificar que la compra queda con
  método "taquilla" y la cuenta de taquilla que la vendió.
- Verificar que ese mismo asiento, visto desde el mapa de un cliente en línea, aparece vendido
  inmediatamente después.
- Intentar la misma acción sin ninguna cuenta de taquilla identificada y verificar que el sistema
  no lo permite.

**Toca**: Ventas, Cuentas y permisos.

**Interfaces**
- Consume: el motor de reserva, descuento, pago y confirmación de los vertical slices 2 y 3;
  Cuentas de personal del vertical slice 1.
- Produce: Compra con método de compra = "taquilla" y cuenta vendedora — mismos campos que en el
  vertical slice 3, con este valor adicional. El vertical slice 7 lee este campo para la
  comparación en línea vs. taquilla.

**Evidencia** *(vacía al escribir el plan; se llena al cerrar el slice, con fecha)*

---

### Vertical slice 5: Código perdido
**Qué tiene que ser cierto**
- Una cuenta de personal de taquilla puede buscar una compra pagada por el nombre o el número de
  identificación del cliente (RF-7).
- El resultado de la búsqueda muestra los mismos datos que el código de confirmación: película,
  sala, función y asiento(s), para que taquilla la confirme ante el cliente que perdió su código.

**Con qué se comprueba**
- Completar una compra en línea (vertical slice 3) con un nombre e identificación de prueba.
- Con la cuenta de taquilla, buscar esa compra por el número de identificación y verificar que
  aparece con los mismos datos del código de confirmación original.
- Buscar por un número de identificación que no compró nada y verificar que el sistema indica
  que no hay resultados.

**Toca**: Ventas (búsqueda).

**Interfaces**
- Consume: Compra pagada, con nombre e identificación del cliente, de los vertical slices 3 y 4.
- Produce: nada nuevo — es una consulta de solo lectura.

**Evidencia** *(vacía al escribir el plan; se llena al cerrar el slice, con fecha)*

---

### Vertical slice 6: Cancelar función
**Qué tiene que ser cierto**
- Una cuenta con rol administración puede marcar una función como cancelada (RF-13; `DISENO.md`
  → "Panorama de la arquitectura" asigna cancelar funciones a administración).
- Una cuenta con rol taquilla no puede marcar una función como cancelada.
- Al cancelarla, la función queda marcada como cancelada y deja de estar disponible para nuevas
  compras en la cartelera que ve el cliente.
- El sistema conserva la lista de todas las compras pagadas hechas para esa función, con nombre y
  número de identificación de cada cliente, consultable por el personal (RN-11).
- La cancelación no borra ni modifica las compras existentes — solo el estado de la función.

**Con qué se comprueba**
- Completar 2 compras de prueba para la misma función (una en línea, una en taquilla).
- Con la cuenta de administración, marcar esa función como cancelada.
- Verificar que la función ya no aparece disponible para elegir en la cartelera del cliente.
- Verificar que el personal puede consultar la lista de las 2 compras de esa función, con nombre
  e identificación de cada cliente.
- Con la cuenta de taquilla, intentar marcar otra función como cancelada y verificar que el
  sistema lo rechaza.

**Toca**: Cartelera.

**Interfaces**
- Consume: Función del vertical slice 1; Compra pagada de los vertical slices 3 y 4.
- Produce: Función con estado "cancelada". El vertical slice 7 lee este estado para que los
  datos históricos sigan disponibles en los indicadores.

**Evidencia** *(vacía al escribir el plan; se llena al cerrar el slice, con fecha)*

---

### Vertical slice 7: Reportes e indicadores
**Qué tiene que ser cierto**
- Dentro del sistema, el personal puede consultar: boletos vendidos por película por mes,
  ocupación por día y horario, el efecto del descuento de miércoles en la asistencia, el efecto
  de doblada/subtitulada en la asistencia, y la comparación de ventas en línea vs. taquilla
  (RF-15).
- Estos indicadores se calculan a partir de las Compras pagadas y las Funciones existentes
  (REG-3), incluidas las de funciones ya canceladas.

**Con qué se comprueba**
- Con los datos de prueba de los vertical slices 3, 4 y 6 (al menos 3 compras en distintas
  funciones, algunas en línea y otras en taquilla, alguna con descuento de miércoles), abrir la
  consulta de indicadores dentro del sistema y verificar que:
  - el conteo de boletos vendidos por película coincide con las compras de prueba,
  - la comparación en línea vs. taquilla muestra la proporción correcta,
  - las compras de la función cancelada del vertical slice 6 siguen apareciendo en los datos.

**Toca**: Reportes.

**Interfaces**
- Consume: Compra (de los vertical slices 3, 4) y Función (de los vertical slices 1, 6).
- Produce: los cálculos de indicadores, reutilizados por el vertical slice 8 para el reporte
  mensual de boletos por película.

**Evidencia** *(vacía al escribir el plan; se llena al cerrar el slice, con fecha)*

---

### Vertical slice 8: Reporte mensual automático
**Qué tiene que ser cierto**
- Una vez al mes, sin que nadie lo dispare manualmente, el sistema genera el reporte de boletos
  vendidos por película del mes y lo envía por correo electrónico a la dueña (RF-14, `DISENO.md`
  → "Cómo se dispara el reporte mensual automático", Opción A).
- El envío del correo es simulado: el sistema escribe el correo generado —destinatario, asunto y
  cuerpo— en una carpeta local que se puede abrir y leer, sin conectarse a ningún servidor de
  correo (`DISENO.md` → "Otras decisiones").
- El reporte generado queda disponible dentro del sistema (mismo cálculo del vertical slice 7),
  incluso si el envío del correo falla.
- Pendiente #1 (`DISENO.md` → "Decisiones dejadas abiertas"): el formato exacto del reporte
  dentro del sistema lo define quien construya este slice.
- Pendiente #2 (`DISENO.md` → "Decisiones dejadas abiertas"): la redacción exacta del correo la
  define quien construya este slice.

**Con qué se comprueba**
- Con los datos de prueba cargados (compras de los vertical slices 3, 4 y 6), disparar el proceso
  mensual apuntándolo al mes de esas compras, y verificar que genera un reporte con el mismo
  conteo de boletos por película que muestra la consulta del vertical slice 7.
- Verificar que en la carpeta de correos aparece un archivo con el destinatario de la dueña, el
  asunto del mes y el mismo conteo de boletos por película.
- Hacer que la escritura del correo falle (por ejemplo, apuntando la carpeta de correos a una
  ruta inválida) y verificar que el reporte sigue disponible dentro del sistema igual.

**Toca**: Reportes.

**Interfaces**
- Consume: los cálculos de "boletos por película por mes" del vertical slice 7.
- Produce: el envío mensual por correo — no lo consume ningún slice posterior.

**Evidencia** *(vacía al escribir el plan; se llena al cerrar el slice, con fecha)*

## Cobertura
| Requisito o recorrido | Vertical slice |
|---|---|
| RF-1 | 1 |
| RF-2 | 1 |
| RF-3 | 2 |
| RF-4 | 2 |
| RF-5 | 3 |
| RF-6 | 3 |
| RF-7 | 5 |
| RF-8 | 3 |
| RF-9 | 3 |
| RF-10 | 3 |
| RF-11 | 4 |
| RF-12 | 1 |
| RF-13 | 6 |
| RF-14 | 8 |
| RF-15 | 7 |
| RN-1 a RN-4 (precios y descuentos) | 3 |
| RN-6, RN-7 (reserva y liberación) | 2 |
| RN-8 (método de compra) | 4 |
| RN-9 (cuentas de personal) | 1, 4 |
| RN-10 (doblada/subtitulada) | 1 |
| RN-11 (registro para reembolso) | 6 |
| RN-12 (cartelera solo por administración) | 1 |
| RN-13 (compra pagada es final) | Restricciones globales — ningún vertical slice construye una cancelación por parte del cliente |
| RN-14 (datos del cliente sin cuenta) | 3 |
| REG-1 (qué se registra de cada compra) | 3, 4 |
| REG-2 (qué se registra de cada función) | 1, 6 |
| REG-3 (preguntas que se pueden contestar) | 7 |
| REG-4 (nombre y afiche de cada película) | 1 |
| Recorrido "Compra en línea (termina bien)" | 1, 2, 3 |
| Recorrido "Venta en taquilla (termina bien)" | 1, 2, 4 |
| Recorrido "Código de confirmación perdido" | 5 |
| Recorrido "Asiento ya no disponible" | 2 |
| Recorrido "Pago no completado a tiempo" | 2 |
| Recorrido "Función cancelada por falla técnica" | 6 |
| Recorrido "Carné de estudiante inválido al entrar" | Fuera del plan (ver abajo) |
| Salida "Boletos vendidos por película" a la dueña | 8 |

## Fuera del plan
- RN-5 y el recorrido "Carné de estudiante inválido al entrar": la verificación del carné ocurre
  en la puerta de la sala, fuera del sistema. La Compra ya quedó registrada con el descuento
  aplicado al momento de comprar (vertical slice 3); el sistema no necesita ninguna acción
  distinta en ese momento (`DISENO.md` → "Manejo de errores").
