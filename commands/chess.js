const { SlashCommandBuilder } = require('@discordjs/builders');
const { Chess } = require('chess.js');
const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const User = require('../models/user.js');

// Armazenar jogos ativos
const activeGames = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('xadrez')
        .setDescription('Jogue xadrez com apostas')
        .addSubcommand(subcommand =>
            subcommand
                .setName('desafiar')
                .setDescription('Desafie alguém para uma partida de xadrez')
                .addUserOption(option =>
                    option.setName('oponente')
                        .setDescription('Seu oponente')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option.setName('aposta')
                        .setDescription('Quantia para apostar')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('mover')
                .setDescription('Faça um movimento (ex: e2e4)')
                .addStringOption(option =>
                    option.setName('movimento')
                        .setDescription('Movimento no formato SAN (ex: e2e4)')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('tabuleiro')
                .setDescription('Mostra o tabuleiro atual')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('desistir')
                .setDescription('Desiste da partida atual')
        ),
    
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        
        switch(subcommand) {
            case 'desafiar':
                await challengePlayer(interaction);
                break;
            case 'mover':
                await makeMove(interaction);
                break;
            case 'tabuleiro':
                await showBoard(interaction);
                break;
            case 'desistir':
                await resignGame(interaction);
                break;
        }
    }
};

async function challengePlayer(interaction) {
    const opponent = interaction.options.getUser('oponente');
    const betAmount = interaction.options.getInteger('aposta');
    
    if (opponent.id === interaction.user.id) {
        return interaction.reply({ 
            content: '❌ Você não pode jogar contra si mesmo!', 
            ephemeral: true 
        });
    }
    
    if (betAmount <= 0) {
        return interaction.reply({ 
            content: '❌ A aposta deve ser maior que zero!', 
            ephemeral: true 
        });
    }
    
    // Verificar saldo dos jogadores
    const challenger = await User.findOne({ userId: interaction.user.id, guildId: interaction.guild.id });
    const opponentData = await User.findOne({ userId: opponent.id, guildId: interaction.guild.id });
    
    if (!challenger || challenger.coins < betAmount) {
        return interaction.reply({ 
            content: '❌ Você não tem moedas suficientes!', 
            ephemeral: true 
        });
    }
    
    if (!opponentData || opponentData.coins < betAmount) {
        return interaction.reply({ 
            content: '❌ Seu oponente não tem moedas suficientes!', 
            ephemeral: true 
        });
    }
    
    // Criar jogo
    const gameId = `${interaction.user.id}-${opponent.id}-${Date.now()}`;
    const chess = new Chess();
    
    const game = {
        id: gameId,
        white: interaction.user.id,
        black: opponent.id,
        challenger: interaction.user.id,
        opponent: opponent.id,
        chess: chess,
        bet: betAmount,
        channelId: interaction.channel.id,
        lastMove: Date.now(),
        status: 'waiting'
    };
    
    activeGames.set(gameId, game);
    
    // Criar embed de desafio
    const embed = new MessageEmbed()
        .setColor(0x0099FF)
        .setTitle('♟️ **Desafio de Xadrez** ♟️')
        .setDescription(`${opponent}, você foi desafiado por ${interaction.user} para uma partida de xadrez!`)
        .addFields(
            { name: '🎲 Aposta', value: `${betAmount} moedas`, inline: true },
            { name: '⚪ Brancas', value: `<@${interaction.user.id}>`, inline: true },
            { name: '⚫ Negras', value: `<@${opponent.id}>`, inline: true }
        )
        .setFooter({ text: 'O jogo expira em 5 minutos se não for aceito' });
    
    const row = new MessageActionRow()
        .addComponents(
            new MessageButton()
                .setCustomId(`accept_${gameId}`)
                .setLabel('Aceitar Desafio')
                .setStyle('SUCCESS'),
            new MessageButton()
                .setCustomId(`decline_${gameId}`)
                .setLabel('Recusar')
                .setStyle('DANGER')
        );
    
    await interaction.reply({
        embeds: [embed],
        components: [row]
    });
    
    // Coletor de botões
    const filter = i => i.customId === `accept_${gameId}` || i.customId === `decline_${gameId}`;
    const collector = interaction.channel.createMessageComponentCollector({ 
        filter, 
        time: 5 * 60 * 1000 
    });
    
    collector.on('collect', async i => {
        if (i.user.id !== opponent.id) {
            return i.reply({ 
                content: '❌ Apenas o jogador desafiado pode responder!', 
                ephemeral: true 
            });
        }
        
        if (i.customId === `accept_${gameId}`) {
            // Deduzir apostas
            challenger.coins -= betAmount;
            opponentData.coins -= betAmount;
            await challenger.save();
            await opponentData.save();
            
            game.status = 'active';
            await showGameBoard(game, interaction);
            
            await i.update({ 
                content: '✅ Desafio aceito! A partida começou!',
                embeds: [],
                components: [] 
            });
        } else {
            activeGames.delete(gameId);
            await i.update({ 
                content: '❌ Desafio recusado!',
                embeds: [],
                components: [] 
            });
        }
    });
    
    collector.on('end', collected => {
        if (!collected.size) {
            activeGames.delete(gameId);
            interaction.editReply({ 
                content: '⏰ Desafio expirado!',
                components: [] 
            });
        }
    });
}

async function makeMove(interaction) {
    const move = interaction.options.getString('movimento');
    
    // Encontrar jogo ativo do usuário
    let userGame = null;
    let gameId = null;
    
    for (const [id, game] of activeGames.entries()) {
        if ((game.white === interaction.user.id || game.black === interaction.user.id) && game.status === 'active') {
            userGame = game;
            gameId = id;
            break;
        }
    }
    
    if (!userGame) {
        return interaction.reply({ 
            content: '❌ Você não tem uma partida ativa!', 
            ephemeral: true 
        });
    }
    
    // Verificar turno
    const isWhiteTurn = userGame.chess.turn() === 'w';
    const isPlayerWhite = userGame.white === interaction.user.id;
    
    if ((isWhiteTurn && !isPlayerWhite) || (!isWhiteTurn && isPlayerWhite)) {
        return interaction.reply({ 
            content: '❌ Não é o seu turno!', 
            ephemeral: true 
        });
    }
    
    try {
        userGame.chess.move(move);
        userGame.lastMove = Date.now();
        
        // Verificar fim de jogo
        if (userGame.chess.isGameOver()) {
            await endGame(userGame, interaction);
            activeGames.delete(gameId);
        } else {
            await showGameBoard(userGame, interaction);
            await interaction.reply({ 
                content: `✅ Movimento realizado: ${move}`,
                ephemeral: false 
            });
        }
    } catch (error) {
        await interaction.reply({ 
            content: `❌ Movimento inválido: ${error.message}`,
            ephemeral: true 
        });
    }
}

async function showGameBoard(game, interaction = null) {
    const board = game.chess.ascii();
    const turn = game.chess.turn() === 'w' ? 'Brancas' : 'Negras';
    const currentPlayer = game.chess.turn() === 'w' ? `<@${game.white}>` : `<@${game.black}>`;
    
    const embed = new MessageEmbed()
        .setColor(0x0099FF)
        .setTitle('♟️ **Partida de Xadrez** ♟️')
        .setDescription(`\`\`\`${board}\`\`\``)
        .addFields(
            { name: '🎲 Aposta', value: `${game.bet} moedas`, inline: true },
            { name: '🔄 Turno', value: turn, inline: true },
            { name: '⏰ Próximo', value: currentPlayer, inline: true },
            { name: '⚪ Brancas', value: `<@${game.white}>`, inline: true },
            { name: '⚫ Negras', value: `<@${game.black}>`, inline: true }
        );
    
    if (interaction) {
        await interaction.channel.send({ embeds: [embed] });
    }
}

async function endGame(game, interaction) {
    const winner = game.chess.isCheckmate() ? 
        (game.chess.turn() === 'w' ? game.black : game.white) : null;
    
    let resultMessage = '';
    let winnerData = null;
    let loserData = null;
    
    if (winner) {
        resultMessage = `🎉 **CHECKMATE!** <@${winner}> venceu!`;
        winnerData = await User.findOne({ userId: winner, guildId: interaction.guild.id });
        loserData = await User.findOne({ 
            userId: (winner === game.white ? game.black : game.white), 
            guildId: interaction.guild.id 
        });
        
        // Distribuir prêmio
        const prize = game.bet * 2;
        winnerData.coins += prize;
        winnerData.winCount += 1;
        loserData.lossCount += 1;
        
        await winnerData.save();
        await loserData.save();
    } else if (game.chess.isDraw()) {
        resultMessage = '🤝 **EMPATE!**';
        // Devolver apostas
        const player1 = await User.findOne({ userId: game.white, guildId: interaction.guild.id });
        const player2 = await User.findOne({ userId: game.black, guildId: interaction.guild.id });
        
        player1.coins += game.bet;
        player2.coins += game.bet;
        
        await player1.save();
        await player2.save();
    } else if (game.chess.isStalemate()) {
        resultMessage = '🤝 **AFOGAMENTO!** Empate!';
        // Devolver apostas
        const player1 = await User.findOne({ userId: game.white, guildId: interaction.guild.id });
        const player2 = await User.findOne({ userId: game.black, guildId: interaction.guild.id });
        
        player1.coins += game.bet;
        player2.coins += game.bet;
        
        await player1.save();
        await player2.save();
    }
    
    await interaction.channel.send(resultMessage);
    await showGameBoard(game, interaction);
}

async function showBoard(interaction) {
    // Similar ao makeMove, encontra o jogo e mostra o tabuleiro
    let userGame = null;
    
    for (const [id, game] of activeGames.entries()) {
        if ((game.white === interaction.user.id || game.black === interaction.user.id) && game.status === 'active') {
            userGame = game;
            break;
        }
    }
    
    if (!userGame) {
        return interaction.reply({ 
            content: '❌ Você não tem uma partida ativa!', 
            ephemeral: true 
        });
    }
    
    await showGameBoard(userGame, interaction);
    await interaction.reply({ 
        content: '✅ Tabuleiro atualizado!',
        ephemeral: false 
    });
}

async function resignGame(interaction) {
    // Implementar desistência
    // Similar ao endGame, mas o oponente vence
}