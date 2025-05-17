const express = require('express');
const router = express.Router();
const estimationController = require('../controllers/estimationController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Créer le dossier "uploads" en dehors du dossier "routes"
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Remplacer l'extension .heic par .jpg si nécessaire
    const ext = file.originalname.toLowerCase().endsWith('.heic') ? '.jpg' : path.extname(file.originalname);
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + ext;
    cb(null, uniqueName);
  }
});

// Filtrer seulement les images
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/heic', 'image/heif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Seuls les fichiers JPEG, PNG et HEIC sont autorisés'), false);
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max par fichier
  }
});

router.post('/create', upload.array('images', 5), estimationController.createEstimation);
router.get('/getAll', estimationController.getAllEstimations);
router.delete('/:id', estimationController.deleteEstimationById);
router.put('/markAsSeen', estimationController.markEstimationAsSeen);
router.put('/reply', estimationController.replyToEstimation);



module.exports = router;
