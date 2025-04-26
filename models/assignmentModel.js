const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  nomEmploye: { type: String, required: true },
  nomDitem: { type: String, required: true },
  itemId: { type: String, required: true },
  date: { type: Date, required: true },
  quantite: { type: Number, required: true }
});

module.exports = mongoose.model('Assignment', assignmentSchema);
