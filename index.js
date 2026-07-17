process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config();

const cors = require('cors');
const express = require('express');
const path = require('path');

const usersRouter = require('./usuarios/db.js');
const { obtenerRutaPeatonalSegura } = require('./ruteoService.js');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'src')));
app.use('', usersRouter);

app.post('/api/calcular-camino-seguro', async (req, res) => {
  try {
    const { origen, destino } = req.body; 

    if (!origen || !destino) {
      return res.status(400).json({ 
        error: 'Faltan las coordenadas de origen o destino.'
      });
    }

    // ─── ADAPTADOR DE FORMATO SEGURO (Mapeamos a [lng, lat] numérico) ───
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

    // Verificación estricta de control
    if (isNaN(origenFormateado[0]) || isNaN(origenFormateado[1]) || isNaN(destinoFormateado[0]) || isNaN(destinoFormateado[1])) {
      return res.status(400).json({ error: 'Las coordenadas tienen valores numéricos inválidos.' });
    }

    // Ahora el log va a imprimir los números reales en vez de [object Object]
    console.log(`📍 API Safeli: Calculando ruta segura desde [${origenFormateado}] hasta [${destinoFormateado}]...`);

    // Le pasamos los arrays limpios a tu ruteoService
    const rutaSegura = await obtenerRutaPeatonalSegura(origenFormateado, destinoFormateado);

    return res.json(rutaSegura);

  } catch (error) {
    console.error('❌ Error en el endpoint de ruteo seguro:', error.message);
    
    // Si el error viene de OpenRouteService, lo desglosamos para debuggear mejor en consola
    try {
      const parsedError = JSON.parse(error.message);
      return res.status(400).json(parsedError);
    } catch {
      return res.status(500).json({ error: 'Error interno en el servicio de mapas.', details: error.message });
    }
  }
});

app.listen(PORT, () => {
  console.log(`🗺️ Servicio de Mapa Seguro activado en: http://localhost:${PORT}/api/calcular-camino-seguro`);
  console.log(`🔐 Servicio de Autenticación activado en: http://localhost:${PORT}/`);
});