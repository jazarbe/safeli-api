process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

console.log("🌍 URL leída del .env:", `[${process.env.SUPABASE_URL}]`);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Función auxiliar para crear un polígono (círculo aproximado) alrededor de una esquina peligrosa
function crearCirculoGeoJSON(lat, lng, radioMetros, puntos = 8) {
    const coordenadas = [];
    const km = radioMetros / 1000;
    const kLat = km / 111.32;
    const kLng = km / (111.32 * Math.cos(lat * Math.PI / 180));

    for (let i = 0; i < puntos; i++) {
        const angulo = (i * 360) / puntos;
        const rad = angulo * Math.PI / 180;
        const x = lng + kLng * Math.cos(rad);
        const y = lat + kLat * Math.sin(rad);
        coordenadas.push([x, y]);
    }
    coordenadas.push(coordenadas[0]); // Cerrar el polígono
    return [coordenadas];
}

async function exportarDelitosParaORS() {
    try {
        console.log('🔄 Extrayendo delitos de Supabase...');
        const { data: delitos, error } = await supabase
            .from('delitos_para_algoritmo')
            .select('id, gravedad, ubicacion');

        if (error) throw error;

        // Estructura oficial GeoJSON FeatureCollection
        const geojson = {
            type: "FeatureCollection",
            features: []
        };

        delitos.forEach((delito) => {
            if (delito.ubicacion && typeof delito.ubicacion === 'string') {
                const stringLimpio = delito.ubicacion.replace(/[\(\)]/g, '');
                const partes = stringLimpio.split(',');
                const lat = parseFloat(partes[0]);
                const lng = parseFloat(partes[1]);

                if (!isNaN(lat) && !isNaN(lng)) {
                    const radioMetros = delito.gravedad * 20; // Radio del impacto del delito

                    geojson.features.push({
                        type: "Feature",
                        properties: {
                            id: delito.id,
                            gravedad: delito.gravedad,
                            // Guardamos un factor de penalización (0.1 = ralentizar mucho, 1.0 = normal)
                            prioridad: Math.max(0.1, 1 - (delito.gravedad * 0.15)) 
                        },
                        geometry: {
                            type: "Polygon",
                            coordinates: crearCirculoGeoJSON(lat, lng, radioMetros)
                        }
                    });
                }
            }
        });

        fs.writeFileSync('./zonas_peligrosas.geojson', JSON.stringify(geojson, null, 2));
        console.log(`✅ Archivo 'zonas_peligrosas.geojson' generado para ORS.`);

    } catch (err) {
        console.error('Error:', err.message);
    }
}

exportarDelitosParaORS();