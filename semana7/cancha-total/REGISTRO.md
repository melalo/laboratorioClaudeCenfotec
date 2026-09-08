# Registro del Caso Práctico 7

Cómo se agruparon los hallazgos, qué detuvo al agente, y qué reportó como hecho que al revisar no
lo estaba.

1. **Las reglas de permiso, y su razón.** La prohibición (`deny`): `.env*` y `.vercel/**` no se
   leen ni se escriben nunca — ahí viven las credenciales de Turso y de Vercel, y **nada legítimo
   en este repositorio necesita tocarlas**; se suma `git push --force`, que reescribe historial ya
   publicado. La que exige una persona (`ask`): `Edit`/`Write` sobre `pruebas/**` y `HALLAZGOS.md`
   — **quitar una marca de fallo esperado y ablandar una aserción son la misma llamada a la misma
   herramienta**, así que la diferencia no se puede decidir por regla: depende del contenido del
   cambio, y eso solo lo distingue alguien mirando el diff. Las tres se escribieron y se fusionaron
   (PR #16) **antes** de tocar una sola línea del trabajo de cierre.

2. **Por qué son cuatro hallazgos y no los siete que dice la consigna.** La consigna numera H-2 a
   H-8 según la versión del profesor. En este repositorio ya estaban cerrados H-01, H-03, H-04,
   H-08, H-09 y H-10 desde el Caso Práctico 5, así que quedaban cuatro abiertos —H-02, H-05, H-06 y
   H-07— con **seis pruebas marcadas** entre los cuatro. Se cerraron los cuatro.

3. **La agrupación: por archivo de producción, verificada leyendo el código, no supuesta.** Grupo A
   = H-05, H-06 y H-07, los tres en `server.js`. Grupo B = H-02, en `basededatos.js`. Se comprobó
   que no comparten **ni archivo de producción ni archivo de prueba**: el archivo compartido es el
   único límite que impide que dos agentes se pisen, y acá no hay ninguno.

4. **Aun siendo independientes, se corrieron uno tras otro, no en paralelo.** El puerto 3000 está
   fijo en el código (hallazgo de estructura H-13) y las dos suites lo necesitan: dos agentes
   probando a la vez se pisan y uno ve un rojo que no es suyo. Se descartó arreglar el puerto —es
   H-13, explícitamente fuera de alcance— porque el ahorro era de minutos y el riesgo caía sobre lo
   que se evalúa.

5. **Dentro del Grupo A, H-05 va antes que H-06, y eso se declaró en el encargo.** Para saber si un
   partido ya empezó hay que construir la fecha con su hora, y `new Date('2027-02-30T10:00:00')`
   devuelve el 2 de marzo **sin dar error**. Arreglar H-06 primero habría dejado la comprobación
   midiendo contra una fecha corrida en silencio.

6. **Qué detuvo al agente: nada, y ese es el hallazgo más incómodo de la semana.** La regla `ask`
   sobre `pruebas/**` **nunca se disparó** — ni con los subagentes, ni conmigo, ni con la sesión ya
   puesta en modo manual. Seis ediciones dentro de `pruebas/` pasaron sin que nadie preguntara.

7. **No es que el archivo de reglas no cargue: se comprobó.** La regla `deny` del mismo archivo sí
   funciona — al intentar leer `.vercel/project.json` el sistema respondió *«File is in a directory
   that is denied by your permission settings»*. Se descartaron también un `settings.local.json`
   (no existe) y reglas globales que la anularan (no hay). Conclusión honesta: **la prohibición
   funciona, la que pide aprobación no, y no sé por qué.** Queda anotado en vez de tapado.

8. **Reportó una falsedad, y es la que más importa.** El agente del Grupo A dijo que no hacía falta
   escapar el campo `fecha` *«porque esos campos ya estaban validados con una forma estricta»*. Al
   comprobarlo contra la aplicación levantada, era falso: `GET /?fecha=<script>alert(1)</script>`
   devuelve `Disponibilidad - <script>alert(1)</script></h2>`. Es el mismo defecto de H-07 por otra
   puerta. Se abrió como **H-18** en `HALLAZGOS.md` con su evidencia, y **no se cerró**: la consigna
   acota el trabajo a los hallazgos ya escritos, y cerrarlo sin una prueba que lo vigile va contra
   la disciplina de este repositorio.

9. **También corrigió un error del encargo, y eso es trabajo bien hecho.** La instrucción del Grupo
   A decía «4 marcas» y pedía terminar en `todo 2`; eran **5** (H-06 tiene tres pruebas, no una).
   En vez de dejar una prueba sin cerrar para que cuadrara el número, cerró las cinco y **reportó la
   discrepancia** para que la decidiera una persona.

10. **El freno real no fue la regla, fue leer el diff.** Lo que atrapó la falsedad de la línea 8 no
    fue ningún permiso: fue revisar los cambios a mano y levantar la aplicación para comprobarlo.
    Resultado: **48 pruebas · pass 48 · fail 0 · todo 0**, sin marcas de fallo esperado, con los
    mismos números en la máquina limpia de GitHub. **Ningún valor esperado se tocó**: lo único que
    cambió dentro de `pruebas/` fueron las seis marcas `{ todo: 'H-0X' }` y comentarios que habían
    quedado mintiendo.
