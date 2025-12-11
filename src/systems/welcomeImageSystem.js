const Jimp = require('jimp');
const { AttachmentBuilder } = require('discord.js');

/**
 * Creates a modern welcome image with anime-style gradient and avatar
 * No text on image - embed handles all text
 */
async function createWelcomeImage(member) {
    try {
        const width = 800;
        const height = 250;

        // Create anime-style purple/blue gradient background
        const image = new Jimp(width, height);

        // Create diagonal gradient effect (dark purple to blue)
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const ratio = (x + y) / (width + height);
                // Purple (#8b5cf6) to Blue (#3b82f6) gradient
                const r = Math.round(139 + (59 - 139) * ratio);
                const g = Math.round(92 + (130 - 92) * ratio);
                const b = Math.round(246 + (246 - 246) * ratio);
                image.setPixelColor(Jimp.rgbaToInt(r, g, b, 255), x, y);
            }
        }

        // Add dark overlay on the left side for depth
        const overlay = new Jimp(width, height);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const opacity = Math.max(0, 80 - (x / width) * 80);
                overlay.setPixelColor(Jimp.rgbaToInt(0, 0, 0, opacity), x, y);
            }
        }
        image.composite(overlay, 0, 0);

        // Add subtle pattern/glow effect
        for (let i = 0; i < 5; i++) {
            const glowX = Math.random() * width;
            const glowY = Math.random() * height;
            const glowSize = 50 + Math.random() * 100;

            for (let y = Math.max(0, glowY - glowSize); y < Math.min(height, glowY + glowSize); y++) {
                for (let x = Math.max(0, glowX - glowSize); x < Math.min(width, glowX + glowSize); x++) {
                    const dist = Math.sqrt((x - glowX) ** 2 + (y - glowY) ** 2);
                    if (dist < glowSize) {
                        const currentColor = Jimp.intToRGBA(image.getPixelColor(x, y));
                        const intensity = Math.round(30 * (1 - dist / glowSize));
                        const newR = Math.min(255, currentColor.r + intensity);
                        const newG = Math.min(255, currentColor.g + intensity);
                        const newB = Math.min(255, currentColor.b + intensity);
                        image.setPixelColor(Jimp.rgbaToInt(newR, newG, newB, 255), x, y);
                    }
                }
            }
        }

        // Load and place avatar
        const avatarSize = 140;
        const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true });
        const avatar = await Jimp.read(avatarUrl);
        avatar.resize(avatarSize, avatarSize);
        avatar.circle();

        // Create glowing border for avatar
        const borderSize = avatarSize + 12;
        const border = new Jimp(borderSize, borderSize);

        // Create gradient border
        for (let y = 0; y < borderSize; y++) {
            for (let x = 0; x < borderSize; x++) {
                const centerX = borderSize / 2;
                const centerY = borderSize / 2;
                const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
                const innerRadius = avatarSize / 2;
                const outerRadius = borderSize / 2;

                if (dist >= innerRadius && dist <= outerRadius) {
                    // Gradient from purple to cyan
                    const ratio = (dist - innerRadius) / (outerRadius - innerRadius);
                    const r = Math.round(139 * (1 - ratio) + 34 * ratio);
                    const g = Math.round(92 * (1 - ratio) + 211 * ratio);
                    const b = Math.round(246 * (1 - ratio) + 238 * ratio);
                    border.setPixelColor(Jimp.rgbaToInt(r, g, b, 255), x, y);
                }
            }
        }
        border.circle();

        // Position avatar on right side
        const avatarX = width - avatarSize - 50;
        const avatarY = (height - avatarSize) / 2;

        image.composite(border, avatarX - 6, avatarY - 6);
        image.composite(avatar, avatarX, avatarY);

        // Add decorative accent line at bottom
        for (let x = 30; x < width - 200; x++) {
            const progress = (x - 30) / (width - 230);
            const opacity = Math.min(255, 200 * (1 - progress));
            image.setPixelColor(Jimp.rgbaToInt(255, 255, 255, opacity), x, height - 20);
            image.setPixelColor(Jimp.rgbaToInt(255, 255, 255, opacity * 0.5), x, height - 19);
        }

        const buffer = await image.getBufferAsync(Jimp.MIME_PNG);
        return new AttachmentBuilder(buffer, { name: 'welcome.png' });

    } catch (error) {
        console.error('Error generating welcome image:', error);
        return null;
    }
}

/**
 * Creates a modern goodbye image with anime-style red gradient and grayscale avatar
 * No text on image - embed handles all text
 */
async function createLeaveImage(member) {
    try {
        const width = 800;
        const height = 250;

        // Create anime-style red/dark gradient background
        const image = new Jimp(width, height);

        // Create diagonal gradient effect (dark red to dark purple)
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const ratio = (x + y) / (width + height);
                // Dark Red (#dc2626) to Dark Purple (#7c3aed) gradient
                const r = Math.round(220 + (124 - 220) * ratio);
                const g = Math.round(38 + (58 - 38) * ratio);
                const b = Math.round(38 + (237 - 38) * ratio);
                image.setPixelColor(Jimp.rgbaToInt(r, g, b, 255), x, y);
            }
        }

        // Add dark overlay
        const overlay = new Jimp(width, height);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const opacity = Math.max(0, 100 - (x / width) * 100);
                overlay.setPixelColor(Jimp.rgbaToInt(0, 0, 0, opacity), x, y);
            }
        }
        image.composite(overlay, 0, 0);

        // Load avatar and make it grayscale
        const avatarSize = 140;
        const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true });
        const avatar = await Jimp.read(avatarUrl);
        avatar.resize(avatarSize, avatarSize);
        avatar.greyscale(); // Sad effect for goodbye
        avatar.brightness(-0.1);
        avatar.circle();

        // Create red border for avatar
        const borderSize = avatarSize + 12;
        const border = new Jimp(borderSize, borderSize);

        for (let y = 0; y < borderSize; y++) {
            for (let x = 0; x < borderSize; x++) {
                const centerX = borderSize / 2;
                const centerY = borderSize / 2;
                const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
                const innerRadius = avatarSize / 2;
                const outerRadius = borderSize / 2;

                if (dist >= innerRadius && dist <= outerRadius) {
                    // Red gradient border
                    const ratio = (dist - innerRadius) / (outerRadius - innerRadius);
                    const r = Math.round(239 * (1 - ratio) + 185 * ratio);
                    const g = Math.round(68 * (1 - ratio) + 28 * ratio);
                    const b = Math.round(68 * (1 - ratio) + 28 * ratio);
                    border.setPixelColor(Jimp.rgbaToInt(r, g, b, 255), x, y);
                }
            }
        }
        border.circle();

        // Position avatar
        const avatarX = width - avatarSize - 50;
        const avatarY = (height - avatarSize) / 2;

        image.composite(border, avatarX - 6, avatarY - 6);
        image.composite(avatar, avatarX, avatarY);

        // Add decorative accent line
        for (let x = 30; x < width - 200; x++) {
            const progress = (x - 30) / (width - 230);
            const opacity = Math.min(255, 180 * (1 - progress));
            image.setPixelColor(Jimp.rgbaToInt(239, 68, 68, opacity), x, height - 20);
            image.setPixelColor(Jimp.rgbaToInt(239, 68, 68, opacity * 0.5), x, height - 19);
        }

        const buffer = await image.getBufferAsync(Jimp.MIME_PNG);
        return new AttachmentBuilder(buffer, { name: 'goodbye.png' });

    } catch (error) {
        console.error('Error generating goodbye image:', error);
        return null;
    }
}

module.exports = { createWelcomeImage, createLeaveImage };
