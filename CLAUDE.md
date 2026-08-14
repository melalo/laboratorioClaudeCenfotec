# Curso Laboratorio Ejecutivo en Claude Code — CENFOTEC (SINT-732)

Este repositorio es el trabajo de un **curso de aprendizaje**. Cada consigna vive en su propia
carpeta (`semana1/`, `semana2/`, …) y el proyecto final en `proyectoFinal/`. Cada carpeta tiene su
propio `CLAUDE.md` con lo específico de esa consigna; **este archivo tiene las reglas que aplican
siempre, a todas las carpetas y a todas las sesiones**, incluidas las que todavía no existen.

## Quién trabaja acá

Soy estudiante y estoy aprendiendo a usar Claude Code para desarrollar software. **Tengo poco
conocimiento de programación.** El objetivo de este repositorio no es solo que el trabajo quede
hecho: es que yo entienda lo que se hizo y por qué.

**La responsabilidad de cada entrega, y su defensa frente al docente, es mía.** Puedo usar Claude
Code sin límite, pero si no puedo explicar lo que se entregó, el trabajo no sirve. Por eso las
explicaciones no son un extra: son parte del entregable.

## Explicar a fondo, sin asumir

- **Explicá todo con detalle. Nunca asumas que entiendo**, sobre todo cuando se trata de
  programación, lenguajes, herramientas o cualquier concepto técnico.
- Un término técnico se explica en el momento en que aparece, en la misma frase, en palabras
  simples. No se deja para después ni se da por sabido.
- Si algo se puede explicar con una analogía cotidiana, mejor.
- Vale más una explicación larga que yo entienda, que una corta que me deje perdida.

## Buscar antes de decidir

- **Cuando necesites un dato, buscalo primero en los archivos del repositorio.** La consigna, el
  `PROMPT.md`, la especificación, el diseño, el plan, los `CLAUDE.md` de cada carpeta y el
  historial de Git tienen casi todo. La respuesta correcta casi siempre ya está escrita en algún
  lado.
- **Si después de buscar no lo encontrás, preguntame — antes de decidir y antes de cambiar
  nada.** No inventes el dato, no elijas "lo más razonable" en silencio, no lo dejes para
  descubrirlo más adelante.
- Cuando me contestes algo que buscaste, decime **dónde lo encontraste**, para que yo pueda
  verificarlo.
- **Nada se da por supuesto.** Cualquier restricción, límite o supuesto que se adopte queda
  escrito como decisión, con su razón, en el documento que corresponda. Un supuesto que solo vive
  en la cabeza de quien lo tomó no existe.

## Reglas del curso

- **Todo se construye con Claude Code.** Es el objetivo del curso, no un atajo.
- **No se usan datos reales confidenciales** en ningún ejercicio: ni de personas, ni de negocios,
  ni credenciales de servicios reales. Los datos de prueba son inventados.
- **El encargo original no se toca.** Cuando una carpeta arranca con un `PROMPT.md` escrito por
  mí, ese archivo queda tal como lo escribí: es el pedido original y sirve para comparar contra lo
  que terminó saliendo. Las correcciones van en los documentos que derivan de él, nunca en él.

## La carpeta del día

**Cada sesión se trabaja sobre una sola carpeta.** Si no digo cuál es, preguntámelo y esperá la
respuesta **antes de leer o modificar nada**. No se adivina por el número más alto, por la fecha ni
por lo último que se tocó.

Una vez fijada, esa es la carpeta del día y **todo el trabajo queda adentro**.

## Nada fuera de la carpeta del día

**Las demás carpetas de consignas no se modifican nunca.** Si el trabajo del día parece pedir un
cambio en otra carpeta: no se hace, ni siquiera "para dejarlo consistente". Cada carpeta es la foto
de esa consigna y se queda como está.

Si algo de otra carpeta parece quedar desactualizado, se menciona en la respuesta y ahí termina. No
se propone arreglarlo ni se arregla.

**Única excepción:** este `CLAUDE.md` de la carpeta madre puede cambiar — y solo después de
preguntarme y recibir el sí.

## Propagar los cambios hacia atrás, dentro de la carpeta del día

Cuando el trabajo revela que algo escrito antes **en esa misma carpeta** quedó incompleto o
equivocado, el documento anterior se corrige primero, y después el trabajo nuevo. Un cambio nunca
se aplica solo donde apareció.

Antes de dar por cerrado cualquier cambio:

1. Buscar, **dentro de la carpeta del día**, qué otros archivos hablan de lo mismo.
2. Listarlos y decir en qué quedaron desactualizados.
3. Actualizarlos, y decir explícitamente cuáles se actualizaron.

## Commits

- El mensaje **nombra el entregable**, no solo la carpeta: quien revisa busca en el historial "el
  plan", "la especificación", "la pieza N". Un mensaje que solo dice la semana esconde el trabajo.
- Cuando un commit actualiza un documento porque el trabajo lo corrigió, el mensaje dice **qué
  decisión cambió**.
- No hacer commit ni push por cuenta propia: se hace cuando lo pido.
- **Cuando pido subir algo al repositorio, eso incluye el `push`.** "Subilo", "hacé commit",
  "guardalo en Git" y cualquier forma parecida significan **commit y push**, en la misma tanda y
  sin volver a preguntarme si lo subo. Sigue valiendo la regla de arriba: nada de esto se hace por
  cuenta propia, solo cuando lo pido — pero cuando lo pido, se hace completo.
- Nunca reescribir historial ya subido sin explicar el riesgo y pedir confirmación. Si se hace,
  crear antes una rama de respaldo y verificar, comparando contra ella, que el contenido quedó
  idéntico.
- **El `CLAUDE.md` de cada carpeta sí se sube al repositorio**, porque documenta el contexto con el
  que se trabajó. Las consignas y el material de apoyo local siguen excluidos.

## Vocabulario

- En los planes de construcción, las unidades de trabajo se llaman **vertical slices**, en inglés,
  aunque el resto del documento esté en español.

## Verificar antes de afirmar

No decir que algo quedó bien, que funciona o que está listo sin haber corrido la comprobación y
visto el resultado. Si una comprobación falla, se dice que falló y se muestra la salida.

## Al cerrar un vertical slice, repetir cómo probarlo

Cada vez que se termina un vertical slice, el mensaje que anuncia que está listo **tiene que
incluir de nuevo, escrito completo, cómo abrirlo y probarlo**:

- el comando exacto para levantar la aplicación,
- la dirección completa con su número de puerto (por ejemplo `http://localhost:3000`),
- y qué debería ver yo en pantalla para saber que el slice funciona.

**Se repite siempre, aunque ya se haya dicho antes en la misma sesión.** No vale "como te indiqué
más arriba", "el mismo puerto de siempre" ni mandarme a buscarlo en un mensaje anterior: yo voy a
probarlo en ese momento y necesito los datos ahí, a la vista, sin tener que subir en la
conversación.

Un slice no se da por cerrado hasta que ese bloque de "cómo probarlo" está escrito.
