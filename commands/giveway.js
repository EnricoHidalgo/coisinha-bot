const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('@discordjs/builders');

// Sorteios ativos
const activeGiveaways = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sorteio')
    .setDescription('Sistema de sorteios')
    .addSubcommand(subcommand =>
      subcommand
        .setName('criar')
        .setDescription('Cria um novo sorteio')
        .addStringOption(option =>
          option.setName('premio')
            .setDescription('Prêmio do sorteio')
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option.setName('duracao')
            .setDescription('Duração em minutos')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(10080) // 7 dias
        )
        .addIntegerOption(option =>
          option.setName('vencedores')
            .setDescription('Número de vencedores (1-10)')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(10)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('reroll')
        .setDescription('Sorteia novamente um vencedor')
        .addStringOption(option =>
          option.setName('id')
            .setDescription('ID da mensagem do sorteio')
            .setRequired(true)
        )
    ),
  
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    
    switch(subcommand) {
      case 'criar':
        await criarSorteio(interaction);
        break;
      case 'reroll':
        await rerollSorteio(interaction);
        break;
    }
  }
};

// Comandos com prefixo !!
module.exports.prefixCommands = {
  'sorteio criar': async (message, args) => {
    if (!message.member.permissions.has('ManageMessages')) {
      return message.reply('❌ Você precisa de permissão para criar sorteios!');
    }
    
    if (args.length < 2) {
      return message.reply('❌ Use: `!!sorteio criar [prêmio] [minutos] (vencedores)`\nEx: `!!sorteio criar Nitro 60 2`');
    }
    
    const premio = args[0];
    const duracao = parseInt(args[1]);
    const vencedores = parseInt(args[2]) || 1;
    
    if (isNaN(duracao) || duracao < 1 || duracao > 10080) {
      return message.reply('❌ Duração deve ser entre 1 minuto e 7 dias (10080 minutos)!');
    }
    
    if (vencedores < 1 || vencedores > 10) {
      return message.reply('❌ Número de vencedores deve ser entre 1 e 10!');
    }
    
    const endTime = Date.now() + duracao * 60 * 1000;
    const giveawayId = `${message.guild.id}-${message.channel.id}-${Date.now()}`;
    
    const embed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle('🎉 **SORTEIO** 🎉')
      .setDescription(
        `**Prêmio:** ${premio}\n` +
        `**Vencedores:** ${vencedores}\n` +
        `**Termina:** <t:${Math.floor(endTime / 1000)}:R> (<t:${Math.floor(endTime / 1000)}:F>)\n` +
        `**Host:** ${message.author}\n\n` +
        `**Para participar:** Reaja com 🎉 abaixo!`
      )
      .addFields(
        { name: '👥 Participantes', value: '0', inline: true },
        { name: '⏰ Status', value: '⌛ Em andamento', inline: true }
      )
      .setFooter({ text: `ID: ${giveawayId} • Termina em` })
      .setTimestamp(endTime);
    
    const messageRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`giveaway_join_${giveawayId}`)
          .setLabel('Participar')
          .setEmoji('🎉')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`giveaway_info_${giveawayId}`)
          .setLabel('Informações')
          .setStyle(ButtonStyle.Secondary)
      );
    
    const giveawayMessage = await message.channel.send({ 
      content: '🎉 **NOVO SORTEIO!** 🎉',
      embeds: [embed],
      components: [messageRow]
    });
    
    // Armazenar sorteio
    activeGiveaways.set(giveawayId, {
      id: giveawayId,
      prize: premio,
      winners: vencedores,
      endTime: endTime,
      channelId: message.channel.id,
      guildId: message.guild.id,
      messageId: giveawayMessage.id,
      hostId: message.author.id,
      participants: new Set(),
      ended: false
    });
    
    // Configurar timeout para término
    setTimeout(() => {
      finalizarSorteio(giveawayId);
    }, duracao * 60 * 1000);
    
    // Configurar coletor de botões
    const collector = giveawayMessage.createMessageComponentCollector({ 
      time: duracao * 60 * 1000 
    });
    
    collector.on('collect', async (buttonInteraction) => {
      if (buttonInteraction.customId === `giveaway_join_${giveawayId}`) {
        await handleJoinGiveaway(buttonInteraction, giveawayId);
      } else if (buttonInteraction.customId === `giveaway_info_${giveawayId}`) {
        await handleGiveawayInfo(buttonInteraction, giveawayId);
      }
    });
    
    await message.reply(`✅ Sorteio criado! ID: ${giveawayId}`);
  },
  
  'sorteio reroll': async (message, args) => {
    if (!message.member.permissions.has('ManageMessages')) {
      return message.reply('❌ Você precisa de permissão para reroll!');
    }
    
    const giveawayId = args[0];
    if (!giveawayId) {
      return message.reply('❌ Forneça o ID do sorteio!');
    }
    
    const giveaway = activeGiveaways.get(giveawayId);
    if (!giveaway) {
      return message.reply('❌ Sorteio não encontrado!');
    }
    
    if (!giveaway.ended) {
      return message.reply('❌ Este sorteio ainda não terminou!');
    }
    
    // Reroll
    const participants = Array.from(giveaway.participants);
    if (participants.length === 0) {
      return message.reply('❌ Não há participantes para reroll!');
    }
    
    const newWinners = [];
    const tempParticipants = [...participants];
    
    for (let i = 0; i < giveaway.winners && tempParticipants.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * tempParticipants.length);
      newWinners.push(tempParticipants[randomIndex]);
      tempParticipants.splice(randomIndex, 1);
    }
    
    const newWinnerMentions = newWinners.map(id => `<@${id}>`).join(', ');
    
    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('🎊 **NOVO SORTEIO!** 🎊')
      .setDescription(
        `**Prêmio:** ${giveaway.prize}\n` +
        `**Novo(s) vencedor(es):** ${newWinnerMentions}\n` +
        `**Reroll por:** ${message.author}\n\n` +
        `Parabéns aos novos vencedores! 🎉`
      );
    
    await message.channel.send({ embeds: [embed] });
    await message.reply('✅ Reroll realizado com sucesso!');
  },
  
  'sorteio listar': async (message) => {
    const guildGiveaways = Array.from(activeGiveaways.values())
      .filter(g => g.guildId === message.guild.id && !g.ended);
    
    if (guildGiveaways.length === 0) {
      return message.reply('❌ Não há sorteios ativos no momento!');
    }
    
    const embed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle('🎉 SORTEIOS ATIVOS')
      .setDescription(`Total: ${guildGiveaways.length} sorteio(s) em andamento`);
    
    guildGiveaways.forEach(giveaway => {
      const timeLeft = Math.max(0, giveaway.endTime - Date.now());
      const minutesLeft = Math.ceil(timeLeft / (60 * 1000));
      
      embed.addFields({
        name: `${giveaway.prize}`,
        value: `ID: \`${giveaway.id}\`\nVencedores: ${giveaway.winners}\nTermina em: ${minutesLeft} minutos\nParticipantes: ${giveaway.participants.size}`,
        inline: true
      });
    });
    
    await message.reply({ embeds: [embed] });
  },
  
  'sorteio cancelar': async (message, args) => {
    if (!message.member.permissions.has('ManageMessages')) {
      return message.reply('❌ Você precisa de permissão para cancelar sorteios!');
    }
    
    const giveawayId = args[0];
    if (!giveawayId) {
      return message.reply('❌ Forneça o ID do sorteio!');
    }
    
    const giveaway = activeGiveaways.get(giveawayId);
    if (!giveaway) {
      return message.reply('❌ Sorteio não encontrado!');
    }
    
    if (giveaway.hostId !== message.author.id && !message.member.permissions.has('Administrator')) {
      return message.reply('❌ Apenas o host ou administradores podem cancelar este sorteio!');
    }
    
    // Cancelar timeout
    clearTimeout(giveaway.timeout);
    
    // Remover do mapa
    activeGiveaways.delete(giveawayId);
    
    // Atualizar mensagem
    try {
      const channel = await message.guild.channels.fetch(giveaway.channelId);
      const giveawayMessage = await channel.messages.fetch(giveaway.messageId);
      
      const embed = EmbedBuilder.from(giveawayMessage.embeds[0])
        .setColor(0xFF0000)
        .setTitle('❌ **SORTEIO CANCELADO** ❌')
        .addFields(
          { name: '⏰ Status', value: '❌ Cancelado', inline: true }
        )
        .setFooter({ text: `Cancelado por ${message.author.tag}` });
      
      await giveawayMessage.edit({ 
        embeds: [embed],
        components: [] 
      });
      
      await message.reply('✅ Sorteio cancelado com sucesso!');
    } catch (error) {
      await message.reply('✅ Sorteio cancelado! (Não foi possível atualizar a mensagem)');
    }
  }
};

// Funções auxiliares
async function handleJoinGiveaway(interaction, giveawayId) {
  const giveaway = activeGiveaways.get(giveawayId);
  
  if (!giveaway) {
    return interaction.reply({ content: '❌ Sorteio não encontrado!', ephemeral: true });
  }
  
  if (giveaway.ended) {
    return interaction.reply({ content: '❌ Este sorteio já terminou!', ephemeral: true });
  }
  
  if (giveaway.participants.has(interaction.user.id)) {
    return interaction.reply({ content: '❌ Você já está participando!', ephemeral: true });
  }
  
  giveaway.participants.add(interaction.user.id);
  
  // Atualizar embed
  const embed = EmbedBuilder.from(interaction.message.embeds[0])
    .spliceFields(0, 1, { 
      name: '👥 Participantes', 
      value: giveaway.participants.size.toString(), 
      inline: true 
    });
  
  await interaction.message.edit({ embeds: [embed] });
  await interaction.reply({ content: '✅ Você entrou no sorteio! 🎉', ephemeral: true });
}

async function handleGiveawayInfo(interaction, giveawayId) {
  const giveaway = activeGiveaways.get(giveawayId);
  
  if (!giveaway) {
    return interaction.reply({ content: '❌ Sorteio não encontrado!', ephemeral: true });
  }
  
  const timeLeft = giveaway.endTime - Date.now();
  const hoursLeft = Math.floor(timeLeft / (60 * 60 * 1000));
  const minutesLeft = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
  
  const embed = new EmbedBuilder()
    .setColor(0xFFD700)
    .setTitle('ℹ️ Informações do Sorteio')
    .addFields(
      { name: '🎁 Prêmio', value: giveaway.prize, inline: true },
      { name: '👑 Vencedores', value: giveaway.winners.toString(), inline: true },
      { name: '👥 Participantes', value: giveaway.participants.size.toString(), inline: true },
      { name: '⏰ Tempo restante', value: `${hoursLeft}h ${minutesLeft}m`, inline: true },
      { name: '🎪 Host', value: `<@${giveaway.hostId}>`, inline: true },
      { name: '📝 ID', value: `\`${giveaway.id}\``, inline: true }
    )
    .setFooter({ text: 'Boa sorte! 🍀' });
  
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function finalizarSorteio(giveawayId) {
  const giveaway = activeGiveaways.get(giveawayId);
  if (!giveaway || giveaway.ended) return;
  
  giveaway.ended = true;
  
  try {
    const guild = await interaction?.client?.guilds?.fetch(giveaway.guildId) || null;
    const channel = guild ? await guild.channels.fetch(giveaway.channelId) : null;
    
    if (!channel) {
      console.log(`Canal não encontrado para sorteio ${giveawayId}`);
      activeGiveaways.delete(giveawayId);
      return;
    }
    
    const participants = Array.from(giveaway.participants);
    
    if (participants.length === 0) {
      const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('🎉 **SORTEIO ENCERRADO** 🎉')
        .setDescription(
          `**Prêmio:** ${giveaway.prize}\n` +
          `**Vencedores:** ${giveaway.winners}\n\n` +
          `❌ **Ninguém participou do sorteio!**\n` +
          `O prêmio não será entregue.`
        )
        .setFooter({ text: 'Sorteio encerrado' })
        .setTimestamp();
      
      await channel.send({ embeds: [embed] });
      
      // Atualizar mensagem original
      try {
        const giveawayMessage = await channel.messages.fetch(giveaway.messageId);
        const updatedEmbed = EmbedBuilder.from(giveawayMessage.embeds[0])
          .setColor(0xFF0000)
          .spliceFields(1, 1, { 
            name: '⏰ Status', 
            value: '❌ Encerrado (sem participantes)', 
            inline: true 
          });
        
        await giveawayMessage.edit({ 
          embeds: [updatedEmbed],
          components: [] 
        });
      } catch (error) {
        console.log('Não foi possível atualizar mensagem do sorteio');
      }
      
      activeGiveaways.delete(giveawayId);
      return;
    }
    
    // Sortear vencedores
    const winners = [];
    const tempParticipants = [...participants];
    
    for (let i = 0; i < Math.min(giveaway.winners, participants.length); i++) {
      const randomIndex = Math.floor(Math.random() * tempParticipants.length);
      winners.push(tempParticipants[randomIndex]);
      tempParticipants.splice(randomIndex, 1);
    }
    
    const winnerMentions = winners.map(id => `<@${id}>`).join(', ');
    
    // Embed de resultados
    const resultEmbed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('🎊 **SORTEIO ENCERRADO!** 🎊')
      .setDescription(
        `**Prêmio:** ${giveaway.prize}\n` +
        `**Vencedor(es):** ${winnerMentions}\n` +
        `**Participantes:** ${participants.length}\n\n` +
        `🎉 **Parabéns aos vencedores!** 🎉\n` +
        `Entre em contato com <@${giveaway.hostId}> para receber seu prêmio!`
      )
      .setFooter({ text: `ID: ${giveawayId}` })
      .setTimestamp();
    
    await channel.send({ 
      content: `${winnerMentions} 🎉`,
      embeds: [resultEmbed] 
    });
    
    // Atualizar mensagem original
    try {
      const giveawayMessage = await channel.messages.fetch(giveaway.messageId);
      const updatedEmbed = EmbedBuilder.from(giveawayMessage.embeds[0])
        .setColor(0x00FF00)
        .spliceFields(1, 1, { 
          name: '⏰ Status', 
          value: '✅ Encerrado', 
          inline: true 
        });
      
      await giveawayMessage.edit({ 
        embeds: [updatedEmbed],
        components: [] 
      });
    } catch (error) {
      console.log('Não foi possível atualizar mensagem do sorteio');
    }
    
  } catch (error) {
    console.error('Erro ao finalizar sorteio:', error);
  }
  
  activeGiveaways.delete(giveawayId);
}

// Funções para slash commands
async function criarSorteio(interaction) {
  if (!interaction.member.permissions.has('ManageMessages')) {
    return interaction.reply({ 
      content: '❌ Você precisa de permissão para criar sorteios!', 
      ephemeral: true 
    });
  }
  
  const premio = interaction.options.getString('premio');
  const duracao = interaction.options.getInteger('duracao');
  const vencedores = interaction.options.getInteger('vencedores') || 1;
  
  const endTime = Date.now() + duracao * 60 * 1000;
  const giveawayId = `${interaction.guild.id}-${interaction.channel.id}-${Date.now()}`;
  
  const embed = new EmbedBuilder()
    .setColor(0xFFD700)
    .setTitle('🎉 **SORTEIO** 🎉')
    .setDescription(
      `**Prêmio:** ${premio}\n` +
      `**Vencedores:** ${vencedores}\n` +
      `**Termina:** <t:${Math.floor(endTime / 1000)}:R>\n` +
      `**Host:** ${interaction.user}\n\n` +
      `**Para participar:** Clique no botão abaixo!`
    )
    .addFields(
      { name: '👥 Participantes', value: '0', inline: true },
      { name: '⏰ Status', value: '⌛ Em andamento', inline: true }
    )
    .setFooter({ text: `ID: ${giveawayId}` })
    .setTimestamp(endTime);
  
  const messageRow = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`giveaway_join_${giveawayId}`)
        .setLabel('Participar')
        .setEmoji('🎉')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`giveaway_info_${giveawayId}`)
        .setLabel('Informações')
        .setStyle(ButtonStyle.Secondary)
    );
  
  const giveawayMessage = await interaction.channel.send({ 
    content: '🎉 **NOVO SORTEIO!** 🎉',
    embeds: [embed],
    components: [messageRow]
  });
  
  // Armazenar sorteio
  activeGiveaways.set(giveawayId, {
    id: giveawayId,
    prize: premio,
    winners: vencedores,
    endTime: endTime,
    channelId: interaction.channel.id,
    guildId: interaction.guild.id,
    messageId: giveawayMessage.id,
    hostId: interaction.user.id,
    participants: new Set(),
    ended: false
  });
  
  // Configurar timeout
  setTimeout(() => {
    finalizarSorteio(giveawayId);
  }, duracao * 60 * 1000);
  
  // Configurar coletor
  const collector = giveawayMessage.createMessageComponentCollector({ 
    time: duracao * 60 * 1000 
  });
  
  collector.on('collect', async (buttonInteraction) => {
    if (buttonInteraction.customId === `giveaway_join_${giveawayId}`) {
      await handleJoinGiveaway(buttonInteraction, giveawayId);
    } else if (buttonInteraction.customId === `giveaway_info_${giveawayId}`) {
      await handleGiveawayInfo(buttonInteraction, giveawayId);
    }
  });
  
  await interaction.reply({ 
    content: `✅ Sorteio criado! ID: \`${giveawayId}\``, 
    ephemeral: true 
  });
}

async function rerollSorteio(interaction) {
  if (!interaction.member.permissions.has('ManageMessages')) {
    return interaction.reply({ 
      content: '❌ Você precisa de permissão para reroll!', 
      ephemeral: true 
    });
  }
  
  const giveawayId = interaction.options.getString('id');
  const giveaway = activeGiveaways.get(giveawayId);
  
  if (!giveaway) {
    return interaction.reply({ 
      content: '❌ Sorteio não encontrado!', 
      ephemeral: true 
    });
  }
  
  if (!giveaway.ended) {
    return interaction.reply({ 
      content: '❌ Este sorteio ainda não terminou!', 
      ephemeral: true 
    });
  }
  
  // Implementar reroll similar ao prefixo
  await interaction.reply({ 
    content: '🔄 Reroll em desenvolvimento... Use `!!sorteio reroll [ID]` por enquanto.', 
    ephemeral: true 
  });
}