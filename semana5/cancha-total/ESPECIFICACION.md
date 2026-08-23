# Especificación — Cancha Total F5

Qué tiene que hacer el sistema de reservas. **Este documento es la fuente de verdad**: de acá
salen las pruebas, y ninguna prueba se escribe contra el código.

Reconstruida el **2026-08-23**, porque el proveedor entregó el sistema sin un solo documento. No
describe lo que el código hace hoy: describe lo que el negocio necesita. Donde las dos cosas no
coinciden, el documento se queda con el negocio y la diferencia queda anotada en
[`HALLAZGOS.md`](HALLAZGOS.md).

## Las fuentes, y cuál gana

Cada afirmación lleva su fuente declarada. Son tres:

| Fuente | Qué significa |
|---|---|
| **ADM** | Lo dijo la administradora. Es la palabra final: donde ADM y el sistema hablan del mismo punto, **gana ADM**. |
| **SIS** | La administradora no lo menciona, y el comportamiento actual del sistema se toma como correcto. |
| **DEC** | Decisión tomada en la reconstrucción del 2026-08-23, donde ni ADM ni SIS alcanzaban: porque la administradora no lo mencionó y el comportamiento actual se juzgó equivocado, o porque una regla de ADM no traía su borde exacto. Cada una dice su razón. |

La columna **¿lo cumple hoy?** dice si el sistema entregado satisface la afirmación. Un «no» no se
arregla en este documento: se convierte en un hallazgo con su prueba en rojo.

---

## 1 · Qué se alquila

| # | Afirmación | Fuente | ¿Lo cumple hoy? |
|---|---|---|---|
| E-01 | Hay dos canchas techadas de fútbol 5, identificadas como cancha 1 y cancha 2. | ADM | sí |
| E-02 | Se alquila por bloques de una hora. El primer bloque del día empieza a las **8:00** y el último a las **21:00**: son **14 bloques por cancha por día**. | ADM | sí |
| E-03 | Se alquila **todos los días del año**. Ni los feriados ni la temporada alta cambian la disponibilidad. | ADM + DEC | sí |
| E-04 | Ni los feriados ni la temporada alta cambian el precio: las tarifas de la sección 2 valen los 365 días. *(DEC: el sistema trae una lista de 7 feriados y unos precios de diciembre-enero de ₡18.000 y ₡25.000, ambos apagados. Se decide que no son reglas del negocio; el propio proveedor anotó que el dueño canceló la idea de la temporada alta.)* | ADM + DEC | sí |

## 2 · Cuánto cuesta un bloque

| # | Afirmación | Fuente | ¿Lo cumple hoy? |
|---|---|---|---|
| E-05 | Un bloque que empieza entre las **8:00 y las 16:00 inclusive** cuesta **₡15.000** (tarifa diurna). | ADM | sí |
| E-06 | Un bloque que empieza entre las **17:00 y las 21:00 inclusive** cuesta **₡20.000**, porque a las 17:00 se enciende la luz. **El partido de las 17:00 ya va con luz.** | ADM | **no** — el sistema cobra ₡15.000 a las 17:00 y solo sube desde las 18:00 |

## 3 · El descuento de cliente frecuente

| # | Afirmación | Fuente | ¿Lo cumple hoy? |
|---|---|---|---|
| E-07 | Un cliente con **4 o más reservas en el mismo mes, contando la que está haciendo**, recibe **10% de descuento** en esa reserva. El cliente se identifica por su teléfono. | ADM | sí |
| E-08 | Para ese conteo **solo cuentan las reservas activas**. Las canceladas no cuentan: frecuente es el que juega, no el que aparta. | ADM | **no** — el sistema cuenta también las canceladas |
| E-09 | El mes que se cuenta es el **mes en que se juega el partido**, no el mes en que se hizo la reserva. *(DEC: la administradora dice «en el mismo mes» sin aclarar cuál; se decide el mes del partido porque ella misma define al frecuente como «el que juega».)* | DEC | sí |
| E-10 | Con descuento, un bloque diurno cuesta **₡13.500** y un bloque con luz **₡18.000**. | derivada de E-05, E-06, E-07 | parcial — el 10% se aplica bien, pero sobre la tarifa equivocada a las 17:00 (E-06) |

## 4 · Los datos de una reserva

| # | Afirmación | Fuente | ¿Lo cumple hoy? |
|---|---|---|---|
| E-11 | Una reserva lleva cancha, fecha, hora, nombre del cliente y teléfono. **Los cinco son obligatorios.** | ADM | **no** — el teléfono se puede dejar vacío |
| E-12 | El teléfono son **exactamente 8 dígitos**. Es la forma de ubicar al cliente y de reconocerlo como frecuente. | ADM | **no** — el sistema acepta cualquier cosa: vacío, letras, 3 dígitos o 20 |
| E-13 | La cancha tiene que ser 1 o 2; cualquier otro valor se rechaza. | SIS | sí |
| E-14 | La hora tiene que ser un bloque entero entre 8 y 21; cualquier otro valor se rechaza. | SIS | sí |
| E-15 | Cuando falta un dato o viene mal, la reserva **no se crea** y se muestra la lista de todo lo que hay que corregir. | SIS | sí |
| E-16 | La reserva guarda el precio que efectivamente se cobró, con descuento si aplicó. | SIS | sí |
| E-40 | La fecha tiene que **existir en el calendario**: el mes va de 1 a 12 y el día tiene que ser un día real de ese mes, contando los años bisiestos. Una fecha con la forma correcta pero imposible —2026-13-45, 2026-02-30, 2026-04-31— se rechaza. *(DEC: la administradora no lo menciona, pero no hay escenario en que aceptar una fecha inexistente sea correcto: la reserva queda en un día al que nadie puede llegar.)* | DEC | **no** — hoy solo se revisa la forma «cuatro dígitos, guion, dos, guion, dos» |

## 5 · Cuándo se puede reservar un bloque

| # | Afirmación | Fuente | ¿Lo cumple hoy? |
|---|---|---|---|
| E-17 | Un bloque con una reserva activa **no se vuelve a vender**, en esa cancha, esa fecha y esa hora. | ADM | sí |
| E-18 | Un bloque cuya reserva se canceló **queda libre otra vez** y se puede vender de nuevo. | ADM | sí |
| E-19 | Solo se acepta reservar un bloque **que todavía no empezó**: no se reserva en el pasado, ni un día anterior ni una hora de hoy que ya pasó. *(DEC: la administradora no lo menciona y el sistema lo permite; se decide rechazarlo porque una cancha no se alquila hacia atrás.)* | DEC | **no** — el sistema acepta cualquier fecha, incluso del año pasado |
| E-20 | El borde de E-19 es estricto: un bloque que empieza **exactamente en este momento** ya empezó, y se rechaza. A las 17:00 en punto, el primer bloque reservable es el de las 18:00. *(DEC: un borde sin número no se puede probar; se elige el criterio estricto por coherencia con «que todavía no empezó».)* | DEC | **no** — consecuencia de E-19 |

## 6 · Cancelar

| # | Afirmación | Fuente | ¿Lo cumple hoy? |
|---|---|---|---|
| E-21 | Se puede cancelar **hasta 24 horas antes de la hora de inicio del partido**. Con menos de 24 horas no hay cancelación y se cobra completo: si el partido es mañana a las 8:00 y ya son las 23:00 de hoy, no hay marcha atrás. | ADM | **no** — el sistema solo compara días, sin mirar la hora, así que acepta esa cancelación de las 23:00. Su rechazo de las reservas del mismo día, en cambio, sí coincide con esta condición: un partido de hoy está siempre a menos de 24 horas |
| E-22 | El borde de E-21 es inclusive: si faltan **exactamente** 24 horas, todavía se puede cancelar. *(DEC: «hasta 24 horas antes» no dice qué pasa en el instante justo; se elige a favor del cliente porque la administradora describe el límite como un plazo que se respeta, no como uno que se pierde.)* | DEC | **no** — consecuencia de E-21 |
| E-23 | Cuando la cancelación se rechaza, el mensaje dice el motivo verdadero: faltan menos de 24 horas para el inicio del partido. | ADM + DEC | **no** — hoy el mensaje habla de 24 horas pero la regla que aplicó fue otra, así que promete algo que no comprobó |
| E-24 | Una reserva ya cancelada no se puede volver a cancelar, y se avisa que ya lo estaba. | SIS | sí |
| E-25 | Una reserva cancelada **no se revive**. Si el cliente se arrepiente, se hace una reserva nueva, y el bloque puede estar tomado. *(DEC: la administradora no lo menciona; se confirma el comportamiento actual y se descarta agregar un botón de reactivar, que sería una función nueva.)* | DEC | sí |
| E-26 | Cancelar una reserva que no existe no cambia nada y se avisa. | SIS | sí |

## 7 · Ver el día

| # | Afirmación | Fuente | ¿Lo cumple hoy? |
|---|---|---|---|
| E-27 | Para una fecha se ve, en cada cancha, qué bloques están libres y qué bloques están ocupados, en los 14 bloques de E-02. | ADM | sí |
| E-28 | Para una fecha se ve la lista de reservas del día **con lo que se cobró en cada una**. | ADM | sí |
| E-29 | La lista del día incluye las canceladas, marcadas como tales, para que se distingan de las que se juegan. | SIS | sí |
| E-30 | Cuando una fecha no tiene ninguna reserva, se dice explícitamente que no hay, en vez de mostrar una tabla vacía. | SIS | sí |
| E-31 | Sin fecha indicada, se muestra el día de hoy. | SIS | sí |
| E-32 | Se puede consultar la disponibilidad y la lista de cualquier fecha, pasada o futura. *Consultar el pasado sí se puede; reservarlo no (E-19).* | SIS | sí |

## 8 · El precio que se ve antes de confirmar

| # | Afirmación | Fuente | ¿Lo cumple hoy? |
|---|---|---|---|
| E-33 | Antes de confirmar la reserva se muestra **el precio que se va a cobrar**, con el descuento ya aplicado cuando corresponde y con el detalle de por qué: «₡13.500, con 10% de descuento por cliente frecuente». *(DEC: la administradora no menciona esta pantalla; se decide que lo que se muestra tiene que ser lo que se cobra, porque las quejas por cobros son el motivo del encargo.)* | DEC | **no** — hoy solo muestra la tarifa del horario y nunca el descuento: muestra ₡15.000 y cobra ₡13.500 |
| E-34 | Mientras el teléfono no tenga sus 8 dígitos no se puede saber si hay descuento, así que se muestra la tarifa del bloque **junto con el aviso de que falta el teléfono para saber si aplica**. Al completarse el teléfono, el precio se actualiza. *(DEC: borde de E-33; sin este aviso la pantalla muestra un número que puede no ser el que se cobra, y no lo dice.)* | DEC | **no** — hoy muestra la tarifa sin ningún aviso |

## 9 · Cómo se muestran los datos que escribe el cliente

| # | Afirmación | Fuente | ¿Lo cumple hoy? |
|---|---|---|---|
| E-35 | El nombre y el teléfono se muestran en pantalla **como texto, siempre**: lo que la persona escribió se ve tal cual y nunca se interpreta como parte de la página. Un nombre con signos de código se muestra con esos signos y no hace nada más. *(DEC: la administradora no lo menciona; se decide corregirlo porque hoy un nombre puede alterar o romper la pantalla de la administradora, y arreglarlo no agrega ninguna función.)* | DEC | **no** — hoy el nombre y el teléfono se insertan en la página sin limpiarlos |

## 10 · Lo que el sistema no hace, y así se queda

Queda escrito para que nadie lo lea como un olvido. Ninguno de estos puntos genera hallazgo ni
trabajo en esta entrega: la consigna prohíbe agregar funciones nuevas.

| # | Afirmación | Fuente |
|---|---|---|
| E-36 | Una reserva no se edita. Solo se crea y se cancela. | SIS |
| E-37 | No hay usuarios ni contraseñas: cualquiera que abra la página puede cancelar la reserva de cualquiera. | SIS |
| E-38 | No hay tope de reservas por cliente, por día ni por mes. | SIS |
| E-39 | No se apartan dos horas seguidas en un solo pedido: son dos reservas. | SIS |
| E-41 | La base de datos es SQLite y así se queda. | ADM |

*E-40 estuvo en esta sección hasta el 2026-08-23, como algo que el sistema no comprueba y así se
quedaba. Se movió a la sección 4 convertido en una condición exigible: no hay escenario en que
aceptar una fecha inexistente sea correcto. Conserva su número para no renumerar lo demás.*

---

## Resumen de lo que no se cumple

Trece afirmaciones no las cumple el sistema entregado. Cada una va a tener su prueba en rojo y su
entrada en [`HALLAZGOS.md`](HALLAZGOS.md), con su clase:

| Afirmación | Qué falla |
|---|---|
| E-06 | La luz se cobra desde las 18:00 en vez de las 17:00 |
| E-08 | El descuento cuenta reservas canceladas |
| E-11 | El teléfono no es obligatorio |
| E-12 | El teléfono no se valida como 8 dígitos |
| E-19 | Se puede reservar en el pasado |
| E-20 | Se puede reservar un bloque que ya empezó |
| E-21 | La regla de las 24 horas no mira la hora, solo el día |
| E-22 | El borde exacto de las 24 horas no existe |
| E-23 | El mensaje de rechazo no dice el motivo que se comprobó |
| E-33 | El precio que se muestra no incluye el descuento |
| E-34 | No hay aviso de que falta el teléfono para saber el precio |
| E-35 | El nombre y el teléfono se insertan en la página sin limpiarlos |
| E-40 | Se acepta una fecha que no existe en el calendario |

E-10 no entra en la lista porque no falla por sí sola: falla arrastrada por E-06.
