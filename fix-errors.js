// fix-errors.js
const fs = require('fs');
const path = require('path');

console.log('🔧 Corrigindo arquivos...');

// 1. Corrigir imports do User
const filesToFix = ['economy.js', 'games.js', 'level.js'];

filesToFix.forEach(file => {
  const filePath = path.join(__dirname, 'commands', file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Trocar import
    content = content.replace(
      /const User = require\('\.\.\/models\/User'\);/g,
      `const { User } = require('../models');`
    );
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${file} corrigido`);
  }
});

// 2. Corrigir moderation.js
const modPath = path.join(__dirname, 'commands', 'moderation.js');
if (fs.existsSync(modPath)) {
  let content = fs.readFileSync(modPath, 'utf8');
  
  // Corrigir import
  content = content.replace(
    `const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('@discordjs/builders');`,
    `const { SlashCommandBuilder, EmbedBuilder } = require('@discordjs/builders');\nconst { PermissionFlagsBits } = require('discord.js');`
  );
  
  fs.writeFileSync(modPath, content, 'utf8');
  console.log('✅ moderation.js corrigido');
}

// 3. Renomear giveway.js para giveaway.js
const oldPath = path.join(__dirname, 'commands', 'giveway.js');
const newPath = path.join(__dirname, 'commands', 'giveaway.js');
if (fs.existsSync(oldPath)) {
  fs.renameSync(oldPath, newPath);
  console.log('✅ giveway.js renomeado para giveaway.js');
}

console.log('🎉 Correções aplicadas! Execute: node index.js');