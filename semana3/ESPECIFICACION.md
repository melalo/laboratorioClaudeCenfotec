# Especificación: Sistema de venta de boletos en línea — Cine Variedades

## Resumen
Sistema para que el Cine Variedades venda y administre boletos de sus funciones, tanto en línea
—desde el teléfono del cliente— como en taquilla —con el personal del cine—, reemplazando por
completo el cuaderno y el mapa de asientos en papel que se usan hoy.

## Glosario

| Término | Definición |
|---|---|
| Función | Una proyección de una película, en una fecha y hora determinadas, en una sala específica. |
| Cartelera | El conjunto de funciones programadas para la semana vigente. |
| Asiento | Un lugar de una sala, identificado por su fila (letra) y su número (columna). |
| Boleto | El derecho a ocupar un asiento en una función, incluido en una compra. Se descarta "entrada" como sinónimo, aunque la dueña use ambos indistintamente. |
| Compra | El registro de que uno o más boletos de una función fueron adquiridos, con su estado de pago. |
| Método de compra | Si una compra se originó en línea (desde el teléfono del cliente) o en taquilla (con el personal). |
| Cliente | La persona que compra un boleto, en línea o en taquilla. Se descartan "público" y "comprador" como sinónimos. |
| Personal | Quien trabaja para el cine y tiene cuenta en el sistema. Incluye al menos dos roles: taquilla (vende presencialmente) y administración (carga la cartelera). No incluye a la dueña. |
| Código de confirmación | Lo que el sistema muestra en pantalla al cliente para probar su compra: incluye el código, la película, la sala, la función y el o los asientos comprados. No hay boleto impreso. |
| Vale de cambio | El documento en papel que la taquilla entrega cuando se cancela una función por falla técnica. No se registra en el sistema. |

## Objetivos
- Permitir que el cliente elija su asiento y compre su boleto desde el teléfono.
- Permitir que el personal de taquilla venda boletos presenciales usando el mismo sistema.
- Aplicar automáticamente el precio, el descuento de miércoles y el de estudiante.
- Registrar lo necesario para generar el reporte mensual de boletos vendidos por película y
  otros indicadores de negocio que la dueña quiere poder consultar.
- Permitir marcar una función como cancelada por falla técnica, para que el personal identifique
  a quiénes hay que reembolsar en taquilla.

## Fuera de alcance
- El pago real (se simula: el sistema registra la compra como pagada, sin conectarse a ningún
  medio de pago).
- Emisión de boletos impresos o códigos de barras.
- El vale de cambio: su valor, fecha de vencimiento y canje son papel, fuera del sistema.
- Más de un cine, más de dos salas, o más de una semana de cartelera a la vez.
- Cuentas de cliente: el cliente no crea cuenta; solo el personal tiene cuenta.

## Reglas del negocio
1. RN-1: El precio base de un boleto es el mismo para todas las funciones, sin importar la
   sala o la película.
2. RN-2: Los miércoles, el precio del boleto es la mitad del precio base.
3. RN-3: Existe un descuento del 30% sobre el precio base para estudiantes con carné vigente.
   (Valor temporal para este ejercicio; puede ajustarse más adelante sin cambiar la regla.)
4. RN-4: Si una compra califica para el descuento de miércoles y el de estudiante a la vez, se
   aplica solo el mayor de los dos — no se acumulan.
5. RN-5: La validez del carné de estudiante se verifica al entrar a la sala, no al momento de la
   compra. Si no es válido, se cobra la diferencia en ese momento o se niega la entrada.
6. RN-6: Cada asiento de una función solo puede estar reservado o vendido a una persona a la vez.
7. RN-7: Al elegir un asiento, queda reservado temporalmente. Si el pago no se completa dentro de
   un plazo, la reserva se libera automáticamente y el asiento vuelve a estar disponible.
8. RN-8: El personal de taquilla realiza las ventas presenciales usando el mismo sistema que el
   cliente en línea. Toda compra queda registrada con su método de compra (en línea o taquilla).
9. RN-9: El personal necesita una cuenta para usar el sistema. El cliente que compra en línea no
   necesita cuenta.
10. RN-10: Cada función tiene un atributo que indica si es doblada o subtitulada, independiente
    de las otras funciones de la misma película esa semana.
11. RN-11: Cuando una función se cancela (por ejemplo, falla del proyector), queda marcada como
    cancelada en el sistema, y el personal puede consultar quiénes compraron boleto para ella.
    La devolución del dinero (efectivo o vale de cambio) ocurre fuera del sistema, en taquilla.
12. RN-12: La cartelera semanal la carga una cuenta de administración específica del personal,
    distinta de la que usa quien atiende taquilla. No la carga la dueña.
13. RN-13: Una compra ya pagada es final: el cliente no puede cancelarla por su cuenta. La única
    forma de que se libere y se reembolse es que el cine cancele la función completa (RN-11).
14. RN-14: Para comprar, el cliente indica su nombre y su número de identificación (sin crear
    cuenta). Si pierde su código de confirmación, puede recuperarlo en taquilla presentando su
    identificación.

## Qué queda registrado
1. REG-1: De cada compra: la función, el o los asientos, el método de compra (en línea o
   taquilla), si se aplicó un descuento y cuál, el precio pagado, si el cliente se declaró
   estudiante, y el nombre y número de identificación del cliente.
2. REG-2: De cada función: película, sala, fecha y hora, si es doblada o subtitulada, y si fue
   cancelada.
3. REG-3: Con lo anterior se puede contestar: boletos vendidos por película por mes, ocupación
   por día y horario, el efecto del descuento de miércoles y del formato (doblada/subtitulada)
   en la asistencia, y la comparación de ventas entre método de compra en línea y taquilla.

## Salidas que consume alguien más
| Quién | Qué recibe | Formato | Frecuencia |
|---|---|---|---|
| Dueña | Boletos vendidos por película | Reporte dentro del sistema, y por correo electrónico | Mensual |

## Recorridos

**Compra en línea (termina bien):**
1. El cliente abre el sistema y ve la cartelera de la semana vigente.
2. Elige una función.
3. Ve el mapa de asientos de la sala y elige uno o más asientos disponibles; quedan reservados
   temporalmente.
4. Indica su nombre y número de identificación, y declara si es estudiante, si corresponde.
5. Paga (simulado).
6. Recibe un código de confirmación en la pantalla de su teléfono.
7. El día de la función, muestra el código al entrar (y el carné, si declaró ser estudiante).

**Venta en taquilla (termina bien):**
1. El cliente llega a taquilla sin haber comprado antes.
2. El personal, con su cuenta, elige la función y los asientos junto con el cliente, y anota su
   nombre y número de identificación.
3. Registra el pago (simulado) con método de compra "taquilla".
4. El cliente recibe su código de confirmación.

**Código de confirmación perdido:** el cliente compró en línea pero perdió el código antes de la
función. Se acerca a taquilla y, presentando su identificación, el personal busca la compra por
nombre y número de identificación para confirmarla.

**Asiento ya no disponible:** en condiciones normales, el mapa de asientos muestra en todo
momento cuáles están disponibles y cuáles no, así que el cliente solo puede elegir uno libre.
Este recorrido es la excepción: dos clientes eligen el mismo asiento casi al mismo instante,
antes de que el mapa se actualice para el segundo. El sistema le informa a quien pierde esa
carrera que el asiento ya no está disponible y le pide elegir otro.

**Pago no completado a tiempo:** el cliente elige asientos pero no termina de pagar dentro del
plazo de reserva. El sistema libera esos asientos, que vuelven a estar disponibles para cualquiera.

**Función cancelada por falla técnica:** el personal marca la función como cancelada. El sistema
conserva el registro de quiénes compraron boleto para ella, para que taquilla pueda identificar
a quién reembolsar. La devolución en sí (efectivo o vale) ocurre fuera del sistema.

**Carné de estudiante inválido al entrar:** el cliente se declaró estudiante al pagar, pero no
presenta un carné válido al entrar. Se le cobra la diferencia en ese momento, o se le niega la
entrada (RN-5).

## Requisitos funcionales
1. RF-1: El sistema muestra la cartelera de la semana vigente: películas, horarios, sala, y si
   cada función es doblada o subtitulada.
2. RF-2: El sistema muestra el mapa de asientos de una función, indicando cuáles están
   disponibles, reservados temporalmente o vendidos.
3. RF-3: El cliente puede elegir uno o más asientos disponibles de una función; quedan reservados
   temporalmente al elegirlos.
4. RF-4: Si el pago no se completa dentro de un plazo desde la reserva, el sistema libera los
   asientos automáticamente.
5. RF-5: El cliente puede declarar si es estudiante al momento de comprar, para que se le
   aplique el descuento correspondiente.
6. RF-6: El sistema le pide al cliente su nombre y número de identificación al momento de
   comprar, sin que esto cree una cuenta.
7. RF-7: El personal puede buscar una compra por el nombre o número de identificación del
   cliente, para los casos en los que este perdió su código de confirmación.
8. RF-8: El sistema calcula el precio de cada asiento aplicando el precio base y, si corresponde,
   el descuento de miércoles o el de estudiante — solo el mayor de los dos si ambos aplican.
9. RF-9: El sistema simula el pago: registra la compra como pagada sin conectarse a un medio de
   pago real.
10. RF-10: Al confirmarse el pago, el sistema genera para el cliente un código de confirmación
    que muestra en pantalla la película, la sala, la función y el o los asientos comprados.
11. RF-11: El personal de taquilla, con su cuenta, puede realizar una compra en nombre de un
    cliente presencial (elegir función, asientos, aplicar descuentos, simular pago), quedando
    registrada con método de compra "taquilla".
12. RF-12: El personal de administración puede cargar la cartelera de la semana: películas,
    funciones, horarios, sala, y si cada función es doblada o subtitulada.
13. RF-13: El personal puede marcar una función como cancelada; el sistema conserva el registro
    de quiénes compraron boleto para ella.
14. RF-14: El sistema genera un reporte mensual de boletos vendidos por película, disponible
    dentro del sistema y enviado por correo electrónico a la dueña.
15. RF-15: El sistema permite consultar la ocupación por día y horario, el efecto del descuento
    de miércoles en la asistencia, el efecto de doblada/subtitulada en la asistencia, y la
    comparación de ventas por método de compra (en línea vs. taquilla).
