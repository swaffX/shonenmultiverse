/**
 * Format duration from minutes to human readable
 */
function formatDuration(minutes) {
    if (!minutes || minutes === 0) return '0m';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours < 24) return `${hours}h ${mins}m`;
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
}

/**
 * Calculate required XP for a level
 */
function getRequiredXP(level) {
    return Math.floor(100 * Math.pow(level, 1.5));
}

/**
 * Calculate level from XP
 */
function getLevelFromXP(xp) {
    let level = 1;
    let tempXp = xp;
    while (tempXp >= getRequiredXP(level)) {
        tempXp -= getRequiredXP(level);
        level++;
    }
    return level;
}

/**
 * Calculate total XP needed to reach a level
 */
function sumXPToLevel(level) {
    let total = 0;
    for (let i = 1; i <= level; i++) {
        total += getRequiredXP(i);
    }
    return total;
}

/**
 * Get ISO week number
 */
function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

module.exports = {
    formatDuration,
    getRequiredXP,
    getLevelFromXP,
    sumXPToLevel,
    getWeekNumber
};
