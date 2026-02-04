const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    guildId: { type: String, required: true },
    coins: { type: Number, default: 1000 },
    bank: { type: Number, default: 0 },
    dailyCooldown: { type: Date },
    winCount: { type: Number, default: 0 },
    lossCount: { type: Number, default: 0 }
});

module.exports = mongoose.model('User', userSchema);