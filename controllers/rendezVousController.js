// controllers/rendezVousController.js

const RendezVous = require('../models/RendezVous');
const Employee = require('../models/Employee'); // Import du modèle Employee
const SibApiV3Sdk = require('sib-api-v3-sdk');
const axios = require('axios');



exports.createRendezVous = async (req, res) => {
    try {
        const {
            type, date, heure,
            clientFullName, clientEmail, clientPhoneNumber,
            preferredLanguage, contactMethod, description
        } = req.body;

        const newRDV = new RendezVous({
            type, date, heure,
            clientFullName, clientEmail, clientPhoneNumber,
            preferredLanguage, contactMethod, description
        });

        await newRDV.save();

        // 🔒 On cible uniquement les managers
        const managers = await Employee.find({ role: 'manager' }, 'email name phone');

        // 🟦 Configuration Brevo
        const defaultClient = SibApiV3Sdk.ApiClient.instance;
        const apiKey = defaultClient.authentications['api-key'];
        apiKey.apiKey = process.env.BREVO_API_KEY;
        const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

        // 📨 Notification aux managers (email + SMS)
        const notifyManagers = managers.map(manager => {
            // Email
            const emailToManager = new SibApiV3Sdk.SendSmtpEmail();
            emailToManager.sender = { name: "GMCL Team", email: "gmclteam@gmail.com" };
            emailToManager.to = [{ email: manager.email, name: manager.name || 'Manager' }];
            emailToManager.subject = `Nouveau rendez-vous - ${type}`;
            emailToManager.htmlContent = `
                <h3>Bonjour ${manager.name || 'Manager'},</h3>
                <p>Un nouveau rendez-vous a été planifié :</p>
                <h4>Client :</h4>
                <ul>
                    <li><strong>Nom :</strong> ${clientFullName}</li>
                    <li><strong>Email :</strong> ${clientEmail}</li>
                    <li><strong>Téléphone :</strong> ${clientPhoneNumber}</li>
                </ul>
                <h4>Détails du rendez-vous :</h4>
                <ul>
                    <li><strong>Type :</strong> ${type}</li>
                    <li><strong>Date :</strong> ${date}</li>
                    <li><strong>Heure :</strong> ${heure}</li>
                </ul>
                <p>Connectez-vous au tableau de bord pour plus d'informations.</p>
                <br><p>L'équipe GMCL</p>
            `;

            // SMS
            const smsMessage = `Bonjour ${manager.name || 'Manager'}, un nouveau RDV a été créé --GMCL Team--.`;

            const smsPromise = axios.post('https://hook.us2.make.com/lzpdws1j3jijtd4qsxo47racivrym929', {
                phone: manager.phone,
                message: smsMessage
            }).catch(err => {
                console.error(`❌ Erreur SMS manager ${manager.name}:`, err.response?.data || err.message);
            });

            return Promise.all([
                apiInstance.sendTransacEmail(emailToManager),
                smsPromise
            ]);
        });

        await Promise.all(notifyManagers);

        return res.status(201).json({
            success: true,
            data: newRDV,
            message: "Rendez-vous créé avec succès et managers notifiés"
        });

    } catch (error) {
        console.error('❌ Erreur lors de la création du rendez-vous :', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur lors de la création du rendez-vous',
            error: error.message
        });
    }
};




exports.getAllRendezVous = async (req, res) => {
    try {
        let query = {};

        console.log("Query params:", req.query);
        
        
        // Gestion des filtres de date
        if (req.query.startDate && req.query.endDate) {
            const startDate = new Date(req.query.startDate);
            const endDate = new Date(req.query.endDate);
            
            // On ajoute un jour à la date de fin pour inclure toute la journée
            endDate.setDate(endDate.getDate() + 1);
            
            query.date = {
                $gte: startDate,
                $lt: endDate
            };
        }
        
        const allRDV = await RendezVous.find(query).populate('estimationId');
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

        // Vérifie si le rendez-vous existe
        const rdv = await RendezVous.findById(id);
        if (!rdv) {
            return res.status(404).json({
                success: false,
                message: 'Rendez-vous non trouvé.'
            });
        }

        // Mettre à jour le rendez-vous
        rdv.confirmation = true;
        rdv.confirmedBy = confirmedBy;
        rdv.confirmedAt = new Date();
        await rdv.save();

        // Extraire les infos nécessaires
        const {
            clientFullName,
            clientPhoneNumber,
            clientEmail,
            date,
            heure,
            type,
            description,
            preferredLanguage,
            contactMethod
        } = rdv;

        const isFr = preferredLanguage === 'fr';

        const subject = isFr
            ? `Confirmation de votre rendez-vous`
            : `Your appointment confirmation`;

        const formattedDate = new Date(date).toLocaleDateString(isFr ? 'fr-CA' : 'en-CA', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'UTC' // Adapter selon le fuseau horaire de tes rendez-vous
        });


        const message = isFr
            ? `Bonjour ${clientFullName},\nVotre rendez-vous est confirmé pour le ${formattedDate} à ${heure} (${type}).\nPour modifier ou annuler, veuillez appeler le +1 514-757-0004.\nMerci,\nL'équipe GMCL`
            : `Hello ${clientFullName},\nYour appointment is confirmed for ${formattedDate} at ${heure} (${type}).\nTo reschedule or cancel, please call +1 514-757-0004.\nThank you,\nGMCL Team`;

        // ✅ Envoi Email (si demandé)
        if (contactMethod === 'email' || contactMethod === 'both') {
            try {
                const defaultClient = SibApiV3Sdk.ApiClient.instance;
                const apiKey = defaultClient.authentications['api-key'];
                apiKey.apiKey = process.env.BREVO_API_KEY;
                const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

                const emailData = new SibApiV3Sdk.SendSmtpEmail();
                emailData.sender = { name: "GMCL Team", email: "gmclteam@gmail.com" };
                emailData.to = [{ email: clientEmail, name: clientFullName }];
                emailData.subject = subject;
                emailData.textContent = message;

                await apiInstance.sendTransacEmail(emailData);
            } catch (err) {
                console.error("❌ Erreur envoi email client :", err.response?.data || err.message);
            }
        }

        // ✅ Envoi SMS (si demandé)
        if ((contactMethod === 'phone' || contactMethod === 'both') && clientPhoneNumber) {
            try {
                await axios.post('https://hook.us2.make.com/lzpdws1j3jijtd4qsxo47racivrym929', {
                    phone: clientPhoneNumber,
                    message
                });
            } catch (err) {
                console.error("❌ Erreur envoi SMS client :", err.response?.data || err.message);
            }
        }

        return res.status(200).json({
            success: true,
            message: 'Rendez-vous confirmé et message envoyé au client.',
            rdv
        });

    } catch (error) {
        console.error("❌ Erreur confirmRendezVous :", error);
        return res.status(500).json({
            success: false,
            message: 'Erreur serveur.',
            error: error.message
        });
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


exports.createAndConfirmRendezVous = async (req, res) => {
    try {
        const {
            type, date, heure,
            clientFullName, clientEmail, clientPhoneNumber,
            preferredLanguage , contactMethod , description,
            confirmedBy,confirmation  
        } = req.body;

        // 1. Création et confirmation immédiate du RDV
        const newRDV = new RendezVous({
            type, date, heure,
            clientFullName, clientEmail, clientPhoneNumber,
            preferredLanguage, contactMethod, description,
            confirmedBy,
            confirmation,
            confirmedAt: new Date()
        });

        const savedRDV = await newRDV.save();

        // 2. Notification au client uniquement
        const isFr = preferredLanguage === 'fr';
        const subject = isFr 
            ? `Confirmation de votre rendez-vous` 
            : `Your appointment confirmation`;

        const formattedDate = new Date(date).toLocaleDateString(isFr ? 'fr-CA' : 'en-CA', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'UTC'
        });

        const message = isFr
            ? `Bonjour ${clientFullName},\nVotre rendez-vous est confirmé pour le ${formattedDate} à ${heure} (${type}).\nPour modifier ou annuler, veuillez appeler le +1 514-757-0004.\nMerci,\nL'équipe GMCL`
            : `Hello ${clientFullName},\nYour appointment is confirmed for ${formattedDate} at ${heure} (${type}).\nTo reschedule or cancel, please call +1 514-757-0004.\nThank you,\nGMCL Team`;

        // Envoi Email (si email fourni)
        if (contactMethod === 'email' || contactMethod === 'both') {
            try {
                const defaultClient = SibApiV3Sdk.ApiClient.instance;
                const apiKey = defaultClient.authentications['api-key'];
                apiKey.apiKey = process.env.BREVO_API_KEY;
                const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

                const emailData = new SibApiV3Sdk.SendSmtpEmail();
                emailData.sender = { name: "GMCL Team", email: "gmclteam@gmail.com" };
                emailData.to = [{ email: clientEmail, name: clientFullName }];
                emailData.subject = subject;
                emailData.textContent = message;

                await apiInstance.sendTransacEmail(emailData);
            } catch (err) {
                console.error("❌ Erreur envoi email client :", err.response?.data || err.message);
            }
        }

        // Envoi SMS (si numéro fourni)
        if ((contactMethod === 'phone' || contactMethod === 'both') && clientPhoneNumber) {
            try {
                await axios.post('https://hook.us2.make.com/lzpdws1j3jijtd4qsxo47racivrym929', {
                    phone: clientPhoneNumber,
                    message
                });
            } catch (err) {
                console.error("❌ Erreur envoi SMS client :", err.response?.data || err.message);
            }
        }

        return res.status(201).json({
            success: true,
            data: savedRDV,
            message: "Rendez-vous créé, confirmé et client notifié avec succès"
        });

    } catch (error) {
        console.error('❌ Erreur lors de la création/confirmation du rendez-vous :', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur lors de la création du rendez-vous',
            error: error.message
        });
    }
};