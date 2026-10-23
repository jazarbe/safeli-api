
const path = require('path');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');

const FOTOS_BUCKET = process.env.SUPABASE_FOTOS_BUCKET || 'fotos-perfil';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// se sube a Supabase
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      const err = new Error('Tipo de archivo no permitido');
      err.code = 'INVALID_FILE_TYPE';
      return cb(err);
    }
    cb(null, true);
  },
});

const subirFoto = (req, res, next) => {
  upload.single('foto')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ message: 'La foto es demasiado pesada. El máximo es 3 MB.' });
      }
      if (err.code === 'INVALID_FILE_TYPE') {
        return res.status(400).json({ message: 'El archivo debe ser una imagen.' });
      }
      return res.status(400).json({ message: 'Error al subir la foto.' });
    }
    next();
  });
};

// Sube el archivo a Supabase Storage y devuelve la URL pública
async function subirFotoAStorage(file, carpeta) {
  const ext = path.extname(file.originalname) || '.jpg';
  const filePath = `${carpeta}/${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;

  const { error } = await supabase.storage
    .from(FOTOS_BUCKET)
    .upload(filePath, file.buffer, { contentType: file.mimetype, upsert: false });
  if (error) throw error;

  const { data } = supabase.storage.from(FOTOS_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}

module.exports = { subirFoto, subirFotoAStorage };