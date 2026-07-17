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
}

module.exports = DBRepository;
