module.exports = {
    apps: [{
        name: 'shonen-multiverse-bot',
        script: 'src/index.js',
        instances: 1,
        autorestart: true,
        watch: false,
        max_memory_restart: '500M',
        env: {
            NODE_ENV: 'production'
        },
        error_file: './logs/pm2-error.log',
        out_file: './logs/pm2-out.log',
        log_date_format: 'YYYY-MM-DD HH:mm:ss',
        // Restart delay on crash
        restart_delay: 5000,
        // Max restarts before stopping
        max_restarts: 10,
        // Time window for max_restarts
        min_uptime: '10s'
    }]
};
