const crypto = require('crypto');
const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const { verificarToken } = require('../middlewares/auth.js');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const router = express.Router();

// Código corto, aleatorio y apto para URL (8 caracteres, base64url)
const generarCodigo = () => crypto.randomBytes(6).toString('base64url');

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

async function obtenerMiembros(orbitId, userId) {
  const { data, error } = await supabase
    .from('OrbitMiembros')
    .select('role, user_id, Usuarios(id, nombre, apellido, username, foto)')
    .eq('orbit_id', orbitId)
    .order('joined_at', { ascending: true });
  if (error) throw error;

  return (data ?? []).map((m) => {
    const u = m.Usuarios ?? {};
    const fullName = [u.nombre, u.apellido].filter(Boolean).join(' ');
    return {
      id: String(m.user_id),
      name: fullName || u.username || 'Miembro',
      username: u.username,
      foto: u.foto && u.foto !== '-1' ? u.foto : null,
      role: m.role,
      isMe: String(m.user_id) === String(userId),
    };
  });
}

// Crear Orbit: el usuario logueado queda como administrador y primer miembro
router.post('/orbits', verificarToken, async (req, res) => {
  try {
    const name = String(req.body?.name ?? '').trim();
    if (!name) return res.status(400).json({ message: 'El nombre del Orbit es obligatorio.' });
    if (name.length > 60) return res.status(400).json({ message: 'El nombre es demasiado largo (máx. 60).' });

    const userId = req.user.id;

    // Reintenta si el código generado ya existía (colisión improbable)
    let orbit = null;
    for (let i = 0; i < 3 && !orbit; i++) {
      const { data, error } = await supabase
        .from('Orbits')
        .insert([{ name, invite_code: generarCodigo(), owner_id: userId }])
        .select('id, name, invite_code')
        .single();

      if (!error) orbit = data;
      else if (error.code !== '23505') throw error;
    }
    if (!orbit) return res.status(500).json({ message: 'No se pudo generar el código del Orbit.' });

    const { error: memberErr } = await supabase
      .from('OrbitMiembros')
      .insert([{ orbit_id: orbit.id, user_id: userId, role: 'admin' }]);

    if (memberErr) {
      await supabase.from('Orbits').delete().eq('id', orbit.id); // no dejar orbits huérfanos
      throw memberErr;
    }

    return res.status(201).json({
      id: orbit.id,
      name: orbit.name,
      inviteCode: orbit.invite_code,
      members: await obtenerMiembros(orbit.id, userId),
    });
  } catch (err) {
    console.error('POST /orbits error', err);
    return res.status(500).json({ message: 'Error al crear el Orbit.' });
  }
});

// Orbits del usuario logueado (debe ir ANTES de /orbits/:id)
router.get('/orbits/mine', verificarToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('OrbitMiembros')
      .select('joined_at, Orbits(id, name, OrbitMiembros(count))')
      .eq('user_id', req.user.id)
      .order('joined_at', { ascending: false });
    if (error) throw error;

    const orbits = (data ?? [])
      .filter((row) => row.Orbits)
      .map((row) => ({
        id: row.Orbits.id,
        name: row.Orbits.name,
        memberCount: row.Orbits.OrbitMiembros?.[0]?.count ?? undefined,
      }));

    return res.json({ orbits });
  } catch (err) {
    console.error('GET /orbits/mine error', err);
    return res.status(500).json({ message: 'Error al obtener tus Orbits.' });
  }
});

// Detalle de un Orbit (solo para sus miembros). Incluye el código para invitar.
router.get('/orbits/:id', verificarToken, async (req, res) => {
  try {
    const orbitId = req.params.id;
    const userId = req.user.id;

    const { data: orbit, error } = await supabase
      .from('Orbits')
      .select('id, name, invite_code')
      .eq('id', orbitId)
      .maybeSingle();

    // Un id con formato inválido hace fallar la consulta: lo tratamos como "no existe"
    if (error?.code === '22P02' || (!error && !orbit)) {
      return res.status(404).json({ message: 'El Orbit no existe.' });
    }
    if (error) throw error;

    if (!(await esMiembro(orbit.id, userId))) {
      return res.status(403).json({ message: 'No sos miembro de este Orbit.' });
    }

    return res.json({
      id: orbit.id,
      name: orbit.name,
      inviteCode: orbit.invite_code,
      members: await obtenerMiembros(orbit.id, userId),
    });
  } catch (err) {
    console.error('GET /orbits/:id error', err);
    return res.status(500).json({ message: 'Error al obtener el Orbit.' });
  }
});

// Unirse con el código de invitación. Es idempotente: si ya es miembro, devuelve el Orbit igual.
router.post('/orbits/join', verificarToken, async (req, res) => {
  try {
    const code = String(req.body?.code ?? '').trim();
    if (!code) return res.status(400).json({ message: 'Falta el código de invitación.' });

    const { data: orbit, error } = await supabase
      .from('Orbits')
      .select('id, name')
      .eq('invite_code', code)
      .maybeSingle();
    if (error) throw error;
    if (!orbit) return res.status(404).json({ message: 'El enlace de invitación no es válido.' });

    const { error: joinErr } = await supabase
      .from('OrbitMiembros')
      .upsert([{ orbit_id: orbit.id, user_id: req.user.id, role: 'member' }], {
        onConflict: 'orbit_id,user_id',
        ignoreDuplicates: true,
      });
    if (joinErr) throw joinErr;

    return res.json({ orbitId: orbit.id, id: orbit.id, name: orbit.name });
  } catch (err) {
    console.error('POST /orbits/join error', err);
    return res.status(500).json({ message: 'Error al unirse al Orbit.' });
  }
});

module.exports = router;