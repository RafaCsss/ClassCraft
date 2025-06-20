/**
 * SCRIPT DEBUG: Verificar datos de equipos y personajes
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

async function debugDatosEquipos() {
    console.log('🔍 DEBUGGING DATOS DE EQUIPOS Y PERSONAJES');
    console.log('=' .repeat(60));
    
    try {
        // 1. Buscar todos los equipos
        const equipos = await Equipo.find({})
            .populate('clase_id', 'nombre codigo_clase')
            .populate('profesor_id', 'nombre');
        
        console.log(`📊 Total equipos encontrados: ${equipos.length}`);
        
        for (const equipo of equipos) {
            console.log(`\n🏆 EQUIPO: ${equipo.nombre}`);
            console.log(`   ID: ${equipo._id}`);
            console.log(`   Profesor: ${equipo.profesor_id?.nombre || 'Sin profesor'}`);
            console.log(`   Clase: ${equipo.clase_id?.nombre || 'Global'} (${equipo.clase_id?.codigo_clase || 'N/A'})`);
            console.log(`   Miembros en array: ${equipo.miembros.length}`);
            console.log(`   IDs de miembros: ${equipo.miembros.map(m => m.toString())}`);
            
            // Verificar cada miembro
            for (const miembroId of equipo.miembros) {
                const personaje = await Personaje.findById(miembroId)
                    .populate('usuario_id', 'nombre email');
                
                if (personaje) {
                    console.log(`   ✅ Miembro encontrado: ${personaje.usuario_id?.nombre || 'Sin nombre'}`);
                    console.log(`      - equipo_id (viejo): ${personaje.equipo_id || 'undefined'}`);
                    console.log(`      - equipos_por_clase (nuevo): ${personaje.equipos_por_clase?.length || 0} entradas`);
                    
                    if (personaje.equipos_por_clase && personaje.equipos_por_clase.length > 0) {
                        personaje.equipos_por_clase.forEach((epc, index) => {
                            console.log(`        [${index}] Clase: ${epc.clase_id}, Equipo: ${epc.equipo_id}`);
                        });
                    }
                } else {
                    console.log(`   ❌ Miembro NO encontrado: ${miembroId}`);
                }
            }
        }
        
        // 2. Buscar todos los personajes y verificar sus equipos
        console.log(`\n${'=' .repeat(60)}`);
        console.log('👥 VERIFICANDO TODOS LOS PERSONAJES');
        
        const personajes = await Personaje.find({})
            .populate('usuario_id', 'nombre email');
        
        console.log(`📊 Total personajes encontrados: ${personajes.length}`);
        
        for (const personaje of personajes) {
            console.log(`\n👤 PERSONAJE: ${personaje.usuario_id?.nombre || 'Sin nombre'}`);
            console.log(`   ID: ${personaje._id}`);
            console.log(`   Usuario ID: ${personaje.usuario_id?._id}`);
            console.log(`   equipo_id (viejo): ${personaje.equipo_id || 'undefined'}`);
            console.log(`   equipos_por_clase (nuevo): ${personaje.equipos_por_clase?.length || 0} entradas`);
            
            // Buscar en qué equipos aparece este personaje
            const equiposQueLoTienen = await Equipo.find({ 
                miembros: personaje._id 
            }).populate('clase_id', 'nombre codigo_clase');
            
            console.log(`   🔍 Aparece en ${equiposQueLoTienen.length} equipo(s):`);
            equiposQueLoTienen.forEach(eq => {
                console.log(`      - ${eq.nombre} (${eq.clase_id?.nombre || 'Global'})`);
            });
        }
        
        // 3. Detectar inconsistencias
        console.log(`\n${'=' .repeat(60)}`);
        console.log('⚠️  DETECTANDO INCONSISTENCIAS');
        
        let inconsistencias = 0;
        
        for (const equipo of equipos) {
            for (const miembroId of equipo.miembros) {
                const personaje = await Personaje.findById(miembroId);
                
                if (!personaje) {
                    console.log(`❌ INCONSISTENCIA: Equipo "${equipo.nombre}" tiene miembro ${miembroId} que no existe`);
                    inconsistencias++;
                    continue;
                }
                
                // Verificar sistema viejo
                if (!equipo.clase_id && personaje.equipo_id?.toString() !== equipo._id.toString()) {
                    console.log(`❌ INCONSISTENCIA: Personaje ${personaje.usuario_id} está en equipo global "${equipo.nombre}" pero equipo_id no coincide`);
                    console.log(`   Esperado: ${equipo._id}, Actual: ${personaje.equipo_id}`);
                    inconsistencias++;
                }
                
                // Verificar sistema nuevo
                if (equipo.clase_id) {
                    const tieneEntradaCorrecta = personaje.equipos_por_clase?.some(epc => 
                        epc.equipo_id?.toString() === equipo._id.toString() && 
                        epc.clase_id?.toString() === equipo.clase_id._id.toString()
                    );
                    
                    if (!tieneEntradaCorrecta) {
                        console.log(`❌ INCONSISTENCIA: Personaje ${personaje.usuario_id} está en equipo de clase "${equipo.nombre}" pero no tiene entrada en equipos_por_clase`);
                        inconsistencias++;
                    }
                }
            }
        }
        
        console.log(`\n📊 RESUMEN:`);
        console.log(`   Total inconsistencias: ${inconsistencias}`);
        
        if (inconsistencias > 0) {
            console.log(`\n💡 SOLUCIÓN SUGERIDA:`);
            console.log(`   1. Ejecutar script de reparación de datos`);
            console.log(`   2. O modificar la migración para manejar estos casos`);
        } else {
            console.log(`✅ Datos consistentes - verificar lógica de migración`);
        }
        
    } catch (error) {
        console.error('💥 ERROR:', error);
    }
}

// Ejecutar
debugDatosEquipos()
    .then(() => {
        console.log('\n✨ Debug completado');
        process.exit(0);
    })
    .catch(console.error);
