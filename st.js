const mongoose = require('mongoose');
require('dotenv').config();

// Modèle Employee
const Employee = require('./models/Employee'); // Assurez-vous que le chemin est correct

async function createUser() {
  try {
    // Connexion à MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://wafid:wafid@ouafid.aihn5iq.mongodb.net/GMCL');

    // Création de l'utilisateur
    const newUser = new Employee({
      name: "Mustapha",
      email: "mustapha@vtrl.com", // J'ai modifié pour un email valide
      password: "vtrl", // En production, vous devriez hacher ce mot de passe
      role: "manager"
    });

    // Sauvegarde dans la base de données
    const savedUser = await newUser.save();
    console.log('Utilisateur créé avec succès:', savedUser);

    // Déconnexion
    await mongoose.disconnect();
  } catch (error) {
    console.error('Erreur lors de la création de l\'utilisateur:', error);
    process.exit(1);
  }
}

createUser();