const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
  name: { type: String, required: true },
  quantity: { type: Number, required: true },
  category: { type: String, required: true },
  createdAt: { type: Date, required: true },
  qunatiteConsomee: { type: Number,default: 0 },
});

module.exports = mongoose.model('Stock', stockSchema);
