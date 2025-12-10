const Jimp = require('jimp');
const { AttachmentBuilder } = require('discord.js');
const path = require('path');

/**
 * Create a visual rank card for a user
 * @param {Object} user - Discord user object
 * @param {Object} rankData - Data from getUserRank()
 */
async function createRankCard(user, rankData) {
    try {
        const width = 934;
        const height = 282;

        // Create base image (Deep dark theme)
        const image = new Jimp(width, height, '#23272A');

        // Dark Overlay for texture
        const overlay = new Jimp(width, height, '#000000');
        overlay.opacity(0.4);
        image.composite(overlay, 0, 0);

        // Load Avatar
        const avatarUrl = user.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true });
        const avatar = await Jimp.read(avatarUrl);

        // Circle Mask for Avatar
        avatar.resize(180, 180);
        const mask = new Jimp(180, 180, '#000000');
        mask.circle();
        avatar.mask(mask, 0, 0);

        // Place Avatar
        image.composite(avatar, 40, 50);

        // Status Indicator (Online/DND/Idle - simplified to just a green ring if online is hard to detect smoothly, 
        // but for now let's add a decorative ring)
        // const ring = new Jimp(190, 190);
        // ... (Skipping complex ring for stability, clean look is better)

        // Load Fonts
        const fontName = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
        const fontSmall = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
        const fontXp = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);

        // Required XP and Progress
        const currentXP = rankData.progressXP;
        const requiredXP = rankData.neededXP; // XP needed for NEXT level (total)
        const totalRequiredForLevel = rankData.neededXP + rankData.progressXP; // Approximate total for bar
        // Correction: rankData.neededXP is "XP remaining to next level" or "Total XP for next level"? 
        // Let's assume standard rankData from levelSystem:
        // progressXP = user.xp - currentLevelXP;
        // neededXP = nextLevelXP - currentLevelXP;
        // So percentage is correct.

        const percentage = Math.min(Math.max(rankData.percentage, 0), 100);

        // Draw Progress Bar Background
        const barX = 250;
        const barY = 180;
        const barWidth = 600;
        const barHeight = 40;
        const barRadius = 20;

        // Draw nice rounded rectangle manually or use scanlines? Jimp is limited.
        // We will draw a simple rectangle for reliability.
        const barBg = new Jimp(barWidth, barHeight, '#484B4E');
        image.composite(barBg, barX, barY);

        // Draw Progress
        const progressWidth = Math.floor((percentage / 100) * barWidth);
        if (progressWidth > 0) {
            const progressBar = new Jimp(progressWidth, barHeight, '#00D166'); // Green success color
            image.composite(progressBar, barX, barY);
        }

        // Text: Username
        image.print(fontName, 250, 80, user.username);

        // Text: Rank and Level
        const rankText = `RANK #${rankData.rank}`;
        const levelText = `LEVEL ${rankData.user.level}`;

        // Right align level text
        const levelWidth = Jimp.measureText(fontName, levelText);
        image.print(fontName, width - levelWidth - 50, 50, levelText);

        // Rank text smaller below level or beside?
        image.print(fontSmall, width - levelWidth - 50, 120, rankText);

        // XP Text centered on bar or above?
        const xpText = `${formatNumber(currentXP)} / ${formatNumber(requiredXP)} XP`;
        image.print(fontSmall, 250, 140, xpText);

        const buffer = await image.getBufferAsync(Jimp.MIME_PNG);
        return new AttachmentBuilder(buffer, { name: 'rank.png' });

    } catch (error) {
        console.error('Error generating rank card:', error);
        return null;
    }
}

function formatNumber(num) {
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
}

module.exports = { createRankCard };
