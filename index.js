process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config();

const cors = require('cors');
const express = require('express');
const path = require('path');

const usersRouter = require('./usuarios/db.js');
const { obtenerRutaPeatonalSegura } = require('./ruteoService.js');
const { verificarToken } = require('./middlewares/auth.js');
const { formatDuration, formatDistance } = require('./helpers/utils.js');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'src')));
app.use('', usersRouter);

app.post('/api/calcular-camino-seguro', verificarToken, async (req, res) => {
  try {
    const { origen, destino } = req.body; 

    if (!origen || !destino) {
      return res.status(400).json({ 
        error: 'Faltan las coordenadas de origen o destino.'
      });
    }

    const origenFormateado = Array.isArray(origen) 
      ? [parseFloat(origen[0]), parseFloat(origen[1])] 
      : [
          parseFloat(origen.lng || origen.longitud || origen.longitude), 
          parseFloat(origen.lat || origen.latitud || origen.latitude)
        ];

    const destinoFormateado = Array.isArray(destino) 
      ? [parseFloat(destino[0]), parseFloat(destino[1])] 
      : [
          parseFloat(destino.lng || destino.longitud || destino.longitude), 
          parseFloat(destino.lat || destino.latitud || destino.latitude)
        ];

    if (isNaN(origenFormateado[0]) || isNaN(origenFormateado[1]) || isNaN(destinoFormateado[0]) || isNaN(destinoFormateado[1])) {
      return res.status(400).json({ error: 'Las coordenadas tienen valores numéricos inválidos.' });
    }

    console.log(`📍 API Safeli (Usuario: ${req.user.id || 'Autenticado'}): Calculando ruta segura desde [${origenFormateado}] hasta [${destinoFormateado}]...`);

    const rutaSegura = await obtenerRutaPeatonalSegura(origenFormateado, destinoFormateado);

    return res.json(rutaSegura);

  } catch (error) {
    console.error('❌ Error en el endpoint de ruteo seguro:', error.message);
    
    try {
      const parsedError = JSON.parse(error.message);
      return res.status(400).json(parsedError);
    } catch {
      return res.status(500).json({ error: 'Error interno en el servicio de mapas.', details: error.message });
    }
  }
});

app.get('/api/directions', async (req, res) => {
  const { origin, destination } = req.query;
  const apiKey = process.env.ORS_API_KEY;

  if (!origin || !destination) {
    return res.status(400).json({ error: 'Faltan origin o destination' });
  }

  try {
    const [originLng, originLat] = origin.split(',').map(Number);
    const [destLng, destLat] = destination.split(',').map(Number);

    if ([originLng, originLat, destLng, destLat].some(Number.isNaN)) {
      return res.status(400).json({ error: 'Coordenadas inválidas' });
    }

    const url =
      `https://api.openrouteservice.org/v2/directions/foot-walking` +
      `?api_key=${apiKey}` +
      `&start=${originLng},${originLat}` +
      `&end=${destLng},${destLat}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok || !data.features || data.features.length === 0) {
      console.error('❌ Error de ORS Directions API:', data.error || data);
      return res.status(400).json({
        error: 'Error de ORS',
        details: data.error?.message || 'Sin detalles',
      });
    }

    const feature = data.features[0];
    const summary = feature.properties.summary;

    const polylinePoints = feature.geometry.coordinates.map(([lng, lat]) => ({
      latitude: lat,
      longitude: lng,
    }));

    const result = {
      polylinePoints,
      distanceText: formatDistance(summary.distance),
      durationText: formatDuration(summary.duration),
    };

    res.json(result);
  } catch (error) {
    console.error('Error al consultar ORS Directions:', error);
    res.status(500).json({ error: 'Error al consultar ORS Directions' });
  }
});

app.listen(PORT, () => {
  console.log(`🗺️ Servicio de Mapa Seguro activado en: http://localhost:${PORT}/api/calcular-camino-seguro`);
  console.log(`🔐 Servicio de Autenticación activado en: http://localhost:${PORT}/`);
});