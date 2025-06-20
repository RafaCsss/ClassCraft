const mongoose = require('mongoose');

const personajeSchema = new mongoose.Schema({
  usuario_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true,
    unique: true // Un usuario = Un personaje
  },
  clase_personaje_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ClasePersonaje',
    required: true
  },
  raza_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Raza',
    required: true
  },
  equipo_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Equipo',
    default: null
  },
  // NUEVO SISTEMA: Equipos por clase (un equipo por cada clase)
  equipos_por_clase: [{
    clase_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clase',
      required: true
    },
    equipo_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Equipo', 
      required: true
    },
    fecha_union: {
      type: Date,
      default: Date.now
    }
  }],
  salud_actual: {
    type: Number,
    required: true,
    min: 0
  },
  salud_maxima: {
    type: Number,
    required: true,
    min: 1
  },
  energia_actual: {
    type: Number,
    required: true,
    min: 0
  },
  energia_maxima: {
    type: Number,
    required: true,
    min: 1
  },
  nivel: {
    type: Number,
    default: 1,
    min: 1
  },
  experiencia: {
    type: Number,
    default: 0,
    min: 0
  },
  avatar: {
    imagen_base: {
      type: String,
      required: true
    },
    posicion_x: {
      type: Number,
      default: 0
    },
    posicion_y: {
      type: Number,
      default: 0
    },
    escala: {
      type: Number,
      default: 1.0,
      min: 0.1,
      max: 3.0
    }
  },
  habilidades: [{
    habilidad_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Habilidad',
      required: true
    },
    nivel: {
      type: Number,
      default: 1,
      min: 1
    },
    desbloqueada: {
      type: Boolean,
      default: false
    },
    equipada: {
      type: Boolean,
      default: false
    },
    veces_usada: {
      type: Number,
      default: 0,
      min: 0
    },
    fecha_ultimo_uso: {
      type: Date,
      default: null
    }
  }],
  fecha_creacion: {
    type: Date,
    default: Date.now
  },
  puede_cambiar_clase: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  // 🔧 FIX: Transform para convertir ObjectIds a strings en JSON
  toJSON: {
    transform: function(doc, ret) {
      // Convertir _id y otros ObjectIds principales a strings
      if (ret._id) ret._id = ret._id.toString();
      if (ret.usuario_id) ret.usuario_id = ret.usuario_id.toString();
      if (ret.clase_personaje_id) ret.clase_personaje_id = ret.clase_personaje_id.toString();
      if (ret.raza_id) ret.raza_id = ret.raza_id.toString();
      if (ret.equipo_id) ret.equipo_id = ret.equipo_id.toString();
      
      // Convertir equipos_por_clase ObjectIds
      if (ret.equipos_por_clase && Array.isArray(ret.equipos_por_clase)) {
        ret.equipos_por_clase = ret.equipos_por_clase.map(ec => ({
          ...ec,
          clase_id: ec.clase_id.toString(),
          equipo_id: ec.equipo_id.toString()
        }));
      }
      
      // Convertir habilidades ObjectIds
      if (ret.habilidades && Array.isArray(ret.habilidades)) {
        ret.habilidades = ret.habilidades.map(h => ({
          ...h,
          habilidad_id: h.habilidad_id.toString()
        }));
      }
      
      return ret;
    }
  }
});

// Validar que salud actual no exceda máxima
personajeSchema.pre('save', function(next) {
  if (this.salud_actual > this.salud_maxima) {
    this.salud_actual = this.salud_maxima;
  }
  if (this.energia_actual > this.energia_maxima) {
    this.energia_actual = this.energia_maxima;
  }
  next();
});

// Método para ganar XP
personajeSchema.methods.ganarExperiencia = function(cantidad) {
  this.experiencia += cantidad;
  // Lógica de subida de nivel podría ir aquí
  return this.save();
};

// Método para usar energía
personajeSchema.methods.usarEnergia = function(cantidad) {
  if (this.energia_actual >= cantidad) {
    this.energia_actual -= cantidad;
    return true;
  }
  return false;
};

// Método para curar
personajeSchema.methods.curar = function(cantidad) {
  this.salud_actual = Math.min(this.salud_actual + cantidad, this.salud_maxima);
  return this.save();
};

// ============ MÉTODOS PARA SISTEMA DE EQUIPOS POR CLASE ============

// Obtener equipo en una clase específica
personajeSchema.methods.getEquipoEnClase = function(claseId) {
  if (!claseId) return this.equipo_id; // Fallback al sistema viejo
  
  const equipoClase = this.equipos_por_clase.find(e => 
    e.clase_id.toString() === claseId.toString()
  );
  return equipoClase ? equipoClase.equipo_id : null;
};

// Verificar si está en un equipo (en clase específica o global)
personajeSchema.methods.estaEnEquipo = function(claseId = null) {
  if (claseId) {
    // Verificar en clase específica usando nuevo sistema
    return this.equipos_por_clase.some(e => 
      e.clase_id.toString() === claseId.toString()
    );
  }
  // Verificar sistema viejo + nuevo sistema
  return !!this.equipo_id || this.equipos_por_clase.length > 0;
};

// Unirse a equipo en clase específica
personajeSchema.methods.unirseAEquipoEnClase = function(equipoId, claseId) {
  // Verificar que no esté ya en un equipo en esa clase
  const yaEnEquipo = this.equipos_por_clase.find(e => 
    e.clase_id.toString() === claseId.toString()
  );
  
  if (yaEnEquipo) {
    throw new Error('Ya perteneces a un equipo en esta clase');
  }
  
  // Agregar al nuevo sistema
  this.equipos_por_clase.push({
    clase_id: claseId,
    equipo_id: equipoId,
    fecha_union: new Date()
  });
  
  return this.save();
};

// Salir de equipo en clase específica
personajeSchema.methods.salirDeEquipoEnClase = async function(claseId) {
  const index = this.equipos_por_clase.findIndex(e => 
    e.clase_id.toString() === claseId.toString()
  );
  
  if (index === -1) {
    throw new Error('No perteneces a ningún equipo en esta clase');
  }
  
  const equipoEliminado = this.equipos_por_clase[index];
  this.equipos_por_clase.splice(index, 1);
  
  // Guardar inmediatamente y retornar solo el equipo_id
  await this.save();
  
  return {
    equipo_id: equipoEliminado.equipo_id
  };
};

// Obtener todos los equipos del personaje con información de clase
personajeSchema.methods.obtenerTodosLosEquipos = function() {
  const equipos = [];
  
  // Equipos del nuevo sistema
  this.equipos_por_clase.forEach(ec => {
    equipos.push({
      equipo_id: ec.equipo_id,
      clase_id: ec.clase_id,
      fecha_union: ec.fecha_union,
      tipo: 'clase'
    });
  });
  
  // Equipo del sistema viejo (si existe y no hay equipos nuevos)
  if (this.equipo_id && equipos.length === 0) {
    equipos.push({
      equipo_id: this.equipo_id,
      clase_id: null,
      fecha_union: this.fecha_creacion,
      tipo: 'legacy'
    });
  }
  
  return equipos;
};

// Verificar compatibilidad entre sistemas
personajeSchema.methods.necesitaMigracion = function() {
  return !!this.equipo_id && this.equipos_por_clase.length === 0;
};

module.exports = mongoose.model('Personaje', personajeSchema);