const SibApiV3Sdk = require('sib-api-v3-sdk');
const Estimation = require('../models/Estimation'); // Import du modèle Estimation
const Employee = require('../models/Employee'); // Import du modèle Employee

exports.createEstimation = async (req, res) => {
    try {
        const { type, fullName, email, phone, brand, model, trim, year, description } = req.body;
        const images = req.files?.map(file => file.path) || [];

        // Nettoyage des chemins d'images
        const cleanedImages = images.map(imgPath => {
            const parts = imgPath.split('uploads');
            return parts[1] ? `uploads${parts[1].replace(/\\/g, '/')}` : imgPath;
        });

        // Création de la nouvelle estimation
        const newEstimation = new Estimation({
            type,
            fullName,
            email,
            phone,
            brand,
            model,
            trim,
            year,
            description,
            images: cleanedImages
        });

        await newEstimation.save();

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

            sendSmtpEmail.subject = `Nouvelle estimation - ${brand} ${model}`;

            sendSmtpEmail.htmlContent = `
                <h3>Bonjour ${employee.name || 'Cher employé'},</h3>
                <p>Une nouvelle estimation a été soumise :</p>
                
                <h4>Détails du client :</h4>
                <ul>
                    <li><strong>Nom :</strong> ${fullName}</li>
                    <li><strong>Email :</strong> ${email}</li>
                    <li><strong>Téléphone :</strong> ${phone}</li>
                </ul>
                
                <h4>Détails du véhicule :</h4>
                <ul>
                    <li><strong>Type :</strong> ${type}</li>
                    <li><strong>Marque :</strong> ${brand}</li>
                    <li><strong>Modèle :</strong> ${model}</li>
                    <li><strong>Finition :</strong> ${trim}</li>
                    <li><strong>Année :</strong> ${year}</li>
                </ul>
                
                <h4>Description :</h4>
                <p>${description || 'Aucune description fournie'}</p>
                
                ${images.length > 0 ? `
                <h4>Images :</h4>
                <p>${images.length} image(s) disponible(s) sur le tableau de bord</p>
                ` : ''}
                
                <hr>
                <p>Connectez-vous à votre tableau de bord pour voir les détails complets et répondre au client.</p>
                <p>Cordialement,<br>L'équipe OPEX LOGISTIX</p>
            `;

            return apiInstance.sendTransacEmail(sendSmtpEmail);
        });

        // Envoi de tous les emails
        await Promise.all(sendEmailPromises);

        return res.status(201).json({
            success: true,
            message: 'Estimation créée et notifications envoyées aux employés',
            estimation: newEstimation
        });

    } catch (error) {
        console.error('Erreur lors de la création de l\'estimation :', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur lors de la création de l\'estimation',
            error: error.message
        });
    }
};

exports.getAllEstimations = async (req, res) => {
    try {
        const estimations = await Estimation.find();
        return res.status(200).json({ success: true, estimations });
    } catch (error) {
        console.error('Erreur lors de la récupération des estimations :', error);
        return res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
};

exports.deleteEstimationById = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Estimation.findByIdAndDelete(id);

        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Estimation non trouvée.' });
        }

        return res.status(200).json({ success: true, message: 'Estimation supprimée avec succès.' });
    } catch (error) {
        console.error('Erreur lors de la suppression :', error);
        return res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
};


exports.markEstimationAsSeen = async (req, res) => {
    try {
        const { estimationId, seenBy } = req.body;

        const estimation = await Estimation.findById(estimationId);
        if (!estimation) {
            return res.status(404).json({ success: false, message: 'Estimation non trouvée.' });
        }

        if (!estimation.Seen.includes(seenBy)) {
            estimation.Seen.push(seenBy);
            await estimation.save();
        }

        return res.status(200).json({ success: true, estimation });
    } catch (error) {
        console.error('Erreur lors de la mise à jour de l’estimation :', error);
        return res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
};


exports.replyToEstimation = async (req, res) => {
    try {
        const { estimationId, replyBy, replyMessage } = req.body;

        const estimation = await Estimation.findById(estimationId);
        if (!estimation) {
            return res.status(404).json({
                success: false,
                message: 'Estimation non trouvée.'
            });
        }

        estimation.reply = true;
        estimation.replyBy = replyBy;
        estimation.replyMessage = replyMessage;
        estimation.replyDate = new Date();

        await estimation.save();

        // Envoi d'email de réponse au client
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
            email: estimation.email,
            name: estimation.fullName
        }];
        sendSmtpEmail.subject = `Réponse à votre estimation pour ${estimation.brand} ${estimation.model}`;

        sendSmtpEmail.htmlContent = `
           <!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Réponse à votre estimation</title>
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
        .header img {
            max-width: 150px;
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
        .vehicle-info {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
            border-left: 4px solid #0056b3;
        }
        .reply-message {
            background-color: #f0f7ff;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
            border-left: 4px solid #28a745;
            font-style: italic;
        }
        .reply-info {
            margin: 15px 0;
            padding: 10px;
            background-color: #f8f9fa;
            border-radius: 5px;
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
            color: #0056b3;
            font-size: 20px;
            margin-bottom: 5px;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo-text">GMCL Team</div>
            <h1>Réponse à votre estimation</h1>
        </div>
        
        <div class="content">
            <div class="greeting">Bonjour ${estimation.fullName},</div>
            
            <p>Nous vous remercions pour votre demande d'estimation concernant votre véhicule.</p>
            
            <div class="vehicle-info">
                <strong>Véhicule concerné :</strong><br>
                ${estimation.brand} ${estimation.model}
            </div>
            
            <div style="margin: 25px 0;">
    <h3 style="font-size: 18px; color: #2d3748; font-weight: 600; margin-bottom: 12px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">
        ✨ Notre expertise pour vous
    </h3>
    
    <div style="background: #f8fafc; border-radius: 8px; padding: 20px; border-left: 4px solid #4299e1; margin: 15px 0;">
        <div style="display: flex; align-items: flex-start;">
            <div style="margin-right: 12px;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#4299e1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M12 8V12" stroke="#4299e1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M12 16H12.01" stroke="#4299e1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
            <div>
                <p style="margin: 0; color: #4a5568; font-size: 15px; line-height: 1.6; white-space: pre-line;">${replyMessage}</p>
            </div>
        </div>
    </div>
    
    <div style="background: #ebf8ff; border-radius: 6px; padding: 12px; margin-top: 15px; display: flex; align-items: center;">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="#3182ce" style="margin-right: 10px;" xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18ZM11 6C11 5.44772 10.5523 5 10 5C9.44772 5 9 5.44772 9 6V10C9 10.2652 9.10536 10.5196 9.29289 10.7071L12.1213 13.5355C12.5118 13.9261 13.145 13.9261 13.5355 13.5355C13.9261 13.145 13.9261 12.5118 13.5355 12.1213L11 9.58579V6Z"/>
        </svg>
        <p style="margin: 0; color: #2b6cb0; font-size: 14px;">
           Cette estimation est valable 15 jours
        </p>
    </div>
</div>
            
            <div class="reply-info">
                <strong>Date de réponse :</strong> ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            
            <p>Nous restons à votre disposition pour toute information complémentaire.</p>
            
            <div class="footer">
                <p>Cordialement,<br>L'équipe <strong>GMCL Team</strong></p>
                
                <div class="contact-info">
                    Téléphone : <a href="tel:5247570004">524-757-0004</a><br>
                    Email : <a href="mailto:gmclteam@gmail.com">gmclteam@gmail.com</a>
                </div>
                
                <p style="margin-top: 20px; font-size: 12px;">
                    © ${new Date().getFullYear()} GMCL Team. Tous droits réservés.
                </p>
            </div>
        </div>
    </div>
</body>
</html>
        `;

        await apiInstance.sendTransacEmail(sendSmtpEmail);

        return res.status(200).json({
            success: true,
            message: 'Réponse enregistrée et email envoyé au client',
            estimation
        });

    } catch (error) {
        console.error('Erreur lors de la réponse à l\'estimation :', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur serveur.'
        });
    }
};