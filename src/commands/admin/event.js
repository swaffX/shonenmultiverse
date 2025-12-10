const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

const EVENT_CHANNEL_ID = '1448128628222070816';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('event')
        .setDescription('Manage events')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new event announcement')
                .addStringOption(option =>
                    option.setName('title')
                        .setDescription('Event title')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Event description (use \\n for new lines)')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('time')
                        .setDescription('Event time (e.g. "Tomorrow at 5 PM", "In 1 hour")')
                        .setRequired(true))
                .addAttachmentOption(option =>
                    option.setName('image')
                        .setDescription('Event banner image'))
                .addBooleanOption(option =>
                    option.setName('ping')
                        .setDescription('Ping @everyone?')))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        if (interaction.options.getSubcommand() === 'create') {
            const title = interaction.options.getString('title');
            const description = interaction.options.getString('description').replace(/\\n/g, '\n');
            const time = interaction.options.getString('time');
            const image = interaction.options.getAttachment('image');
            const ping = interaction.options.getBoolean('ping');

            const channel = interaction.guild.channels.cache.get(EVENT_CHANNEL_ID);
            if (!channel) {
                return interaction.reply({ content: `❌ Event channel not found (ID: ${EVENT_CHANNEL_ID})`, ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setColor('#E91E63')
                .setTitle(`🎉 ${title}`)
                .setDescription(description)
                .addFields(
                    { name: '⏰ Time', value: time, inline: true },
                    { name: '📍 Location', value: 'Shonen Multiverse', inline: true }
                )
                .setFooter({ text: `Hosted by ${interaction.user.tag}` })
                .setTimestamp();

            if (image) {
                embed.setImage(image.url);
            }

            try {
                await interaction.reply({ content: '✅ Posting event...', ephemeral: true });

                const messageContent = ping ? '@everyone' : null;
                const message = await channel.send({ content: messageContent, embeds: [embed] });

                await interaction.editReply({ content: `✅ Event posted in ${channel}! [View Message](${message.url})` });
            } catch (error) {
                console.error('Event post error:', error);
                await interaction.editReply({ content: '❌ Failed to post event.' });
            }
        }
    }
};
