// Script para crear equipos de prueba y verificar que el endpoint simple funciona

const mongoose = require('mongoose');
const Equipo = require('./models/equipo');
const Personaje = require('./models/personaje');
const Usuario = require('./models/usuario');
const Clase = require('./models/clase');

async function crearEquiposDePrueba() {
    try {
        console.log('🔗 Conectando a MongoDB...');
        await mongoose.connect('mongodb://localhost:27017/classcraft');
        
        console.log('🔍 Verificando datos existentes...');
        
        // Buscar la clase de matemáticas
        const clase = await Clase.findOne({ codigo_clase: 'MATE5A' });
        if (!clase) {
            console.log('❌ Clase MATE5A no encontrada');
            return;
        }
        console.log('✅ Clase encontrada:', clase.nombre, clase._id);
        
        // Buscar profesor
        const profesor = await Usuario.findById(clase.profesor_id);
        console.log('✅ Profesor encontrado:', profesor.nombre);
        
        // Buscar estudiantes
        const estudiantes = await Usuario.find({ _id: { $in: clase.estudiantes } });
        console.log('✅ Estudiantes encontrados:', estudiantes.length);
        
        // Buscar personajes de los estudiantes
        const personajes = await Personaje.find({ usuario_id: { $in: clase.estudiantes } });
        console.log('✅ Personajes encontrados:', personajes.length);
        
        if (personajes.length < 2) {
            console.log('❌ Necesitamos al menos 2 personajes para crear equipos');
            console.log('💡 Ejecuta primero: GET /api/setup');
            return;
        }
        
        // Eliminar equipos existentes de esta clase para empezar limpio
        await Equipo.deleteMany({ clase_id: clase._id });
        console.log('🧹 Equipos anteriores eliminados');
        
        // Crear primer equipo con 2 miembros
        const equipo1 = new Equipo({
            nombre: 'Equipo Alfa',
            miembros: [personajes[0]._id, personajes[1]._id],
            puntos: 150,
            profesor_id: clase.profesor_id,
            clase_id: clase._id,
            estadisticas: {
                misiones_completadas: 2,
                habilidades_usadas_total: 5,
                xp_total_ganado: 300
            },
            configuracion: {
                color_equipo: '#ff6b6b',
                emblema: 'escudo_rojo.png'
            }
        });
        
        await equipo1.save();
        console.log('✅ Equipo 1 creado:', equipo1.nombre, 'con', equipo1.miembros.length, 'miembros');
        
        // Crear segundo equipo con 1 miembro (si hay más personajes)
        if (personajes.length > 2) {
            const equipo2 = new Equipo({
                nombre: 'Equipo Beta',
                miembros: [personajes[2]._id],
                puntos: 75,
                profesor_id: clase.profesor_id,
                clase_id: clase._id,
                estadisticas: {
                    misiones_completadas: 1,
                    habilidades_usadas_total: 2,
                    xp_total_ganado: 150
                },
                configuracion: {
                    color_equipo: '#4ecdc4',
                    emblema: 'escudo_azul.png'
                }
            });
            
            await equipo2.save();
            console.log('✅ Equipo 2 creado:', equipo2.nombre, 'con', equipo2.miembros.length, 'miembros');
        }
        
        // Crear equipo global (sin clase_id)
        if (personajes.length > 3) {
            const equipoGlobal = new Equipo({
                nombre: 'Equipo Global',
                miembros: [personajes[3]._id],
                puntos: 200,
                profesor_id: clase.profesor_id,
                clase_id: null, // GLOBAL
                estadisticas: {
                    misiones_completadas: 3,
                    habilidades_usadas_total: 8,
                    xp_total_ganado: 400
                },
                configuracion: {
                    color_equipo: '#feca57',
                    emblema: 'escudo_dorado.png'
                }
            });
            
            await equipoGlobal.save();
            console.log('✅ Equipo global creado:', equipoGlobal.nombre);
        }
        
        console.log('\n🎉 EQUIPOS DE PRUEBA CREADOS!');
        console.log('📋 Ahora puedes probar:');
        console.log(`   - Con clase: /api/equipos-simple/simple?clase_id=${clase._id}`);
        console.log('   - Sin clase: /api/equipos-simple/simple');
        console.log('\n🔗 URLs de prueba:');
        console.log(`   http://localhost:3000/test-simple.html`);
        console.log(`   http://localhost:3000/gestionar-clase.html?id=${clase._id}`);
        
        // Verificar resultado
        const equiposCreados = await Equipo.find({ profesor_id: clase.profesor_id });
        console.log(`\n📊 Total equipos del profesor: ${equiposCreados.length}`);
        
        mongoose.disconnect();
        
    } catch (error) {
        console.error('💥 ERROR:', error);
        mongoose.disconnect();
    }
}

crearEquiposDePrueba();
