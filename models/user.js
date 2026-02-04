// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
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

// Export apenas o schema, não o modelo
module.exports = userSchema;