const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { playMusic } = require('../utils/player');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('musica')
    .setDescription('Comandos de música')
    .addSubcommand(sub =>
      sub
        .setName('tocar')
        .setDescription('Toca uma música')
        .addStringOption(opt =>
          opt.setName('musica')
            .setDescription('Nome ou link')
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const query = interaction.options.getString('musica');

    try {
      await playMusic(interaction, query);

      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setDescription(`🎶 Tocando: **${query}**`);

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      await interaction.reply({
        content: `❌ ${err.message}`,
        ephemeral: true
      });
    }
  },

  prefixCommands: {
    'musica tocar': async (message, args) => {
      const query = args.join(' ');
      if (!query) return message.reply('❌ Informe o nome da música.');

      try {
        await playMusic(message, query);
        await message.reply(`🎶 Tocando: **${query}**`);
      } catch (err) {
        message.reply(`❌ ${err.message}`);
      }
    }
  }
};
