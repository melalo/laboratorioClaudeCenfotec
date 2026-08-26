# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Contexto del proyecto — Semana 5 (SINT-732)

Esta carpeta contiene el trabajo de la semana 5 del curso "Laboratorio Ejecutivo en Claude Code"
(Universidad CENFOTEC). Aplican las reglas del `CLAUDE.md` de la carpeta madre; acá va solo lo
específico de esta consigna.

## Qué se pide

La consigna está en **`Consigna Caso Practico 5 - SINT-732.docx`**, en la raíz del repositorio
madre (sin seguimiento en Git, como el resto del material del curso). Localizada el 2026-08-23;
la nota anterior de este archivo, que la daba por inexistente, quedó corregida.

**Entrega:** martes 25 de agosto de 2026, al inicio de la Sesión 6. Vale 10% de la nota final.
Se entrega el enlace al repositorio Git con los commits propios encima del commit del proveedor.

### El encargo

El proveedor de `cancha-total/` ya no contesta y no dejó documentación. El sistema se usa a
diario y "funciona", pero hay quejas por cobros y por cancelaciones y nadie sabe si son errores
o si el sistema es así a propósito. La administradora pide, textual: «antes de pedirle cambios a
alguien, quiero saber en qué estamos parados: qué hace bien, qué hace mal, y que quede por
escrito. No quiero que me lo arreglen a ciegas.»

En orden, y sin saltarse pasos:

1. **Reconstruir la especificación** con la habilidad `escribir-pruebas` (instalada el
   2026-08-23 en `~/.claude/skills/escribir-pruebas/`, así que la suposición que estaba anotada
   acá quedó confirmada: era el camino previsto). La descripción de la administradora es la
   especificación; donde ella no menciona nada, el comportamiento actual del sistema se
   considera correcto. Cada afirmación queda con su fuente declarada, y donde las dos fuentes
   hablan del mismo punto, el documento dice cuál quedó.
2. **Escribir la suite**, cada prueba trazable a una condición de la especificación, con su
   nivel declarado. Lo que falle no se arregla: va a `HALLAZGOS.md` marcado como fallo esperado.
3. **Armar la puerta:** `verificar.sh` que termina en 0 o en 2, y un hook `Stop` en
   `.claude/settings.json` que impide cerrar un turno con la verificación en rojo.
4. **Refactorizar con la red puesta:** cerrar al menos un hallazgo de comportamiento haciendo
   pasar su prueba sin modificarla, y pagar al menos una deuda de estructura que esté en el
   camino de ese arreglo.

### Cómo debería funcionar, según la administradora

Esta es la especificación que trae la consigna. **Nadie verificó que el sistema la cumpla** —
averiguarlo es el trabajo. Los valores van con su número exacto porque ahí vive la diferencia:

- Bloques de una hora, todos los días: el primer partido a las **8:00** y el último a las
  **21:00**, en cualquiera de las dos canchas.
- Una reserva lleva cancha, fecha, hora, nombre y teléfono. El **teléfono es obligatorio y son
  8 dígitos**: sirve para ubicar al cliente y reconocerlo como frecuente.
- Un bloque ocupado no se vuelve a vender. Si alguien cancela a tiempo, ese espacio queda libre.
- La hora diurna cuesta **₡15.000**. Desde que se enciende la luz cuesta **₡20.000**, y la luz
  se enciende a las **17:00**: el partido de las 5 de la tarde ya va con luz.
- Cliente frecuente: **4 o más reservas en el mismo mes, contando la que está haciendo**, recibe
  **10% de descuento**. Las canceladas **no** cuentan: frecuente es el que juega, no el que aparta.
- Se puede cancelar **hasta 24 horas antes de la hora del partido**. Con menos de 24 horas no hay
  cancelación y se cobra completo (partido mañana a las 8:00 y ya son las 23:00 de hoy: no hay
  marcha atrás).
- Para cada día se ve qué bloques están libres en cada cancha, y la lista de reservas del día
  con lo que se cobró en cada una.

### Alcance, según la consigna

- La palabra de la administradora es la especificación. En lo que ella no menciona, el
  comportamiento actual del sistema se considera correcto.
- **No se agregan funciones nuevas ni se cambia el stack.** La base sigue siendo SQLite.
- El encargo es la red, los hallazgos y la mejora de lo que ya existe.

## La aplicación heredada: `cancha-total/`

Sistema de reservas de las dos canchas techadas de fútbol 5 de "Cancha Total F5": ver la
disponibilidad del día, registrar reservas y cancelarlas.

`cancha-total/` **tiene su propio repositorio Git anidado** (`.git` propio, un solo commit:
`65ce4b4 "Sistema de reservas — versión entregada por el proveedor"`). El repositorio madre la ve
como carpeta sin seguimiento. Ese commit es la foto de lo que entregó el proveedor: sirve como
línea base para comparar cualquier cambio posterior.

### Comandos

Todos se corren dentro de `cancha-total/`:

```
npm install       # instalar dependencias (express, better-sqlite3)
npm run datos     # borra reservas.db y la recrea con 10 reservas de ejemplo
npm start         # levanta el servidor en http://localhost:3000
```

- **No hay suite de pruebas ni linter**: `package.json` solo define `start` y `datos`. No existe
  todavía un comando único de verificación.
- `reservas.db` está en el `.gitignore` de la aplicación: se regenera con `npm run datos`, que la
  borra sin preguntar.
- El puerto 3000 está escrito fijo en `server.js`; `proyectoFinal/` usa el mismo puerto, así que
  las dos aplicaciones no pueden estar levantadas a la vez.
- Verificado el 2026-08-18 con Node v24.16.0 y npm 11.13.0: instala, arranca y responde.

### Cómo está construido

Tres archivos, sin carpetas:

- `server.js` (381 líneas) — **todo vive acá**: la creación de la tabla, las consultas, el HTML y
  las rutas.
- `datos.js` — recrea la base con datos de ejemplo, con fechas relativas al día en que se corre.
- `reservas.db` — SQLite (biblioteca `better-sqlite3`, consultas SQL escritas a mano, sin ORM).
  Una sola tabla, `reservas`.

**No hay plantillas ni archivos estáticos.** Cada página se arma como texto dentro de
`layout(titulo, contenido)`, que trae el CSS incrustado. El navegador recibe HTML ya renderizado;
el único JavaScript de cliente es el que consulta `/api/cotizar` para mostrar el precio estimado.

Rutas: `GET /` (disponibilidad de ambas canchas + formulario), `GET /disponibilidad/cancha1` y
`/cancha2`, `POST /reservas`, `POST /reservas/:id/cancelar`, `GET /dia/:fecha`, `GET /api/cotizar`.

### Reglas de negocio, y dónde están escritas

Ninguna está aislada en una función propia; hay que buscarlas dentro de las rutas:

| Regla | Dónde vive |
|---|---|
| Bloques de 8:00 a 21:00, una hora cada uno | Los `for` de cada ruta y el `<select>` del formulario |
| Tarifa: ₡15.000 diurna, ₡20.000 desde las 18:00 | **Escrita tres veces**: `GET /`, `POST /reservas` y `GET /api/cotizar` |
| Descuento 10% al cliente frecuente (4 reservas o más del mismo teléfono en el mes) | Solo en `POST /reservas` |
| Un bloque ocupado no se puede volver a reservar | `checkDisponible()` |
| Cancelar exige que la reserva sea de fecha futura | `POST /reservas/:id/cancelar` |

**Consecuencia práctica:** cambiar una tarifa obliga a tocar los tres lugares. Cambiarla en uno
solo deja la aplicación mostrando un precio y cobrando otro.

### Observaciones al leer el código

Esto es lo que el código **hace**. Desde que apareció la consigna hay con qué contrastarlo, así
que varios de estos puntos ya son candidatos a hallazgo; el que la administradora no menciona
sigue tratándose como comportamiento correcto hasta que la estudiante diga lo contrario:

- El cotizador (`/api/cotizar`) no aplica el descuento de cliente frecuente, así que el "precio
  estimado" del formulario puede no coincidir con el precio cobrado.
- El conteo de reservas del mes para el descuento incluye las canceladas, y agrupa por teléfono
  aunque el teléfono venga vacío.
- El mensaje de cancelación habla de "24 horas", pero la comprobación solo compara fechas: alcanza
  con que la reserva sea de un día posterior a hoy, sin mirar la hora.
- Los datos que escribe el cliente (nombre, teléfono) se insertan en el HTML sin escapar.
- El proveedor dejó código muerto marcado como tal: la función `esFeriado()` y el bloque comentado
  de precios de temporada alta.

## Entregables al repositorio Git

Los seis que pide la consigna, todos dentro de `cancha-total/` (que tiene su propio repositorio
Git anidado, encima del commit del proveedor):

| Entregable | Qué es |
|---|---|
| `ESPECIFICACION.md` | La especificación reconstruida, cada afirmación con su fuente declarada |
| Suite de pruebas | Las pruebas con su nivel declarado, y `verificar.sh` en la raíz |
| `HALLAZGOS.md` | Lo descubierto, con su clase (comportamiento o estructura) y su prueba |
| `.claude/settings.json` | El hook `Stop` que conecta `verificar.sh` al cierre de turno |
| Código | Los hallazgos cerrados y la deuda pagada, sin funciones nuevas |
| `README.md` | Actualizado: cómo arrancar, cómo recrear los datos y cómo verificar |

### Condiciones de entrega que atan el orden de los commits

- El commit que agrega la suite y `verificar.sh` **precede** a todos los de refactorización.
- **Ningún commit mezcla estructura con comportamiento.** En un commit de estructura, la suite da
  lo mismo antes y después.
- Al menos un hallazgo de comportamiento cerrado: su prueba pasa y **no fue modificada** para
  lograrlo. Los demás quedan anotados y marcados, no corregidos.
- `verificar.sh` termina en **0** al entregar; los hallazgos abiertos están marcados como fallo
  esperado, con su número.
- La aplicación sigue arrancando según el `README.md`.

Este `CLAUDE.md` también se sube, como los de las demás semanas: documenta el contexto con el que
se trabajó.
