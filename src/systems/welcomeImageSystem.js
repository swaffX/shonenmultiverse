const Jimp = require('jimp');
const { AttachmentBuilder } = require('discord.js');
const path = require('path');

// Background images directory
const ASSETS_DIR = path.join(__dirname, '../../assets');

/**
 * Creates a circular avatar with optional border
 */
async function createCircularAvatar(avatarUrl, size = 200) {
    const avatar = await Jimp.read(avatarUrl);
    avatar.resize(size, size);
    avatar.circle();
    return avatar;
}

/**
 * Creates a gradient-like background using Jimp
 */
function createGradientBackground(width, height, color1, color2) {
    const image = new Jimp(width, height);

    for (let y = 0; y < height; y++) {
        const ratio = y / height;
        const r1 = (color1 >> 24) & 0xFF;
        const g1 = (color1 >> 16) & 0xFF;
        const b1 = (color1 >> 8) & 0xFF;
        const r2 = (color2 >> 24) & 0xFF;
        const g2 = (color2 >> 16) & 0xFF;
        const b2 = (color2 >> 8) & 0xFF;

        const r = Math.round(r1 + (r2 - r1) * ratio);
        const g = Math.round(g1 + (g2 - g1) * ratio);
        const b = Math.round(b1 + (b2 - b1) * ratio);

        for (let x = 0; x < width; x++) {
            image.setPixelColor(Jimp.rgbaToInt(r, g, b, 255), x, y);
        }
    }
    return image;
}

/**
 * Creates a MEE6-style welcome image
 */
async function createWelcomeImage(member) {
    try {
        const width = 900;
        const height = 300;

        // Create gradient background (dark purple to dark blue)
        const image = createGradientBackground(width, height, 0x1a1c2cFF, 0x2d1b4eFF);

        // Add a subtle dark overlay on left for text readability
        const leftOverlay = new Jimp(width * 0.65, height, '#00000080');
        image.composite(leftOverlay, 0, 0);

        // Load fonts
        const fontLarge = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
        const fontMedium = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
        const fontSmall = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);

        // Create and place circular avatar on the right side
        const avatarSize = 180;
        const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true });
        const avatar = await createCircularAvatar(avatarUrl, avatarSize);

        // Create avatar border (purple ring)
        const borderSize = avatarSize + 10;
        const avatarBorder = new Jimp(borderSize, borderSize, '#8b5cf6FF');
        avatarBorder.circle();

        // Position avatar on right side
        const avatarX = width - avatarSize - 60;
        const avatarY = (height - avatarSize) / 2;

        // Composite border then avatar
        image.composite(avatarBorder, avatarX - 5, avatarY - 5);
        image.composite(avatar, avatarX, avatarY);

        // Text positioning (left side)
        const textX = 40;

        // "WELCOME" title
        image.print(fontLarge, textX, 50, 'WELCOME');

        // Username
        const username = member.user.displayName || member.user.username;
        image.print(fontMedium, textX, 130, username);

        // Member count with ordinal
        const memberCount = member.guild.memberCount;
        const ordinal = getOrdinalSuffix(memberCount);
        const memberText = `You are the ${memberCount}${ordinal} member!`;
        image.print(fontSmall, textX, 180, memberText);

        // Server name
        const serverText = `Welcome to ${member.guild.name}`;
        image.print(fontSmall, textX, 210, serverText);

        // Create subtle decorative line
        for (let x = textX; x < textX + 200; x++) {
            image.setPixelColor(0x8b5cf6FF, x, 240);
            image.setPixelColor(0x8b5cf6FF, x, 241);
        }

        // Get buffer and return
        const buffer = await image.getBufferAsync(Jimp.MIME_PNG);
        return new AttachmentBuilder(buffer, { name: 'welcome.png' });

    } catch (error) {
        console.error('Error generating welcome image:', error);
        return null;
    }
}

/**
 * Creates a MEE6-style goodbye image
 */
async function createLeaveImage(member) {
    try {
        const width = 900;
        const height = 300;

        // Create gradient background (dark red to dark purple)
        const image = createGradientBackground(width, height, 0x2c1a1aFF, 0x4a1a2eFF);

        // Add left overlay
        const leftOverlay = new Jimp(width * 0.65, height, '#00000080');
        image.composite(leftOverlay, 0, 0);

        // Load fonts
        const fontLarge = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
        const fontMedium = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
        const fontSmall = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);

        // Avatar with red border
        const avatarSize = 180;
        const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true });
        const avatar = await createCircularAvatar(avatarUrl, avatarSize);

        // Make avatar slightly grayscale for goodbye effect
        avatar.greyscale();
        avatar.brightness(0.2);

        // Red border
        const borderSize = avatarSize + 10;
        const avatarBorder = new Jimp(borderSize, borderSize, '#ef4444FF');
        avatarBorder.circle();

        // Position
        const avatarX = width - avatarSize - 60;
        const avatarY = (height - avatarSize) / 2;

        image.composite(avatarBorder, avatarX - 5, avatarY - 5);
        image.composite(avatar, avatarX, avatarY);

        // Text
        const textX = 40;

        image.print(fontLarge, textX, 50, 'GOODBYE');

        const username = member.user.displayName || member.user.username;
        image.print(fontMedium, textX, 130, username);

        // Time in server calculation
        const joinedAt = member.joinedAt || new Date();
        const timeInServer = getTimeInServer(joinedAt);
        const timeText = `Was with us for ${timeInServer}`;
        image.print(fontSmall, textX, 180, timeText);

        // Remaining members
        const remainingText = `We now have ${member.guild.memberCount} members`;
        image.print(fontSmall, textX, 210, remainingText);

        // Decorative line (red)
        for (let x = textX; x < textX + 200; x++) {
            image.setPixelColor(0xef4444FF, x, 240);
            image.setPixelColor(0xef4444FF, x, 241);
        }

        const buffer = await image.getBufferAsync(Jimp.MIME_PNG);
        return new AttachmentBuilder(buffer, { name: 'goodbye.png' });

    } catch (error) {
        console.error('Error generating goodbye image:', error);
        return null;
    }
}

/**
 * Get ordinal suffix (1st, 2nd, 3rd, etc.)
 */
function getOrdinalSuffix(num) {
    const j = num % 10;
    const k = num % 100;

    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
}

/**
 * Calculate time in server
 */
function getTimeInServer(joinDate) {
    const now = new Date();
    const diff = now - joinDate;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
        return `${days} day${days > 1 ? 's' : ''}, ${hours} hour${hours > 1 ? 's' : ''}`;
    } else if (hours > 0) {
        return `${hours} hour${hours > 1 ? 's' : ''}, ${minutes} min${minutes > 1 ? 's' : ''}`;
    } else {
        return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
}

module.exports = { createWelcomeImage, createLeaveImage };
