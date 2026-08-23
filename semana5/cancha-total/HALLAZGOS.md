# Hallazgos

Lo que la suite descubrió y **esta etapa no corrige**. Cada hallazgo de comportamiento tiene su
prueba escrita, corriendo, y marcada como **fallo esperado** con su número. Se cierran en el turno
de refactorización, quitando la marca — y el avance se mide contando marcas quitadas.

Levantado el **2026-08-23**, contra [`ESPECIFICACION.md`](ESPECIFICACION.md) y sobre el sistema tal
como lo entregó el proveedor (commit `65ce4b4`).

## Estado de la suite

```
48 pruebas · 33 en verde · 0 fallos · 15 marcadas como fallo esperado
```

Eran 40 cuando se escribió la suite. Las 8 que se sumaron son las que **no se podían escribir**
hasta que se pagó H-14: las que dependen de la hora del reloj.

La marca de fallo esperado es lo que permite que la puerta sirva desde hoy: la prueba queda escrita
tal cual, corre, imprime su motivo, y **no rompe la verificación**. Sin eso, un `verificar.sh` que
siempre falla se ignora en dos horas.

## Las dos clases, y por qué se separan

- **Comportamiento** — el código hace algo que contradice la especificación. Se arregla cambiando
  lo que el sistema hace.
- **Estructura** — la condición no se puede probar sin cambiar el código. No hay nada mal en lo que
  el sistema hace; lo que estorba es cómo está armado.

Son dos trabajos distintos y van en commits distintos: en un commit de estructura, la suite da lo
mismo antes y después.

---

## Comportamiento

| # | Condición | Qué hace hoy | Prueba |
|---|---|---|---|
| **H-01** | **E-06, E-10** · Un bloque que empieza entre las 17:00 y las 21:00 cuesta ₡20.000, porque a las 17:00 se enciende la luz | Cobra ₡15.000 a las 17:00 y solo sube a ₡20.000 desde las 18:00. Al cliente frecuente le cobra ₡13.500 en vez de ₡18.000. Está escrito en los tres lugares que calculan la tarifa | `pruebas/tarifas.test.js::P-03`, `::P-05`, `pruebas/descuento.test.js::P-14` |
| **H-02** | **E-08** · Para el descuento solo cuentan las reservas activas; las canceladas no | El conteo del mes incluye las canceladas, así que quien aparta y cancela llega al 10% sin haber jugado | `pruebas/descuento.test.js::P-10` |
| **H-03** | **E-11** · El teléfono es obligatorio | Se puede reservar sin teléfono. Efecto de segundo orden: el conteo del descuento agrupa por teléfono, así que **todas las reservas sin teléfono se suman entre sí** y le regalan el 10% a un desconocido | `pruebas/datos-de-la-reserva.test.js::P-15` |
| **H-04** | **E-12** · El teléfono son exactamente 8 dígitos | No se revisa nada: entra un teléfono de 3 dígitos, de 20, o con letras. El cliente deja de ser ubicable, que es para lo que se pide el teléfono | `pruebas/datos-de-la-reserva.test.js::P-16`, `::P-17`, `::P-18` |
| **H-05** | **E-40** · La fecha tiene que existir en el calendario | Solo se revisa la forma «cuatro dígitos, guion, dos, guion, dos». Se acepta el 30 de febrero, y la reserva queda en un día al que nadie puede llegar | `pruebas/datos-de-la-reserva.test.js::P-23` |
| **H-06** | **E-19** · Solo se reserva un bloque que todavía no empezó | Se acepta cualquier fecha, incluso del año pasado | `pruebas/reservar-en-el-tiempo.test.js::P-29`, `pruebas/reservar-a-tiempo.test.js::P-46`, `::P-47` |
| **H-07** | **E-35** · El nombre y el teléfono se muestran siempre como texto | Se insertan en la página sin limpiarlos, así que un nombre con signos de código lo ejecuta el navegador en vez de mostrarlo. En el caso leve descuadra la pantalla; en el grave, un nombre de cliente puede dejar código que corre cuando la administradora abre la lista del día | `pruebas/lo-que-se-ve.test.js::P-38` |
| **H-08** | **E-33** · El precio que se muestra antes de confirmar es el que se va a cobrar | La cotización mira solo el horario y nunca el cliente: muestra ₡15.000 y cobra ₡13.500 | `pruebas/lo-que-se-ve.test.js::P-39` |
| **H-09** | **E-34** · Sin el teléfono completo se avisa que falta para saber el precio | Muestra un número pelado, que puede no ser el que se cobra, y no lo dice | `pruebas/lo-que-se-ve.test.js::P-40` |
| **H-10** ✅ **CERRADO** | **E-21, E-22, E-23** · Se puede cancelar hasta 24 horas antes de la hora de inicio del partido, y el borde exacto es inclusive | **Comparaba solo días, sin mirar la hora**: cancelaba cualquier reserva de un día posterior a hoy. Fallaba en un solo sentido —**dejaba cancelar lo que debía cobrarse**— y el caso era el que la administradora describió: partido mañana a las 8:00, ya las 23:00 de hoy, faltan 9 horas, y lo cancelaba igual. Pasaba con cualquier partido de mañana cuya hora ya había pasado hoy. Los demás casos coincidían con la condición por casualidad: un partido de hoy está siempre a menos de 24 horas, y uno de dentro de dos días o más está siempre a más. El mensaje de rechazo hablaba de 24 horas, pero la comprobación que hacía era otra | `pruebas/cancelar-a-tiempo.test.js::P-41`, `::P-45`, `pruebas/cancelar-en-el-borde.test.js::P-43` |

## Estructura

| # | Qué no se puede probar, y qué estorba | Prueba |
|---|---|---|
| **H-11** | `server.js` no exporta nada y arranca a escuchar en cuanto se carga. **Ninguna regla se puede probar por separado**: para comprobar una tarifa hay que levantar la aplicación completa. Es la razón por la que la tarifa y el descuento, que son cálculos con bordes y les correspondería nivel unidad, se prueban a nivel integración | Sin prueba propia: se ve en el andamio que las 48 pruebas necesitan (`pruebas/servidor-de-pruebas.js`) |
| **H-12** | La base de datos está en una ruta fija dentro del código. La suite tiene que **apartar la base real y devolverla al terminar**, con el riesgo de perderla si una corrida se corta a la mitad | Sin prueba propia |
| **H-13** | El puerto 3000 está fijo en el código. La verificación **no puede correr con otra aplicación en ese puerto**, y si algo más lo está usando, las pruebas le hablan a la aplicación equivocada. Pasó de verdad la primera vez que se corrió esta suite: contestó otra aplicación y todo dio resultados inventados. El andamio ahora lo detecta y aborta con un mensaje claro, pero rodearlo no es arreglarlo | Sin prueba propia |
| **H-14** ✅ **PAGADA** | El reloj se lee directo del sistema y **no había manera de fijarlo desde una prueba**. Mientras fue así, H-10 no tenía prueba: cualquier prueba de la regla de las 24 horas daba un resultado distinto según la hora en que se corriera, y una prueba que falla una de cada diez corridas destruye la puerta de calidad. Bloqueaba también el borde de E-20. Era la deuda que estaba en el camino: sin pagarla, la regla de las 24 horas no se podía arreglar con red | Pagada el 2026-08-23. Las 8 pruebas que desbloqueó son la evidencia; ver más abajo |
| **H-15** ✅ **PAGADA** | La tarifa estaba escrita **tres veces** —en la portada, al crear la reserva y en la cotización—. Corregir la hora de la luz obliga a tocar los tres lugares, y tocar uno solo deja la aplicación mostrando un precio y cobrando otro | `pruebas/tarifas.test.js::P-05` la comprueba de refilón: exige que los tres caminos digan lo mismo |

---

## Lo que quedó sin cubrir, y por qué

No es lo mismo «no falla» que «no se probó». Esto es lo segundo:

| Condición | Por qué no tiene prueba |
|---|---|
| E-25 · una cancelada no se revive | No hay forma de intentarlo: el sistema no ofrece la operación |
| E-31, E-32 · el día de hoy por defecto, consultar cualquier fecha | Se ejercitan de refilón en casi todas las pruebas, no tienen prueba propia |
| E-36 a E-39, E-41 · lo que el sistema no hace | Una prueba que fije una ausencia impediría agregarla después |

## Cerrados, con su evidencia

### H-14 · el reloj no se podía fijar — **pagada** el 2026-08-23

El reloj quedó en un solo lugar, la función `ahora()`, que sin nada configurado devuelve la hora
del sistema igual que antes. La variable de entorno `CANCHA_TOTAL_AHORA` permite fijarlo desde una
prueba, en formato local sin zona: `2026-08-25T23:00:00`.

Es un cambio de estructura, no de comportamiento, y la prueba de eso es que **la suite dio lo
mismo antes y después**:

```
antes:   40 pruebas · pass 27 · fail 0 · todo 13 · código de salida 0
después: 40 pruebas · pass 27 · fail 0 · todo 13 · código de salida 0
```

Con esto se desbloquea H-10: las condiciones E-20, E-21 y E-22 ya se pueden probar.

### H-10 · la regla de las 24 horas — **cerrado** el 2026-08-23

La comprobación pasó de comparar fechas a medir cuánto falta hasta la **hora de inicio** del
partido, con el borde inclusive: si faltan 24 horas justas, todavía se cancela. El mensaje de
rechazo pasó a nombrar el inicio del partido en lugar de «el bloque», que es lo que E-23 pedía.

La evidencia de que las pruebas no se ablandaron para lograrlo: el commit del arreglo **solo borra
líneas** de los archivos de prueba —las tres marcas de fallo esperado— y no agrega ninguna.

```
pruebas/cancelar-a-tiempo.test.js      0 líneas agregadas, 2 borradas
pruebas/cancelar-en-el-borde.test.js   0 líneas agregadas, 1 borrada
```

Las cinco pruebas de la regla quedaron en verde, incluidas las dos que ya pasaban antes y que
estaban ahí justamente para que el arreglo no se pasara de estricto:

```
P-41  partido mañana 8:00, faltan 9 horas  -> no se cancela   ✔ (era rojo)
P-42  faltan exactamente 24 horas          -> se cancela      ✔
P-43  faltan 23 horas                      -> no se cancela   ✔ (era rojo)
P-44  faltan 33 horas                      -> se cancela      ✔
P-45  el mensaje nombra el plazo            -> lo nombra       ✔ (era rojo)
```

Estado de la suite: de `pass 30 / todo 18` a `pass 33 / todo 15`. Tres marcas menos, que es como
se mide el avance.

### H-15 · la tarifa estaba escrita tres veces — **pagada** el 2026-08-23

El cálculo quedó en una sola función, `tarifaDelBloque(hora)`, con sus tres valores como
constantes con nombre: `TARIFA_DIURNA`, `TARIFA_CON_LUZ` y `HORA_EN_QUE_SE_ENCIENDE_LA_LUZ`. Los
tres caminos —la portada, la creación de la reserva y la cotización— preguntan ahí.

**La hora de la luz sigue en las 18:00 en este commit**, a propósito: mover la tarifa de lugar y
cambiar cuánto se cobra son dos trabajos distintos. La prueba de que solo cambió la estructura es
que la suite dio lo mismo antes y después:

```
antes:   48 pruebas · pass 33 · fail 0 · todo 15 · código de salida 0
después: 48 pruebas · pass 33 · fail 0 · todo 15 · código de salida 0
```

Con esto, H-01 se arregla cambiando **un número en un solo lugar** en vez de tres, y ya no existe
la manera de dejar la aplicación mostrando un precio y cobrando otro.

## Cómo se cierra un hallazgo

1. Se arregla el código de producción hasta que su prueba pase **sin tocar la prueba**.
2. Se quita la marca `todo` de esa prueba.
3. Se anota acá la evidencia: la corrida en que pasó.
4. Estructura y comportamiento, en commits separados.
