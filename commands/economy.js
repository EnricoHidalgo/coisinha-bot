const { SlashCommandBuilder } = require('@discordjs/builders');
const { User } = require('../models');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('economia')
        .setDescription('Comandos de economia')
        .addSubcommand(subcommand =>
            subcommand
                .setName('saldo')
                .setDescription('Veja seu saldo')
                .addUserOption(option =>
                    option.setName('usuario')
                        .setDescription('Usuário para ver o saldo')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('daily')
                .setDescription('Receba suas moedas diárias')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('transferir')
                .setDescription('Transfira moedas para outro usuário')
                .addUserOption(option =>
                    option.setName('usuario')
                        .setDescription('Usuário para transferir')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option.setName('quantia')
                        .setDescription('Quantia para transferir')
                        .setRequired(true)
                )
        ),
    
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        
        switch(subcommand) {
            case 'saldo':
                await showBalance(interaction);
                break;
            case 'daily':
                await dailyCoins(interaction);
                break;
            case 'transferir':
                await transferCoins(interaction);
                break;
        }
    }
};

async function showBalance(interaction) {
    const targetUser = interaction.options.getUser('usuario') || interaction.user;
    
    let user = await User.findOne({ userId: targetUser.id, guildId: interaction.guild.id });
    
    if (!user) {
        user = new User({
            userId: targetUser.id,
            guildId: interaction.guild.id,
            coins: 1000,
            bank: 0
        });
        await user.save();
    }
    
    await interaction.reply({
        content: `💰 **Saldo de ${targetUser.username}**\n💵 Carteira: ${user.coins} moedas\n🏦 Banco: ${user.bank} moedas`,
        ephemeral: false
    });
}

async function dailyCoins(interaction) {
    let user = await User.findOne({ userId: interaction.user.id, guildId: interaction.guild.id });
    
    if (!user) {
        user = new User({
            userId: interaction.user.id,
            guildId: interaction.guild.id,
            coins: 1000
        });
    }
    
    if (user.dailyCooldown && user.dailyCooldown > new Date()) {
        const timeLeft = Math.ceil((user.dailyCooldown - new Date()) / 1000 / 60 / 60);
        return interaction.reply({ 
            content: `⏰ Você já recebeu seu daily hoje! Volte em ${timeLeft} horas.`, 
            ephemeral: true 
        });
    }
    
    const dailyAmount = 500;
    user.coins += dailyAmount;
    user.dailyCooldown = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas
    await user.save();
    
    await interaction.reply({
        content: `🎉 Você recebeu ${dailyAmount} moedas diárias! Novo saldo: ${user.coins} moedas`,
        ephemeral: false
    });
}

async function transferCoins(interaction) {
    const targetUser = interaction.options.getUser('usuario');
    const amount = interaction.options.getInteger('quantia');
    
    if (targetUser.id === interaction.user.id) {
        return interaction.reply({ 
            content: '❌ Você não pode transferir para si mesmo!', 
            ephemeral: true 
        });
    }
    
    if (amount <= 0) {
        return interaction.reply({ 
            content: '❌ A quantia deve ser maior que zero!', 
            ephemeral: true 
        });
    }
    
    let sender = await User.findOne({ userId: interaction.user.id, guildId: interaction.guild.id });
    let receiver = await User.findOne({ userId: targetUser.id, guildId: interaction.guild.id });
    
    if (!sender) {
        sender = new User({
            userId: interaction.user.id,
            guildId: interaction.guild.id,
            coins: 1000
        });
    }
    
    if (!receiver) {
        receiver = new User({
            userId: targetUser.id,
            guildId: interaction.guild.id,
            coins: 1000
        });
    }
    
    if (sender.coins < amount) {
        return interaction.reply({ 
            content: '❌ Você não tem moedas suficientes!', 
            ephemeral: true 
        });
    }
    
    sender.coins -= amount;
    receiver.coins += amount;
    
    await sender.save();
    await receiver.save();
    
    await interaction.reply({
        content: `✅ Você transferiu ${amount} moedas para ${targetUser.username}!`,
        ephemeral: false
    });
}