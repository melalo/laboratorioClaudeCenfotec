# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Contexto — Semana 6 (SINT-732), Caso Práctico 6

Aplican las reglas del `CLAUDE.md` de la carpeta madre (`cursoCenfotecClaude/`); acá va solo lo
específico de esta consigna.

**Ojo:** hasta hoy este archivo describía todavía el Caso Práctico 5, porque `semana6/` arrancó
como copia byte a byte de `semana5/`. Esa versión quedó guardada en `CLAUDE.md.semana5.bak` por si
hace falta consultarla. De acá para abajo, todo es la consigna nueva.

## Qué se pide

La consigna está en `semana6/consigna-semana6.txt`, que vive solo en el disco: las consignas del
curso no se suben al repositorio.

Llevar el sistema de reservas desde una sola computadora hasta una dirección pública, **con una
puerta que decida qué entra**. No se agregan funciones ni se cambia el comportamiento del negocio:
el trabajo es sobre cómo el sistema se integra, se comprueba y se publica. Ninguna credencial se
guarda en el repositorio.

Los cinco pasos, tal como los pide la consigna:

1. **Publicar el repositorio y proteger la rama principal.** `main` deja de recibir cambios
   directos: todo entra por Pull Request, y un PR no se puede fusionar mientras la verificación no
   esté en verde. La regla aplica **también a quien administra el repositorio** — sin eso, la
   puerta no comprueba nada.
2. **Subir la puerta.** `verificar.sh`, que hasta ahora se corría a mano, pasa a correr solo en una
   máquina limpia (GitHub Actions) en cada push y en cada PR. Corre **sin credenciales** de ningún
   servicio externo. En el repositorio queda escrito qué impide la fusión y qué solo informa.
3. **Comprobar que la puerta está viva.** Un PR donde la verificación queda en **rojo**, y el commit
   siguiente que la devuelve a **verde**. Una puerta que nunca se vio en rojo no es una puerta.
4. **Publicar la aplicación y observar la falla.** El despliegue se completa pero la app no responde
   como en local. **El registro de esa falla se le entrega al agente como entrada** (se pega el log,
   no se lee a ojo).
5. **Reparar lo que la publicación reveló.** El almacenamiento pasa a una base gestionada (Turso),
   con dirección y credencial cargadas en la configuración de Vercel. La suite del Caso Práctico 5
   dice si el comportamiento se mantuvo: **sus valores esperados no se tocan.**

Todo salvo crear y autorizar las cuentas se hace por línea de comandos (`gh`, `vercel`, `turso`),
no en pantallas de configuración.

## Dónde está cada cosa

| Qué | Dónde |
|---|---|
| El sistema | `semana6/cancha-total/` |
| La consigna | `semana6/consigna-semana6.txt` — **local, sin seguimiento en Git**, como el resto del material del curso |
| La puerta local | `cancha-total/verificar.sh` (sale 0 = verde, 2 = rojo) |
| La suite | `cancha-total/pruebas/*.test.js` — 48 pruebas, `npm test` |
| Los hallazgos | `cancha-total/HALLAZGOS.md` — 6 marcados como fallo esperado |
| La especificación | `cancha-total/ESPECIFICACION.md` |
| La capa de base de datos | `cancha-total/basededatos.js` |
| La entrada de Vercel | `cancha-total/api/index.js` + `cancha-total/vercel.json` |

## Estado verificado el 2026-08-27 (antes de empezar)

Lo de ayer (GitHub, Vercel y Turso) dejó esto andando:

- **Repo:** `melalo/laboratorioClaudeCenfotec`, **público**, rama por defecto `main`.
- **Vercel:** proyecto `melalo/cancha-total`, en línea en
  https://cancha-total-omega.vercel.app/ — la portada responde 200.
- **Turso:** `TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN` cargadas en Vercel (Production, Preview y
  Development), creadas hace ~18 h. **No están en el repositorio**: `.gitignore` ignora `.env*` y
  `.vercel`.
- **`basededatos.js`** ya sabe elegir destino: si hay `TURSO_DATABASE_URL` usa Turso; si está en
  Vercel sin ella, usa `/tmp` (modo vitrina, se borra); en la computadora, el archivo local.

### Avance de la sesión del 2026-08-27

| Paso | Estado | Evidencia |
|---|---|---|
| 1 · Repo público | ✅ | `melalo/laboratorioClaudeCenfotec` |
| 1 · `main` no recibe cambios directos | ✅ | Ruleset «reglas de clase»: exige Pull Request, bloquea borrado y force-push |
| 1 · Un PR no se fusiona con la verificación en rojo | ✅ | Se le agregó la regla `required_status_checks` con la revisión `verificacion`. `bypass_actors` está vacío, así que **también aplica a la dueña del repositorio** (confirmado con `gh api .../rules/branches/main`) |
| 2 · La puerta corre sola | ✅ | `.github/workflows/verificacion.yml`, en cada push y en cada PR. Primera corrida en verde: 48 pruebas, 42 pasan, 0 fallos, 6 esperados |
| 2 · Sin credenciales | ✅ | El flujo no referencia ningún secreto. Sin `TURSO_DATABASE_URL`, la aplicación cae al archivo local |
| 2 · Qué frena y qué informa | ✅ | Escrito en el `README.md` de `cancha-total/` y en la cabecera del propio flujo. Frena `verificacion`; `hallazgos-abiertos` lleva `continue-on-error: true` |
| 3 · La puerta en rojo | ✅ | PR #13: la tarifa diurna subida a ₡16.000 dejó 12 pruebas en rojo. GitHub rechazó la fusión: «the base branch policy prohibits the merge». Estado `BLOCKED` |
| 3 · Y de vuelta en verde | ✅ | Commit siguiente: la tarifa vuelve a ₡15.000. Estado `CLEAN`. Ningún valor esperado de las pruebas se tocó |
| 4 · Falla del despliegue + log como entrada | ✅ | Reproducida a propósito: se desplegó a producción pisando las dos variables solo para ese despliegue. El despliegue quedó `Ready` y el sitio contestó **500** con `LibsqlError: SQLITE_CANTOPEN: unable to open database file`. El registro crudo, el diagnóstico y el arreglo están en `cancha-total/DESPLIEGUE.md` |
| 5 · Base gestionada andando en producción | ✅ | Se quitó el modo vitrina de `/tmp`: sin base gestionada, el despliegue ahora falla de entrada diciendo qué falta. Comprobado contra el sitio en vivo: una reserva creada por la web quedó guardada en Turso y el sitio la leyó de vuelta. La reserva de prueba se borró |
| 5 · La suite no cambió | ✅ | 48 pruebas, 42 pasan, 0 fallos, 6 esperados — antes y después. Ningún valor esperado se tocó |

**PRs de la sesión:** #12 (la puerta, fusionado) y #13 (rojo y verde).

## Reglas de esta semana

- **Los valores esperados de las pruebas no se tocan.** Si una prueba falla, falla el código o falla
  el despliegue, nunca la prueba. Los 6 fallos esperados de `HALLAZGOS.md` siguen marcados: no son
  el trabajo de esta semana.
- **Ninguna credencial entra al repositorio.** Ni en un archivo, ni en un ejemplo, ni pegada en un
  commit. Las de Turso viven solo en Vercel y en los `.env*` locales, que están ignorados.
- **La verificación en CI corre sin credenciales.** Sin `TURSO_DATABASE_URL`, `basededatos.js` cae
  al archivo local — que es justo lo que tiene que pasar en la máquina limpia de GitHub Actions.
- **La puerta tiene que verse en rojo.** El PR fallido no es un accidente que hay que esconder: es
  el entregable del paso 3.
- Todo por línea de comandos, dirigiendo al agente.

## Decisiones abiertas

Se resuelven al empezar la sesión y se anotan acá cuando se cierren:

1. ~~**¿Dónde vive el entregable?**~~ **Cerrada el 2026-08-27:** se queda en el repositorio del
   curso, `melalo/laboratorioClaudeCenfotec`, en la carpeta `semana6/cancha-total/`. No se crea un
   repositorio aparte. Razones: `main` ya exige Pull Request ahí, Vercel ya está conectado a ese
   repositorio, y ayer se trabajó sobre él. Consecuencia asumida: la protección de `main` aplica a
   todo el trabajo semanal, no solo a esta carpeta.
2. ~~**¿Qué bloquea la fusión y qué solo informa?**~~ **Cerrada el 2026-08-27:**
   - **Impide la fusión:** `verificar.sh` — las 48 pruebas. En rojo, el PR no se puede fusionar.
   - **Únicamente informa:** un resumen de los hallazgos que siguen abiertos (los 6 fallos
     esperados de `HALLAZGOS.md`), impreso en el registro de la corrida. Se ve, pero no frena
     nada: cerrarlos no es el trabajo de esta semana.
   - Descartado por ahora: un chequeo de credenciales pegadas en el código.
3. ~~**¿Cómo se genera el rojo del paso 3?**~~ **Cerrada el 2026-08-27:** un PR que cambia el
   precio de la hora diurna (₡15.000) por otro número. Varias pruebas se ponen en rojo, la puerta
   bloquea la fusión, y el commit siguiente devuelve el número a su lugar y todo vuelve a verde.
   Se eligió por ser el rojo más fácil de leer en la entrega.

4. ~~**El modo vitrina de `/tmp`**~~ **Cerrada el 2026-08-27:** se saca. `/tmp` es privado de cada
   copia de la función y se borra cuando Vercel la duerme, así que las reservas se perdían sin
   avisar — y un sistema de reservas que pierde reservas en silencio es peor que uno que no
   arranca. Ahora, desplegado y sin base gestionada, el programa falla de entrada diciendo qué
   falta.

## Cosas que conviene recordar

- **El proyecto en Vercel tiene la carpeta raíz en `semana6/cancha-total`**, así que
  `vercel deploy` se lanza desde la **raíz del repositorio**, no desde adentro de esa carpeta. Si
  se lanza desde adentro, falla con «The specified Root Directory does not exist».
- **Las vistas previas de Vercel están detrás del login**, así que una petición anónima nunca llega
  a la función. Para ver una falla de verdad hay que reproducirla en producción.
- **Para probar sin base gestionada sin borrar nada:** `vercel deploy --prod -e TURSO_DATABASE_URL=
  -e TURSO_AUTH_TOKEN=` pisa las variables solo en ese despliegue. La configuración guardada queda
  intacta.
