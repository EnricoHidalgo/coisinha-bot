const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('utilidade')
    .setDescription('Comandos utilitários')
    .addSubcommand(subcommand =>
      subcommand
        .setName('clima')
        .setDescription('Previsão do tempo')
        .addStringOption(option =>
          option.setName('cidade')
            .setDescription('Nome da cidade')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('cotacao')
        .setDescription('Cotação de moedas')
        .addStringOption(option =>
          option.setName('de')
            .setDescription('Moeda de origem')
            .setRequired(true)
            .addChoices(
              { name: 'Real Brasileiro (BRL)', value: 'BRL' },
              { name: 'Dólar Americano (USD)', value: 'USD' },
              { name: 'Euro (EUR)', value: 'EUR' },
              { name: 'Libra Esterlina (GBP)', value: 'GBP' },
              { name: 'Peso Argentino (ARS)', value: 'ARS' }
            )
        )
        .addStringOption(option =>
          option.setName('para')
            .setDescription('Moeda de destino')
            .setRequired(true)
            .addChoices(
              { name: 'Real Brasileiro (BRL)', value: 'BRL' },
              { name: 'Dólar Americano (USD)', value: 'USD' },
              { name: 'Euro (EUR)', value: 'EUR' },
              { name: 'Libra Esterlina (GBP)', value: 'GBP' },
              { name: 'Peso Argentino (ARS)', value: 'ARS' }
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('traduzir')
        .setDescription('Traduz texto')
        .addStringOption(option =>
          option.setName('idioma')
            .setDescription('Idioma para traduzir')
            .setRequired(true)
            .addChoices(
              { name: 'Inglês', value: 'en' },
              { name: 'Espanhol', value: 'es' },
              { name: 'Francês', value: 'fr' },
              { name: 'Alemão', value: 'de' },
              { name: 'Português', value: 'pt' }
            )
        )
        .addStringOption(option =>
          option.setName('texto')
            .setDescription('Texto para traduzir')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('calculadora')
        .setDescription('Calculadora simples')
        .addStringOption(option =>
          option.setName('expressao')
            .setDescription('Expressão matemática (ex: 2+2*3)')
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    
    switch(subcommand) {
      case 'clima':
        await climaCommand(interaction);
        break;
      case 'cotacao':
        await cotacaoCommand(interaction);
        break;
      case 'traduzir':
        await traduzirCommand(interaction);
        break;
      case 'calculadora':
        await calculadoraCommand(interaction);
        break;
    }
  }
};

// Comandos com prefixo !!
module.exports.prefixCommands = {
  clima: async (message, args) => {
    if (args.length === 0) {
      return message.reply('❌ Informe uma cidade! Ex: `!!clima São Paulo`');
    }
    
    const cidade = args.join(' ');
    
    try {
      await message.reply(`🌤️ Buscando clima para **${cidade}**...`);
      
      // API de clima (exemplo com OpenWeather)
      const apiKey = 'sua_chave_api'; // Precisa de API key real
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cidade)}&appid=${apiKey}&units=metric&lang=pt_br`
      );
      
      if (!response.ok) {
        throw new Error('Cidade não encontrada');
      }
      
      const data = await response.json();
      
      const embed = new EmbedBuilder()
        .setColor(0x00BFFF)
        .setTitle(`🌤️ Clima em ${data.name}, ${data.sys.country}`)
        .setThumbnail(`http://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`)
        .addFields(
          { name: '🌡️ Temperatura', value: `${data.main.temp}°C`, inline: true },
          { name: '🤒 Sensação', value: `${data.main.feels_like}°C`, inline: true },
          { name: '📈 Máxima', value: `${data.main.temp_max}°C`, inline: true },
          { name: '📉 Mínima', value: `${data.main.temp_min}°C`, inline: true },
          { name: '💧 Umidade', value: `${data.main.humidity}%`, inline: true },
          { name: '💨 Vento', value: `${data.wind.speed} m/s`, inline: true }
        )
        .addFields(
          { name: '☁️ Condição', value: data.weather[0].description },
          { name: '🏙️ Pressão', value: `${data.main.pressure} hPa`, inline: true },
          { name: '👁️ Visibilidade', value: `${data.visibility / 1000} km`, inline: true }
        )
        .setFooter({ text: 'Fonte: OpenWeatherMap' });
      
      await message.editReply({ content: null, embeds: [embed] });
    } catch (error) {
      await message.editReply('❌ Não foi possível obter o clima. Verifique o nome da cidade.');
    }
  },
  
  cotacao: async (message, args) => {
    if (args.length < 2) {
      return message.reply('❌ Use: `!!cotacao USD BRL` ou `!!cotacao EUR BRL`');
    }
    
    const [from, to] = args.map(a => a.toUpperCase());
    const validCurrencies = ['BRL', 'USD', 'EUR', 'GBP', 'JPY', 'ARS'];
    
    if (!validCurrencies.includes(from) || !validCurrencies.includes(to)) {
      return message.reply(`❌ Moedas válidas: ${validCurrencies.join(', ')}`);
    }
    
    try {
      await message.reply(`💱 Buscando cotação **${from} → ${to}**...`);
      
      // API de câmbio (exemplo)
      const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${from}`);
      const data = await response.json();
      
      if (!data.rates[to]) {
        throw new Error('Moeda não encontrada');
      }
      
      const rate = data.rates[to];
      const date = new Date(data.date).toLocaleDateString('pt-BR');
      
      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle(`💱 Cotação ${from} → ${to}`)
        .setDescription(`**1 ${from} = ${rate.toFixed(4)} ${to}**`)
        .addFields(
          { name: '📅 Data', value: date, inline: true },
          { name: '📈 Taxa', value: rate.toFixed(6), inline: true },
          { name: '🔄 Inverso', value: (1/rate).toFixed(6), inline: true }
        )
        .addFields(
          { name: '💵 Exemplos', value: `10 ${from} = ${(10 * rate).toFixed(2)} ${to}\n100 ${from} = ${(100 * rate).toFixed(2)} ${to}` }
        )
        .setFooter({ text: 'Fonte: ExchangeRate-API' });
      
      await message.editReply({ content: null, embeds: [embed] });
    } catch (error) {
      await message.editReply('❌ Erro ao buscar cotação. Tente novamente.');
    }
  },
  
  traduzir: async (message, args) => {
    if (args.length < 2) {
      return message.reply('❌ Use: `!!traduzir en:Hello world` ou `!!traduzir es:Texto aqui`');
    }
    
    const [lang, ...textParts] = args.join(' ').split(':');
    if (textParts.length === 0) {
      return message.reply('❌ Formato correto: `!!traduzir idioma:texto`');
    }
    
    const text = textParts.join(':');
    const targetLang = lang.toLowerCase();
    
    const languages = {
      'en': 'Inglês',
      'es': 'Espanhol', 
      'fr': 'Francês',
      'de': 'Alemão',
      'pt': 'Português',
      'it': 'Italiano',
      'ja': 'Japonês'
    };
    
    if (!languages[targetLang]) {
      return message.reply(`❌ Idiomas disponíveis: ${Object.keys(languages).join(', ')}`);
    }
    
    try {
      await message.reply(`🔤 Traduzindo para **${languages[targetLang]}**...`);
      
      // API de tradução (exemplo com MyMemory)
      const response = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=pt|${targetLang}`
      );
      
      const data = await response.json();
      
      if (data.responseStatus !== 200) {
        throw new Error('Erro na tradução');
      }
      
      const translation = data.responseData.translatedText;
      
      const embed = new EmbedBuilder()
        .setColor(0x7289DA)
        .setTitle('🌐 Tradutor')
        .addFields(
          { name: '📝 Original (PT)', value: text.length > 1024 ? text.substring(0, 1020) + '...' : text },
          { name: `🔤 Tradução (${languages[targetLang].toUpperCase()})`, value: translation.length > 1024 ? translation.substring(0, 1020) + '...' : translation }
        )
        .setFooter({ text: 'Powered by MyMemory Translation' });
      
      await message.editReply({ content: null, embeds: [embed] });
    } catch (error) {
      await message.editReply('❌ Erro na tradução. Tente novamente.');
    }
  },
  
  calculadora: async (message, args) => {
    if (args.length === 0) {
      return message.reply('❌ Digite uma expressão! Ex: `!!calculadora 2+2*3`');
    }
    
    const expression = args.join(' ').replace(/[^0-9+\-*/().%\s]/g, '');
    
    try {
      // Avaliar expressão matemática com segurança
      const result = eval(expression);
      
      if (isNaN(result) || !isFinite(result)) {
        throw new Error('Expressão inválida');
      }
      
      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('🧮 Calculadora')
        .addFields(
          { name: '📝 Expressão', value: `\`${expression}\`` },
          { name: '🎯 Resultado', value: `**${result}**` }
        )
        .setFooter({ text: 'Calculadora simples - Use + - * / ( )' });
      
      await message.reply({ embeds: [embed] });
    } catch (error) {
      await message.reply('❌ Expressão inválida! Use apenas números e operadores: + - * / ( )');
    }
  },
  
  horario: async (message) => {
    const now = new Date();
    const timezones = {
      '🇧🇷 Brasília': 'America/Sao_Paulo',
      '🇺🇸 Nova York': 'America/New_York',
      '🇬🇧 Londres': 'Europe/London',
      '🇯🇵 Tóquio': 'Asia/Tokyo',
      '🇦🇺 Sydney': 'Australia/Sydney'
    };
    
    const times = [];
    for (const [city, tz] of Object.entries(timezones)) {
      try {
        const time = now.toLocaleString('pt-BR', { timeZone: tz, timeStyle: 'medium', dateStyle: 'short' });
        times.push(`${city}: **${time}**`);
      } catch (error) {
        times.push(`${city}: *Erro*`);
      }
    }
    
    const embed = new EmbedBuilder()
      .setColor(0x7289DA)
      .setTitle('🕐 Horário Mundial')
      .setDescription(times.join('\n'))
      .addFields(
        { name: '📅 Data UTC', value: now.toUTCString() },
        { name: '⏰ Timestamp', value: `<t:${Math.floor(now.getTime() / 1000)}:F>` }
      )
      .setFooter({ text: `Horário local: ${now.toLocaleString('pt-BR')}` });
    
    await message.reply({ embeds: [embed] });
  },
  
  lembrete: async (message, args) => {
    if (args.length < 2) {
      return message.reply('❌ Use: `!!lembrete 30m Estudar para prova`');
    }
    
    const timeStr = args[0].toLowerCase();
    const text = args.slice(1).join(' ');
    
    // Parse tempo
    let minutes = 0;
    if (timeStr.endsWith('h')) {
      minutes = parseInt(timeStr) * 60;
    } else if (timeStr.endsWith('m')) {
      minutes = parseInt(timeStr);
    } else if (timeStr.endsWith('s')) {
      minutes = parseInt(timeStr) / 60;
    } else {
      minutes = parseInt(timeStr); // Assume minutos
    }
    
    if (isNaN(minutes) || minutes < 1 || minutes > 1440) {
      return message.reply('❌ Tempo inválido! Use entre 1 minuto e 24 horas (ex: 30m, 2h, 3600s)');
    }
    
    const ms = minutes * 60 * 1000;
    const targetTime = Date.now() + ms;
    
    await message.reply(`✅ Lembrete agendado para <t:${Math.floor(targetTime / 1000)}:R>:\n**${text}**`);
    
    // Agendar lembrete
    setTimeout(async () => {
      try {
        const embed = new EmbedBuilder()
          .setColor(0xFFA500)
          .setTitle('🔔 Lembrete!')
          .setDescription(text)
          .addFields(
            { name: '👤 Agendado por', value: message.author.toString() },
            { name: '⏰ Agendado há', value: `${minutes} minutos atrás` }
          );
        
        await message.author.send({ embeds: [embed] }).catch(() => {
          message.channel.send(`${message.author} 🔔 **Lembrete:** ${text}`).catch(console.error);
        });
      } catch (error) {
        console.error('Erro ao enviar lembrete:', error);
      }
    }, ms);
  }
};

// Funções para slash commands
async function climaCommand(interaction) {
  const cidade = interaction.options.getString('cidade');
  await module.exports.prefixCommands.clima({
    reply: (content) => interaction.reply(content)
  }, [cidade]);
}

async function cotacaoCommand(interaction) {
  const from = interaction.options.getString('de');
  const to = interaction.options.getString('para');
  await module.exports.prefixCommands.cotacao({
    reply: (content) => interaction.reply(content)
  }, [from, to]);
}

async function traduzirCommand(interaction) {
  const idioma = interaction.options.getString('idioma');
  const texto = interaction.options.getString('texto');
  await module.exports.prefixCommands.traduzir({
    reply: (content) => interaction.reply(content)
  }, [`${idioma}:${texto}`]);
}

async function calculadoraCommand(interaction) {
  const expressao = interaction.options.getString('expressao');
  await module.exports.prefixCommands.calculadora({
    reply: (content) => interaction.reply(content)
  }, [expressao]);
}