const mongoose = require('mongoose');

const inventarioSchema = new mongoose.Schema({
  personaje_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Personaje',
    required: true,
    unique: true // Un inventario por personaje
  },
  capacidad_max: {
    type: Number,
    required: true,
    min: 1,
    default: 20
  },
  monedas: {
    type: Number,
    default: 0,
    min: 0
  },
  items: [{
    item_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      required: true
    },
    cantidad: {
      type: Number,
      required: true,
      min: 1
    },
    fecha_obtenido: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Método para agregar item
inventarioSchema.methods.agregarItem = function(itemId, cantidad = 1) {
  const itemExistente = this.items.find(item => item.item_id.equals(itemId));
  
  if (itemExistente) {
    itemExistente.cantidad += cantidad;
  } else {
    this.items.push({
      item_id: itemId,
      cantidad: cantidad
    });
  }
  
  return this.save();
};

// Método para gastar monedas
inventarioSchema.methods.gastarMonedas = function(cantidad) {
  if (this.monedas >= cantidad) {
    this.monedas -= cantidad;
    return true;
  }
  return false;
};

module.exports = mongoose.model('Inventario', inventarioSchema);