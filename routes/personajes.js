const express = require('express');
const Personaje = require('../models/personaje');
const ClasePersonaje = require('../models/clasePersonaje');
const Raza = require('../models/raza');
const Habilidad = require('../models/habilidad');
const Inventario = require('../models/inventario');
const CooldownHabilidad = require('../models/cooldownHabilidad');
const EfectoActivo = require('../models/efectoActivo');
const { verificarToken, soloEstudianteOProfesor } = require('../middleware/auth');

const router = express.Router();

// GET /api/personajes/mi-personaje - Obtener personaje del usuario logueado
router.get('/mi-personaje', verificarToken, async (req, res) => {
    try {
        const personaje = await Personaje.findOne({ usuario_id: req.usuario._id })
            .populate('clase_personaje_id')
            .populate('raza_id')
            .populate('equipo_id');

        if (!personaje) {
            return res.status(404).json({ 
                error: 'No tienes personaje creado',
                puede_crear: req.usuario.rol === 'estudiante'
            });
        }

        // SINCRONIZACIÓN: Usar nivel/XP del Usuario (fuente autoritativa)
        const usuario = await require('../models/usuario').findById(req.usuario._id);
        console.log('🔍 DEBUG - Usuario encontrado:', usuario ? 'SÍ' : 'NO');
        if (usuario) {
            console.log('🔍 DEBUG - Usuario nivel:', usuario.nivel, 'XP:', usuario.experiencia);
        }
        
        // Convertir a objeto plano y sobrescribir nivel/XP
        const personajeObj = personaje.toObject();
        console.log('🔍 DEBUG - Personaje original nivel:', personajeObj.nivel, 'XP:', personajeObj.experiencia);
        
        if (usuario) {
            personajeObj.nivel = usuario.nivel;
            personajeObj.experiencia = usuario.experiencia;
            console.log('🔍 DEBUG - Personaje actualizado nivel:', personajeObj.nivel, 'XP:', personajeObj.experiencia);
        }

        // Obtener inventario
        const inventario = await Inventario.findOne({ personaje_id: personaje._id });

        // Obtener habilidades disponibles
        const habilidadesGenerales = await Habilidad.find({ es_general: true });
        const habilidadesClase = await Habilidad.find({ 
            clases_permitidas: personaje.clase_personaje_id.nombre 
        });

        // Obtener cooldowns activos
        const cooldowns = await CooldownHabilidad.find({ 
            personaje_id: personaje._id, 
            activo: true 
        });

        // Obtener efectos activos
        const efectos = await EfectoActivo.find({ 
            personaje_id: personaje._id, 
            activo: true 
        });

        res.json({
            personaje: personajeObj,
            inventario,
            habilidades_disponibles: [...habilidadesGenerales, ...habilidadesClase],
            cooldowns,
            efectos_activos: efectos
        });

    } catch (error) {
        console.error('Error obteniendo personaje:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// POST /api/personajes/crear - Crear personaje (solo estudiantes, solo 1 por usuario)
router.post('/crear', verificarToken, async (req, res) => {
    try {
        // Solo estudiantes pueden crear personajes
        if (req.usuario.rol !== 'estudiante') {
            return res.status(403).json({ error: 'Solo estudiantes pueden crear personajes' });
        }

        const { clase_personaje_id, raza_id } = req.body;

        // Verificar que no tenga personaje ya (1:1 estricto)
        const personajeExiste = await Personaje.findOne({ usuario_id: req.usuario._id });
        if (personajeExiste) {
            return res.status(400).json({ error: 'Ya tienes un personaje creado' });
        }

        // Validar que existan la clase y raza
        const clasePersonaje = await ClasePersonaje.findById(clase_personaje_id);
        const raza = await Raza.findById(raza_id);

        if (!clasePersonaje || !raza) {
            return res.status(400).json({ error: 'Clase de personaje o raza inválida' });
        }

        // Calcular stats iniciales basados en clase + raza
        const saludMaxima = clasePersonaje.stats_base.salud_inicial + 
                           clasePersonaje.bonificaciones.salud + 
                           raza.bono_salud;
        
        const energiaMaxima = clasePersonaje.stats_base.energia_inicial + 
                             clasePersonaje.bonificaciones.energia + 
                             raza.bono_energia;

        // Crear personaje
        const personaje = new Personaje({
            usuario_id: req.usuario._id,
            clase_personaje_id,
            raza_id,
            salud_actual: saludMaxima,
            salud_maxima: saludMaxima,
            energia_actual: energiaMaxima,
            energia_maxima: energiaMaxima,
            nivel: 1,
            experiencia: 0,
            avatar: {
                imagen_base: `${clasePersonaje.nombre}_${raza.nombre}.png`,
                posicion_x: 0,
                posicion_y: 0,
                escala: 1.0
            },
            habilidades: [], // Se llenarán automáticamente
            puede_cambiar_clase: false
        });

        await personaje.save();

        // Crear inventario automáticamente
        const inventario = new Inventario({
            personaje_id: personaje._id,
            capacidad_max: 20,
            monedas: 100,
            items: []
        });
        await inventario.save();

        // Asignar habilidades generales automáticamente
        const habilidadesGenerales = await Habilidad.find({ es_general: true });
        for (const hab of habilidadesGenerales) {
            personaje.habilidades.push({
                habilidad_id: hab._id,
                nivel: 1,
                desbloqueada: personaje.nivel >= hab.nivel_desbloqueo,
                equipada: false,
                veces_usada: 0,
                fecha_ultimo_uso: null
            });
        }

        // Asignar habilidades de clase
        const habilidadesClase = await Habilidad.find({ 
            clases_permitidas: clasePersonaje.nombre 
        });
        for (const hab of habilidadesClase) {
            personaje.habilidades.push({
                habilidad_id: hab._id,
                nivel: 1,
                desbloqueada: personaje.nivel >= hab.nivel_desbloqueo,
                equipada: false,
                veces_usada: 0,
                fecha_ultimo_uso: null
            });
        }

        await personaje.save();

        // Devolver personaje completo
        const personajeCompleto = await Personaje.findById(personaje._id)
            .populate('clase_personaje_id')
            .populate('raza_id');

        res.status(201).json({
            mensaje: 'Personaje creado exitosamente',
            personaje: personajeCompleto,
            inventario
        });

    } catch (error) {
        console.error('Error creando personaje:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// PUT /api/personajes/avatar - Actualizar avatar (solo el dueño)
router.put('/avatar', verificarToken, async (req, res) => {
    try {
        const { imagen_base, posicion_x, posicion_y, escala } = req.body;

        const personaje = await Personaje.findOne({ usuario_id: req.usuario._id });
        if (!personaje) {
            return res.status(404).json({ error: 'No tienes personaje creado' });
        }

        // Actualizar avatar
        if (imagen_base) personaje.avatar.imagen_base = imagen_base;
        if (posicion_x !== undefined) personaje.avatar.posicion_x = posicion_x;
        if (posicion_y !== undefined) personaje.avatar.posicion_y = posicion_y;
        if (escala !== undefined) personaje.avatar.escala = escala;

        await personaje.save();

        res.json({
            mensaje: 'Avatar actualizado',
            avatar: personaje.avatar
        });

    } catch (error) {
        console.error('Error actualizando avatar:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// POST /api/personajes/usar-habilidad - Usar habilidad (validar energía + cooldown)
router.post('/usar-habilidad', verificarToken, async (req, res) => {
    try {
        const { habilidad_id, objetivo_id } = req.body;

        const personaje = await Personaje.findOne({ usuario_id: req.usuario._id })
            .populate('clase_personaje_id');

        if (!personaje) {
            return res.status(404).json({ error: 'No tienes personaje creado' });
        }

        // Verificar que la habilidad esté disponible para el personaje
        const habilidadPersonaje = personaje.habilidades.find(h => 
            h.habilidad_id.toString() === habilidad_id && h.desbloqueada
        );

        if (!habilidadPersonaje) {
            return res.status(400).json({ error: 'Habilidad no disponible' });
        }

        // Obtener datos de la habilidad
        const habilidad = await Habilidad.findById(habilidad_id);
        if (!habilidad) {
            return res.status(404).json({ error: 'Habilidad no encontrada' });
        }

        // Verificar cooldown
        const cooldownActivo = await CooldownHabilidad.findOne({
            personaje_id: personaje._id,
            habilidad_id,
            activo: true,
            fecha_disponible: { $gt: new Date() }
        });

        if (cooldownActivo) {
            const tiempoRestante = Math.ceil((cooldownActivo.fecha_disponible - new Date()) / 1000);
            return res.status(400).json({ 
                error: 'Habilidad en cooldown',
                tiempo_restante_segundos: tiempoRestante
            });
        }

        // Verificar energía
        if (personaje.energia_actual < habilidad.costo_energia) {
            return res.status(400).json({ 
                error: 'Energía insuficiente',
                energia_actual: personaje.energia_actual,
                energia_requerida: habilidad.costo_energia
            });
        }

        // Consumir energía
        personaje.energia_actual -= habilidad.costo_energia;

        // Aplicar efectos de la habilidad
        let efectosAplicados = [];
        for (const efecto of habilidad.efectos) {
            if (efecto.objetivo === 'self') {
                // Aplicar efecto al mismo personaje
                if (efecto.tipo === 'curacion') {
                    const curacionReal = Math.min(
                        efecto.valor_puntos, 
                        personaje.salud_maxima - personaje.salud_actual
                    );
                    personaje.salud_actual += curacionReal;
                    efectosAplicados.push({
                        tipo: 'curacion',
                        valor: curacionReal,
                        objetivo: 'self'
                    });
                }
                // Agregar más tipos de efectos aquí (defensa, utilidad, etc)
            }
            // TODO: Implementar efectos para equipo y enemigos
        }

        // Actualizar estadísticas de uso
        habilidadPersonaje.veces_usada += 1;
        habilidadPersonaje.fecha_ultimo_uso = new Date();

        // Crear cooldown
        if (habilidad.cooldown_segundos > 0) {
            const cooldown = new CooldownHabilidad({
                personaje_id: personaje._id,
                habilidad_id,
                fecha_ultimo_uso: new Date(),
                fecha_disponible: new Date(Date.now() + habilidad.cooldown_segundos * 1000),
                activo: true
            });
            await cooldown.save();
        }

        await personaje.save();

        res.json({
            mensaje: 'Habilidad usada exitosamente',
            habilidad_nombre: habilidad.nombre,
            efectos_aplicados: efectosAplicados,
            stats_actuales: {
                salud: personaje.salud_actual,
                energia: personaje.energia_actual
            },
            cooldown_segundos: habilidad.cooldown_segundos
        });

    } catch (error) {
        console.error('Error usando habilidad:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// GET /api/personajes/stats - Obtener solo las stats básicas (rápido)
router.get('/stats', verificarToken, async (req, res) => {
    try {
        // Obtener datos actualizados del usuario (que tiene nivel/XP sincronizados)
        const usuario = await require('../models/usuario').findById(req.usuario._id);
        
        const personaje = await Personaje.findOne({ 
            usuario_id: req.usuario._id 
        }).select('salud_actual salud_maxima energia_actual energia_maxima nivel experiencia');

        if (!personaje) {
            return res.status(404).json({ error: 'No tienes personaje creado' });
        }

        // Usar nivel y XP del usuario (que se actualiza desde clases)
        const nivelActual = usuario ? usuario.nivel : personaje.nivel;
        const xpActual = usuario ? usuario.experiencia : personaje.experiencia;

        res.json({
            salud: {
                actual: personaje.salud_actual,
                maxima: personaje.salud_maxima
            },
            energia: {
                actual: personaje.energia_actual,
                maxima: personaje.energia_maxima
            },
            nivel: nivelActual,
            experiencia: xpActual
        });

    } catch (error) {
        console.error('Error obteniendo stats:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;
