const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');

router.post('/create', assignmentController.createAssignment);
router.get('/getAll', assignmentController.getAllAssignments);
router.get('/:id', assignmentController.getAssignmentById);
router.put('/:id', assignmentController.updateAssignment);
router.delete('/:id', assignmentController.deleteAssignment);

router.get('/by-item/:itemId', assignmentController.getAssignmentsByItemId);


module.exports = router;
