/**
 * SCRIPT DE REPARACIÓN: Sincronizar datos de equipos y personajes
 * 
 * Este script repara la inconsistencia donde:
 * - Los equipos tienen miembros en su array
 * - Pero los personajes no saben que están en esos equipos
 */

const mongoose = require('mongoose');

// Conectar a MongoDB
mongoose.connect('mongodb://localhost:27017/classcraft', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const Personaje = require('../models/personaje');
const Equipo = require('../models/equipo');

async function repararDatosEquipos() {
    console.log('🔧 INICIANDO REPARACIÓN DE DATOS');
    console.log('=' .repeat(60));
    
    try {
        const equipos = await Equipo.find({}).populate('clase_id', 'nombre');
        
        console.log(`📋 Encontrados ${equipos.length} equipos para verificar`);
        
        let reparados = 0;
        let errores = 0;
        
        for (const equipo of equipos) {
            console.log(`\\n🏆 Procesando equipo: ${equipo.nombre}`);
            console.log(`   Clase: ${equipo.clase_id?.nombre || 'Global'}`);
            console.log(`   Miembros: ${equipo.miembros.length}`);
            
            for (const miembroId of equipo.miembros) {
                try {
                    const personaje = await Personaje.findById(miembroId)
                        .populate('usuario_id', 'nombre');
                    
                    if (!personaje) {
                        console.log(`   ❌ Personaje ${miembroId} no encontrado`);
                        errores++;
                        continue;
                    }
                    
                    console.log(`   👤 Verificando: ${personaje.usuario_id?.nombre || 'Sin nombre'}`);
                    
                    let necesitaReparacion = false;
                    
                    if (equipo.clase_id) {
                        // Equipo de clase específica - verificar sistema nuevo
                        const tieneEntradaCorrecta = personaje.equipos_por_clase?.some(epc => 
                            epc.equipo_id?.toString() === equipo._id.toString() && 
                            epc.clase_id?.toString() === equipo.clase_id._id.toString()
                        );
                        
                        if (!tieneEntradaCorrecta) {
                            console.log(`   🔧 REPARANDO: Agregando a equipos_por_clase`);
                            
                            // Inicializar array si no existe
                            if (!personaje.equipos_por_clase) {
                                personaje.equipos_por_clase = [];
                            }
                            
                            personaje.equipos_por_clase.push({
                                clase_id: equipo.clase_id._id,
                                equipo_id: equipo._id,
                                fecha_union: personaje.fecha_creacion || new Date()
                            });
                            
                            necesitaReparacion = true;
                        } else {
                            console.log(`   ✅ Ya tiene entrada correcta en equipos_por_clase`);
                        }
                        
                    } else {
                        // Equipo global - verificar sistema viejo
                        if (!personaje.equipo_id || personaje.equipo_id.toString() !== equipo._id.toString()) {
                            console.log(`   🔧 REPARANDO: Estableciendo equipo_id`);
                            personaje.equipo_id = equipo._id;
                            necesitaReparacion = true;
                        } else {
                            console.log(`   ✅ Ya tiene equipo_id correcto`);
                        }
                    }
                    
                    if (necesitaReparacion) {
                        await personaje.save();
                        reparados++;
                        console.log(`   ✅ Reparación completada`);
                    }
                    
                } catch (error) {
                    console.error(`   ❌ Error procesando miembro ${miembroId}:`, error.message);
                    errores++;
                }
            }
        }
        
        console.log(`\\n${'=' .repeat(60)}`);
        console.log('📊 RESUMEN DE REPARACIÓN');
        console.log('=' .repeat(60));
        console.log(`✅ Personajes reparados: ${reparados}`);
        console.log(`❌ Errores: ${errores}`);
        console.log(`📋 Total equipos procesados: ${equipos.length}`);
        
        if (reparados > 0) {
            console.log(`\\n🎉 Reparación exitosa! Ahora los datos están sincronizados.`);
            console.log(`💡 Próximo paso: Recargar la página de gestión de clase.`);
        } else if (errores === 0) {
            console.log(`\\n✅ No se necesitaron reparaciones - datos ya estaban sincronizados.`);
        }
        
    } catch (error) {
        console.error('💥 ERROR CRÍTICO en reparación:', error);
    }
}

// Función para deshacer reparaciones (rollback)
async function deshacerReparacion() {
    console.log('🔄 DESHACIENDO REPARACIONES');
    console.log('=' .repeat(60));
    
    try {
        // Limpiar equipos_por_clase
        const resultadoEquiposClase = await Personaje.updateMany(
            { 'equipos_por_clase.0': { $exists: true } },
            { $unset: { equipos_por_clase: 1 } }
        );
        
        // Limpiar equipo_id
        const resultadoEquipoId = await Personaje.updateMany(
            { equipo_id: { $ne: null } },
            { $unset: { equipo_id: 1 } }
        );
        
        console.log(`✅ Rollback completado:`);
        console.log(`   - equipos_por_clase limpiado: ${resultadoEquiposClase.modifiedCount} personajes`);
        console.log(`   - equipo_id limpiado: ${resultadoEquipoId.modifiedCount} personajes`);
        
    } catch (error) {
        console.error('❌ Error en rollback:', error);
    }
}

// Ejecución
async function main() {
    const args = process.argv.slice(2);
    const comando = args[0];
    
    if (comando === 'rollback') {
        await deshacerReparacion();
    } else {
        await repararDatosEquipos();
    }
    
    console.log('\\n✨ Script completado');
    process.exit(0);
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { repararDatosEquipos, deshacerReparacion };
