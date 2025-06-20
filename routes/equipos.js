const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middleware/auth');
const Equipo = require('../models/equipo');
const Personaje = require('../models/personaje');
const Usuario = require('../models/usuario');
const Clase = require('../models/clase');
const HistorialAccion = require('../models/historialAccion');

// ============ CREAR EQUIPO (Solo Profesores) ============
router.post('/crear', verificarToken, async (req, res) => {
    try {
        const { nombre, color_equipo = '#007bff', emblema = 'escudo.png', clase_id = null } = req.body;

        if (req.usuario.rol !== 'profesor') {
            return res.status(403).json({ error: 'Solo profesores pueden crear equipos' });
        }

        // Validar clase_id si se proporciona
        if (clase_id) {
            const clase = await Clase.findById(clase_id);
            if (!clase) {
                return res.status(404).json({ error: 'Clase no encontrada' });
            }
            if (clase.profesor_id.toString() !== req.usuario._id.toString()) {
                return res.status(403).json({ error: 'No puedes crear equipos en clases que no son tuyas' });
            }
        }

        // Verificar nombre único dentro del contexto (clase o global)
        const filtroExistencia = {
            nombre: { $regex: new RegExp(`^${nombre}$`, 'i') },
            profesor_id: req.usuario._id
        };
        
        // Si se especifica clase, verificar únicamente dentro de esa clase
        if (clase_id) {
            filtroExistencia.clase_id = clase_id;
        } else {
            // Si no se especifica clase, verificar solo equipos globales
            filtroExistencia.$or = [
                { clase_id: null },
                { clase_id: { $exists: false } }
            ];
        }
        
        const equipoExiste = await Equipo.findOne(filtroExistencia);
        if (equipoExiste) {
            const contexto = clase_id ? 'en esta clase' : 'global';
            return res.status(400).json({ error: `Ya tienes un equipo con ese nombre ${contexto}` });
        }

        const equipo = new Equipo({
            nombre,
            miembros: [],
            puntos: 0,
            profesor_id: req.usuario._id,
            clase_id: clase_id, // Puede ser null para equipos globales
            estadisticas: {
                misiones_completadas: 0,
                habilidades_usadas_total: 0,
                xp_total_ganado: 0
            },
            configuracion: {
                color_equipo,
                emblema
            }
        });

        await equipo.save();

        // Populate información de clase si existe
        await equipo.populate('clase_id', 'nombre codigo_clase');

        res.status(201).json({
            message: '✅ Equipo creado exitosamente',
            equipo: {
                ...equipo.toObject(),
                clase_info: equipo.clase_id ? {
                    nombre: equipo.clase_id.nombre,
                    codigo: equipo.clase_id.codigo_clase
                } : null
            }
        });

    } catch (error) {
        console.error('❌ ERROR unirse equipo:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============ UNIRSE A EQUIPO V2 (con soporte equipos por clase) ============
router.post('/:equipo_id/unirse-v2', verificarToken, async (req, res) => {
    try {
        if (req.usuario.rol !== 'estudiante') {
            return res.status(403).json({ error: 'Solo estudiantes pueden unirse a equipos' });
        }

        const equipo = await Equipo.findById(req.params.equipo_id).populate('clase_id', 'nombre estudiantes');
        if (!equipo) {
            return res.status(404).json({ error: 'Equipo no encontrado' });
        }

        const personaje = await Personaje.findOne({ usuario_id: req.usuario._id });
        if (!personaje) {
            return res.status(404).json({ error: 'Personaje no encontrado' });
        }

        // Verificar límite de miembros
        if (equipo.miembros.length >= 4) {
            return res.status(400).json({ error: 'Equipo lleno (máximo 4 miembros)' });
        }

        // Verificar si ya es miembro del equipo
        const yaEsMiembro = equipo.miembros.some(miembroId => 
            miembroId.toString() === personaje._id.toString()
        );
        if (yaEsMiembro) {
            return res.status(400).json({ error: 'Ya eres miembro de este equipo' });
        }

        // NUEVA LÓGICA: Verificar según tipo de equipo
        if (equipo.clase_id) {
            // Equipo de clase específica
            const estaEnClase = equipo.clase_id.estudiantes.some(estudianteId => 
                estudianteId.toString() === req.usuario._id.toString()
            );
            
            if (!estaEnClase) {
                return res.status(403).json({ 
                    error: `No puedes unirte a este equipo porque no estás inscrito en la clase "${equipo.clase_id.nombre}"` 
                });
            }

            // Verificar si ya tiene equipo en esta clase usando NUEVO SISTEMA
            const equipoExistenteEnClase = personaje.getEquipoEnClase(equipo.clase_id._id);
            if (equipoExistenteEnClase) {
                return res.status(400).json({ 
                    error: `Ya perteneces a un equipo en la clase "${equipo.clase_id.nombre}". Sal primero del equipo actual.` 
                });
            }

            // Unirse usando NUEVO SISTEMA
            try {
                await personaje.unirseAEquipoEnClase(equipo._id, equipo.clase_id._id);
            } catch (error) {
                return res.status(400).json({ error: error.message });
            }

        } else {
            // Equipo global - usar sistema legacy
            if (personaje.equipo_id) {
                return res.status(400).json({ error: 'Ya perteneces a un equipo global. Sal primero del actual.' });
            }

            personaje.equipo_id = equipo._id;
            await personaje.save();
        }

        // Agregar al array de miembros del equipo
        equipo.miembros.push(personaje._id);
        await equipo.save();

        // Crear historial
        await new HistorialAccion({
            usuario_origen: req.usuario._id,
            usuario_destino: req.usuario._id,
            tipo_accion: 'unirse_equipo',
            valor: 1,
            razon: `Se unió al equipo "${equipo.nombre}"${equipo.clase_id ? ` (Clase: ${equipo.clase_id.nombre})` : ' (Global)'}`,
            fecha: new Date(),
            contexto: {
                equipo_id: equipo._id,
                clase_id: equipo.clase_id?._id || null
            }
        }).save();

        res.json({
            message: `✅ Te has unido al equipo "${equipo.nombre}"${equipo.clase_id ? ` en la clase ${equipo.clase_id.nombre}` : ''}`,
            equipo: {
                ...equipo.toObject(),
                tipo_equipo: equipo.clase_id ? 'clase' : 'global'
            },
            version: 'v2'
        });

    } catch (error) {
        console.error('Error en unirse-v2:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============ SALIR DE EQUIPO V2 (con soporte equipos por clase) ============
router.post('/salir-v2', verificarToken, async (req, res) => {
    try {
        const { clase_id = null } = req.body;
        
        console.log('🔍 DEBUG salir-v2 - Request:', { clase_id, usuario: req.usuario._id });
        
        if (req.usuario.rol !== 'estudiante') {
            return res.status(403).json({ error: 'Solo estudiantes pueden salir de equipos' });
        }

        const personaje = await Personaje.findOne({ usuario_id: req.usuario._id });
        if (!personaje) {
            return res.status(404).json({ error: 'Personaje no encontrado' });
        }

        let equipoId = null;
        let nombreEquipo = '';
        let nombreClase = '';

        if (clase_id) {
            // Salir de equipo en clase específica usando NUEVO SISTEMA
            const equipoEnClase = personaje.getEquipoEnClase(clase_id);
            if (!equipoEnClase) {
                return res.status(400).json({ error: 'No perteneces a ningún equipo en esta clase' });
            }

            const equipo = await Equipo.findById(equipoEnClase).populate('clase_id', 'nombre');
            if (!equipo) {
                return res.status(404).json({ error: 'Equipo no encontrado' });
            }

            try {
                const resultado = await personaje.salirDeEquipoEnClase(clase_id);
                
                equipoId = resultado.equipo_id;
                nombreEquipo = equipo.nombre;
                nombreClase = equipo.clase_id?.nombre || '';
            } catch (error) {
                console.error('❌ Error al salir del equipo en clase:', error);
                return res.status(400).json({ error: error.message });
            }

        } else {
            // Salir de equipo global usando sistema legacy
            if (!personaje.equipo_id) {
                return res.status(400).json({ error: 'No perteneces a ningún equipo global' });
            }

            const equipo = await Equipo.findById(personaje.equipo_id);
            if (!equipo) {
                return res.status(404).json({ error: 'Equipo no encontrado' });
            }

            equipoId = equipo._id;
            nombreEquipo = equipo.nombre;
            personaje.equipo_id = null;
            await personaje.save();
        }

        // Remover del array de miembros del equipo
        const equipo = await Equipo.findById(equipoId);
        if (equipo) {
            equipo.miembros = equipo.miembros.filter(
                miembroId => miembroId.toString() !== personaje._id.toString()
            );
            await equipo.save();
        }

        // Crear historial
        await new HistorialAccion({
            usuario_origen: req.usuario._id,
            usuario_destino: req.usuario._id,
            tipo_accion: 'salir_equipo',
            valor: -1,
            razon: `Salió del equipo "${nombreEquipo}"${nombreClase ? ` (Clase: ${nombreClase})` : ''}`,
            fecha: new Date(),
            contexto: {
                equipo_id: equipoId,
                clase_id: clase_id || null
            }
        }).save();

        const mensaje = nombreClase ? 
            `✅ Has salido del equipo "${nombreEquipo}" en la clase ${nombreClase}` :
            `✅ Has salido del equipo "${nombreEquipo}"`;

        console.log('🎉 Salida exitosa:', { mensaje, equipoId, nombreEquipo, nombreClase });

        res.json({
            message: mensaje,
            version: 'v2'
        });

    } catch (error) {
        console.error('Error en salir-v2:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============ INFO DE EQUIPOS DEL ESTUDIANTE V2 ============
router.get('/mis-equipos-v2', verificarToken, async (req, res) => {
    try {
        if (req.usuario.rol !== 'estudiante') {
            return res.status(403).json({ error: 'Solo estudiantes pueden ver sus equipos' });
        }

        const personaje = await Personaje.findOne({ usuario_id: req.usuario._id });
        if (!personaje) {
            return res.status(404).json({ error: 'Personaje no encontrado' });
        }

        const todosLosEquipos = personaje.obtenerTodosLosEquipos();
        
        if (todosLosEquipos.length === 0) {
            return res.json({
                equipos: [],
                mensaje: 'No perteneces a ningún equipo',
                version: 'v2'
            });
        }

        // Obtener información completa de los equipos
        const equiposCompletos = await Promise.all(
            todosLosEquipos.map(async (equipoInfo) => {
                const equipo = await Equipo.findById(equipoInfo.equipo_id)
                    .populate('clase_id', 'nombre codigo_clase')
                    .populate('profesor_id', 'nombre')
                    .populate({
                        path: 'miembros',
                        populate: {
                            path: 'usuario_id',
                            select: 'nombre'
                        }
                    });

                if (!equipo) return null;

                return {
                    id: equipo._id.toString(), // 🔧 FIX V2: Convertir ObjectId a string
                    nombre: equipo.nombre,
                    puntos: equipo.puntos,
                    miembros: equipo.miembros.length,
                    profesor: equipo.profesor_id?.nombre || 'Profesor',
                    tipo: equipoInfo.tipo,
                    fecha_union: equipoInfo.fecha_union,
                    clase_info: equipoInfo.clase_id ? {
                        id: equipoInfo.clase_id.toString(), // 🔧 FIX V2: Convertir ObjectId a string
                        nombre: equipo.clase_id?.nombre || 'Clase sin nombre',
                        codigo: equipo.clase_id?.codigo_clase || 'Sin código'
                    } : null
                };
            })
        );

        const equiposValidos = equiposCompletos.filter(e => e !== null);

        res.json({
            equipos: equiposValidos,
            total: equiposValidos.length,
            mensaje: `Perteneces a ${equiposValidos.length} equipo(s)`,
            version: 'v2',
            necesita_migracion: personaje.necesitaMigracion()
        });

    } catch (error) {
        console.error('Error en mis-equipos-v2:', error);
        res.status(500).json({ error: error.message });
    }
});
router.get('/', verificarToken, async (req, res) => {
    try {
        const { mi_equipo = false, clase_id = null } = req.query;

        let filtro = {};
        let mensaje = '';
        
        if (mi_equipo === 'true') {
            // Buscar equipo del estudiante
            const personaje = await Personaje.findOne({ usuario_id: req.usuario._id });
            if (!personaje || !personaje.equipo_id) {
                return res.json({ 
                    equipos: [],
                    mensaje: 'No perteneces a ningún equipo'
                });
            }
            filtro._id = personaje.equipo_id;
        } else if (req.usuario.rol === 'profesor') {
            // Filtros para profesores
            filtro.profesor_id = req.usuario._id;
            
            if (clase_id) {
                // Equipos de una clase específica
                const clase = await Clase.findById(clase_id);
                if (!clase) {
                    return res.status(404).json({ error: 'Clase no encontrada' });
                }
                if (clase.profesor_id.toString() !== req.usuario._id.toString()) {
                    return res.status(403).json({ error: 'No tienes permisos para ver equipos de esta clase' });
                }
                filtro.clase_id = clase_id;
                mensaje = `Equipos de la clase: ${clase.nombre}`;
            } else {
                // Por defecto: todos los equipos del profesor
                mensaje = 'Todos tus equipos (globales y por clase)';
            }
        } else if (req.usuario.rol === 'estudiante') {
            // Estudiantes ven equipos de sus clases
            const clasesEstudiante = await Clase.find({ 
                estudiantes: req.usuario._id,
                activa: true 
            });
            
            if (clase_id) {
                // Equipos de una clase específica donde está el estudiante
                const clasePermitida = clasesEstudiante.find(c => c._id.toString() === clase_id);
                if (!clasePermitida) {
                    return res.status(403).json({ error: 'No estás inscrito en esta clase' });
                }
                filtro.clase_id = clase_id;
                filtro.profesor_id = clasePermitida.profesor_id;
                mensaje = `Equipos disponibles en: ${clasePermitida.nombre}`;
            } else {
                // Equipos de todas sus clases + globales del profesor
                const profesoresIds = [...new Set(clasesEstudiante.map(c => c.profesor_id))];
                const clasesIds = clasesEstudiante.map(c => c._id);
                
                filtro.$or = [
                    // Equipos de las clases donde está inscrito
                    { clase_id: { $in: clasesIds } },
                    // Equipos globales de sus profesores
                    { 
                        profesor_id: { $in: profesoresIds },
                        $or: [
                            { clase_id: null },
                            { clase_id: { $exists: false } }
                        ]
                    }
                ];
                mensaje = 'Equipos disponibles para unirse';
            }
        }

        const equipos = await Equipo.find(filtro)
            .populate({
                path: 'miembros',
                populate: {
                    path: 'usuario_id',
                    select: 'nombre email nivel experiencia'
                }
            })
            .populate({
                path: 'miembros',
                populate: {
                    path: 'clase_personaje_id',
                    select: 'nombre icono'
                }
            })
            .populate('profesor_id', 'nombre email')
            .populate('clase_id', 'nombre codigo_clase')
            .sort({ puntos: -1, nombre: 1 });

        // 🔧 DEBUG: Verificar si el transform está funcionando
        console.log('🔍 DEBUGGING EQUIPOS EN ENDPOINT V2:');
        if (equipos.length > 0) {
            const equipoTest = equipos[0];
            console.log('Equipo original:', equipoTest);
            console.log('Equipo.miembros tipos:', equipoTest.miembros.map(m => typeof m));
            console.log('Equipo.miembros valores:', equipoTest.miembros);
            console.log('Equipo JSON:', JSON.stringify(equipoTest, null, 2));
        }

        const equiposConStats = equipos.map(equipo => {
            const miembrosData = equipo.miembros.map(personaje => ({
                id: personaje._id.toString(), // 🔧 FIX: Convertir ObjectId a string
                nombre: personaje.usuario_id?.nombre || 'Usuario sin nombre',
                email: personaje.usuario_id?.email || '',
                nivel: personaje.nivel,
                experiencia: personaje.experiencia,
                clase: personaje.clase_personaje_id?.nombre || 'Sin clase',
                icono_clase: personaje.clase_personaje_id?.icono || 'default.png',
                salud: personaje.salud_actual,
                energia: personaje.energia_actual
            }));

            // Verificar si estudiante puede unirse (debe estar en la misma clase)
            let puedeUnirse = false;
            if (req.usuario.rol === 'estudiante' && miembrosData.length < 4) {
                if (!equipo.clase_id) {
                    // Equipo global - puede unirse
                    puedeUnirse = true;
                } else {
                    // Verificar si está en la clase del equipo
                    // Esta verificación ya se hizo en el filtro arriba
                    puedeUnirse = true;
                }
            }

            return {
                id: equipo._id.toString(), // 🔧 FIX: Convertir ObjectId a string
                ...equipo.toObject(),
                miembros: miembrosData,
                cantidad_miembros: miembrosData.length,
                espacios_disponibles: 4 - miembrosData.length,
                puede_unirse: puedeUnirse,
                tipo_equipo: equipo.clase_id ? 'clase' : 'global',
                clase_info: equipo.clase_id ? {
                    id: equipo.clase_id._id.toString(), // 🔧 FIX: Convertir ObjectId a string
                    nombre: equipo.clase_id.nombre,
                    codigo: equipo.clase_id.codigo_clase
                } : null
            };
        });

        res.json({ 
            equipos: equiposConStats,
            total_equipos: equiposConStats.length,
            mensaje,
            filtros_aplicados: {
                clase_id: clase_id || null,
                mi_equipo: mi_equipo === 'true',
                rol_usuario: req.usuario.rol
            }
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// NUEVAS RUTAS PARA SISTEMA DE EQUIPOS POR CLASE (v2)
// =====================================================

// ============ LISTAR EQUIPOS V2 (REESCRITO DESDE CERO SIN POPULATE) ============
router.get('/v2', verificarToken, async (req, res) => {
    try {
        const { mi_equipo = false, clase_id = null } = req.query;

        // Filtro base
        let filtroEquipos = {};
        if (req.usuario.rol === 'profesor') {
            filtroEquipos.profesor_id = req.usuario._id;
            if (clase_id) {
                filtroEquipos.clase_id = clase_id;
            }
        } else if (req.usuario.rol === 'estudiante') {
            // Lógica para estudiantes con clase_id
            if (clase_id) {
                // Verificar que el estudiante esté en la clase
                const clase = await Clase.findById(clase_id);
                if (!clase || !clase.estudiantes.includes(req.usuario._id)) {
                    return res.status(403).json({ error: 'No tienes acceso a esta clase' });
                }
                filtroEquipos.clase_id = clase_id;
            }
        }

        console.log('🔥 ENDPOINT V2 - Iniciando con filtros:', { clase_id, usuario_rol: req.usuario.rol, filtroEquipos });
        
        // Obtener equipos SIN populate (crudo)
        const equiposCrudos = await Equipo.find(filtroEquipos).lean();
        
        console.log('📦 Equipos crudos encontrados:', equiposCrudos.length);
        
        // Procesar cada equipo manualmente
        const equiposProcesados = [];
        
        for (const equipo of equiposCrudos) {
            const miembrosDetalle = [];
            
            // Buscar miembros manualmente
            for (const miembroId of equipo.miembros) {
                const personaje = await Personaje.findById(miembroId).lean();
                if (!personaje) continue;
                
                const usuario = await Usuario.findById(personaje.usuario_id).lean();
                if (!usuario) continue;
                
                miembrosDetalle.push({
                    id: personaje._id.toString(),
                    nombre: usuario.nombre,
                    email: usuario.email,
                    nivel: usuario.nivel || 1,
                    experiencia: usuario.experiencia || 0,
                    salud: personaje.salud_actual || 0,
                    energia: personaje.energia_actual || 0
                });
            }
            
            // Buscar información del profesor
            let profesorInfo = null;
            if (equipo.profesor_id) {
                console.log(`👨‍🏫 Buscando profesor con ID: ${equipo.profesor_id}`);
                const profesor = await Usuario.findById(equipo.profesor_id).lean();
                if (profesor) {
                    profesorInfo = {
                        id: profesor._id.toString(),
                        nombre: profesor.nombre,
                        email: profesor.email
                    };
                    console.log(`✅ Profesor encontrado: ${profesor.nombre}`);
                } else {
                    console.log(`❌ Profesor NO encontrado para ID: ${equipo.profesor_id}`);
                }
            } else {
                console.log('❌ Equipo sin profesor_id');
            }
            
            // Buscar información de la clase si existe
            let claseInfo = null;
            if (equipo.clase_id) {
                const clase = await Clase.findById(equipo.clase_id).lean();
                if (clase) {
                    claseInfo = {
                        id: clase._id.toString(),
                        nombre: clase.nombre,
                        codigo: clase.codigo_clase
                    };
                }
            }
            
            equiposProcesados.push({
                id: equipo._id.toString(),
                nombre: equipo.nombre,
                puntos: equipo.puntos || 0,
                profesor_info: profesorInfo, // 🔥 INFORMACIÓN DEL PROFESOR AÑADIDA
                clase_id: equipo.clase_id ? equipo.clase_id.toString() : null,
                clase_info: claseInfo,
                miembros: miembrosDetalle,
                cantidad_miembros: miembrosDetalle.length,
                espacios_disponibles: 4 - miembrosDetalle.length,
                puede_unirse: req.usuario.rol === 'estudiante' && miembrosDetalle.length < 4,
                tipo_equipo: equipo.clase_id ? 'clase' : 'global'
            });
        }

        res.json({ 
            equipos: equiposProcesados,
            total_equipos: equiposProcesados.length,
            version: 'v2-fixed',
            mensaje: 'Equipos cargados'
        });

    } catch (error) {
        console.error('Error en equipos v2:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============ DEBUG MIDDLEWARE ============
router.use('/:equipo_id/unirse', (req, res, next) => {
    console.log('🚨 MIDDLEWARE DEBUG:', {
        url_completa: req.originalUrl,
        params: req.params,
        equipo_id_raw: req.params.equipo_id,
        equipo_id_length: req.params.equipo_id ? req.params.equipo_id.length : 'undefined'
    });
    next();
});

// ============ UNIRSE A EQUIPO (Estudiantes) ============
router.post('/:equipo_id/unirse', verificarToken, async (req, res) => {
    try {
        console.log('🔍 DEBUG - Unirse equipo:', {
            equipo_id: req.params.equipo_id,
            usuario_id: req.usuario._id,
            rol: req.usuario.rol
        });
        
        if (req.usuario.rol !== 'estudiante') {
            return res.status(403).json({ error: 'Solo estudiantes pueden unirse a equipos' });
        }

        console.log('🔍 Buscando equipo con ID:', req.params.equipo_id);
        const equipo = await Equipo.findById(req.params.equipo_id).populate('clase_id', 'nombre estudiantes');
        console.log('🔍 Equipo encontrado:', equipo ? 'SÍ' : 'NO', equipo ? equipo.nombre : 'null');
        
        if (!equipo) {
            return res.status(404).json({ error: 'Equipo no encontrado' });
        }

        console.log('🔍 Buscando personaje para usuario:', req.usuario._id);
        const personaje = await Personaje.findOne({ usuario_id: req.usuario._id });
        console.log('🔍 Personaje encontrado:', personaje ? 'SÍ' : 'NO', personaje ? personaje._id : 'null');
        if (!personaje) {
            return res.status(404).json({ error: 'Personaje no encontrado' });
        }

        if (personaje.equipo_id) {
            return res.status(400).json({ error: 'Ya perteneces a un equipo. Sal primero del actual.' });
        }

        console.log('🔍 Validando miembros del equipo:', {
            cantidad_miembros: equipo.miembros.length,
            miembros_array: equipo.miembros,
            limite_maximo: 4
        });
        
        if (equipo.miembros.length >= 4) {
            console.log('❌ ERROR: Equipo lleno');
            return res.status(400).json({ error: 'Equipo lleno (máximo 4 miembros)' });
        }

        console.log('🔍 Verificando si ya es miembro...', {
            personaje_id: personaje._id,
            personaje_id_string: personaje._id.toString(),
            miembros_como_strings: equipo.miembros.map(m => m.toString())
        });
        
        const yaEsMiembro = equipo.miembros.some(miembroId => 
            miembroId.toString() === personaje._id.toString()
        );
        
        if (yaEsMiembro) {
            console.log('❌ ERROR: Ya es miembro');
            return res.status(400).json({ error: 'Ya eres miembro de este equipo' });
        }

        // NUEVA VALIDACIÓN: Verificar que el estudiante pueda unirse al equipo
        console.log('🔍 Validando permisos de clase...', {
            equipo_tiene_clase: !!equipo.clase_id,
            clase_id: equipo.clase_id ? equipo.clase_id._id : null,
            clase_nombre: equipo.clase_id ? equipo.clase_id.nombre : null,
            estudiantes_en_clase: equipo.clase_id ? equipo.clase_id.estudiantes : null
        });
        
        if (equipo.clase_id) {
            console.log('🔍 Equipo de clase específica - verificando inscripción...');
            // Equipo de clase específica - verificar que esté inscrito en esa clase
            const estaEnClase = equipo.clase_id.estudiantes.some(estudianteId => 
                estudianteId.toString() === req.usuario._id.toString()
            );
            
            console.log('🔍 Resultado verificación de clase:', {
                usuario_id: req.usuario._id.toString(),
                esta_en_clase: estaEnClase,
                estudiantes_ids: equipo.clase_id.estudiantes.map(id => id.toString())
            });
            
            if (!estaEnClase) {
                console.log('❌ ERROR: No está en la clase');
                return res.status(403).json({ 
                    error: `No puedes unirte a este equipo porque no estás inscrito en la clase "${equipo.clase_id.nombre}"` 
                });
            }
        } else {
            console.log('🔍 Equipo global - cualquier estudiante puede unirse');
        }

        console.log('🔍 Agregando personaje al equipo...');
        equipo.miembros.push(personaje._id);
        
        try {
            console.log('🔍 Intentando guardar equipo...');
            await equipo.save();
            console.log('🔍 Equipo guardado exitosamente');
        } catch (errorEquipo) {
            console.error('❌ ERROR al guardar equipo:', errorEquipo);
            return res.status(500).json({ error: 'Error al guardar equipo: ' + errorEquipo.message });
        }

        try {
            console.log('🔍 Actualizando personaje...');
            personaje.equipo_id = equipo._id;
            await personaje.save();
            console.log('🔍 Personaje actualizado exitosamente');
        } catch (errorPersonaje) {
            console.error('❌ ERROR al guardar personaje:', errorPersonaje);
            return res.status(500).json({ error: 'Error al guardar personaje: ' + errorPersonaje.message });
        }

        console.log('🔍 Creando historial de acción...');

        await new HistorialAccion({
            usuario_origen: req.usuario._id,
            usuario_destino: req.usuario._id,
            tipo_accion: 'unirse_equipo',
            valor: 1,
            razon: `Se unió al equipo "${equipo.nombre}"${equipo.clase_id ? ` (Clase: ${equipo.clase_id.nombre})` : ' (Global)'}`,
            fecha: new Date(),
            contexto: {
                equipo_id: equipo._id,
                clase_id: equipo.clase_id?._id || null
            }
        }).save();

        res.json({
            message: `✅ Te has unido al equipo "${equipo.nombre}"${equipo.clase_id ? ` en la clase ${equipo.clase_id.nombre}` : ''}`,
            equipo: {
                ...equipo.toObject(),
                tipo_equipo: equipo.clase_id ? 'clase' : 'global'
            }
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ SALIR DE EQUIPO (Estudiantes) ============
router.post('/salir', verificarToken, async (req, res) => {
    try {
        if (req.usuario.rol !== 'estudiante') {
            return res.status(403).json({ error: 'Solo estudiantes pueden salir de equipos' });
        }

        const personaje = await Personaje.findOne({ usuario_id: req.usuario._id });
        if (!personaje || !personaje.equipo_id) {
            return res.status(400).json({ error: 'No perteneces a ningún equipo' });
        }

        const equipo = await Equipo.findById(personaje.equipo_id);
        if (!equipo) {
            return res.status(404).json({ error: 'Equipo no encontrado' });
        }

        equipo.miembros = equipo.miembros.filter(
            miembroId => miembroId.toString() !== personaje._id.toString()
        );
        await equipo.save();

        const nombreEquipo = equipo.nombre;
        personaje.equipo_id = null;
        await personaje.save();

        await new HistorialAccion({
            usuario_origen: req.usuario._id,
            usuario_destino: req.usuario._id,
            tipo_accion: 'salir_equipo',
            valor: -1,
            razon: `Salió del equipo "${nombreEquipo}"`,
            fecha: new Date(),
            contexto: {
                equipo_id: equipo._id
            }
        }).save();

        res.json({
            message: `✅ Has salido del equipo "${nombreEquipo}"`
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ GESTIONAR PUNTOS DE EQUIPO (Profesores) ============
router.put('/:equipo_id/puntos', verificarToken, async (req, res) => {
    try {
        const { operacion, cantidad, razon = '' } = req.body;

        if (req.usuario.rol !== 'profesor') {
            return res.status(403).json({ error: 'Solo profesores pueden gestionar puntos' });
        }

        if (!['agregar', 'quitar', 'establecer'].includes(operacion)) {
            return res.status(400).json({ error: 'Operación inválida' });
        }

        const equipo = await Equipo.findById(req.params.equipo_id);
        if (!equipo) {
            return res.status(404).json({ error: 'Equipo no encontrado' });
        }

        if (equipo.profesor_id.toString() !== req.usuario._id.toString()) {
            return res.status(403).json({ error: 'No puedes gestionar puntos de equipos que no son tuyos' });
        }

        const puntosAnteriores = equipo.puntos;
        
        switch (operacion) {
            case 'agregar':
                equipo.puntos += cantidad;
                break;
            case 'quitar':
                equipo.puntos = Math.max(0, equipo.puntos - cantidad);
                break;
            case 'establecer':
                equipo.puntos = Math.max(0, cantidad);
                break;
        }

        await equipo.save();

        for (const miembroId of equipo.miembros) {
            const personaje = await Personaje.findById(miembroId);
            if (personaje) {
                await new HistorialAccion({
                    usuario_origen: req.usuario._id,
                    usuario_destino: personaje.usuario_id,
                    tipo_accion: `${operacion}_puntos_equipo`,
                    valor: equipo.puntos - puntosAnteriores,
                    razon: razon || `Puntos de equipo ${operacion}: ${puntosAnteriores} → ${equipo.puntos}`,
                    fecha: new Date(),
                    contexto: {
                        equipo_id: equipo._id
                    }
                }).save();
            }
        }

        res.json({
            message: `✅ Puntos de equipo ${operacion} exitosamente`,
            equipo_nombre: equipo.nombre,
            puntos_anteriores: puntosAnteriores,
            puntos_actuales: equipo.puntos,
            diferencia: equipo.puntos - puntosAnteriores
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ ELIMINAR EQUIPO (Solo Profesores) ============
router.delete('/:equipo_id', verificarToken, async (req, res) => {
    try {
        if (req.usuario.rol !== 'profesor') {
            return res.status(403).json({ error: 'Solo profesores pueden eliminar equipos' });
        }

        const equipo = await Equipo.findById(req.params.equipo_id)
            .populate('miembros', 'usuario_id')
            .populate('clase_id', 'nombre');
            
        if (!equipo) {
            return res.status(404).json({ error: 'Equipo no encontrado' });
        }

        // Verificar que el profesor sea el dueño del equipo
        if (equipo.profesor_id.toString() !== req.usuario._id.toString()) {
            return res.status(403).json({ error: 'No puedes eliminar equipos que no son tuyos' });
        }

        // Remover referencias del equipo en personajes (sistema legacy)
        for (const miembro of equipo.miembros) {
            const personaje = await Personaje.findById(miembro._id);
            if (personaje && personaje.equipo_id && personaje.equipo_id.toString() === equipo._id.toString()) {
                personaje.equipo_id = null;
                await personaje.save();
            }

            // Remover de sistema nuevo (equipos_por_clase)
            if (personaje && personaje.equipos_por_clase && personaje.equipos_por_clase.length > 0) {
                personaje.equipos_por_clase = personaje.equipos_por_clase.filter(
                    epc => epc.equipo_id.toString() !== equipo._id.toString()
                );
                await personaje.save();
            }
        }

        // Crear historial para cada miembro
        for (const miembro of equipo.miembros) {
            if (miembro.usuario_id) {
                await new HistorialAccion({
                    usuario_origen: req.usuario._id,
                    usuario_destino: miembro.usuario_id,
                    tipo_accion: 'eliminar_equipo',
                    valor: 0,
                    razon: `El equipo "${equipo.nombre}" fue eliminado por el profesor${equipo.clase_id ? ` (Clase: ${equipo.clase_id.nombre})` : ''}`,
                    fecha: new Date(),
                    contexto: {
                        equipo_id: equipo._id,
                        clase_id: equipo.clase_id?._id || null
                    }
                }).save();
            }
        }

        // Eliminar el equipo
        const nombreEquipo = equipo.nombre;
        const claseInfo = equipo.clase_id?.nombre || 'Global';
        await Equipo.findByIdAndDelete(req.params.equipo_id);

        res.json({
            message: `✅ Equipo "${nombreEquipo}" eliminado exitosamente`,
            equipo_eliminado: {
                nombre: nombreEquipo,
                miembros_liberados: equipo.miembros.length,
                clase: claseInfo,
                puntos_perdidos: equipo.puntos
            }
        });

    } catch (error) {
        console.error('Error eliminando equipo:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============ RANKING DE EQUIPOS ============
router.get('/ranking/:profesor_id?', verificarToken, async (req, res) => {
    try {
        const { clase_id = null } = req.query;
        const profesor_id = req.params.profesor_id || 
            (req.usuario.rol === 'profesor' ? req.usuario._id : null);

        if (!profesor_id) {
            return res.status(400).json({ error: 'Se requiere profesor_id' });
        }

        // Construir filtro para equipos
        let filtroEquipos = { profesor_id };
        let contextoRanking = 'todos los equipos';
        
        if (clase_id) {
            // Ranking de una clase específica
            const clase = await Clase.findById(clase_id);
            if (!clase) {
                return res.status(404).json({ error: 'Clase no encontrada' });
            }
            if (clase.profesor_id.toString() !== profesor_id.toString()) {
                return res.status(403).json({ error: 'No tienes permisos para ver el ranking de esta clase' });
            }
            
            filtroEquipos.clase_id = clase_id;
            contextoRanking = `la clase "${clase.nombre}"`;
        }
        // Si no se especifica clase_id, mostrar todos los equipos del profesor

        const equipos = await Equipo.find(filtroEquipos)
            .populate({
                path: 'miembros',
                populate: {
                    path: 'usuario_id',
                    select: 'nombre nivel'
                }
            })
            .populate('clase_id', 'nombre codigo_clase')
            .sort({ puntos: -1 });

        const ranking = equipos.map((equipo, index) => ({
            posicion: index + 1,
            nombre: equipo.nombre,
            puntos: equipo.puntos,
            cantidad_miembros: equipo.miembros.length,
            nivel_promedio: equipo.miembros.length > 0 
                ? (equipo.miembros.reduce((sum, m) => sum + m.nivel, 0) / equipo.miembros.length).toFixed(1)
                : 0,
            estadisticas: equipo.estadisticas,
            configuracion: equipo.configuracion,
            tipo_equipo: equipo.clase_id ? 'clase' : 'global',
            clase_info: equipo.clase_id ? {
                id: equipo.clase_id._id.toString(), // 🔧 FIX: Convertir ObjectId a string
                nombre: equipo.clase_id.nombre,
                codigo: equipo.clase_id.codigo_clase
            } : null
        }));

        // Obtener información del profesor
        const profesor = await Usuario.findById(profesor_id, 'nombre email');
        
        // Estadisticas adicionales
        const stats = {
            total_equipos: ranking.length,
            equipos_con_clase: ranking.filter(e => e.tipo_equipo === 'clase').length,
            equipos_globales: ranking.filter(e => e.tipo_equipo === 'global').length,
            total_miembros: ranking.reduce((sum, e) => sum + e.cantidad_miembros, 0),
            puntos_totales: ranking.reduce((sum, e) => sum + e.puntos, 0)
        };

        res.json({ 
            ranking,
            estadisticas: stats,
            contexto: {
                descripcion: `Ranking de ${contextoRanking}`,
                clase_id: clase_id || null,
                profesor: profesor
            },
            filtros_aplicados: {
                profesor_id,
                clase_id: clase_id || null
            }
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;