// La puerta de entrada de Vercel.
//
// Vercel busca por convención una carpeta llamada `api/` y convierte cada archivo de adentro en una
// función que se despierta cuando alguien visita el sitio. Este archivo no hace nada propio: toma la
// aplicación Express que `server.js` exporta y la entrega. Es el único pedazo de código que existe
// por el despliegue y no por el negocio, y por eso vive aparte en vez de ensuciar `server.js`.
//
// El `vercel.json` de al lado es lo que manda todas las direcciones acá: sin él, esta función
// contestaría solo en `/api` y la página de inicio quedaría en blanco.
module.exports = require('../server.js');
