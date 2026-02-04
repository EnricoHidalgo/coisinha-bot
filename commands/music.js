const { SlashCommandBuilder, EmbedBuilder } = require('@discordjs/builders');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const play = require('play-dl');

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
        await playMusicSlash(interaction);
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

// ==================== COMANDOS COM PREFIXO !! ====================
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
        textChannel: message.channel,
        isPlaying: false
      });
    }
    
    const queue = queues.get(guildId);
    queue.textChannel = message.channel;
    
    try {
      const msg = await message.reply('🔍 Procurando música...');
      
      let songInfo;
      let isUrl = false;
      
      // Verificar se é URL
      try {
        const urlType = play.yt_validate(query);
        isUrl = urlType === 'video' || urlType === 'playlist';
      } catch (error) {
        isUrl = false;
      }
      
      if (isUrl) {
        // É URL
        songInfo = await play.video_info(query);
      } else {
        // É busca por texto
        const searchResults = await play.search(query, { limit: 1 });
        if (searchResults.length === 0) {
          await msg.edit('❌ Nenhum resultado encontrado!');
          return;
        }
        songInfo = await play.video_info(searchResults[0].url);
      }
      
      const videoDetails = songInfo.video_details;
      const song = {
        title: videoDetails.title,
        url: videoDetails.url,
        duration: videoDetails.durationInSec,
        thumbnail: videoDetails.thumbnails[0]?.url,
        requestedBy: message.author.id,
        channel: videoDetails.channel?.name || 'Desconhecido'
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
            queue.isPlaying = false;
            // Desconectar após 5 minutos de inatividade
            setTimeout(() => {
              if (!queue.isPlaying && queue.connection) {
                queue.connection.destroy();
                queues.delete(guildId);
              }
            }, 5 * 60 * 1000); // 5 minutos
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
        .setDescription(`[${song.title}](${song.url})`)
        .addFields(
          { name: '⏰ Duração', value: formatDuration(song.duration), inline: true },
          { name: '🎙️ Canal', value: song.channel, inline: true },
          { name: '👤 Solicitado por', value: `<@${song.requestedBy}>`, inline: true },
          { name: '📊 Posição', value: `#${queue.songs.length}`, inline: true }
        )
        .setThumbnail(song.thumbnail)
        .setFooter({ text: 'Use !!musica fila para ver todas as músicas' });
      
      await msg.edit({ content: null, embeds: [embed] });
      
      // Tocar música se for a primeira
      if (queue.songs.length === 1) {
        await playSong(guildId, song);
      }
    } catch (error) {
      console.error('Erro no comando de música:', error);
      await message.reply('❌ Erro ao tocar música! Tente novamente ou use outro comando.');
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
      `**${index + 1}.** [${song.title.substring(0, 50)}](${song.url}) (${formatDuration(song.duration)})`
    ).join('\n');
    
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🎵 Fila de Músicas')
      .setDescription(songsList)
      .addFields({
        name: '📊 Informações',
        value: `**Total:** ${queue.songs.length} música(s)\n**Volume:** ${queue.volume}/10\n**Tocando agora:** ${queue.songs[0]?.title?.substring(0, 50) || 'Nenhuma'}`
      });
    
    if (queue.songs[0]?.thumbnail) {
      embed.setThumbnail(queue.songs[0].thumbnail);
    }
    
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
    if (queue.player) {
      queue.player.stop();
    }
    
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

// ==================== FUNÇÕES AUXILIARES ====================
async function playSong(guildId, song) {
  const queue = queues.get(guildId);
  
  if (!song) return;
  
  try {
    queue.isPlaying = true;
    
    // Usar play-dl para streaming
    const stream = await play.stream(song.url, {
      quality: 2, // 0 = lowest, 2 = highest audio
      discordPlayerCompatibility: true
    });
    
    const resource = createAudioResource(stream.stream, {
      inputType: stream.type,
      inlineVolume: true
    });
    
    resource.volume.setVolume(queue.volume / 10);
    queue.player.play(resource);
    
    // Enviar mensagem de início
    if (queue.textChannel) {
      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('🎵 Tocando Agora')
        .setDescription(`[${song.title}](${song.url})`)
        .addFields(
          { name: '⏰ Duração', value: formatDuration(song.duration), inline: true },
          { name: '🎙️ Canal', value: song.channel, inline: true },
          { name: '👤 Solicitado por', value: `<@${song.requestedBy}>`, inline: true }
        )
        .setThumbnail(song.thumbnail)
        .setFooter({ text: 'Use !!musica pular para pular esta música' });
      
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

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// ==================== FUNÇÕES PARA SLASH COMMANDS ====================
async function playMusicSlash(interaction) {
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
      textChannel: interaction.channel,
      isPlaying: false
    });
  }
  
  const queue = queues.get(guildId);
  queue.textChannel = interaction.channel;
  
  try {
    await interaction.deferReply();
    
    let songInfo;
    let isUrl = false;
    
    // Verificar se é URL
    try {
      const urlType = play.yt_validate(query);
      isUrl = urlType === 'video' || urlType === 'playlist';
    } catch (error) {
      isUrl = false;
    }
    
    if (isUrl) {
      songInfo = await play.video_info(query);
    } else {
      const searchResults = await play.search(query, { limit: 1 });
      if (searchResults.length === 0) {
        return interaction.editReply('❌ Nenhum resultado encontrado!');
      }
      songInfo = await play.video_info(searchResults[0].url);
    }
    
    const videoDetails = songInfo.video_details;
    const song = {
      title: videoDetails.title,
      url: videoDetails.url,
      duration: videoDetails.durationInSec,
      thumbnail: videoDetails.thumbnails[0]?.url,
      requestedBy: interaction.user.id,
      channel: videoDetails.channel?.name || 'Desconhecido'
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
          queue.isPlaying = false;
          setTimeout(() => {
            if (!queue.isPlaying && queue.connection) {
              queue.connection.destroy();
              queues.delete(guildId);
            }
          }, 5 * 60 * 1000);
        }
      });
    }
    
    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('✅ Adicionada à fila')
      .setDescription(`[${song.title}](${song.url})`)
      .addFields(
        { name: '⏰ Duração', value: formatDuration(song.duration), inline: true },
        { name: '🎙️ Canal', value: song.channel, inline: true },
        { name: '👤 Solicitado por', value: `<@${song.requestedBy}>`, inline: true },
        { name: '📊 Posição', value: `#${queue.songs.length}`, inline: true }
      )
      .setThumbnail(song.thumbnail)
      .setFooter({ text: 'Use /musica fila para ver todas as músicas' });
    
    await interaction.editReply({ embeds: [embed] });
    
    if (queue.songs.length === 1) {
      await playSong(guildId, song);
    }
  } catch (error) {
    console.error('Erro no comando de música:', error);
    await interaction.editReply('❌ Erro ao tocar música! Tente novamente.');
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
    `**${index + 1}.** [${song.title.substring(0, 50)}](${song.url}) (${formatDuration(song.duration)})`
  ).join('\n');
  
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('🎵 Fila de Músicas')
    .setDescription(songsList)
    .addFields({
      name: '📊 Informações',
      value: `**Total:** ${queue.songs.length} música(s)\n**Volume:** ${queue.volume}/10`
    });
  
  if (queue.songs[0]?.thumbnail) {
    embed.setThumbnail(queue.songs[0].thumbnail);
  }
  
  await interaction.reply({ embeds: [embed] });
}

async function stopMusic(interaction) {
  const guildId = interaction.guild.id;
  const queue = queues.get(guildId);
  
  if (!queue) {
    return interaction.reply({ content: '❌ Não há música tocando!', ephemeral: true });
  }
  
  queue.songs = [];
  if (queue.player) {
    queue.player.stop();
  }
  
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