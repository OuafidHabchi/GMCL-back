const SibApiV3Sdk = require('sib-api-v3-sdk');
const Estimation = require('../models/Estimation'); // Import du modèle Estimation
const Employee = require('../models/Employee'); // Import du modèle Employee
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const heicConvert = require('heic-convert');

exports.createEstimation = async (req, res) => {
    try {
        const {
            type, fullName, email, phone,
            brand, model, trim, year, description,
            preferredLanguage, contactMethod
        } = req.body;
        // Traitement des images avec conversion HEIC si nécessaire
        const processedImages = [];

        for (const file of req.files || []) {
            let finalPath = file.path;

            // Vérifier si c'est un HEIC
            if (file.mimetype === 'image/heic' || file.originalname.toLowerCase().endsWith('.heic')) {
                try {
                    // Chemin pour la version JPEG
                    const jpegPath = file.path.replace(/\.heic$/i, '.jpg');

                    // Lire le fichier HEIC
                    const inputBuffer = fs.readFileSync(file.path);

                    // Convertir en JPEG
                    const outputBuffer = await heicConvert({
                        buffer: inputBuffer,
                        format: 'JPEG',
                        quality: 0.8
                    });

                    // Sauvegarder le JPEG
                    fs.writeFileSync(jpegPath, outputBuffer);

                    // Supprimer l'original HEIC
                    fs.unlinkSync(file.path);

                    finalPath = jpegPath;

                    // Optimiser l'image avec Sharp
                    await sharp(jpegPath)
                        .resize(1200) // Largeur max de 1200px
                        .jpeg({ quality: 80 }) // Compression à 80%
                        .toFile(jpegPath);

                } catch (convertErr) {
                    console.error('Erreur conversion HEIC:', convertErr);
                    // Si la conversion échoue, garder l'original et continuer
                }
            } else {
                // Optimiser les autres formats d'image (JPEG/PNG)
                try {
                    await sharp(file.path)
                        .resize(1200)
                        .jpeg({ quality: 80 })
                        .toFile(file.path);
                } catch (sharpErr) {
                    console.error('Erreur optimisation image:', sharpErr);
                }
            }

            // Nettoyer le chemin pour la base de données
            const parts = finalPath.split('uploads');
            const cleanedPath = parts[1] ? `uploads${parts[1].replace(/\\/g, '/')}` : finalPath;
            processedImages.push(cleanedPath);
        }

        const newEstimation = new Estimation({
            type, fullName, email, phone,
            brand, model, trim, year,
            description, preferredLanguage, contactMethod,
            images: processedImages
        });

        await newEstimation.save();

        // Setup Brevo
        const defaultClient = SibApiV3Sdk.ApiClient.instance;
        const apiKey = defaultClient.authentications['api-key'];
        apiKey.apiKey = process.env.BREVO_API_KEY;
        const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

        // ✅ 1. Envoi de la confirmation au client
        const confirmationEmail = new SibApiV3Sdk.SendSmtpEmail();
        confirmationEmail.sender = { name: "GMCL Team", email: "gmclteam@gmail.com" };
        confirmationEmail.to = [{ email, name: fullName }];
        confirmationEmail.subject = preferredLanguage === 'fr'
            ? "Confirmation de votre demande d'estimation"
            : "Your Estimation Request Confirmation";
        confirmationEmail.htmlContent = preferredLanguage === 'fr'
            ? `
                <h2>Bonjour ${fullName},</h2>
                <p>Nous avons bien reçu votre demande d'estimation pour votre ${brand} ${model}.</p>
                <p>Un membre de notre équipe vous contactera sous peu.</p>
                <br><p>Merci,<br>L'équipe GMCL</p>
              `
            : `
                <h2>Hello ${fullName},</h2>
                <p>We have received your estimation request for your ${brand} ${model}.</p>
                <p>One of our team members will contact you shortly.</p>
                <br><p>Thank you,<br>The GMCL Team</p>
              `;

        if (contactMethod === 'email' || contactMethod === 'both') {
            try {
                await apiInstance.sendTransacEmail(confirmationEmail);
            } catch (err) {
                console.error("❌ Erreur email client :", err);
            }
        }

        // ✅ Envoi SMS via Make (si phone)
        const confirmationMessage = preferredLanguage === 'fr'
            ? `Bonjour ${fullName}, nous avons bien reçu votre demande d'estimation pour votre ${brand} ${model}.`
            : `Hello ${fullName}, we received your estimation request for your ${brand} ${model}.`;

        if (contactMethod === 'phone' || contactMethod === 'both') {
            try {
                await axios.post('https://hook.us2.make.com/lzpdws1j3jijtd4qsxo47racivrym929', {
                    phone,
                    message: confirmationMessage
                });
            } catch (err) {
                console.error("❌ Erreur SMS client :", err.response?.data || err.message);
            }
        }

        // ✅ 2. Notification aux managers uniquement
        const managers = await Employee.find({ role: 'manager' }, 'email name phone');

        const notifyManagers = managers.map(manager => {
            const msgFr =
                `Bonjour ${manager.name || 'Manager'},\n` +
                `Une nouvelle demande d'estimation a été reçue\n` +
                `- GMCL`;



            const managerEmail = new SibApiV3Sdk.SendSmtpEmail();
            managerEmail.sender = { name: "GMCL Team", email: "gmclteam@gmail.com" };
            managerEmail.to = [{ email: manager.email, name: manager.name || "Manager" }];
            managerEmail.subject = `Nouvelle estimation reçue - ${brand} ${model}`;
            managerEmail.htmlContent = `
                <h3>Bonjour ${manager.name || 'Manager'},</h3>
                <p>Une nouvelle estimation a été soumise :</p>
                <ul>
                    <li><strong>Nom :</strong> ${fullName}</li>
                    <li><strong>Email :</strong> ${email}</li>
                    <li><strong>Téléphone :</strong> ${phone}</li>
                </ul>
                <ul>
                    <li><strong>Véhicule :</strong> ${brand} ${model} (${year})</li>
                    <li><strong>Type :</strong> ${type}</li>
                    <li><strong>Finition :</strong> ${trim}</li>
                </ul>
                <p>Description : ${description || 'Aucune'}</p>
                <hr>
                <p>Connectez-vous au tableau de bord pour consulter les détails.</p>
            `;

            const smsPromise = axios.post('https://hook.us2.make.com/lzpdws1j3jijtd4qsxo47racivrym929', {
                phone: manager.phone,
                message: msgFr
            }).catch(err => {
                console.error(`❌ SMS manager ${manager.name} :`, err.response?.data || err.message);
            });

            return Promise.all([
                apiInstance.sendTransacEmail(managerEmail),
                smsPromise
            ]);
        });

        await Promise.all(notifyManagers);

        return res.status(201).json({
            success: true,
            message: 'Estimation créée. Notifications envoyées.',
            estimation: newEstimation
        });

    } catch (error) {
        console.error('❌ Erreur createEstimation :', error);
        return res.status(500).json({
            success: false,
            message: "Erreur lors de la création de l'estimation",
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

        // Vérifier si l'estimation existe
        const estimation = await Estimation.findById(estimationId);
        if (!estimation) {
            return res.status(404).json({
                success: false,
                message: 'Estimation non trouvée.'
            });
        }

        // Mettre à jour l'objet estimation
        estimation.reply = true;
        estimation.replyBy = replyBy;
        estimation.replyMessage = replyMessage;
        estimation.replyDate = new Date();
        await estimation.save();

        // Extraire les données client
        const {
            email, phone, fullName, brand, model,
            preferredLanguage, contactMethod
        } = estimation;

        const isFr = preferredLanguage === 'fr';

        const subject = isFr
            ? `Réponse à votre demande d'estimation pour ${brand} ${model}`
            : `Reply to your estimation request for ${brand} ${model}`;

        const message = isFr
            ? `Bonjour ${fullName},\nNous avons le plaisir de vous transmettre notre réponse concernant votre demande d'estimation pour votre ${brand} ${model} :\n${replyMessage}\nMerci pour votre confiance, et à bientôt,\nL'équipe GMCL`
            : `Hello ${fullName},\nWe are pleased to provide you with our reply regarding your estimation request for your ${brand} ${model}:\n${replyMessage}\nThank you for your trust, and we look forward to hearing from you soon,\nGMCL Team`;

        // ✅ Envoi email (si demandé)
        if (contactMethod === 'email' || contactMethod === 'both') {
            try {
                const defaultClient = SibApiV3Sdk.ApiClient.instance;
                const apiKey = defaultClient.authentications['api-key'];
                apiKey.apiKey = process.env.BREVO_API_KEY;
                const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

                const emailData = new SibApiV3Sdk.SendSmtpEmail();
                emailData.sender = { name: "GMCL Team", email: "gmclteam@gmail.com" };
                emailData.to = [{ email, name: fullName }];
                emailData.subject = subject;
                emailData.textContent = message;

                await apiInstance.sendTransacEmail(emailData);
            } catch (err) {
                console.error("❌ Erreur email client :", err.response?.data || err.message);
            }
        }

        // ✅ Envoi SMS (si demandé)
        if ((contactMethod === 'phone' || contactMethod === 'both') && phone) {
            try {
                await axios.post('https://hook.us2.make.com/lzpdws1j3jijtd4qsxo47racivrym929', {
                    phone,
                    message
                });
            } catch (err) {
                console.error("❌ Erreur SMS client :", err.response?.data || err.message);
            }
        }

        return res.status(200).json({
            success: true,
            message: 'Réponse envoyée au client avec succès.',
            estimation
        });

    } catch (error) {
        console.error("❌ Erreur replyToEstimation :", error);
        return res.status(500).json({
            success: false,
            message: 'Erreur serveur.',
            error: error.message
        });
    }
};
