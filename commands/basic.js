const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('basico')
    .setDescription('Comandos básicos do bot')
    .addSubcommand(subcommand =>
      subcommand
        .setName('ping')
        .setDescription('Testa a latência do bot')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('ajuda')
        .setDescription('Mostra todos os comandos')
        .addStringOption(option =>
          option.setName('categoria')
            .setDescription('Categoria específica')
            .setRequired(false)
            .addChoices(
              { name: 'Economia', value: 'economia' },
              { name: 'Música', value: 'musica' },
              { name: 'Xadrez', value: 'xadrez' },
              { name: 'Moderação', value: 'moderacao' },
              { name: 'Diversão', value: 'diversao' },
              { name: 'Jogos', value: 'jogos' }
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('Status do bot')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('convite')
        .setDescription('Link para convidar o bot')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('uptime')
        .setDescription('Tempo online do bot')
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    
    switch(subcommand) {
      case 'ping':
        await pingCommand(interaction);
        break;
      case 'ajuda':
        await ajudaCommand(interaction);
        break;
      case 'status':
        await statusCommand(interaction);
        break;
      case 'convite':
        await conviteCommand(interaction);
        break;
      case 'uptime':
        await uptimeCommand(interaction);
        break;
    }
  }
};

// Comando !!ping (com prefixo também)
async function handlePrefixPing(message) {
  if (message.content === '!!ping') {
    const start = Date.now();
    const msg = await message.reply('🏓 Pinging...');
    const latency = Date.now() - start;
    const apiLatency = Math.round(message.client.ws.ping);
    
    await msg.edit(`🏓 **Pong!**\n📡 Latência: ${latency}ms\n🌐 API: ${apiLatency}ms`);
  }
}

// Funções dos comandos
async function pingCommand(interaction) {
  const start = Date.now();
  await interaction.deferReply();
  const latency = Date.now() - start;
  const apiLatency = Math.round(interaction.client.ws.ping);
  
  const embed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle('🏓 Pong!')
    .addFields(
      { name: '📡 Latência', value: `${latency}ms`, inline: true },
      { name: '🌐 API Latency', value: `${apiLatency}ms`, inline: true },
      { name: '⏰ Uptime', value: formatUptime(interaction.client.uptime), inline: true }
    )
    .setTimestamp();
  
  await interaction.editReply({ embeds: [embed] });
}

async function ajudaCommand(interaction) {
  const categoria = interaction.options.getString('categoria');
  
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('🤖 Comandos do Bot Coisinha')
    .setDescription('Use `/` para ver comandos slash ou `!!` para comandos com prefixo');
  
  if (!categoria) {
    embed.addFields(
      { name: '💰 Economia', value: '`/economia` - Sistema de moedas\n`!!daily` - Moedas diárias', inline: true },
      { name: '🎵 Música', value: '`/musica` - Comandos de música\n`!!musica tocar` - Tocar música', inline: true },
      { name: '♟️ Xadrez', value: '`/xadrez` - Jogar xadrez\n`!!xadrez desafiar` - Desafiar alguém', inline: true },
      { name: '🛡️ Moderação', value: '`/mod` - Comandos de mod\n`!!kick` - Expulsar membro', inline: true },
      { name: '🎉 Sorteios', value: '`/sorteio` - Criar sorteios\n`!!sorteio criar` - Criar sorteio', inline: true },
      { name: '🎮 Jogos', value: '`!!roletarussa` - Roleta russa\n`!!dado` - Rolar dado', inline: true },
      { name: '😂 Diversão', value: '`!!piada` - Contar piada\n`!!8ball` - Bola 8 mágica', inline: true },
      { name: '🔄 Utilitários', value: '`!!clima` - Previsão tempo\n`!!traduzir` - Tradutor', inline: true },
      { name: '📊 Info', value: '`!!status` - Status bot\n`!!servidores` - Lista servidores', inline: true }
    );
  } else {
    // Mostrar categoria específica
    const categorias = {
      economia: '💰 **COMANDOS DE ECONOMIA**\n`!!daily` - Moedas diárias\n`!!saldo` - Ver moedas\n`!!transferir` - Transferir moedas\n`!!rank` - Ranking de moedas\n`!!trabalhar` - Trabalhar por moedas\n`!!apostar` - Apostar moedas\n`!!loja` - Ver loja de itens',
      musica: '🎵 **COMANDOS DE MÚSICA**\n`!!musica tocar [nome]` - Tocar música\n`!!musica pular` - Pular música\n`!!musica fila` - Ver fila\n`!!musica parar` - Parar música\n`!!musica pausar` - Pausar música\n`!!musica continuar` - Continuar música\n`!!musica volume [1-10]` - Ajustar volume',
      xadrez: '♟️ **COMANDOS DE XADREZ**\n`!!xadrez desafiar @usuário [aposta]` - Desafiar\n`!!xadrez mover [movimento]` - Fazer movimento\n`!!xadrez tabuleiro` - Ver tabuleiro\n`!!xadrez desistir` - Desistir da partida\n`!!xadrez historico` - Histórico de partidas\n`!!xadrez ranking` - Ranking de xadrez',
      moderacao: '🛡️ **COMANDOS DE MODERAÇÃO**\n`!!kick @usuário [motivo]` - Expulsar\n`!!ban @usuário [motivo]` - Banir\n`!!mute @usuário [minutos] [motivo]` - Silenciar\n`!!limpar [quantidade]` - Limpar mensagens\n`!!aviso @usuário [motivo]` - Dar aviso\n`!!warnlist` - Ver avisos\n`!!unmute @usuário` - Remover mute',
      diversao: '😂 **COMANDOS DE DIVERSÃO**\n`!!piada` - Contar piada aleatória\n`!!8ball [pergunta]` - Bola 8 mágica\n`!!memes` - Mostrar meme\n`!!ship @usuário1 @usuário2` - Shipar pessoas\n`!!fatos` - Fato curioso\n`!!animais` - Foto de animal fofo\n`!!dizer [texto]` - Bot fala algo',
      jogos: '🎮 **COMANDOS DE JOGOS**\n`!!roletarussa [aposta]` - Roleta russa\n`!!cassino` - Menu do cassino\n`!!dado [lados]` - Rolar dado\n`!!coinflip [aposta]` - Cara ou coroa\n`!!blackjack [aposta]` - Jogar blackjack\n`!!slot [aposta]` - Caça-níquel\n`!!loteria` - Comprar bilhete'
    };
    
    embed.setDescription(categorias[categoria] || 'Categoria não encontrada');
  }
  
  embed.setFooter({ text: 'Use !!ajuda [categoria] para ver mais' });
  await interaction.reply({ embeds: [embed] });
}

async function statusCommand(interaction) {
  const client = interaction.client;
  const embed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle('📊 Status do Bot')
    .addFields(
      { name: '🤖 Bot', value: client.user.tag, inline: true },
      { name: '🆔 ID', value: client.user.id, inline: true },
      { name: '📅 Criado em', value: `<t:${Math.floor(client.user.createdTimestamp / 1000)}:D>`, inline: true },
      { name: '👥 Servidores', value: `${client.guilds.cache.size}`, inline: true },
      { name: '👤 Usuários', value: `${client.users.cache.size}`, inline: true },
      { name: '📈 Canais', value: `${client.channels.cache.size}`, inline: true },
      { name: '⏰ Uptime', value: formatUptime(client.uptime), inline: true },
      { name: '📡 Ping', value: `${client.ws.ping}ms`, inline: true },
      { name: '💾 Memória', value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, inline: true }
    )
    .setTimestamp();
  
  await interaction.reply({ embeds: [embed] });
}

async function conviteCommand(interaction) {
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('🔗 Convite do Bot')
    .setDescription(`Convite para adicionar o bot ao seu servidor:`)
    .addFields(
      { name: '📋 Com permissões básicas', value: `[Clique aqui](https://discord.com/api/oauth2/authorize?client_id=${interaction.client.user.id}&permissions=8&scope=bot%20applications.commands)` },
      { name: '⚡ Com todas as permissões', value: `[Clique aqui](https://discord.com/api/oauth2/authorize?client_id=${interaction.client.user.id}&permissions=2147483647&scope=bot%20applications.commands)` }
    )
    .setFooter({ text: 'Obrigado por usar o Bot Coisinha! ❤️' });
  
  await interaction.reply({ embeds: [embed] });
}

async function uptimeCommand(interaction) {
  const uptime = interaction.client.uptime;
  const embed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle('⏰ Uptime do Bot')
    .setDescription(`O bot está online há: **${formatUptime(uptime)}**`)
    .addFields(
      { name: '🕐 Iniciou em', value: `<t:${Math.floor((Date.now() - uptime) / 1000)}:F>` },
      { name: '🔄 Reiniciar', value: 'O bot reinicia automaticamente em caso de crash' }
    );
  
  await interaction.reply({ embeds: [embed] });
}

function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
  
  return parts.join(' ');
}

// Exportar para uso com prefixo !!
module.exports.prefixCommands = {
  ping: handlePrefixPing,
  
  ajuda: async (message, args) => {
    const categoria = args[0];
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🤖 Comandos do Bot Coisinha');
    
    if (!categoria) {
      embed.setDescription('Use `!!ajuda [categoria]` para ver comandos específicos\n\n**Categorias:**\n• `economia` - Sistema de moedas\n• `musica` - Comandos de música\n• `xadrez` - Jogo de xadrez\n• `moderacao` - Moderação\n• `jogos` - Mini-jogos\n• `diversao` - Comandos divertidos\n• `utilidade` - Utilitários');
    } else {
      const categorias = {
        economia: '💰 **COMANDOS DE ECONOMIA**\n`!!daily` - Moedas diárias (1000)\n`!!saldo [@user]` - Ver moedas\n`!!transferir @user valor` - Transferir\n`!!rank` - Top 10 mais ricos\n`!!trabalhar` - Trabalhar (500-1500)\n`!!apostar valor` - Apostar 50/50\n`!!loja` - Ver itens disponíveis',
        musica: '🎵 **COMANDOS DE MÚSICA**\n`!!musica tocar nome/url` - Tocar\n`!!musica pular` - Pular música\n`!!musica fila` - Ver fila\n`!!musica parar` - Parar e limpar\n`!!musica pausar` - Pausar\n`!!musica continuar` - Continuar\n`!!musica volume 1-10` - Volume',
        xadrez: '♟️ **COMANDOS DE XADREZ**\n`!!xadrez desafiar @user valor` - Desafiar\n`!!xadrez mover e2e4` - Mover peça\n`!!xadrez tabuleiro` - Ver tabuleiro\n`!!xadrez desistir` - Desistir\n`!!xadrez historico` - Histórico\n`!!xadrez ranking` - Ranking ELO',
        moderacao: '🛡️ **COMANDOS DE MODERAÇÃO**\n`!!kick @user [motivo]` - Expulsar\n`!!ban @user [motivo]` - Banir\n`!!mute @user minutos [motivo]` - Silenciar\n`!!limpar 1-100` - Apagar mensagens\n`!!aviso @user motivo` - Dar aviso\n`!!warnlist @user` - Ver avisos',
        jogos: '🎮 **COMANDOS DE JOGOS**\n`!!roletarussa valor` - Roleta russa\n`!!cassino` - Menu cassino\n`!!dado 6` - Dado de 6 lados\n`!!coinflip valor` - Cara ou coroa\n`!!blackjack valor` - Blackjack\n`!!slot valor` - Caça-níquel\n`!!loteria` - Bilhete de loteria',
        diversao: '😂 **COMANDOS DE DIVERSÃO**\n`!!piada` - Piada aleatória\n`!!8ball pergunta?` - Bola 8\n`!!memes` - Meme aleatório\n`!!ship @user1 @user2` - Ship (%)\n`!!fatos` - Fato curioso\n`!!animais` - Animal fofo\n`!!dizer texto` - Bot fala',
        utilidade: '🔄 **COMANDOS UTILITÁRIOS**\n`!!clima cidade` - Previsão\n`!!cotacao USD-BRL` - Câmbio\n`!!traduzir en:texto` - Tradutor\n`!!calculadora 2+2` - Calcular\n`!!horario` - Horário mundial\n`!!lembrete 1h texto` - Lembrete'
      };
      
      embed.setDescription(categorias[categoria] || 'Categoria não encontrada. Use: economia, musica, xadrez, moderacao, jogos, diversao, utilidade');
    }
    
    await message.reply({ embeds: [embed] });
  },
  
  status: async (message) => {
    const client = message.client;
    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('📊 Status do Bot')
      .setDescription(`**${client.user.tag}** está online há ${formatUptime(client.uptime)}`)
      .addFields(
        { name: '👥 Servidores', value: `${client.guilds.cache.size}`, inline: true },
        { name: '👤 Usuários', value: `${client.users.cache.size}`, inline: true },
        { name: '📡 Ping', value: `${client.ws.ping}ms`, inline: true },
        { name: '💾 Memória', value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, inline: true },
        { name: '🕐 Online desde', value: `<t:${Math.floor((Date.now() - client.uptime) / 1000)}:R>`, inline: true }
      );
    
    await message.reply({ embeds: [embed] });
  },
  
  convite: async (message) => {
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🔗 Convite do Bot')
      .setDescription(`[Clique para adicionar ao seu servidor](https://discord.com/api/oauth2/authorize?client_id=${message.client.user.id}&permissions=8&scope=bot%20applications.commands)\n\n[Suporte/Reportar bugs]()`)
      .setFooter({ text: 'Obrigado por usar o Bot Coisinha! ❤️' });
    
    await message.reply({ embeds: [embed] });
  },
  
  uptime: async (message) => {
    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('⏰ Uptime')
      .setDescription(`Online há: **${formatUptime(message.client.uptime)}**`)
      .setFooter({ text: `Iniciado em ${new Date(Date.now() - message.client.uptime).toLocaleString()}` });
    
    await message.reply({ embeds: [embed] });
  }
};