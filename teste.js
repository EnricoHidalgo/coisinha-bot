const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

console.log('🔍 Verificando token...');
console.log('Token (oculto):', process.env.TOKEN ? 
  process.env.TOKEN.substring(0, 10) + '...' : 'NÃO ENCONTRADO');

// Teste rápido
const token = process.env.TOKEN;

if (!token) {
  console.log('❌ Token não encontrado no .env');
  process.exit(1);
}

// Verificar formato básico
if (!token.includes('.')) {
  console.log('❌ Token parece inválido (deve conter um ponto)');
  console.log('💡 Formato correto: XXXXXXXX.XXXXX.XXXXXXXXX');
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

console.log('🔑 Tentando login...');

client.login(token)
  .then(() => {
    console.log('✅ TOKEN VÁLIDO!');
    console.log(`🤖 Bot: ${client.user.tag}`);
    console.log('🎉 Tudo certo! Agora execute index.js');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ ERRO:', error.message);
    
    if (error.message.includes('invalid token')) {
      console.log('\n🔧 TOKEN INVÁLIDO - FAÇA:');
      console.log('1. Vá em https://discord.com/developers/applications');
      console.log('2. Clique no seu bot "Coisinha"');
      console.log('3. Vá em "Bot" → "Reset Token"');
      console.log('4. Copie o NOVO token');
      console.log('5. Cole no arquivo .env');
    }
    
    process.exit(1);
  });