const express = require('express');
const router = express.Router();
const estimationController = require('../controllers/estimationController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Créer le dossier "uploads" en dehors du dossier "routes"
const uploadDir = path.join(__dirname, '../uploads'); // Remarque : '../' pour accéder au dossier parent
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir); // maintenant tu es sûr que ça existe
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

router.post('/create', upload.array('images', 5), estimationController.createEstimation);
router.get('/getAll', estimationController.getAllEstimations);
router.delete('/:id', estimationController.deleteEstimationById);
router.put('/markAsSeen', estimationController.markEstimationAsSeen);
router.put('/reply', estimationController.replyToEstimation);



module.exports = router;
