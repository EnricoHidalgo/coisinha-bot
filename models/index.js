// models/index.js - Exportador central de modelos
const mongoose = require('mongoose');

// Se não existe o modelo User, cria
if (!mongoose.models.User) {
  const userSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    guildId: { type: String, required: true },
    coins: { type: Number, default: 1000 },
    bank: { type: Number, default: 0 },
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    dailyCooldown: { type: Date },
    winCount: { type: Number, default: 0 },
    lossCount: { type: Number, default: 0 },
    lastXpTime: { type: Date },
    warnings: { type: Array, default: [] },
    chessElo: { type: Number, default: 1000 }
  }, { timestamps: true });
  
  // Índices para busca rápida
  userSchema.index({ userId: 1, guildId: 1 }, { unique: true });
  
  mongoose.model('User', userSchema);
}

module.exports = {
  User: mongoose.models.User
};