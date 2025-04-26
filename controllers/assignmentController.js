const Assignment = require('../models/assignmentModel');

// Créer un assignment
exports.createAssignment = async (req, res) => {
  try {
    const assignment = new Assignment(req.body);
    const saved = await assignment.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Obtenir tous les assignments
exports.getAllAssignments = async (req, res) => {
  const assignments = await Assignment.find().sort({ data: -1 });
  res.json(assignments);
};

// Obtenir un assignment par ID
exports.getAssignmentById = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ error: 'Assignment non trouvé' });
    res.json(assignment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Mettre à jour un assignment
exports.updateAssignment = async (req, res) => {
  try {
    const updated = await Assignment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Assignment non trouvé' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Supprimer un assignment
exports.deleteAssignment = async (req, res) => {
  try {
    const deleted = await Assignment.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Assignment non trouvé' });
    res.json({ message: 'Assignment supprimé' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Obtenir les assignments par itemId
exports.getAssignmentsByItemId = async (req, res) => {
    try {
      const assignments = await Assignment.find({ itemId: req.params.itemId }).sort({ date: -1 });
      res.json(assignments);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  };
  