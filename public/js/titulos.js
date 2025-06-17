        } catch (error) {
            console.error('Error otorgando título:', error);
            this.showError('Error al otorgar título: ' + error.message);
        }
    }

    async quitarTitulo(tituloId) {
        const usuarioId = prompt('Ingresa el ID del usuario:');
        if (!usuarioId) return;
        
        if (!confirm('¿Estás seguro de quitar este título? Esta acción no se puede deshacer.')) {
            return;
        }
        
        const razon = prompt('Razón (opcional):') || '';
        
        try {
            const response = await fetch('/api/titulos/quitar', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    usuario_id: usuarioId,
                    titulo_id: tituloId,
                    razon: razon
                })
            });

            if (!response.ok) throw new Error('Error al quitar título');

            const data = await response.json();
            this.showSuccess(data.message);
            this.loadTitulos(); // Recargar lista
            
        } catch (error) {
            console.error('Error quitando título:', error);
            this.showError('Error al quitar título: ' + error.message);
        }
    }

    mostrarModalCrearTitulo() {
        const modal = document.getElementById('crear-titulo-modal');
        modal.style.display = 'flex';
        
        // Limpiar form
        document.getElementById('crear-titulo-form').reset();
    }

    async crearTitulo() {
        try {
            const formData = {
                nombre: document.getElementById('titulo-nombre').value,
                descripcion: document.getElementById('titulo-descripcion').value,
                requisito: document.getElementById('titulo-requisito').value,
                categoria: document.getElementById('titulo-categoria').value,
                rareza: document.getElementById('titulo-rareza').value,
                permanente: document.getElementById('titulo-permanente').checked,
                beneficios: {
                    bono_xp: parseInt(document.getElementById('titulo-bono-xp').value) || 0,
                    bono_monedas: parseInt(document.getElementById('titulo-bono-monedas').value) || 0,
                    habilidades_especiales: []
                }
            };

            const response = await fetch('/api/titulos/crear', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) throw new Error('Error al crear título');

            const data = await response.json();
            this.showSuccess(data.message);
            this.cerrarModales();
            this.loadTitulos(); // Recargar lista
            
        } catch (error) {
            console.error('Error creando título:', error);
            this.showError('Error al crear título: ' + error.message);
        }
    }

    async mostrarStatsGenerales() {
        try {
            const response = await fetch('/api/titulos/stats/generales', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) throw new Error('Error al obtener estadísticas');

            const data = await response.json();
            const stats = data.estadisticas;
            
            const modal = document.getElementById('stats-modal');
            const modalBody = document.getElementById('stats-modal-body');
            
            modalBody.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-item">
                        <h4>📊 Resumen General</h4>
                        <p><strong>Total de títulos:</strong> ${stats.total_titulos}</p>
                        <p><strong>Títulos permanentes:</strong> ${stats.permanentes}</p>
                        <p><strong>Usuarios con títulos:</strong> ${stats.usuarios_con_titulos}</p>
                        <p><strong>Usuarios sin títulos:</strong> ${stats.usuarios_sin_titulos}</p>
                        <p><strong>Cobertura:</strong> ${stats.cobertura_porcentaje}%</p>
                    </div>
                    
                    <div class="stat-item">
                        <h4>📚 Por Categoría</h4>
                        ${this.renderEstadisticasCategoria(stats.por_categoria)}
                    </div>
                    
                    <div class="stat-item">
                        <h4>⭐ Por Rareza</h4>
                        ${this.renderEstadisticasRareza(stats.por_rareza)}
                    </div>
                    
                    <div class="stat-item">
                        <h4>🏆 Más Populares</h4>
                        ${this.renderTitulosPopulares(stats.titulos_mas_populares)}
                    </div>
                </div>
            `;
            
            modal.style.display = 'flex';
            
        } catch (error) {
            console.error('Error mostrando stats:', error);
            this.showError('Error al cargar estadísticas: ' + error.message);
        }
    }

    renderEstadisticasCategoria(categorias) {
        const conteos = {};
        categorias.forEach(cat => {
            conteos[cat.categoria] = (conteos[cat.categoria] || 0) + 1;
        });
        
        return Object.entries(conteos).map(([cat, count]) => 
            `<p>${this.getCategoriaIcon(cat)} ${cat}: ${count}</p>`
        ).join('');
    }

    renderEstadisticasRareza(rarezas) {
        const conteos = {};
        rarezas.forEach(rar => {
            conteos[rar.rareza] = (conteos[rar.rareza] || 0) + 1;
        });
        
        return Object.entries(conteos).map(([rar, count]) => 
            `<p><span class="${this.getRarezaClass(rar)}">${rar.toUpperCase()}</span>: ${count}</p>`
        ).join('');
    }

    renderTitulosPopulares(titulos) {
        if (!titulos || titulos.length === 0) {
            return '<p>No hay datos disponibles</p>';
        }
        
        return titulos.slice(0, 10).map((titulo, index) => 
            `<p>${index + 1}. ${titulo.nombre} (${titulo.usuarios} usuarios)</p>`
        ).join('');
    }

    cerrarModales() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }

    showLoading(show) {
        const loading = document.getElementById('loading');
        loading.style.display = show ? 'flex' : 'none';
    }

    showError(message) {
        const errorDiv = document.getElementById('error-message');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        errorDiv.className = 'error-message show';
        
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }

    showSuccess(message) {
        // Crear toast de éxito
        const toast = document.createElement('div');
        toast.className = 'toast toast-success';
        toast.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }

    showInfo(message) {
        // Crear toast de info
        const toast = document.createElement('div');
        toast.className = 'toast toast-info';
        toast.innerHTML = `
            <i class="fas fa-info-circle"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }
}

// Inicializar cuando carga la página
let titulosManager;
document.addEventListener('DOMContentLoaded', () => {
    titulosManager = new TitulosManager();
});