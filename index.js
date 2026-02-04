// index.js - VERSÃO COM MUITOS LOGS
const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

console.log('='.repeat(50));
console.log('🤖 BOT COISINHA - INICIANDO');
console.log('='.repeat(50));

// 1. Verificar token
console.log('[1/5] 🔍 Verificando token...');
if (!process.env.TOKEN) {
  console.error('❌ ERRO: Token não encontrado no .env');
  process.exit(1);
}
console.log('✅ Token OK (primeiros 10 chars):', process.env.TOKEN.substring(0, 10) + '...');

// 2. Criar cliente
console.log('[2/5] 🛠️ Criando cliente Discord...');
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers
  ]
});
console.log('✅ Cliente criado!');

// 3. Evento READY
console.log('[3/5] 📡 Configurando evento "ready"...');
client.once('ready', () => {
  console.log('='.repeat(50));
  console.log(`🎉 ${client.user.tag} ESTÁ ONLINE!`);
  console.log(`🆔 ID: ${client.user.id}`);
  console.log(`👥 Servidores: ${client.guilds.cache.size}`);
  console.log('='.repeat(50));
  
  // Mostrar servidores
  client.guilds.cache.forEach((guild, id) => {
    console.log(`🏠 Servidor: ${guild.name} (${id})`);
  });
  
  console.log('\n📝 COMANDOS PARA TESTAR:');
  console.log('!!ping - Teste básico');
  console.log('!!ola - Saudação');
  console.log('!!teste - Teste completo');
  console.log('='.repeat(50));
});

// 4. Evento de mensagens
console.log('[4/5] 📨 Configurando evento de mensagens...');
client.on('messageCreate', async (message) => {
  // Ignorar bots
  if (message.author.bot) return;
  
  // Log de todas as mensagens (opcional)
  // console.log(`💬 ${message.author.tag}: ${message.content}`);
  
  // Comandos com !!
  if (message.content.startsWith('!!')) {
    const comando = message.content.slice(2).toLowerCase().trim();
    console.log(`🎯 Comando recebido: "${comando}" de ${message.author.tag}`);
    
    // !!ping
    if (comando === 'ping') {
      console.log('✅ Respondendo: Pong!');
      await message.reply('🏓 Pong!');
    }
    
    // !!ola / !!oi
    if (comando === 'ola' || comando === 'oi') {
      console.log('✅ Respondendo: Olá!');
      await message.reply(`👋 Olá, ${message.author.username}!`);
    }
    
    // !!teste
    if (comando === 'teste') {
      console.log('✅ Respondendo: Teste completo!');
      await message.reply('✅ **TUDO FUNCIONANDO!** 🎉\nBot Coisinha operacional!');
    }
    
    // !!ajuda
    if (comando === 'ajuda') {
      console.log('✅ Respondendo: Ajuda');
      const ajuda = `
🤖 **COMANDOS DO BOT COISINHA**:
\`!!ping\` - Testa conexão
\`!!ola\` - Saudação
\`!!teste\` - Teste completo
\`!!ajuda\` - Esta mensagem

🎮 **Em breve**: Xadrez, Música, Economia!`;
      await message.reply(ajuda);
    }
    
    // !!debug
    if (comando === 'debug') {
      console.log('✅ Respondendo: Debug info');
      const info = `
🔧 **DEBUG INFO**:
• Bot: ${client.user.tag}
• Online desde: ${new Date(client.readyAt).toLocaleTimeString()}
• Servidores: ${client.guilds.cache.size}
• Ping: ${client.ws.ping}ms
• Node: ${process.version}`;
      await message.reply(info);
    }
  }
});

// 5. Evento de erro
console.log('[5/5] ⚠️ Configurando tratamento de erros...');
client.on('error', (error) => {
  console.error('❌ ERRO DO CLIENTE:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ PROMISE REJEITADA:', error);
});

// 6. Fazer login
console.log('\n🔑 INICIANDO LOGIN NO DISCORD...');
console.log('⏳ Aguardando conexão...\n');

client.login(process.env.TOKEN)
  .then(() => {
    console.log('✅ Login promise resolvida!');
  })
  .catch((error) => {
    console.error('❌ ERRO NO LOGIN:', error.message);
    console.log('\n🔧 SOLUÇÃO:');
    console.log('1. Token correto?');
    console.log('2. Bot adicionado ao servidor?');
    console.log('3. Intents ativadas no Discord Developer Portal?');
    process.exit(1);
  });

// 7. Manter processo vivo
console.log('🔄 Processo iniciado. Pressione Ctrl+C para parar.');