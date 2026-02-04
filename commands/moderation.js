const { SlashCommandBuilder, PermissionFlagsBits } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mod')
        .setDescription('Comandos de moderação')
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers | PermissionFlagsBits.BanMembers)
        .addSubcommand(subcommand =>
            subcommand
                .setName('kick')
                .setDescription('Expulsa um membro do servidor')
                .addUserOption(option =>
                    option.setName('usuario')
                        .setDescription('Usuário para expulsar')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('motivo')
                        .setDescription('Motivo da expulsão')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('ban')
                .setDescription('Bane um membro do servidor')
                .addUserOption(option =>
                    option.setName('usuario')
                        .setDescription('Usuário para banir')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('motivo')
                        .setDescription('Motivo do banimento')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('mute')
                .setDescription('Silencia um membro')
                .addUserOption(option =>
                    option.setName('usuario')
                        .setDescription('Usuário para silenciar')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option.setName('tempo')
                        .setDescription('Tempo em minutos')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('motivo')
                        .setDescription('Motivo do mute')
                        .setRequired(false)
                )
        ),
    
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        
        switch(subcommand) {
            case 'kick':
                await kickUser(interaction);
                break;
            case 'ban':
                await banUser(interaction);
                break;
            case 'mute':
                await muteUser(interaction);
                break;
        }
    }
};

async function kickUser(interaction) {
    const user = interaction.options.getUser('usuario');
    const reason = interaction.options.getString('motivo') || 'Sem motivo fornecido';
    
    const member = await interaction.guild.members.fetch(user.id);
    
    if (!member.kickable) {
        return interaction.reply({ 
            content: '❌ Não posso expulsar este usuário!', 
            ephemeral: true 
        });
    }
    
    try {
        await member.kick(reason);
        await interaction.reply({
            content: `✅ ${user.tag} foi expulso!\n📝 Motivo: ${reason}`,
            ephemeral: false
        });
    } catch (error) {
        await interaction.reply({
            content: '❌ Erro ao expulsar o usuário!',
            ephemeral: true
        });
    }
}

async function banUser(interaction) {
    const user = interaction.options.getUser('usuario');
    const reason = interaction.options.getString('motivo') || 'Sem motivo fornecido';
    
    const member = await interaction.guild.members.fetch(user.id);
    
    if (!member.bannable) {
        return interaction.reply({ 
            content: '❌ Não posso banir este usuário!', 
            ephemeral: true 
        });
    }
    
    try {
        await member.ban({ reason });
        await interaction.reply({
            content: `✅ ${user.tag} foi banido!\n📝 Motivo: ${reason}`,
            ephemeral: false
        });
    } catch (error) {
        await interaction.reply({
            content: '❌ Erro ao banir o usuário!',
            ephemeral: true
        });
    }
}

async function muteUser(interaction) {
    const user = interaction.options.getUser('usuario');
    const time = interaction.options.getInteger('tempo');
    const reason = interaction.options.getString('motivo') || 'Sem motivo fornecido';
    
    const member = await interaction.guild.members.fetch(user.id);
    const muteRole = interaction.guild.roles.cache.find(role => role.name === 'Muted');
    
    if (!muteRole) {
        // Criar cargo de mute se não existir
        try {
            const newRole = await interaction.guild.roles.create({
                name: 'Muted',
                color: '#808080',
                permissions: []
            });
            
            // Negar permissão de falar em todos os canais
            interaction.guild.channels.cache.forEach(async channel => {
                await channel.permissionOverwrites.create(newRole, {
                    SendMessages: false,
                    AddReactions: false,
                    Speak: false
                });
            });
        } catch (error) {
            return interaction.reply({ 
                content: '❌ Erro ao criar cargo de mute!', 
                ephemeral: true 
            });
        }
    }
    
    try {
        await member.roles.add(muteRole);
        await interaction.reply({
            content: `✅ ${user.tag} foi mutado por ${time} minutos!\n📝 Motivo: ${reason}`,
            ephemeral: false
        });
        
        // Remover mute após o tempo
        setTimeout(async () => {
            try {
                await member.roles.remove(muteRole);
            } catch (error) {
                console.error('Erro ao remover mute:', error);
            }
        }, time * 60 * 1000);
    } catch (error) {
        await interaction.reply({
            content: '❌ Erro ao mutar o usuário!',
            ephemeral: true
        });
    }
}