#!/bin/bash
# Auto-deploy script for Shonen Multiverse Bot
# This script pulls latest changes from GitHub and restarts the bot

cd /root/shonenmultiverse

echo "📥 Pulling latest changes from GitHub..."
git pull origin main

echo "📦 Installing dependencies..."
npm install --production

echo "🔄 Restarting bot..."
pm2 restart shonen-multiverse-bot

echo "✅ Deployment complete!"
pm2 status
