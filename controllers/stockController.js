const Stock = require('../models/stockModel');
const Assignment = require('../models/assignmentModel'); // 🔥 Ajouter cette ligne


// Créer un stock
exports.createStock = async (req, res) => {
  try {
    const stock = new Stock(req.body);
    const saved = await stock.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Obtenir tous les stocks
exports.getAllStocks = async (req, res) => {
  const stocks = await Stock.find().sort({ createdAt: -1 });
  res.json(stocks);
};

// Obtenir un stock par ID
exports.getStockById = async (req, res) => {
  try {
    const stock = await Stock.findById(req.params.id);
    if (!stock) return res.status(404).json({ error: 'Stock non trouvé' });
    res.json(stock);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Mettre à jour un stock
exports.updateStock = async (req, res) => {
  try {
    const updated = await Stock.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Stock non trouvé' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Supprimer un stock et les assignments associés
exports.deleteStock = async (req, res) => {
    try {
      const deleted = await Stock.findByIdAndDelete(req.params.id);
      if (!deleted) return res.status(404).json({ error: 'Stock non trouvé' });
  
      // 🔁 Supprimer tous les assignments liés à ce stock
      await Assignment.deleteMany({ itemId: req.params.id });
  
      res.json({ message: 'Stock et assignments associés supprimés' });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  };
