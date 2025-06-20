// FIX ALTERNATIVO: Endpoint más robusto para stats
// Reemplazar el endpoint existente si sigue fallando

router.put('/:id/estudiante/:estudianteId/accion', verificarToken, soloProfesor, async (req, res) => {
    try {
        const { tipo, valor, razon } = req.body;
        
        // Validaciones básicas
        if (!['xp', 'salud', 'energia'].includes(tipo)) {
            return res.status(400).json({ error: 'Tipo de acción inválido' });
        }
        
        if (typeof valor !== 'number' || !razon?.trim()) {
            return res.status(400).json({ error: 'Valor debe ser número y razón requerida' });
        }

        // Validar ObjectIds
        const mongoose = require('mongoose');
        if (!mongoose.Types.ObjectId.isValid(req.params.id) || 
            !mongoose.Types.ObjectId.isValid(req.params.estudianteId)) {
            return res.status(400).json({ error: 'IDs inválidos' });
        }

        // Buscar y validar clase
        const clase = await Clase.findById(req.params.id);
        if (!clase) {
            return res.status(404).json({ error: 'Clase no encontrada' });
        }

        if (clase.profesor_id.toString() !== req.usuario._id.toString()) {
            return res.status(403).json({ error: 'Sin permisos' });
        }

        // Buscar estudiante
        const estudiante = await Usuario.findById(req.params.estudianteId);
        if (!estudiante) {
            return res.status(404).json({ error: 'Estudiante no encontrado' });
        }

        // Verificar que está en la clase
        const estaEnClase = clase.estudiantes.some(id => id.toString() === req.params.estudianteId);
        if (!estaEnClase) {
            return res.status(400).json({ error: 'Estudiante no está en esta clase' });
        }

        let resultado = {};

        if (tipo === 'xp') {
            // Modificar XP
            const xpAnterior = estudiante.experiencia;
            estudiante.experiencia = Math.max(0, estudiante.experiencia + valor);
            estudiante.nivel = Math.floor(estudiante.experiencia / 100) + 1;
            await estudiante.save();
            
            resultado = {
                tipo: 'xp',
                anterior: xpAnterior,
                actual: estudiante.experiencia,
                cambio: valor
            };
        } else {
            // Modificar salud/energía
            const personaje = await Personaje.findOne({ usuario_id: req.params.estudianteId });
            if (!personaje) {
                return res.status(404).json({ error: 'Estudiante no tiene personaje' });
            }

            if (tipo === 'salud') {
                const anterior = personaje.salud_actual;
                personaje.salud_actual = Math.max(0, Math.min(
                    personaje.salud_maxima,
                    personaje.salud_actual + valor
                ));
                await personaje.save();
                
                resultado = {
                    tipo: 'salud',
                    anterior,
                    actual: personaje.salud_actual,
                    cambio: valor
                };
            } else if (tipo === 'energia') {
                const anterior = personaje.energia_actual;
                personaje.energia_actual = Math.max(0, Math.min(
                    personaje.energia_maxima,
                    personaje.energia_actual + valor
                ));
                await personaje.save();
                
                resultado = {
                    tipo: 'energia',
                    anterior,
                    actual: personaje.energia_actual,
                    cambio: valor
                };
            }
        }

        res.json({
            mensaje: `${tipo.toUpperCase()} actualizado exitosamente`,
            estudiante: estudiante.nombre,
            resultado,
            razon
        });

    } catch (error) {
        console.error('❌ Error en acción:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            detalle: error.message
        });
    }
});