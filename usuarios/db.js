const cors = require('cors');
const express = require('express');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const DBRepository = require('./db_consultas.js');
const { verificarToken } = require('../middlewares/auth.js');
const jwt = require('jsonwebtoken');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SECRET_KEY = process.env.JWT_SECRET || 'ClaveSecretaSafeli2026$';

const connectionString = process.env.DATABASE_URL
    .replace('[DATABASE_PASSWORD]', process.env.DATABASE_PASSWORD || '')
    .replace('[DB_PORT]', process.env.DB_PORT || '5432');

const dbRepo = new DBRepository();
const router = express.Router();

// ─── MIDDLEWARES Y ARCHIVOS ESTÁTICOS ───
router.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
router.use(express.json());

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname) || '.jpg';
        cb(null, `${file.fieldname}-${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`);
    }
});
const upload = multer({ storage });
router.use('/uploads', express.static(uploadsDir));

// ─── HELPER PARA GENERAR TOKENS ───
function generarTokens(user) {
    const payload = { id: user.id, username: user.username, email: user.email };
    
    // Access token de corta duración (2 horas)
    const accessToken = jwt.sign(payload, SECRET_KEY, { expiresIn: '2h' });
    
    // Refresh token de larga duración (7 días)
    const refreshToken = jwt.sign({ id: user.id }, SECRET_KEY, { expiresIn: '7d' });

    return { accessToken, refreshToken };
}

// ─── RUTAS ───
router.post('/auth/login', async (req, res) => {
    try {
        const { username, contraseña, password } = req.body;
        const rawPassword = contraseña ?? password ?? '';

        if (!username || !rawPassword) {
            return res.status(400).json({ message: 'Usuario y contraseña son requeridos.' });
        }

        const { data: user, error } = await dbRepo.getUserByLoginIdentifier(username);

        if (error || !user) {
            return res.status(401).json({ message: 'Usuario o contraseña incorrectos.' });
        }

        const passwordMatches = await bcrypt.compare(rawPassword, user.contraseña);
        if (!passwordMatches) {
            return res.status(401).json({ message: 'Usuario o contraseña incorrectos.' });
        }

        // 1. Generamos JWTs reales
        const { accessToken, refreshToken } = generarTokens(user);

        // 2. Guardamos el Refresh Token en Supabase a 7 días
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        await dbRepo.saveRefreshToken(user.id, refreshToken, expiresAt.toISOString());

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
                contactoEmergencia: user.contactoEmergencia,
                foto: user.foto,
                fechaNacimiento: user.fechaNacimiento,
            },
        });
    } catch (err) {
        console.error('/auth/login error', err);
        return res.status(500).json({ message: 'Server error' });
    }
});

router.post('/auth/register', upload.single('foto'), async (req, res) => {
    try {
        const { nombre, apellido, email, username, fechaNacimiento, contraseña, password, nroTelefono, contactoEmergencia } = req.body;
        const rawPassword = contraseña ?? password ?? '';

        let fotoUrl = '-1';
        if (req.file) {
            fotoUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        }

        const hashed = await bcrypt.hash(rawPassword, 10);

        const { data: created, error: dbErr } = await dbRepo.createUser({
            nombre,
            apellido,
            email,
            username,
            fechaNacimiento,
            contraseña: hashed,
            nroTelefono: Number(nroTelefono) || null,
            contactoEmergencia: contactoEmergencia || -1,
            foto: fotoUrl,
        });

        if (dbErr) {
            if (dbErr.code === '23505') {
                return res.status(409).json({ message: 'El usuario o email ya está registrado.' });
            }
            return res.status(500).json({ message: 'Error al crear usuario.' });
        }

        // Generar JWT reales tras el registro
        const { accessToken, refreshToken } = generarTokens(created);

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        await dbRepo.saveRefreshToken(created.id, refreshToken, expiresAt.toISOString());

        return res.json({
            accessToken,
            refreshToken,
            user: created
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server error' });
    }
});

// Validación directa del Access Token JWT sin ir a la DB
router.get('/auth/perfil', async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1]; 

    if (!token) return res.status(401).json({ message: 'No autorizado' });

    try {
        // Desencripta y verifica la firma del JWT al instante
        const decoded = jwt.verify(token, SECRET_KEY);
        
        const { data: user } = await dbRepo.getUserByLoginIdentifier(decoded.username);
        return res.json({ user });
    } catch (err) {
        console.error('/auth/perfil [GET] error', err);
        return res.status(500).json({ message: 'Error al obtener perfil.' });
    }
});

router.put('/auth/perfil', verificarToken, upload.single('foto'), async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            nombre, firstName,
            apellido, lastName,
            email,
            nroTelefono,
            contactoEmergencia,
            username,
            fechaNacimiento, birthDate,
            contraseña,
            foto
        } = req.body;

        let fotoUrl = undefined;
        if (req.file) {
            fotoUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        } else if (foto) {
            fotoUrl = foto;
        }

        const updatePayload = {
            firstName: firstName || nombre,
            lastName: lastName || apellido,
            email,
            username,
            birthDate: birthDate || fechaNacimiento,
            nroTelefono: nroTelefono ? Number(nroTelefono) : null,
            contactoEmergencia: contactoEmergencia ?? null,
        };

        if (fotoUrl !== undefined) {
            updatePayload.foto = fotoUrl;
        }

        if (contraseña) {
            updatePayload.contraseña = await bcrypt.hash(contraseña, 10);
        }

        const { data: updatedUser, error } = await dbRepo.updateUser(userId, updatePayload);

        if (error) {
            console.error('Error al actualizar usuario:', error);
            if (error.code === '23505') {
                return res.status(409).json({ message: 'El usuario o email ya está en uso.' });
            }
            return res.status(500).json({ message: 'Error al actualizar usuario.' });
        }

        return res.json({ user: updatedUser });
    } catch (err) {
        console.error('/auth/perfil [PUT] error', err);
        return res.status(500).json({ message: 'Error al actualizar usuario.' });
    }
});

router.use('/uploads', express.static(uploadsDir));

// Endpoint corregido con multer (upload.single('foto'))
router.patch('/auth/perfil', verificarToken, upload.single('foto'), async (req, res) => {
    try {
        const userId = req.user.id; 
        const { firstName, lastName, username, email, birthDate, nroTelefono, contactoEmergencia } = req.body;

        // Construir URL de la foto si subió una
        let fotoUrl = req.body.foto;
        if (req.file) {
            fotoUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        }

        const { data: updatedUser, error } = await dbRepo.updateUser(userId, {
            firstName,
            lastName,
            username,
            email,
            birthDate,
            nroTelefono,
            contactoEmergencia,
            foto: fotoUrl
        });

        if (error) {
            console.error('Error al actualizar usuario:', error);
            if (error.code === '23505') {
                return res.status(409).json({ message: 'El usuario o email ya está en uso.' });
            }
            return res.status(500).json({ message: 'Error interno al actualizar perfil.' });
        }

        // Devolvemos el usuario mapeado con la nueva foto
        const formattedUser = {
            id: updatedUser.id || userId,
            firstName: updatedUser.firstName || updatedUser.nombre || firstName || '',
            lastName: updatedUser.lastName || updatedUser.apellido || lastName || '',
            username: updatedUser.username || username || '',
            email: updatedUser.email || email || '',
            birthDate: updatedUser.birthDate || updatedUser.fecha_nacimiento || birthDate || '',
            nroTelefono: updatedUser.nroTelefono || updatedUser.nro_telefono || nroTelefono || '',
            contactoEmergencia: updatedUser.contactoEmergencia || contactoEmergencia || '',
            foto: updatedUser.foto || fotoUrl || null
        };

        return res.json(formattedUser);

    } catch (err) {
        console.error('Error en PATCH /auth/perfil:', err);
        return res.status(500).json({ message: 'Error en el servidor' });
    }
});

router.post('/auth/logout', verificarToken, async (req, res) => {
    const token = req.headers['x-refresh-token'];
    if (token) {
        await dbRepo.deleteToken(token);
    }
    return res.status(200).json({ message: 'Sesión cerrada' });
});

router.patch('/auth/change-password', verificarToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const { data: user, error } = await dbRepo.getUserByLoginIdentifier(req.user.username);
        if (error) {
            return res.status(500).json({ message: 'Error al obtener usuario.' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.contraseña);
        if (!isMatch) {
            return res.status(400).json({ message: 'Contraseña actual incorrecta.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const { error: updateError } = await dbRepo.updatePassword(req.user.id, hashedPassword);
        if (updateError) {
            return res.status(500).json({ message: 'Error al actualizar contraseña.' });
        }
        
        return res.json({ message: 'Contraseña actualizada correctamente.' });
    } catch (err) {
        console.error('Error en PATCH /auth/change-password:', err);
        return res.status(500).json({ message: 'Error en el servidor' });
    }
});

module.exports = router;