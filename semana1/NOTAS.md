# Notas de la sesión con Claude Code

## Contexto entregado al asistente

- Se creó `CLAUDE.md` en la raíz del proyecto antes de pedir cualquier cambio,
  describiendo: propósito del proyecto, contexto del negocio, estructura de
  archivos, el bug de descuento por mayoreo (síntoma, causa raíz y regla de
  negocio correcta), el requerimiento de IVA (13% sobre subtotal con descuento),
  convenciones de código (JS plano, sin dependencias, función pura, nombres en
  español) y una prohibición explícita: no modificar `test/test-carrito.js`.
- Esto permitió que el primer prompt fuera corto, porque el detalle ya estaba
  en `CLAUDE.md`.

## Prompt utilizado

> "Diagnostica y corrige el error del descuento por mayoreo, e implementa el
> nuevo requerimiento del cálculo de IVA (13%) descrito en el README/CLAUDE.md
> del proyecto. Verifica que las tres pruebas de `npm test` pasen."

## Qué hizo el asistente

1. Corrió `npm test` para confirmar el estado inicial: Caso 1 pasaba, Caso 2
   fallaba (`descuento` esperado 150, obtenido 0), Caso 3 ni siquiera llegaba
   a evaluarse porque el script se detenía en el primer `assert` fallido.
2. Leyó `src/carrito.js` y confirmó la causa raíz exacta descrita en
   `CLAUDE.md`: la condición usaba `carrito.length > 10` (número de líneas del
   carrito) en vez de `item.cantidad > 10` (unidades de un mismo producto).
3. Leyó `test/test-carrito.js` para confirmar el contrato exacto de los 3 casos
   antes de tocar el código (sin modificar ese archivo).
4. Corrigió `calcularTotal` en `src/carrito.js`:
   - El descuento del 10% ahora se calcula por línea de producto, sumando
     `precio * cantidad * 0.10` solo para los ítems con `cantidad > 10`.
   - Se agregó el cálculo de `iva = (subtotal - descuento) * 0.13`.
   - `total` ahora es `subtotal - descuento + iva`.
   - La función se mantuvo pura (mismos argumentos → mismo resultado, sin
     efectos secundarios ni `console.log`), sin agregar dependencias ni
     abstracciones nuevas.
5. Corrió `npm test` de nuevo: los 3 casos pasaron en el primer intento después
   del cambio.

## Qué funcionó bien

- Tener el bug y la regla de negocio ya documentados en `CLAUDE.md` evitó que
  el asistente tuviera que "adivinar" la causa raíz o proponer un diagnóstico
  incorrecto (por ejemplo, aplicar el descuento sobre el subtotal total del
  carrito en vez de por línea de producto).
- Especificar en `CLAUDE.md` que el IVA se calcula sobre el subtotal **con**
  descuento aplicado (no sobre el bruto) evitó una iteración extra: el
  asistente implementó el orden correcto (`subtotal - descuento` primero,
  luego `* 0.13`) desde el primer intento.

## Qué hubo que corregir o reintentar

- No fue necesario reintentar: al tener el contrato de pruebas (`Caso 2` y
  `Caso 3`) y la causa raíz documentados de antemano en `CLAUDE.md`, la
  implementación pasó las 3 pruebas en el primer cambio.


## Resultado final

```
Caso 1 OK: compra pequeña sin descuento
Caso 2 OK: descuento por mayoreo en un solo producto (mas de 10)
Caso 3 OK: cálculo de IVA (nuevo requerimiento)

Todas las pruebas pasaron.
```
