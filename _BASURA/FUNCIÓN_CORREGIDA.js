// FUNCIÓN CORREGIDA PARA REEMPLAZAR EN equipos.html
// Buscar la función mostrarInfoMisEquipos y reemplazar completamente

function mostrarInfoMisEquipos(equipos) {
    const container = document.getElementById('mi-equipo-info');
    
    // SIEMPRE usar formato de lista - SIN importar la cantidad
    container.innerHTML = `
        <div class="mis-equipos-resumen">
            <h4>🏆 Mis Equipos (${equipos.length})</h4>
            <div class="equipos-lista-mini">
                ${equipos.map(equipo => `
                    <div class="equipo-item">
                        <div class="equipo-info">
                            <div class="equipo-nombre">${equipo.nombre}</div>
                            <div class="equipo-detalles">
                                <span class="clase-tag">${equipo.clase_info ? `🏷️ ${equipo.clase_info.nombre}` : '🌐 Global'}</span>
                                <span class="puntos-tag">🏆 ${equipo.puntos}pts</span>
                                <span class="miembros-tag">👥 ${equipo.miembros}/4</span>
                            </div>
                        </div>
                        <div class="equipo-acciones">
                            <button onclick="salirDeEquipoEspecifico('${equipo.id}', '${equipo.clase_info ? equipo.clase_info.id : ''}')" class="btn btn-xs btn-danger">🚪</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

console.log("✅ FUNCIÓN CORREGIDA LISTA PARA REEMPLAZAR");
console.log("\n🎯 CAMBIOS:");
console.log("- ❌ Eliminado if/else problemático");
console.log("- ✅ Siempre usa formato de lista");
console.log("- ✅ Sin botón 'SALIR' legacy");
console.log("- ✅ Layout consistente");

console.log("\n📝 PASOS:");
console.log("1. Abrir equipos.html");
console.log("2. Buscar 'function mostrarInfoMisEquipos(equipos)'");
console.log("3. Reemplazar toda la función con el código de arriba");
console.log("4. Guardar archivo");
console.log("5. Recargar página");

console.log("\n🚀 RESULTADO:");
console.log("- Mismo formato para 1 equipo y múltiples equipos");
console.log("- Sin botón 'SALIR' confuso");
console.log("- Solo botones 🚪 individuales por equipo");
