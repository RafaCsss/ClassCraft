// FIXES PARA FRONTEND EQUIPOS.HTML

// 1. Fix para función verificarEquipoEstudiante
// Reemplazar líneas alrededor de la línea 490:

// ANTES:
/*
if (data.equipos && data.equipos.length > 0) {
    const primerEquipo = data.equipos[0];
    mostrarInfoMisEquipos(data.equipos);
    document.getElementById('btn-salir-equipo').style.display = 'inline-block';
} else {
    document.getElementById('mi-equipo-info').innerHTML = 
        '<p class="no-equipo">🚫 No perteneces a ningún equipo</p>';
}
*/

// DESPUÉS:
const FIXED_VERIFICAR_ESTUDIANTE = `
if (data.equipos && data.equipos.length > 0) {
    console.log('🔍 Equipos encontrados:', data.equipos.length);
    mostrarInfoMisEquipos(data.equipos);
    document.getElementById('btn-salir-equipo').style.display = 'none'; // SIEMPRE OCULTAR botón legacy
} else {
    console.log('🔍 No hay equipos - ocultando todo');
    document.getElementById('mi-equipo-info').innerHTML = 
        '<p class="no-equipo">🚫 No perteneces a ningún equipo</p>';
    document.getElementById('btn-salir-equipo').style.display = 'none'; // OCULTAR botón legacy
}
`;

// 2. Agregar debugging a verificarEquipoEstudiante
// Agregar después de const data = await response.json();:
const DEBUG_LOG = `
console.log('🔍 DEBUG - verificarEquipoEstudiante response:', data);
`;

// 3. Fix para catch error
// Reemplazar el catch:
const FIXED_CATCH = `
} catch (error) {
    console.error('Error al verificar equipo:', error);
    document.getElementById('mi-equipo-info').innerHTML = 
        '<p class="no-equipo">❌ Error al cargar equipos</p>';
    document.getElementById('btn-salir-equipo').style.display = 'none';
}
`;

console.log("✅ FIXES PARA APLICAR MANUALMENTE:");
console.log("\n1. En verificarEquipoEstudiante() - Cambiar la lógica de mostrar/ocultar botón legacy");
console.log("\n2. Agregar debugging para ver exactamente qué devuelve la API");
console.log("\n3. Asegurar que el botón 'SALIR DEL EQUIPO' siempre se oculte");

console.log("\n🎯 PROBLEMA PRINCIPAL:");
console.log("El botón legacy 'SALIR DEL EQUIPO' se sigue mostrando cuando debería estar oculto");
console.log("Los nuevos botones individuales por equipo funcionan correctamente");
