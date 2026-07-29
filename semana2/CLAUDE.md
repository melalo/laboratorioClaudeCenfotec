# CLAUDE.md

Este archivo proporciona contexto a Claude Code al trabajar en este proyecto.

## Frameworks y tecnologías

- TypeScript
- React

## Propósito de la tarea (Caso Práctico 2)

FretPath es una aplicación de práctica de guitarra (TypeScript + React, ~5.800 líneas, 38 archivos) con una suite de 105 pruebas, todas en verde. Un usuario reportó que, tras un mes sin usar la app, el mapa de habilidades le sigue mostrando todo como dominado, en vez de indicarle qué repasar. Ninguna de las 105 pruebas detecta este problema.

Comportamiento esperado del motor (aún no verificado en el código):

- **Grafo de habilidades**: cada nodo tiene prerequisitos y permanece bloqueado hasta dominarlos. Cada nodo agrupa varios ítems de práctica.
- **Dominio**: un ítem se domina al llegar a maestría 80/100. Un nodo se domina cuando todos sus ítems lo están.
- **El dominio se pierde solo**: si un ítem pasa su fecha de repaso sin practicarse, su maestría decae ~3% por día de atraso (`OVERDUE_RETENTION_PER_DAY = 0.97`, decaimiento exponencial).
- **Oxidación**: un nodo que cae por debajo del umbral se marca oxidado, y los nodos que dependen de él vuelven a bloquearse hasta refrescarlo.
- **Aviso anticipado (pendiente de construir)**: el producto debía avisar antes de que un nodo cayera, no solo después. Esta parte falta y es la que hay que implementar: `nodesAtRisk(graph, itemStates, now, horizonDays)`, que determina qué nodos caerán por debajo del dominio dentro de `horizonDays` días si no se practica nada. La firma no resuelve varias decisiones de borde (umbral por ítem vs. promedio del nodo, ítems nunca practicados, nodos ya caídos, nodos en mantenimiento, nodos sin ítems, el límite exacto de `horizonDays`); cada una debe quedar decidida, documentada y fijada en una prueba.

Qué debe cumplirse al entregar:

1. Una prueba nueva (propia) reproduce el reporte del usuario, falla en el estado original del repo por la razón correcta, y describe el comportamiento esperado desde la perspectiva del usuario (no un detalle interno).
2. Esa prueba pasa y las 105 originales siguen pasando sin modificarlas. Nunca modifiques estas pruebas existentes.
3. La corrección es mínima y defendible en tamaño.
4. Se recorre y verifica, con evidencia, cada punto del comportamiento esperado descrito arriba (no solo lo que reportó el usuario); lo que se encuentre sin reportar también se corrige y documenta.
5. `nodesAtRisk` queda implementado, tipado, y respeta que el tiempo entra como parámetro.
6. Cada decisión de borde de `nodesAtRisk` tiene una prueba que la fija.

El código vive en `fretPath-estudiantes-melania/` (dentro de esta misma carpeta `semana2/`). La entrega incluye el repositorio Git completo más este archivo y `BITACORA.md` (generado al final del trabajo, siguiendo el encargo específico de la consigna).

## Estado actual (última actualización: fix + nodesAtRisk completados)

- Causa encontrada y corregida: `isNodeMastered` (`fretPath-estudiantes-melania/src/engine/graph.ts`) le pasaba a `currentMastery` el propio `dueDate` del ítem en vez del `now` real, así que el decaimiento nunca se aplicaba. Corrección de una línea.
- `isNodeWeakened` y `weakenedPrereqs` (el aviso de "qué prerequisito hay que repasar") no tenían ninguna prueba desde antes del bug; se les agregó cobertura y funcionan bien con la misma corrección.
- `nodesAtRisk` implementado con las 6 decisiones de borde documentadas en el propio código (`graph.ts`) y fijadas en pruebas.
- Suite final: 118/118 pruebas en verde (105 originales sin tocar + 13 nuevas), `tsc --noEmit` sin errores.

## Sobre quién trabaja en este proyecto

Soy estudiante y estoy aprendiendo a usar Claude Code para desarrollar software; tengo poco conocimiento de programación. Cuando el trabajo implique explicar código o conceptos técnicos, las explicaciones deben ser simples, sin asumir experiencia previa.

## Restricciones

- No modificar los archivos de prueba existentes. Si una prueba existente estorba, se reporta como hallazgo, no se edita.
- No consultar ni intervenir el sitio en producción del proyecto.
- El motor es puro y determinista: no llama al reloj del sistema por su cuenta; el tiempo siempre entra como parámetro. Todo código y prueba nuevos deben respetar esta propiedad.
- Se puede usar Claude Code sin límite, pero la responsabilidad de la solución (y su defensa) es del estudiante.
