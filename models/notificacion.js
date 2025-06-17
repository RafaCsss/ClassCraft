const mongoose = require('mongoose');

const notificacionSchema = new mongoose.Schema({
  usuario_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  tipo: {
    type: String,
    required: true,
    enum: ['recompensa', 'mision', 'equipo', 'habilidad', 'sistema']
  },
  titulo: {
    type: String,
    required: true
  },
  mensaje: {
    type: String,
    required: true
  },
  leida: {
    type: Boolean,
    default: false
  },
  fecha_creacion: {
    type: Date,
    default: Date.now
  },
  fecha_expiracion: {
    type: Date,
    required: true
  },
  datos_extra: {
    url_accion: {
      type: String,
      default: ''
    },
    parametros: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  prioridad: {
    type: String,
    required: true,
    enum: ['baja', 'normal', 'alta', 'critica'],
    default: 'normal'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Notificacion', notificacionSchema);