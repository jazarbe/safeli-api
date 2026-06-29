process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // Escudo para la red institucional
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Cargamos las zonas de peligro una sola vez al iniciar el servidor (eficiencia pura)
const zonasPeligrosas = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, './zonas_peligrosas.geojson'), 'utf8')
);

/**
 * Calcula una ruta peatonal segura esquivando las zonas de delitos de Supabase
 * @param {Array} origen - Coordenadas de inicio [longitud, latitud] -> Ej: [-58.4539, -34.5851]
 * @param {Array} destino - Coordenadas de fin [longitud, latitud] -> Ej: [-58.4600, -34.5900]
 * @returns {Object} GeoJSON con la ruta calculada
 */
async function obtenerRutaPeatonalSegura(origen, destino) {
    const ORS_API_KEY = process.env.ORS_API_KEY;
    const url = 'https://api.openrouteservice.org/v2/directions/foot-walking/geojson';

    const body = {
        coordinates: [origen, destino], // Parámetros dinámicos
        options: {}
    };

    // Estructuramos el MultiPolygon para OpenRouteService
    if (zonasPeligrosas.features && zonasPeligrosas.features.length > 0) {
        body.options.avoid_polygons = {
            type: "MultiPolygon",
            coordinates: zonasPeligrosas.features.map(f => f.geometry.coordinates)
        };
    }

    try {
        const respuesta = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': ORS_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!respuesta.ok) {
            const errorData = await respuesta.json();
            throw new Error(JSON.stringify(errorData));
        }

        const resultadoRuta = await respuesta.json();
        return resultadoRuta; // Devolvemos el GeoJSON limpio para el mapa

    } catch (error) {
        console.error('❌ Error en el servicio de ruteo:', error.message);
        throw error;
    }
}

// Exportamos la función para que la pueda usar tu servidor Express u otros scripts
module.exports = { obtenerRutaPeatonalSegura };