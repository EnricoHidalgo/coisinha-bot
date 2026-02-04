// index.js TESTE SIMPLES
const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

console.log('🚀 Iniciando bot Coisinha...');
console.log('📁 Diretório:', __dirname);

// Verifica se tem o token
if (!process.env.TOKEN) {
  console.error('❌ ERRO: Token não encontrado no .env');
  console.log('💡 Crie um arquivo .env com: TOKEN=seu_token_aqui');
  process.exit(1);
}

console.log('✅ Token encontrado!');

// Cria o cliente do bot
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

// Quando bot estiver pronto
client.once('ready', () => {
  console.log(`🎉 ${client.user.tag} está online!`);
  console.log(`👥 Conectado em ${client.guilds.cache.size} servidores`);
  
  // Mostra comandos disponíveis
  console.log('\n📋 Comandos disponíveis:');
  console.log('!!ping - Responde com Pong');
  console.log('!!ajuda - Mostra ajuda');
});

// Comando simples
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  
  if (message.content === '!!ping') {
    await message.reply('🏓 Pong!');
  }
  
  if (message.content === '!!ajuda') {
    await message.reply('🤖 Bot Coisinha está funcionando!\nComandos: !!ping, !!ajuda');
  }
  
  if (message.content === '!!teste') {
    await message.reply('✅ Bot funcionando perfeitamente! 🎉');
  }
});

// Tratamento de erros
client.on('error', console.error);
process.on('unhandledRejection', console.error);

// Iniciar bot
client.login(process.env.TOKEN)
  .then(() => console.log('🔑 Login realizado com sucesso!'))
  .catch(error => {
    console.error('❌ Erro no login:', error.message);
    console.log('\n🔧 Verifique:');
    console.log('1. Token correto no .env');
    console.log('2. Intents ativadas no Discord Developer Portal');
    console.log('3. Bot adicionado ao servidor');
  });