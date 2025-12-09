const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config/config');
const {
    createStatsChannels,
    deleteStatsChannels,
    forceUpdateStats,
    getStatsChannelIds,
    getServerStats
} = require('../../systems/serverStatsSystem');
const Guild = require('../../models/Guild');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-stats')
        .setDescription('Server stats kanallarını yönet')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Server stats kanallarını oluştur'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Server stats kanallarını sil'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('refresh')
                .setDescription('Server stats kanallarını manuel olarak güncelle'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('Mevcut sunucu istatistiklerini görüntüle')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'create') {
            await handleCreate(interaction);
        } else if (subcommand === 'delete') {
            await handleDelete(interaction);
        } else if (subcommand === 'refresh') {
            await handleRefresh(interaction);
        } else if (subcommand === 'view') {
            await handleView(interaction);
        }
    }
};

async function handleCreate(interaction) {
    await interaction.deferReply({ ephemeral: true });

    // Mevcut ayarları kontrol et
    let guildData = await Guild.findOne({ guildId: interaction.guild.id });

    if (guildData?.statsChannels?.categoryId) {
        const existingCategory = interaction.guild.channels.cache.get(guildData.statsChannels.categoryId);
        if (existingCategory) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(config.colors.error)
                        .setTitle('❌ Stats Kanalları Zaten Mevcut')
                        .setDescription('Server stats kanalları zaten oluşturulmuş.\nÖnce `/setup-stats delete` komutu ile mevcut kanalları silin.')
                ]
            });
        }
    }

    // Kanalları oluştur
    const result = await createStatsChannels(interaction.guild);

    if (!result.success) {
        return interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor(config.colors.error)
                    .setTitle('❌ Hata')
                    .setDescription(`Kanallar oluşturulurken hata oluştu: ${result.error}`)
            ]
        });
    }

    // Veritabanına kaydet
    if (!guildData) {
        guildData = new Guild({ guildId: interaction.guild.id });
    }
    guildData.statsChannels = {
        categoryId: result.categoryId,
        allMembers: result.channelIds.allMembers,
        members: result.channelIds.members,
        bots: result.channelIds.bots
    };
    await guildData.save();

    // Sistem cache'ine yükle
    const { loadStatsChannels } = require('../../systems/serverStatsSystem');
    loadStatsChannels(interaction.guild.id, guildData.statsChannels);

    const stats = getServerStats(interaction.guild);

    return interaction.editReply({
        embeds: [
            new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle('✅ Server Stats Kanalları Oluşturuldu')
                .setDescription('Sunucu istatistikleri kanalları başarıyla oluşturuldu!')
                .addFields(
                    { name: '👥 All Members', value: `${stats.allMembers}`, inline: true },
                    { name: '👤 Members', value: `${stats.members}`, inline: true },
                    { name: '🤖 Bots', value: `${stats.bots}`, inline: true }
                )
                .setFooter({ text: 'Kanallar her 5 dakikada bir ve üye giriş/çıkışlarında güncellenir.' })
        ]
    });
}

async function handleDelete(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const guildData = await Guild.findOne({ guildId: interaction.guild.id });

    if (!guildData?.statsChannels?.categoryId) {
        return interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor(config.colors.error)
                    .setTitle('❌ Stats Kanalları Bulunamadı')
                    .setDescription('Silinecek stats kanalları bulunamadı.')
            ]
        });
    }

    await deleteStatsChannels(interaction.guild, guildData.statsChannels);

    // Veritabanından kaldır
    guildData.statsChannels = undefined;
    await guildData.save();

    return interaction.editReply({
        embeds: [
            new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle('✅ Stats Kanalları Silindi')
                .setDescription('Server stats kanalları başarıyla silindi.')
        ]
    });
}

async function handleRefresh(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const success = await forceUpdateStats(interaction.guild);

    if (!success) {
        // Cache'de yoksa veritabanından yükle
        const guildData = await Guild.findOne({ guildId: interaction.guild.id });

        if (guildData?.statsChannels?.categoryId) {
            const { loadStatsChannels } = require('../../systems/serverStatsSystem');
            loadStatsChannels(interaction.guild.id, guildData.statsChannels);
            await forceUpdateStats(interaction.guild);
        } else {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(config.colors.error)
                        .setTitle('❌ Stats Kanalları Bulunamadı')
                        .setDescription('Önce `/setup-stats create` komutu ile kanalları oluşturun.')
                ]
            });
        }
    }

    const stats = getServerStats(interaction.guild);

    return interaction.editReply({
        embeds: [
            new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle('🔄 Stats Güncellendi')
                .setDescription('Server stats kanalları başarıyla güncellendi!')
                .addFields(
                    { name: '👥 All Members', value: `${stats.allMembers}`, inline: true },
                    { name: '👤 Members', value: `${stats.members}`, inline: true },
                    { name: '🤖 Bots', value: `${stats.bots}`, inline: true }
                )
        ]
    });
}

async function handleView(interaction) {
    const stats = getServerStats(interaction.guild);

    return interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(config.colors.info)
                .setTitle('📊 Sunucu İstatistikleri')
                .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
                .addFields(
                    { name: '👥 Toplam Üye', value: `${stats.allMembers}`, inline: true },
                    { name: '👤 Kullanıcı', value: `${stats.members}`, inline: true },
                    { name: '🤖 Bot', value: `${stats.bots}`, inline: true }
                )
                .setTimestamp()
        ],
        ephemeral: true
    });
}
