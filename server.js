const express = require('express');
const mongoose = require('mongoose');
const employeeRoutes = require('./routes/employeeRoutes');
const estimationRoutes = require('./routes/estimationRoutes');
const rendezVousRoutes = require('./routes/rendezVousRoutes');
const stockRoutes = require('./routes/stockRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const timeEntryRoutes = require('./routes/timeEntryRoutes');



require('dotenv').config();
const path = require('path');


const app = express();
const cors = require('cors');
app.use(cors()); // Ajoutez ceci avant vos routes

// Middleware
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// Connexion à MongoDB
mongoose.connect('mongodb+srv://wafid:wafid@ouafid.aihn5iq.mongodb.net/GMCL')
  .then(() => console.log('Connecté à MongoDB'))
  .catch(err => console.error('Erreur de connexion à MongoDB:', err));

// Routes
app.use('/api/employees', employeeRoutes);
app.use('/api/estimations', estimationRoutes);
app.use('/api/rendezvous', rendezVousRoutes);
app.use('/api/stocks', stockRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/time-entries', timeEntryRoutes);




// Démarrer le serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});