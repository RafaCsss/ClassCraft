const mongoose = require('mongoose');

const efectoActivoSchema = new mongoose.Schema({
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
  tipo_efecto: {
    type: String,
    required: true,
    enum: ['buff', 'debuff', 'curacion', 'daño', 'defensa']
  },
  valor_puntos: {
    type: Number,
    required: true // puntos exactos, no porcentajes
  },
  fecha_inicio: {
    type: Date,
    default: Date.now
  },
  fecha_expiracion: {
    type: Date,
    required: true
  },
  origen: {
    type: String,
    required: true,
    enum: ['habilidad', 'profesor', 'item', 'titulo']
  },
  activo: {
    type: Boolean,
    default: true
  },
  descripcion: {
    type: String,
    required: true
  },
  icono_efecto: {
    type: String,
    required: true // nombre archivo local
  },
  mostrar_animacion: {
    type: Boolean,
    default: true
  },
  datos_animacion: {
    gif_continuo: {
      type: String,
      default: ''
    },
    audio_activacion: {
      type: String,
      default: ''
    },
    audio_expiracion: {
      type: String,
      default: ''
    }
  }
}, {
  timestamps: true
});

// Método para verificar si el efecto ha expirado
efectoActivoSchema.methods.haExpirado = function() {
  return new Date() > this.fecha_expiracion;
};

module.exports = mongoose.model('EfectoActivo', efectoActivoSchema);