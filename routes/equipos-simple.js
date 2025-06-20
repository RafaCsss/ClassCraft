const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middleware/auth');
const Equipo = require('../models/equipo');
const Personaje = require('../models/personaje');
const Usuario = require('../models/usuario');
const Clase = require('../models/clase');

// ============ ENDPOINT SIMPLE QUE FUNCIONA ============
// Estrategia: Query crudo de MongoDB, sin populate, construir manualmente
router.get('/simple', verificarToken, async (req, res) => {
    try {
        const { clase_id } = req.query;
        
        console.log('🔥 ENDPOINT SIMPLE - Iniciando...');
        console.log('Clase ID solicitada:', clase_id);
        console.log('Usuario rol:', req.usuario.rol);

        // 1. Obtener equipos SIN populate (crudo)
        let filtroEquipos = {};
        if (req.usuario.rol === 'profesor') {
            filtroEquipos.profesor_id = req.usuario._id;
            if (clase_id) {
                filtroEquipos.clase_id = clase_id;
            }
        }

        const equiposCrudos = await Equipo.find(filtroEquipos).lean(); // .lean() = JSON plano
        console.log('📦 Equipos crudos encontrados:', equiposCrudos.length);

        // 2. Para cada equipo, buscar miembros MANUALMENTE
        const equiposProcesados = [];
        
        for (const equipo of equiposCrudos) {
            console.log(`\n🏆 Procesando equipo: ${equipo.nombre}`);
            console.log(`   - ID del equipo: ${equipo._id}`);
            console.log(`   - Miembros array: [${equipo.miembros.join(', ')}]`);
            
            // 3. Buscar personajes que están en este equipo
            const miembrosDetalle = [];
            
            for (const miembroId of equipo.miembros) {
                console.log(`   🔍 Buscando miembro: ${miembroId}`);
                
                // Buscar personaje por _id directamente
                const personaje = await Personaje.findById(miembroId).lean();
                if (!personaje) {
                    console.log(`   ❌ Personaje no encontrado para ID: ${miembroId}`);
                    continue;
                }
                
                // Buscar usuario del personaje
                const usuario = await Usuario.findById(personaje.usuario_id).lean();
                if (!usuario) {
                    console.log(`   ❌ Usuario no encontrado para personaje: ${miembroId}`);
                    continue;
                }
                
                console.log(`   ✅ Miembro encontrado: ${usuario.nombre}`);
                
                // Construir objeto miembro con IDs como STRINGS
                const miembroData = {
                    id: personaje._id.toString(),
                    personaje_id: personaje._id.toString(),
                    usuario_id: usuario._id.toString(),
                    nombre: usuario.nombre,
                    email: usuario.email,
                    nivel: usuario.nivel || 1,
                    experiencia: usuario.experiencia || 0,
                    salud_actual: personaje.salud_actual || 0,
                    salud_maxima: personaje.salud_maxima || 100,
                    energia_actual: personaje.energia_actual || 0,
                    energia_maxima: personaje.energia_maxima || 100
                };
                
                miembrosDetalle.push(miembroData);
            }
            
            console.log(`   📊 Total miembros procesados: ${miembrosDetalle.length}`);
            
            // 4. Buscar información de la clase si existe
            let claseInfo = null;
            if (equipo.clase_id) {
                const clase = await Clase.findById(equipo.clase_id).lean();
                if (clase) {
                    claseInfo = {
                        id: clase._id.toString(),
                        nombre: clase.nombre,
                        codigo: clase.codigo_clase
                    };
                    console.log(`   📚 Clase encontrada: ${clase.nombre} (${clase.codigo_clase})`);
                } else {
                    console.log(`   ❌ Clase no encontrada para ID: ${equipo.clase_id}`);
                }
            }

            // 5. Buscar información del profesor
            let profesorInfo = null;
            if (equipo.profesor_id) {
                const profesor = await Usuario.findById(equipo.profesor_id).lean();
                if (profesor) {
                    profesorInfo = {
                        id: profesor._id.toString(),
                        nombre: profesor.nombre,
                        email: profesor.email
                    };
                    console.log(`   👨‍🏫 Profesor encontrado: ${profesor.nombre}`);
                } else {
                    console.log(`   ❌ Profesor no encontrado para ID: ${equipo.profesor_id}`);
                }
            }
            
            // 6. Construir equipo con IDs como STRINGS
            const equipoProcesado = {
                id: equipo._id.toString(),
                nombre: equipo.nombre,
                puntos: equipo.puntos || 0,
                profesor_id: equipo.profesor_id.toString(),
                profesor_info: profesorInfo, // 🔥 INFORMACIÓN DEL PROFESOR AÑADIDA
                clase_id: equipo.clase_id ? equipo.clase_id.toString() : null,
                clase_info: claseInfo, // 🔥 INFORMACIÓN DE LA CLASE AÑADIDA
                miembros: miembrosDetalle,
                cantidad_miembros: miembrosDetalle.length,
                espacios_disponibles: 4 - miembrosDetalle.length,
                puede_unirse: req.usuario.rol === 'estudiante' && miembrosDetalle.length < 4,
                configuracion: equipo.configuracion || {},
                estadisticas: equipo.estadisticas || {}
            };
            
            equiposProcesados.push(equipoProcesado);
        }
        
        console.log('\n🎉 RESULTADO FINAL:');
        console.log(`Total equipos procesados: ${equiposProcesados.length}`);
        
        // Log de ejemplo para verificar tipos
        if (equiposProcesados.length > 0) {
            const ejemplo = equiposProcesados[0];
            console.log('📋 Ejemplo de equipo procesado:');
            console.log(`   - ID: ${ejemplo.id} (tipo: ${typeof ejemplo.id})`);
            console.log(`   - Miembros: ${ejemplo.miembros.length}`);
            if (ejemplo.miembros.length > 0) {
                console.log(`   - Primer miembro ID: ${ejemplo.miembros[0].id} (tipo: ${typeof ejemplo.miembros[0].id})`);
            }
        }

        res.json({
            success: true,
            version: 'simple',
            total_equipos: equiposProcesados.length,
            equipos: equiposProcesados,
            debug: {
                clase_id: clase_id || null,
                filtro_aplicado: filtroEquipos,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('💥 ERROR en endpoint simple:', error);
        res.status(500).json({ 
            error: error.message,
            stack: error.stack 
        });
    }
});

module.exports = router;
