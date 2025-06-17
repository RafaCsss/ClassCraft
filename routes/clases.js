const express = require('express');
const Clase = require('../models/clase');
const Usuario = require('../models/usuario');
const Personaje = require('../models/personaje');
const Equipo = require('../models/equipo');
const { verificarToken, soloProfesor, soloEstudianteOProfesor } = require('../middleware/auth');

const router = express.Router();

// POST /api/clases/crear - Crear nueva clase (solo profesores)
router.post('/crear', verificarToken, soloProfesor, async (req, res) => {
    try {
        const { nombre, descripcion } = req.body;

        if (!nombre) {
            return res.status(400).json({ error: 'Nombre de clase requerido' });
        }

        // Generar código único
        let codigoClase;
        let claseExiste;
        do {
            // Generar código de 6 caracteres (letras + números)
            codigoClase = Math.random().toString(36).substring(2, 8).toUpperCase();
            claseExiste = await Clase.findOne({ codigo_clase: codigoClase });
        } while (claseExiste);

        const nuevaClase = new Clase({
            nombre,
            codigo_clase: codigoClase,
            profesor_id: req.usuario._id,
            estudiantes: [],
            descripcion: descripcion || '',
            activa: true,
            configuracion: {
                max_estudiantes_por_equipo: 4,
                sistema_puntos: {
                    xp_participacion: 5,
                    xp_tarea_completada: 15,
                    xp_bonus_equipo: 10
                },
                habilidades_habilitadas: true,
                modo_competitivo: true
            }
        });

        await nuevaClase.save();

        res.status(201).json({
            mensaje: 'Clase creada exitosamente',
            clase: {
                id: nuevaClase._id,
                nombre: nuevaClase.nombre,
                codigo: nuevaClase.codigo_clase,
                descripcion: nuevaClase.descripcion,
                estudiantes_count: 0
            },
            codigo_para_estudiantes: codigoClase
        });

    } catch (error) {
        console.error('Error creando clase:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// POST /api/clases/unirse/:codigo - Unirse a clase con código (solo estudiantes)
router.post('/unirse/:codigo', verificarToken, async (req, res) => {
    try {
        if (req.usuario.rol !== 'estudiante') {
            return res.status(403).json({ error: 'Solo estudiantes pueden unirse a clases' });
        }

        const { codigo } = req.params;
        
        // Buscar la clase
        const clase = await Clase.findOne({ codigo_clase: codigo.toUpperCase(), activa: true });
        if (!clase) {
            return res.status(404).json({ error: 'Clase no encontrada o inactiva' });
        }

        // Verificar si ya está en la clase
        if (clase.estudiantes.includes(req.usuario._id)) {
            return res.status(400).json({ error: 'Ya estás registrado en esta clase' });
        }

        // Agregar estudiante a la clase
        clase.estudiantes.push(req.usuario._id);
        await clase.save();

        // Obtener datos del profesor
        const profesor = await Usuario.findById(clase.profesor_id).select('nombre email');

        res.json({
            mensaje: 'Te has unido a la clase exitosamente',
            clase: {
                id: clase._id,
                nombre: clase.nombre,
                codigo: clase.codigo_clase,
                descripcion: clase.descripcion,
                profesor: profesor.nombre,
                estudiantes_count: clase.estudiantes.length
            }
        });

    } catch (error) {
        console.error('Error uniéndose a clase:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// GET /api/clases/mis-clases - Ver clases del usuario (diferentes por rol)
router.get('/mis-clases', verificarToken, async (req, res) => {
    try {
        let clases;

        if (req.usuario.rol === 'profesor') {
            // Profesores ven las clases que crearon
            clases = await Clase.find({ profesor_id: req.usuario._id })
                .populate('estudiantes', 'nombre email nivel experiencia')
                .sort({ fecha_creacion: -1 });

            // Agregar stats de cada clase
            const clasesConStats = await Promise.all(clases.map(async (clase) => {
                const equipos = await Equipo.find({ 
                    miembros: { $in: clase.estudiantes } 
                }).countDocuments();

                return {
                    id: clase._id,
                    nombre: clase.nombre,
                    codigo: clase.codigo_clase,
                    descripcion: clase.descripcion,
                    estudiantes_count: clase.estudiantes.length,
                    equipos_count: equipos,
                    activa: clase.activa,
                    fecha_creacion: clase.fecha_creacion,
                    estudiantes: clase.estudiantes
                };
            }));

            res.json({
                rol: 'profesor',
                clases: clasesConStats
            });

        } else if (req.usuario.rol === 'estudiante') {
            // Estudiantes ven las clases donde están registrados
            clases = await Clase.find({ 
                estudiantes: req.usuario._id,
                activa: true 
            }).populate('profesor_id', 'nombre email');

            const clasesEstudiante = clases.map(clase => ({
                id: clase._id,
                nombre: clase.nombre,
                codigo: clase.codigo_clase,
                descripcion: clase.descripcion,
                profesor: clase.profesor_id.nombre,
                estudiantes_count: clase.estudiantes.length,
                configuracion: clase.configuracion
            }));

            res.json({
                rol: 'estudiante',
                clases: clasesEstudiante
            });

        } else {
            res.status(403).json({ error: 'Rol no válido para ver clases' });
        }

    } catch (error) {
        console.error('Error obteniendo clases:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// GET /api/clases/:id/estudiantes - Ver estudiantes de una clase (solo profesor dueño)
router.get('/:id/estudiantes', verificarToken, async (req, res) => {
    try {
        const clase = await Clase.findById(req.params.id)
            .populate('estudiantes', 'nombre email nivel experiencia ultima_conexion');

        if (!clase) {
            return res.status(404).json({ error: 'Clase no encontrada' });
        }

        // Solo el profesor dueño puede ver los estudiantes
        if (clase.profesor_id.toString() !== req.usuario._id.toString()) {
            return res.status(403).json({ error: 'Sin permisos para ver esta clase' });
        }

        // Obtener personajes de los estudiantes
        const estudiantesConPersonajes = await Promise.all(
            clase.estudiantes.map(async (estudiante) => {
                const personaje = await Personaje.findOne({ usuario_id: estudiante._id })
                    .populate('clase_personaje_id', 'nombre')
                    .populate('raza_id', 'nombre')
                    .populate('equipo_id', 'nombre');

                return {
                    _id: estudiante._id,
                    nombre: estudiante.nombre,
                    email: estudiante.email,
                    nivel: estudiante.nivel,
                    experiencia: estudiante.experiencia,
                    ultima_conexion: estudiante.ultima_conexion,
                    personaje: personaje ? {
                        clase: personaje.clase_personaje_id?.nombre,
                        raza: personaje.raza_id?.nombre,
                        salud: {
                            actual: personaje.salud_actual,
                            maxima: personaje.salud_maxima
                        },
                        energia: {
                            actual: personaje.energia_actual,
                            maxima: personaje.energia_maxima
                        },
                        equipo: personaje.equipo_id?.nombre || 'Sin equipo',
                        equipo_id: personaje.equipo_id?._id
                    } : null
                };
            })
        );

        res.json({
            clase: {
                id: clase._id,
                nombre: clase.nombre,
                codigo: clase.codigo_clase,
                descripcion: clase.descripcion
            },
            estudiantes: estudiantesConPersonajes,
            configuracion: clase.configuracion
        });

    } catch (error) {
        console.error('Error obteniendo estudiantes:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// PUT /api/clases/:id/estudiante/:estudianteId/xp - Dar/quitar XP a estudiante (solo profesor)
router.put('/:id/estudiante/:estudianteId/xp', verificarToken, soloProfesor, async (req, res) => {
    try {
        const { cantidad, razon } = req.body;

        if (!cantidad || !razon) {
            return res.status(400).json({ error: 'Cantidad y razón son requeridos' });
        }

        // Verificar que la clase pertenece al profesor
        const clase = await Clase.findById(req.params.id);
        if (!clase || clase.profesor_id.toString() !== req.usuario._id.toString()) {
            return res.status(403).json({ error: 'Sin permisos para esta clase' });
        }

        // Verificar que el estudiante está en la clase
        if (!clase.estudiantes.includes(req.params.estudianteId)) {
            return res.status(400).json({ error: 'Estudiante no está en esta clase' });
        }

        // Actualizar XP del estudiante
        const estudiante = await Usuario.findById(req.params.estudianteId);
        if (!estudiante) {
            return res.status(404).json({ error: 'Estudiante no encontrado' });
        }

        const xpAnterior = estudiante.experiencia;
        estudiante.experiencia = Math.max(0, estudiante.experiencia + cantidad);

        // Calcular nuevo nivel (cada 100 XP = 1 nivel)
        const nivelAnterior = estudiante.nivel;
        estudiante.nivel = Math.floor(estudiante.experiencia / 100) + 1;

        await estudiante.save();

        // TODO: Registrar en historial_acciones
        // TODO: Crear notificación para el estudiante

        res.json({
            mensaje: 'XP actualizado exitosamente',
            estudiante: {
                nombre: estudiante.nombre,
                xp_anterior: xpAnterior,
                xp_actual: estudiante.experiencia,
                xp_cambio: cantidad,
                nivel_anterior: nivelAnterior,
                nivel_actual: estudiante.nivel,
                subio_nivel: estudiante.nivel > nivelAnterior
            },
            razon
        });

    } catch (error) {
        console.error('Error actualizando XP:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// PUT /api/clases/:id/estudiante/:estudianteId/stats - Modificar salud/energía (solo profesor)
router.put('/:id/estudiante/:estudianteId/stats', verificarToken, soloProfesor, async (req, res) => {
    try {
        const { salud, energia, razon } = req.body;
        console.log('=== DEBUG STATS ENDPOINT ===');
        console.log('Body recibido:', { salud, energia, razon });
        console.log('Params:', { claseId: req.params.id, estudianteId: req.params.estudianteId });
        console.log('Usuario profesor:', req.usuario._id);

        // Validación mejorada
        if ((salud === undefined && energia === undefined) || !razon) {
            console.log('❌ Validación fallada: faltan parámetros');
            return res.status(400).json({ error: 'Debe especificar salud o energía y razón' });
        }

        // Validar ObjectIds
        const mongoose = require('mongoose');
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            console.log('❌ ObjectId de clase inválido:', req.params.id);
            return res.status(400).json({ error: 'ID de clase inválido' });
        }
        if (!mongoose.Types.ObjectId.isValid(req.params.estudianteId)) {
            console.log('❌ ObjectId de estudiante inválido:', req.params.estudianteId);
            return res.status(400).json({ error: 'ID de estudiante inválido' });
        }

        // Verificar permisos de clase
        console.log('🔍 Buscando clase...');
        const clase = await Clase.findById(req.params.id);
        if (!clase) {
            console.log('❌ Clase no encontrada:', req.params.id);
            return res.status(404).json({ error: 'Clase no encontrada' });
        }
        
        console.log('✅ Clase encontrada:', clase.nombre);
        console.log('Profesor de la clase:', clase.profesor_id);
        console.log('Profesor actual:', req.usuario._id);
        
        if (clase.profesor_id.toString() !== req.usuario._id.toString()) {
            console.log('❌ Sin permisos para esta clase');
            return res.status(403).json({ error: 'Sin permisos para esta clase' });
        }

        // Verificar que el estudiante está en la clase
        console.log('🔍 Verificando si estudiante está en clase...');
        console.log('Estudiantes en clase:', clase.estudiantes.map(id => id.toString()));
        console.log('Estudiante buscado:', req.params.estudianteId);
        
        const estudianteEnClase = clase.estudiantes.some(id => id.toString() === req.params.estudianteId);
        if (!estudianteEnClase) {
            console.log('❌ Estudiante no está en esta clase');
            return res.status(400).json({ error: 'Estudiante no está en esta clase' });
        }
        console.log('✅ Estudiante está en la clase');

        // Obtener personaje del estudiante
        console.log('🔍 Buscando personaje del estudiante...');
        const personaje = await Personaje.findOne({ usuario_id: req.params.estudianteId });
        if (!personaje) {
            console.log('❌ Estudiante no tiene personaje');
            return res.status(404).json({ error: 'Estudiante no tiene personaje' });
        }
        console.log('✅ Personaje encontrado:', {
            salud: `${personaje.salud_actual}/${personaje.salud_maxima}`,
            energia: `${personaje.energia_actual}/${personaje.energia_maxima}`
        });

        const statsAnteriores = {
            salud: personaje.salud_actual,
            energia: personaje.energia_actual
        };

        // Actualizar stats
        if (salud !== undefined) {
            const nuevaSalud = Math.max(0, Math.min(
                personaje.salud_maxima, 
                personaje.salud_actual + salud
            ));
            console.log(`Salud: ${personaje.salud_actual} + ${salud} = ${nuevaSalud}`);
            personaje.salud_actual = nuevaSalud;
        }

        if (energia !== undefined) {
            const nuevaEnergia = Math.max(0, Math.min(
                personaje.energia_maxima,
                personaje.energia_actual + energia
            ));
            console.log(`Energía: ${personaje.energia_actual} + ${energia} = ${nuevaEnergia}`);
            personaje.energia_actual = nuevaEnergia;
        }

        console.log('💾 Guardando personaje...');
        await personaje.save();
        console.log('✅ Stats actualizados exitosamente');

        res.json({
            mensaje: 'Stats actualizados exitosamente',
            personaje: {
                stats_anteriores: statsAnteriores,
                stats_actuales: {
                    salud: personaje.salud_actual,
                    energia: personaje.energia_actual
                },
                cambios: {
                    salud: salud || 0,
                    energia: energia || 0
                }
            },
            razon
        });

    } catch (error) {
        console.error('❌ ERROR COMPLETO en stats endpoint:', error);
        console.error('Stack trace:', error.stack);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            debug: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// PUT /api/clases/:id/configuracion - Actualizar configuración de clase (solo profesor)
router.put('/:id/configuracion', verificarToken, soloProfesor, async (req, res) => {
    try {
        const { habilidades_habilitadas, modo_competitivo, sistema_puntos } = req.body;

        const clase = await Clase.findById(req.params.id);
        if (!clase || clase.profesor_id.toString() !== req.usuario._id.toString()) {
            return res.status(403).json({ error: 'Sin permisos para esta clase' });
        }

        // Actualizar configuración
        if (habilidades_habilitadas !== undefined) {
            clase.configuracion.habilidades_habilitadas = habilidades_habilitadas;
        }
        if (modo_competitivo !== undefined) {
            clase.configuracion.modo_competitivo = modo_competitivo;
        }
        if (sistema_puntos) {
            if (sistema_puntos.xp_participacion !== undefined) {
                clase.configuracion.sistema_puntos.xp_participacion = sistema_puntos.xp_participacion;
            }
            if (sistema_puntos.xp_tarea_completada !== undefined) {
                clase.configuracion.sistema_puntos.xp_tarea_completada = sistema_puntos.xp_tarea_completada;
            }
            if (sistema_puntos.xp_bonus_equipo !== undefined) {
                clase.configuracion.sistema_puntos.xp_bonus_equipo = sistema_puntos.xp_bonus_equipo;
            }
        }

        await clase.save();

        res.json({
            mensaje: 'Configuración actualizada',
            configuracion: clase.configuracion
        });

    } catch (error) {
        console.error('Error actualizando configuración:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;
