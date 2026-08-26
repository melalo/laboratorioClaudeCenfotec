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
puede correr con otra aplicación levantada ahí; si eso pasa, la suite aborta diciéndolo. Y la suite
aparta la base de datos real mientras corre, y la devuelve a su lugar al terminar: los datos no se
tocan.

Algunas pruebas aparecen con `⚠` y un número `H-NN`: son **fallos esperados**, defectos ya
conocidos que están anotados y todavía no corregidos. No rompen la verificación a propósito, para
que la puerta sirva desde el primer día. Cada uno está explicado en
[`HALLAZGOS.md`](HALLAZGOS.md).

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
