const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Changelog = require('../../models/Changelog');
const config = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('changelog')
        .setDescription('View recent game updates')
        .addIntegerOption(opt =>
            opt.setName('limit')
                .setDescription('How many updates to show (default: 3)')
                .setMinValue(1)
                .setMaxValue(10)
                .setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply();

        const limit = interaction.options.getInteger('limit') || 3;

        try {
            const changelogs = await Changelog.getRecent(interaction.guild.id, limit);

            if (changelogs.length === 0) {
                return interaction.editReply({
                    content: '📭 Henüz güncelleme kaydı yok.'
                });
            }

            const typeEmojis = {
                added: '✨',
                changed: '🔄',
                fixed: '🐛',
                removed: '🗑️'
            };

            const embeds = changelogs.map(log => {
                // Group changes by type
                const grouped = {
                    added: [],
                    changed: [],
                    fixed: [],
                    removed: []
                };

                log.changes.forEach(c => {
                    if (grouped[c.type]) {
                        grouped[c.type].push(c.description);
                    }
                });

                // Build description
                let description = '';

                for (const [type, items] of Object.entries(grouped)) {
                    if (items.length > 0) {
                        const emoji = typeEmojis[type];
                        const header = type.charAt(0).toUpperCase() + type.slice(1);
                        description += `\n**${emoji} ${header}**\n`;
                        items.forEach(item => {
                            description += `> • ${item}\n`;
                        });
                    }
                }

                if (!description) description = '*Değişiklik detayı eklenmemiş.*';

                const embed = new EmbedBuilder()
                    .setColor('#FF6B6B')
                    .setTitle(`📦 v${log.version}: ${log.title}`)
                    .setDescription(description)
                    .setFooter({
                        text: `${log.author?.username || 'Unknown'} tarafından yayınlandı`,
                        iconURL: interaction.guild.iconURL({ dynamic: true })
                    })
                    .setTimestamp(log.createdAt);

                if (log.imageUrl) embed.setThumbnail(log.imageUrl);

                return embed;
            });

            // Add header embed
            const headerEmbed = new EmbedBuilder()
                .setColor('#FF6B6B')
                .setAuthor({
                    name: '🎮 SHONEN MULTIVERSE CHANGELOG',
                    iconURL: interaction.guild.iconURL({ dynamic: true })
                })
                .setDescription([
                    `Son **${changelogs.length}** güncelleme gösteriliyor.`,
                    '',
                    `🎯 [Oyunu Oyna](${config.game.robloxLink}) | 👥 [Gruba Katıl](${config.game.groupLink})`
                ].join('\n'));

            await interaction.editReply({ embeds: [headerEmbed, ...embeds] });

        } catch (error) {
            console.error('Changelog error:', error);
            await interaction.editReply({ content: '❌ Changelog yüklenemedi.' });
        }
    }
};
