const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sorteio')
        .setDescription('Cria um sorteio')
        .addStringOption(option =>
            option.setName('premio')
                .setDescription('Prêmio do sorteio')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('duracao')
                .setDescription('Duração em minutos')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('vencedores')
                .setDescription('Número de vencedores')
                .setRequired(false)
        ),
    
    async execute(interaction) {
        const prize = interaction.options.getString('premio');
        const duration = interaction.options.getInteger('duracao');
        const winners = interaction.options.getInteger('vencedores') || 1;
        
        const endTime = Date.now() + duration * 60 * 1000;
        
        const embed = {
            color: 0x00ff00,
            title: '🎉 **SORTEIO** 🎉',
            description: `**Prêmio:** ${prize}\n**Vencedores:** ${winners}\n**Termina:** <t:${Math.floor(endTime / 1000)}:R>`,
            footer: { text: 'Reaja com 🎉 para participar!' }
        };
        
        const message = await interaction.reply({
            embeds: [embed],
            fetchReply: true
        });
        
        await message.react('🎉');
        
        // Coletar reações depois do tempo
        setTimeout(async () => {
            const reaction = message.reactions.cache.get('🎉');
            
            if (!reaction || reaction.count <= 1) {
                return message.reply('❌ Ninguém participou do sorteio!');
            }
            
            const users = await reaction.users.fetch();
            const participants = users.filter(user => !user.bot).map(user => user);
            
            if (participants.length < winners) {
                return message.reply('❌ Não há participantes suficientes!');
            }
            
            const selectedWinners = [];
            for (let i = 0; i < winners; i++) {
                const randomIndex = Math.floor(Math.random() * participants.length);
                selectedWinners.push(participants[randomIndex]);
                participants.splice(randomIndex, 1);
            }
            
            const winnerMentions = selectedWinners.map(winner => `<@${winner.id}>`).join(', ');
            
            await message.reply(`🎊 **SORTEIO ENCERRADO!**\n**Prêmio:** ${prize}\n**Vencedor(es):** ${winnerMentions}\nParabéns! 🎉`);
        }, duration * 60 * 1000);
    }
};