const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../models/User');
const mongoose = require('mongoose');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('level')
    .setDescription('Sistema de nível e experiência')
    .addSubcommand(subcommand =>
      subcommand
        .setName('ver')
        .setDescription('Ver seu nível e XP')
        .addUserOption(option =>
          option.setName('usuario')
            .setDescription('Usuário para ver (opcional)')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('ranking')
        .setDescription('Ranking do servidor')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('recompensas')
        .setDescription('Ver recompensas por nível')
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    
    switch(subcommand) {
      case 'ver':
        await verLevelCommand(interaction);
        break;
      case 'ranking':
        await rankingCommand(interaction);
        break;
      case 'recompensas':
        await recompensasCommand(interaction);
        break;
    }
  }
};

// Função para calcular XP necessário
function xpParaProximoNivel(nivel) {
  return 100 * nivel * nivel + 100;
}

// Função para calcular nível atual baseado no XP
function calcularNivel(xp) {
  let nivel = 0;
  let xpNecessario = 0;
  
  while (xp >= xpNecessario) {
    xpNecessario = xpParaProximoNivel(nivel);
    if (xp >= xpNecessario) {
      xp -= xpNecessario;
      nivel++;
    }
  }
  
  return {
    nivel,
    xpAtual: xp,
    xpProximo: xpNecessario,
    progresso: (xp / xpNecessario) * 100
  };
}

// Comandos com prefixo !!
module.exports.prefixCommands = {
  level: async (message, args) => {
    const targetUser = message.mentions.users.first() || message.author;
    
    let user = await User.findOne({ 
      userId: targetUser.id, 
      guildId: message.guild.id 
    });
    
    if (!user) {
      user = new User({
        userId: targetUser.id,
        guildId: message.guild.id,
        xp: 0,
        level: 1,
        coins: 1000
      });
      await user.save();
    }
    
    const nivelInfo = calcularNivel(user.xp || 0);
    
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setAuthor({ 
        name: targetUser.username, 
        iconURL: targetUser.displayAvatarURL() 
      })
      .setTitle('📊 Nível e Experiência')
      .addFields(
        { name: '⭐ Nível', value: `**${nivelInfo.nivel}**`, inline: true },
        { name: '📈 XP Total', value: `**${user.xp || 0}**`, inline: true },
        { name: '🎯 Progresso', value: `${nivelInfo.progresso.toFixed(1)}%`, inline: true }
      )
      .addFields(
        { name: '📊 XP Atual', value: `${nivelInfo.xpAtual}`, inline: true },
        { name: '🏆 Próximo Nível', value: `${nivelInfo.xpProximo} XP`, inline: true },
        { name: '💰 Moedas', value: `${user.coins}`, inline: true }
      );
    
    // Barra de progresso
    const progressBarLength = 20;
    const filled = Math.floor((nivelInfo.progresso / 100) * progressBarLength);
    const progressBar = '█'.repeat(filled) + '░'.repeat(progressBarLength - filled);
    
    embed.setDescription(`\`[${progressBar}]\`\n${nivelInfo.xpAtual}/${nivelInfo.xpProximo} XP`);
    
    await message.reply({ embeds: [embed] });
  },
  
  rank: async (message) => {
    const users = await User.find({ 
      guildId: message.guild.id 
    })
    .sort({ xp: -1 })
    .limit(10);
    
    if (users.length === 0) {
      return message.reply('📊 Ninguém tem XP ainda neste servidor!');
    }
    
    const embed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle('🏆 Ranking do Servidor')
      .setDescription('Top 10 usuários por XP');
    
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const member = await message.guild.members.fetch(user.userId).catch(() => null);
      const nivelInfo = calcularNivel(user.xp || 0);
      
      const emoji = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '📊';
      const name = member ? member.user.username : `Usuário ${user.userId}`;
      
      embed.addFields({
        name: `${emoji} ${i + 1}. ${name}`,
        value: `Nível ${nivelInfo.nivel} | ${user.xp} XP | ${user.coins} moedas`,
        inline: false
      });
    }
    
    // Adicionar posição do autor
    const authorUser = await User.findOne({ 
      userId: message.author.id, 
      guildId: message.guild.id 
    });
    
    if (authorUser) {
      const allUsers = await User.find({ guildId: message.guild.id }).sort({ xp: -1 });
      const authorRank = allUsers.findIndex(u => u.userId === message.author.id) + 1;
      const nivelInfo = calcularNivel(authorUser.xp || 0);
      
      embed.setFooter({ 
        text: `Sua posição: ${authorRank}° | Nível ${nivelInfo.nivel} | ${authorUser.xp} XP` 
      });
    }
    
    await message.reply({ embeds: [embed] });
  },
  
  recompensas: async (message) => {
    const recompensas = [
      { nivel: 5, recompensa: '🎨 Cor personalizada no servidor' },
      { nivel: 10, recompensa: '💎 5.000 moedas' },
      { nivel: 15, recompensa: '🛡️ Cargo especial "Veterano"' },
      { nivel: 20, recompensa: '🎁 15.000 moedas + Badge exclusiva' },
      { nivel: 25, recompensa: '👑 Acesso a canal VIP' },
      { nivel: 30, recompensa: '💰 30.000 moedas + Cargo lendário' },
      { nivel: 50, recompensa: '🏆 Status de Lenda no servidor' }
    ];
    
    const embed = new EmbedBuilder()
      .setColor(0xFFA500)
      .setTitle('🎁 Recompensas por Nível')
      .setDescription('Ganhe XP enviando mensagens e ganhe recompensas!');
    
    recompensas.forEach(r => {
      embed.addFields({
        name: `Nível ${r.nivel}`,
        value: r.recompensa,
        inline: true
      });
    });
    
    embed.addFields({
      name: '📈 Como ganhar XP?',
      value: '• Enviar mensagens: +10-25 XP\n• Ganhar em xadrez: +50 XP\n• Participar de sorteios: +20 XP\n• Daily: +15 XP\n• Não spam! Cooldown de 1 minuto.'
    });
    
    await message.reply({ embeds: [embed] });
  }
};

// Sistema de XP automático
module.exports.xpSystem = {
  giveXp: async (userId, guildId, xpAmount) => {
    let user = await User.findOne({ userId, guildId });
    
    if (!user) {
      user = new User({
        userId,
        guildId,
        xp: 0,
        level: 1,
        coins: 1000,
        lastXpTime: Date.now()
      });
    }
    
    // Cooldown de 1 minuto
    if (user.lastXpTime && Date.now() - user.lastXpTime < 60000) {
      return false;
    }
    
    user.xp = (user.xp || 0) + xpAmount;
    user.lastXpTime = Date.now();
    
    // Verificar se subiu de nível
    const oldLevel = user.level || 1;
    const nivelInfo = calcularNivel(user.xp);
    
    if (nivelInfo.nivel > oldLevel) {
      user.level = nivelInfo.nivel;
      // Recompensa por subir de nível
      const reward = nivelInfo.nivel * 100;
      user.coins = (user.coins || 0) + reward;
      
      await user.save();
      return { leveledUp: true, newLevel: nivelInfo.nivel, reward };
    }
    
    await user.save();
    return { leveledUp: false };
  }
};

// Funções para slash commands
async function verLevelCommand(interaction) {
  const targetUser = interaction.options.getUser('usuario') || interaction.user;
  await module.exports.prefixCommands.level({
    author: interaction.user,
    guild: interaction.guild,
    mentions: { users: { first: () => targetUser } },
    reply: (content) => interaction.reply(content)
  });
}

async function rankingCommand(interaction) {
  await module.exports.prefixCommands.rank({
    author: interaction.user,
    guild: interaction.guild,
    reply: (content) => interaction.reply(content)
  });
}

async function recompensasCommand(interaction) {
  await module.exports.prefixCommands.recompensas({
    reply: (content) => interaction.reply(content)
  });
}