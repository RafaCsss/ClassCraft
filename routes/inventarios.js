const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middleware/auth');
const Inventario = require('../models/inventario');
const Item = require('../models/item');
const Personaje = require('../models/personaje');
const Usuario = require('../models/usuario');
const HistorialAccion = require('../models/historialAccion');

// ============ OBTENER MI INVENTARIO ============
router.get('/mi-inventario', verificarToken, async (req, res) => {
    try {
        const personaje = await Personaje.findOne({ usuario_id: req.usuario._id });
        if (!personaje) {
            return res.status(404).json({ error: 'Personaje no encontrado' });
        }

        const inventario = await Inventario.findOne({ personaje_id: personaje._id })
            .populate('items.item_id', 'nombre descripcion tipo valor icono rareza efectos');

        if (!inventario) {
            return res.status(404).json({ error: 'Inventario no encontrado' });
        }

        // Calcular estadísticas del inventario
        const stats = {
            capacidad_usada: inventario.items.reduce((total, item) => total + item.cantidad, 0),
            capacidad_total: inventario.capacidad_max,
            valor_total: inventario.items.reduce((total, item) => {
                return total + (item.item_id.valor * item.cantidad);
            }, 0),
            items_por_tipo: {},
            items_por_rareza: {}
        };

        inventario.items.forEach(item => {
            const tipo = item.item_id.tipo;
            const rareza = item.item_id.rareza;
            
            stats.items_por_tipo[tipo] = (stats.items_por_tipo[tipo] || 0) + item.cantidad;
            stats.items_por_rareza[rareza] = (stats.items_por_rareza[rareza] || 0) + item.cantidad;
        });

        res.json({
            inventario: inventario,
            estadisticas: stats,
            espacio_disponible: inventario.capacidad_max - stats.capacidad_usada
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ OBTENER INVENTARIO DE OTRO USUARIO (Profesor/Admin) ============
router.get('/usuario/:usuario_id', verificarToken, async (req, res) => {
    try {
        // Solo profesores y admins pueden ver inventarios de otros
        if (req.usuario.rol !== 'profesor' && req.usuario.rol !== 'admin') {
            return res.status(403).json({ error: 'Sin permisos para ver otros inventarios' });
        }

        const personaje = await Personaje.findOne({ usuario_id: req.params.usuario_id });
        if (!personaje) {
            return res.status(404).json({ error: 'Personaje no encontrado' });
        }

        const inventario = await Inventario.findOne({ personaje_id: personaje._id })
            .populate('items.item_id', 'nombre descripcion tipo valor icono rareza')
            .populate({
                path: 'personaje_id',
                populate: {
                    path: 'usuario_id',
                    select: 'nombre email'
                }
            });

        if (!inventario) {
            return res.status(404).json({ error: 'Inventario no encontrado' });
        }

        res.json({ inventario });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ AGREGAR ITEM AL INVENTARIO ============
router.post('/agregar-item', verificarToken, async (req, res) => {
    try {
        const { item_id, cantidad = 1, usuario_destino_id } = req.body;

        // Determinar a quién agregar el item
        let usuario_id = req.usuario._id;
        if (usuario_destino_id) {
            // Solo profesores y admins pueden dar items a otros
            if (req.usuario.rol !== 'profesor' && req.usuario.rol !== 'admin') {
                return res.status(403).json({ error: 'Sin permisos para dar items a otros usuarios' });
            }
            usuario_id = usuario_destino_id;
        }

        const item = await Item.findById(item_id);
        if (!item) {
            return res.status(404).json({ error: 'Item no encontrado' });
        }

        const personaje = await Personaje.findOne({ usuario_id });
        if (!personaje) {
            return res.status(404).json({ error: 'Personaje no encontrado' });
        }

        // Verificar nivel mínimo
        if (personaje.nivel < item.nivel_minimo) {
            return res.status(400).json({ 
                error: `Nivel insuficiente. Necesitas nivel ${item.nivel_minimo}` 
            });
        }

        const inventario = await Inventario.findOne({ personaje_id: personaje._id });
        if (!inventario) {
            return res.status(404).json({ error: 'Inventario no encontrado' });
        }

        // Verificar capacidad
        const capacidadUsada = inventario.items.reduce((total, item) => total + item.cantidad, 0);
        if (capacidadUsada + cantidad > inventario.capacidad_max) {
            return res.status(400).json({ 
                error: 'Inventario lleno. Espacio disponible: ' + (inventario.capacidad_max - capacidadUsada)
            });
        }

        // Verificar si el item ya existe en el inventario
        const itemExistente = inventario.items.find(
            invItem => invItem.item_id.toString() === item_id
        );

        if (itemExistente && item.apilable) {
            // Si existe y es apilable, aumentar cantidad
            itemExistente.cantidad += cantidad;
        } else if (itemExistente && !item.apilable) {
            return res.status(400).json({ error: 'Este item no es apilable' });
        } else {
            // Si no existe, agregar nuevo
            inventario.items.push({
                item_id: item_id,
                cantidad: cantidad,
                fecha_obtenido: new Date()
            });
        }

        await inventario.save();

        // Registrar en historial
        await new HistorialAccion({
            usuario_origen: req.usuario._id,
            usuario_destino: usuario_id,
            tipo_accion: 'agregar_item',
            valor: cantidad,
            razon: `Item "${item.nombre}" agregado (x${cantidad})`,
            fecha: new Date(),
            contexto: {
                item_id: item._id
            }
        }).save();

        res.json({
            message: `✅ ${item.nombre} agregado al inventario (x${cantidad})`,
            inventario: await inventario.populate('items.item_id', 'nombre icono rareza')
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ USAR ITEM ============
router.post('/usar-item', verificarToken, async (req, res) => {
    try {
        const { item_id, cantidad = 1 } = req.body;

        const personaje = await Personaje.findOne({ usuario_id: req.usuario._id });
        if (!personaje) {
            return res.status(404).json({ error: 'Personaje no encontrado' });
        }

        const inventario = await Inventario.findOne({ personaje_id: personaje._id });
        if (!inventario) {
            return res.status(404).json({ error: 'Inventario no encontrado' });
        }

        const itemInventario = inventario.items.find(
            invItem => invItem.item_id.toString() === item_id
        );

        if (!itemInventario) {
            return res.status(404).json({ error: 'No tienes este item' });
        }

        if (itemInventario.cantidad < cantidad) {
            return res.status(400).json({ 
                error: `No tienes suficientes. Tienes: ${itemInventario.cantidad}` 
            });
        }

        const item = await Item.findById(item_id);
        if (!item) {
            return res.status(404).json({ error: 'Item no encontrado' });
        }

        // Aplicar efectos del item
        let efectosAplicados = [];
        for (const efecto of item.efectos) {
            switch (efecto.tipo) {
                case 'curacion':
                    const saludAnterior = personaje.salud_actual;
                    personaje.salud_actual = Math.min(
                        personaje.salud_actual + (efecto.valor * cantidad),
                        personaje.salud_maxima
                    );
                    efectosAplicados.push({
                        tipo: 'curacion',
                        valor: personaje.salud_actual - saludAnterior
                    });
                    break;
                    
                case 'energia':
                    const energiaAnterior = personaje.energia_actual;
                    personaje.energia_actual = Math.min(
                        personaje.energia_actual + (efecto.valor * cantidad),
                        personaje.energia_maxima
                    );
                    efectosAplicados.push({
                        tipo: 'energia',
                        valor: personaje.energia_actual - energiaAnterior
                    });
                    break;
                    
                case 'xp':
                    const usuario = await Usuario.findById(req.usuario._id);
                    usuario.experiencia += efecto.valor * cantidad;
                    await usuario.save();
                    efectosAplicados.push({
                        tipo: 'xp',
                        valor: efecto.valor * cantidad
                    });
                    break;
            }
        }

        await personaje.save();

        // Reducir cantidad del item
        itemInventario.cantidad -= cantidad;
        if (itemInventario.cantidad <= 0) {
            inventario.items = inventario.items.filter(
                invItem => invItem.item_id.toString() !== item_id
            );
        }

        await inventario.save();

        // Registrar en historial
        await new HistorialAccion({
            usuario_origen: req.usuario._id,
            usuario_destino: req.usuario._id,
            tipo_accion: 'usar_item',
            valor: cantidad,
            razon: `Usó "${item.nombre}" (x${cantidad})`,
            fecha: new Date(),
            contexto: {
                item_id: item._id
            }
        }).save();

        res.json({
            message: `✅ ${item.nombre} usado exitosamente (x${cantidad})`,
            efectos_aplicados: efectosAplicados,
            personaje_actualizado: {
                salud_actual: personaje.salud_actual,
                energia_actual: personaje.energia_actual
            }
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ QUITAR ITEM DEL INVENTARIO ============
router.delete('/quitar-item', verificarToken, async (req, res) => {
    try {
        const { item_id, cantidad = 1, usuario_objetivo_id } = req.body;

        // Determinar de quién quitar el item
        let usuario_id = req.usuario._id;
        if (usuario_objetivo_id) {
            // Solo profesores y admins pueden quitar items a otros
            if (req.usuario.rol !== 'profesor' && req.usuario.rol !== 'admin') {
                return res.status(403).json({ error: 'Sin permisos para quitar items a otros usuarios' });
            }
            usuario_id = usuario_objetivo_id;
        }

        const personaje = await Personaje.findOne({ usuario_id });
        if (!personaje) {
            return res.status(404).json({ error: 'Personaje no encontrado' });
        }

        const inventario = await Inventario.findOne({ personaje_id: personaje._id });
        if (!inventario) {
            return res.status(404).json({ error: 'Inventario no encontrado' });
        }

        const itemInventario = inventario.items.find(
            invItem => invItem.item_id.toString() === item_id
        );

        if (!itemInventario) {
            return res.status(404).json({ error: 'Item no encontrado en inventario' });
        }

        if (itemInventario.cantidad < cantidad) {
            return res.status(400).json({ 
                error: `Cantidad insuficiente. Disponible: ${itemInventario.cantidad}` 
            });
        }

        const item = await Item.findById(item_id);

        // Reducir cantidad
        itemInventario.cantidad -= cantidad;
        if (itemInventario.cantidad <= 0) {
            inventario.items = inventario.items.filter(
                invItem => invItem.item_id.toString() !== item_id
            );
        }

        await inventario.save();

        // Registrar en historial
        await new HistorialAccion({
            usuario_origen: req.usuario._id,
            usuario_destino: usuario_id,
            tipo_accion: 'quitar_item',
            valor: -cantidad,
            razon: `Item "${item.nombre}" removido (x${cantidad})`,
            fecha: new Date(),
            contexto: {
                item_id: item._id
            }
        }).save();

        res.json({
            message: `✅ ${item.nombre} removido del inventario (x${cantidad})`
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ GESTIONAR MONEDAS ============
router.post('/monedas', verificarToken, async (req, res) => {
    try {
        const { cantidad, operacion, usuario_objetivo_id, razon = '' } = req.body;

        // Validar operación
        if (!['agregar', 'quitar', 'establecer'].includes(operacion)) {
            return res.status(400).json({ error: 'Operación inválida' });
        }

        // Determinar usuario objetivo
        let usuario_id = req.usuario._id;
        if (usuario_objetivo_id) {
            // Solo profesores y admins pueden gestionar monedas de otros
            if (req.usuario.rol !== 'profesor' && req.usuario.rol !== 'admin') {
                return res.status(403).json({ error: 'Sin permisos para gestionar monedas de otros' });
            }
            usuario_id = usuario_objetivo_id;
        }

        const personaje = await Personaje.findOne({ usuario_id });
        if (!personaje) {
            return res.status(404).json({ error: 'Personaje no encontrado' });
        }

        const inventario = await Inventario.findOne({ personaje_id: personaje._id });
        if (!inventario) {
            return res.status(404).json({ error: 'Inventario no encontrado' });
        }

        const monedasAnteriores = inventario.monedas;
        
        switch (operacion) {
            case 'agregar':
                inventario.monedas += cantidad;
                break;
            case 'quitar':
                inventario.monedas = Math.max(0, inventario.monedas - cantidad);
                break;
            case 'establecer':
                inventario.monedas = Math.max(0, cantidad);
                break;
        }

        await inventario.save();

        // Registrar en historial
        await new HistorialAccion({
            usuario_origen: req.usuario._id,
            usuario_destino: usuario_id,
            tipo_accion: `${operacion}_monedas`,
            valor: inventario.monedas - monedasAnteriores,
            razon: razon || `Monedas ${operacion}: ${monedasAnteriores} → ${inventario.monedas}`,
            fecha: new Date()
        }).save();

        res.json({
            message: `✅ Monedas ${operacion} exitosamente`,
            monedas_anteriores: monedasAnteriores,
            monedas_actuales: inventario.monedas,
            diferencia: inventario.monedas - monedasAnteriores
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ EXPANDIR CAPACIDAD INVENTARIO ============
router.post('/expandir-capacidad', verificarToken, async (req, res) => {
    try {
        const { slots_adicionales, costo_monedas } = req.body;

        const personaje = await Personaje.findOne({ usuario_id: req.usuario._id });
        if (!personaje) {
            return res.status(404).json({ error: 'Personaje no encontrado' });
        }

        const inventario = await Inventario.findOne({ personaje_id: personaje._id });
        if (!inventario) {
            return res.status(404).json({ error: 'Inventario no encontrado' });
        }

        // Verificar monedas suficientes
        if (inventario.monedas < costo_monedas) {
            return res.status(400).json({ 
                error: `Monedas insuficientes. Necesitas: ${costo_monedas}, Tienes: ${inventario.monedas}` 
            });
        }

        // Expandir capacidad
        const capacidadAnterior = inventario.capacidad_max;
        inventario.capacidad_max += slots_adicionales;
        inventario.monedas -= costo_monedas;

        await inventario.save();

        // Registrar en historial
        await new HistorialAccion({
            usuario_origen: req.usuario._id,
            usuario_destino: req.usuario._id,
            tipo_accion: 'expandir_inventario',
            valor: slots_adicionales,
            razon: `Inventario expandido: ${capacidadAnterior} → ${inventario.capacidad_max} slots`,
            fecha: new Date()
        }).save();

        res.json({
            message: `✅ Inventario expandido en ${slots_adicionales} slots`,
            capacidad_anterior: capacidadAnterior,
            capacidad_nueva: inventario.capacidad_max,
            monedas_gastadas: costo_monedas,
            monedas_restantes: inventario.monedas
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ OBTENER TODOS LOS ITEMS DISPONIBLES ============
router.get('/items-disponibles', verificarToken, async (req, res) => {
    try {
        const { tipo, rareza, nivel_max } = req.query;

        let filtro = {};
        if (tipo) filtro.tipo = tipo;
        if (rareza) filtro.rareza = rareza;
        if (nivel_max) filtro.nivel_minimo = { $lte: parseInt(nivel_max) };

        const items = await Item.find(filtro).sort({ nivel_minimo: 1, nombre: 1 });

        res.json({
            items: items,
            filtros_aplicados: { tipo, rareza, nivel_max },
            total_items: items.length
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ ESTADÍSTICAS DE INVENTARIOS (Admin/Profesor) ============
router.get('/estadisticas', verificarToken, async (req, res) => {
    try {
        // Solo admins y profesores
        if (req.usuario.rol !== 'admin' && req.usuario.rol !== 'profesor') {
            return res.status(403).json({ error: 'Sin permisos para ver estadísticas' });
        }

        const stats = await Inventario.aggregate([
            {
                $project: {
                    monedas: 1,
                    capacidad_max: 1,
                    total_items: { $size: '$items' },
                    items: 1
                }
            },
            {
                $group: {
                    _id: null,
                    total_inventarios: { $sum: 1 },
                    monedas_promedio: { $avg: '$monedas' },
                    monedas_total: { $sum: '$monedas' },
                    capacidad_promedio: { $avg: '$capacidad_max' },
                    items_promedio: { $avg: '$total_items' }
                }
            }
        ]);

        // Items más populares
        const itemsPopulares = await Inventario.aggregate([
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.item_id',
                    total_cantidad: { $sum: '$items.cantidad' },
                    usuarios_que_lo_tienen: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: 'items',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'item_info'
                }
            },
            { $unwind: '$item_info' },
            {
                $project: {
                    nombre: '$item_info.nombre',
                    total_cantidad: 1,
                    usuarios_que_lo_tienen: 1
                }
            },
            { $sort: { usuarios_que_lo_tienen: -1 } },
            { $limit: 10 }
        ]);

        res.json({
            estadisticas_generales: stats[0] || {},
            items_mas_populares: itemsPopulares
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;