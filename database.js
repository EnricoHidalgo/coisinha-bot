const mongoose = require('mongoose');

module.exports = {
    connect: async () => {
        try {
            await mongoose.connect(process.env.MONGO_URI);
            console.log('✅ Conectado ao MongoDB!');
        } catch (error) {
            console.error('❌ Erro ao conectar ao MongoDB:', error);
        }
    }
};