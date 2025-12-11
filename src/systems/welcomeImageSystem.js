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
        const height = 520;
        const image = new Jimp(width, height);

        // Dark gradient background (dark purple to dark blue)
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const ratio = (x + y) / (width + height);
                const r = Math.round(25 + (15 - 25) * ratio);
                const g = Math.round(15 + (25 - 15) * ratio);
                const b = Math.round(45 + (55 - 45) * ratio);
                image.setPixelColor(Jimp.rgbaToInt(r, g, b, 255), x, y);
            }
        }

        // Load fonts
        const fontLarge = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
        const fontMedium = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
        const fontSmall = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);

        // Filter out special achievements
        const mainAchievements = achievements.filter(a => a.category !== 'special');

        // Avatar
        const avatarSize = 90;
        const avatarUrl = user.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true });
        const avatar = await Jimp.read(avatarUrl);
        avatar.resize(avatarSize, avatarSize);
        avatar.circle();

        // Gold border for avatar
        const borderSize = avatarSize + 6;
        const border = new Jimp(borderSize, borderSize, 0xFFD700FF);
        border.circle();

        image.composite(border, 25 - 3, 20 - 3);
        image.composite(avatar, 25, 20);

        // Username
        const username = user.displayName || user.username;
        image.print(fontMedium, 130, 35, username);

        // Achievement count
        const unlocked = mainAchievements.filter(a => a.unlocked).length;
        const total = mainAchievements.length;
        image.print(fontSmall, 130, 75, `${unlocked}/${total} Achievements Unlocked`);

        // Draw progress bar
        const barX = 25;
        const barY = 125;
        const barWidth = 850;
        const barHeight = 20;
        const progress = unlocked / total;

        // Background bar (dark with rounded effect)
        for (let y = barY; y < barY + barHeight; y++) {
            for (let x = barX; x < barX + barWidth; x++) {
                image.setPixelColor(Jimp.rgbaToInt(35, 35, 55, 255), x, y);
            }
        }

        // Progress bar (gold gradient)
        const progressWidth = Math.floor(barWidth * progress);
        for (let y = barY; y < barY + barHeight; y++) {
            for (let x = barX; x < barX + progressWidth; x++) {
                const ratio = x / (barX + barWidth);
                const r = 255;
                const g = Math.round(180 + (215 - 180) * ratio);
                const b = Math.round(0 + (80 - 0) * ratio);
                image.setPixelColor(Jimp.rgbaToInt(r, g, b, 255), x, y);
            }
        }

        // Category boxes with achievement names
        const categories = [
            { name: 'MESSAGES', color: 0x3498DBFF, key: 'messages', emoji: '💬' },
            { name: 'VOICE', color: 0x2ECC71FF, key: 'voice', emoji: '🎤' },
            { name: 'LEVEL', color: 0xE91E63FF, key: 'level', emoji: '⭐' },
            { name: 'INVITES', color: 0x00BCD4FF, key: 'invites', emoji: '📨' }
        ];

        const boxWidth = 210;
        const boxHeight = 160;
        const boxY = 160;
        const spacing = 8;
        const startX = 25;

        for (let i = 0; i < categories.length; i++) {
            const cat = categories[i];
            const boxX = startX + i * (boxWidth + spacing);

            // Box background (gradient effect)
            for (let y = boxY; y < boxY + boxHeight; y++) {
                for (let x = boxX; x < boxX + boxWidth; x++) {
                    const color = Jimp.intToRGBA(cat.color);
                    const yRatio = (y - boxY) / boxHeight;
                    const alpha = Math.round(200 - (yRatio * 80));
                    image.setPixelColor(Jimp.rgbaToInt(
                        Math.round(color.r * 0.8),
                        Math.round(color.g * 0.8),
                        Math.round(color.b * 0.8),
                        alpha
                    ), x, y);
                }
            }

            // Category achievements
            const catAchievements = mainAchievements.filter(a => a.category === cat.key);
            const catUnlocked = catAchievements.filter(a => a.unlocked).length;
            const catTotal = catAchievements.length;

            // Print category name with count
            image.print(fontSmall, boxX + 8, boxY + 6, `${cat.name} (${catUnlocked}/${catTotal})`);

            // List achievements with checkmarks
            let yOffset = boxY + 28;
            for (const ach of catAchievements) {
                const checkmark = ach.unlocked ? '✓' : '○';
                const achName = ach.name.replace(/[^\w\s']/g, '').trim().substring(0, 20);
                const displayText = `${checkmark} ${achName}`;
                image.print(fontSmall, boxX + 8, yOffset, displayText);
                yOffset += 20;
            }
        }

        // Next Achievements Section
        const nextX = startX;
        const nextY = 335;
        const nextWidth = (boxWidth * 4) + (spacing * 3);
        const nextHeight = 85;

        // Next section background (purple gradient)
        for (let y = nextY; y < nextY + nextHeight; y++) {
            for (let x = nextX; x < nextX + nextWidth; x++) {
                const yRatio = (y - nextY) / nextHeight;
                image.setPixelColor(Jimp.rgbaToInt(
                    Math.round(100 - yRatio * 20),
                    Math.round(60 - yRatio * 10),
                    Math.round(140 - yRatio * 20),
                    220
                ), x, y);
            }
        }

        // Next section header
        image.print(fontSmall, nextX + 10, nextY + 8, '🎯 NEXT ACHIEVEMENTS TO UNLOCK');

        // Get next achievements (first unlocked in each category)
        const nextAchievements = [];
        for (const cat of categories) {
            const catAchs = mainAchievements.filter(a => a.category === cat.key && !a.unlocked);
            if (catAchs.length > 0) {
                const next = catAchs.sort((a, b) => (a.tier || 0) - (b.tier || 0))[0];
                nextAchievements.push({ ...next, catName: cat.name });
            }
        }

        // Display next achievements
        let nextOffset = nextX + 10;
        const nextRow1Y = nextY + 35;
        const nextRow2Y = nextY + 55;

        for (let i = 0; i < Math.min(nextAchievements.length, 4); i++) {
            const next = nextAchievements[i];
            const achName = next.name.replace(/[^\w\s']/g, '').trim();
            const progressText = `${next.progress}/${next.max}`;

            // Achievement box
            const achBoxWidth = 210;

            image.print(fontSmall, nextOffset, nextRow1Y, `${achName}`);
            image.print(fontSmall, nextOffset, nextRow2Y, `Progress: ${progressText}`);

            nextOffset += achBoxWidth + spacing;
        }

        if (nextAchievements.length === 0) {
            image.print(fontSmall, nextX + 10, nextRow1Y, 'All achievements unlocked! Congratulations!');
        }

        // Footer stats
        const footerY = 435;

        // Stats boxes
        const statBoxWidth = 280;
        const statBoxHeight = 50;

        // XP Box
        for (let y = footerY; y < footerY + statBoxHeight; y++) {
            for (let x = startX; x < startX + statBoxWidth; x++) {
                image.setPixelColor(Jimp.rgbaToInt(40, 35, 60, 200), x, y);
            }
        }
        image.print(fontSmall, startX + 10, footerY + 8, '💰 XP FROM ACHIEVEMENTS');
        image.print(fontMedium, startX + 10, footerY + 25, `${stats.totalXP || 0} XP`);

        // Rarest Box
        for (let y = footerY; y < footerY + statBoxHeight; y++) {
            for (let x = startX + statBoxWidth + spacing; x < startX + (statBoxWidth * 2) + spacing; x++) {
                image.setPixelColor(Jimp.rgbaToInt(60, 35, 50, 200), x, y);
            }
        }
        image.print(fontSmall, startX + statBoxWidth + spacing + 10, footerY + 8, '👑 HIGHEST ACHIEVEMENT');
        const rarestText = (stats.rarest || 'None yet').substring(0, 15);
        image.print(fontMedium, startX + statBoxWidth + spacing + 10, footerY + 25, rarestText);

        // Date Box
        for (let y = footerY; y < footerY + statBoxHeight; y++) {
            for (let x = startX + (statBoxWidth * 2) + (spacing * 2); x < startX + (statBoxWidth * 3) + (spacing * 2); x++) {
                image.setPixelColor(Jimp.rgbaToInt(35, 50, 60, 200), x, y);
            }
        }
        const date = new Date().toLocaleDateString('en-US', { dateStyle: 'medium' });
        image.print(fontSmall, startX + (statBoxWidth * 2) + (spacing * 2) + 10, footerY + 8, '📅 GENERATED');
        image.print(fontMedium, startX + (statBoxWidth * 2) + (spacing * 2) + 10, footerY + 25, date);

        const buffer = await image.getBufferAsync(Jimp.MIME_PNG);
        return new AttachmentBuilder(buffer, { name: 'achievements.png' });

    } catch (error) {
        console.error('Achievement card error:', error);
        return null;
    }
}

module.exports = { createWelcomeImage, createLeaveImage, createInviteImage, createAchievementCard };

