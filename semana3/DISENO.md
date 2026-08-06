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
- **Película** — id, nombre.
- **Función** — película, sala, fecha y hora, si es doblada o subtitulada, y si está activa o
  cancelada.
- **Compra** — función; uno o más asientos; nombre y número de identificación del cliente;
  método de compra (en línea/taquilla); si el cliente se declaró estudiante; qué descuento se
  aplicó (ninguno, miércoles o estudiante); precio pagado; estado (reservada temporalmente,
  pagada, o vencida); fecha y hora en que se creó la reserva (para calcular cuándo vence, según
  el plazo de la tabla de Otras decisiones); código de confirmación; y, si fue en taquilla, qué
  cuenta de personal la vendió.
- **Cuenta de personal** — nombre de usuario y rol (taquilla o administración).

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
| Representación visual del mapa de asientos | Colores (verde/gris) vs. solo texto | Verde = disponible, gris = bloqueado/vendido | Se lee más rápido de un vistazo. |

## Decisiones dejadas abiertas

| Qué no se decidió | Quién lo decide y cuándo |
|---|---|
| Formato exacto del reporte dentro del sistema (tabla, gráfico, etc.) | Quien construya el sistema, en el plan de la próxima sesión. |
| Redacción exacta del correo mensual a la dueña | Quien construya el sistema; se puede ajustar sin afectar este diseño. |
