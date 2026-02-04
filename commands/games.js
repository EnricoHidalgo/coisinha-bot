const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const User = require('../models/User');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('jogos')
    .setDescription('Mini-jogos com apostas')
    .addSubcommand(subcommand =>
      subcommand
        .setName('roletarussa')
        .setDescription('Roleta russa - 1/6 chance de perder')
        .addIntegerOption(option =>
          option.setName('aposta')
            .setDescription('Quantia para apostar')
            .setRequired(true)
            .setMinValue(10)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('dado')
        .setDescription('Rola um dado')
        .addIntegerOption(option =>
          option.setName('lados')
            .setDescription('Número de lados do dado')
            .setRequired(false)
            .setMinValue(2)
            .setMaxValue(100)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('coinflip')
        .setDescription('Cara ou coroa')
        .addIntegerOption(option =>
          option.setName('aposta')
            .setDescription('Quantia para apostar')
            .setRequired(false)
            .setMinValue(10)
        )
        .addStringOption(option =>
          option.setName('escolha')
            .setDescription('Sua escolha')
            .setRequired(false)
            .addChoices(
              { name: 'Cara', value: 'cara' },
              { name: 'Coroa', value: 'coroa' }
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('cassino')
        .setDescription('Menu do cassino')
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    
    switch(subcommand) {
      case 'roletarussa':
        await roletaRussaCommand(interaction);
        break;
      case 'dado':
        await dadoCommand(interaction);
        break;
      case 'coinflip':
        await coinflipCommand(interaction);
        break;
      case 'cassino':
        await cassinoCommand(interaction);
        break;
    }
  }
};

// Comandos com prefixo !!
module.exports.prefixCommands = {
  roletarussa: async (message, args) => {
    const bet = parseInt(args[0]);
    
    if (!bet || isNaN(bet) || bet < 10) {
      return message.reply('❌ Use: `!!roletarussa [valor]` (mínimo 10 moedas)');
    }
    
    // Verificar saldo
    let user = await User.findOne({ 
      userId: message.author.id, 
      guildId: message.guild.id 
    });
    
    if (!user) {
      user = new User({
        userId: message.author.id,
        guildId: message.guild.id,
        coins: 1000
      });
    }
    
    if (user.coins < bet) {
      return message.reply(`❌ Você só tem ${user.coins} moedas!`);
    }
    
    // 1/6 chance de perder
    const bullet = Math.floor(Math.random() * 6); // 0-5
    const shot = Math.floor(Math.random() * 6); // 0-5
    
    if (bullet === shot) {
      // PERDEU
      user.coins -= bet;
      await user.save();
      
      const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('💥 BANG! Você perdeu!')
        .setDescription(`**${message.author.username}** puxou o gatilho...`)
        .addFields(
          { name: '💰 Aposta', value: `${bet} moedas`, inline: true },
          { name: '📉 Perda', value: `-${bet} moedas`, inline: true },
          { name: '💵 Saldo', value: `${user.coins} moedas`, inline: true }
        )
        .setImage('https://i.imgur.com/r8KvLwE.gif');
      
      await message.reply({ embeds: [embed] });
    } else {
      // GANHOU (5x a aposta)
      const win = bet * 5;
      user.coins += win;
      await user.save();
      
      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('🔫 Click! Você sobreviveu!')
        .setDescription(`**${message.author.username}** sobreviveu à roleta russa!`)
        .addFields(
          { name: '💰 Aposta', value: `${bet} moedas`, inline: true },
          { name: '🎉 Prêmio', value: `${win} moedas`, inline: true },
          { name: '💵 Saldo', value: `${user.coins} moedas`, inline: true }
        )
        .setFooter({ text: 'Ganhou 5x a aposta!' });
      
      await message.reply({ embeds: [embed] });
    }
  },
  
  dado: async (message, args) => {
    const sides = parseInt(args[0]) || 6;
    
    if (sides < 2 || sides > 100) {
      return message.reply('❌ O dado deve ter entre 2 e 100 lados!');
    }
    
    const roll = Math.floor(Math.random() * sides) + 1;
    
    const embed = new EmbedBuilder()
      .setColor(0x7289DA)
      .setTitle('🎲 Rolagem de Dado')
      .setDescription(`${message.author.username} rolou um dado de **${sides} lados**`)
      .addFields(
        { name: '🎯 Resultado', value: `**${roll}**`, inline: true },
        { name: '📊 Mínimo', value: '1', inline: true },
        { name: '📈 Máximo', value: `${sides}`, inline: true }
      )
      .setFooter({ text: `Dado D${sides}` });
    
    if (roll === 1) embed.setColor(0xFF0000);
    if (roll === sides) embed.setColor(0x00FF00);
    
    await message.reply({ embeds: [embed] });
  },
  
  coinflip: async (message, args) => {
    const bet = parseInt(args[0]);
    const choice = args[1]?.toLowerCase();
    
    if (bet && (isNaN(bet) || bet < 10)) {
      return message.reply('❌ Aposta mínima: 10 moedas');
    }
    
    let user;
    if (bet) {
      user = await User.findOne({ 
        userId: message.author.id, 
        guildId: message.guild.id 
      }) || new User({
        userId: message.author.id,
        guildId: message.guild.id,
        coins: 1000
      });
      
      if (user.coins < bet) {
        return message.reply(`❌ Você só tem ${user.coins} moedas!`);
      }
    }
    
    const result = Math.random() < 0.5 ? 'cara' : 'coroa';
    const resultEmoji = result === 'cara' ? '👑' : '🪙';
    
    let win = false;
    let prize = 0;
    
    if (choice && bet) {
      if (choice === result) {
        win = true;
        prize = bet; // Ganha o dobro (aposta + prêmio)
        user.coins += prize;
      } else {
        user.coins -= bet;
      }
      await user.save();
    }
    
    const embed = new EmbedBuilder()
      .setColor(win ? 0x00FF00 : bet ? 0xFF0000 : 0x7289DA)
      .setTitle(`${resultEmoji} Cara ou Coroa`)
      .setDescription(`**Resultado: ${result.toUpperCase()}**`);
    
    if (bet) {
      embed.addFields(
        { name: '💰 Aposta', value: `${bet} moedas`, inline: true },
        { name: '🎯 Escolha', value: choice || 'Nenhuma', inline: true },
        { name: '📊 Resultado', value: win ? '✅ Ganhou!' : '❌ Perdeu', inline: true }
      );
      
      if (win) {
        embed.addFields({ name: '🎉 Prêmio', value: `${prize} moedas` });
      }
      
      embed.addFields({ name: '💵 Saldo', value: `${user.coins} moedas` });
    }
    
    await message.reply({ embeds: [embed] });
  },
  
  cassino: async (message) => {
    const embed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle('🎰 CASINO COISINHA 🎰')
      .setDescription('Escolha um jogo para jogar:')
      .addFields(
        { name: '🎲 Dado', value: '`!!dado [lados]`\nRola um dado personalizado', inline: true },
        { name: '🪙 Cara ou Coroa', value: '`!!coinflip [aposta] [cara/coroa]`\nAposte no resultado', inline: true },
        { name: '🔫 Roleta Russa', value: '`!!roletarussa [aposta]`\n1/6 chance de perder tudo!', inline: true },
        { name: '🎯 Blackjack', value: '`!!blackjack [aposta]`\nJogue 21 contra o dealer', inline: true },
        { name: '🎰 Caça-níquel', value: '`!!slot [aposta]`\nGire as rodas!', inline: true },
        { name: '🎫 Loteria', value: '`!!loteria`\nCompre bilhete da loteria', inline: true }
      )
      .setFooter({ text: 'Jogue com responsabilidade! Idade mínima: 18 anos' });
    
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('game_dado')
          .setLabel('🎲 Dado')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('game_coinflip')
          .setLabel('🪙 Cara/Coroa')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('game_roleta')
          .setLabel('🔫 Roleta')
          .setStyle(ButtonStyle.Danger)
      );
    
    await message.reply({ embeds: [embed], components: [row] });
  },
  
  blackjack: async (message, args) => {
    const bet = parseInt(args[0]);
    
    if (!bet || bet < 10) {
      return message.reply('❌ Use: `!!blackjack [aposta]` (mínimo 10 moedas)');
    }
    
    // Verificar saldo
    let user = await User.findOne({ 
      userId: message.author.id, 
      guildId: message.guild.id 
    }) || new User({
      userId: message.author.id,
      guildId: message.guild.id,
      coins: 1000
    });
    
    if (user.coins < bet) {
      return message.reply(`❌ Você só tem ${user.coins} moedas!`);
    }
    
    // Cartas
    const deck = [];
    const suits = ['♠️', '♥️', '♦️', '♣️'];
    const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    
    for (let suit of suits) {
      for (let value of values) {
        deck.push({ suit, value });
      }
    }
    
    // Embaralhar
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    
    // Distribuir cartas
    const playerCards = [deck.pop(), deck.pop()];
    const dealerCards = [deck.pop(), deck.pop()];
    
    function cardValue(card) {
      if (['J', 'Q', 'K'].includes(card.value)) return 10;
      if (card.value === 'A') return 11; // Simplificado
      return parseInt(card.value);
    }
    
    function handValue(cards) {
      let value = cards.reduce((sum, card) => sum + cardValue(card), 0);
      let aces = cards.filter(card => card.value === 'A').length;
      
      while (value > 21 && aces > 0) {
        value -= 10;
        aces--;
      }
      
      return value;
    }
    
    const playerValue = handValue(playerCards);
    const dealerValue = handValue(dealerCards);
    
    // Determinar vencedor
    let result = '';
    let winMultiplier = 0;
    
    if (playerValue > 21) {
      result = '💥 Estourou! Você perdeu.';
      winMultiplier = -1;
    } else if (dealerValue > 21) {
      result = '🎉 Dealer estourou! Você ganhou!';
      winMultiplier = 2;
    } else if (playerValue > dealerValue) {
      result = '🎉 Você ganhou!';
      winMultiplier = 2;
    } else if (playerValue < dealerValue) {
      result = '😔 Dealer ganhou.';
      winMultiplier = -1;
    } else {
      result = '🤝 Empate!';
      winMultiplier = 0;
    }
    
    // Atualizar saldo
    const winnings = bet * winMultiplier;
    user.coins += winnings;
    await user.save();
    
    // Criar embed
    const embed = new EmbedBuilder()
      .setColor(winMultiplier > 0 ? 0x00FF00 : winMultiplier < 0 ? 0xFF0000 : 0xFFFF00)
      .setTitle('🃏 Blackjack')
      .setDescription(result)
      .addFields(
        { 
          name: '🎴 Suas Cartas', 
          value: playerCards.map(c => `${c.value}${c.suit}`).join(' ') + ` (${playerValue})`,
          inline: true 
        },
        { 
          name: '🤖 Dealer', 
          value: dealerCards.map((c, i) => i === 0 ? `${c.value}${c.suit}` : '❓').join(' ') + ` (${dealerCards[0].value === 'A' ? '11' : cardValue(dealerCards[0])}+?)`,
          inline: true 
        }
      )
      .addFields(
        { name: '💰 Aposta', value: `${bet} moedas`, inline: true },
        { name: '📊 Resultado', value: winnings >= 0 ? `+${winnings} moedas` : `${winnings} moedas`, inline: true },
        { name: '💵 Saldo', value: `${user.coins} moedas`, inline: true }
      );
    
    await message.reply({ embeds: [embed] });
  },
  
  slot: async (message, args) => {
    const bet = parseInt(args[0]);
    
    if (!bet || bet < 10) {
      return message.reply('❌ Use: `!!slot [aposta]` (mínimo 10 moedas)');
    }
    
    // Verificar saldo
    let user = await User.findOne({ 
      userId: message.author.id, 
      guildId: message.guild.id 
    }) || new User({
      userId: message.author.id,
      guildId: message.guild.id,
      coins: 1000
    });
    
    if (user.coins < bet) {
      return message.reply(`❌ Você só tem ${user.coins} moedas!`);
    }
    
    // Símbolos do slot
    const symbols = ['🍒', '🍋', '🍊', '🍇', '🔔', '⭐', '7️⃣', '💎'];
    
    // Girar
    const reels = [
      symbols[Math.floor(Math.random() * symbols.length)],
      symbols[Math.floor(Math.random() * symbols.length)],
      symbols[Math.floor(Math.random() * symbols.length)]
    ];
    
    // Calcular prêmio
    let multiplier = 0;
    
    if (reels[0] === reels[1] && reels[1] === reels[2]) {
      // Três iguais
      if (reels[0] === '💎') multiplier = 50; // Jackpot!
      else if (reels[0] === '7️⃣') multiplier = 20;
      else if (reels[0] === '⭐') multiplier = 10;
      else if (reels[0] === '🔔') multiplier = 5;
      else multiplier = 3;
    } else if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) {
      // Dois iguais
      multiplier = 1.5;
    } else {
      // Nada
      multiplier = -1;
    }
    
    // Atualizar saldo
    const winnings = Math.floor(bet * multiplier);
    user.coins += winnings;
    await user.save();
    
    // Criar embed
    const embed = new EmbedBuilder()
      .setColor(multiplier > 0 ? 0x00FF00 : 0xFF0000)
      .setTitle('🎰 Caça-Níquel')
      .setDescription(`**[ ${reels.join(' | ')} ]**`)
      .addFields(
        { name: '💰 Aposta', value: `${bet} moedas`, inline: true },
        { name: '🎯 Multiplicador', value: `${multiplier}x`, inline: true },
        { name: '📊 Resultado', value: winnings >= 0 ? `+${winnings} moedas` : `${winnings} moedas`, inline: true }
      )
      .addFields({ name: '💵 Saldo', value: `${user.coins} moedas` });
    
    if (multiplier === 50) {
      embed.setDescription(`**🎉 JACKPOT! 🎉**\n**[ ${reels.join(' | ')} ]**`);
      embed.setColor(0xFFD700);
    }
    
    await message.reply({ embeds: [embed] });
  },
  
  loteria: async (message) => {
    // Verificar saldo
    let user = await User.findOne({ 
      userId: message.author.id, 
      guildId: message.guild.id 
    }) || new User({
      userId: message.author.id,
      guildId: message.guild.id,
      coins: 1000
    });
    
    const ticketPrice = 50;
    
    if (user.coins < ticketPrice) {
      return message.reply(`❌ Bilhete custa ${ticketPrice} moedas. Você tem ${user.coins}.`);
    }
    
    user.coins -= ticketPrice;
    
    // Gerar números (1-60)
    const userNumbers = [];
    while (userNumbers.length < 6) {
      const num = Math.floor(Math.random() * 60) + 1;
      if (!userNumbers.includes(num)) userNumbers.push(num);
    }
    userNumbers.sort((a, b) => a - b);
    
    const winningNumbers = [];
    while (winningNumbers.length < 6) {
      const num = Math.floor(Math.random() * 60) + 1;
      if (!winningNumbers.includes(num)) winningNumbers.push(num);
    }
    winningNumbers.sort((a, b) => a - b);
    
    // Verificar acertos
    const matches = userNumbers.filter(num => winningNumbers.includes(num)).length;
    
    // Prêmios
    const prizes = [0, 0, 0, 100, 1000, 5000, 100000]; // Index = matches
    
    const prize = prizes[matches];
    user.coins += prize;
    await user.save();
    
    // Criar embed
    const embed = new EmbedBuilder()
      .setColor(matches >= 4 ? 0x00FF00 : matches >= 3 ? 0xFFFF00 : 0xFF0000)
      .setTitle('🎫 Loteria Coisinha')
      .setDescription(matches >= 3 ? `🎉 **PARABÉNS!** 🎉` : 'Tente novamente!')
      .addFields(
        { name: '🎯 Seus Números', value: userNumbers.join(', '), inline: true },
        { name: '🏆 Números Sorteados', value: winningNumbers.join(', '), inline: true },
        { name: '✅ Acertos', value: `${matches}/6`, inline: true }
      )
      .addFields(
        { name: '💰 Custo do Bilhete', value: `-${ticketPrice} moedas`, inline: true },
        { name: '🎁 Prêmio', value: `+${prize} moedas`, inline: true },
        { name: '💵 Saldo', value: `${user.coins} moedas`, inline: true }
      );
    
    if (matches === 6) {
      embed.setDescription('**🎊 JACKPOT! VOCÊ GANHOU A LOTERIA! 🎊**');
      embed.setColor(0xFFD700);
    }
    
    await message.reply({ embeds: [embed] });
  }
};

// Funções para slash commands
async function roletaRussaCommand(interaction) {
  const bet = interaction.options.getInteger('aposta');
  await module.exports.prefixCommands.roletarussa({
    author: interaction.user,
    guild: interaction.guild,
    reply: (content) => interaction.reply(content)
  }, [bet]);
}

async function dadoCommand(interaction) {
  const sides = interaction.options.getInteger('lados') || 6;
  await module.exports.prefixCommands.dado({
    author: interaction.user,
    reply: (content) => interaction.reply(content)
  }, [sides]);
}

async function coinflipCommand(interaction) {
  const bet = interaction.options.getInteger('aposta');
  const choice = interaction.options.getString('escolha');
  await module.exports.prefixCommands.coinflip({
    author: interaction.user,
    guild: interaction.guild,
    reply: (content) => interaction.reply(content)
  }, [bet, choice]);
}

async function cassinoCommand(interaction) {
  await module.exports.prefixCommands.cassino({
    reply: (content) => interaction.reply(content)
  });
}