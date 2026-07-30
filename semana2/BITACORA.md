# BITACORA.md

## 1. Encargo inicial

Textual, en el orden en que se dio:

1. «Yendo más allá de eso, quiero que leas el archivo de la consigna y crees las demás instrucciones para el CLAUDE.md basándote en esto; principalmente, el propósito de la tarea que vamos a crear y las restricciones que necesitamos.» (dio lugar a leer `consigna.txt` y escribir el propósito y las restricciones en `CLAUDE.md`.)
2. «ok vamos eontces a revisar con un npm test que es lo que pasa con el problema reportado por el usuario (el mapa me muestra todo dominado, igual que como lo dejé. Se siente como si no se diera cuenta de que pasó el tiempo.) esto debe compararse con estos dos puntos: El dominio se pierde solo... Lo que se oxidó vuelve a pedir trabajo...» (dio lugar al diagnóstico del bug.)

## 2. Causa

En `fretPath-estudiantes-melania/src/engine/graph.ts:172`, `isNodeMastered` llamaba `currentMastery(state, state.dueDate ?? now)`: le pasaba el propio `dueDate` del ítem como argumento `now`, en vez del `now` real recibido. Dentro de `currentMastery` (`srs.ts`), la condición `now <= state.dueDate` comparaba ese valor contra sí mismo, así que siempre era verdadera y la rama de decaimiento nunca se ejecutaba. Un nodo dominado quedaba marcado como dominado para siempre, sin importar cuánto tiempo real pasara sin practicarlo — el síntoma exacto del reporte: "el mapa me muestra todo dominado, igual que como lo dejé". Corrección: pasar `now` en vez de `state.dueDate ?? now` (una línea).

## 3. Alcance

`isNodeWeakened` y `weakenedPrereqs` (el aviso de "qué prerequisito hay que repasar") dependen de `isNodeMastered` y no tenían ninguna prueba desde antes del bug. Se agregaron 4 pruebas (`mastery-decay.test.ts`) que confirman que, con la misma corrección de una línea, ambas funcionan bien sin tocar más código. También se verificó que un nodo en estado "mantenimiento" (repasos muy espaciados) se oxida igual que cualquier nodo dominado (1 prueba más). Evidencia: `npm test` pasa de 107 a 112 pruebas en verde sin más cambios de código.

## 4. Semántica de nodesAtRisk

- Alcanza con que UN ítem esté por caer (no el promedio del nodo) — porque hoy, con que un ítem falle, el nodo ya deja de estar dominado; se aplicó el mismo criterio hacia adelante — fijada en `nodes-at-risk.test.ts`, "decisión 1".
- Un ítem nunca practicado no cuenta como en riesgo — es un caso distinto de aviso ("nunca lo empezaste" no es lo mismo que "se te va a caer") — fijada en "decisiones 2 y 3".
- Un nodo ya caído (no dominado hoy) queda afuera — para no mezclar dos alertas distintas en una sola función — fijada en "decisiones 2 y 3".
- Mantenimiento recibe el mismo trato que cualquier nodo dominado — porque ya se probó que también se oxida (sección 3) — fijada en "decisión 4".
- Un nodo sin ítems nunca puede estar en riesgo — no tiene utilidad práctica avisar sobre un nodo vacío — fijada en "decisión 5".
- El borde exacto del horizonte cuenta como "dentro" (avisa) — prefiero que el sistema avise de más a que se le pase un caso límite sin avisar — fijada en "decisión 6", con una maestría construida para decaer a exactamente el umbral el día límite.

## 5. Desvío

No hubo un desvío técnico: cada hipótesis (diagnóstico del bug, el fix, `nodesAtRisk`) se verificó con la suite de pruebas y pasó en el primer intento. Sí hubo pausas de control explícitas por parte del usuario: varias veces detuvo el trabajo para pedir que se le explicaran en simple las soluciones propuestas antes de aprobarlas, para tener la seguridad de entender qué se estaba arreglando y cuáles eran los errores reales.

## 6. Señal de cierre

`npm test` en 118/118 pruebas en verde (105 originales sin modificar + 13 nuevas) y `npx tsc --noEmit` sin errores. Los seis puntos que la consigna exige al entregar quedaron verificados por comando, no por inspección visual: prueba propia que reproduce el reporte y falla en el estado original (`mastery-decay.test.ts`), pasa junto a las 105 originales, corrección de una sola línea, recorrido del resto del comportamiento esperado con evidencia (sección 3), `nodesAtRisk` implementado y tipado (`graph.ts:321`), y una prueba por decisión de borde (`nodes-at-risk.test.ts`).
