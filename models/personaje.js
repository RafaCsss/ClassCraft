const mongoose = require('mongoose');

const personajeSchema = new mongoose.Schema({
  usuario_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true,
    unique: true // Un usuario = Un personaje
  },
  clase_personaje_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ClasePersonaje',
    required: true
  },
  raza_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Raza',
    required: true
  },
  equipo_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Equipo',
    default: null
  },
  salud_actual: {
    type: Number,
    required: true,
    min: 0
  },
  salud_maxima: {
    type: Number,
    required: true,
    min: 1
  },
  energia_actual: {
    type: Number,
    required: true,
    min: 0
  },
  energia_maxima: {
    type: Number,
    required: true,
    min: 1
  },
  nivel: {
    type: Number,
    default: 1,
    min: 1
  },
  experiencia: {
    type: Number,
    default: 0,
    min: 0
  },
  avatar: {
    imagen_base: {
      type: String,
      required: true
    },
    posicion_x: {
      type: Number,
      default: 0
    },
    posicion_y: {
      type: Number,
      default: 0
    },
    escala: {
      type: Number,
      default: 1.0,
      min: 0.1,
      max: 3.0
    }
  },
  habilidades: [{
    habilidad_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Habilidad',
      required: true
    },
    nivel: {
      type: Number,
      default: 1,
      min: 1
    },
    desbloqueada: {
      type: Boolean,
      default: false
    },
    equipada: {
      type: Boolean,
      default: false
    },
    veces_usada: {
      type: Number,
      default: 0,
      min: 0
    },
    fecha_ultimo_uso: {
      type: Date,
      default: null
    }
  }],
  fecha_creacion: {
    type: Date,
    default: Date.now
  },
  puede_cambiar_clase: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Validar que salud actual no exceda máxima
personajeSchema.pre('save', function(next) {
  if (this.salud_actual > this.salud_maxima) {
    this.salud_actual = this.salud_maxima;
  }
  if (this.energia_actual > this.energia_maxima) {
    this.energia_actual = this.energia_maxima;
  }
  next();
});

// Método para ganar XP
personajeSchema.methods.ganarExperiencia = function(cantidad) {
  this.experiencia += cantidad;
  // Lógica de subida de nivel podría ir aquí
  return this.save();
};

// Método para usar energía
personajeSchema.methods.usarEnergia = function(cantidad) {
  if (this.energia_actual >= cantidad) {
    this.energia_actual -= cantidad;
    return true;
  }
  return false;
};

// Método para curar
personajeSchema.methods.curar = function(cantidad) {
  this.salud_actual = Math.min(this.salud_actual + cantidad, this.salud_maxima);
  return this.save();
};

module.exports = mongoose.model('Personaje', personajeSchema);