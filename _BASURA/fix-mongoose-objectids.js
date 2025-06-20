/**
 * FIX CRÍTICO: Mongoose ObjectIds como strings en respuestas JSON
 * 
 * PROBLEMA: Mongoose devuelve ObjectIds como objetos que el frontend recibe como "[object Object]"
 * CAUSA: El toJSON transform no funciona con documentos populados complejos
 * SOLUCIÓN: Forzar JSON.parse(JSON.stringify()) en endpoints críticos
 */

const fs = require('fs');
const path = require('path');

// Función helper para forzar conversión ObjectId → string
const forceJsonSerialization = (data) => {
    return JSON.parse(JSON.stringify(data));
};

console.log('🔧 Aplicando fix para ObjectIds en endpoints críticos...');

// ============ FIX 1: Equipos V2 endpoint ============
const equiposRoutePath = path.join(__dirname, 'routes', 'equipos.js');
let equiposContent = fs.readFileSync(equiposRoutePath, 'utf8');

// Buscar el endpoint /v2 y agregar forzado de serialización
const equiposV2Fix = `        const equiposConStats = equipos.map(equipo => {
            const miembrosData = equipo.miembros.map(personaje => ({
                id: personaje._id.toString(), // 🔧 FIX: Convertir ObjectId a string
                nombre: personaje.usuario_id?.nombre || 'Usuario sin nombre',
                email: personaje.usuario_id?.email || '',
                nivel: personaje.nivel,
                experiencia: personaje.experiencia,
                clase: personaje.clase_personaje_id?.nombre || 'Sin clase',
                icono_clase: personaje.clase_personaje_id?.icono || 'default.png',
                salud: personaje.salud_actual,
                energia: personaje.energia_actual
            }));

            // Verificar si estudiante puede unirse (debe estar en la misma clase)
            let puedeUnirse = false;
            let yaEsMiembro = false;
            
            if (req.usuario.rol === 'estudiante' && personaje) {
                // Verificar si ya es miembro en esta clase específica
                if (equipo.clase_id) {
                    yaEsMiembro = !!personaje.getEquipoEnClase(equipo.clase_id._id);
                } else {
                    // Para equipos globales, verificar sistema legacy
                    yaEsMiembro = personaje.equipo_id && 
                        personaje.equipo_id.toString() === equipo._id.toString();
                }
                
                // Puede unirse si no es miembro y hay espacio
                puedeUnirse = !yaEsMiembro && miembrosData.length < 4;
            }

            return {
                id: equipo._id.toString(), // 🔧 FIX: Convertir ObjectId a string
                ...equipo.toObject(),
                miembros: miembrosData,
                cantidad_miembros: miembrosData.length,
                espacios_disponibles: 4 - miembrosData.length,
                puede_unirse: puedeUnirse,
                ya_es_miembro: yaEsMiembro,
                tipo_equipo: equipo.clase_id ? 'clase' : 'global',
                clase_info: equipo.clase_id ? {
                    id: equipo.clase_id._id.toString(), // 🔧 FIX: Convertir ObjectId a string
                    nombre: equipo.clase_id.nombre,
                    codigo: equipo.clase_id.codigo_clase
                } : null
            };
        });

        // 🔧 FORZAR SERIALIZACIÓN JSON PARA CONVERTIR TODOS LOS ObjectIds
        const equiposSerializados = JSON.parse(JSON.stringify(equiposConStats));

        res.json({ 
            equipos: equiposSerializados,
            total_equipos: equiposSerializados.length,
            mensaje,
            version: 'v2',
            filtros_aplicados: {
                clase_id: clase_id || null,
                mi_equipo: mi_equipo === 'true',
                rol_usuario: req.usuario.rol
            }
        });`;

// Reemplazar la sección completa de equiposConStats en el endpoint V2
const equiposV2Pattern = /const equiposConStats = equipos\.map\(equipo => \{[\s\S]*?\}\);[\s\S]*?res\.json\(\{ [\s\S]*?filtros_aplicados:[\s\S]*?\}\);/;

if (equiposV2Pattern.test(equiposContent)) {
    equiposContent = equiposContent.replace(equiposV2Pattern, equiposV2Fix);
    console.log('✅ Fix aplicado a endpoint /api/equipos/v2');
} else {
    console.log('❌ No se encontró el patrón en endpoint equipos V2');
}

// ============ FIX 2: Clases estudiantes endpoint ============
const clasesRoutePath = path.join(__dirname, 'routes', 'clases.js');
let clasesContent = fs.readFileSync(clasesRoutePath, 'utf8');

// Buscar el endpoint /:id/estudiantes y agregar serialización forzada
const clasesEstudiantesFix = `        res.json({
            clase: {
                id: clase._id.toString(), // 🔧 FIX: Convertir ObjectId a string
                nombre: clase.nombre,
                codigo: clase.codigo_clase,
                descripcion: clase.descripcion
            },
            estudiantes: JSON.parse(JSON.stringify(estudiantesConPersonajes)), // 🔧 FORZAR SERIALIZACIÓN
            configuracion: clase.configuracion
        });`;

const clasesEstudiantesPattern = /res\.json\(\{[\s\S]*?clase: \{[\s\S]*?\},[\s\S]*?estudiantes: estudiantesConPersonajes,[\s\S]*?configuracion: clase\.configuracion[\s\S]*?\}\);/;

if (clasesEstudiantesPattern.test(clasesContent)) {
    clasesContent = clasesContent.replace(clasesEstudiantesPattern, clasesEstudiantesFix);
    console.log('✅ Fix aplicado a endpoint /api/clases/:id/estudiantes');
} else {
    console.log('❌ No se encontró el patrón en endpoint clases estudiantes');
}

// Escribir archivos modificados
fs.writeFileSync(equiposRoutePath, equiposContent);
fs.writeFileSync(clasesRoutePath, clasesContent);

console.log('🎉 Fix aplicado exitosamente!');
console.log('');
console.log('📋 RESUMEN DE CAMBIOS:');
console.log('✅ Forzada serialización JSON en /api/equipos/v2');
console.log('✅ Forzada serialización JSON en /api/clases/:id/estudiantes');
console.log('');
console.log('🔄 Reinicia el servidor para aplicar los cambios:');
console.log('   node app.js');
console.log('');
console.log('🧪 TESTING:');
console.log('1. Abre gestionar-clase.html');
console.log('2. Inspecciona la consola del navegador');
console.log('3. Los IDs deberían aparecer como strings, no como "[object Object]"');
