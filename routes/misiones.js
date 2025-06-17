const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middleware/auth');
const Mision = require('../models/mision');
const ProgresoMision = require('../models/progresoMision');
const Usuario = require('../models/usuario');
const Clase = require('../models/clase');
const Personaje = require('../models/personaje');
const Inventario = require('../models/inventario');
const HistorialAccion = require('../models/historialAccion');

// ============ CREAR MISIÓN (Solo profesores) ============
router.post('/crear', verificarToken, async (req, res) => {
    try {
        const { 
            nombre, 
            descripcion, 
            xp_recompensa, 
            clase_id, 
            tipo, 
            fecha_limite, 
            recompensas = [], 
            dificultad,
            requisitos = {}
        } = req.body;

        // Verificar que sea profesor
        if (req.usuario.rol !== 'profesor') {
            return res.status(403).json({ error: 'Solo profesores pueden crear misiones' });
        }

        // Verificar que la clase existe y es del profesor
        const clase = await Clase.findById(clase_id);
        if (!clase) {
            return res.status(404).json({ error: 'Clase no encontrada' });
        }
        
        if (clase.profesor_id.toString() !== req.usuario._id.toString()) {
            return res.status(403).json({ error: 'No puedes crear misiones en clases que no son tuyas' });
        }

        // Validar fecha límite
        if (new Date(fecha_limite) <= new Date()) {
            return res.status(400).json({ error: 'La fecha límite debe ser futura' });
        }

        const mision = new Mision({
            nombre,
            descripcion,
            xp_recompensa,
            clase_id,
            profesor_id: req.usuario._id,
            tipo,
            fecha_limite,
            recompensas,
            dificultad,
            requisitos: {
                nivel_minimo: requisitos.nivel_minimo || 1,
                habilidades_requeridas: requisitos.habilidades_requeridas || []
            }
        });

        await mision.save();

        // Crear progreso inicial para todos los estudiantes de la clase
        const estudiantes = clase.estudiantes;
        const progresosIniciales = estudiantes.map(estudianteId => ({
            usuario_id: estudianteId,
            mision_id: mision._id,
            completada: false,
            progreso_actual: 0,
            fecha_inicio: new Date(),
            intentos: 0,
            puntuacion: 0
        }));

        await ProgresoMision.insertMany(progresosIniciales);

        res.status(201).json({
            message: '✅ Misión creada exitosamente',
            mision: await mision.populate('clase_id profesor_id')
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ LISTAR MISIONES DE UNA CLASE ============
router.get('/clase/:clase_id', verificarToken, async (req, res) => {
    try {
        const { clase_id } = req.params;
        const { activas_solo = false } = req.query;

        // Verificar acceso a la clase
        const clase = await Clase.findById(clase_id);
        if (!clase) {
            return res.status(404).json({ error: 'Clase no encontrada' });
        }

        // Verificar que el usuario pertenece a la clase
        const esProfesor = clase.profesor_id.toString() === req.usuario._id.toString();
        const esEstudiante = clase.estudiantes.includes(req.usuario._id);
        
        if (!esProfesor && !esEstudiante) {
            return res.status(403).json({ error: 'No tienes acceso a esta clase' });
        }

        // Filtros de consulta
        let filtro = { clase_id };
        if (activas_solo === 'true') {
            filtro.activa = true;
            filtro.fecha_limite = { $gt: new Date() };
        }

        const misiones = await Mision.find(filtro)
            .populate('profesor_id', 'nombre email')
            .populate('clase_id', 'nombre codigo_clase')
            .sort({ fecha_limite: 1 });

        // Si es estudiante, incluir su progreso
        if (esEstudiante) {
            const misionesConProgreso = await Promise.all(
                misiones.map(async (mision) => {
                    const progreso = await ProgresoMision.findOne({
                        usuario_id: req.usuario._id,
                        mision_id: mision._id
                    });

                    return {
                        ...mision.toObject(),
                        mi_progreso: progreso || null
                    };
                })
            );

            return res.json({ misiones: misionesConProgreso });
        }

        // Si es profesor, incluir estadísticas generales
        const misionesConStats = await Promise.all(
            misiones.map(async (mision) => {
                const stats = await ProgresoMision.aggregate([
                    { $match: { mision_id: mision._id } },
                    {
                        $group: {
                            _id: null,
                            total_estudiantes: { $sum: 1 },
                            completadas: { $sum: { $cond: ['$completada', 1, 0] } },
                            progreso_promedio: { $avg: '$progreso_actual' },
                            puntuacion_promedio: { $avg: '$puntuacion' }
                        }
                    }
                ]);

                return {
                    ...mision.toObject(),
                    estadisticas: stats[0] || {
                        total_estudiantes: 0,
                        completadas: 0,
                        progreso_promedio: 0,
                        puntuacion_promedio: 0
                    }
                };
            })
        );

        res.json({ misiones: misionesConStats });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ OBTENER MISIÓN ESPECÍFICA ============
router.get('/:mision_id', verificarToken, async (req, res) => {
    try {
        const mision = await Mision.findById(req.params.mision_id)
            .populate('profesor_id', 'nombre email')
            .populate('clase_id', 'nombre codigo_clase')
            .populate('requisitos.habilidades_requeridas', 'nombre descripcion');

        if (!mision) {
            return res.status(404).json({ error: 'Misión no encontrada' });
        }

        // Verificar acceso
        const clase = await Clase.findById(mision.clase_id);
        const esProfesor = clase.profesor_id.toString() === req.usuario._id.toString();
        const esEstudiante = clase.estudiantes.includes(req.usuario._id);
        
        if (!esProfesor && !esEstudiante) {
            return res.status(403).json({ error: 'No tienes acceso a esta misión' });
        }

        // Agregar progreso del usuario si es estudiante
        if (esEstudiante) {
            const progreso = await ProgresoMision.findOne({
                usuario_id: req.usuario._id,
                mision_id: mision._id
            });

            return res.json({
                mision,
                mi_progreso: progreso
            });
        }

        // Si es profesor, agregar todos los progresos
        const progresos = await ProgresoMision.find({ mision_id: mision._id })
            .populate('usuario_id', 'nombre email');

        res.json({
            mision,
            progresos_estudiantes: progresos
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ ACTUALIZAR PROGRESO DE MISIÓN (Estudiante) ============
router.put('/:mision_id/progreso', verificarToken, async (req, res) => {
    try {
        const { progreso_actual, notas = '' } = req.body;

        // Verificar que sea estudiante
        if (req.usuario.rol !== 'estudiante') {
            return res.status(403).json({ error: 'Solo estudiantes pueden actualizar progreso' });
        }

        // Validar progreso
        if (progreso_actual < 0 || progreso_actual > 100) {
            return res.status(400).json({ error: 'El progreso debe estar entre 0 y 100' });
        }

        const mision = await Mision.findById(req.params.mision_id);
        if (!mision) {
            return res.status(404).json({ error: 'Misión no encontrada' });
        }

        // Verificar que la misión esté activa y no haya expirado
        if (!mision.activa || new Date() > mision.fecha_limite) {
            return res.status(400).json({ error: 'Esta misión ya no está disponible' });
        }

        // Buscar o crear progreso
        let progreso = await ProgresoMision.findOne({
            usuario_id: req.usuario._id,
            mision_id: mision._id
        });

        if (!progreso) {
            progreso = new ProgresoMision({
                usuario_id: req.usuario._id,
                mision_id: mision._id,
                progreso_actual: 0,
                intentos: 0
            });
        }

        // Actualizar progreso
        const progresoAnterior = progreso.progreso_actual;
        progreso.progreso_actual = progreso_actual;
        progreso.intentos += 1;
        
        if (notas) {
            progreso.notas_profesor = notas;
        }

        // Auto-completar si llega a 100%
        if (progreso_actual >= 100 && !progreso.completada) {
            progreso.completada = true;
            progreso.fecha_completada = new Date();
            progreso.puntuacion = 100; // Puntuación base, profesor puede ajustar
        }

        await progreso.save();

        // Registrar en historial
        await new HistorialAccion({
            usuario_origen: req.usuario._id,
            usuario_destino: req.usuario._id,
            tipo_accion: 'actualizar_progreso_mision',
            valor: progreso_actual - progresoAnterior,
            razon: `Progreso actualizado: ${progresoAnterior}% → ${progreso_actual}%`,
            fecha: new Date(),
            contexto: {
                mision_id: mision._id
            }
        }).save();

        res.json({
            message: '✅ Progreso actualizado',
            progreso: progreso,
            auto_completada: progreso_actual >= 100
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ COMPLETAR/VALIDAR MISIÓN (Profesor) ============
router.post('/:mision_id/completar/:estudiante_id', verificarToken, async (req, res) => {
    try {
        const { puntuacion, notas_profesor = '', otorgar_recompensas = true } = req.body;

        // Verificar que sea profesor
        if (req.usuario.rol !== 'profesor') {
            return res.status(403).json({ error: 'Solo profesores pueden validar misiones' });
        }

        const mision = await Mision.findById(req.params.mision_id);
        if (!mision) {
            return res.status(404).json({ error: 'Misión no encontrada' });
        }

        // Verificar que sea el profesor de la misión
        if (mision.profesor_id.toString() !== req.usuario._id.toString()) {
            return res.status(403).json({ error: 'No puedes validar misiones que no creaste' });
        }

        // Validar puntuación
        if (puntuacion < 0 || puntuacion > 100) {
            return res.status(400).json({ error: 'La puntuación debe estar entre 0 y 100' });
        }

        const progreso = await ProgresoMision.findOne({
            usuario_id: req.params.estudiante_id,
            mision_id: mision._id
        });

        if (!progreso) {
            return res.status(404).json({ error: 'Progreso no encontrado' });
        }

        // Actualizar progreso
        progreso.completada = true;
        progreso.fecha_completada = new Date();
        progreso.puntuacion = puntuacion;
        progreso.notas_profesor = notas_profesor;
        progreso.progreso_actual = 100;

        await progreso.save();

        // Otorgar recompensas si está habilitado
        let recompensasOtorgadas = [];
        if (otorgar_recompensas) {
            const estudiante = await Usuario.findById(req.params.estudiante_id);
            const personaje = await Personaje.findOne({ usuario_id: estudiante._id });
            const inventario = await Inventario.findOne({ personaje_id: personaje._id });

            // Recompensa base de XP
            estudiante.experiencia += mision.xp_recompensa;
            await estudiante.save();
            recompensasOtorgadas.push({
                tipo: 'xp',
                valor: mision.xp_recompensa
            });

            // Recompensas adicionales
            for (const recompensa of mision.recompensas) {
                if (recompensa.tipo === 'xp') {
                    estudiante.experiencia += recompensa.valor;
                    await estudiante.save();
                    recompensasOtorgadas.push(recompensa);
                } else if (recompensa.tipo === 'monedas') {
                    inventario.monedas += recompensa.valor;
                    await inventario.save();
                    recompensasOtorgadas.push(recompensa);
                } else if (recompensa.tipo === 'item' && recompensa.item_id) {
                    const itemExistente = inventario.items.find(
                        item => item.item_id.toString() === recompensa.item_id.toString()
                    );
                    
                    if (itemExistente) {
                        itemExistente.cantidad += recompensa.valor;
                    } else {
                        inventario.items.push({
                            item_id: recompensa.item_id,
                            cantidad: recompensa.valor,
                            fecha_obtenido: new Date()
                        });
                    }
                    await inventario.save();
                    recompensasOtorgadas.push(recompensa);
                }
            }
        }

        // Registrar en historial
        await new HistorialAccion({
            usuario_origen: req.usuario._id,
            usuario_destino: req.params.estudiante_id,
            tipo_accion: 'completar_mision',
            valor: puntuacion,
            razon: `Misión "${mision.nombre}" completada con puntuación ${puntuacion}`,
            fecha: new Date(),
            contexto: {
                mision_id: mision._id
            }
        }).save();

        res.json({
            message: '✅ Misión validada exitosamente',
            progreso: progreso,
            recompensas_otorgadas: recompensasOtorgadas
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ ACTIVAR/DESACTIVAR MISIÓN (Profesor) ============
router.patch('/:mision_id/toggle', verificarToken, async (req, res) => {
    try {
        // Verificar que sea profesor
        if (req.usuario.rol !== 'profesor') {
            return res.status(403).json({ error: 'Solo profesores pueden gestionar misiones' });
        }

        const mision = await Mision.findById(req.params.mision_id);
        if (!mision) {
            return res.status(404).json({ error: 'Misión no encontrada' });
        }

        // Verificar que sea el profesor de la misión
        if (mision.profesor_id.toString() !== req.usuario._id.toString()) {
            return res.status(403).json({ error: 'No puedes gestionar misiones que no creaste' });
        }

        mision.activa = !mision.activa;
        await mision.save();

        res.json({
            message: `✅ Misión ${mision.activa ? 'activada' : 'desactivada'}`,
            mision: mision
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ OBTENER MIS MISIONES (Estudiante) ============
router.get('/mis-misiones/:clase_id?', verificarToken, async (req, res) => {
    try {
        // Solo para estudiantes
        if (req.usuario.rol !== 'estudiante') {
            return res.status(403).json({ error: 'Endpoint solo para estudiantes' });
        }

        let filtro = { usuario_id: req.usuario._id };
        
        // Si especifica clase, filtrar por ella
        if (req.params.clase_id) {
            const misiones = await Mision.find({ clase_id: req.params.clase_id });
            const misionIds = misiones.map(m => m._id);
            filtro.mision_id = { $in: misionIds };
        }

        const progresos = await ProgresoMision.find(filtro)
            .populate({
                path: 'mision_id',
                populate: {
                    path: 'clase_id',
                    select: 'nombre codigo_clase'
                }
            })
            .sort({ 'mision_id.fecha_limite': 1 });

        res.json({ mis_misiones: progresos });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ ESTADÍSTICAS DE MISIONES (Profesor) ============
router.get('/estadisticas/:clase_id', verificarToken, async (req, res) => {
    try {
        // Solo para profesores
        if (req.usuario.rol !== 'profesor') {
            return res.status(403).json({ error: 'Solo profesores pueden ver estadísticas' });
        }

        const clase = await Clase.findById(req.params.clase_id);
        if (!clase || clase.profesor_id.toString() !== req.usuario._id.toString()) {
            return res.status(403).json({ error: 'No tienes acceso a esta clase' });
        }

        const stats = await ProgresoMision.aggregate([
            {
                $lookup: {
                    from: 'misiones',
                    localField: 'mision_id',
                    foreignField: '_id',
                    as: 'mision'
                }
            },
            { $unwind: '$mision' },
            { $match: { 'mision.clase_id': clase._id } },
            {
                $group: {
                    _id: null,
                    total_misiones: { $addToSet: '$mision_id' },
                    total_progresos: { $sum: 1 },
                    completadas: { $sum: { $cond: ['$completada', 1, 0] } },
                    progreso_promedio: { $avg: '$progreso_actual' },
                    puntuacion_promedio: { $avg: '$puntuacion' }
                }
            }
        ]);

        const resultado = stats[0] || {
            total_misiones: [],
            total_progresos: 0,
            completadas: 0,
            progreso_promedio: 0,
            puntuacion_promedio: 0
        };

        resultado.total_misiones = resultado.total_misiones.length;
        resultado.tasa_completitud = resultado.total_progresos > 0 
            ? (resultado.completadas / resultado.total_progresos * 100).toFixed(2)
            : 0;

        res.json({ estadisticas: resultado });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;