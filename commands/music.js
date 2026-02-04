const { SlashCommandBuilder, EmbedBuilder } = require('@discordjs/builders');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, entersState, AudioPlayerStatus, VoiceConnectionStatus } = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const yts = require('yt-search');

// Fila de músicas por servidor
const queues = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('musica')
    .setDescription('Comandos de música')
    .addSubcommand(subcommand =>
      subcommand
        .setName('tocar')
        .setDescription('Toca uma música do YouTube')
        .addStringOption(option =>
          option.setName('musica')
            .setDescription('Nome ou URL da música')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('pular')
        .setDescription('Pula a música atual')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('fila')
        .setDescription('Mostra a fila de músicas')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('parar')
        .setDescription('Para a música e limpa a fila')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('pausar')
        .setDescription('Pausa a música atual')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('continuar')
        .setDescription('Continua a música pausada')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('volume')
        .setDescription('Ajusta o volume (1-10)')
        .addIntegerOption(option =>
          option.setName('nivel')
            .setDescription('Nível do volume (1-10)')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(10)
        )
    ),
  
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    
    if (!interaction.member.voice.channel) {
      return interaction.reply({ 
        content: '❌ Você precisa estar em um canal de voz!', 
        ephemeral: true 
      });
    }
    
    switch(subcommand) {
      case 'tocar':
        await playMusic(interaction);
        break;
      case 'pular':
        await skipMusic(interaction);
        break;
      case 'fila':
        await showQueue(interaction);
        break;
      case 'parar':
        await stopMusic(interaction);
        break;
      case 'pausar':
        await pauseMusic(interaction);
        break;
      case 'continuar':
        await resumeMusic(interaction);
        break;
      case 'volume':
        await volumeMusic(interaction);
        break;
    }
  }
};

// Comandos com prefixo !!
module.exports.prefixCommands = {
  'musica tocar': async (message, args) => {
    if (!message.member.voice.channel) {
      return message.reply('❌ Entre em um canal de voz primeiro!');
    }
    
    if (args.length === 0) {
      return message.reply('❌ Diga o nome ou URL da música!');
    }
    
    const query = args.join(' ');
    const guildId = message.guild.id;
    
    // Inicializar fila se não existir
    if (!queues.has(guildId)) {
      queues.set(guildId, {
        songs: [],
        connection: null,
        player: null,
        volume: 5,
        textChannel: message.channel
      });
    }
    
    const queue = queues.get(guildId);
    queue.textChannel = message.channel;
    
    try {
      let songInfo;
      
      // Verificar se é URL do YouTube
      if (ytdl.validateURL(query)) {
        songInfo = await ytdl.getInfo(query);
      } else {
        // Buscar por nome
        const searchResult = await yts(query);
        if (searchResult.videos.length === 0) {
          return message.reply('❌ Nenhum resultado encontrado!');
        }
        songInfo = await ytdl.getInfo(searchResult.videos[0].url);
      }
      
      const song = {
        title: songInfo.videoDetails.title,
        url: songInfo.videoDetails.video_url,
        duration: parseInt(songInfo.videoDetails.lengthSeconds),
        requestedBy: message.author.id
      };
      
      queue.songs.push(song);
      
      // Conectar ao canal de voz se não estiver conectado
      if (!queue.connection) {
        const connection = joinVoiceChannel({
          channelId: message.member.voice.channel.id,
          guildId: guildId,
          adapterCreator: message.guild.voiceAdapterCreator,
        });
        
        queue.connection = connection;
        queue.player = createAudioPlayer();
        
        connection.subscribe(queue.player);
        
        // Eventos do player
        queue.player.on(AudioPlayerStatus.Idle, () => {
          queue.songs.shift();
          if (queue.songs.length > 0) {
            playSong(guildId, queue.songs[0]);
          } else {
            setTimeout(() => {
              if (queue.player && queue.player.state.status === AudioPlayerStatus.Idle) {
                queue.connection.destroy();
                queues.delete(guildId);
              }
            }, 30000);
          }
        });
        
        queue.player.on('error', error => {
          console.error('Erro no player:', error);
          if (queue.textChannel) {
            queue.textChannel.send('❌ Erro ao reproduzir música. Pulando...').catch(() => {});
          }
          queue.songs.shift();
          if (queue.songs.length > 0) {
            playSong(guildId, queue.songs[0]);
          }
        });
      }
      
      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('✅ Adicionada à fila')
        .setDescription(`**${song.title}**`)
        .addFields(
          { name: '⏰ Duração', value: `${Math.floor(song.duration / 60)}:${(song.duration % 60).toString().padStart(2, '0')}`, inline: true },
          { name: '👤 Solicitado por', value: `<@${song.requestedBy}>`, inline: true },
          { name: '📊 Posição na fila', value: `${queue.songs.length}`, inline: true }
        );
      
      await message.reply({ embeds: [embed] });
      
      // Tocar música se for a primeira
      if (queue.songs.length === 1) {
        playSong(guildId, song);
      }
    } catch (error) {
      console.error(error);
      await message.reply('❌ Erro ao tocar música!');
    }
  },
  
  'musica pular': async (message) => {
    if (!message.member.voice.channel) {
      return message.reply('❌ Entre em um canal de voz primeiro!');
    }
    
    const guildId = message.guild.id;
    const queue = queues.get(guildId);
    
    if (!queue || queue.songs.length === 0) {
      return message.reply('❌ Não há músicas na fila!');
    }
    
    queue.player.stop();
    await message.reply('✅ Música pulada!');
  },
  
  'musica fila': async (message) => {
    const guildId = message.guild.id;
    const queue = queues.get(guildId);
    
    if (!queue || queue.songs.length === 0) {
      return message.reply('❌ A fila está vazia!');
    }
    
    const songsList = queue.songs.slice(0, 10).map((song, index) => 
      `**${index + 1}.** ${song.title} (${Math.floor(song.duration / 60)}:${(song.duration % 60).toString().padStart(2, '0')})`
    ).join('\n');
    
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🎵 Fila de Músicas')
      .setDescription(songsList)
      .addFields({
        name: '📊 Informações',
        value: `Total: ${queue.songs.length} música(s)\nVolume: ${queue.volume}/10\nAtual: ${queue.songs[0].title.substring(0, 50)}...`
      });
    
    await message.reply({ embeds: [embed] });
  },
  
  'musica parar': async (message) => {
    if (!message.member.voice.channel) {
      return message.reply('❌ Entre em um canal de voz primeiro!');
    }
    
    const guildId = message.guild.id;
    const queue = queues.get(guildId);
    
    if (!queue) {
      return message.reply('❌ Não há música tocando!');
    }
    
    queue.songs = [];
    queue.player.stop();
    
    if (queue.connection) {
      queue.connection.destroy();
    }
    
    queues.delete(guildId);
    await message.reply('✅ Música parada e fila limpa!');
  },
  
  'musica pausar': async (message) => {
    if (!message.member.voice.channel) {
      return message.reply('❌ Entre em um canal de voz primeiro!');
    }
    
    const guildId = message.guild.id;
    const queue = queues.get(guildId);
    
    if (!queue || !queue.player) {
      return message.reply('❌ Não há música tocando!');
    }
    
    if (queue.player.state.status === AudioPlayerStatus.Paused) {
      return message.reply('❌ A música já está pausada!');
    }
    
    queue.player.pause();
    await message.reply('⏸️ Música pausada!');
  },
  
  'musica continuar': async (message) => {
    if (!message.member.voice.channel) {
      return message.reply('❌ Entre em um canal de voz primeiro!');
    }
    
    const guildId = message.guild.id;
    const queue = queues.get(guildId);
    
    if (!queue || !queue.player) {
      return message.reply('❌ Não há música tocando!');
    }
    
    if (queue.player.state.status !== AudioPlayerStatus.Paused) {
      return message.reply('❌ A música não está pausada!');
    }
    
    queue.player.unpause();
    await message.reply('▶️ Música continuando!');
  },
  
  'musica volume': async (message, args) => {
    if (!message.member.voice.channel) {
      return message.reply('❌ Entre em um canal de voz primeiro!');
    }
    
    const volume = parseInt(args[0]);
    if (!volume || volume < 1 || volume > 10) {
      return message.reply('❌ Especifique um volume entre 1 e 10!');
    }
    
    const guildId = message.guild.id;
    const queue = queues.get(guildId);
    
    if (!queue || !queue.player) {
      return message.reply('❌ Não há música tocando!');
    }
    
    queue.volume = volume;
    
    if (queue.player.state.resource) {
      queue.player.state.resource.volume.setVolume(volume / 10);
    }
    
    await message.reply(`🔊 Volume ajustado para ${volume}/10`);
  }
};

// Funções auxiliares
function playSong(guildId, song) {
  const queue = queues.get(guildId);
  
  if (!song) return;
  
  try {
    const stream = ytdl(song.url, { 
      filter: 'audioonly',
      quality: 'highestaudio',
      highWaterMark: 1 << 25 
    });
    
    const resource = createAudioResource(stream, {
      inputType: StreamType.Arbitrary,
      inlineVolume: true
    });
    
    resource.volume.setVolume(queue.volume / 10);
    queue.player.play(resource);
    
    // Enviar mensagem de início
    if (queue.textChannel) {
      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('🎵 Tocando Agora')
        .setDescription(`**${song.title}**`)
        .addFields(
          { name: '⏰ Duração', value: `${Math.floor(song.duration / 60)}:${(song.duration % 60).toString().padStart(2, '0')}`, inline: true },
          { name: '👤 Solicitado por', value: `<@${song.requestedBy}>`, inline: true }
        );
      
      queue.textChannel.send({ embeds: [embed] }).catch(() => {});
    }
  } catch (error) {
    console.error('Erro ao reproduzir:', error);
    if (queue.textChannel) {
      queue.textChannel.send('❌ Erro ao reproduzir música. Pulando...').catch(() => {});
    }
    queue.songs.shift();
    if (queue.songs.length > 0) {
      playSong(guildId, queue.songs[0]);
    }
  }
}

// Funções para slash commands
async function playMusic(interaction) {
  if (!interaction.member.voice.channel) {
    return interaction.reply({ content: '❌ Entre em um canal de voz primeiro!', ephemeral: true });
  }
  
  const query = interaction.options.getString('musica');
  const guildId = interaction.guild.id;
  
  if (!queues.has(guildId)) {
    queues.set(guildId, {
      songs: [],
      connection: null,
      player: null,
      volume: 5,
      textChannel: interaction.channel
    });
  }
  
  const queue = queues.get(guildId);
  queue.textChannel = interaction.channel;
  
  try {
    await interaction.deferReply();
    
    let songInfo;
    
    if (ytdl.validateURL(query)) {
      songInfo = await ytdl.getInfo(query);
    } else {
      const searchResult = await yts(query);
      if (searchResult.videos.length === 0) {
        return interaction.editReply('❌ Nenhum resultado encontrado!');
      }
      songInfo = await ytdl.getInfo(searchResult.videos[0].url);
    }
    
    const song = {
      title: songInfo.videoDetails.title,
      url: songInfo.videoDetails.video_url,
      duration: parseInt(songInfo.videoDetails.lengthSeconds),
      requestedBy: interaction.user.id
    };
    
    queue.songs.push(song);
    
    if (!queue.connection) {
      const connection = joinVoiceChannel({
        channelId: interaction.member.voice.channel.id,
        guildId: guildId,
        adapterCreator: interaction.guild.voiceAdapterCreator,
      });
      
      queue.connection = connection;
      queue.player = createAudioPlayer();
      
      connection.subscribe(queue.player);
      
      queue.player.on(AudioPlayerStatus.Idle, () => {
        queue.songs.shift();
        if (queue.songs.length > 0) {
          playSong(guildId, queue.songs[0]);
        } else {
          setTimeout(() => {
            if (queue.player && queue.player.state.status === AudioPlayerStatus.Idle) {
              queue.connection.destroy();
              queues.delete(guildId);
            }
          }, 30000);
        }
      });
    }
    
    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('✅ Adicionada à fila')
      .setDescription(`**${song.title}**`)
      .addFields(
        { name: '⏰ Duração', value: `${Math.floor(song.duration / 60)}:${(song.duration % 60).toString().padStart(2, '0')}`, inline: true },
        { name: '👤 Solicitado por', value: `<@${song.requestedBy}>`, inline: true },
        { name: '📊 Posição na fila', value: `${queue.songs.length}`, inline: true }
      );
    
    await interaction.editReply({ embeds: [embed] });
    
    if (queue.songs.length === 1) {
      playSong(guildId, song);
    }
  } catch (error) {
    console.error(error);
    await interaction.editReply('❌ Erro ao tocar música!');
  }
}

async function skipMusic(interaction) {
  const guildId = interaction.guild.id;
  const queue = queues.get(guildId);
  
  if (!queue || queue.songs.length === 0) {
    return interaction.reply({ content: '❌ Não há músicas na fila!', ephemeral: true });
  }
  
  queue.player.stop();
  await interaction.reply('✅ Música pulada!');
}

async function showQueue(interaction) {
  const guildId = interaction.guild.id;
  const queue = queues.get(guildId);
  
  if (!queue || queue.songs.length === 0) {
    return interaction.reply({ content: '❌ A fila está vazia!', ephemeral: false });
  }
  
  const songsList = queue.songs.slice(0, 10).map((song, index) => 
    `**${index + 1}.** ${song.title} (${Math.floor(song.duration / 60)}:${(song.duration % 60).toString().padStart(2, '0')})`
  ).join('\n');
  
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('🎵 Fila de Músicas')
    .setDescription(songsList)
    .addFields({
      name: '📊 Informações',
      value: `Total: ${queue.songs.length} música(s)\nVolume: ${queue.volume}/10`
    });
  
  await interaction.reply({ embeds: [embed] });
}

async function stopMusic(interaction) {
  const guildId = interaction.guild.id;
  const queue = queues.get(guildId);
  
  if (!queue) {
    return interaction.reply({ content: '❌ Não há música tocando!', ephemeral: true });
  }
  
  queue.songs = [];
  queue.player.stop();
  
  if (queue.connection) {
    queue.connection.destroy();
  }
  
  queues.delete(guildId);
  await interaction.reply('✅ Música parada e fila limpa!');
}

async function pauseMusic(interaction) {
  const guildId = interaction.guild.id;
  const queue = queues.get(guildId);
  
  if (!queue || !queue.player) {
    return interaction.reply({ content: '❌ Não há música tocando!', ephemeral: true });
  }
  
  if (queue.player.state.status === AudioPlayerStatus.Paused) {
    return interaction.reply({ content: '❌ A música já está pausada!', ephemeral: true });
  }
  
  queue.player.pause();
  await interaction.reply('⏸️ Música pausada!');
}

async function resumeMusic(interaction) {
  const guildId = interaction.guild.id;
  const queue = queues.get(guildId);
  
  if (!queue || !queue.player) {
    return interaction.reply({ content: '❌ Não há música tocando!', ephemeral: true });
  }
  
  if (queue.player.state.status !== AudioPlayerStatus.Paused) {
    return interaction.reply({ content: '❌ A música não está pausada!', ephemeral: true });
  }
  
  queue.player.unpause();
  await interaction.reply('▶️ Música continuando!');
}

async function volumeMusic(interaction) {
  const volume = interaction.options.getInteger('nivel');
  const guildId = interaction.guild.id;
  const queue = queues.get(guildId);
  
  if (!queue || !queue.player) {
    return interaction.reply({ content: '❌ Não há música tocando!', ephemeral: true });
  }
  
  queue.volume = volume;
  
  if (queue.player.state.resource) {
    queue.player.state.resource.volume.setVolume(volume / 10);
  }
  
  await interaction.reply(`🔊 Volume ajustado para ${volume}/10`);
}