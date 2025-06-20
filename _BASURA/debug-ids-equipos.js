/**
 * SCRIPT FIX ESPECÍFICO: Verificar y corregir IDs en equipos
 */

const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/classcraft', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const Personaje = require('../models/personaje');
const Equipo = require('../models/equipo');
const Usuario = require('../models/usuario');

async function debugIdsEquipos() {
    console.log('🔍 VERIFICANDO IDS DE EQUIPOS VS PERSONAJES');
    console.log('=' .repeat(60));
    
    try {
        // 1. Obtener equipos "Historia 1" e "Historia 2"
        const equipos = await Equipo.find({ 
            nombre: { $in: ['Historia 1', 'Historia 2'] } 
        }).populate('clase_id');
        
        console.log(`📊 Equipos Historia encontrados: ${equipos.length}`);
        
        for (const equipo of equipos) {
            console.log(`\n🏆 EQUIPO: ${equipo.nombre}`);
            console.log(`   ID del equipo: ${equipo._id}`);
            console.log(`   Clase: ${equipo.clase_id?.nombre || 'Global'}`);
            console.log(`   Miembros en array: ${equipo.miembros.length}`);
            
            for (let i = 0; i < equipo.miembros.length; i++) {
                const miembroId = equipo.miembros[i];
                console.log(`\n   🔍 Miembro ${i + 1}: ${miembroId}`);
                console.log(`      Tipo: ${typeof miembroId}`);
                
                // Buscar por ID exacto
                const personajePorId = await Personaje.findById(miembroId)
                    .populate('usuario_id', 'nombre email');
                
                if (personajePorId) {
                    console.log(`      ✅ Encontrado por ID: ${personajePorId.usuario_id?.nombre}`);
                    console.log(`      📧 Email: ${personajePorId.usuario_id?.email}`);
                    console.log(`      🆔 Usuario ID: ${personajePorId.usuario_id?._id}`);
                    console.log(`      🎭 Personaje ID: ${personajePorId._id}`);
                    console.log(`      🏠 equipo_id actual: ${personajePorId.equipo_id || 'undefined'}`);
                    console.log(`      📚 equipos_por_clase: ${personajePorId.equipos_por_clase?.length || 0} entradas`);
                } else {
                    console.log(`      ❌ NO encontrado por ID directo`);
                    
                    // Buscar si el ID se refiere a un usuario en lugar de personaje
                    const usuarioPorId = await Usuario.findById(miembroId);
                    if (usuarioPorId) {
                        console.log(`      🔄 PROBLEMA: ID corresponde a USUARIO, no PERSONAJE`);
                        console.log(`      👤 Usuario: ${usuarioPorId.nombre} (${usuarioPorId.email})`);
                        
                        // Buscar el personaje de este usuario
                        const personajeDelUsuario = await Personaje.findOne({ usuario_id: miembroId })
                            .populate('usuario_id', 'nombre email');
                        
                        if (personajeDelUsuario) {
                            console.log(`      ✅ Personaje encontrado: ${personajeDelUsuario._id}`);
                            console.log(`      🔧 SOLUCIÓN: Reemplazar ${miembroId} con ${personajeDelUsuario._id}`);
                        } else {
                            console.log(`      ❌ Usuario no tiene personaje creado`);
                        }
                    } else {
                        console.log(`      💥 ID no existe ni como usuario ni como personaje`);
                    }
                }
            }
        }
        
        // 2. Verificar personajes de Ana López y vanilo
        console.log(`\n${'=' .repeat(60)}`);
        console.log('👥 VERIFICANDO PERSONAJES ESPECÍFICOS');
        
        const usuariosTarget = await Usuario.find({
            nombre: { $in: ['Ana López', 'vanilo'] }
        });
        
        for (const usuario of usuariosTarget) {
            console.log(`\n👤 USUARIO: ${usuario.nombre}`);
            console.log(`   ID: ${usuario._id}`);
            console.log(`   Email: ${usuario.email}`);
            
            const personaje = await Personaje.findOne({ usuario_id: usuario._id });
            
            if (personaje) {
                console.log(`   ✅ Tiene personaje: ${personaje._id}`);
                console.log(`   🏠 equipo_id: ${personaje.equipo_id || 'undefined'}`);
                console.log(`   📚 equipos_por_clase: ${personaje.equipos_por_clase?.length || 0} entradas`);
                
                // Buscar en qué equipos aparece
                const equiposQueLoTienen = await Equipo.find({ 
                    miembros: { $in: [usuario._id, personaje._id] }
                });
                
                console.log(`   🔍 Aparece en equipos (por cualquier ID): ${equiposQueLoTienen.length}`);
                equiposQueLoTienen.forEach(eq => {
                    const tieneUsuarioId = eq.miembros.includes(usuario._id);
                    const tienePersonajeId = eq.miembros.includes(personaje._id);
                    console.log(`      - ${eq.nombre}: usuario_id=${tieneUsuarioId}, personaje_id=${tienePersonajeId}`);
                });
            } else {
                console.log(`   ❌ NO tiene personaje`);
            }
        }
        
    } catch (error) {
        console.error('💥 ERROR:', error);
    }
}

// Ejecutar
debugIdsEquipos()
    .then(() => {
        console.log('\n✨ Debug de IDs completado');
        process.exit(0);
    })
    .catch(console.error);
