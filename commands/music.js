const { SlashCommandBuilder } = require('@discordjs/builders');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, entersState, StreamType, AudioPlayerStatus, VoiceConnectionStatus } = require('@discordjs/voice');
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
        }
    }
};

async function playMusic(interaction) {
    await interaction.deferReply();
    
    const query = interaction.options.getString('musica');
    const voiceChannel = interaction.member.voice.channel;
    const guildId = interaction.guild.id;
    
    // Inicializar fila se não existir
    if (!queues.has(guildId)) {
        queues.set(guildId, {
            songs: [],
            connection: null,
            player: null,
            volume: 5
        });
    }
    
    const queue = queues.get(guildId);
    
    let songInfo;
    
    try {
        // Verificar se é URL do YouTube
        if (ytdl.validateURL(query)) {
            songInfo = await ytdl.getInfo(query);
        } else {
            // Buscar por nome
            const searchResult = await yts(query);
            if (searchResult.videos.length === 0) {
                return interaction.editReply('❌ Nenhum resultado encontrado!');
            }
            songInfo = await ytdl.getInfo(searchResult.videos[0].url);
        }
        
        const song = {
            title: songInfo.videoDetails.title,
            url: songInfo.videoDetails.video_url,
            duration: songInfo.videoDetails.lengthSeconds,
            requestedBy: interaction.user.id
        };
        
        queue.songs.push(song);
        
        // Conectar ao canal de voz se não estiver conectado
        if (!queue.connection) {
            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: guildId,
                adapterCreator: interaction.guild.voiceAdapterCreator,
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
                        if (queue.player.state.status === AudioPlayerStatus.Idle) {
                            queue.connection.destroy();
                            queues.delete(guildId);
                        }
                    }, 30000); // Desconectar após 30 segundos
                }
            });
            
            queue.player.on('error', error => {
                console.error('Erro no player:', error);
                queue.songs.shift();
                if (queue.songs.length > 0) {
                    playSong(guildId, queue.songs[0]);
                }
            });
        }
        
        await interaction.editReply(`✅ **${song.title}** adicionada à fila!`);
        
        // Tocar música se for a primeira
        if (queue.songs.length === 1) {
            playSong(guildId, song);
        }
    } catch (error) {
        console.error(error);
        await interaction.editReply('❌ Erro ao tocar música!');
    }
}

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
    } catch (error) {
        console.error('Erro ao reproduzir:', error);
        queue.songs.shift();
        if (queue.songs.length > 0) {
            playSong(guildId, queue.songs[0]);
        }
    }
}

async function skipMusic(interaction) {
    const guildId = interaction.guild.id;
    const queue = queues.get(guildId);
    
    if (!queue || queue.songs.length === 0) {
        return interaction.reply({ 
            content: '❌ Não há músicas na fila!', 
            ephemeral: true 
        });
    }
    
    queue.player.stop();
    await interaction.reply('✅ Música pulada!');
}

async function showQueue(interaction) {
    const guildId = interaction.guild.id;
    const queue = queues.get(guildId);
    
    if (!queue || queue.songs.length === 0) {
        return interaction.reply({ 
            content: '❌ A fila está vazia!', 
            ephemeral: false 
        });
    }
    
    const songsList = queue.songs.slice(0, 10).map((song, index) => 
        `**${index + 1}.** ${song.title} (${Math.floor(song.duration / 60)}:${(song.duration % 60).toString().padStart(2, '0')})`
    ).join('\n');
    
    await interaction.reply({
        content: `🎵 **Fila de Músicas**\n${songsList}\n\nTotal: ${queue.songs.length} música(s)`,
        ephemeral: false
    });
}

async function stopMusic(interaction) {
    const guildId = interaction.guild.id;
    const queue = queues.get(guildId);
    
    if (!queue) {
        return interaction.reply({ 
            content: '❌ Não há música tocando!', 
            ephemeral: true 
        });
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
        return interaction.reply({ 
            content: '❌ Não há música tocando!', 
            ephemeral: true 
        });
    }
    
    if (queue.player.state.status === AudioPlayerStatus.Paused) {
        return interaction.reply({ 
            content: '❌ A música já está pausada!', 
            ephemeral: true 
        });
    }
    
    queue.player.pause();
    await interaction.reply('⏸️ Música pausada!');
}

async function resumeMusic(interaction) {
    const guildId = interaction.guild.id;
    const queue = queues.get(guildId);
    
    if (!queue || !queue.player) {
        return interaction.reply({ 
            content: '❌ Não há música tocando!', 
            ephemeral: true 
        });
    }
    
    if (queue.player.state.status !== AudioPlayerStatus.Paused) {
        return interaction.reply({ 
            content: '❌ A música não está pausada!', 
            ephemeral: true 
        });
    }
    
    queue.player.unpause();
    await interaction.reply('▶️ Música continuando!');
}