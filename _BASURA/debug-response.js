// DEBUG CRÍTICO: Interceptar la respuesta real del servidor

async function debugResponse() {
    try {
        const token = localStorage.getItem('classcraft_token') || 'test';
        
        console.log('🔍 DEBUGGING RESPUESTA REAL DEL SERVIDOR:');
        
        const response = await fetch('/api/equipos/v2?clase_id=6854b036e4212186f38fc53c', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const text = await response.text(); // RAW TEXT
        console.log('📄 RAW RESPONSE TEXT:');
        console.log(text);
        
        const data = JSON.parse(text); // Manual parse
        console.log('📦 PARSED DATA:');
        console.log(data);
        
        if (data.equipos && data.equipos.length > 0) {
            const equipo = data.equipos[0];
            console.log('🏆 PRIMER EQUIPO:');
            console.log('- ID:', equipo.id, typeof equipo.id);
            console.log('- Nombre:', equipo.nombre);
            console.log('- Miembros length:', equipo.miembros.length);
            
            if (equipo.miembros.length > 0) {
                const miembro = equipo.miembros[0];
                console.log('👤 PRIMER MIEMBRO:');
                console.log('- ID:', miembro.id, typeof miembro.id);
                console.log('- Nombre:', miembro.nombre);
            }
        }
        
    } catch (error) {
        console.error('❌ ERROR:', error);
    }
}

// Ejecutar debug
debugResponse();
