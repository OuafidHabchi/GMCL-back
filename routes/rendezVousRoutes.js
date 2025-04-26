// routes/rendezVousRoutes.js

const express = require('express');
const router = express.Router();
const rdvController = require('../controllers/rendezVousController');

router.post('/create', rdvController.createRendezVous);
router.get('/getAll', rdvController.getAllRendezVous);
router.get('/:id', rdvController.getRendezVousById);
router.put('/:id', rdvController.updateRendezVous);
router.delete('/:id', rdvController.deleteRendezVous);
router.put('/confirm/:id', rdvController.confirmRendezVous);
// routes/rendezVousRoutes.js
router.get('/byDate/:date', rdvController.getRendezVousByDate);

module.exports = router;
