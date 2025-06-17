const jwt = require('jsonwebtoken');
const Usuario = require('../models/usuario');

// Clave secreta local (NO PARA PRODUCCIÓN)
const JWT_SECRET = 'classcraft_local_secret_key_123';

// Middleware para verificar token JWT
const verificarToken = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'Token requerido' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const usuario = await Usuario.findById(decoded.id);

        if (!usuario || !usuario.activo) {
            return res.status(401).json({ error: 'Usuario no encontrado o inactivo' });
        }

        req.usuario = usuario;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Token inválido' });
    }
};

// Middleware para verificar rol específico
const verificarRol = (rolesPermitidos) => {
    return (req, res, next) => {
        if (!rolesPermitidos.includes(req.usuario.rol)) {
            return res.status(403).json({ error: 'Sin permisos para esta acción' });
        }
        next();
    };
};

// Middleware solo para profesores
const soloProfesor = verificarRol(['profesor', 'admin']);

// Middleware solo para admins
const soloAdmin = verificarRol(['admin']);

// Middleware para estudiantes y profesores
const soloEstudianteOProfesor = verificarRol(['estudiante', 'profesor', 'admin']);

// Generar token JWT
const generarToken = (usuarioId) => {
    return jwt.sign({ id: usuarioId }, JWT_SECRET, { expiresIn: '7d' });
};

module.exports = {
    verificarToken,
    verificarRol,
    soloProfesor,
    soloAdmin,
    soloEstudianteOProfesor,
    generarToken,
    JWT_SECRET
};
