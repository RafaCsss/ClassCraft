const express = require('express');

// Import todos los modelos para poder borrar
const Usuario = require('../models/usuario');
const Personaje = require('../models/personaje');
const ClasePersonaje = require('../models/clasePersonaje');
const Raza = require('../models/raza');
const Habilidad = require('../models/habilidad');
const Inventario = require('../models/inventario');
const Item = require('../models/item');
const Equipo = require('../models/equipo');
const Clase = require('../models/clase');
const Mision = require('../models/mision');
const ProgresoMision = require('../models/progresoMision');
const Titulo = require('../models/titulo');
const Notificacion = require('../models/notificacion');
const ClaseActiva = require('../models/claseActiva');
const EfectoActivo = require('../models/efectoActivo');
const HistorialAccion = require('../models/historialAccion');
const CooldownHabilidad = require('../models/cooldownHabilidad');
const AnimacionActiva = require('../models/animacionActiva');

const router = express.Router();

// GET /api/dev/clear-all - BORRAR TODOS LOS DATOS (versión GET para navegador)
router.get('/clear-all', async (req, res) => {
    try {
        console.log('🚨 INICIANDO BORRADO TOTAL DE LA BASE DE DATOS...');
        
        // Borrar todas las colecciones en orden para evitar errores de referencia
        await AnimacionActiva.deleteMany({});
        await CooldownHabilidad.deleteMany({});
        await HistorialAccion.deleteMany({});
        await EfectoActivo.deleteMany({});
        await ClaseActiva.deleteMany({});
        await Notificacion.deleteMany({});
        await Titulo.deleteMany({});
        await ProgresoMision.deleteMany({});
        await Mision.deleteMany({});
        await Clase.deleteMany({});
        await Equipo.deleteMany({});
        await Item.deleteMany({});
        await Inventario.deleteMany({});
        await Habilidad.deleteMany({});
        await Raza.deleteMany({});
        await ClasePersonaje.deleteMany({});
        await Personaje.deleteMany({});
        await Usuario.deleteMany({});
        
        console.log('🗑️ TODOS LOS DATOS HAN SIDO BORRADOS');
        
        res.json({
            message: '🗑️ TODOS LOS DATOS HAN SIDO BORRADOS',
            warning: 'La base de datos está completamente vacía',
            recommendation: 'Ve a /api/setup para recrear los datos básicos',
            collections_cleared: [
                'usuarios', 'personajes', 'clases_personaje', 'razas', 'habilidades',
                'inventarios', 'items', 'equipos', 'clases', 'misiones',
                'progreso_misiones', 'titulos', 'notificaciones', 'clases_activas',
                'efectos_activos', 'historial_acciones', 'cooldowns_habilidades', 'animaciones_activas'
            ],
            next_step: 'Ir a http://localhost:3000/api/setup'
        });
        
    } catch (error) {
        console.error('❌ Error borrando datos:', error);
        res.status(500).json({
            error: 'Error borrando datos',
            details: error.message
        });
    }
});

// POST /api/dev/clear-all - BORRAR TODOS LOS DATOS (PELIGROSO)
router.post('/clear-all', async (req, res) => {
    try {
        console.log('🚨 INICIANDO BORRADO TOTAL DE LA BASE DE DATOS...');
        
        // Borrar todas las colecciones en orden para evitar errores de referencia
        await AnimacionActiva.deleteMany({});
        await CooldownHabilidad.deleteMany({});
        await HistorialAccion.deleteMany({});
        await EfectoActivo.deleteMany({});
        await ClaseActiva.deleteMany({});
        await Notificacion.deleteMany({});
        await Titulo.deleteMany({});
        await ProgresoMision.deleteMany({});
        await Mision.deleteMany({});
        await Clase.deleteMany({});
        await Equipo.deleteMany({});
        await Item.deleteMany({});
        await Inventario.deleteMany({});
        await Habilidad.deleteMany({});
        await Raza.deleteMany({});
        await ClasePersonaje.deleteMany({});
        await Personaje.deleteMany({});
        await Usuario.deleteMany({});
        
        console.log('🗑️ TODOS LOS DATOS HAN SIDO BORRADOS');
        
        res.json({
            message: '🗑️ TODOS LOS DATOS HAN SIDO BORRADOS',
            warning: 'La base de datos está completamente vacía',
            recommendation: 'Ejecuta /api/setup para recrear los datos básicos',
            collections_cleared: [
                'usuarios', 'personajes', 'clases_personaje', 'razas', 'habilidades',
                'inventarios', 'items', 'equipos', 'clases', 'misiones',
                'progreso_misiones', 'titulos', 'notificaciones', 'clases_activas',
                'efectos_activos', 'historial_acciones', 'cooldowns_habilidades', 'animaciones_activas'
            ]
        });
        
    } catch (error) {
        console.error('❌ Error borrando datos:', error);
        res.status(500).json({
            error: 'Error borrando datos',
            details: error.message
        });
    }
});

// GET /api/dev/stats - Stats detalladas para debug
router.get('/stats', async (req, res) => {
    try {
        const detailedStats = {
            usuarios: await Usuario.countDocuments(),
            personajes: await Personaje.countDocuments(),
            clases_personaje: await ClasePersonaje.countDocuments(),
            razas: await Raza.countDocuments(),
            habilidades: await Habilidad.countDocuments(),
            habilidades_generales: await Habilidad.countDocuments({ es_general: true }),
            habilidades_especificas: await Habilidad.countDocuments({ es_general: false }),
            inventarios: await Inventario.countDocuments(),
            items: await Item.countDocuments(),
            equipos: await Equipo.countDocuments(),
            clases: await Clase.countDocuments(),
            clases_activas: await Clase.countDocuments({ activa: true }),
            misiones: await Mision.countDocuments(),
            progreso_misiones: await ProgresoMision.countDocuments(),
            titulos: await Titulo.countDocuments(),
            notificaciones: await Notificacion.countDocuments(),
            clases_activas_sesion: await ClaseActiva.countDocuments(),
            efectos_activos: await EfectoActivo.countDocuments(),
            cooldowns_activos: await CooldownHabilidad.countDocuments({ activo: true }),
            historial_acciones: await HistorialAccion.countDocuments()
        };

        // Stats adicionales
        const estudiantesConPersonaje = await Personaje.countDocuments();
        const totalEstudiantes = await Usuario.countDocuments({ rol: 'estudiante' });
        const profesores = await Usuario.countDocuments({ rol: 'profesor' });

        res.json({
            message: '📊 Stats detalladas de ClassCraft',
            collections: detailedStats,
            analysis: {
                total_users: detailedStats.usuarios,
                estudiantes_total: totalEstudiantes,
                estudiantes_con_personaje: estudiantesConPersonaje,
                estudiantes_sin_personaje: totalEstudiantes - estudiantesConPersonaje,
                profesores: profesores,
                personajes_percentage: totalEstudiantes > 0 ? Math.round((estudiantesConPersonaje / totalEstudiantes) * 100) : 0
            },
            health_check: {
                database_populated: detailedStats.usuarios > 0,
                seeds_loaded: detailedStats.clases_personaje >= 3 && detailedStats.razas >= 3,
                habilidades_loaded: detailedStats.habilidades >= 6,
                test_users_exist: detailedStats.usuarios >= 5
            }
        });
        
    } catch (error) {
        console.error('Error obteniendo stats:', error);
        res.status(500).json({
            error: 'Error obteniendo estadísticas',
            details: error.message
        });
    }
});

// POST /api/dev/create-test-data - Crear datos específicos para testing
router.post('/create-test-data', async (req, res) => {
    try {
        const { type } = req.body;
        
        let created = [];
        
        if (type === 'users' || !type) {
            // Crear usuarios de prueba adicionales
            const testUsers = [
                { nombre: 'Dev Student 1', email: 'dev1@test.com', password: '123456', rol: 'estudiante' },
                { nombre: 'Dev Student 2', email: 'dev2@test.com', password: '123456', rol: 'estudiante' },
                { nombre: 'Dev Professor', email: 'devprof@test.com', password: '123456', rol: 'profesor' }
            ];
            
            for (const userData of testUsers) {
                try {
                    const user = new Usuario(userData);
                    await user.save();
                    created.push(`Usuario: ${user.email}`);
                } catch (error) {
                    // Ignorar si ya existe
                }
            }
        }
        
        res.json({
            message: 'Datos de testing creados',
            created: created,
            note: 'Los usuarios duplicados fueron ignorados'
        });
        
    } catch (error) {
        console.error('Error creando test data:', error);
        res.status(500).json({
            error: 'Error creando datos de testing',
            details: error.message
        });
    }
});

module.exports = router;
