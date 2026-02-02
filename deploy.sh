#!/bin/bash
set -e

echo "🦀 ClawHub Deployment Script"
echo "============================"

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo "❌ Don't run as root. Create a regular user first."
    exit 1
fi

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "✅ Node.js already installed: $(node --version)"
fi

# Install PM2
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    sudo npm install -g pm2
else
    echo "✅ PM2 already installed"
fi

# Create app directory
APP_DIR="/opt/clawhub"
echo "📁 Setting up directory: $APP_DIR"
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR

# Clone or update repo
if [ ! -d "$APP_DIR/.git" ]; then
    echo "📥 Cloning ClawHub repository..."
    git clone https://github.com/ClawHub-core/ClawHub.git $APP_DIR
else
    echo "🔄 Updating existing repository..."
    cd $APP_DIR && git pull origin main
fi

cd $APP_DIR

# Install dependencies and build
echo "📦 Installing dependencies..."
npm install

echo "🏗️ Building application..."
npm run build

# Stop existing PM2 process if running
if pm2 describe clawhub > /dev/null 2>&1; then
    echo "🛑 Stopping existing ClawHub process..."
    pm2 stop clawhub
    pm2 delete clawhub
fi

# Start with PM2
echo "🚀 Starting ClawHub with PM2..."
pm2 start dist/server.js --name clawhub

# Configure PM2 to restart on boot
pm2 startup > /tmp/pm2-startup.sh 2>/dev/null || true
if [ -f /tmp/pm2-startup.sh ]; then
    sudo bash /tmp/pm2-startup.sh
    rm /tmp/pm2-startup.sh
fi
pm2 save

# Install and configure nginx
if ! command -v nginx &> /dev/null; then
    echo "📦 Installing nginx..."
    sudo apt install -y nginx
    
    # Create nginx config
    sudo tee /etc/nginx/sites-available/clawhub > /dev/null <<EOF
server {
    listen 80;
    server_name _;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
    
    # Enable site
    sudo ln -sf /etc/nginx/sites-available/clawhub /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    sudo nginx -t && sudo systemctl reload nginx
    
    echo "✅ Nginx configured"
else
    echo "✅ Nginx already installed"
fi

# Configure firewall
if command -v ufw &> /dev/null; then
    sudo ufw allow 80
    sudo ufw allow 443
    sudo ufw allow 22
    echo "✅ Firewall configured"
fi

# Get server IP
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo "localhost")

echo ""
echo "🎉 ClawHub deployment complete!"
echo "================================"
echo "🌐 Web Interface: http://$SERVER_IP"
echo "🔌 API Endpoint: http://$SERVER_IP/api/v1"
echo "❤️ Health Check: http://$SERVER_IP/health"
echo ""
echo "📊 Server Status:"
pm2 status clawhub
echo ""
echo "🔍 View Logs: pm2 logs clawhub"
echo "🔄 Restart: pm2 restart clawhub"
echo "🛑 Stop: pm2 stop clawhub"
echo ""
echo "🦀 ClawHub is now running! Ready for agent registration."
echo "   Visit the web interface to start publishing skills!"