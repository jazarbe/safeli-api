process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config();

const express = require('express');
const path = require('path');

const { obtenerRutaPeatonalSegura } = require('./src/safeli-score/ruteoService.js');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'src')));


app.post('/api/calcular-camino-seguro', async (req, res) => {
  try {
    const { origen, destino } = req.body; // El celular mandará { origen: [lng, lat], destino: [lng, lat] }

    if (!origen || !destino) {
      return res.status(400).json({ 
        error: 'Faltan las coordenadas de origen o destino.' 
      });
    }

    console.log(`📍 API Safeli: Calculando ruta segura desde ${origen} hasta ${destino}...`);

    // Ejecutamos tu lógica que esquiva los polígonos de Supabase
    const rutaSegura = await obtenerRutaPeatonalSegura(origen, destino);

    // Devolvemos el GeoJSON limpio al Front End de React Native
    return res.json(rutaSegura);

  } catch (error) {
    console.error('❌ Error en el endpoint de ruteo seguro:', error.message);
    return res.status(500).json({ 
      error: 'Error interno al calcular la ruta segura.' 
    });
  }
});

app.listen(PORT, () => {
  console.log(`🗺️ Servicio de Mapa Seguro activado en: http://localhost:${PORT}/api/calcular-camino-seguro`);
});