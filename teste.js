const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = "mongodb+srv://Vercel-Admin-coisinhaDB:WxclCVq9rxvlcC1F@coisinhadb.2ncmkge.mongodb.net/coisinhaDB?retryWrites=true&w=majority";

async function testar() {
  console.log('🔗 Testando conexão com MongoDB Atlas...');
  
  try {
    // Conectar
    await mongoose.connect(MONGO_URI);
    console.log('✅ CONECTADO COM SUCESSO!');
    
    // Criar um modelo de teste
    const Teste = mongoose.model('Teste', new mongoose.Schema({
      nome: String,
      data: { type: Date, default: Date.now }
    }));
    
    // Inserir dados
    await Teste.create({ 
      nome: 'Teste do Bot Coisinha',
      status: 'Funcionando! 🎉'
    });
    console.log('📝 Documento inserido!');
    
    // Ler dados
    const documentos = await Teste.find();
    console.log('📄 Documentos:', documentos);
    
    // Mostrar bancos disponíveis
    const connection = mongoose.connection;
    const dbs = await connection.db.admin().listDatabases();
    console.log('🏦 Bancos disponíveis:', dbs.databases.map(db => db.name));
    
    console.log('\n🎉 TUDO FUNCIONANDO PERFEITAMENTE!');
    
    await mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ ERRO:', error.message);
    
    // Dicas específicas por erro
    if (error.message.includes('Authentication failed')) {
      console.log('\n🔑 Dica: Verifique:');
      console.log('1. O usuário e senha estão corretos?');
      console.log('2. Seu IP está na whitelist do MongoDB Atlas?');
      console.log('   - Vá em MongoDB Atlas → Network Access');
      console.log('   - Clique em "Add IP Address"');
      console.log('   - Escolha "Allow Access from Anywhere" (0.0.0.0/0)');
    }
    
    if (error.message.includes('bad auth')) {
      console.log('\n🔑 A senha pode ter caracteres especiais.');
      console.log('Tente regenerar a senha no MongoDB Atlas.');
    }
  }
}

testar();