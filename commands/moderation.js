const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('@discordjs/builders');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mod')
    .setDescription('Comandos de moderação')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers | PermissionFlagsBits.BanMembers)
    .addSubcommand(subcommand =>
      subcommand
        .setName('kick')
        .setDescription('Expulsa um membro do servidor')
        .addUserOption(option =>
          option.setName('usuario')
            .setDescription('Usuário para expulsar')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('motivo')
            .setDescription('Motivo da expulsão')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('ban')
        .setDescription('Bane um membro do servidor')
        .addUserOption(option =>
          option.setName('usuario')
            .setDescription('Usuário para banir')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('motivo')
            .setDescription('Motivo do banimento')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('mute')
        .setDescription('Silencia um membro')
        .addUserOption(option =>
          option.setName('usuario')
            .setDescription('Usuário para silenciar')
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option.setName('tempo')
            .setDescription('Tempo em minutos')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(10080) // 7 dias
        )
        .addStringOption(option =>
          option.setName('motivo')
            .setDescription('Motivo do mute')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('limpar')
        .setDescription('Limpa mensagens do canal')
        .addIntegerOption(option =>
          option.setName('quantidade')
            .setDescription('Número de mensagens para limpar (1-100)')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(100)
        )
    ),
  
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    
    switch(subcommand) {
      case 'kick':
        await kickUser(interaction);
        break;
      case 'ban':
        await banUser(interaction);
        break;
      case 'mute':
        await muteUser(interaction);
        break;
      case 'limpar':
        await limparMensagens(interaction);
        break;
    }
  }
};

// Comandos com prefixo !!
module.exports.prefixCommands = {
  kick: async (message, args) => {
    if (!message.member.permissions.has('KickMembers')) {
      return message.reply('❌ Você precisa de permissão para expulsar membros!');
    }
    
    const user = message.mentions.users.first();
    if (!user) {
      return message.reply('❌ Mencione um usuário para expulsar!');
    }
    
    const member = await message.guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      return message.reply('❌ Usuário não encontrado no servidor!');
    }
    
    if (!member.kickable) {
      return message.reply('❌ Não posso expulsar este usuário!');
    }
    
    const motivo = args.slice(1).join(' ') || 'Sem motivo fornecido';
    
    try {
      await member.kick(motivo);
      
      const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('👢 Usuário Expulso')
        .addFields(
          { name: '👤 Usuário', value: `${user.tag} (${user.id})`, inline: true },
          { name: '🛡️ Moderador', value: `${message.author.tag}`, inline: true },
          { name: '📝 Motivo', value: motivo, inline: false }
        )
        .setTimestamp();
      
      await message.reply({ embeds: [embed] });
    } catch (error) {
      await message.reply('❌ Erro ao expulsar o usuário!');
    }
  },
  
  ban: async (message, args) => {
    if (!message.member.permissions.has('BanMembers')) {
      return message.reply('❌ Você precisa de permissão para banir membros!');
    }
    
    const user = message.mentions.users.first();
    if (!user) {
      return message.reply('❌ Mencione um usuário para banir!');
    }
    
    const member = await message.guild.members.fetch(user.id).catch(() => null);
    
    if (member && !member.bannable) {
      return message.reply('❌ Não posso banir este usuário!');
    }
    
    const motivo = args.slice(1).join(' ') || 'Sem motivo fornecido';
    
    try {
      await message.guild.members.ban(user.id, { reason: motivo });
      
      const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('🔨 Usuário Banido')
        .addFields(
          { name: '👤 Usuário', value: `${user.tag} (${user.id})`, inline: true },
          { name: '🛡️ Moderador', value: `${message.author.tag}`, inline: true },
          { name: '📝 Motivo', value: motivo, inline: false }
        )
        .setTimestamp();
      
      await message.reply({ embeds: [embed] });
    } catch (error) {
      await message.reply('❌ Erro ao banir o usuário!');
    }
  },
  
  mute: async (message, args) => {
    if (!message.member.permissions.has('ModerateMembers')) {
      return message.reply('❌ Você precisa de permissão para silenciar membros!');
    }
    
    const user = message.mentions.users.first();
    if (!user) {
      return message.reply('❌ Mencione um usuário para silenciar!');
    }
    
    const tempo = parseInt(args[1]);
    if (!tempo || isNaN(tempo) || tempo < 1 || tempo > 10080) {
      return message.reply('❌ Especifique um tempo em minutos (1-10080 = 7 dias)');
    }
    
    const member = await message.guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      return message.reply('❌ Usuário não encontrado no servidor!');
    }
    
    const motivo = args.slice(2).join(' ') || 'Sem motivo fornecido';
    
    try {
      await member.timeout(tempo * 60 * 1000, motivo);
      
      const embed = new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle('🔇 Usuário Silenciado')
        .addFields(
          { name: '👤 Usuário', value: `${user.tag}`, inline: true },
          { name: '⏰ Tempo', value: `${tempo} minutos`, inline: true },
          { name: '🛡️ Moderador', value: `${message.author.tag}`, inline: true },
          { name: '📝 Motivo', value: motivo, inline: false }
        )
        .setTimestamp();
      
      await message.reply({ embeds: [embed] });
    } catch (error) {
      await message.reply('❌ Erro ao silenciar o usuário!');
    }
  },
  
  limpar: async (message, args) => {
    if (!message.member.permissions.has('ManageMessages')) {
      return message.reply('❌ Você precisa de permissão para gerenciar mensagens!');
    }
    
    const quantidade = parseInt(args[0]);
    if (!quantidade || isNaN(quantidade) || quantidade < 1 || quantidade > 100) {
      return message.reply('❌ Especifique uma quantidade entre 1 e 100!');
    }
    
    try {
      const deleted = await message.channel.bulkDelete(quantidade, true);
      
      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('🧹 Mensagens Limpas')
        .addFields(
          { name: '📊 Quantidade', value: `${deleted.size} mensagens`, inline: true },
          { name: '📁 Canal', value: `${message.channel.name}`, inline: true },
          { name: '🛡️ Moderador', value: `${message.author.tag}`, inline: true }
        )
        .setTimestamp();
      
      const msg = await message.channel.send({ embeds: [embed] });
      setTimeout(() => msg.delete(), 5000);
      
      // Deletar o comando do usuário
      message.delete().catch(() => {});
    } catch (error) {
      await message.reply('❌ Erro ao limpar mensagens! (Mensagens podem ter mais de 14 dias)');
    }
  },
  
  aviso: async (message, args) => {
    if (!message.member.permissions.has('ModerateMembers')) {
      return message.reply('❌ Você precisa de permissão para dar avisos!');
    }
    
    const user = message.mentions.users.first();
    if (!user) {
      return message.reply('❌ Mencione um usuário para dar aviso!');
    }
    
    const motivo = args.slice(1).join(' ');
    if (!motivo) {
      return message.reply('❌ Forneça um motivo para o aviso!');
    }
    
    try {
      const embed = new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle('⚠️ AVISO DO MODERADOR')
        .setDescription(`Você recebeu um aviso no servidor **${message.guild.name}**`)
        .addFields(
          { name: '📝 Motivo', value: motivo },
          { name: '🛡️ Moderador', value: message.author.tag },
          { name: '📅 Data', value: new Date().toLocaleString('pt-BR') }
        )
        .setFooter({ text: 'Avisos repetidos podem resultar em punições mais severas' });
      
      // Tentar enviar DM
      try {
        await user.send({ embeds: [embed] });
        await message.reply(`✅ Aviso enviado para ${user.tag} via DM!`);
      } catch (dmError) {
        // Se não conseguir DM, enviar no canal
        await message.channel.send(`${user}`, { embeds: [embed] });
        await message.reply('⚠️ Não foi possível enviar DM, aviso postado no canal.');
      }
    } catch (error) {
      await message.reply('❌ Erro ao enviar aviso!');
    }
  }
};

// Funções para slash commands
async function kickUser(interaction) {
  if (!interaction.member.permissions.has('KickMembers')) {
    return interaction.reply({ content: '❌ Você não tem permissão para expulsar membros!', ephemeral: true });
  }
  
  const user = interaction.options.getUser('usuario');
  const motivo = interaction.options.getString('motivo') || 'Sem motivo fornecido';
  
  const member = await interaction.guild.members.fetch(user.id).catch(() => null);
  if (!member) {
    return interaction.reply({ content: '❌ Usuário não encontrado no servidor!', ephemeral: true });
  }
  
  if (!member.kickable) {
    return interaction.reply({ content: '❌ Não posso expulsar este usuário!', ephemeral: true });
  }
  
  try {
    await member.kick(motivo);
    
    const embed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('👢 Usuário Expulso')
      .addFields(
        { name: '👤 Usuário', value: `${user.tag} (${user.id})` },
        { name: '🛡️ Moderador', value: `${interaction.user.tag}` },
        { name: '📝 Motivo', value: motivo }
      )
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    await interaction.reply({ content: '❌ Erro ao expulsar o usuário!', ephemeral: true });
  }
}

async function banUser(interaction) {
  if (!interaction.member.permissions.has('BanMembers')) {
    return interaction.reply({ content: '❌ Você não tem permissão para banir membros!', ephemeral: true });
  }
  
  const user = interaction.options.getUser('usuario');
  const motivo = interaction.options.getString('motivo') || 'Sem motivo fornecido';
  
  try {
    await interaction.guild.members.ban(user.id, { reason: motivo });
    
    const embed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('🔨 Usuário Banido')
      .addFields(
        { name: '👤 Usuário', value: `${user.tag} (${user.id})` },
        { name: '🛡️ Moderador', value: `${interaction.user.tag}` },
        { name: '📝 Motivo', value: motivo }
      )
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    await interaction.reply({ content: '❌ Erro ao banir o usuário!', ephemeral: true });
  }
}

async function muteUser(interaction) {
  if (!interaction.member.permissions.has('ModerateMembers')) {
    return interaction.reply({ content: '❌ Você não tem permissão para silenciar membros!', ephemeral: true });
  }
  
  const user = interaction.options.getUser('usuario');
  const tempo = interaction.options.getInteger('tempo');
  const motivo = interaction.options.getString('motivo') || 'Sem motivo fornecido';
  
  const member = await interaction.guild.members.fetch(user.id).catch(() => null);
  if (!member) {
    return interaction.reply({ content: '❌ Usuário não encontrado no servidor!', ephemeral: true });
  }
  
  try {
    await member.timeout(tempo * 60 * 1000, motivo);
    
    const embed = new EmbedBuilder()
      .setColor(0xFFA500)
      .setTitle('🔇 Usuário Silenciado')
      .addFields(
        { name: '👤 Usuário', value: `${user.tag}` },
        { name: '⏰ Tempo', value: `${tempo} minutos` },
        { name: '🛡️ Moderador', value: `${interaction.user.tag}` },
        { name: '📝 Motivo', value: motivo }
      )
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    await interaction.reply({ content: '❌ Erro ao silenciar o usuário!', ephemeral: true });
  }
}

async function limparMensagens(interaction) {
  if (!interaction.member.permissions.has('ManageMessages')) {
    return interaction.reply({ content: '❌ Você não tem permissão para limpar mensagens!', ephemeral: true });
  }
  
  const quantidade = interaction.options.getInteger('quantidade');
  
  try {
    const deleted = await interaction.channel.bulkDelete(quantidade, true);
    
    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('🧹 Mensagens Limpas')
      .addFields(
        { name: '📊 Quantidade', value: `${deleted.size} mensagens` },
        { name: '🛡️ Moderador', value: `${interaction.user.tag}` }
      )
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed], ephemeral: false });
  } catch (error) {
    await interaction.reply({ content: '❌ Erro ao limpar mensagens! (Mensagens podem ter mais de 14 dias)', ephemeral: true });
  }
}