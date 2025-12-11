const Jimp = require('jimp');
const { AttachmentBuilder } = require('discord.js');

/**
 * Creates a welcome image with WELCOME text and username
 */
async function createWelcomeImage(member) {
    try {
        const width = 800;
        const height = 250;
        const image = new Jimp(width, height);

        // Purple to Blue gradient
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const ratio = (x + y) / (width + height);
                const r = Math.round(147 + (59 - 147) * ratio);
                const g = Math.round(51 + (130 - 51) * ratio);
                const b = Math.round(234 + (246 - 234) * ratio);
                image.setPixelColor(Jimp.rgbaToInt(r, g, b, 255), x, y);
            }
        }

        // Load fonts
        const fontLarge = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
        const fontMedium = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);

        // Print WELCOME text
        image.print(fontLarge, 40, 60, 'WELCOME');

        // Print username
        const username = member.user.displayName || member.user.username;
        image.print(fontMedium, 40, 140, username);

        // Avatar
        const avatarSize = 120;
        const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true });
        const avatar = await Jimp.read(avatarUrl);
        avatar.resize(avatarSize, avatarSize);
        avatar.circle();

        // White border
        const borderSize = avatarSize + 8;
        const border = new Jimp(borderSize, borderSize, 0xFFFFFFFF);
        border.circle();

        const avatarX = width - avatarSize - 40;
        const avatarY = (height - avatarSize) / 2;

        image.composite(border, avatarX - 4, avatarY - 4);
        image.composite(avatar, avatarX, avatarY);

        const buffer = await image.getBufferAsync(Jimp.MIME_PNG);
        return new AttachmentBuilder(buffer, { name: 'welcome.png' });

    } catch (error) {
        console.error('Welcome image error:', error);
        return null;
    }
}

/**
 * Creates a goodbye image with GOODBYE text and username
 */
async function createLeaveImage(member) {
    try {
        const width = 800;
        const height = 250;
        const image = new Jimp(width, height);

        // Red to Purple gradient
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const ratio = (x + y) / (width + height);
                const r = Math.round(239 + (168 - 239) * ratio);
                const g = Math.round(68 + (85 - 68) * ratio);
                const b = Math.round(68 + (247 - 68) * ratio);
                image.setPixelColor(Jimp.rgbaToInt(r, g, b, 255), x, y);
            }
        }

        // Load fonts
        const fontLarge = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
        const fontMedium = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);

        // Print GOODBYE text
        image.print(fontLarge, 40, 60, 'GOODBYE');

        // Print username
        const username = member.user.displayName || member.user.username;
        image.print(fontMedium, 40, 140, username);

        // Avatar - grayscale
        const avatarSize = 120;
        const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true });
        const avatar = await Jimp.read(avatarUrl);
        avatar.resize(avatarSize, avatarSize);
        avatar.greyscale();
        avatar.circle();

        // Red border
        const borderSize = avatarSize + 8;
        const border = new Jimp(borderSize, borderSize, 0xEF4444FF);
        border.circle();

        const avatarX = width - avatarSize - 40;
        const avatarY = (height - avatarSize) / 2;

        image.composite(border, avatarX - 4, avatarY - 4);
        image.composite(avatar, avatarX, avatarY);

        const buffer = await image.getBufferAsync(Jimp.MIME_PNG);
        return new AttachmentBuilder(buffer, { name: 'goodbye.png' });

    } catch (error) {
        console.error('Goodbye image error:', error);
        return null;
    }
}

/**
 * Creates an invite image with NEW INVITE text
 */
async function createInviteImage(user, inviterName = '') {
    try {
        const width = 800;
        const height = 250;
        const image = new Jimp(width, height);

        // Green to Teal gradient
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const ratio = (x + y) / (width + height);
                const r = Math.round(34 + (20 - 34) * ratio);
                const g = Math.round(197 + (184 - 197) * ratio);
                const b = Math.round(94 + (166 - 94) * ratio);
                image.setPixelColor(Jimp.rgbaToInt(r, g, b, 255), x, y);
            }
        }

        // Load fonts
        const fontLarge = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
        const fontMedium = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
        const fontSmall = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);

        // Print NEW INVITE text
        image.print(fontLarge, 40, 50, 'NEW INVITE');

        // Print username
        const username = user.displayName || user.username;
        image.print(fontMedium, 40, 130, username);

        // Print invited by (if provided)
        if (inviterName) {
            image.print(fontSmall, 40, 180, `Invited by: ${inviterName}`);
        }

        // Avatar
        const avatarSize = 120;
        const avatarUrl = user.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true });
        const avatar = await Jimp.read(avatarUrl);
        avatar.resize(avatarSize, avatarSize);
        avatar.circle();

        // Gold border
        const borderSize = avatarSize + 8;
        const border = new Jimp(borderSize, borderSize, 0xFBBF24FF);
        border.circle();

        const avatarX = width - avatarSize - 40;
        const avatarY = (height - avatarSize) / 2;

        image.composite(border, avatarX - 4, avatarY - 4);
        image.composite(avatar, avatarX, avatarY);

        const buffer = await image.getBufferAsync(Jimp.MIME_PNG);
        return new AttachmentBuilder(buffer, { name: 'invite.png' });

    } catch (error) {
        console.error('Invite image error:', error);
        return null;
    }
}

module.exports = { createWelcomeImage, createLeaveImage, createInviteImage };
