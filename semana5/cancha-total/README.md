# Cancha Total F5 — Sistema de reservas

Sistema de reservas para las dos canchas techadas de fútbol 5 de Cancha Total F5.
Permite ver la disponibilidad del día, registrar reservas y cancelarlas.

## Instalación

```
npm install
```

## Datos de prueba

Borra `reservas.db` (si existe) y la recrea con reservas de ejemplo:

```
npm run datos
```

## Arrancar el servidor

```
npm start
```

El servidor queda escuchando en el puerto 3000: http://localhost:3000

## Verificar

Un solo comando, desde la raíz del proyecto:

```
./verificar.sh
```

Corre la suite completa y termina en **0** si se puede cerrar o en **2** si algo falló, con el
motivo impreso. No hace falta acordarse de nada más. También se puede correr solo la suite con
`npm test`.

**El puerto 3000 tiene que estar libre.** Está fijo en `server.js`, así que la verificación no
puede correr con otra aplicación levantada ahí; si eso pasa, la suite aborta diciéndolo. Y la suite
aparta la base de datos real mientras corre, y la devuelve a su lugar al terminar: los datos no se
tocan.

Algunas pruebas aparecen con `⚠` y un número `H-NN`: son **fallos esperados**, defectos ya
conocidos que están anotados y todavía no corregidos. No rompen la verificación a propósito, para
que la puerta sirva desde el primer día. Cada uno está explicado en
[`HALLAZGOS.md`](HALLAZGOS.md).

## Los documentos

| Archivo | Qué contiene |
|---|---|
| [`ESPECIFICACION.md`](ESPECIFICACION.md) | Qué tiene que hacer el sistema, afirmación por afirmación y con la fuente de cada una. Es la fuente de verdad: de acá sale cada prueba |
| [`HALLAZGOS.md`](HALLAZGOS.md) | Lo que el sistema no cumple, separado en defectos de comportamiento y deudas de estructura |
| `pruebas/` | La suite. Cada archivo declara arriba qué condiciones cubre y a qué nivel |
