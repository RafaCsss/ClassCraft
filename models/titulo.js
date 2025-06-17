const mongoose = require('mongoose');

const tituloSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    unique: true
  },
  descripcion: {
    type: String,
    required: true
  },
  requisito: {
    type: String,
    required: true
  },
  icono: {
    type: String,
    required: true // nombre archivo local
  },
  usuarios: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario'
  }],
  permanente: {
    type: Boolean,
    default: true
  },
  categoria: {
    type: String,
    required: true,
    enum: ['academico', 'social', 'combate', 'especial']
  },
  rareza: {
    type: String,
    required: true,
    enum: ['comun', 'raro', 'epico', 'legendario']
  },
  beneficios: {
    bono_xp: {
      type: Number,
      default: 0,
      min: 0
    },
    bono_monedas: {
      type: Number,
      default: 0,
      min: 0
    },
    habilidades_especiales: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Habilidad'
    }]
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Titulo', tituloSchema);