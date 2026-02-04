// Conexão MongoDB
async function connectDB() {
  const MONGO_URI = "mongodb+srv://Vercel-Admin-coisinhaDB:WxclCVq9rxvlcC1F@coisinhadb.2ncmkge.mongodb.net/coisinhaDB?retryWrites=true&w=majority";
  
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado ao MongoDB Atlas!');
    
    // Verificar conexão
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log(`📁 Collections no banco: ${collections.length}`);
    
  } catch (error) {
    console.error('❌ Erro ao conectar ao MongoDB:', error.message);
    
    // Tentar reconectar após 5 segundos
    setTimeout(connectDB, 5000);
  }
}