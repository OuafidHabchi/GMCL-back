const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stockController');

router.post('/create', stockController.createStock);
router.get('/getAll', stockController.getAllStocks);
router.get('/:id', stockController.getStockById);
router.put('/:id', stockController.updateStock);
router.delete('/:id', stockController.deleteStock);

module.exports = router;
