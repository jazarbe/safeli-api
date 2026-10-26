const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const { verificarToken } = require('../middlewares/auth.js');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const router = express.Router();

async function esMiembro(orbitId, userId) {
  const { data, error } = await supabase
    .from('OrbitMiembros')
    .select('user_id')
    .eq('orbit_id', orbitId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

// Guarda SOLO la última ubicación del usuario logueado.
router.put('/usuarios/ubicacion', verificarToken, async (req, res) => {
  try {
    const { latitude, longitude } = req.body ?? {};
    const valida =
      typeof latitude === 'number' && typeof longitude === 'number' &&
      Number.isFinite(latitude) && Number.isFinite(longitude) &&
      Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
    if (!valida) return res.status(400).json({ message: 'Coordenadas inválidas.' });

    const updatedAt = new Date().toISOString();
    const { error } = await supabase
      .from('Usuarios')
      .update({ ultimaLatitud: latitude, ultimaLongitud: longitude, ubicacionActualizadaAt: updatedAt })
      .eq('id', req.user.id);
    if (error) throw error;

    return res.json({ updatedAt });
  } catch (err) {
    console.error('PUT /usuarios/ubicacion error', err);
    return res.status(500).json({ message: 'Error al guardar la ubicación.' });
  }
});

// Última ubicación de un integrante. Solo si quien consulta y el consultado están en el mismo Orbit.
router.get('/orbits/:orbitId/miembros/:userId/ubicacion', verificarToken, async (req, res) => {
  try {
    const { orbitId, userId } = req.params;
    if (!/^\d+$/.test(userId)) return res.status(400).json({ message: 'Usuario inválido.' });

    const [yoSoyMiembro, eselMiembro] = await Promise.all([
      esMiembro(orbitId, req.user.id),
      esMiembro(orbitId, userId),
    ]);
    if (!yoSoyMiembro) return res.status(403).json({ message: 'No sos miembro de este Orbit.' });
    if (!eselMiembro) return res.status(404).json({ message: 'Ese usuario no pertenece al Orbit.' });

    const { data, error } = await supabase
      .from('Usuarios')
      .select('ultimaLatitud, ultimaLongitud, ubicacionActualizadaAt')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;

    if (!data || data.ultimaLatitud == null || data.ultimaLongitud == null) {
      return res.status(404).json({ message: 'Todavía no compartió su ubicación.' });
    }

    res.set('Cache-Control', 'no-store');
    return res.json({
      userId,
      latitude: data.ultimaLatitud,
      longitude: data.ultimaLongitud,
      updatedAt: data.ubicacionActualizadaAt,
    });
  } catch (err) {
    if (err?.code === '22P02') return res.status(404).json({ message: 'El Orbit no existe.' });
    console.error('GET ubicacion de miembro error', err);
    return res.status(500).json({ message: 'Error al obtener la ubicación.' });
  }
});

module.exports = router;