// Adicione no início do index.js
const database = require('./database.js');

// Na função ready
client.once('ready', async () => {
    console.log(`✅ ${client.user.tag} está online!`);
    await database.connect();
    // resto do código...
});

const { Client, IntentsBitField, Collection } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const fs = require('fs');
require('dotenv').config();

const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
        IntentsBitField.Flags.GuildVoiceStates,
        IntentsBitField.Flags.GuildMembers
    ]
});

client.commands = new Collection();

// Carregar comandos
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
const commands = [];

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
    commands.push(command.data.toJSON());
}

client.once('ready', () => {
    console.log(`✅ ${client.user.tag} está online!`);
    
    // Registrar comandos slash
    const rest = new REST({ version: '9' }).setToken(process.env.TOKEN);
    
    (async () => {
        try {
            await rest.put(
                Routes.applicationCommands(client.user.id),
                { body: commands }
            );
            console.log('✅ Comandos slash registrados!');
        } catch (error) {
            console.error(error);
        }
    })();
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({ 
            content: 'Houve um erro ao executar esse comando!', 
            ephemeral: true 
        });
    }
});

// Comandos com prefixo !!
client.on('messageCreate', async message => {
    if (message.author.bot) return;
    
    // Comandos com prefixo !!
    if (message.content.startsWith('!!')) {
        const args = message.content.slice(2).trim().split(/ +/);
        const command = args.shift().toLowerCase();
        
        // Aqui vamos adicionar os comandos com prefixo depois
        console.log(`Comando: ${command}`, args);
    }
});

client.login(process.env.TOKEN);