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
 * Uses ASCII-only characters for Jimp font compatibility
 */
async function createAchievementCard(user, achievements, stats) {
    try {
        const width = 900;
        const height = 450;
        const image = new Jimp(width, height);

        // Dark gradient background
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const ratio = y / height;
                const r = Math.round(20 + ratio * 10);
                const g = Math.round(15 + ratio * 10);
                const b = Math.round(35 + ratio * 15);
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
        const avatarSize = 80;
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
        image.print(fontMedium, 120, 30, username);

        // Achievement count
        const unlocked = mainAchievements.filter(a => a.unlocked).length;
        const total = mainAchievements.length;
        image.print(fontSmall, 120, 70, `${unlocked} of ${total} Achievements Unlocked`);

        // Progress bar
        const barX = 25;
        const barY = 110;
        const barWidth = 850;
        const barHeight = 18;
        const progress = unlocked / total;

        // Bar background
        for (let y = barY; y < barY + barHeight; y++) {
            for (let x = barX; x < barX + barWidth; x++) {
                image.setPixelColor(Jimp.rgbaToInt(40, 40, 60, 255), x, y);
            }
        }

        // Progress fill (gold)
        const progressWidth = Math.floor(barWidth * progress);
        for (let y = barY; y < barY + barHeight; y++) {
            for (let x = barX; x < barX + progressWidth; x++) {
                image.setPixelColor(Jimp.rgbaToInt(255, 200, 50, 255), x, y);
            }
        }

        // Category setup
        const categories = [
            { name: 'MESSAGES', color: { r: 52, g: 152, b: 219 }, key: 'messages' },
            { name: 'VOICE', color: { r: 46, g: 204, b: 113 }, key: 'voice' },
            { name: 'LEVEL', color: { r: 231, g: 76, b: 60 }, key: 'level' },
            { name: 'INVITES', color: { r: 155, g: 89, b: 182 }, key: 'invites' }
        ];

        const boxWidth = 210;
        const boxHeight = 140;
        const boxY = 145;
        const spacing = 10;
        const startX = 25;

        for (let i = 0; i < categories.length; i++) {
            const cat = categories[i];
            const boxX = startX + i * (boxWidth + spacing);

            // Box background with gradient
            for (let y = boxY; y < boxY + boxHeight; y++) {
                for (let x = boxX; x < boxX + boxWidth; x++) {
                    const yRatio = (y - boxY) / boxHeight;
                    const darken = 1 - (yRatio * 0.3);
                    image.setPixelColor(Jimp.rgbaToInt(
                        Math.round(cat.color.r * darken),
                        Math.round(cat.color.g * darken),
                        Math.round(cat.color.b * darken),
                        255
                    ), x, y);
                }
            }

            // Category achievements
            const catAchievements = mainAchievements.filter(a => a.category === cat.key);
            const catUnlocked = catAchievements.filter(a => a.unlocked).length;
            const catTotal = catAchievements.length;

            // Header with count
            image.print(fontSmall, boxX + 10, boxY + 8, `${cat.name} (${catUnlocked}/${catTotal})`);

            // Draw achievement indicators (small squares)
            const indicatorY = boxY + 35;
            const indicatorSize = 16;
            const indicatorSpacing = 22;

            for (let j = 0; j < catTotal; j++) {
                const indicatorX = boxX + 10 + (j * indicatorSpacing);
                const isUnlocked = catAchievements[j]?.unlocked;

                // Draw square indicator
                for (let py = indicatorY; py < indicatorY + indicatorSize; py++) {
                    for (let px = indicatorX; px < indicatorX + indicatorSize; px++) {
                        if (isUnlocked) {
                            image.setPixelColor(0xFFD700FF, px, py); // Gold for unlocked
                        } else {
                            image.setPixelColor(0x2A2A3AFF, px, py); // Dark for locked
                        }
                    }
                }
            }

            // Achievement names (shortened)
            let nameY = boxY + 60;
            for (const ach of catAchievements.slice(0, 4)) {
                const status = ach.unlocked ? '[X]' : '[ ]';
                const name = ach.name.replace(/[^\w\s']/g, '').trim().substring(0, 14);
                image.print(fontSmall, boxX + 10, nameY, `${status} ${name}`);
                nameY += 18;
            }
        }

        // Next Achievement Section
        const nextY = 300;
        const nextHeight = 55;

        // Next section background
        for (let y = nextY; y < nextY + nextHeight; y++) {
            for (let x = startX; x < startX + barWidth; x++) {
                image.setPixelColor(Jimp.rgbaToInt(50, 40, 70, 255), x, y);
            }
        }

        // Get next achievements
        const nextAchievements = [];
        for (const cat of categories) {
            const next = mainAchievements.find(a => a.category === cat.key && !a.unlocked);
            if (next) nextAchievements.push(next);
        }

        image.print(fontSmall, startX + 10, nextY + 8, 'NEXT TO UNLOCK:');

        // Display next achievements in a row
        let nextX = startX + 140;
        for (const next of nextAchievements.slice(0, 4)) {
            const name = next.name.replace(/[^\w\s']/g, '').trim().substring(0, 12);
            const prog = `${next.progress || 0}/${next.max || 1}`;
            image.print(fontSmall, nextX, nextY + 8, name);
            image.print(fontSmall, nextX, nextY + 28, prog);
            nextX += 175;
        }

        // Footer stats
        const footerY = 370;
        const statBoxWidth = 280;
        const statBoxHeight = 55;

        // XP Box
        for (let y = footerY; y < footerY + statBoxHeight; y++) {
            for (let x = startX; x < startX + statBoxWidth; x++) {
                image.setPixelColor(Jimp.rgbaToInt(60, 50, 80, 255), x, y);
            }
        }
        image.print(fontSmall, startX + 10, footerY + 5, 'TOTAL XP');
        image.print(fontMedium, startX + 10, footerY + 22, `${stats.totalXP || 0}`);

        // Highest Achievement Box
        for (let y = footerY; y < footerY + statBoxHeight; y++) {
            for (let x = startX + statBoxWidth + spacing; x < startX + (statBoxWidth * 2) + spacing; x++) {
                image.setPixelColor(Jimp.rgbaToInt(70, 50, 70, 255), x, y);
            }
        }
        image.print(fontSmall, startX + statBoxWidth + spacing + 10, footerY + 5, 'HIGHEST');
        const rarestText = (stats.rarest || 'None').substring(0, 14);
        image.print(fontMedium, startX + statBoxWidth + spacing + 10, footerY + 22, rarestText);

        // Date Box
        for (let y = footerY; y < footerY + statBoxHeight; y++) {
            for (let x = startX + (statBoxWidth * 2) + (spacing * 2); x < startX + (statBoxWidth * 3) + (spacing * 2); x++) {
                image.setPixelColor(Jimp.rgbaToInt(50, 60, 70, 255), x, y);
            }
        }
        const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        image.print(fontSmall, startX + (statBoxWidth * 2) + (spacing * 2) + 10, footerY + 5, 'GENERATED');
        image.print(fontMedium, startX + (statBoxWidth * 2) + (spacing * 2) + 10, footerY + 22, date);

        const buffer = await image.getBufferAsync(Jimp.MIME_PNG);
        return new AttachmentBuilder(buffer, { name: 'achievements.png' });

    } catch (error) {
        console.error('Achievement card error:', error);
        return null;
    }
}

module.exports = { createWelcomeImage, createLeaveImage, createInviteImage, createAchievementCard };
