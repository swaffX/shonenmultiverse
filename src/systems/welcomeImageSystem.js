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

        const fontLarge = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
        const fontMedium = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);

        image.print(fontLarge, 40, 60, 'WELCOME');
        const username = member.user.displayName || member.user.username;
        image.print(fontMedium, 40, 140, username);

        const avatarSize = 120;
        const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true });
        const avatar = await Jimp.read(avatarUrl);
        avatar.resize(avatarSize, avatarSize);
        avatar.circle();

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
 * Creates a goodbye image
 */
async function createLeaveImage(member) {
    try {
        const width = 800;
        const height = 250;
        const image = new Jimp(width, height);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const ratio = (x + y) / (width + height);
                const r = Math.round(239 + (168 - 239) * ratio);
                const g = Math.round(68 + (85 - 68) * ratio);
                const b = Math.round(68 + (247 - 68) * ratio);
                image.setPixelColor(Jimp.rgbaToInt(r, g, b, 255), x, y);
            }
        }

        const fontLarge = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
        const fontMedium = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);

        image.print(fontLarge, 40, 60, 'GOODBYE');
        const username = member.user.displayName || member.user.username;
        image.print(fontMedium, 40, 140, username);

        const avatarSize = 120;
        const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true });
        const avatar = await Jimp.read(avatarUrl);
        avatar.resize(avatarSize, avatarSize);
        avatar.greyscale();
        avatar.circle();

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
 * Creates an invite image
 */
async function createInviteImage(user, inviterName = '') {
    try {
        const width = 800;
        const height = 250;
        const image = new Jimp(width, height);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const ratio = (x + y) / (width + height);
                const r = Math.round(34 + (20 - 34) * ratio);
                const g = Math.round(197 + (184 - 197) * ratio);
                const b = Math.round(94 + (166 - 94) * ratio);
                image.setPixelColor(Jimp.rgbaToInt(r, g, b, 255), x, y);
            }
        }

        const fontLarge = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
        const fontMedium = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
        const fontSmall = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);

        image.print(fontLarge, 40, 50, 'NEW INVITE');
        const username = user.displayName || user.username;
        image.print(fontMedium, 40, 130, username);
        if (inviterName) {
            image.print(fontSmall, 40, 180, `Invited by: ${inviterName}`);
        }

        const avatarSize = 120;
        const avatarUrl = user.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true });
        const avatar = await Jimp.read(avatarUrl);
        avatar.resize(avatarSize, avatarSize);
        avatar.circle();

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
 * Draw a glassmorphism box with border
 */
function drawGlassBox(image, x, y, w, h, borderColor, alpha = 40) {
    const borderWidth = 2;

    // Draw border (brighter edge)
    for (let py = y; py < y + h; py++) {
        for (let px = x; px < x + w; px++) {
            // Check if on border
            if (px < x + borderWidth || px >= x + w - borderWidth ||
                py < y + borderWidth || py >= y + h - borderWidth) {
                image.setPixelColor(borderColor, px, py);
            } else {
                // Inner glass effect - semi-transparent white overlay
                const yRatio = (py - y) / h;
                const glassAlpha = Math.round(alpha - (yRatio * 15));
                image.setPixelColor(Jimp.rgbaToInt(255, 255, 255, glassAlpha), px, py);
            }
        }
    }
}

/**
 * Draw rounded progress bar
 */
function drawProgressBar(image, x, y, w, h, progress, bgColor, fillColor) {
    const radius = h / 2;

    // Draw background
    for (let py = y; py < y + h; py++) {
        for (let px = x; px < x + w; px++) {
            // Simple rounded corners check
            const leftCenter = x + radius;
            const rightCenter = x + w - radius;

            let isInside = false;
            if (px < leftCenter) {
                // Check left circle
                const dx = px - leftCenter;
                const dy = py - (y + radius);
                isInside = (dx * dx + dy * dy) <= radius * radius;
            } else if (px > rightCenter) {
                // Check right circle
                const dx = px - rightCenter;
                const dy = py - (y + radius);
                isInside = (dx * dx + dy * dy) <= radius * radius;
            } else {
                isInside = true;
            }

            if (isInside) {
                image.setPixelColor(bgColor, px, py);
            }
        }
    }

    // Draw fill
    const fillWidth = Math.floor((w - 4) * progress);
    const fillX = x + 2;
    const fillY = y + 2;
    const fillH = h - 4;
    const fillRadius = fillH / 2;

    for (let py = fillY; py < fillY + fillH; py++) {
        for (let px = fillX; px < fillX + fillWidth; px++) {
            const leftCenter = fillX + fillRadius;
            const rightCenter = fillX + fillWidth - fillRadius;

            let isInside = false;
            if (px < leftCenter) {
                const dx = px - leftCenter;
                const dy = py - (fillY + fillRadius);
                isInside = (dx * dx + dy * dy) <= fillRadius * fillRadius;
            } else if (px > rightCenter && fillWidth > fillRadius * 2) {
                const dx = px - rightCenter;
                const dy = py - (fillY + fillRadius);
                isInside = (dx * dx + dy * dy) <= fillRadius * fillRadius;
            } else {
                isInside = true;
            }

            if (isInside) {
                // Gradient fill
                const ratio = (px - fillX) / fillWidth;
                const r = Math.round(255 - ratio * 50);
                const g = Math.round(180 + ratio * 40);
                const b = Math.round(50 + ratio * 50);
                image.setPixelColor(Jimp.rgbaToInt(r, g, b, 255), px, py);
            }
        }
    }
}

/**
 * Creates a modern glassmorphism achievement card
 */
async function createAchievementCard(user, achievements, stats) {
    try {
        const width = 900;
        const height = 480;
        const image = new Jimp(width, height);

        // Beautiful gradient background (dark purple to blue)
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const xRatio = x / width;
                const yRatio = y / height;
                const ratio = (xRatio + yRatio) / 2;

                const r = Math.round(15 + ratio * 25);
                const g = Math.round(10 + ratio * 20);
                const b = Math.round(40 + ratio * 40);
                image.setPixelColor(Jimp.rgbaToInt(r, g, b, 255), x, y);
            }
        }

        // Load fonts
        const fontLarge = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
        const fontMedium = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
        const fontSmall = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);

        const mainAchievements = achievements.filter(a => a.category !== 'special');

        // Header glass panel
        drawGlassBox(image, 20, 15, 860, 90, 0x4A90D9AA, 30);

        // Avatar
        const avatarSize = 70;
        const avatarUrl = user.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true });
        const avatar = await Jimp.read(avatarUrl);
        avatar.resize(avatarSize, avatarSize);
        avatar.circle();

        // Avatar glow border
        const borderSize = avatarSize + 6;
        const border = new Jimp(borderSize, borderSize, 0xFFD700FF);
        border.circle();

        image.composite(border, 35 - 3, 25 - 3);
        image.composite(avatar, 35, 25);

        // Username and stats
        const username = user.displayName || user.username;
        image.print(fontMedium, 120, 28, username);

        const unlocked = mainAchievements.filter(a => a.unlocked).length;
        const total = mainAchievements.length;
        image.print(fontSmall, 120, 68, `${unlocked} / ${total} Achievements Completed`);

        // Progress percentage on right
        const percentage = Math.round((unlocked / total) * 100);
        image.print(fontMedium, 780, 40, `${percentage}%`);

        // Progress bar with glow effect
        drawProgressBar(image, 20, 115, 860, 22, unlocked / total, 0x1A1A2EFF, 0xFFD700FF);

        // Category cards
        const categories = [
            { name: 'MESSAGES', border: 0x60A5FAFF, key: 'messages' },
            { name: 'VOICE', border: 0x34D399FF, key: 'voice' },
            { name: 'LEVEL', border: 0xF87171FF, key: 'level' },
            { name: 'INVITES', border: 0xA78BFAFF, key: 'invites' }
        ];

        const cardWidth = 205;
        const cardHeight = 155;
        const cardY = 150;
        const cardSpacing = 12;
        const startX = 20;

        for (let i = 0; i < categories.length; i++) {
            const cat = categories[i];
            const cardX = startX + i * (cardWidth + cardSpacing);

            // Draw glass card with colored border
            drawGlassBox(image, cardX, cardY, cardWidth, cardHeight, cat.border, 35);

            const catAchievements = mainAchievements.filter(a => a.category === cat.key);
            const catUnlocked = catAchievements.filter(a => a.unlocked).length;
            const catTotal = catAchievements.length;

            // Category title
            image.print(fontSmall, cardX + 12, cardY + 10, cat.name);
            image.print(fontSmall, cardX + cardWidth - 45, cardY + 10, `${catUnlocked}/${catTotal}`);

            // Separator line
            for (let px = cardX + 10; px < cardX + cardWidth - 10; px++) {
                image.setPixelColor(0xFFFFFF44, px, cardY + 32);
            }

            // Achievement list with dots
            let itemY = cardY + 42;
            for (const ach of catAchievements.slice(0, 4)) {
                // Status dot
                const dotColor = ach.unlocked ? 0xFFD700FF : 0x444466FF;
                for (let dy = -4; dy <= 4; dy++) {
                    for (let dx = -4; dx <= 4; dx++) {
                        if (dx * dx + dy * dy <= 16) {
                            image.setPixelColor(dotColor, cardX + 18 + dx, itemY + 8 + dy);
                        }
                    }
                }

                // Achievement name
                const name = ach.name.replace(/[^\w\s']/g, '').trim().substring(0, 15);
                image.print(fontSmall, cardX + 30, itemY, name);
                itemY += 26;
            }
        }

        // Next achievements panel
        const nextY = 320;
        const nextHeight = 65;
        drawGlassBox(image, 20, nextY, 860, nextHeight, 0x8B5CF6AA, 25);

        image.print(fontSmall, 35, nextY + 10, 'UP NEXT');

        // Get next achievements
        const nextAchievements = [];
        for (const cat of categories) {
            const next = mainAchievements.find(a => a.category === cat.key && !a.unlocked);
            if (next) nextAchievements.push(next);
        }

        let nextX = 120;
        for (const next of nextAchievements.slice(0, 4)) {
            const name = next.name.replace(/[^\w\s']/g, '').trim().substring(0, 12);
            const prog = `${next.progress || 0}/${next.max || 1}`;

            // Small divider
            for (let py = nextY + 15; py < nextY + nextHeight - 15; py++) {
                image.setPixelColor(0xFFFFFF33, nextX - 15, py);
            }

            image.print(fontSmall, nextX, nextY + 12, name);
            image.print(fontSmall, nextX, nextY + 35, prog);
            nextX += 185;
        }

        // Footer stats
        const footerY = 400;
        const statWidth = 275;
        const statHeight = 60;

        // XP Box
        drawGlassBox(image, 20, footerY, statWidth, statHeight, 0x6366F1AA, 30);
        image.print(fontSmall, 35, footerY + 8, 'TOTAL XP EARNED');
        image.print(fontMedium, 35, footerY + 26, `${stats.totalXP || 0}`);

        // Highest Box
        drawGlassBox(image, 20 + statWidth + cardSpacing, footerY, statWidth, statHeight, 0xEC4899AA, 30);
        image.print(fontSmall, 35 + statWidth + cardSpacing, footerY + 8, 'BEST ACHIEVEMENT');
        const rarestText = (stats.rarest || 'None').substring(0, 14);
        image.print(fontMedium, 35 + statWidth + cardSpacing, footerY + 26, rarestText);

        // Date Box
        drawGlassBox(image, 20 + (statWidth + cardSpacing) * 2, footerY, statWidth, statHeight, 0x14B8A6AA, 30);
        const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        image.print(fontSmall, 35 + (statWidth + cardSpacing) * 2, footerY + 8, 'GENERATED ON');
        image.print(fontMedium, 35 + (statWidth + cardSpacing) * 2, footerY + 26, date);

        const buffer = await image.getBufferAsync(Jimp.MIME_PNG);
        return new AttachmentBuilder(buffer, { name: 'achievements.png' });

    } catch (error) {
        console.error('Achievement card error:', error);
        return null;
    }
}

module.exports = { createWelcomeImage, createLeaveImage, createInviteImage, createAchievementCard };
