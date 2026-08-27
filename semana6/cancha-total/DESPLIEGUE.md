# El despliegue, y lo que reveló

Publicar el sistema no fue mudarlo de lugar: fue descubrir que **una suposición que la computadora
escondía era falsa**. Este documento deja el registro de esa falla, el diagnóstico que salió de él,
y el arreglo.

- **Dirección pública:** https://cancha-total-omega.vercel.app/
- **Servicio de despliegue:** Vercel, proyecto `melalo/cancha-total`, con la carpeta raíz apuntando
  a `semana6/cancha-total/`.
- **Base de datos en producción:** [Turso](https://turso.tech) — SQLite gestionada, alcanzable por
  red.

## Lo que pasó

**El despliegue se completó sin un solo error.** Vercel marcó el estado `Ready`. Y aun así, la
primera visita al sitio devolvió **500**, cuando en la computadora la misma aplicación arranca sin
quejarse.

Ahí está la trampa: no hubo falla al construir. La falla apareció recién al atender la primera
visita, y por eso el estado del despliegue no la delata.

## El registro crudo

Es lo que la máquina escribió, sin interpretar. Se capturó con `vercel logs` y se le entregó al
agente **como entrada**, tal cual: el diagnóstico salió de leer esto, no al revés.

### La respuesta que recibió el navegador

```
HTTP/1.1 500 Internal Server Error
Content-Type: text/html; charset=utf-8
Server: Vercel
X-Powered-By: Express
X-Vercel-Cache: MISS
X-Vercel-Id: iad1::iad1::8g7lf-1787849698000-153baafad4da
```

### El registro de ejecución

```
TIME         HOST                           LEVEL
10:56:18.28  cancha-total-omega.vercel.app  error  λ GET /

LibsqlError: SQLITE_CANTOPEN: unable to open database file
    at mapSqliteError (/var/task/semana6/cancha-total/node_modules/@libsql/client/lib-cjs/sqlite3.js:459:16)
    at executeStmt (/var/task/semana6/cancha-total/node_modules/@libsql/client/lib-cjs/sqlite3.js:362:15)
    at Sqlite3Client.execute (/var/task/semana6/cancha-total/node_modules/@libsql/client/lib-cjs/sqlite3.js:105:16)
    at /var/task/semana6/cancha-total/basededatos.js:82:23
    at conectar (/var/task/semana6/cancha-total/basededatos.js:88:7)
    at Object.estaLista (/var/task/semana6/cancha-total/basededatos.js:98:9)
    at Object.<anonymous> (/var/task/semana6/cancha-total/server.js:29:31)
```

## El diagnóstico que salió de ese registro

Leyendo el rastro de arriba hacia abajo:

1. `server.js:29` llama a `estaLista()` **al cargarse el archivo**, antes de atender a nadie. Por
   eso el error tumba el sitio entero y no solo una página.
2. `estaLista()` termina en `conectar()`, que le pide a la biblioteca abrir la base.
3. La biblioteca contesta `SQLITE_CANTOPEN: unable to open database file`.
4. La ruta que estaba intentando abrir es `/var/task/…/reservas.db` — el propio directorio donde
   Vercel copió el programa.

**Lo que revela:** en un servidor sin estado como Vercel, el disco donde vive el programa es de
**solo lectura**. SQLite no necesita permiso para leer nada: necesita permiso para *escribir*, y
para *crear el archivo si no existe*. En la computadora eso pasa desapercibido porque la carpeta
del proyecto es escribible. En el despliegue, no.

No es un defecto que la publicación haya causado. Es un supuesto que la computadora venía tapando:
**«el archivo de la base vive al lado del código»**. Sirve en una máquina y no sirve en ninguna
otra.

## El arreglo

El almacenamiento pasa a **Turso**, una base SQLite gestionada que se alcanza por red. No hay
archivo que abrir, así que el disco de solo lectura deja de importar.

`basededatos.js` elige destino con una sola pregunta:

| Si está configurado | La base es | Dónde |
|---|---|---|
| `TURSO_DATABASE_URL` | la base alojada en Turso | el despliegue |
| nada | el archivo `reservas.db` de la carpeta | la computadora, y la verificación en GitHub |
| nada, **y está en Vercel** | **falla de entrada, diciendo qué falta** | — |

La dirección y la credencial se cargan en la configuración de Vercel, no en el repositorio:

```
vercel env add TURSO_DATABASE_URL
vercel env add TURSO_AUTH_TOKEN
```

**Las dos son credenciales y no se escriben en ningún archivo del repositorio.** El `.gitignore`
ignora `.env*` y `.vercel`.

### Por qué la tercera fila falla en vez de arreglárselas

Durante un rato hubo ahí un **modo de vitrina**: sin base remota, el despliegue mandaba la base a
`/tmp`, la única carpeta escribible de la función. El sitio se veía y se podía usar, y por eso
parecía un arreglo.

No lo era. `/tmp` es privado de cada copia de la función y se borra cuando Vercel la duerme, así
que **las reservas se perdían sin avisar**. Un sistema de reservas que pierde reservas en silencio
es peor que uno que no arranca: el que no arranca se nota.

Se quitó. En un despliegue la base gestionada no es un respaldo: es el almacenamiento.

## Cómo se comprobó

Todo esto se reprodujo a propósito el **2026-08-27**, para tener el registro y no contarlo de
memoria. Se desplegó a producción pisando las dos variables solo para ese despliegue
(`vercel deploy --prod -e TURSO_DATABASE_URL= -e TURSO_AUTH_TOKEN=`), sin tocar la configuración
guardada.

| Comprobación | Resultado |
|---|---|
| El despliegue se completa | `Ready` — nunca falló al construir |
| Sin base gestionada, el sitio contesta | **500**, con el registro de arriba |
| Con la base gestionada, el sitio contesta | **200** |
| Una reserva creada contra el sitio en vivo aparece en Turso | Sí: quedó como fila `id=1`, con el precio diurno de ₡15.000 |
| Y el sitio la lee de vuelta en `/dia/2026-12-31` | Sí, con nombre, teléfono y precio |

La reserva de prueba se borró después. La base quedó en 0 filas.

## Lo que dice si el comportamiento se mantuvo

La suite del Caso Práctico 5, sin tocar un solo valor esperado:

```
48 pruebas · 42 en verde · 0 fallos · 6 marcadas como fallo esperado
```

Corre igual en la computadora y en la máquina limpia de GitHub, y en las dos **sin credenciales de
ningún servicio**: sin `TURSO_DATABASE_URL`, la aplicación usa el archivo local. Ver
[`README.md`](README.md) para qué impide la fusión y qué solo informa.
