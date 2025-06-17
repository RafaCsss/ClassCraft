const mongoose = require('mongoose');
const Equipo = require('../models/equipo');
const Clase = require('../models/clase');
const Usuario = require('../models/usuario');

/**
 * SCRIPT DE MIGRACIÓN - FASE 2
 * Asigna clase_id a equipos existentes que no la tienen
 * 
 * ESTRATEGIA:
 * 1. Para cada equipo sin clase_id
 * 2. Buscar la primera clase del profesor que creó el equipo
 * 3. Asignar esa clase_id al equipo
 * 4. Si el profesor no tiene clases, dejar como global (clase_id: null)
 */

async function migrarEquiposAClases() {
    try {
        console.log('INICIANDO MIGRACIÓN EQUIPOS → CLASES');
        console.log('=========================================\n');

        // Conectar a MongoDB
        await mongoose.connect('mongodb://localhost:27017/classcraft');
        console.log('Conectado a MongoDB\n');

        // 1. Buscar equipos sin clase_id
        const equiposSinClase = await Equipo.find({ 
            $or: [
                { clase_id: null }, 
                { clase_id: { $exists: false } }
            ]
        }).populate('profesor_id', 'nombre email');

        console.log(`EQUIPOS ENCONTRADOS SIN CLASE: ${equiposSinClase.length}`);
        
        if (equiposSinClase.length === 0) {
            console.log('No hay equipos que migrar. Todos ya tienen clase_id asignado.');
            return;
        }

        let equiposMigrados = 0;
        let equiposGlobales = 0;
        let errores = 0;

        // 2. Procesar cada equipo
        for (const equipo of equiposSinClase) {
            try {
                console.log(`\nProcesando equipo: "${equipo.nombre}" (ID: ${equipo._id})`);
                console.log(`   Profesor: ${equipo.profesor_id.nombre} (${equipo.profesor_id.email})`);

                // Buscar clases del profesor
                const clasesProfesor = await Clase.find({ 
                    profesor_id: equipo.profesor_id._id,
                    activa: true 
                }).sort({ fecha_creacion: 1 }); // Más antigua primera

                if (clasesProfesor.length > 0) {
                    // Asignar primera clase encontrada
                    const primeraClase = clasesProfesor[0];
                    equipo.clase_id = primeraClase._id;
                    await equipo.save();
                    
                    console.log(`   Asignado a clase: "${primeraClase.nombre}" (${primeraClase.codigo_clase})`);
                    equiposMigrados++;
                } else {
                    // Profesor sin clases - dejar como global
                    console.log(`   Profesor sin clases activas - Equipo permanece GLOBAL`);
                    equiposGlobales++;
                }

            } catch (error) {
                console.error(`   Error procesando equipo ${equipo.nombre}:`, error.message);
                errores++;
            }
        }

        // 3. Resumen final
        console.log('\n=========================================');
        console.log('RESUMEN DE MIGRACIÓN:');
        console.log(`Equipos migrados a clases: ${equiposMigrados}`);
        console.log(`Equipos que permanecen globales: ${equiposGlobales}`);
        console.log(`Errores encontrados: ${errores}`);
        console.log(`Total procesados: ${equiposSinClase.length}`);

        // 4. Verificación post-migración
        const equiposConClase = await Equipo.countDocuments({ clase_id: { $ne: null } });
        const equiposGlobalesFinales = await Equipo.countDocuments({ 
            $or: [{ clase_id: null }, { clase_id: { $exists: false } }] 
        });
        
        console.log('\nESTADO FINAL:');
        console.log(`Equipos vinculados a clases: ${equiposConClase}`);
        console.log(`Equipos globales: ${equiposGlobalesFinales}`);

        if (equiposMigrados > 0) {
            console.log('\nMIGRACIÓN COMPLETADA EXITOSAMENTE!');
            console.log('Los equipos ahora están vinculados a clases específicas.');
            console.log('Listo para continuar con FASE 3 (Actualización API)');
        }

    } catch (error) {
        console.error('ERROR CRÍTICO EN MIGRACIÓN:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\nDesconectado de MongoDB');
        process.exit(0);
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    migrarEquiposAClases();
}

module.exports = { migrarEquiposAClases };
