const mongoose = require('mongoose');

const razaSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    unique: true,
    enum: ['humano', 'elfo', 'enano']
  },
  bono_salud: {
    type: Number,
    default: 0
  },
  bono_energia: {
    type: Number,
    default: 0
  },
  descripcion: {
    type: String,
    required: true
  },
  icono: {
    type: String,
    required: true // nombre del archivo local
  },
  habilidades_especiales: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Habilidad'
  }]
}, {
  timestamps: true
});

// Método para aplicar bonificaciones raciales
razaSchema.methods.aplicarBonificaciones = function(statsBase) {
  return {
    salud_maxima: statsBase.salud_maxima + this.bono_salud,
    energia_maxima: statsBase.energia_maxima + this.bono_energia
  };
};

// Método para verificar si tiene habilidad especial
razaSchema.methods.tieneHabilidadEspecial = function(habilidadId) {
  return this.habilidades_especiales.includes(habilidadId);
};

module.exports = mongoose.model('Raza', razaSchema);