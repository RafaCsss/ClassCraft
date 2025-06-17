const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const usuarioSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  rol: {
    type: String,
    required: true,
    enum: ['estudiante', 'profesor', 'admin'],
    default: 'estudiante'
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
  fecha_registro: {
    type: Date,
    default: Date.now
  },
  activo: {
    type: Boolean,
    default: true
  },
  ultima_conexion: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Hash de contraseña antes de guardar
usuarioSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Método para comparar contraseñas
usuarioSchema.methods.compararPassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

// Actualizar última conexión
usuarioSchema.methods.actualizarUltimaConexion = function() {
  this.ultima_conexion = new Date();
  return this.save();
};

module.exports = mongoose.model('Usuario', usuarioSchema);