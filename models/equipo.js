const mongoose = require('mongoose');

const equipoSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true
  },
  miembros: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Personaje'
    }],
    validate: {
      validator: function(v) {
        return v.length <= 4; // MAX 4 miembros
      },
      message: 'Un equipo no puede tener más de 4 miembros'
    },
    default: []
  },
  puntos: {
    type: Number,
    default: 0,
    min: 0
  },
  profesor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  clase_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clase',
    default: null // OPCIONAL: equipos existentes siguen funcionando
  },
  fecha_creacion: {
    type: Date,
    default: Date.now
  },
  activo: {
    type: Boolean,
    default: true
  },
  estadisticas: {
    misiones_completadas: {
      type: Number,
      default: 0,
      min: 0
    },
    habilidades_usadas_total: {
      type: Number,
      default: 0,
      min: 0
    },
    xp_total_ganado: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  configuracion: {
    color_equipo: {
      type: String,
      default: '#3498db'
    },
    emblema: {
      type: String,
      default: 'default.png'
    }
  }
}, {
  timestamps: true
});

// Método para agregar miembro
equipoSchema.methods.agregarMiembro = function(personajeId) {
  if (this.miembros.length >= 4) {
    throw new Error('Equipo lleno (máximo 4 miembros)');
  }
  
  if (!this.miembros.includes(personajeId)) {
    this.miembros.push(personajeId);
  }
  
  return this.save();
};

// Método para verificar si pertenece a una clase específica
equipoSchema.methods.perteneceAClase = function(claseId) {
  return this.clase_id && this.clase_id.toString() === claseId.toString();
};

// Método estático para buscar equipos por clase
equipoSchema.statics.findByClase = function(claseId) {
  return this.find({ clase_id: claseId });
};

// Método estático para buscar equipos globales (sin clase)
equipoSchema.statics.findGlobales = function(profesorId) {
  return this.find({ profesor_id: profesorId, clase_id: null });
};

module.exports = mongoose.model('Equipo', equipoSchema);