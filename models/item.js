const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    unique: true
  },
  descripcion: {
    type: String,
    required: true
  },
  tipo: {
    type: String,
    required: true,
    enum: ['pocion', 'pergamino', 'amuleto', 'recurso']
  },
  valor: {
    type: Number,
    required: true,
    min: 0
  },
  nivel_minimo: {
    type: Number,
    required: true,
    min: 1
  },
  icono: {
    type: String,
    required: true // nombre archivo local
  },
  apilable: {
    type: Boolean,
    default: true
  },
  efectos: [{
    tipo: {
      type: String,
      required: true
    },
    valor: {
      type: Number,
      required: true
    },
    duracion_segundos: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  rareza: {
    type: String,
    required: true,
    enum: ['comun', 'raro', 'epico', 'legendario']
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Item', itemSchema);