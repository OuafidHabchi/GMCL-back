// models/RendezVous.js

const mongoose = require('mongoose');

const rendezVousSchema = new mongoose.Schema({
  clientFullName: {
    type: String,
    required: true,
  },
  clientPhoneNumber: {
    type: String,
    required: true,
  },
  clientEmail: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  heure: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },

  description: {
    type: String,
    required: true,
  },
  estimationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Estimation',
    // required: true,
  },

  confirmation: {
    type: Boolean,
    default: false,
  },
  confirmedBy: {
    type: String, // ou ObjectId si tu veux référencer un utilisateur
    default: null,
  },
  preferredLanguage: { type: String, required: true },
  contactMethod: { type: String, required: true },
}, {
  timestamps: true // ajoute createdAt et updatedAt
});

module.exports = mongoose.model('RendezVous', rendezVousSchema);
