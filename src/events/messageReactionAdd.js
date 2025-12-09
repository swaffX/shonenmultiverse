const { Events } = require('discord.js');
const ReactionRole = require('../models/ReactionRole');

module.exports = {
    name: Events.MessageReactionAdd,
    once: false,
    async execute(reaction, user, client) {
        if (user.bot) return;

        // Fetch partial reactions
        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (error) {
                console.error('❌ Reaction fetch error:', error);
                return;
            }
        }

        // Fetch partial message
        if (reaction.message.partial) {
            try {
                await reaction.message.fetch();
            } catch (error) {
                console.error('❌ Message fetch error:', error);
                return;
            }
        }

        try {
            console.log(`🔍 Reaction: ${reaction.emoji.name} on message ${reaction.message.id}`);

            const reactionRole = await ReactionRole.findByMessage(reaction.message.id);

            if (!reactionRole) {
                console.log(`ℹ️ No reaction role found for message ${reaction.message.id}`);
                return;
            }

            console.log(`✅ ReactionRole found: ${reactionRole.title}, roles: ${reactionRole.roles.length}`);

            // Check emoji match
            const emojiKey = reaction.emoji.id
                ? `<:${reaction.emoji.name}:${reaction.emoji.id}>`
                : reaction.emoji.name;

            const emojiAnimated = reaction.emoji.id
                ? `<a:${reaction.emoji.name}:${reaction.emoji.id}>`
                : reaction.emoji.name;

            console.log(`🔍 Looking for emoji: ${emojiKey} or ${reaction.emoji.name}`);
            console.log(`📋 Available roles:`, reactionRole.roles.map(r => r.emoji));

            const roleData = reactionRole.roles.find(r =>
                r.emoji === emojiKey ||
                r.emoji === emojiAnimated ||
                r.emoji === reaction.emoji.name ||
                r.emoji === reaction.emoji.toString() ||
                r.emoji === reaction.emoji.id
            );

            if (!roleData) {
                console.log(`ℹ️ No matching role for emoji ${emojiKey}`);
                return;
            }

            console.log(`✅ Role match found: ${roleData.roleId}`);

            const guild = reaction.message.guild;
            const member = await guild.members.fetch(user.id);
            const role = await guild.roles.fetch(roleData.roleId);

            if (!role) {
                console.error(`❌ Role not found: ${roleData.roleId}`);
                return;
            }

            if (!member.roles.cache.has(role.id)) {
                await member.roles.add(role);
                console.log(`✅ Added ${role.name} to ${user.tag}`);

                try {
                    await user.send({ content: `✅ You received the **${role.name}** role!` });
                } catch (err) { }
            }
        } catch (error) {
            console.error('❌ ReactionAdd error:', error);
        }
    }
};
