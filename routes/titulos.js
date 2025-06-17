const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middleware/auth');
const Titulo = require('../models/titulo');
const Usuario = require('../models/usuario');
const Personaje = require('../models/personaje');
const Inventario = require('../models/inventario');
const HistorialAccion = require('../models/historialAccion');

// ============ LISTAR TODOS LOS TÍTULOS DISPONIBLES ============
router.get('/', verificarToken, async (req, res) => {
    try {
        const { categoria, rareza } = req.query;
        
        let filtro = {};
        if (categoria) filtro.categoria = categoria;
        if (rareza) filtro.rareza = rareza;

        const titulos = await Titulo.find(filtro)
            .populate('beneficios.habilidades_especiales', 'nombre descripcion')
            .sort({ rareza: 1, categoria: 1, nombre: 1 });

        // Agregar si el usuario actual tiene cada título
        const titulosConEstado = titulos.map(titulo => {
            const tienesTitulo = titulo.usuarios.includes(req.usuario._id);
            return {
                ...titulo.toObject(),
                lo_tengo: tienesTitulo,
                total_usuarios: titulo.usuarios.length
            };
        });

        res.json({ 
            titulos: titulosConEstado,
            categorias_disponibles: ['academico', 'social', 'combate', 'especial'],
            rarezas_disponibles: ['comun', 'raro', 'epico', 'legendario']
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ OBTENER TÍTULOS DE UN USUARIO ============
router.get('/usuario/:usuario_id?', verificarToken, async (req, res) => {
    try {
        const usuario_id = req.params.usuario_id || req.usuario._id;
        
        // Si busca títulos de otro usuario, verificar permisos
        if (usuario_id !== req.usuario._id.toString() && req.usuario.rol !== 'profesor' && req.usuario.rol !== 'admin') {
            return res.status(403).json({ error: 'No puedes ver títulos de otros usuarios' });
        }

        const usuario = await Usuario.findById(usuario_id);
        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const titulos = await Titulo.find({ usuarios: usuario_id })
            .populate('beneficios.habilidades_especiales', 'nombre descripcion')
            .sort({ rareza: 1, categoria: 1 });

        // Estadísticas de títulos
        const stats = {
            total_titulos: titulos.length,
            por_categoria: {},
            por_rareza: {},
            beneficios_activos: {
                bono_xp_total: 0,
                bono_monedas_total: 0,
                habilidades_especiales: []
            }
        };

        titulos.forEach(titulo => {
            // Contar por categoría
            stats.por_categoria[titulo.categoria] = (stats.por_categoria[titulo.categoria] || 0) + 1;
            
            // Contar por rareza
            stats.por_rareza[titulo.rareza] = (stats.por_rareza[titulo.rareza] || 0) + 1;
            
            // Sumar beneficios activos
            if (titulo.beneficios) {
                stats.beneficios_activos.bono_xp_total += titulo.beneficios.bono_xp || 0;
                stats.beneficios_activos.bono_monedas_total += titulo.beneficios.bono_monedas || 0;
                
                if (titulo.beneficios.habilidades_especiales) {
                    stats.beneficios_activos.habilidades_especiales.push(
                        ...titulo.beneficios.habilidades_especiales
                    );
                }
            }
        });

        res.json({
            usuario: {
                id: usuario._id,
                nombre: usuario.nombre,
                email: usuario.email
            },
            titulos: titulos,
            estadisticas: stats
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ OTORGAR TÍTULO A USUARIO (Admin/Profesor) ============
router.post('/otorgar', verificarToken, async (req, res) => {
    try {
        const { usuario_id, titulo_id, razon = '' } = req.body;

        // Verificar permisos
        if (req.usuario.rol !== 'admin' && req.usuario.rol !== 'profesor') {
            return res.status(403).json({ error: 'Solo admins y profesores pueden otorgar títulos' });
        }

        const titulo = await Titulo.findById(titulo_id);
        if (!titulo) {
            return res.status(404).json({ error: 'Título no encontrado' });
        }

        const usuario = await Usuario.findById(usuario_id);
        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Verificar si ya tiene el título
        if (titulo.usuarios.includes(usuario_id)) {
            return res.status(400).json({ error: 'El usuario ya tiene este título' });
        }

        // Otorgar título
        titulo.usuarios.push(usuario_id);
        await titulo.save();

        // Aplicar beneficios si los tiene
        let beneficiosAplicados = [];
        if (titulo.beneficios) {
            if (titulo.beneficios.bono_xp > 0) {
                usuario.experiencia += titulo.beneficios.bono_xp;
                await usuario.save();
                beneficiosAplicados.push({
                    tipo: 'xp',
                    valor: titulo.beneficios.bono_xp
                });
            }

            if (titulo.beneficios.bono_monedas > 0) {
                const personaje = await Personaje.findOne({ usuario_id: usuario._id });
                if (personaje) {
                    const inventario = await Inventario.findOne({ personaje_id: personaje._id });
                    if (inventario) {
                        inventario.monedas += titulo.beneficios.bono_monedas;
                        await inventario.save();
                        beneficiosAplicados.push({
                            tipo: 'monedas',
                            valor: titulo.beneficios.bono_monedas
                        });
                    }
                }
            }
        }

        // Registrar en historial
        await new HistorialAccion({
            usuario_origen: req.usuario._id,
            usuario_destino: usuario_id,
            tipo_accion: 'otorgar_titulo',
            valor: 1,
            razon: razon || `Título "${titulo.nombre}" otorgado`,
            fecha: new Date(),
            contexto: {
                titulo_id: titulo._id
            }
        }).save();

        res.json({
            message: `✅ Título "${titulo.nombre}" otorgado exitosamente`,
            titulo: titulo,
            beneficios_aplicados: beneficiosAplicados
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ QUITAR TÍTULO A USUARIO (Admin) ============
router.delete('/quitar', verificarToken, async (req, res) => {
    try {
        const { usuario_id, titulo_id, razon = '' } = req.body;

        // Solo admins pueden quitar títulos
        if (req.usuario.rol !== 'admin') {
            return res.status(403).json({ error: 'Solo admins pueden quitar títulos' });
        }

        const titulo = await Titulo.findById(titulo_id);
        if (!titulo) {
            return res.status(404).json({ error: 'Título no encontrado' });
        }

        const usuario = await Usuario.findById(usuario_id);
        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Verificar si tiene el título
        if (!titulo.usuarios.includes(usuario_id)) {
            return res.status(400).json({ error: 'El usuario no tiene este título' });
        }

        // No permitir quitar títulos permanentes
        if (titulo.permanente) {
            return res.status(400).json({ error: 'No se pueden quitar títulos permanentes' });
        }

        // Quitar título
        titulo.usuarios = titulo.usuarios.filter(id => id.toString() !== usuario_id);
        await titulo.save();

        // Registrar en historial
        await new HistorialAccion({
            usuario_origen: req.usuario._id,
            usuario_destino: usuario_id,
            tipo_accion: 'quitar_titulo',
            valor: -1,
            razon: razon || `Título "${titulo.nombre}" removido`,
            fecha: new Date(),
            contexto: {
                titulo_id: titulo._id
            }
        }).save();

        res.json({
            message: `✅ Título "${titulo.nombre}" removido exitosamente`
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ CREAR NUEVO TÍTULO (Admin) ============
router.post('/crear', verificarToken, async (req, res) => {
    try {
        // Solo admins pueden crear títulos
        if (req.usuario.rol !== 'admin') {
            return res.status(403).json({ error: 'Solo admins pueden crear títulos' });
        }

        const {
            nombre,
            descripcion,
            requisito,
            icono = 'titulo_default.png',
            permanente = false,
            categoria,
            rareza,
            beneficios = {}
        } = req.body;

        // Verificar que no exista otro título con el mismo nombre
        const tituloExiste = await Titulo.findOne({ nombre });
        if (tituloExiste) {
            return res.status(400).json({ error: 'Ya existe un título con ese nombre' });
        }

        const titulo = new Titulo({
            nombre,
            descripcion,
            requisito,
            icono,
            usuarios: [],
            permanente,
            categoria,
            rareza,
            beneficios: {
                bono_xp: beneficios.bono_xp || 0,
                bono_monedas: beneficios.bono_monedas || 0,
                habilidades_especiales: beneficios.habilidades_especiales || []
            }
        });

        await titulo.save();

        res.status(201).json({
            message: '✅ Título creado exitosamente',
            titulo: titulo
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ OBTENER TÍTULO ESPECÍFICO ============
router.get('/:titulo_id', verificarToken, async (req, res) => {
    try {
        const titulo = await Titulo.findById(req.params.titulo_id)
            .populate('beneficios.habilidades_especiales', 'nombre descripcion')
            .populate('usuarios', 'nombre email nivel');

        if (!titulo) {
            return res.status(404).json({ error: 'Título no encontrado' });
        }

        // Verificar si el usuario actual lo tiene
        const loTienes = titulo.usuarios.some(u => u._id.toString() === req.usuario._id.toString());

        res.json({
            titulo: {
                ...titulo.toObject(),
                lo_tengo: loTienes
            }
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ ESTADÍSTICAS GENERALES DE TÍTULOS ============
router.get('/stats/generales', verificarToken, async (req, res) => {
    try {
        // Solo profesores y admins pueden ver estadísticas generales
        if (req.usuario.rol !== 'profesor' && req.usuario.rol !== 'admin') {
            return res.status(403).json({ error: 'Sin permisos para ver estadísticas generales' });
        }

        const stats = await Titulo.aggregate([
            {
                $project: {
                    nombre: 1,
                    categoria: 1,
                    rareza: 1,
                    permanente: 1,
                    total_usuarios: { $size: '$usuarios' }
                }
            },
            {
                $group: {
                    _id: null,
                    total_titulos: { $sum: 1 },
                    por_categoria: {
                        $push: {
                            categoria: '$categoria',
                            count: 1
                        }
                    },
                    por_rareza: {
                        $push: {
                            rareza: '$rareza',
                            count: 1
                        }
                    },
                    titulos_mas_populares: {
                        $push: {
                            nombre: '$nombre',
                            usuarios: '$total_usuarios'
                        }
                    },
                    permanentes: {
                        $sum: { $cond: ['$permanente', 1, 0] }
                    }
                }
            }
        ]);

        // Contar usuarios totales con títulos
        const usuariosConTitulos = await Titulo.distinct('usuarios');
        const totalUsuarios = await Usuario.countDocuments();

        const resultado = stats[0] || {
            total_titulos: 0,
            por_categoria: [],
            por_rareza: [],
            titulos_mas_populares: [],
            permanentes: 0
        };

        // Ordenar títulos más populares
        resultado.titulos_mas_populares = resultado.titulos_mas_populares
            .sort((a, b) => b.usuarios - a.usuarios)
            .slice(0, 10);

        resultado.usuarios_con_titulos = usuariosConTitulos.length;
        resultado.usuarios_sin_titulos = totalUsuarios - usuariosConTitulos.length;
        resultado.cobertura_porcentaje = totalUsuarios > 0 
            ? ((usuariosConTitulos.length / totalUsuarios) * 100).toFixed(2)
            : 0;

        res.json({ estadisticas: resultado });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ VERIFICAR REQUISITOS AUTOMÁTICOS ============
router.post('/verificar-requisitos/:usuario_id?', verificarToken, async (req, res) => {
    try {
        const usuario_id = req.params.usuario_id || req.usuario._id;
        
        // Solo verificar para sí mismo o si es admin/profesor
        if (usuario_id !== req.usuario._id.toString() && 
            req.usuario.rol !== 'admin' && req.usuario.rol !== 'profesor') {
            return res.status(403).json({ error: 'Sin permisos' });
        }

        const usuario = await Usuario.findById(usuario_id);
        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const personaje = await Personaje.findOne({ usuario_id: usuario._id });
        
        // Obtener títulos que el usuario NO tiene
        const titulos = await Titulo.find({ usuarios: { $ne: usuario_id } });
        
        let titulosObtenidos = [];
        
        for (const titulo of titulos) {
            let cumpleRequisito = false;
            
            // Aquí puedes agregar lógica de verificación automática
            // Por ejemplo, títulos por nivel, XP, misiones completadas, etc.
            switch (titulo.requisito) {
                case 'nivel_5':
                    cumpleRequisito = usuario.nivel >= 5;
                    break;
                case 'xp_500':
                    cumpleRequisito = usuario.experiencia >= 500;
                    break;
                case 'primer_personaje':
                    cumpleRequisito = personaje !== null;
                    break;
                case 'veterano':
                    const diasDesdeRegistro = (new Date() - usuario.fecha_registro) / (1000 * 60 * 60 * 24);
                    cumpleRequisito = diasDesdeRegistro >= 30;
                    break;
                // Agregar más verificaciones automáticas aquí
            }
            
            if (cumpleRequisito) {
                // Otorgar título automáticamente
                titulo.usuarios.push(usuario_id);
                await titulo.save();
                
                titulosObtenidos.push(titulo);
                
                // Registrar en historial
                await new HistorialAccion({
                    usuario_origen: req.usuario._id,
                    usuario_destino: usuario_id,
                    tipo_accion: 'titulo_automatico',
                    valor: 1,
                    razon: `Título "${titulo.nombre}" obtenido automáticamente: ${titulo.requisito}`,
                    fecha: new Date(),
                    contexto: {
                        titulo_id: titulo._id
                    }
                }).save();
            }
        }

        res.json({
            message: titulosObtenidos.length > 0 
                ? `✅ ${titulosObtenidos.length} título(s) obtenido(s) automáticamente`
                : 'No hay nuevos títulos disponibles',
            titulos_obtenidos: titulosObtenidos
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;