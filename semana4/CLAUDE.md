# Contexto del proyecto — Caso práctico 4 (SINT-732)

Este directorio contiene el trabajo del Caso práctico 4 del curso "Laboratorio Ejecutivo en
Claude Code" (Universidad CENFOTEC). Ver `consigna-semana4.txt` para el enunciado completo (no se
sube al repositorio).

Continúa el Caso práctico 3, cuya entrega quedó congelada en `semana3/`. Las copias vivas de
`ESPECIFICACION.md` y `DISENO.md` son las de esta carpeta.

## Qué se pide

Convertir la especificación y el diseño del cine en un **prototipo funcional**, construido por
vertical slices. Cada slice se construye en su propia conversación y queda cerrado cuando su
comprobación se corrió y el resultado quedó anotado como evidencia en `PLAN.md`.

## Reglas de este proyecto

- **Sí se escribe código** — a diferencia del Caso práctico 3. El estado terminal es el prototipo
  con al menos tres vertical slices cerrados y su evidencia anotada.
- **Un vertical slice por conversación.** El encargo referencia `ESPECIFICACION.md`, `DISENO.md` y
  `PLAN.md` en lugar de repetirlos.
- **La comprobación se escribe antes de construir**, nunca después.
- **Nada de andamiaje fuera de un slice.** El arranque del proyecto va dentro del vertical slice 1,
  y su comprobación es el recorrido funcionando, no "el proyecto compila".
- **Los documentos mandan.** Si la construcción revela que falta algo, se corrige primero
  `ESPECIFICACION.md` o `DISENO.md`, y después el código. Cambiar una tecnología exige actualizar
  `DISENO.md` con la razón.
- **PROMPT.md no se modifica**: es el encargo original tal como lo escribió la estudiante.
- Skills a usar: `escribir-plan` (ya corrida, produjo `PLAN.md`) y las de `superpowers` para
  construir.

## Alcance heredado del Caso práctico 3

- Un solo cine, sus dos salas (120 y 60 asientos).
- Cartelera de una semana.
- Pago simulado (no se conecta a ningún medio de pago real).
- Sin boletos impresos ni códigos de barras.
- Sin cuentas de cliente; solo el personal tiene cuenta.
- La base de datos usa un motor real: SQLite. Un archivo JSON no cuenta como base de datos.

## Entregables al repositorio Git

1. `PROMPT.md` — encargo inicial del Caso práctico 3.
2. `ESPECIFICACION.md` y `DISENO.md` — actualizados donde la construcción los corrigió.
3. `PLAN.md` — el plan completo, con la evidencia anotada en los vertical slices cerrados.
4. **Código** — los vertical slices cerrados del prototipo, al menos tres, en el orden del plan.
5. `README.md` — cómo poner a correr la aplicación, cómo recrear los datos de prueba, y la lista
   de dependencias adoptadas, cada una con el enlace a su repositorio oficial.

El commit que agrega `PLAN.md` precede a los commits de construcción (ya cumplido: commit
`1ac7c79`).

`consigna-semana4.txt` es material de apoyo local y está excluido vía `.gitignore`. Este
`CLAUDE.md` sí se sube: documenta el contexto con el que se trabajó.
