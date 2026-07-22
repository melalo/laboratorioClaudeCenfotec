# Ferretería El Tornillo Feliz — Calculadora de ventas

## Propósito del proyecto

Este proyecto es un script en Node.js que calcula el total de una venta en caja para
la Ferretería El Tornillo Feliz. Su alcance es intencionalmente pequeño: una sola
función (`calcularTotal`) que recibe un carrito de compras y devuelve subtotal,
descuento e IVA. No es una aplicación web, no tiene base de datos ni interfaz gráfica;
es la lógica de cálculo que usaría una caja registradora simple.

El propósito de esta sesión de trabajo con Claude Code es:

1. Diagnosticar y corregir el bug de cálculo del descuento por mayoreo.
2. Implementar el cálculo de IVA (13%) que pidió la dueña del negocio.
3. Documentar el proceso de colaboración con el asistente (prompts, decisiones,
   iteraciones) como parte de la entrega del ejercicio.

## Contexto del negocio

La Ferretería El Tornillo Feliz es un pequeño negocio familiar que usa un script en
Node.js para calcular el total de sus ventas en caja. Un desarrollador junior construyó
la primera versión, pero desde hace unas semanas varios clientes reclaman que el total
en pantalla "no cuadra" cuando compran grandes cantidades de un mismo producto.

Por separado, la dueña del negocio pidió agregar el cálculo del Impuesto al Valor
Agregado (IVA, 13%) sobre el monto de la venta, algo que el script todavía no hace.

## Estructura del proyecto

- `src/carrito.js` — lógica de `calcularTotal(carrito)`: recibe un arreglo de items
  `{ nombre, precio, cantidad }` y devuelve `{ subtotal, descuento, total }`.
- `test/test-carrito.js` — pruebas manuales con `node:assert`, ejecutadas con
  `npm test`. Incluye 3 casos: compra pequeña sin descuento, compra al por mayor de
  un solo producto, y el caso nuevo de IVA (actualmente fallando a propósito).
- No hay build ni framework de testing externo: es Node.js puro.

## Cómo correr las pruebas

```bash
npm test
```

Al empezar, el Caso 3 (IVA) falla porque el requerimiento no está implementado. Ese es
el punto de partida esperado.

## El bug de descuento por mayoreo

**Síntoma:** clientes que compran muchas unidades de un mismo producto no reciben el
10% de descuento por mayoreo esperado.

**Causa raíz:** en `calcularTotal`, la condición `carrito.length > 10` cuenta cuántas
líneas/productos distintos tiene el carrito, no cuántas unidades se compraron de un
mismo producto. Una compra de 15 tornillos en una sola línea tiene `carrito.length === 1`
y nunca dispara el descuento, aunque el Caso 2 de las pruebas espera que sí lo haga.

**Regla de negocio correcta:** el descuento del 10% aplica cuando la cantidad
(`item.cantidad`) de un mismo producto en el carrito supera 10 unidades, no cuando hay
más de 10 líneas en el carrito.

## Nuevo requerimiento: IVA (13%)

- El IVA se calcula al 13% sobre el subtotal **ya con el descuento aplicado** (no sobre
  el subtotal bruto).
- `calcularTotal` debe devolver también `iva`, y `total` debe incluir subtotal −
  descuento + IVA.
- Ver Caso 3 en `test/test-carrito.js` para el contrato exacto esperado (carrito sin
  descuento, subtotal 10000, `iva` = 1300, `total` = 11300).

## Convenciones de código

- JavaScript plano (Node.js), sin TypeScript, sin frameworks ni librerías externas:
  no agregar dependencias a `package.json` para resolver este ejercicio.
- Mantener `calcularTotal` como una función simple y pura (mismos argumentos →
  mismo resultado, sin efectos secundarios, sin `console.log` dentro de la lógica).
  No introducir clases, patrones de diseño ni capas de abstracción para un cálculo
  de este tamaño.
- Nombres de variables y funciones en español, consistentes con el código existente
  (`subtotal`, `descuento`, `total`, `iva`, `carrito`, `item`).
- Montos siempre en números (no strings ni librerías de precisión decimal); seguir
  el estilo aritmético simple ya usado en el archivo.
- Exportar solo lo que ya se exporta (`module.exports = { calcularTotal }`), no
  cambiar la forma de exportación ni el nombre de la función pública.
- Priorizar corregir la causa raíz del bug de descuento antes de tocar el IVA; son
  dos cambios lógicamente separados aunque vivan en la misma función.
- Todo cambio debe dejar `npm test` en verde (los 3 casos) antes de darse por
  terminado.

## Lo que el asistente NO debe hacer

- **No modificar `test/test-carrito.js` para hacer pasar el código.** Los valores y
  aserciones de ese archivo representan el contrato acordado con la dueña del
  negocio (incluyendo el Caso 3, que define el comportamiento exacto del IVA). Si
  una prueba falla, el error está en `src/carrito.js`, no en la prueba.
- No agregar dependencias externas (frameworks de testing, librerías de utilidades,
  etc.) para resolver el bug o el IVA.
- No reescribir ni reestructurar archivos fuera del alcance de esta tarea
  (`src/carrito.js` y, si aplica, `test/test-carrito.js` solo para agregar nuevos
  casos, nunca para alterar los existentes).
- No ejecutar comandos destructivos (`git reset --hard`, `git push --force`,
  eliminar archivos) sin confirmación explícita del usuario.
