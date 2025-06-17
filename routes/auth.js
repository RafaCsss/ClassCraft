const express = require('express');
const bcrypt = require('bcrypt');
const Usuario = require('../models/usuario');
const Personaje = require('../models/personaje');
const { generarToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register - Registro de usuario
router.post('/register', async (req, res) => {
    try {
        const { nombre, email, password, rol = 'estudiante' } = req.body;

        // Validaciones básicas
        if (!nombre || !email || !password) {
            return res.status(400).json({ error: 'Nombre, email y password son requeridos' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password debe tener al menos 6 caracteres' });
        }

        // Verificar si el email ya existe
        const usuarioExistente = await Usuario.findOne({ email });
        if (usuarioExistente) {
            return res.status(400).json({ error: 'Email ya registrado' });
        }

        // Crear nuevo usuario
        const nuevoUsuario = new Usuario({
            nombre,
            email,
            password, // Se hasheará automáticamente por el middleware del modelo
            rol: rol === 'admin' ? 'estudiante' : rol, // Prevenir auto-asignación de admin
            nivel: rol === 'estudiante' ? 1 : undefined,
            experiencia: rol === 'estudiante' ? 0 : undefined,
            activo: true,
            fecha_registro: new Date(),
            ultima_conexion: new Date()
        });

        await nuevoUsuario.save();

        // Generar token
        const token = generarToken(nuevoUsuario._id);

        res.status(201).json({
            mensaje: 'Usuario registrado exitosamente',
            token,
            usuario: {
                id: nuevoUsuario._id,
                nombre: nuevoUsuario.nombre,
                email: nuevoUsuario.email,
                rol: nuevoUsuario.rol
            }
        });

    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// POST /api/auth/login - Login de usuario
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validaciones básicas
        if (!email || !password) {
            return res.status(400).json({ error: 'Email y password son requeridos' });
        }

        // Buscar usuario
        const usuario = await Usuario.findOne({ email, activo: true });
        if (!usuario) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Verificar password
        const passwordValido = await bcrypt.compare(password, usuario.password);
        if (!passwordValido) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Actualizar última conexión
        usuario.ultima_conexion = new Date();
        await usuario.save();

        // Buscar personaje si es estudiante
        let personaje = null;
        if (usuario.rol === 'estudiante') {
            personaje = await Personaje.findOne({ usuario_id: usuario._id })
                .populate('clase_personaje_id')
                .populate('raza_id')
                .populate('equipo_id');
        }

        // Generar token
        const token = generarToken(usuario._id);

        res.json({
            mensaje: 'Login exitoso',
            token,
            usuario: {
                id: usuario._id,
                nombre: usuario.nombre,
                email: usuario.email,
                rol: usuario.rol,
                nivel: usuario.nivel,
                experiencia: usuario.experiencia
            },
            personaje
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// GET /api/auth/profile - Obtener perfil del usuario logueado
router.get('/profile', require('../middleware/auth').verificarToken, async (req, res) => {
    try {
        const usuario = req.usuario;

        // Buscar personaje si es estudiante
        let personaje = null;
        if (usuario.rol === 'estudiante') {
            personaje = await Personaje.findOne({ usuario_id: usuario._id })
                .populate('clase_personaje_id')
                .populate('raza_id')
                .populate('equipo_id');
        }

        res.json({
            usuario: {
                id: usuario._id,
                nombre: usuario.nombre,
                email: usuario.email,
                rol: usuario.rol,
                nivel: usuario.nivel,
                experiencia: usuario.experiencia,
                fecha_registro: usuario.fecha_registro,
                ultima_conexion: usuario.ultima_conexion
            },
            personaje
        });

    } catch (error) {
        console.error('Error obteniendo perfil:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;
