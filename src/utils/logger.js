const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, '..', '..', 'logs');

// Ensure logs directory exists
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Format date for log
function formatDate(date = new Date()) {
    return date.toISOString().replace('T', ' ').substr(0, 19);
}

// Get log file path for today
function getLogFilePath() {
    const today = new Date().toISOString().split('T')[0];
    return path.join(logsDir, `${today}.log`);
}

// Write to log file
function writeToFile(level, message) {
    const logPath = getLogFilePath();
    const logEntry = `[${formatDate()}] [${level}] ${message}\n`;

    fs.appendFile(logPath, logEntry, (err) => {
        if (err) console.error('Log dosyasına yazılamadı:', err);
    });
}

// Log levels
const logger = {
    info: (message) => {
        console.log(`[INFO] ${message}`);
        writeToFile('INFO', message);
    },

    warn: (message) => {
        console.warn(`[WARN] ${message}`);
        writeToFile('WARN', message);
    },

    error: (message, error = null) => {
        const errorMessage = error ? `${message}: ${error.message || error}` : message;
        console.error(`[ERROR] ${errorMessage}`);
        writeToFile('ERROR', errorMessage);

        if (error && error.stack) {
            writeToFile('ERROR', error.stack);
        }
    },

    debug: (message) => {
        if (process.env.NODE_ENV === 'development') {
            console.log(`[DEBUG] ${message}`);
            writeToFile('DEBUG', message);
        }
    },

    command: (commandName, userId, guildId) => {
        const message = `Command: ${commandName} | User: ${userId} | Guild: ${guildId}`;
        console.log(`[CMD] ${message}`);
        writeToFile('CMD', message);
    },

    moderation: (action, moderatorId, targetId, guildId, reason = null) => {
        const message = `${action} | Mod: ${moderatorId} | Target: ${targetId} | Guild: ${guildId}${reason ? ` | Reason: ${reason}` : ''}`;
        console.log(`[MOD] ${message}`);
        writeToFile('MOD', message);
    },

    security: (event, guildId, details = null) => {
        const message = `${event} | Guild: ${guildId}${details ? ` | Details: ${details}` : ''}`;
        console.warn(`[SECURITY] ${message}`);
        writeToFile('SECURITY', message);
    }
};

module.exports = logger;
