#!/bin/bash

# Define Domain
DOMAIN="194.105.5.37.nip.io"
EMAIL="admin@shonenmultiverse.com"

echo "🚀 Starting Permanent HTTPS Setup for $DOMAIN..."

# 1. Install Nginx and Certbot
echo "📦 Installing Nginx and Certbot..."
apt-get update
apt-get install -y nginx certbot python3-certbot-nginx

# 2. Configure Nginx
echo "⚙️  Configuring Nginx Proxy..."
cat > /etc/nginx/sites-available/shonen-bot <<EOF
server {
    server_name $DOMAIN;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable Site
ln -s /etc/nginx/sites-available/shonen-bot /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# 3. Obtain SSL Certificate
echo "🔒 Obtaining SSL Certificate (Let's Encrypt)..."
certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m $EMAIL --redirect

echo "
✅ Setup Complete!
--------------------------------------------------
Your Permanent URL is: https://$DOMAIN/auth/roblox/callback
--------------------------------------------------
"
