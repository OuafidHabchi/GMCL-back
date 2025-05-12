const mongoose = require('mongoose');

const EstimationSchema = new mongoose.Schema({
    type: { type: String, required: true },
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    brand: { type: String, required: true },
    model: { type: String, required: true },
    trim: { type: String, required: true },
    year: { type: Number, required: true },
    description: { type: String, required: false },
    images: [{ type: String, }], // chemins vers les fichiers images
    Seen: [{ type: String, }], // liste des noms des utilisateurs qui ont vu l'estimation
    preferredLanguage: { type: String, required: true },
    contactMethod: { type: String, required: true },
    reply: { type: Boolean, default: false },
    replyBy: { type: String, default: "" },
    replyMessage: { type: String, default: "" },
    replyDate: { type: Date, default: Date.now() },
}, { timestamps: true });

module.exports = mongoose.model('Estimation', EstimationSchema);
