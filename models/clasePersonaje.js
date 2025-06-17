const mongoose = require('mongoose');

const clasePersonajeSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    unique: true,
    enum: ['mago', 'guerrero', 'curandero']
  },
  habilidad_unica: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Habilidad',
    required: false // Permitir crear sin habilidad primero
  },
  icono: {
    type: String,
    required: true // nombre del archivo local
  },
  descripcion: {
    type: String,
    required: true
  },
  bonificaciones: {
    salud: {
      type: Number,
      default: 0
    },
    energia: {
      type: Number,
      default: 0
    }
  },
  stats_base: {
    salud_inicial: {
      type: Number,
      required: true,
      min: 1
    },
    energia_inicial: {
      type: Number,
      required: true,
      min: 1
    },
    salud_por_nivel: {
      type: Number,
      required: true,
      min: 0
    },
    energia_por_nivel: {
      type: Number,
      required: true,
      min: 0
    }
  }
}, {
  timestamps: true
});

// Método para calcular salud máxima por nivel
clasePersonajeSchema.methods.calcularSaludMaxima = function(nivel) {
  return this.stats_base.salud_inicial + ((nivel - 1) * this.stats_base.salud_por_nivel);
};

// Método para calcular energía máxima por nivel
clasePersonajeSchema.methods.calcularEnergiaMaxima = function(nivel) {
  return this.stats_base.energia_inicial + ((nivel - 1) * this.stats_base.energia_por_nivel);
};

// Método para obtener stats totales con bonificaciones
clasePersonajeSchema.methods.getStatsConBonificaciones = function(nivel) {
  return {
    salud_maxima: this.calcularSaludMaxima(nivel) + this.bonificaciones.salud,
    energia_maxima: this.calcularEnergiaMaxima(nivel) + this.bonificaciones.energia
  };
};

module.exports = mongoose.model('ClasePersonaje', clasePersonajeSchema);