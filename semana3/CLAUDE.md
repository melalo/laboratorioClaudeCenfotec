# Contexto del proyecto — Caso práctico 3 (SINT-732)

Este directorio contiene el trabajo del Caso práctico 3 del curso "Laboratorio Ejecutivo en
Claude Code" (Universidad CENFOTEC). Ver `consignaSemana3.txt` para el enunciado completo (no se
sube al repositorio).

## Qué se pide

Diseñar (sin implementar) un sistema de venta en línea de boletos para un cine independiente de
dos salas (120 y 60 butacas), que hoy vende únicamente en taquilla física. **No se escribe
código.** El resultado son documentos de especificación y diseño.

## Reglas de este proyecto

- **No crear archivos de código** ni andamiaje de proyecto. El estado terminal es
  `ESPECIFICACION.md` y `DISENO.md` escritos y revisados.
- **Skill a usar:** `escribir-diseno` (entrevista guiada → especificación → diseño).
- **PROMPT.md no se modifica** una vez hecho el primer commit: es el encargo original tal como
  lo escribió el estudiante.
- **No dejar preguntas abiertas sin resolver** en `ESPECIFICACION.md` antes de la entrega final.
- Alcance fijado por la consigna (cualquier restricción adicional debe quedar escrita como
  decisión, no darse por supuesta):
  - Un solo cine, sus dos salas.
  - Cartelera de una semana.
  - Pago simulado (no se conecta a un medio de pago real).
  - Sin boletos impresos ni códigos de barras.
  - Sin cuentas de usuario, salvo que la propia especificación determine que hacen falta.

## Entregables al repositorio Git

Solo estos tres archivos van al historial (ver `.gitignore` para lo que se excluye):

1. `PROMPT.md` — encargo inicial, primer commit del repositorio.
2. `ESPECIFICACION.md` — qué debe hacer el sistema y bajo qué reglas, sin nombrar tecnologías.
3. `DISENO.md` — forma de la solución: componentes, límites, modelo de datos, alternativas y
   decisiones.

`consignaSemana3.txt` y `skill-escribir-diseno.txt` son material de apoyo local y están excluidos
vía `.gitignore`. Este `CLAUDE.md` sí se sube: documenta el contexto con el que se trabajó.
