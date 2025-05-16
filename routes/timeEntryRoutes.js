const express = require('express');
const router = express.Router();
const timeEntryController = require('../controllers/timeEntryController');


// Routes pour les entrées de temps
router.post('/', timeEntryController.createTimeEntry);
router.put('/:id', timeEntryController.updateTimeEntry);
router.get('/', timeEntryController.getTimeEntries);
router.get('/report', timeEntryController.generateReport);


router.put('/update/:id', timeEntryController.updateTimeEntryById); // Nouvelle route

router.get('/employe', timeEntryController.getTimeEntryByEmployeeAndDate); // Nouvelle route


module.exports = router;