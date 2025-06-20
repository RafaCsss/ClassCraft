/**
 * SCRIPT FIX: Reparar equipos que tienen miembros en array pero personajes sin equipo_id
 */

const mongoose = require('mongoose');

// Conectar a MongoDB
mongoose.connect('mongodb://localhost:27017/classcraft', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const Personaje = require('../models/personaje');
const Equipo = require('../models/equipo');
const Usuario = require('../models/usuario');

async function repararEquiposSinMiembros() {
    console.log('🔧 REPARANDO EQUIPOS SIN MIEMBROS VISIBLES');
    console.log('=' .repeat(60));
    
    try {
        let reparacionesHechas = 0;
        
        // 1. Encontrar todos los equipos
        const equipos = await Equipo.find({}).populate('clase_id', 'nombre codigo_clase');
        console.log(`📊 Equipos encontrados: ${equipos.length}`);
        
        for (const equipo of equipos) {
            console.log(`\n🏆 Procesando equipo: ${equipo.nombre}`);
            console.log(`   Miembros en array: ${equipo.miembros.length}`);
            
            if (equipo.miembros.length === 0) {
                console.log(`   ⏭️ Equipo vacío, saltando...`);
                continue;
            }
            
            // 2. Verificar cada miembro del equipo
            for (const miembroId of equipo.miembros) {
                const personaje = await Personaje.findById(miembroId).populate('usuario_id', 'nombre');
                
                if (!personaje) {
                    console.log(`   ❌ Miembro ${miembroId} no existe - limpiando del equipo`);
                    equipo.miembros = equipo.miembros.filter(id => id.toString() !== miembroId.toString());
                    await equipo.save();
                    reparacionesHechas++;
                    continue;
                }
                
                console.log(`   👤 Verificando: ${personaje.usuario_id?.nombre || 'Sin nombre'}`);
                
                let necesitaReparacion = false;
                
                // 3. Verificar sistema según tipo de equipo
                if (equipo.clase_id) {
                    // Equipo de clase - verificar equipos_por_clase
                    const tieneEntrada = personaje.equipos_por_clase?.some(epc => 
                        epc.equipo_id?.toString() === equipo._id.toString() && 
                        epc.clase_id?.toString() === equipo.clase_id._id.toString()
                    );
                    
                    if (!tieneEntrada) {
                        console.log(`   🔧 Agregando entrada en equipos_por_clase`);
                        
                        if (!personaje.equipos_por_clase) {
                            personaje.equipos_por_clase = [];
                        }
                        
                        personaje.equipos_por_clase.push({
                            clase_id: equipo.clase_id._id,
                            equipo_id: equipo._id,
                            fecha_union: new Date()
                        });
                        
                        necesitaReparacion = true;
                    }
                } else {
                    // Equipo global - verificar equipo_id
                    if (!personaje.equipo_id || personaje.equipo_id.toString() !== equipo._id.toString()) {
                        console.log(`   🔧 Asignando equipo_id global`);
                        personaje.equipo_id = equipo._id;
                        necesitaReparacion = true;
                    }
                }
                
                // 4. Guardar cambios si es necesario
                if (necesitaReparacion) {
                    await personaje.save();
                    reparacionesHechas++;
                    console.log(`   ✅ Personaje reparado`);
                } else {
                    console.log(`   ✅ Personaje ya está correcto`);
                }
            }
        }
        
        // 5. Verificar huérfanos (personajes con equipo_id pero equipo no los tiene)
        console.log(`\n${'=' .repeat(60)}`);
        console.log('🔍 VERIFICANDO PERSONAJES HUÉRFANOS');
        
        const personajes = await Personaje.find({}).populate('usuario_id', 'nombre');
        
        for (const personaje of personajes) {
            // Verificar equipo_id huérfano
            if (personaje.equipo_id) {
                const equipo = await Equipo.findById(personaje.equipo_id);
                if (!equipo) {
                    console.log(`❌ ${personaje.usuario_id?.nombre}: equipo_id ${personaje.equipo_id} no existe - limpiando`);
                    personaje.equipo_id = null;
                    await personaje.save();
                    reparacionesHechas++;
                } else if (!equipo.miembros.includes(personaje._id)) {
                    console.log(`❌ ${personaje.usuario_id?.nombre}: no está en miembros del equipo ${equipo.nombre} - agregando`);
                    equipo.miembros.push(personaje._id);
                    await equipo.save();
                    reparacionesHechas++;
                }
            }
            
            // Verificar equipos_por_clase huérfanos
            if (personaje.equipos_por_clase && personaje.equipos_por_clase.length > 0) {
                const equiposValidos = [];
                
                for (const epc of personaje.equipos_por_clase) {
                    const equipo = await Equipo.findById(epc.equipo_id);
                    if (!equipo) {
                        console.log(`❌ ${personaje.usuario_id?.nombre}: equipo ${epc.equipo_id} en equipos_por_clase no existe - removiendo`);
                        reparacionesHechas++;
                    } else if (!equipo.miembros.includes(personaje._id)) {
                        console.log(`❌ ${personaje.usuario_id?.nombre}: no está en miembros del equipo ${equipo.nombre} - agregando`);
                        equipo.miembros.push(personaje._id);
                        await equipo.save();
                        equiposValidos.push(epc);
                        reparacionesHechas++;
                    } else {
                        equiposValidos.push(epc);
                    }
                }
                
                if (equiposValidos.length !== personaje.equipos_por_clase.length) {
                    personaje.equipos_por_clase = equiposValidos;
                    await personaje.save();
                }
            }
        }
        
        console.log(`\n📊 RESUMEN DE REPARACIÓN:`);
        console.log(`   ✅ Reparaciones realizadas: ${reparacionesHechas}`);
        
        // 6. Verificación final
        console.log(`\n${'=' .repeat(60)}`);
        console.log('🔍 VERIFICACIÓN FINAL');
        
        const equiposFinal = await Equipo.find({}).populate('clase_id', 'nombre');
        
        for (const equipo of equiposFinal) {
            const miembrosReales = [];
            
            for (const miembroId of equipo.miembros) {
                const personaje = await Personaje.findById(miembroId).populate('usuario_id', 'nombre');
                if (personaje) {
                    miembrosReales.push(personaje.usuario_id?.nombre || 'Sin nombre');
                }
            }
            
            console.log(`🏆 ${equipo.nombre}: ${miembrosReales.length}/4 miembros`);
            if (miembrosReales.length > 0) {
                console.log(`   ${miembrosReales.join(', ')}`);
            }
        }
        
    } catch (error) {
        console.error('💥 ERROR:', error);
    }
}

// Ejecutar
repararEquiposSinMiembros()
    .then(() => {
        console.log('\n✨ Reparación completada');
        process.exit(0);
    })
    .catch(console.error);
