const mongoose = require('mongoose');

// Conectar a MongoDB
mongoose.connect('mongodb://localhost:27017/classcraft', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const Equipo = require('../models/equipo');
const Personaje = require('../models/personaje');
const Usuario = require('../models/usuario');

async function debugEquiposFinal() {
    try {
        console.log('🔍 DEBUGGING FINAL - Equipos y Miembros');
        console.log('='.repeat(60));

        const equipos = await Equipo.find({}).populate('clase_id', 'nombre');
        const personajes = await Personaje.find({}).populate('usuario_id', 'nombre');
        const usuarios = await Usuario.find({});

        console.log(`📊 RESUMEN:`);
        console.log(`  - Equipos totales: ${equipos.length}`);
        console.log(`  - Personajes totales: ${personajes.length}`);
        console.log(`  - Usuarios totales: ${usuarios.length}`);
        console.log('');

        equipos.forEach((equipo, index) => {
            console.log(`🏆 EQUIPO ${index + 1}: ${equipo.nombre}`);
            console.log(`   Clase: ${equipo.clase_id?.nombre || 'Global'}`);
            console.log(`   Miembros array: [${equipo.miembros.join(', ')}]`);
            console.log(`   Cantidad miembros: ${equipo.miembros.length}`);
            console.log('');

            equipo.miembros.forEach((miembroId, idx) => {
                console.log(`   👤 MIEMBRO ${idx + 1}: ${miembroId}`);
                
                // Buscar si es usuario_id
                const usuarioMatch = usuarios.find(u => u._id.toString() === miembroId.toString());
                if (usuarioMatch) {
                    console.log(`      ✅ ENCONTRADO como USUARIO_ID: ${usuarioMatch.nombre}`);
                } else {
                    console.log(`      ❌ NO encontrado como usuario_id`);
                }

                // Buscar si es personaje_id
                const personajeMatch = personajes.find(p => p._id.toString() === miembroId.toString());
                if (personajeMatch) {
                    console.log(`      ✅ ENCONTRADO como PERSONAJE_ID: ${personajeMatch.usuario_id?.nombre || 'Usuario sin nombre'}`);
                } else {
                    console.log(`      ❌ NO encontrado como personaje_id`);
                }
                console.log('');
            });
            
            console.log('-'.repeat(40));
        });

        console.log('🔍 VERIFICACIÓN CRUZADA:');
        console.log('');
        
        personajes.forEach(personaje => {
            const usuario = personaje.usuario_id;
            if (usuario) {
                console.log(`👤 ${usuario.nombre}:`);
                console.log(`   Usuario ID: ${usuario._id}`);
                console.log(`   Personaje ID: ${personaje._id}`);
                console.log(`   Equipo legacy: ${personaje.equipo_id || 'null'}`);
                console.log(`   Equipos por clase: ${personaje.equipos_por_clase?.length || 0} equipos`);
                
                // Buscar en qué equipos aparece este personaje
                const equiposConPersonaje = equipos.filter(eq => 
                    eq.miembros.some(miembroId => 
                        miembroId.toString() === usuario._id.toString() || 
                        miembroId.toString() === personaje._id.toString()
                    )
                );
                
                if (equiposConPersonaje.length > 0) {
                    console.log(`   🏆 Aparece en ${equiposConPersonaje.length} equipo(s): ${equiposConPersonaje.map(eq => eq.nombre).join(', ')}`);
                } else {
                    console.log(`   🚫 NO aparece en ningún equipo`);
                }
                console.log('');
            }
        });

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        mongoose.connection.close();
    }
}

debugEquiposFinal();
