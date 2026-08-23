# Hallazgos

Lo que la suite descubrió y **esta etapa no corrige**. Cada hallazgo de comportamiento tiene su
prueba escrita, corriendo, y marcada como **fallo esperado** con su número. Se cierran en el turno
de refactorización, quitando la marca — y el avance se mide contando marcas quitadas.

Levantado el **2026-08-23**, contra [`ESPECIFICACION.md`](ESPECIFICACION.md) y sobre el sistema tal
como lo entregó el proveedor (commit `65ce4b4`).

## Estado de la suite

```
40 pruebas · 27 en verde · 0 fallos · 13 marcadas como fallo esperado
```

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
| **H-06** | **E-19** · Solo se reserva un bloque que todavía no empezó | Se acepta cualquier fecha, incluso del año pasado | `pruebas/reservar-en-el-tiempo.test.js::P-29` |
| **H-07** | **E-35** · El nombre y el teléfono se muestran siempre como texto | Se insertan en la página sin limpiarlos, así que un nombre con signos de código lo ejecuta el navegador en vez de mostrarlo. En el caso leve descuadra la pantalla; en el grave, un nombre de cliente puede dejar código que corre cuando la administradora abre la lista del día | `pruebas/lo-que-se-ve.test.js::P-38` |
| **H-08** | **E-33** · El precio que se muestra antes de confirmar es el que se va a cobrar | La cotización mira solo el horario y nunca el cliente: muestra ₡15.000 y cobra ₡13.500 | `pruebas/lo-que-se-ve.test.js::P-39` |
| **H-09** | **E-34** · Sin el teléfono completo se avisa que falta para saber el precio | Muestra un número pelado, que puede no ser el que se cobra, y no lo dice | `pruebas/lo-que-se-ve.test.js::P-40` |
| **H-10** | **E-21, E-22, E-23** · Se puede cancelar hasta 24 horas antes de la hora de inicio del partido, y el borde exacto es inclusive | **Solo compara días, sin mirar la hora**: cancela cualquier reserva de un día posterior a hoy. Falla en un solo sentido —**deja cancelar lo que debería cobrarse**— y el caso es el que la administradora describió: el partido es mañana a las 8:00, ya son las 23:00 de hoy, faltan 9 horas, y el sistema lo cancela igual. Pasa con cualquier partido de mañana cuya hora ya pasó hoy. Los demás casos coinciden con la condición por casualidad: un partido de hoy está siempre a menos de 24 horas, y uno de dentro de dos días o más está siempre a más. El mensaje de rechazo habla de 24 horas, pero la comprobación que se hizo fue otra | **Sin prueba: bloqueada por H-14** |

## Estructura

| # | Qué no se puede probar, y qué estorba | Prueba |
|---|---|---|
| **H-11** | `server.js` no exporta nada y arranca a escuchar en cuanto se carga. **Ninguna regla se puede probar por separado**: para comprobar una tarifa hay que levantar la aplicación completa. Es la razón por la que la tarifa y el descuento, que son cálculos con bordes y les correspondería nivel unidad, se prueban a nivel integración | Sin prueba propia: se ve en el andamio que las 40 pruebas necesitan (`pruebas/servidor-de-pruebas.js`) |
| **H-12** | La base de datos está en una ruta fija dentro del código. La suite tiene que **apartar la base real y devolverla al terminar**, con el riesgo de perderla si una corrida se corta a la mitad | Sin prueba propia |
| **H-13** | El puerto 3000 está fijo en el código. La verificación **no puede correr con otra aplicación en ese puerto**, y si algo más lo está usando, las pruebas le hablan a la aplicación equivocada. Pasó de verdad la primera vez que se corrió esta suite: contestó otra aplicación y todo dio resultados inventados. El andamio ahora lo detecta y aborta con un mensaje claro, pero rodearlo no es arreglarlo | Sin prueba propia |
| **H-14** ✅ **PAGADA** | El reloj se lee directo del sistema y **no hay manera de fijarlo desde una prueba**. Por eso H-10 no tiene prueba: cualquier prueba de la regla de las 24 horas daría un resultado distinto según la hora en que se corra, y una prueba que falla una de cada diez corridas destruye la puerta de calidad. Bloquea también el borde de E-20 (un bloque de hoy que ya empezó). **Es la deuda que está en el camino: sin pagarla, la regla de las 24 horas no se puede arreglar con red** | Sin prueba: es lo que impide escribirla |
| **H-15** | La tarifa está escrita **tres veces** —en la portada, al crear la reserva y en la cotización—. Corregir la hora de la luz obliga a tocar los tres lugares, y tocar uno solo deja la aplicación mostrando un precio y cobrando otro | `pruebas/tarifas.test.js::P-05` la comprueba de refilón: exige que los tres caminos digan lo mismo |

---

## Lo que quedó sin cubrir, y por qué

No es lo mismo «no falla» que «no se probó». Esto es lo segundo:

| Condición | Por qué no tiene prueba |
|---|---|
| E-20 · un bloque de hoy que ya empezó se rechaza | Bloqueada por H-14 |
| E-21 en su parte horaria, E-22, E-23 | Bloqueadas por H-14. Anotadas como H-10 |
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

## Cómo se cierra un hallazgo

1. Se arregla el código de producción hasta que su prueba pase **sin tocar la prueba**.
2. Se quita la marca `todo` de esa prueba.
3. Se anota acá la evidencia: la corrida en que pasó.
4. Estructura y comportamiento, en commits separados.
