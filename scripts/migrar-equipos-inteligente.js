const mongoose = require('mongoose');
const Equipo = require('../models/equipo');
const Clase = require('../models/clase');
const Usuario = require('../models/usuario');
const Personaje = require('../models/personaje');

/**
 * SCRIPT DE MIGRACIÓN INTELIGENTE - FASE 2
 * Asigna clase_id a equipos existentes basándose en:
 * 1. Clases donde están los miembros del equipo
 * 2. Clases del profesor que creó el equipo
 * 3. Heurística de mejor coincidencia
 */

async function migrarEquiposInteligente() {
    try {
        console.log('INICIANDO MIGRACIÓN INTELIGENTE EQUIPOS → CLASES');
        console.log('=================================================\n');

        // Conectar a MongoDB
        await mongoose.connect('mongodb://localhost:27017/classcraft');
        console.log('Conectado a MongoDB\n');

        // Buscar equipos sin clase_id
        const equiposSinClase = await Equipo.find({ 
            $or: [
                { clase_id: null }, 
                { clase_id: { $exists: false } }
            ]
        }).populate('profesor_id', 'nombre email')
          .populate('miembros');

        console.log(`EQUIPOS ENCONTRADOS SIN CLASE: ${equiposSinClase.length}`);
        
        if (equiposSinClase.length === 0) {
            console.log('No hay equipos que migrar.');
            return;
        }

        let equiposMigrados = 0;
        let equiposGlobales = 0;
        let errores = 0;

        for (const equipo of equiposSinClase) {
            try {
                console.log(`\nAnalizando equipo: "${equipo.nombre}"`);
                console.log(`   Profesor: ${equipo.profesor_id.nombre}`);
                console.log(`   Miembros: ${equipo.miembros.length}`);

                let claseAsignada = null;

                // ESTRATEGIA 1: Analizar clases de los miembros
                if (equipo.miembros.length > 0) {
                    const miembrosIds = equipo.miembros.map(m => m.usuario_id || m._id);
                    
                    // Buscar clases donde están los miembros
                    const clasesConMiembros = await Clase.find({
                        estudiantes: { $in: miembrosIds },
                        profesor_id: equipo.profesor_id._id,
                        activa: true
                    });

                    if (clasesConMiembros.length > 0) {
                        // Encontrar clase con más miembros del equipo
                        let mejorClase = null;
                        let maxMiembros = 0;

                        for (const clase of clasesConMiembros) {
                            const miembrosEnClase = miembrosIds.filter(id => 
                                clase.estudiantes.some(estudianteId => 
                                    estudianteId.toString() === id.toString()
                                )
                            ).length;

                            if (miembrosEnClase > maxMiembros) {
                                maxMiembros = miembrosEnClase;
                                mejorClase = clase;
                            }
                        }

                        if (mejorClase && maxMiembros > 0) {
                            claseAsignada = mejorClase;
                            console.log(`   Clase encontrada por miembros: "${mejorClase.nombre}" (${maxMiembros}/${miembrosIds.length} miembros coinciden)`);
                        }
                    }
                }

                // ESTRATEGIA 2: Si no se encontró por miembros, usar primera clase del profesor
                if (!claseAsignada) {
                    const clasesProfesor = await Clase.find({ 
                        profesor_id: equipo.profesor_id._id,
                        activa: true 
                    }).sort({ fecha_creacion: 1 });

                    if (clasesProfesor.length > 0) {
                        claseAsignada = clasesProfesor[0];
                        console.log(`   Clase asignada por profesor: "${claseAsignada.nombre}" (primera clase activa)`);
                    }
                }

                // Aplicar asignación
                if (claseAsignada) {
                    equipo.clase_id = claseAsignada._id;
                    await equipo.save();
                    console.log(`   MIGRADO → Clase: "${claseAsignada.nombre}" (${claseAsignada.codigo_clase})`);
                    equiposMigrados++;
                } else {
                    console.log(`   GLOBAL → Profesor sin clases activas`);
                    equiposGlobales++;
                }

            } catch (error) {
                console.error(`   Error: ${error.message}`);
                errores++;
            }
        }

        // Resumen
        console.log('\n=================================================');
        console.log('RESUMEN MIGRACIÓN INTELIGENTE:');
        console.log(`Equipos migrados a clases: ${equiposMigrados}`);
        console.log(`Equipos globales: ${equiposGlobales}`);
        console.log(`Errores: ${errores}`);

        // Verificación final
        const stats = await generarEstadisticasFinales();
        console.log('\nESTADÍSTICAS FINALES:');
        console.log(`Total equipos con clase: ${stats.equiposConClase}`);
        console.log(`Total equipos globales: ${stats.equiposGlobales}`);
        console.log(`Total equipos: ${stats.totalEquipos}`);

        if (equiposMigrados > 0) {
            console.log('\nMIGRACIÓN INTELIGENTE COMPLETADA!');
            console.log('Listo para FASE 3: Actualización de API');
        }

    } catch (error) {
        console.error('ERROR CRÍTICO:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

async function generarEstadisticasFinales() {
    const equiposConClase = await Equipo.countDocuments({ clase_id: { $ne: null } });
    const equiposGlobales = await Equipo.countDocuments({ 
        $or: [{ clase_id: null }, { clase_id: { $exists: false } }] 
    });
    const totalEquipos = await Equipo.countDocuments();

    return { equiposConClase, equiposGlobales, totalEquipos };
}

// Función para rollback si es necesario
async function rollbackMigracion() {
    console.log('ROLLBACK: Restaurando equipos a estado global...');
    
    await mongoose.connect('mongodb://localhost:27017/classcraft');
    
    const resultado = await Equipo.updateMany(
        {},
        { $unset: { clase_id: "" } }
    );
    
    console.log(`Rollback completado: ${resultado.modifiedCount} equipos restaurados a globales`);
    await mongoose.disconnect();
}

if (require.main === module) {
    const comando = process.argv[2];
    
    if (comando === 'rollback') {
        rollbackMigracion();
    } else {
        migrarEquiposInteligente();
    }
}

module.exports = { migrarEquiposInteligente, rollbackMigracion };
