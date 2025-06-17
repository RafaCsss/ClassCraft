const mongoose = require('mongoose');

const claseSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true
  },
  codigo_clase: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  profesor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  estudiantes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario'
  }],
  descripcion: {
    type: String,
    required: true
  },
  fecha_creacion: {
    type: Date,
    default: Date.now
  },
  activa: {
    type: Boolean,
    default: true
  },
  configuracion: {
    max_estudiantes_por_equipo: {
      type: Number,
      default: 4,
      min: 2,
      max: 6
    },
    sistema_puntos: {
      xp_participacion: {
        type: Number,
        default: 10
      },
      xp_tarea_completada: {
        type: Number,
        default: 50
      },
      xp_bonus_equipo: {
        type: Number,
        default: 25
      }
    },
    habilidades_habilitadas: {
      type: Boolean,
      default: true
    },
    modo_competitivo: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Clase', claseSchema);