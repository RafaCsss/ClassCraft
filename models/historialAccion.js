const mongoose = require('mongoose');

const historialAccionSchema = new mongoose.Schema({
  clase_activa_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ClaseActiva',
    required: false, // Opcional - no todas las acciones ocurren en clase activa
    default: null
  },
  usuario_origen: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  usuario_destino: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  tipo_accion: {
    type: String,
    required: true,
    enum: ['dar_xp', 'quitar_salud', 'usar_habilidad', 'completar_mision', 'unirse_equipo', 'salir_equipo', 'eliminar_equipo', 'eliminar_clase']
  },
  valor: {
    type: Number,
    required: true
  },
  razon: {
    type: String,
    required: true
  },
  fecha: {
    type: Date,
    default: Date.now
  },
  contexto: {
    mision_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Mision'
    },
    habilidad_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Habilidad'
    },
    equipo_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Equipo'
    }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('HistorialAccion', historialAccionSchema);