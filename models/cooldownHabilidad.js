const mongoose = require('mongoose');

const cooldownHabilidadSchema = new mongoose.Schema({
  personaje_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Personaje',
    required: true
  },
  habilidad_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Habilidad',
    required: true
  },
  fecha_ultimo_uso: {
    type: Date,
    required: true
  },
  fecha_disponible: {
    type: Date,
    required: true
  },
  activo: {
    type: Boolean,
    default: true
  },
  usos_restantes: {
    type: Number,
    default: null // null = ilimitado, número = límite diario
  }
}, {
  timestamps: true
});

// Índice compuesto
cooldownHabilidadSchema.index({ personaje_id: 1, habilidad_id: 1 }, { unique: true });

// Método para verificar si está disponible
cooldownHabilidadSchema.methods.estaDisponible = function() {
  return new Date() >= this.fecha_disponible && this.activo;
};

module.exports = mongoose.model('CooldownHabilidad', cooldownHabilidadSchema);