const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('diversao')
    .setDescription('Comandos divertidos')
    .addSubcommand(subcommand =>
      subcommand
        .setName('piada')
        .setDescription('Conta uma piada aleatória')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('8ball')
        .setDescription('Pergunte à bola mágica 8')
        .addStringOption(option =>
          option.setName('pergunta')
            .setDescription('Sua pergunta')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('meme')
        .setDescription('Mostra um meme aleatório')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('ship')
        .setDescription('Ship dois usuários')
        .addUserOption(option =>
          option.setName('usuario1')
            .setDescription('Primeiro usuário')
            .setRequired(true)
        )
        .addUserOption(option =>
          option.setName('usuario2')
            .setDescription('Segundo usuário')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('fato')
        .setDescription('Fato curioso aleatório')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('animal')
        .setDescription('Foto fofa de animal')
        .addStringOption(option =>
          option.setName('tipo')
            .setDescription('Tipo de animal')
            .setRequired(false)
            .addChoices(
              { name: '🐕 Cachorro', value: 'dog' },
              { name: '🐈 Gato', value: 'cat' },
              { name: '🦊 Raposa', value: 'fox' },
              { name: '🐦 Pássaro', value: 'bird' },
              { name: '🐼 Panda', value: 'panda' }
            )
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    
    switch(subcommand) {
      case 'piada':
        await piadaCommand(interaction);
        break;
      case '8ball':
        await eightBallCommand(interaction);
        break;
      case 'meme':
        await memeCommand(interaction);
        break;
      case 'ship':
        await shipCommand(interaction);
        break;
      case 'fato':
        await fatoCommand(interaction);
        break;
      case 'animal':
        await animalCommand(interaction);
        break;
    }
  }
};

// Comandos com prefixo !!
module.exports.prefixCommands = {
  piada: async (message) => {
    const piadas = [
      { pergunta: "Por que o Python não se relaciona com a SQL?", resposta: "Porque ele não consegue se COMMIT." },
      { pergunta: "O que o commit disse para o branch?", resposta: "Vamos nos merge!" },
      { pergunta: "Por que o computador foi ao médico?", resposta: "Porque tinha um vírus!" },
      { pergunta: "Qual é o café preferido do desenvolvedor?", resposta: "Java!" },
      { pergunta: "Por que o JavaScript foi para a terapia?", resposta: "Porque tinha problemas de undefined." },
      { pergunta: "O que o HTML disse para o CSS?", resposta: "Você me completa!" },
      { pergunta: "Por que o bot foi para a escola?", resposta: "Para aprender a responder!" },
      { pergunta: "Qual a bebida favorita do robot?", resposta: "Óleo!" },
      { pergunta: "Por que o Discord foi para a festa sozinho?", resposta: "Porque ele não tinha conexão!" },
      { pergunta: "O que o Discord disse para o bot?", resposta: "Você me completa!" }
    ];
    
    const piada = piadas[Math.floor(Math.random() * piadas.length)];
    const embed = new EmbedBuilder()
      .setColor(0xFFA500)
      .setTitle('😂 Piada do Dia')
      .addFields(
        { name: '❓ Pergunta', value: piada.pergunta },
        { name: '💡 Resposta', value: piada.resposta }
      );
    
    await message.reply({ embeds: [embed] });
  },
  
  '8ball': async (message, args) => {
    if (args.length === 0) {
      return message.reply('❌ Faça uma pergunta! Ex: `!!8ball Vou ganhar na loteria?`');
    }
    
    const respostas = [
      '🎱 Sim, definitivamente!',
      '🎱 Sem dúvida!',
      '🎱 Com certeza!',
      '🎱 Você pode contar com isso!',
      '🎱 Parece bem!',
      '🎱 Muito provavelmente!',
      '🎱 Sim!',
      '🎱 Os sinais apontam que sim!',
      '🎱 Melhor não te dizer agora...',
      '🎱 Não posso prever agora...',
      '🎱 Concentre-se e pergunte novamente!',
      '🎱 Não conte com isso!',
      '🎱 Minha resposta é não!',
      '🎱 Minhas fontes dizem não!',
      '🎱 Não parece bom!',
      '🎱 Muito duvidoso!'
    ];
    
    const resposta = respostas[Math.floor(Math.random() * respostas.length)];
    const pergunta = args.join(' ');
    
    const embed = new EmbedBuilder()
      .setColor(0x000000)
      .setTitle('🎱 Bola 8 Mágica')
      .addFields(
        { name: '❓ Pergunta', value: pergunta },
        { name: '💭 Resposta', value: resposta }
      )
      .setThumbnail('https://emojicdn.elk.sh/🎱');
    
    await message.reply({ embeds: [embed] });
  },
  
  memes: async (message) => {
    try {
      await message.reply('🔄 Buscando meme...');
      
      // Usar API de memes
      const response = await fetch('https://meme-api.com/gimme');
      const data = await response.json();
      
      const embed = new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle(data.title)
        .setImage(data.url)
        .setFooter({ text: `Subreddit: r/${data.subreddit} | 👍 ${data.ups}` });
      
      await message.editReply({ content: '😂 Aqui está seu meme!', embeds: [embed] });
    } catch (error) {
      await message.editReply('❌ Erro ao buscar meme. Tente novamente!');
    }
  },
  
  ship: async (message, args) => {
    if (args.length < 2) {
      return message.reply('❌ Mencione dois usuários! Ex: `!!ship @user1 @user2`');
    }
    
    const user1 = message.mentions.users.first();
    const user2 = message.mentions.users.last();
    
    if (!user1 || !user2 || user1.id === user2.id) {
      return message.reply('❌ Mencione dois usuários diferentes!');
    }
    
    // Gerar porcentagem "aleatória" baseada nos IDs
    const shipPercent = (parseInt(user1.id + user2.id) % 100) + 1;
    
    let shipLevel = '';
    let emoji = '';
    
    if (shipPercent >= 90) {
      shipLevel = '💖 ALMA GÊMEA! 💖';
      emoji = '💕';
    } else if (shipPercent >= 70) {
      shipLevel = '😍 Muito compatível!';
      emoji = '❤️';
    } else if (shipPercent >= 50) {
      shipLevel = '😊 Compatível!';
      emoji = '💛';
    } else if (shipPercent >= 30) {
      shipLevel = '😐 Talvez...';
      emoji = '💚';
    } else {
      shipLevel = '😬 Melhor nem tentar...';
      emoji = '💔';
    }
    
    const shipName = user1.username.substring(0, 3) + user2.username.substring(user2.username.length - 3);
    
    const embed = new EmbedBuilder()
      .setColor(shipPercent >= 50 ? 0xFF69B4 : 0x808080)
      .setTitle('💘 Ship Calculator')
      .setDescription(`${user1.username} ${emoji} ${user2.username}`)
      .addFields(
        { name: '📊 Compatibilidade', value: `**${shipPercent}%**` },
        { name: '📈 Nível', value: shipLevel },
        { name: '🏷️ Ship Name', value: shipName }
      )
      .setThumbnail('https://emojicdn.elk.sh/💘');
    
    await message.reply({ embeds: [embed] });
  },
  
  fatos: async (message) => {
    const fatos = [
      '🐝 Uma abelha visita cerca de 7.000 flores por dia!',
      '🐙 Polvos têm três corações!',
      '🌳 Uma árvore grande pode fornecer oxigênio para 4 pessoas!',
      '🧠 Seu cérebro usa cerca de 20% do oxigênio do seu corpo!',
      '🐌 Caracóis podem dormir por até 3 anos!',
      '🐬 Golfinhos dão nomes uns aos outros!',
      '🍫 O chocolate era usado como moeda pelos astecas!',
      '🦒 A língua de uma girafa pode medir até 50 cm!',
      '🐼 Pandas passam 14 horas por dia comendo bambu!',
      '🦩 Flamingos nascem com penas brancas, ficam rosados devido à sua dieta!',
      '💻 O primeiro computador pesava mais de 27 toneladas!',
      '📱 90% dos dados do mundo foram criados nos últimos 2 anos!',
      '🌌 Existem mais estrelas no universo do que grãos de areia na Terra!',
      '🕷️ Algumas aranhas podem viver sem comida por até 2 anos!',
      '🐧 Pinguins propõem casamento presenteando uma pedra!'
    ];
    
    const fato = fatos[Math.floor(Math.random() * fatos.length)];
    const embed = new EmbedBuilder()
      .setColor(0x00BFFF)
      .setTitle('🧠 Fato Curioso')
      .setDescription(fato)
      .setFooter({ text: 'Sabia disso?' });
    
    await message.reply({ embeds: [embed] });
  },
  
  animais: async (message, args) => {
    const tipo = args[0]?.toLowerCase() || 'random';
    
    const apis = {
      dog: 'https://dog.ceo/api/breeds/image/random',
      cat: 'https://api.thecatapi.com/v1/images/search',
      fox: 'https://randomfox.ca/floof/',
      bird: 'https://some-random-api.com/img/bird',
      panda: 'https://some-random-api.com/img/panda'
    };
    
    try {
      await message.reply('🔄 Buscando animal fofo...');
      
      let url;
      if (apis[tipo]) {
        const response = await fetch(apis[tipo]);
        const data = await response.json();
        
        if (tipo === 'cat') url = data[0].url;
        else if (tipo === 'fox') url = data.image;
        else if (tipo === 'bird' || tipo === 'panda') url = data.link;
        else url = data.message; // dog
      } else {
        // Random animal
        const animals = Object.keys(apis);
        const randomAnimal = animals[Math.floor(Math.random() * animals.length)];
        return module.exports.prefixCommands.animais(message, [randomAnimal]);
      }
      
      const embed = new EmbedBuilder()
        .setColor(0xFFB6C1)
        .setTitle(`🐾 ${tipo.charAt(0).toUpperCase() + tipo.slice(1)} Fofo!`)
        .setImage(url)
        .setFooter({ text: 'Awwww! ❤️' });
      
      await message.editReply({ content: null, embeds: [embed] });
    } catch (error) {
      await message.editReply('❌ Erro ao buscar imagem. Tente: dog, cat, fox, bird, panda');
    }
  },
  
  dizer: async (message, args) => {
    if (args.length === 0) {
      return message.reply('❌ Diga algo para eu repetir!');
    }
    
    const texto = args.join(' ');
    
    // Deletar mensagem do usuário
    try {
      await message.delete();
    } catch (error) {
      console.log('Não pude deletar a mensagem');
    }
    
    // Enviar como o bot
    await message.channel.send(texto);
  }
};

// Funções para slash commands
async function piadaCommand(interaction) {
  await module.exports.prefixCommands.piada({ 
    reply: (content) => interaction.reply(content) 
  });
}

async function eightBallCommand(interaction) {
  const pergunta = interaction.options.getString('pergunta');
  await module.exports.prefixCommands['8ball']({ 
    reply: (content) => interaction.reply(content) 
  }, [pergunta]);
}

async function memeCommand(interaction) {
  await interaction.deferReply();
  await module.exports.prefixCommands.memes({ 
    reply: (content) => interaction.editReply(content) 
  });
}

async function shipCommand(interaction) {
  const user1 = interaction.options.getUser('usuario1');
  const user2 = interaction.options.getUser('usuario2');
  await module.exports.prefixCommands.ship({ 
    reply: (content) => interaction.reply(content) 
  }, [user1.id, user2.id]);
}

async function fatoCommand(interaction) {
  await module.exports.prefixCommands.fatos({ 
    reply: (content) => interaction.reply(content) 
  });
}

async function animalCommand(interaction) {
  const tipo = interaction.options.getString('tipo') || 'random';
  await interaction.deferReply();
  await module.exports.prefixCommands.animais({ 
    reply: (content) => interaction.editReply(content) 
  }, [tipo]);
}