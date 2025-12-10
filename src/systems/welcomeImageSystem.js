const Jimp = require('jimp');
const { AttachmentBuilder } = require('discord.js');

async function createWelcomeImage(member) {
    try {
        // Create a 1024x500 background
        const width = 1024;
        const height = 500;

        // Create new image with dark background
        const image = new Jimp(width, height, '#1a1c2c');

        // Create a gradient effect (simple loop)
        // Since Jimp doesn't have native gradient, we'll keep it simple or use a solid modern color
        // Let's stick to a solid elegant background for stability, or load a remote one if configured

        // Add a semi-transparent overlay
        const overlay = new Jimp(width, height, '#000000');
        overlay.opacity(0.3);
        image.composite(overlay, 0, 0);

        // Load Avatar
        const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true });
        const avatar = await Jimp.read(avatarUrl);

        // Resize and circular mask for avatar
        avatar.resize(256, 256);
        avatar.circle();

        // Calculate center positions
        const avatarX = (width / 2) - 128;
        const avatarY = 50;

        // Composite Avatar
        image.composite(avatar, avatarX, avatarY);

        // Load Fonts
        const fontTitle = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
        const fontSubtitle = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);

        // Text: WELCOME
        const titleText = 'WELCOME';
        const titleWidth = Jimp.measureText(fontTitle, titleText);
        image.print(fontTitle, (width / 2) - (titleWidth / 2), 330, titleText);

        // Text: Username
        const username = member.user.username.toUpperCase();
        const userWidth = Jimp.measureText(fontSubtitle, username);
        image.print(fontSubtitle, (width / 2) - (userWidth / 2), 410, username);

        // Text: Member Count
        const countText = `MEMBER #${member.guild.memberCount}`;
        const countWidth = Jimp.measureText(fontSubtitle, countText);
        image.print(fontSubtitle, (width / 2) - (countWidth / 2), 450, countText);

        // Get Buffer
        const buffer = await image.getBufferAsync(Jimp.MIME_PNG);
        return new AttachmentBuilder(buffer, { name: 'welcome.png' });

    } catch (error) {
        console.error('Error generating welcome image:', error);
        return null;
    }
}

module.exports = { createWelcomeImage };
