/**
 * MIGRACIÓN DE EQUIPOS: Sistema Único → Equipos por Clase
 * 
 * Este script migra los datos existentes del sistema de equipo único
 * al nuevo sistema de equipos por clase sin perder datos.
 * 
 * USO:
 * node scripts/migrar-equipos-por-clase.js
 * node scripts/migrar-equipos-por-clase.js rollback
 */

const mongoose = require('mongoose');
// require('dotenv').config(); // COMENTADO - no necesario

// Conectar a MongoDB usando la misma URL que app.js
mongoose.connect('mongodb://localhost:27017/classcraft', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const Personaje = require('../models/personaje');
const Equipo = require('../models/equipo');
const Clase = require('../models/clase');

async function migrarEquiposAClases() {
    console.log('🚀 INICIANDO MIGRACIÓN: Equipos únicos → Equipos por clase');
    console.log('=' .repeat(60));
    
    try {
        // 1. Buscar personajes con equipo_id pero sin equipos_por_clase
        const personajesLegacy = await Personaje.find({
            equipo_id: { $ne: null },
            $or: [
                { equipos_por_clase: { $exists: false } },
                { equipos_por_clase: { $size: 0 } }
            ]
        }).populate('equipo_id');
        
        console.log(`📋 Encontrados ${personajesLegacy.length} personajes para migrar`);
        
        if (personajesLegacy.length === 0) {
            console.log('✅ No hay personajes que requieran migración');
            return;
        }
        
        let migrados = 0;
        let errores = 0;
        const detalles = [];
        
        for (const personaje of personajesLegacy) {
            try {
                const equipo = personaje.equipo_id;
                
                if (!equipo) {
                    console.log(`⚠️  Personaje ${personaje._id}: equipo_id existe pero equipo no encontrado`);
                    errores++;
                    continue;
                }
                
                // Determinar estrategia de migración
                let claseDestino = null;
                let estrategia = '';
                
                if (equipo.clase_id) {
                    // ESTRATEGIA 1: Equipo ya tiene clase asignada
                    claseDestino = equipo.clase_id;
                    estrategia = 'equipo-con-clase';
                } else {
                    // ESTRATEGIA 2: Buscar clase donde el usuario está inscrito
                    const clasesEstudiante = await Clase.find({
                        estudiantes: personaje.usuario_id,
                        activa: true
                    });
                    
                    if (clasesEstudiante.length === 1) {
                        // Una sola clase - migrar ahí
                        claseDestino = clasesEstudiante[0]._id;
                        estrategia = 'una-clase-estudiante';
                        
                        // Actualizar el equipo para que tenga clase_id
                        equipo.clase_id = claseDestino;
                        await equipo.save();
                        
                    } else if (clasesEstudiante.length > 1) {
                        // Múltiples clases - usar la primera activa
                        claseDestino = clasesEstudiante[0]._id;
                        estrategia = 'primera-clase-multiple';
                        
                        // Actualizar el equipo
                        equipo.clase_id = claseDestino;
                        await equipo.save();
                        
                    } else {
                        // No está en ninguna clase - crear entrada sin clase (legacy)
                        console.log(`⚠️  Personaje ${personaje._id}: no está en ninguna clase, mantener como legacy`);
                        continue;
                    }
                }
                
                // Migrar al nuevo sistema
                personaje.equipos_por_clase.push({
                    clase_id: claseDestino,
                    equipo_id: equipo._id,
                    fecha_union: personaje.fecha_creacion || new Date()
                });
                
                await personaje.save();
                migrados++;
                
                detalles.push({
                    personaje_id: personaje._id,
                    usuario_id: personaje.usuario_id,
                    equipo_nombre: equipo.nombre,
                    clase_id: claseDestino,
                    estrategia
                });
                
                console.log(`✅ ${migrados}/${personajesLegacy.length} - Personaje migrado (${estrategia})`);
                
            } catch (error) {
                console.error(`❌ Error migrando personaje ${personaje._id}:`, error.message);
                errores++;
            }
        }
        
        // Resumen final
        console.log('\n' + '=' .repeat(60));
        console.log('📊 RESUMEN DE MIGRACIÓN');
        console.log('=' .repeat(60));
        console.log(`✅ Migrados exitosamente: ${migrados}`);
        console.log(`❌ Errores: ${errores}`);
        console.log(`📋 Total procesados: ${personajesLegacy.length}`);
        
        if (detalles.length > 0) {
            console.log('\n📝 DETALLES DE MIGRACIÓN:');
            detalles.forEach((detalle, index) => {
                console.log(`${index + 1}. Personaje ${detalle.personaje_id} → Equipo "${detalle.equipo_nombre}" en clase ${detalle.clase_id} (${detalle.estrategia})`);
            });
        }
        
        // Verificar integridad post-migración
        await verificarIntegridad();
        
    } catch (error) {
        console.error('💥 ERROR CRÍTICO en migración:', error);
    }
}

async function verificarIntegridad() {
    console.log('\n🔍 VERIFICANDO INTEGRIDAD POST-MIGRACIÓN...');
    
    try {
        // Verificar personajes con sistema mixto
        const personajesMixtos = await Personaje.find({
            equipo_id: { $ne: null },
            'equipos_por_clase.0': { $exists: true }
        });
        
        console.log(`📊 Personajes con ambos sistemas: ${personajesMixtos.length}`);
        
        // Verificar equipos sin clase_id después de migración
        const equiposSinClase = await Equipo.find({
            $or: [
                { clase_id: null },
                { clase_id: { $exists: false } }
            ]
        });
        
        console.log(`📊 Equipos sin clase_id: ${equiposSinClase.length}`);
        
        // Verificar coherencia: personajes en equipos_por_clase deben estar en miembros del equipo
        const personajesConEquipos = await Personaje.find({
            'equipos_por_clase.0': { $exists: true }
        }).populate('equipos_por_clase.equipo_id');
        
        let incoherencias = 0;
        for (const personaje of personajesConEquipos) {
            for (const equipoClase of personaje.equipos_por_clase) {
                const equipo = equipoClase.equipo_id;
                if (equipo && !equipo.miembros.includes(personaje._id)) {
                    console.log(`⚠️  INCOHERENCIA: Personaje ${personaje._id} en equipos_por_clase pero no en miembros del equipo ${equipo._id}`);
                    incoherencias++;
                }
            }
        }
        
        console.log(`📊 Incoherencias detectadas: ${incoherencias}`);
        
        if (incoherencias === 0) {
            console.log('✅ Integridad verificada - Migración exitosa');
        } else {
            console.log('⚠️  Se detectaron incoherencias - Revisar manualmente');
        }
        
    } catch (error) {
        console.error('❌ Error verificando integridad:', error);
    }
}

async function rollbackMigracion() {
    console.log('🔄 INICIANDO ROLLBACK: Restaurar sistema de equipo único');
    console.log('=' .repeat(60));
    
    try {
        // Limpiar equipos_por_clase de todos los personajes
        const resultado = await Personaje.updateMany(
            { 'equipos_por_clase.0': { $exists: true } },
            { $unset: { equipos_por_clase: 1 } }
        );
        
        console.log(`✅ Rollback completado: ${resultado.modifiedCount} personajes restaurados`);
        console.log('📝 Los personajes ahora solo usan el campo equipo_id original');
        
    } catch (error) {
        console.error('❌ Error en rollback:', error);
    }
}

// Ejecución del script
async function main() {
    const args = process.argv.slice(2);
    const comando = args[0];
    
    if (comando === 'rollback') {
        await rollbackMigracion();
    } else {
        await migrarEquiposAClases();
    }
    
    console.log('\n✨ Script completado');
    process.exit(0);
}

// Ejecutar solo si es llamado directamente
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { migrarEquiposAClases, rollbackMigracion, verificarIntegridad };
