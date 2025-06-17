const mongoose = require('mongoose');

const progresoMisionSchema = new mongoose.Schema({
  usuario_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  mision_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mision',
    required: true
  },
  completada: {
    type: Boolean,
    default: false
  },
  progreso_actual: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  fecha_inicio: {
    type: Date,
    default: Date.now
  },
  fecha_completada: {
    type: Date,
    default: null
  },
  intentos: {
    type: Number,
    default: 0,
    min: 0
  },
  notas_profesor: {
    type: String,
    default: ''
  },
  puntuacion: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  }
}, {
  timestamps: true
});

// Índice compuesto para evitar duplicados
progresoMisionSchema.index({ usuario_id: 1, mision_id: 1 }, { unique: true });

module.exports = mongoose.model('ProgresoMision', progresoMisionSchema);