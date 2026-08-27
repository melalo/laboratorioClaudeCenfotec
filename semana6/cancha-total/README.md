# Cancha Total F5 — Sistema de reservas

Sistema de reservas para las dos canchas techadas de fútbol 5 de Cancha Total F5.
Permite ver la disponibilidad del día, registrar reservas y cancelarlas.

## Instalación

```
npm install
```

## Datos de prueba

Vacía la tabla de reservas y la recrea con reservas de ejemplo (sin preguntar):

```
npm run datos
```

## Arrancar el servidor

```
npm start
```

El servidor queda escuchando en el puerto 3000: http://localhost:3000

## Dónde vive la base de datos

La aplicación usa SQLite a través de la biblioteca `@libsql/client`, que sabe hablarle a dos
destinos con exactamente el mismo SQL:

| Si está configurado | La base es | Cuándo se usa |
|---|---|---|
| nada | el archivo `reservas.db` de esta carpeta | en la computadora: `npm start`, `npm run datos` y las pruebas. Sin internet |
| `TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN` | la base alojada en **Turso** (SQLite en la nube) | en el despliegue |

No hay dos versiones del código: es la misma aplicación con dos destinos posibles. En el
despliegue la base remota no es opcional, porque el disco de un servidor sin estado se borra entre
una visita y la siguiente y las reservas se perderían.

**Todas las consultas viven en un solo archivo, [`basededatos.js`](basededatos.js).** Antes el SQL
estaba escrito tres veces —en `server.js`, en `datos.js` y en el andamio de las pruebas—; ahora
quien necesita un dato le pide a ese archivo «contame las reservas activas de este bloque» y no
necesita saber cómo se le pregunta a la base.

**Las dos variables son credenciales: no se escriben en el código ni se suben al repositorio.**

## Verificar

Un solo comando, desde la raíz del proyecto:

```
./verificar.sh
```

Corre la suite completa y termina en **0** si se puede cerrar o en **2** si algo falló, con el
motivo impreso. No hace falta acordarse de nada más.

**En Windows, `./verificar.sh` solo funciona en una terminal tipo Git Bash.** En PowerShell o en el
símbolo del sistema da error, porque son guiones de shell de Unix. Ahí se usa:

```
npm test
```

que corre la misma suite y también termina en 0 o distinto de 0. La diferencia es que `verificar.sh`
es el comando único de la puerta —el que llama el hook— y `npm test` corre solo las pruebas.

**El puerto 3000 tiene que estar libre.** Está fijo en `server.js`, así que la verificación no
puede correr con otra aplicación levantada ahí; si eso pasa, la suite aborta diciéndolo. **Tus
datos no se tocan:** cada corrida se hace su propia base vacía en un archivo temporal del sistema y
la borra al terminar, así que `reservas.db` no se abre siquiera.

Algunas pruebas aparecen con `⚠` y un número `H-NN`: son **fallos esperados**, defectos ya
conocidos que están anotados y todavía no corregidos. No rompen la verificación a propósito, para
que la puerta sirva desde el primer día. Cada uno está explicado en
[`HALLAZGOS.md`](HALLAZGOS.md).

## La puerta automática: qué impide la fusión y qué solo informa

`verificar.sh` también corre **sola**, en una máquina limpia que GitHub presta, cada vez que se
envía código y cada vez que se abre o se actualiza un Pull Request. Está escrita en
[`.github/workflows/verificacion.yml`](../../.github/workflows/verificacion.yml), en la raíz del
repositorio — GitHub solo lee los flujos de trabajo si están ahí.

Corre **sin credenciales de ningún servicio**. Sin `TURSO_DATABASE_URL`, la aplicación usa el
archivo local, que es exactamente lo que hace falta en una máquina prestada.

| Revisión | ¿Frena la fusión? | Qué hace |
|---|---|---|
| **`verificacion`** | **Sí.** En rojo, el Pull Request no se puede fusionar a `main` | Corre `verificar.sh`: las 48 pruebas |
| **`hallazgos-abiertos`** | **No.** Solo informa | Imprime los hallazgos que siguen sin cerrar, para que estén a la vista. Cerrarlos no es el trabajo de esta consigna, así que no traban nada |

La revisión que **impide la fusión es una sola**: la verificación. Todo lo demás se ve en el
registro de la corrida y ahí termina. La forma de decirle a GitHub «esto no frena nada» es la línea
`continue-on-error: true` en el trabajo que solo informa.

Del lado de GitHub, la rama `main` tiene la regla que hace valer todo esto: no recibe cambios
directos —todo entra por Pull Request— y un Pull Request no se puede fusionar con la verificación
en rojo. **La regla aplica también a quien administra el repositorio**: sin esa condición, la
puerta no comprobaría nada.

## El reloj, para las pruebas

Varias reglas del negocio dependen de la hora: la de cancelar hasta 24 horas antes del partido, y
la de no reservar un bloque que ya empezó. Para poder comprobarlas, la aplicación lee la hora de un
solo lugar y acepta que se le fije desde afuera con la variable de entorno `CANCHA_TOTAL_AHORA`, en
formato local sin zona:

```
CANCHA_TOTAL_AHORA=2026-08-25T23:00:00 npm start
```

**Es solo para pruebas.** En uso normal la variable no se define y la aplicación usa el reloj de la
computadora, igual que siempre. Si alguna vez la aplicación parece estar en otra fecha, revisar si
la variable quedó puesta.

## Los documentos

| Archivo | Qué contiene |
|---|---|
| [`ESPECIFICACION.md`](ESPECIFICACION.md) | Qué tiene que hacer el sistema, afirmación por afirmación y con la fuente de cada una. Es la fuente de verdad: de acá sale cada prueba |
| [`HALLAZGOS.md`](HALLAZGOS.md) | Lo que el sistema no cumple, separado en defectos de comportamiento y deudas de estructura |
| `pruebas/` | El conjunto de pruebas. Cada archivo declara arriba qué condiciones cubre, a qué nivel y por qué |
| `verificar.sh` | La puerta de calidad: un comando que contesta si se puede cerrar o no |
| `.claude/settings.json` | Conecta la puerta al cierre de turno de un agente, para que no pueda darse por terminado con la verificación en rojo |
