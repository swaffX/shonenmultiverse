const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const Changelog = require('../../models/Changelog');
const config = require('../../config/config');

// Announcement channel - you can change this or make it configurable
const ANNOUNCEMENT_CHANNEL_ID = '1447219076538699776'; // Using rules channel, change if needed

module.exports = {
    data: new SlashCommandBuilder()
        .setName('update')
        .setDescription('Manage game updates and changelogs')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
            sub.setName('post')
                .setDescription('Post a new game update')
                .addStringOption(opt => opt.setName('version').setDescription('Version number (e.g. 1.2.0)').setRequired(true))
                .addStringOption(opt => opt.setName('title').setDescription('Update title').setRequired(true))
                .addStringOption(opt => opt.setName('image').setDescription('Image URL (optional)').setRequired(false)))
        .addSubcommand(sub =>
            sub.setName('add')
                .setDescription('Add a change to the latest update')
                .addStringOption(opt =>
                    opt.setName('type')
                        .setDescription('Type of change')
                        .setRequired(true)
                        .addChoices(
                            { name: '✨ Added', value: 'added' },
                            { name: '🔄 Changed', value: 'changed' },
                            { name: '🐛 Fixed', value: 'fixed' },
                            { name: '🗑️ Removed', value: 'removed' }
                        ))
                .addStringOption(opt => opt.setName('description').setDescription('What changed?').setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'post') {
            await handlePostUpdate(interaction);
        } else if (subcommand === 'add') {
            await handleAddChange(interaction);
        }
    }
};

async function handlePostUpdate(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const version = interaction.options.getString('version');
    const title = interaction.options.getString('title');
    const imageUrl = interaction.options.getString('image');

    try {
        // Create changelog entry
        const changelog = await Changelog.create({
            guildId: interaction.guild.id,
            version,
            title,
            changes: [],
            author: {
                id: interaction.user.id,
                username: interaction.user.username
            },
            imageUrl
        });

        // Create announcement embed
        const embed = new EmbedBuilder()
            .setColor('#FF6B6B')
            .setAuthor({
                name: '🎮 SHONEN MULTIVERSE',
                iconURL: interaction.guild.iconURL({ dynamic: true })
            })
            .setTitle(`📢 Update ${version}: ${title}`)
            .setDescription([
                '> Yeni bir güncelleme yayınlandı!',
                '',
                '**Değişiklikleri görmek için:**',
                '```/changelog```',
                '',
                `🎯 [Oyunu Oyna](${config.game.robloxLink})`
            ].join('\n'))
            .setFooter({ text: `Posted by ${interaction.user.username}` })
            .setTimestamp();

        if (imageUrl) embed.setImage(imageUrl);

        // Send to announcement channel
        const channel = interaction.guild.channels.cache.get(ANNOUNCEMENT_CHANNEL_ID);
        if (channel) {
            await channel.send({
                content: '@everyone 🚀 Yeni güncelleme!',
                embeds: [embed]
            });
        }

        await interaction.editReply({
            content: `✅ Update **v${version}** oluşturuldu!\n\nŞimdi \`/update add\` ile değişiklikleri ekleyin.`
        });

    } catch (error) {
        console.error('Post update error:', error);
        await interaction.editReply({ content: '❌ Güncelleme oluşturulamadı.' });
    }
}

async function handleAddChange(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const type = interaction.options.getString('type');
    const description = interaction.options.getString('description');

    try {
        // Get latest changelog
        const changelog = await Changelog.findOne({ guildId: interaction.guild.id })
            .sort({ createdAt: -1 });

        if (!changelog) {
            return interaction.editReply({ content: '❌ Önce `/update post` ile güncelleme oluşturun.' });
        }

        // Add change
        changelog.changes.push({ type, description });
        await changelog.save();

        const typeEmojis = {
            added: '✨',
            changed: '🔄',
            fixed: '🐛',
            removed: '🗑️'
        };

        await interaction.editReply({
            content: `✅ Değişiklik eklendi:\n${typeEmojis[type]} **${type.toUpperCase()}:** ${description}`
        });

    } catch (error) {
        console.error('Add change error:', error);
        await interaction.editReply({ content: '❌ Değişiklik eklenemedi.' });
    }
}
