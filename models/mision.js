const mongoose = require('mongoose');

const misionSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true
  },
  descripcion: {
    type: String,
    required: true
  },
  xp_recompensa: {
    type: Number,
    required: true,
    min: 0
  },
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
  tipo: {
    type: String,
    required: true,
    enum: ['tarea', 'proyecto', 'participacion', 'evento']
  },
  fecha_limite: {
    type: Date,
    required: true
  },
  recompensas: [{
    tipo: {
      type: String,
      required: true,
      enum: ['xp', 'monedas', 'item']
    },
    valor: {
      type: Number,
      required: true,
      min: 0
    },
    item_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item'
    }
  }],
  activa: {
    type: Boolean,
    default: true
  },
  dificultad: {
    type: String,
    required: true,
    enum: ['facil', 'normal', 'dificil']
  },
  requisitos: {
    nivel_minimo: {
      type: Number,
      default: 1,
      min: 1
    },
    habilidades_requeridas: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Habilidad'
    }]
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Mision', misionSchema);