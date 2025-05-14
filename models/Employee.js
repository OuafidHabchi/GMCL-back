const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
  },
   phone: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['manager', 'employe'], // tu peux modifier les rôles ici
    default: 'employe'
  }
});

module.exports = mongoose.model('Employee', employeeSchema);
