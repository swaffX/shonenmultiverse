const Jimp = require('jimp');
const { AttachmentBuilder } = require('discord.js');

/**
 * Creates a welcome image
 */
async function createWelcomeImage(member) {
    try {
        const width = 800;
        const height = 250;
        const image = new Jimp(width, height);

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
 * Check if point is inside rounded rect
 */
function isInsideRoundedRect(px, py, x, y, w, h, radius) {
    // Corner regions
    if (px < x + radius && py < y + radius) {
        // Top-left
        const dx = px - (x + radius);
        const dy = py - (y + radius);
        return dx * dx + dy * dy <= radius * radius;
    }
    if (px > x + w - radius && py < y + radius) {
        // Top-right
        const dx = px - (x + w - radius);
        const dy = py - (y + radius);
        return dx * dx + dy * dy <= radius * radius;
    }
    if (px < x + radius && py > y + h - radius) {
        // Bottom-left
        const dx = px - (x + radius);
        const dy = py - (y + h - radius);
        return dx * dx + dy * dy <= radius * radius;
    }
    if (px > x + w - radius && py > y + h - radius) {
        // Bottom-right
        const dx = px - (x + w - radius);
        const dy = py - (y + h - radius);
        return dx * dx + dy * dy <= radius * radius;
    }
    // Main rectangle areas
    return (px >= x && px < x + w && py >= y && py < y + h);
}

/**
 * Draw a rounded glass panel
 */
function drawRoundedPanel(image, x, y, w, h, radius, borderColor, fillR, fillG, fillB, fillAlpha) {
    const borderWidth = 2;

    for (let py = y; py < y + h; py++) {
        for (let px = x; px < x + w; px++) {
            if (!isInsideRoundedRect(px, py, x, y, w, h, radius)) continue;

            // Check if on border
            const onBorder = !isInsideRoundedRect(px, py, x + borderWidth, y + borderWidth,
                w - borderWidth * 2, h - borderWidth * 2,
                Math.max(0, radius - borderWidth));

            if (onBorder) {
                image.setPixelColor(borderColor, px, py);
            } else {
                // Get current pixel and blend
                const current = Jimp.intToRGBA(image.getPixelColor(px, py));
                const alpha = fillAlpha / 255;
                const newR = Math.round(current.r * (1 - alpha) + fillR * alpha);
                const newG = Math.round(current.g * (1 - alpha) + fillG * alpha);
                const newB = Math.round(current.b * (1 - alpha) + fillB * alpha);
                image.setPixelColor(Jimp.rgbaToInt(newR, newG, newB, 255), px, py);
            }
        }
    }
}

/**
 * Draw rounded progress bar
 */
function drawRoundedProgressBar(image, x, y, w, h, progress) {
    const radius = h / 2;

    // Background
    for (let py = y; py < y + h; py++) {
        for (let px = x; px < x + w; px++) {
            if (isInsideRoundedRect(px, py, x, y, w, h, radius)) {
                image.setPixelColor(Jimp.rgbaToInt(30, 30, 50, 255), px, py);
            }
        }
    }

    // Fill
    const fillW = Math.max(h, Math.floor(w * progress));
    for (let py = y + 2; py < y + h - 2; py++) {
        for (let px = x + 2; px < x + 2 + fillW - 4; px++) {
            if (isInsideRoundedRect(px, py, x + 2, y + 2, fillW - 4, h - 4, (h - 4) / 2)) {
                const ratio = (px - x) / w;
                const r = Math.round(255 - ratio * 30);
                const g = Math.round(180 + ratio * 40);
                const b = Math.round(50 + ratio * 80);
                image.setPixelColor(Jimp.rgbaToInt(r, g, b, 255), px, py);
            }
        }
    }
}

/**
 * Creates a modern achievement card with rounded panels
 */
async function createAchievementCard(user, achievements, stats) {
    try {
        const width = 900;
        const height = 440;
        const image = new Jimp(width, height);

        // Dark gradient background
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const ratio = (x * 0.3 + y * 0.7) / (width + height);
                const r = Math.round(18 + ratio * 15);
                const g = Math.round(12 + ratio * 12);
                const b = Math.round(35 + ratio * 25);
                image.setPixelColor(Jimp.rgbaToInt(r, g, b, 255), x, y);
            }
        }

        // Load fonts
        const fontMedium = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
        const fontSmall = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);

        const mainAchievements = achievements.filter(a => a.category !== 'special');
        const unlocked = mainAchievements.filter(a => a.unlocked).length;
        const total = mainAchievements.length;
        const percentage = Math.round((unlocked / total) * 100);

        // Header panel (rounded)
        drawRoundedPanel(image, 20, 15, 860, 85, 15, 0x5B6EAEFF, 40, 45, 80, 150);

        // Avatar
        const avatarSize = 65;
        const avatarUrl = user.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true });
        const avatar = await Jimp.read(avatarUrl);
        avatar.resize(avatarSize, avatarSize);
        avatar.circle();

        const borderSize = avatarSize + 5;
        const border = new Jimp(borderSize, borderSize, 0xFFD700FF);
        border.circle();

        image.composite(border, 35 - 2, 25 - 2);
        image.composite(avatar, 35, 25);

        // Username and stats
        const username = user.displayName || user.username;
        image.print(fontMedium, 115, 25, username);
        image.print(fontSmall, 115, 62, `${unlocked} / ${total} Achievements`);
        image.print(fontMedium, 800, 35, `${percentage}%`);

        // Progress bar
        drawRoundedProgressBar(image, 20, 108, 860, 18, unlocked / total);

        // Category cards
        const categories = [
            { name: 'MESSAGES', border: 0x60A5FAFF, key: 'messages' },
            { name: 'VOICE', border: 0x34D399FF, key: 'voice' },
            { name: 'LEVEL', border: 0xF87171FF, key: 'level' },
            { name: 'INVITES', border: 0xA78BFAFF, key: 'invites' }
        ];

        const cardW = 205;
        const cardH = 145;
        const cardY = 138;
        const cardSpacing = 12;

        for (let i = 0; i < categories.length; i++) {
            const cat = categories[i];
            const cardX = 20 + i * (cardW + cardSpacing);

            drawRoundedPanel(image, cardX, cardY, cardW, cardH, 12, cat.border, 35, 40, 70, 180);

            const catAchievements = mainAchievements.filter(a => a.category === cat.key);
            const catUnlocked = catAchievements.filter(a => a.unlocked).length;
            const catTotal = catAchievements.length;

            image.print(fontSmall, cardX + 12, cardY + 10, `${cat.name} (${catUnlocked}/${catTotal})`);

            // Achievement items
            let itemY = cardY + 38;
            for (const ach of catAchievements.slice(0, 4)) {
                // Status dot
                const dotColor = ach.unlocked ? 0xFFD700FF : 0x3A3A5AFF;
                const dotX = cardX + 18;
                const dotY = itemY + 7;
                for (let dy = -5; dy <= 5; dy++) {
                    for (let dx = -5; dx <= 5; dx++) {
                        if (dx * dx + dy * dy <= 25) {
                            image.setPixelColor(dotColor, dotX + dx, dotY + dy);
                        }
                    }
                }

                const name = ach.name.replace(/[^\w\s']/g, '').trim().substring(0, 14);
                image.print(fontSmall, cardX + 32, itemY, name);
                itemY += 24;
            }
        }

        // Next achievements panel
        const nextY = 295;
        drawRoundedPanel(image, 20, nextY, 860, 55, 12, 0x8B5CF6FF, 50, 40, 80, 160);

        image.print(fontSmall, 35, nextY + 18, 'NEXT:');

        const nextAchievements = [];
        for (const cat of categories) {
            const next = mainAchievements.find(a => a.category === cat.key && !a.unlocked);
            if (next) nextAchievements.push(next);
        }

        let nextX = 100;
        for (const next of nextAchievements.slice(0, 4)) {
            const name = next.name.replace(/[^\w\s']/g, '').trim().substring(0, 12);
            const prog = `${next.progress || 0}/${next.max || 1}`;
            image.print(fontSmall, nextX, nextY + 10, name);
            image.print(fontSmall, nextX, nextY + 30, prog);
            nextX += 195;
        }

        // Footer - only 2 boxes
        const footerY = 365;
        const statW = 420;
        const statH = 55;

        // XP Box
        drawRoundedPanel(image, 20, footerY, statW, statH, 12, 0x6366F1FF, 45, 40, 90, 170);
        image.print(fontSmall, 35, footerY + 8, 'TOTAL XP EARNED');
        image.print(fontMedium, 35, footerY + 24, `${stats.totalXP || 0}`);

        // Best Achievement Box
        drawRoundedPanel(image, 20 + statW + cardSpacing, footerY, statW, statH, 12, 0xEC4899FF, 70, 40, 70, 170);
        image.print(fontSmall, 35 + statW + cardSpacing, footerY + 8, 'BEST ACHIEVEMENT');
        const rarestText = (stats.rarest || 'None yet').substring(0, 18);
        image.print(fontMedium, 35 + statW + cardSpacing, footerY + 24, rarestText);

        const buffer = await image.getBufferAsync(Jimp.MIME_PNG);
        return new AttachmentBuilder(buffer, { name: 'achievements.png' });

    } catch (error) {
        console.error('Achievement card error:', error);
        return null;
    }
}

module.exports = { createWelcomeImage, createLeaveImage, createInviteImage, createAchievementCard };
