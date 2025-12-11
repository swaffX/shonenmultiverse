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

/**
 * Creates a modern achievement card image
 */
async function createAchievementCard(user, achievements, stats) {
    try {
        const width = 900;
        const height = 500;
        const image = new Jimp(width, height);

        // Dark gradient background (dark purple to dark blue)
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const ratio = (x + y) / (width + height);
                const r = Math.round(30 + (20 - 30) * ratio);
                const g = Math.round(20 + (30 - 20) * ratio);
                const b = Math.round(50 + (60 - 50) * ratio);
                image.setPixelColor(Jimp.rgbaToInt(r, g, b, 255), x, y);
            }
        }

        // Load fonts
        const fontLarge = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
        const fontMedium = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
        const fontSmall = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);

        // Avatar
        const avatarSize = 100;
        const avatarUrl = user.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true });
        const avatar = await Jimp.read(avatarUrl);
        avatar.resize(avatarSize, avatarSize);
        avatar.circle();

        // Gold border for avatar
        const borderSize = avatarSize + 6;
        const border = new Jimp(borderSize, borderSize, 0xFFD700FF);
        border.circle();

        image.composite(border, 30 - 3, 30 - 3);
        image.composite(avatar, 30, 30);

        // Username
        const username = user.displayName || user.username;
        image.print(fontMedium, 150, 50, username);

        // Achievement count
        const unlocked = achievements.filter(a => a.unlocked).length;
        const total = achievements.length;
        image.print(fontSmall, 150, 95, `${unlocked}/${total} Achievements Unlocked`);

        // Draw progress bar
        const barX = 30;
        const barY = 150;
        const barWidth = 840;
        const barHeight = 25;
        const progress = unlocked / total;

        // Background bar (dark)
        for (let y = barY; y < barY + barHeight; y++) {
            for (let x = barX; x < barX + barWidth; x++) {
                image.setPixelColor(Jimp.rgbaToInt(40, 40, 60, 255), x, y);
            }
        }

        // Progress bar (gold gradient)
        const progressWidth = Math.floor(barWidth * progress);
        for (let y = barY; y < barY + barHeight; y++) {
            for (let x = barX; x < barX + progressWidth; x++) {
                const ratio = x / (barX + barWidth);
                const r = Math.round(255);
                const g = Math.round(180 + (215 - 180) * ratio);
                const b = Math.round(0 + (60 - 0) * ratio);
                image.setPixelColor(Jimp.rgbaToInt(r, g, b, 255), x, y);
            }
        }

        // Category boxes
        const categories = [
            { name: 'Messages', color: 0x3498DBFF, key: 'messages' },
            { name: 'Voice', color: 0x2ECC71FF, key: 'voice' },
            { name: 'Level', color: 0xE91E63FF, key: 'level' },
            { name: 'Invites', color: 0x00BCD4FF, key: 'invites' }
        ];

        const boxWidth = 200;
        const boxHeight = 120;
        const boxY = 200;
        const spacing = 15;
        const startX = 30;

        for (let i = 0; i < categories.length; i++) {
            const cat = categories[i];
            const boxX = startX + i * (boxWidth + spacing);

            // Box background (semi-transparent)
            for (let y = boxY; y < boxY + boxHeight; y++) {
                for (let x = boxX; x < boxX + boxWidth; x++) {
                    const color = Jimp.intToRGBA(cat.color);
                    image.setPixelColor(Jimp.rgbaToInt(color.r, color.g, color.b, 180), x, y);
                }
            }

            // Category achievements
            const catAchievements = achievements.filter(a => a.category === cat.key);
            const catUnlocked = catAchievements.filter(a => a.unlocked).length;
            const catTotal = catAchievements.length;

            // Print category name
            image.print(fontSmall, boxX + 10, boxY + 10, cat.name);

            // Print count
            image.print(fontMedium, boxX + 10, boxY + 40, `${catUnlocked}/${catTotal}`);

            // Progress indicator circles
            const circleY = boxY + 95;
            const circleSize = 12;
            const circleSpacing = 18;
            const circlesStartX = boxX + 10;

            for (let j = 0; j < catTotal; j++) {
                const circleX = circlesStartX + j * circleSpacing;
                const isUnlocked = j < catUnlocked;

                // Draw filled or empty circle
                for (let cy = -circleSize / 2; cy < circleSize / 2; cy++) {
                    for (let cx = -circleSize / 2; cx < circleSize / 2; cx++) {
                        if (cx * cx + cy * cy <= (circleSize / 2) * (circleSize / 2)) {
                            const px = Math.floor(circleX + cx);
                            const py = Math.floor(circleY + cy);
                            if (px >= 0 && px < width && py >= 0 && py < height) {
                                if (isUnlocked) {
                                    image.setPixelColor(0xFFD700FF, px, py); // Gold
                                } else {
                                    image.setPixelColor(0x404060FF, px, py); // Dark
                                }
                            }
                        }
                    }
                }
            }
        }

        // Special achievements box
        const specialX = startX;
        const specialY = 340;
        const specialWidth = (boxWidth * 4) + (spacing * 3);
        const specialHeight = 70;

        // Special box background
        for (let y = specialY; y < specialY + specialHeight; y++) {
            for (let x = specialX; x < specialX + specialWidth; x++) {
                image.setPixelColor(Jimp.rgbaToInt(80, 60, 120, 180), x, y);
            }
        }

        // Special label
        image.print(fontSmall, specialX + 10, specialY + 10, 'Special Achievements');

        // Special achievements list
        const specialAchs = achievements.filter(a => a.category === 'special');
        const specialText = specialAchs.map(a => a.unlocked ? `✓ ${a.name.replace(/[^\w\s]/g, '')}` : `○ ${a.name.replace(/[^\w\s]/g, '')}`).join('  |  ');
        image.print(fontSmall, specialX + 10, specialY + 40, specialText.substring(0, 80));

        // Footer with stats
        image.print(fontSmall, 30, 430, `Total XP from Achievements: ${stats.totalXP || 0}`);
        image.print(fontSmall, 30, 455, `Rarest Achievement: ${stats.rarest || 'None yet'}`);

        // Timestamp
        const date = new Date().toLocaleDateString('en-US', { dateStyle: 'medium' });
        image.print(fontSmall, width - 150, 455, date);

        const buffer = await image.getBufferAsync(Jimp.MIME_PNG);
        return new AttachmentBuilder(buffer, { name: 'achievements.png' });

    } catch (error) {
        console.error('Achievement card error:', error);
        return null;
    }
}

module.exports = { createWelcomeImage, createLeaveImage, createInviteImage, createAchievementCard };
