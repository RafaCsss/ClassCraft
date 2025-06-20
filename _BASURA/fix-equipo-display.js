// FUNCIÓN CORREGIDA PARA MOSTRAR EQUIPOS CONSISTENTEMENTE

function mostrarInfoMisEquipos(equipos) {
    const container = document.getElementById('mi-equipo-info');
    
    // SIEMPRE usar el formato de lista - sin importar si es 1 o múltiples equipos
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

console.log("✅ FUNCIÓN CORREGIDA:");
console.log("- Eliminada la lógica if/else que causaba inconsistencia");
console.log("- Siempre usa el formato de lista (tanto para 1 como múltiples equipos)");
console.log("- Ya no aparece el botón 'SALIR' legacy");
console.log("- Layout consistente en todos los casos");

console.log("\n🎯 BENEFICIOS:");
console.log("- ✅ Mismo formato siempre");
console.log("- ✅ Sin botón legacy confuso");
console.log("- ✅ Interfaz limpia y consistente");
console.log("- ✅ Botones 🚪 individuales por equipo");

console.log("\n📝 INSTRUCCIONES:");
console.log("1. Buscar la función 'mostrarInfoMisEquipos' en equipos.html");
console.log("2. Reemplazar toda la función con el código de arriba");
console.log("3. Eliminar el if/else que cambia el formato");
