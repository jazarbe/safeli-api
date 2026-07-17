import express from 'express';
import multer from 'multer';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import postgres from 'postgres'; //important
import DBRepository from './db_consultas.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL
    .replace('[DATABASE_PASSWORD]', process.env.DATABASE_PASSWORD || '')
    .replace('[DB_PORT]', process.env.DB_PORT || '5432');

const sql = postgres(connectionString); //important
const dbRepo = new DBRepository();

const app = express();
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', cors());
app.use(express.json());

const uploadsDir = path.join(__dirname, 'uploads');
try {
	fs.mkdirSync(uploadsDir, { recursive: true });
} catch (e) {
	console.warn('Could not create uploads directory', e);
}
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.resolve(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '.jpg';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ storage: storage });
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
	res.type('html');
	res.send(`<!DOCTYPE html>
				<html lang="en">
				<head>
					<meta charset="utf-8">
					<meta name="viewport" content="width=device-width,initial-scale=1">
					<title>Auth mock server</title>
				</head>
				<body>
					<h1>Auth mock server is running</h1>
					<p>Available endpoints: <code>/auth/register</code>, <code>/auth/login</code>, <code>/uploads/*</code></p>
				</body>
				</html>`);
});

app.post('/auth/login', async (req, res) => {
    try {
        const { username, contraseña, password } = req.body;
        const rawPassword = contraseña ?? password ?? '';

        if (!username || !rawPassword) {
            return res.status(400).json({ message: 'Usuario y contraseña son requeridos.' });
        }

        const { data: user, error } = await dbRepo.getUserByLoginIdentifier(username);

        if (error) {
            console.error('/auth/login db error', error);
            return res.status(500).json({ message: 'DB error' });
        }

        if (!user) {
            return res.status(401).json({ message: 'Usuario o contraseña incorrectos.' });
        }

        const passwordMatches = rawPassword ? await bcrypt.compare(rawPassword, user.contraseña) : false;
        if (!passwordMatches) {
            return res.status(401).json({ message: 'Usuario o contraseña incorrectos.' });
        }

        const accessToken = 'dev-access-token';
        const refreshToken = 'dev-refresh-token';

        return res.json({
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                nombre: user.nombre,
                apellido: user.apellido,
                email: user.email,
                username: user.username,
                nroTelefono: user.nroTelefono,
                foto: user.foto,
                fechaNacimiento: user.fechaNacimiento,
            },
        });
    } catch (err) {
        console.error('/auth/login error', err);
        return res.status(500).json({ message: 'Server error' });
    }
});

app.post('/auth/register', upload.single('foto'), async (req, res) => {
    try {
        const { nombre, apellido, email, username, fechaNacimiento, contraseña, password, nroTelefono } = req.body;
        const rawPassword = contraseña ?? password ?? '';
        const parsedPhone = (() => {
            const value = Number(nroTelefono);
            return Number.isNaN(value) ? null : value;
        })();

        let fotoUrl = '-1';
        if (req.file) {
            fotoUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        } else if (req.body.foto && typeof req.body.foto === 'string' && req.body.foto !== '[object Object]') {
            fotoUrl = req.body.foto;
        }
        const hashed = rawPassword ? await bcrypt.hash(rawPassword, 10) : '';

        const { data: created, error: dbErr } = await dbRepo.createUser({
            nombre,
            apellido,
            email,
            username,
            fechaNacimiento,
            contraseña: hashed,
            nroTelefono: parsedPhone,
            foto: fotoUrl,
        });

        if (dbErr) {
            console.error('DB insert error', dbErr);
            if (dbErr.code === '23505' || (dbErr.message && dbErr.message.toLowerCase().includes('duplicate'))) {
                return res.status(409).json({ message: 'El usuario o email ya está registrado.' });
            }
            return res.status(500).json({ message: 'DB error' });
        }

        const user = {
            id: created.id,
            nombre: created.nombre,
            apellido: created.apellido,
            email: created.email,
            username: created.username,
            nroTelefono: created.nroTelefono,
            foto: created.foto,
            fechaNacimiento: created.fechaNacimiento,
        };

        const accessToken = 'dev-access-token';
        const refreshToken = 'dev-refresh-token';

        return res.json({ accessToken, refreshToken, user });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server error' });
    }
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(PORT, () => console.log(`Auth mock server listening on http://localhost:${PORT}`));

export default sql;