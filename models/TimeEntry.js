const mongoose = require('mongoose');

const timeEntrySchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true
  },
  date: {
    type: String, // Format: YYYY-MM-DD
    required: true
  },
  startTime: {
    type: String, // Format: HH:mm
    required: true
  },
  endTime: {
    type: String // Format: HH:mm
  },
  breakDuration: {
    type: Number, // en minutes
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('TimeEntry', timeEntrySchema);