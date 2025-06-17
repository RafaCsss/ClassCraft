const mongoose = require('mongoose');

const habilidadSchema = new mongoose.Schema({
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
    enum: ['ataque', 'defensa', 'utilidad', 'curacion', 'general']
  },
  es_general: {
    type: Boolean,
    default: false
  },
  clases_permitidas: [{
    type: String,
    enum: ['mago', 'guerrero', 'curandero']
  }],
  nivel_desbloqueo: {
    type: Number,
    required: true,
    min: 1
  },
  costo_energia: {
    type: Number,
    required: true,
    min: 0
  },
  cooldown_segundos: {
    type: Number,
    required: true,
    min: 0
  },
  efectos: [{
    tipo: {
      type: String,
      required: true
    },
    valor_puntos: {
      type: Number,
      required: true // puntos exactos, no porcentajes
    },
    objetivo: {
      type: String,
      required: true,
      enum: ['self', 'equipo', 'enemigo']
    },
    duracion_segundos: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  icono: {
    type: String,
    required: true // nombre archivo local
  },
  animaciones: {
    gif_archivo: {
      type: String,
      required: true // nombre del gif
    },
    duracion_ms: {
      type: Number,
      required: true,
      min: 100
    },
    pantalla_completa: {
      type: Boolean,
      default: false
    },
    posicion: {
      type: String,
      enum: ['centro', 'arriba', 'abajo'],
      default: 'centro'
    }
  },
  audio: {
    sonido_base: {
      type: String,
      required: true // archivo de audio principal
    },
    variantes_por_clase: {
      mago: {
        type: String,
        default: ''
      },
      guerrero: {
        type: String,
        default: ''
      },
      curandero: {
        type: String,
        default: ''
      }
    },
    volumen: {
      type: Number,
      default: 0.5,
      min: 0.0,
      max: 1.0
    },
    simultaneo: {
      type: Boolean,
      default: true
    }
  },
  categoria_general: {
    type: String,
    enum: ['curacion', 'defensa', 'utilidad'],
    required: function() {
      return this.es_general;
    }
  }
}, {
  timestamps: true
});

// Validación: si es_general es true, clases_permitidas debe estar vacío
habilidadSchema.pre('save', function(next) {
  if (this.es_general && this.clases_permitidas.length > 0) {
    this.clases_permitidas = [];
  }
  next();
});

// Método para verificar si un personaje puede usar esta habilidad
habilidadSchema.methods.puedeUsarPersonaje = function(personaje, clasePersonaje) {
  // Verificar nivel
  if (personaje.nivel < this.nivel_desbloqueo) {
    return false;
  }
  
  // Si es general, cualquiera puede usarla
  if (this.es_general) {
    return true;
  }
  
  // Verificar clase permitida
  return this.clases_permitidas.includes(clasePersonaje.nombre);
};

// Método para obtener audio según clase
habilidadSchema.methods.getAudioPorClase = function(nombreClase) {
  const audioClase = this.audio.variantes_por_clase[nombreClase];
  return {
    sonido_base: this.audio.sonido_base,
    sonido_clase: audioClase || '',
    volumen: this.audio.volumen,
    simultaneo: this.audio.simultaneo
  };
};

module.exports = mongoose.model('Habilidad', habilidadSchema);