#!/usr/bin/env bash
# Puerta de calidad de Cancha Total F5.
#
#   0 = se puede cerrar. Todo lo que se comprueba está en verde, y los hallazgos que siguen
#       abiertos están marcados como fallo esperado con su número, así que no rompen la puerta.
#   2 = algo falló. El motivo queda impreso arriba.
#
# Un solo comando: quien lo corre no tiene que acordarse de nada.
#
# Este proyecto no tiene linter ni chequeo de tipos, así que la puerta es solo la suite. Cuando se
# agregue alguno, se suma acá con la misma forma: si falla, salir en 2.
#
# Ojo con una cosa, y es un hallazgo de estructura anotado (H-13): el puerto 3000 está fijo en
# `server.js`, así que la verificación no puede correr con otra aplicación levantada en ese puerto.
# Si eso pasa, la suite aborta con un mensaje que lo dice.

set -u

cd "$(dirname "$0")" || {
  echo "No se pudo entrar a la carpeta del proyecto." >&2
  exit 2
}

echo "Corriendo la suite de Cancha Total F5..."
npm test || {
  echo "La suite falló." >&2
  exit 2
}

echo "Verificación completa."
