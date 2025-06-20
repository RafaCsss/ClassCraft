/**
 * SCRIPT FIX FINAL: Sincronizar equipos con usuario_id a personaje_id
 */

const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/classcraft', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const Personaje = require('../models/personaje');
const Equipo = require('../models/equipo');
const Usuario = require('../models/usuario');

async function sincronizarEquiposUsuarioAPersonaje() {
    console.log('🔧 SINCRONIZANDO EQUIPOS: usuario_id → personaje_id');
    console.log('=' .repeat(60));
    
    try {
        let reparacionesHechas = 0;
        
        // 1. Obtener todos los equipos
        const equipos = await Equipo.find({}).populate('clase_id');
        console.log(`📊 Equipos encontrados: ${equipos.length}`);
        
        for (const equipo of equipos) {
            console.log(`\n🏆 Procesando equipo: ${equipo.nombre}`);
            console.log(`   Miembros actuales: ${equipo.miembros.length}`);
            
            if (equipo.miembros.length === 0) {
                console.log(`   ⏭️ Equipo vacío, saltando...`);
                continue;
            }
            
            const nuevosMiembros = [];
            let cambiosRealizados = false;
            
            // 2. Procesar cada miembro
            for (const miembroId of equipo.miembros) {
                console.log(`   🔍 Procesando miembro: ${miembroId}`);
                
                // Verificar si es un personaje_id válido
                const personajePorId = await Personaje.findById(miembroId).populate('usuario_id', 'nombre');
                
                if (personajePorId) {
                    // Es un personaje_id válido
                    console.log(`   ✅ Es personaje_id válido: ${personajePorId.usuario_id?.nombre}`);
                    nuevosMiembros.push(miembroId);
                    
                    // Actualizar referencias en el personaje
                    if (equipo.clase_id) {
                        // Equipo de clase - actualizar equipos_por_clase
                        if (!personajePorId.equipos_por_clase) {
                            personajePorId.equipos_por_clase = [];
                        }
                        
                        const tieneEntrada = personajePorId.equipos_por_clase.some(epc => 
                            epc.equipo_id?.toString() === equipo._id.toString() && 
                            epc.clase_id?.toString() === equipo.clase_id._id.toString()
                        );
                        
                        if (!tieneEntrada) {
                            personajePorId.equipos_por_clase.push({
                                clase_id: equipo.clase_id._id,
                                equipo_id: equipo._id,
                                fecha_union: new Date()
                            });
                            await personajePorId.save();
                            console.log(`   🔧 Agregado a equipos_por_clase`);
                            reparacionesHechas++;
                        }
                    } else {
                        // Equipo global - actualizar equipo_id
                        if (!personajePorId.equipo_id || personajePorId.equipo_id.toString() !== equipo._id.toString()) {
                            personajePorId.equipo_id = equipo._id;
                            await personajePorId.save();
                            console.log(`   🔧 Actualizado equipo_id global`);
                            reparacionesHechas++;
                        }
                    }
                } else {
                    // No es personaje_id, verificar si es usuario_id
                    const usuario = await Usuario.findById(miembroId);
                    
                    if (usuario) {
                        console.log(`   🔄 Es usuario_id, buscando personaje: ${usuario.nombre}`);
                        
                        const personajeDelUsuario = await Personaje.findOne({ usuario_id: miembroId });
                        
                        if (personajeDelUsuario) {
                            console.log(`   ✅ Personaje encontrado: ${personajeDelUsuario._id}`);
                            nuevosMiembros.push(personajeDelUsuario._id); // Usar personaje_id
                            cambiosRealizados = true;
                            
                            // Actualizar referencias en el personaje
                            if (equipo.clase_id) {
                                // Equipo de clase
                                if (!personajeDelUsuario.equipos_por_clase) {
                                    personajeDelUsuario.equipos_por_clase = [];
                                }
                                
                                const tieneEntrada = personajeDelUsuario.equipos_por_clase.some(epc => 
                                    epc.equipo_id?.toString() === equipo._id.toString() && 
                                    epc.clase_id?.toString() === equipo.clase_id._id.toString()
                                );
                                
                                if (!tieneEntrada) {
                                    personajeDelUsuario.equipos_por_clase.push({
                                        clase_id: equipo.clase_id._id,
                                        equipo_id: equipo._id,
                                        fecha_union: new Date()
                                    });
                                    await personajeDelUsuario.save();
                                    console.log(`   🔧 Agregado a equipos_por_clase`);
                                    reparacionesHechas++;
                                }
                            } else {
                                // Equipo global
                                if (!personajeDelUsuario.equipo_id || personajeDelUsuario.equipo_id.toString() !== equipo._id.toString()) {
                                    personajeDelUsuario.equipo_id = equipo._id;
                                    await personajeDelUsuario.save();
                                    console.log(`   🔧 Actualizado equipo_id global`);
                                    reparacionesHechas++;
                                }
                            }
                        } else {
                            console.log(`   ❌ Usuario no tiene personaje - removiendo del equipo`);
                            cambiosRealizados = true;
                            // No agregar a nuevosMiembros (lo elimina del equipo)
                        }
                    } else {
                        console.log(`   💥 ID no válido - removiendo del equipo`);
                        cambiosRealizados = true;
                        // No agregar a nuevosMiembros (lo elimina del equipo)
                    }
                }
            }
            
            // 3. Actualizar el equipo si hubo cambios
            if (cambiosRealizados) {
                equipo.miembros = nuevosMiembros;
                await equipo.save();
                console.log(`   ✅ Equipo actualizado: ${nuevosMiembros.length} miembros válidos`);
                reparacionesHechas++;
            }
        }
        
        console.log(`\n📊 RESUMEN:`);
        console.log(`   ✅ Reparaciones realizadas: ${reparacionesHechas}`);
        
        // 4. Verificación final
        console.log(`\n${'=' .repeat(60)}`);
        console.log('🔍 VERIFICACIÓN FINAL');
        
        const equiposFinal = await Equipo.find({}).populate('clase_id');
        
        for (const equipo of equiposFinal) {
            const miembrosReales = [];
            
            for (const miembroId of equipo.miembros) {
                const personaje = await Personaje.findById(miembroId).populate('usuario_id', 'nombre');
                if (personaje) {
                    miembrosReales.push(personaje.usuario_id?.nombre || 'Sin nombre');
                }
            }
            
            console.log(`🏆 ${equipo.nombre} (${equipo.clase_id?.nombre || 'Global'}): ${miembrosReales.length}/4 miembros`);
            if (miembrosReales.length > 0) {
                console.log(`   ${miembrosReales.join(', ')}`);
            }
        }
        
    } catch (error) {
        console.error('💥 ERROR:', error);
    }
}

// Ejecutar
sincronizarEquiposUsuarioAPersonaje()
    .then(() => {
        console.log('\n✨ Sincronización completada');
        process.exit(0);
    })
    .catch(console.error);
