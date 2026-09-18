const fs = require('fs');
const path = require('path');
const { calcularEstrellasRuta } = require('./helpers/calculoEstrellas'); // Importamos la función

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const zonasPeligrosas = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, './zonas_peligrosas.geojson'), 'utf8')
);

async function obtenerRutaPeatonalSegura(origen, destino) {
    const ORS_API_KEY = process.env.ORS_API_KEY;
    const url = 'https://api.openrouteservice.org/v2/directions/foot-walking/geojson';

    const body = {
        coordinates: [origen, destino],
        options: {}
    };

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

        // 🌟 Calculamos el score de seguridad antes de retornar
        const evaluacionSeguridad = calcularEstrellasRuta(resultadoRuta, zonasPeligrosas);

        // Adjuntamos la evaluación en las propiedades del GeoJSON
        if (resultadoRuta.features && resultadoRuta.features.length > 0) {
            resultadoRuta.features[0].properties.safety_assessment = evaluacionSeguridad;
        }

        return resultadoRuta;

    } catch (error) {
        console.error('❌ Error en el servicio de ruteo:', error.message);
        throw error;
    }
}

module.exports = { obtenerRutaPeatonalSegura };