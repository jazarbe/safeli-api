const turf = require('@turf/turf');

/**
 * Calcula las estrellas de seguridad (1 a 5) y las métricas de exposición
 * @param {Object} geojsonRuta - GeoJSON devuelto por OpenRouteService
 * @param {Object} zonasPeligrosas - GeoJSON con los polígonos de delitos
 * @returns {Object} Objeto con rating, metros expuestos y porcentaje expuesto
 */
function calcularEstrellasRuta(geojsonRuta, zonasPeligrosas) {
  // 1. Extraer la línea de la ruta y la distancia total
  const featureRuta = geojsonRuta.features[0];
  const distanciaTotalMetros = featureRuta.properties.summary.distance;

  if (!distanciaTotalMetros || distanciaTotalMetros === 0) {
    return { estrellas: 5, porcentajeExpuesto: 0, metrosExpuestos: 0 };
  }

  let metrosExpuestos = 0;

  // 2. Recorrer los polígonos de riesgo y calcular la intersección
  if (zonasPeligrosas && zonasPeligrosas.features) {
    zonasPeligrosas.features.forEach((zona) => {
      // Verificar si la ruta cruza el polígono
      if (turf.booleanIntersects(featureRuta, zona)) {
        // Obtener el fragmento de la ruta que cae dentro del polígono
        const tramosIntersectados = turf.lineSplit(featureRuta, zona);

        // O mejor: usar turf.lineOverlap o turf.intersect entre la ruta y la zona
        // Para precisión exacta con superficies/polígonos:
        const intersect = turf.booleanWithin(featureRuta, zona);
        
        // Alternativa precisa mediante recorte de línea en polígono:
        const lineSegs = turf.lineSegment(featureRuta);
        lineSegs.features.forEach((seg) => {
          if (turf.booleanWithin(seg, zona) || turf.booleanIntersects(seg, zona)) {
            metrosExpuestos += turf.length(seg, { units: 'meters' });
          }
        });
      }
    });
  }

  // 3. Evitar sobreestimaciones si se solapan polígonos (limitar al total de la ruta)
  metrosExpuestos = Math.min(metrosExpuestos, distanciaTotalMetros);

  // 4. Calcular el porcentaje expuesto (Modelo 1)
  const porcentajeExpuesto = (metrosExpuestos / distanciaTotalMetros) * 100;

  // 5. Mapear a la escala de 1 a 5 Estrellas
  let estrellas = 5;
  if (porcentajeExpuesto === 0) {
    estrellas = 5;
  } else if (porcentajeExpuesto <= 5) {
    estrellas = 4;
  } else if (porcentajeExpuesto <= 15) {
    estrellas = 3;
  } else if (porcentajeExpuesto <= 30) {
    estrellas = 2;
  } else {
    estrellas = 1;
  }

  return {
    estrellas,
    porcentajeExpuesto: Number(porcentajeExpuesto.toFixed(2)),
    metrosExpuestos: Number(metrosExpuestos.toFixed(1)),
    distanciaTotalMetros: Number(distanciaTotalMetros.toFixed(1))
  };
}

module.exports = { calcularEstrellasRuta };