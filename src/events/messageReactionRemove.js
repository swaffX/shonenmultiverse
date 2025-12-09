const { Events } = require('discord.js');
const ReactionRole = require('../models/ReactionRole');

module.exports = {
    name: Events.MessageReactionRemove,
    once: false,
    async execute(reaction, user, client) {
        if (user.bot) return;

        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (error) {
                return;
            }
        }

        if (reaction.message.partial) {
            try {
                await reaction.message.fetch();
            } catch (error) {
                return;
            }
        }

        try {
            const reactionRole = await ReactionRole.findByMessage(reaction.message.id);
            if (!reactionRole) return;

            const emojiKey = reaction.emoji.id
                ? `<:${reaction.emoji.name}:${reaction.emoji.id}>`
                : reaction.emoji.name;

            const emojiAnimated = reaction.emoji.id
                ? `<a:${reaction.emoji.name}:${reaction.emoji.id}>`
                : reaction.emoji.name;

            const roleData = reactionRole.roles.find(r =>
                r.emoji === emojiKey ||
                r.emoji === emojiAnimated ||
                r.emoji === reaction.emoji.name ||
                r.emoji === reaction.emoji.toString() ||
                r.emoji === reaction.emoji.id
            );

            if (!roleData) return;

            const guild = reaction.message.guild;
            const member = await guild.members.fetch(user.id);
            const role = await guild.roles.fetch(roleData.roleId);

            if (!role) return;

            if (member.roles.cache.has(role.id)) {
                await member.roles.remove(role);
                console.log(`❌ Removed ${role.name} from ${user.tag}`);
            }
        } catch (error) {
            console.error('❌ ReactionRemove error:', error);
        }
    }
};
