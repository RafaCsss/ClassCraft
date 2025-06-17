const mongoose = require('mongoose');

const claseActivaSchema = new mongoose.Schema({
  clase_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clase',
    required: true
  },
  profesor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  estudiantes_conectados: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario'
  }],
  fecha_inicio: {
    type: Date,
    default: Date.now
  },
  fecha_fin: {
    type: Date,
    default: null
  },
  activa: {
    type: Boolean,
    default: true
  },
  configuracion: {
    habilidades_habilitadas: {
      type: Boolean,
      default: true
    },
    penalizaciones_activas: {
      type: Boolean,
      default: true
    },
    modo_silencioso: {
      type: Boolean,
      default: false
    },
    tiempo_cooldown_global: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  estadisticas_sesion: {
    acciones_profesor: {
      type: Number,
      default: 0,
      min: 0
    },
    habilidades_usadas: {
      type: Number,
      default: 0,
      min: 0
    },
    estudiantes_max_conectados: {
      type: Number,
      default: 0,
      min: 0
    }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ClaseActiva', claseActivaSchema);