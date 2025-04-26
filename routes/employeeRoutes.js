const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');

router.get('/All', employeeController.getAllEmployees);
router.post('/login', employeeController.login);
router.post('/createEmployee', employeeController.createEmployee);
router.put('/updateEmployee/:id', employeeController.updateEmployeeById);
router.delete('/deleteEmployee/:id', employeeController.deleteEmployeeById);

module.exports = router;