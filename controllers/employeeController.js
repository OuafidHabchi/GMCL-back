const Employee = require('../models/Employee');

exports.getAllEmployees = async (req, res) => {
  try {
    const employees = await Employee.find();    
    return res.status(200).json({ success: true, employees });

  } catch (error) {
    console.error('Erreur lors de la récupération des employés :', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Vérifier si l'employé existe
    const employee = await Employee.findOne({ email });
    
    if (!employee) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }
    
    // Vérifier le mot de passe (vous devriez utiliser bcrypt pour le hash)
    if (employee.password !== password) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }
    
   
    
    res.status(200).json({
      message: 'Connexion réussie',
      user: {
        id: employee._id,
        email: employee.email,
        name: employee.name,
        role: employee.role,
          // Ajoutez d'autres champs si nécessaire
      }
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};


exports.createEmployee = async (req, res) => {
  const { name, email, password, role,phone } = req.body;

  try {
    // Vérifie si l'utilisateur existe déjà
    const existingEmployee = await Employee.findOne({ email });
    if (existingEmployee) {
      return res.status(400).json({ success: false, message: 'Email déjà utilisé.' });
    }

    // Création de l'utilisateur
    const newEmployee = new Employee({
      name,
      email,
      password,
      phone,
      role
    });

    await newEmployee.save();

    return res.status(201).json({ success: true, employee: newEmployee });
  } catch (error) {
    console.error('Erreur lors de la création de l\'employé :', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};


exports.deleteEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedEmployee = await Employee.findByIdAndDelete(id);

    if (!deletedEmployee) {
      return res.status(404).json({ success: false, message: 'Employé non trouvé.' });
    }

    return res.status(200).json({ success: true, message: 'Employé supprimé avec succès.' });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'employé :', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

exports.updateEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, role,phone } = req.body;

    const updatedEmployee = await Employee.findByIdAndUpdate(
      id,
      { name, email, password, role,phone },
      { new: true }
    );

    if (!updatedEmployee) {
      return res.status(404).json({ success: false, message: 'Employé non trouvé.' });
    }

    return res.status(200).json({ success: true, employee: updatedEmployee });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'employé :', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};