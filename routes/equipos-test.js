/**
 * ENDPOINTS DE TESTING PARA SISTEMA V2 DE EQUIPOS POR CLASE
 */

const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middleware/auth');
const Personaje = require('../models/personaje');
const Equipo = require('../models/equipo');

// ============ ESTADO DE MIGRACIÓN DE USUARIO ============
router.get('/status', verificarToken, async (req, res) => {
    try {
        const personaje = await Personaje.findOne({ usuario_id: req.usuario._id })
            .populate('equipo_id', 'nombre clase_id')
            .populate('equipos_por_clase.equipo_id', 'nombre')
            .populate('equipos_por_clase.clase_id', 'nombre codigo_clase');
            
        if (!personaje) {
            return res.status(404).json({ error: 'Personaje no encontrado' });
        }

        const estado = {
            usuario_id: req.usuario._id,
            personaje_id: personaje._id,
            sistema_legacy: {
                tiene_equipo_id: !!personaje.equipo_id,
                equipo_legacy: personaje.equipo_id ? {
                    id: personaje.equipo_id._id,
                    nombre: personaje.equipo_id.nombre,
                    clase_id: personaje.equipo_id.clase_id
                } : null
            },
            sistema_nuevo: {
                cantidad_equipos: personaje.equipos_por_clase.length,
                equipos: personaje.equipos_por_clase.map(ep => ({
                    equipo_id: ep.equipo_id._id,
                    equipo_nombre: ep.equipo_id.nombre,
                    clase_id: ep.clase_id._id,
                    clase_nombre: ep.clase_id.nombre,
                    fecha_union: ep.fecha_union
                }))
            },
            necesita_migracion: personaje.necesitaMigracion(),
            todos_los_equipos: personaje.obtenerTodosLosEquipos(),
            timestamp: new Date()
        };

        res.json({ estado });
        
    } catch (error) {
        console.error('Error en test/status:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;