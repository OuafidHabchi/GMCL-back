// controllers/rendezVousController.js

const RendezVous = require('../models/RendezVous');
const Employee = require('../models/Employee'); // Import du modèle Employee
const SibApiV3Sdk = require('sib-api-v3-sdk');


exports.createRendezVous = async (req, res) => {
    console.log("Données reçues:", req.body);
    try {
        const newRDV = new RendezVous(req.body);
        await newRDV.save();

        // Récupération de tous les employés avec leurs emails
        const employees = await Employee.find({}, 'email name');

        // Configuration de l'API Brevo
        const defaultClient = SibApiV3Sdk.ApiClient.instance;
        const apiKey = defaultClient.authentications['api-key'];
        apiKey.apiKey = process.env.BREVO_API_KEY;

        const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

        // Préparation des emails pour chaque employé
        const sendEmailPromises = employees.map(employee => {
            const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

            sendSmtpEmail.sender = {
                name: "GMCL Team",
                email: "gmclteam@gmail.com"
            };

            sendSmtpEmail.to = [{
                email: employee.email,
                name: employee.name || 'Employé'
            }];

            sendSmtpEmail.subject = `Nouveau rendez-vous - ${req.body.type}`;

            sendSmtpEmail.htmlContent = `
                <h3>Bonjour ${employee.name || 'Cher employé'},</h3>
                <p>Un nouveau rendez-vous a été créé :</p>
                
                <h4>Détails du client :</h4>
                <ul>
                    <li><strong>Nom :</strong> ${req.body.clientFullName}</li>
                    <li><strong>Email :</strong> ${req.body.clientEmail}</li>
                    <li><strong>Téléphone :</strong> ${req.body.clientPhoneNumber}</li>
                </ul>
                
                <h4>Détails du rendez-vous :</h4>
                <ul>
                    <li><strong>Type :</strong> ${req.body.type}</li>
                    <li><strong>Date :</strong> ${req.body.date}</li>
                    <li><strong>Heure :</strong> ${req.body.heure}</li>
                </ul>
                
                <hr>
                <p>Connectez-vous à votre tableau de bord pour voir les détails et gérer ce rendez-vous.</p>
                <p>Cordialement,<br>L'équipe OPEX LOGISTIX</p>
            `;

            return apiInstance.sendTransacEmail(sendSmtpEmail);
        });

        // Envoi des emails à tous les employés
        await Promise.all(sendEmailPromises);

        return res.status(201).json({
            success: true,
            data: newRDV,
            message: "Rendez-vous créé avec succès et notifications envoyées"
        });

    } catch (error) {
        console.error('Erreur lors de la création du rendez-vous :', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur lors de la création du rendez-vous',
            error: error.message
        });
    }
};

exports.getAllRendezVous = async (req, res) => {
    try {
        const allRDV = await RendezVous.find().populate('estimationId');
        res.status(200).json(allRDV);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getRendezVousById = async (req, res) => {
    try {
        const rdv = await RendezVous.findById(req.params.id).populate('estimationId');
        if (!rdv) return res.status(404).json({ message: "Rendez-vous non trouvé" });
        res.status(200).json(rdv);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateRendezVous = async (req, res) => {
    try {
        const updated = await RendezVous.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteRendezVous = async (req, res) => {
    try {
        await RendezVous.findByIdAndDelete(req.params.id);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


exports.confirmRendezVous = async (req, res) => {
    try {
        const { id } = req.params;
        const { confirmedBy } = req.body;

        const rdv = await RendezVous.findByIdAndUpdate(
            id,
            { confirmation: true, confirmedBy },
            { new: true }
        );

        if (!rdv) {
            return res.status(404).json({ message: "Rendez-vous non trouvé." });
        }

        // --- Envoi de l'email de confirmation au client ---
        const defaultClient = SibApiV3Sdk.ApiClient.instance;
        const apiKey = defaultClient.authentications['api-key'];
        apiKey.apiKey = process.env.BREVO_API_KEY;

        const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
        const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

        sendSmtpEmail.sender = {
            name: "GMCL Team",
            email: "gmclteam@gmail.com"
        };

        sendSmtpEmail.to = [{
            email: rdv.clientEmail,
            name: rdv.clientFullName
        }];

        sendSmtpEmail.subject = "Confirmation de votre rendez-vous";

        sendSmtpEmail.htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirmation de rendez-vous</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .email-container {
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        .header {
            background-color: #0056b3;
            padding: 20px;
            text-align: center;
        }
        .header h1 {
            color: white;
            margin: 0;
            font-size: 22px;
        }
        .content {
            padding: 25px;
        }
        .greeting {
            font-size: 18px;
            margin-bottom: 20px;
        }
        .rdv-info {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
            border-left: 4px solid #0056b3;
        }
        .rdv-details {
            margin: 15px 0;
        }
        .rdv-details li {
            margin-bottom: 10px;
            display: flex;
            align-items: center;
        }
        .rdv-details li svg {
            margin-right: 10px;
            min-width: 20px;
        }
        .description {
            background-color: #f0f7ff;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
            border-left: 4px solid #28a745;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eaeaea;
            text-align: center;
            font-size: 14px;
            color: #666666;
        }
        .contact-info {
            margin-top: 15px;
            font-weight: bold;
        }
        .logo-text {
            font-weight: bold;
            color: white;
            font-size: 20px;
            margin-bottom: 5px;
        }
        .important-note {
            background-color: #fff3cd;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
            border-left: 4px solid #ffc107;
            display: flex;
            align-items: flex-start;
        }
        .important-note svg {
            margin-right: 10px;
            min-width: 20px;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo-text">GMCL Team</div>
            <h1>Confirmation de votre rendez-vous</h1>
        </div>
        
        <div class="content">
            <div class="greeting">Bonjour ${rdv.clientFullName},</div>
            
            <p>Nous avons le plaisir de vous confirmer votre rendez-vous avec notre équipe.</p>
            
            <div class="important-note">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#d4a017" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
                <div>
                    <strong>N'oubliez pas votre rendez-vous :</strong><br>
                    Le ${new Date(rdv.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} à ${rdv.heure}
                </div>
            </div>
            
            <div class="rdv-info">
                <h3 style="margin-top: 0;">Détails du rendez-vous</h3>
                <ul class="rdv-details">
                    <li>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="#0056b3" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm-8 4H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z"/>
                        </svg>
                        <strong>Date :</strong> ${new Date(rdv.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </li>
                    <li>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="#0056b3" xmlns="http://www.w3.org/2000/svg">
                            <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                        </svg>
                        <strong>Heure :</strong> ${rdv.heure}
                    </li>
                    <li>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="#0056b3" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z"/>
                        </svg>
                        <strong>Type :</strong> ${rdv.type}
                    </li>
                    <li>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="#0056b3" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                        </svg>
                        <strong>Confirmé par : GMCL Team</strong> 
                    </li>
                </ul>
            </div>
            
            ${rdv.description ? `
            <div class="description">
                <strong>Informations complémentaires :</strong>
                <p style="margin-bottom: 0;">${rdv.description}</p>
            </div>
            ` : ''}
            
            <p>Pour toute modification ou annulation, merci de nous contacter au plus tôt.</p>
            
            <div class="footer">
                <p>Cordialement,<br>L'équipe <strong>GMCL</strong></p>
                
                <div class="contact-info">
                    Téléphone : <a href="tel:5247570004">524-757-0004</a><br>
                    Email : <a href="mailto:gmclteam@gmail.com">gmclteam@gmail.com</a>
                </div>
                
                <p style="margin-top: 20px; font-size: 12px;">
                    © ${new Date().getFullYear()} Garage Mécanique Carrosserie Longueuil. Tous droits réservés.
                </p>
            </div>
        </div>
    </div>
</body>
</html>
        `;

        await apiInstance.sendTransacEmail(sendSmtpEmail);

        res.status(200).json({
            message: "Rendez-vous confirmé avec succès et email envoyé au client.",
            rdv
        });

    } catch (error) {
        console.error("Erreur lors de la confirmation du rendez-vous :", error);
        res.status(500).json({ error: error.message });
    }
};


// controllers/rendezVousController.js
exports.getRendezVousByDate = async (req, res) => {
    try {
        const date = new Date(req.params.date);
        const startOfDay = new Date(date.setHours(0, 0, 0, 0));
        const endOfDay = new Date(date.setHours(23, 59, 59, 999));

        const rdvs = await RendezVous.find({
            date: {
                $gte: startOfDay,
                $lte: endOfDay
            }
        });

        res.status(200).json(rdvs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};