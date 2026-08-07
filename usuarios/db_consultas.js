const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

if (process.env.NODE_TLS_ALLOW_SELF_SIGNED === 'true' || process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  console.warn('WARNING: TLS certificate validation is disabled');
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class DBRepository {
  async getUsuarios() {
    const { data, error } = await supabase
      .from('Usuarios')
      .select('username, contraseña');

    return { data, error };
  }

  async getUserByLoginIdentifier(identifier) {
    const { data, error } = await supabase
      .from('Usuarios')
      .select('*')
      .or(`username.eq.${identifier},email.eq.${identifier}`)
      .single();

    return { data, error };
  }

  async createUser(userPayload) {
    const { data, error } = await supabase
      .from('Usuarios')
      .insert([userPayload])
      .select()
      .single();

    return { data, error };
  }

  async updateUser(userPayload) {
    const { id, ...updates } = userPayload;
    const { data, error } = await supabase
      .from('Usuarios')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  }

  async saveRefreshToken(user_id, token, expiresAt) {
    return await supabase.from('Tokens').insert([
      { user_id, token, expires_at: expiresAt }
    ]);
  }

  async validateToken(token) {
    return await supabase
      .from('Tokens')
      .select('*, Usuarios(*)')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString()) // Validar expiración
      .single();
  }

  async deleteToken(token) {
    return await supabase.from('Tokens').delete().eq('token', token);
  }

  async updateUser(userId, updatePayload) {
    const dbData = {};

    if (updatePayload.firstName !== undefined) dbData.nombre = updatePayload.firstName;
    if (updatePayload.lastName !== undefined) dbData.apellido = updatePayload.lastName;
    if (updatePayload.username !== undefined) dbData.username = updatePayload.username;
    if (updatePayload.email !== undefined) dbData.email = updatePayload.email;
    if (updatePayload.birthDate !== undefined) dbData.fechaNacimiento = updatePayload.birthDate;
    if (updatePayload.nroTelefono !== undefined) dbData.nroTelefono = updatePayload.nroTelefono;

    const { data, error } = await supabase
      .from('Usuarios')
      .update(dbData)
      .eq('id', userId)
      .select()
      .single();

    return { data, error };
  }

  async updatePassword(userId, newPasswordHashed) {
    const { data, error } = await supabase
      .from('Usuarios')
      .update({ contraseña: newPasswordHashed })
      .eq('id', userId)
      .select()
      .single();

    return { data, error };
  }
}

module.exports = DBRepository;
