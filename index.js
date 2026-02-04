const { Client, GatewayIntentBits, Collection, EmbedBuilder } = require('discord.js');
const mongoose = require('mongoose');
const express = require('express');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Servidor Express para Vercel
app.get('/', (req, res) => {
  res.send('🤖 Bot Coisinha está online! Use !!ajuda para ver comandos.');
});

app.get('/ping', (req, res) => {
  res.json({ status: 'alive', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`🌐 Servidor web na porta ${PORT}`);
});

// Configuração do bot Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent
  ]
});

client.commands = new Collection();
const prefix = '!!';

// ==================== CONEXÃO MONGODB ====================
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/coisinhaDB')
  .then(() => console.log('✅ MongoDB conectado!'))
  .catch(err => {
    console.error('❌ Erro MongoDB:', err.message);
    console.log('⚠️  Continuando sem banco de dados...');
  });

// ==================== CARREGAR COMANDOS ====================
console.log('📁 Carregando comandos...');
const fs = require('fs');
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
const commands = [];

for (const file of commandFiles) {
  try {
    const command = require(`./commands/${file}`);
    
    // Registrar comando slash se tiver data
    if (command.data) {
      client.commands.set(command.data.name, command);
      commands.push(command.data.toJSON());
      console.log(`✅ Carregado: ${command.data.name} (slash)`);
    }
    
    // Registrar comandos prefix se existirem
    if (command.prefixCommands) {
      console.log(`✅ Prefix commands de: ${file}`);
    }
  } catch (error) {
    console.error(`❌ Erro ao carregar ${file}:`, error.message);
  }
}

console.log(`📊 Total: ${client.commands.size} comandos slash carregados`);

// ==================== EVENTO READY ====================
client.once('ready', async () => {
  console.log('='.repeat(50));
  console.log(`🎉 ${client.user.tag} está ONLINE!`);
  console.log(`🆔 ID: ${client.user.id}`);
  console.log(`👥 Servidores: ${client.guilds.cache.size}`);
  console.log('='.repeat(50));
  
  // Registrar comandos slash globalmente
  try {
    const { REST } = require('@discordjs/rest');
    const { Routes } = require('discord-api-types/v9');
    
    const rest = new REST({ version: '9' }).setToken(process.env.TOKEN);
    
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    
    console.log('✅ Comandos slash registrados globalmente!');
  } catch (error) {
    console.error('❌ Erro ao registrar comandos slash:', error.message);
    console.log('⚠️  Comandos slash podem não funcionar. Verifique as permissões do bot.');
  }
  
  // Status do bot
  client.user.setPresence({
    activities: [{ 
      name: `!!ajuda | ${client.guilds.cache.size} servidores`, 
      type: 3 // WATCHING
    }],
    status: 'online'
  });
  
  console.log('🤖 Bot pronto para receber comandos!');
  console.log(`📝 Prefixo: "${prefix}" | Slash: "/"`);
  console.log('='.repeat(50));
});

// ==================== SLASH COMMANDS ====================
client.on('interactionCreate', async interaction => {
  // Comandos slash
  if (interaction.isCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`Erro no comando ${interaction.commandName}:`, error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('❌ Erro ao executar comando')
        .setDescription('Ocorreu um erro inesperado. Tente novamente mais tarde.')
        .setFooter({ text: 'Erro reportado aos desenvolvedores' });
      
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
      } else {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }
    }
    return;
  }
  
  // Botões (para sorteios, etc)
  if (interaction.isButton()) {
    // Aqui você pode adicionar lógica para botões
    // Por exemplo: sorteios, confirmações, etc.
    return;
  }
});

// ==================== COMANDOS COM PREFIXO !! ====================
client.on('messageCreate', async message => {
  // Ignorar bots e mensagens sem prefixo
  if (message.author.bot || !message.content.startsWith(prefix)) return;
  
  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();
  
  // Log do comando
  console.log(`[${message.guild?.name || 'DM'}] ${message.author.tag}: ${prefix}${commandName} ${args.join(' ')}`);
  
  // ========== COMANDOS EMBUTIDOS (sempre funcionam) ==========
  
  // !!ping - Teste básico
  if (commandName === 'ping') {
    const start = Date.now();
    const msg = await message.reply('🏓 Pinging...');
    const latency = Date.now() - start;
    const apiLatency = Math.round(message.client.ws.ping);
    
    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('🏓 Pong!')
      .addFields(
        { name: '📡 Latência', value: `${latency}ms`, inline: true },
        { name: '🌐 API', value: `${apiLatency}ms`, inline: true },
        { name: '⏰ Uptime', value: formatUptime(message.client.uptime), inline: true }
      );
    
    await msg.edit({ content: null, embeds: [embed] });
    return;
  }
  
  // !!ajuda - Menu de ajuda
  if (commandName === 'ajuda' || commandName === 'help') {
    const categoria = args[0]?.toLowerCase();
    
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🤖 **COMANDOS DO BOT COISINHA**')
      .setDescription(`Prefixo: \`${prefix}\` | Use \`${prefix}ajuda [categoria]\`\n\n**📋 Categorias:**`)
      .addFields(
        { name: '💰 Economia', value: '`!!daily`, `!!saldo`, `!!transferir`, `!!rank`', inline: true },
        { name: '🎵 Música', value: '`!!musica tocar`, `!!musica pular`, `!!musica fila`', inline: true },
        { name: '♟️ Xadrez', value: '`!!xadrez desafiar`, `!!xadrez mover`, `!!xadrez tabuleiro`', inline: true },
        { name: '🛡️ Moderação', value: '`!!kick`, `!!ban`, `!!mute`, `!!limpar`', inline: true },
        { name: '🎉 Sorteios', value: '`!!sorteio criar`, `!!sorteio listar`, `!!sorteio cancelar`', inline: true },
        { name: '🎮 Jogos', value: '`!!roletarussa`, `!!dado`, `!!coinflip`, `!!cassino`', inline: true },
        { name: '😂 Diversão', value: '`!!piada`, `!!8ball`, `!!memes`, `!!ship`', inline: true },
        { name: '🔄 Utilitários', value: '`!!clima`, `!!traduzir`, `!!calculadora`, `!!horario`', inline: true },
        { name: '📊 Info', value: '`!!status`, `!!level`, `!!convite`, `!!uptime`', inline: true }
      )
      .setFooter({ text: `Total: ${client.commands.size} comandos slash disponíveis também!` });
    
    if (categoria) {
      const categoriasDetalhes = {
        economia: '💰 **COMANDOS DE ECONOMIA**\n`!!daily` - Moedas diárias\n`!!saldo [@user]` - Ver saldo\n`!!transferir @user valor` - Transferir moedas\n`!!rank` - Ranking de moedas\n`!!trabalhar` - Trabalhar por moedas\n`!!apostar valor` - Apostar 50/50\n`!!loja` - Ver loja',
        musica: '🎵 **COMANDOS DE MÚSICA**\n`!!musica tocar nome/url` - Tocar música\n`!!musica pular` - Pular música atual\n`!!musica fila` - Ver fila de músicas\n`!!musica parar` - Parar música e limpar fila\n`!!musica pausar` - Pausar música\n`!!musica continuar` - Continuar música\n`!!musica volume 1-10` - Ajustar volume',
        xadrez: '♟️ **COMANDOS DE XADREZ**\n`!!xadrez desafiar @user valor` - Desafiar para xadrez com aposta\n`!!xadrez mover e2e4` - Fazer movimento (notação algébrica)\n`!!xadrez tabuleiro` - Ver tabuleiro atual\n`!!xadrez desistir` - Desistir da partida\n`!!xadrez historico` - Histórico de partidas\n`!!xadrez ranking` - Ranking ELO',
        moderacao: '🛡️ **COMANDOS DE MODERAÇÃO**\n`!!kick @user [motivo]` - Expulsar membro\n`!!ban @user [motivo]` - Banir membro\n`!!mute @user minutos [motivo]` - Silenciar membro\n`!!limpar 1-100` - Limpar mensagens\n`!!aviso @user motivo` - Dar aviso\n`!!warnlist @user` - Ver avisos do membro',
        sorteios: '🎉 **COMANDOS DE SORTEIOS**\n`!!sorteio criar premio minutos [vencedores]` - Criar sorteio\n`!!sorteio listar` - Listar sorteios ativos\n`!!sorteio cancelar ID` - Cancelar sorteio\n`!!sorteio reroll ID` - Sortear novamente',
        jogos: '🎮 **COMANDOS DE JOGOS**\n`!!roletarussa valor` - Roleta russa (1/6 chance de perder)\n`!!dado [lados]` - Rolar dado (padrão: 6 lados)\n`!!coinflip [valor] [cara/coroa]` - Cara ou coroa com aposta\n`!!cassino` - Menu do cassino\n`!!blackjack valor` - Jogar blackjack\n`!!slot valor` - Caça-níquel\n`!!loteria` - Loteria diária',
        diversao: '😂 **COMANDOS DE DIVERSÃO**\n`!!piada` - Contar piada aleatória\n`!!8ball pergunta?` - Bola 8 mágica\n`!!memes` - Mostrar meme aleatório\n`!!ship @user1 @user2` - Calcular compatibilidade\n`!!fatos` - Fato curioso aleatório\n`!!animais [tipo]` - Foto de animal fofo\n`!!dizer texto` - Bot repete o texto',
        utilidade: '🔄 **COMANDOS UTILITÁRIOS**\n`!!clima cidade` - Previsão do tempo\n`!!cotacao USD-BRL` - Cotação de moedas\n`!!traduzir en:texto` - Tradutor\n`!!calculadora 2+2` - Calculadora\n`!!horario` - Horário mundial\n`!!lembrete 30m texto` - Configurar lembrete'
      };
      
      if (categoriasDetalhes[categoria]) {
        embed.setDescription(categoriasDetalhes[categoria]);
        embed.setTitle(`🤖 Ajuda: ${categoria.charAt(0).toUpperCase() + categoria.slice(1)}`);
      } else {
        embed.setDescription(`Categoria \`${categoria}\` não encontrada.\n\nCategorias disponíveis: ${Object.keys(categoriasDetalhes).join(', ')}`);
      }
    }
    
    await message.reply({ embeds: [embed] });
    return;
  }
  
  // !!status - Status do bot
  if (commandName === 'status') {
    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('📊 Status do Bot')
      .addFields(
        { name: '🤖 Bot', value: client.user.tag, inline: true },
        { name: '🆔 ID', value: client.user.id, inline: true },
        { name: '📅 Criado em', value: `<t:${Math.floor(client.user.createdTimestamp / 1000)}:D>`, inline: true },
        { name: '👥 Servidores', value: `${client.guilds.cache.size}`, inline: true },
        { name: '👤 Usuários', value: `${client.users.cache.size}`, inline: true },
        { name: '⏰ Uptime', value: formatUptime(client.uptime), inline: true },
        { name: '📡 Ping', value: `${client.ws.ping}ms`, inline: true },
        { name: '💾 Memória', value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, inline: true }
      )
      .setTimestamp();
    
    await message.reply({ embeds: [embed] });
    return;
  }
  
  // !!convite - Link para convidar o bot
  if (commandName === 'convite' || commandName === 'invite') {
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🔗 Convite do Bot')
      .setDescription(`Adicione o bot ao seu servidor!`)
      .addFields(
        { name: '📋 Com permissões básicas', value: `[Clique aqui](https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands)` },
        { name: '⚡ Com todas as permissões', value: `[Clique aqui](https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=2147483647&scope=bot%20applications.commands)` }
      )
      .setFooter({ text: 'Obrigado por usar o Bot Coisinha! ❤️' });
    
    await message.reply({ embeds: [embed] });
    return;
  }
  
  // !!uptime - Tempo online
  if (commandName === 'uptime') {
    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('⏰ Uptime do Bot')
      .setDescription(`Online há: **${formatUptime(client.uptime)}**`)
      .addFields(
        { name: '🕐 Iniciou em', value: `<t:${Math.floor((Date.now() - client.uptime) / 1000)}:F>` },
        { name: '🔄 Reiniciar', value: 'O bot reinicia automaticamente em caso de crash' }
      );
    
    await message.reply({ embeds: [embed] });
    return;
  }
  
  // ========== PROCURAR COMANDO NOS MÓDULOS ==========
  let commandExecuted = false;
  
  for (const [moduleName, module] of client.commands.entries()) {
    if (module.prefixCommands && module.prefixCommands[commandName]) {
      try {
        await module.prefixCommands[commandName](message, args);
        commandExecuted = true;
        break;
      } catch (error) {
        console.error(`Erro no comando ${commandName} do módulo ${moduleName}:`, error);
        
        const errorEmbed = new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('❌ Erro no comando')
          .setDescription(`Ocorreu um erro ao executar \`${prefix}${commandName}\`:\n\`\`\`${error.message}\`\`\``)
          .setFooter({ text: 'Tente novamente ou use !!ajuda' });
        
        await message.reply({ embeds: [errorEmbed] });
        commandExecuted = true;
        break;
      }
    }
    
    // Comandos com espaço (ex: "musica tocar")
    if (module.prefixCommands) {
      const fullCommand = `${commandName} ${args[0] || ''}`.trim();
      for (const cmdName in module.prefixCommands) {
        if (cmdName.startsWith(fullCommand)) {
          try {
            await module.prefixCommands[cmdName](message, args.slice(1));
            commandExecuted = true;
            break;
          } catch (error) {
            console.error(`Erro no comando ${cmdName}:`, error);
          }
        }
      }
      if (commandExecuted) break;
    }
  }
  
  // Comando não encontrado
  if (!commandExecuted && commandName) {
    const embed = new EmbedBuilder()
      .setColor(0xFFA500)
      .setTitle('❓ Comando não encontrado')
      .setDescription(`O comando \`${prefix}${commandName}\` não existe.`)
      .addFields(
        { name: '💡 Dica', value: `Use \`${prefix}ajuda\` para ver todos os comandos disponíveis.` },
        { name: '🔍 Sugestões', value: `Você quis dizer:\n• ${getCommandSuggestions(commandName, client.commands).join('\n• ')}` }
      );
    
    await message.reply({ embeds: [embed] });
  }
});

// ==================== SISTEMA DE XP AUTOMÁTICO ====================
client.on('messageCreate', async message => {
  // Ignorar bots, comandos e mensagens em DM
  if (message.author.bot || message.content.startsWith(prefix) || !message.guild) return;
  
  // 10-25 XP por mensagem (com cooldown)
  const xpAmount = Math.floor(Math.random() * 16) + 10;
  
  try {
    // Verificar se temos módulo de level
    const levelModule = require('./commands/level');
    if (levelModule && levelModule.xpSystem) {
      const result = await levelModule.xpSystem.giveXp(
        message.author.id,
        message.guild.id,
        xpAmount
      );
      
      if (result && result.leveledUp) {
        const embed = new EmbedBuilder()
          .setColor(0x00FF00)
          .setTitle('🎉 Level Up!')
          .setDescription(`**${message.author.username}** subiu para o nível **${result.newLevel}**!`)
          .addFields(
            { name: '🎁 Recompensa', value: `${result.reward} moedas` },
            { name: '💰 Saldo Total', value: 'Verifique com `!!level`' }
          );
        
        await message.reply({ embeds: [embed] });
      }
    }
  } catch (error) {
    // Ignorar erros no sistema de XP (pode não estar configurado)
  }
});

// ==================== TRATAMENTO DE ERROS ====================
client.on('error', console.error);
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled Promise Rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

// ==================== FUNÇÕES AUXILIARES ====================
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

function getCommandSuggestions(input, commands) {
  const allCommands = [
    'ping', 'ajuda', 'status', 'convite', 'uptime',
    'daily', 'saldo', 'transferir', 'rank', 'trabalhar',
    'musica tocar', 'musica pular', 'musica fila', 'musica parar',
    'xadrez desafiar', 'xadrez mover', 'xadrez tabuleiro',
    'kick', 'ban', 'mute', 'limpar', 'aviso',
    'sorteio criar', 'sorteio listar', 'sorteio cancelar',
    'roletarussa', 'dado', 'coinflip', 'cassino', 'blackjack',
    'piada', '8ball', 'memes', 'ship', 'fatos',
    'clima', 'traduzir', 'calculadora', 'horario', 'lembrete',
    'level', 'recompensas'
  ];
  
  const suggestions = allCommands
    .filter(cmd => cmd.startsWith(input) || input.includes(cmd))
    .slice(0, 5);
  
  return suggestions.length > 0 ? suggestions : ['ajuda', 'status', 'ping'];
}

// ==================== INICIAR BOT ====================
console.log('🚀 Iniciando bot Coisinha...');

client.login(process.env.TOKEN)
  .then(() => {
    console.log('🔑 Login realizado com sucesso!');
  })
  .catch(error => {
    console.error('❌ ERRO NO LOGIN:', error.message);
    console.log('\n🔧 SOLUÇÃO:');
    console.log('1. Verifique se o token no .env está correto');
    console.log('2. Ative as intents no Discord Developer Portal');
    console.log('3. Verifique se o bot está adicionado ao servidor');
    console.log('4. Token format: TOKEN=seu_token_aqui (sem aspas)');
    
    // Tentar com token hardcoded para teste
    if (process.env.TOKEN && process.env.TOKEN.includes('SEU_TOKEN')) {
      console.log('\n⚠️  Token parece ser placeholder. Substitua no arquivo .env!');
    }
    
    process.exit(1);
  });

// Export para Vercel
module.exports = app;