const mongoose = require('mongoose');

const animacionActivaSchema = new mongoose.Schema({
  clase_activa_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ClaseActiva',
    required: true
  },
  habilidad_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Habilidad',
    required: true
  },
  usuario_origen: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  gif_archivo: {
    type: String,
    required: true
  },
  duracion_ms: {
    type: Number,
    required: true,
    min: 100
  },
  fecha_inicio: {
    type: Date,
    default: Date.now
  },
  usuarios_visto: [{
    usuario_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario'
    },
    fecha_visto: {
      type: Date,
      default: Date.now
    }
  }],
  activa: {
    type: Boolean,
    default: true
  },
  pantalla_completa: {
    type: Boolean,
    default: false
  },
  audio_datos: {
    sonido_base: String,
    sonidos_clase: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    volumen: {
      type: Number,
      default: 0.5,
      min: 0,
      max: 1
    }
  }
}, {
  timestamps: true
});

// Método para marcar como visto por usuario
animacionActivaSchema.methods.marcarVistoPor = function(usuarioId) {
  const yaVisto = this.usuarios_visto.find(u => u.usuario_id.equals(usuarioId));
  if (!yaVisto) {
    this.usuarios_visto.push({ usuario_id: usuarioId });
    return this.save();
  }
  return Promise.resolve(this);
};

module.exports = mongoose.model('AnimacionActiva', animacionActivaSchema);