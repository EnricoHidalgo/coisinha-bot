const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus
} = require('@discordjs/voice');

const play = require('play-dl');

const players = new Map();

async function playMusic(interactionOrMessage, query) {
  const member = interactionOrMessage.member;
  const channel = member.voice.channel;

  if (!channel) {
    throw new Error('Você precisa estar em um canal de voz.');
  }

  const stream = await play.stream(query, { quality: 2 });
  const resource = createAudioResource(stream.stream, {
    inputType: stream.type
  });

  let data = players.get(channel.guild.id);

  if (!data) {
    const player = createAudioPlayer();
    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator
    });

    connection.subscribe(player);
    data = { player, connection };
    players.set(channel.guild.id, data);
  }

  data.player.play(resource);

  return true;
}

module.exports = { playMusic };
