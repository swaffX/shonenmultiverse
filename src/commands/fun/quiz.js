const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const User = require('../../models/User');

// Anime quiz questions - Naruto, One Piece, Bleach, Demon Slayer
const quizQuestions = [
    // Naruto
    {
        question: "What is the name of Naruto's signature jutsu?",
        options: ['Rasengan', 'Chidori', 'Fireball Jutsu', 'Shadow Clone'],
        correct: 0,
        anime: 'Naruto'
    },
    {
        question: "Who is the 4th Hokage?",
        options: ['Hiruzen Sarutobi', 'Minato Namikaze', 'Tsunade', 'Kakashi Hatake'],
        correct: 1,
        anime: 'Naruto'
    },
    {
        question: "What clan does Sasuke belong to?",
        options: ['Hyuga', 'Uzumaki', 'Uchiha', 'Senju'],
        correct: 2,
        anime: 'Naruto'
    },
    {
        question: "What is the name of the Nine-Tailed Fox?",
        options: ['Shukaku', 'Kurama', 'Matatabi', 'Gyuki'],
        correct: 1,
        anime: 'Naruto'
    },
    // One Piece
    {
        question: "What is Luffy's Devil Fruit?",
        options: ['Gomu Gomu no Mi', 'Mera Mera no Mi', 'Hie Hie no Mi', 'Yami Yami no Mi'],
        correct: 0,
        anime: 'One Piece'
    },
    {
        question: "Who is the captain of the Straw Hat Pirates?",
        options: ['Zoro', 'Sanji', 'Luffy', 'Nami'],
        correct: 2,
        anime: 'One Piece'
    },
    {
        question: "What is Zoro's dream?",
        options: ['Find All Blue', 'Become Pirate King', 'Become World\'s Greatest Swordsman', 'Draw World Map'],
        correct: 2,
        anime: 'One Piece'
    },
    {
        question: "What is the treasure at the end of the Grand Line called?",
        options: ['One Piece', 'Grand Treasure', 'Pirate Gold', 'World\'s End'],
        correct: 0,
        anime: 'One Piece'
    },
    // Bleach
    {
        question: "What is Ichigo's Zanpakuto called?",
        options: ['Senbonzakura', 'Zangetsu', 'Hyorinmaru', 'Zabimaru'],
        correct: 1,
        anime: 'Bleach'
    },
    {
        question: "What is a Soul Reaper's main duty?",
        options: ['Protect humans', 'Guide souls to Soul Society', 'Fight Hollows', 'All of the above'],
        correct: 3,
        anime: 'Bleach'
    },
    {
        question: "Who is the captain of Squad 6?",
        options: ['Kenpachi', 'Byakuya Kuchiki', 'Toshiro Hitsugaya', 'Shunsui Kyoraku'],
        correct: 1,
        anime: 'Bleach'
    },
    // Demon Slayer
    {
        question: "What breathing style does Tanjiro use?",
        options: ['Thunder Breathing', 'Water Breathing', 'Flame Breathing', 'Wind Breathing'],
        correct: 1,
        anime: 'Demon Slayer'
    },
    {
        question: "Who turned Nezuko into a demon?",
        options: ['Rui', 'Akaza', 'Muzan Kibutsuji', 'Enmu'],
        correct: 2,
        anime: 'Demon Slayer'
    },
    {
        question: "What rank are the Hashira?",
        options: ['Lowest rank', 'Middle rank', 'Highest rank', 'Special rank'],
        correct: 2,
        anime: 'Demon Slayer'
    },
    {
        question: "What is Zenitsu's breathing style?",
        options: ['Water Breathing', 'Thunder Breathing', 'Beast Breathing', 'Sound Breathing'],
        correct: 1,
        anime: 'Demon Slayer'
    }
];

// Store active quizzes
const activeQuizzes = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('quiz')
        .setDescription('Test your anime knowledge and earn XP!'),

    async execute(interaction) {
        const userId = interaction.user.id;

        // Check if user already has active quiz
        if (activeQuizzes.has(userId)) {
            return interaction.reply({
                content: '❌ You already have an active quiz! Answer it first.',
                ephemeral: true
            });
        }

        // Get random question
        const question = quizQuestions[Math.floor(Math.random() * quizQuestions.length)];

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setAuthor({ name: `🎯 Anime Quiz - ${question.anime}` })
            .setTitle(question.question)
            .setDescription('You have **15 seconds** to answer!\n\n**+25 XP** for correct answer')
            .setFooter({ text: 'Click a button to answer!' });

        const row = new ActionRowBuilder().addComponents(
            question.options.map((option, index) =>
                new ButtonBuilder()
                    .setCustomId(`quiz_${userId}_${index}`)
                    .setLabel(option)
                    .setStyle(ButtonStyle.Primary)
            )
        );

        await interaction.reply({ embeds: [embed], components: [row] });

        // Store quiz data
        activeQuizzes.set(userId visibleRect, {
            correct: question.correct,
            question: question.question,
            options: question.options,
            messageId: (await interaction.fetchReply()).id,
            channelId: interaction.channelId
        });

        // Set timeout for 15 seconds
        setTimeout(async () => {
            if (activeQuizzes.has(userId)) {
                activeQuizzes.delete(userId);
                try {
                    const message = await interaction.fetchReply();
                    const timeoutEmbed = new EmbedBuilder()
                        .setColor('#ED4245')
                        .setTitle('⏰ Time\'s Up!')
                        .setDescription(`The correct answer was: **${question.options[question.correct]}**`)
                        .setFooter({ text: 'Try again with /quiz!' });

                    await message.edit({ embeds: [timeoutEmbed], components: [] });
                } catch (e) { }
            }
        }, 15000);
    }
};

// Export for button handler
module.exports.handleQuizAnswer = async function (interaction, correctIndex) {
    const userId = interaction.user.id;
    const quizData = activeQuizzes.get(userId);

    if (!quizData) {
        return interaction.reply({ content: '❌ This quiz has expired.', ephemeral: true });
    }

    // Get the selected answer index from customId
    const selectedIndex = parseInt(interaction.customId.split('_')[2]);
    const isCorrect = selectedIndex === quizData.correct;

    activeQuizzes.delete(userId);

    if (isCorrect) {
        // Award XP
        let user = await User.findOne({ oderId: userId, guildId: interaction.guildId });
        if (!user) {
            user = new User({ oderId: userId, guildId: interaction.guildId });
        }
        user.xp += 25;
        await user.save();

        const embed = new EmbedBuilder()
            .setColor('#57F287')
            .setTitle('✅ Correct!')
            .setDescription(`**${quizData.options[selectedIndex]}** is the right answer!\n\n**+25 XP** earned!`)
            .setFooter({ text: 'Play again with /quiz!' });

        await interaction.update({ embeds: [embed], components: [] });
    } else {
        const embed = new EmbedBuilder()
            .setColor('#ED4245')
            .setTitle('❌ Wrong!')
            .setDescription(`The correct answer was: **${quizData.options[quizData.correct]}**`)
            .setFooter({ text: 'Try again with /quiz!' });

        await interaction.update({ embeds: [embed], components: [] });
    }
};

module.exports.activeQuizzes = activeQuizzes;
