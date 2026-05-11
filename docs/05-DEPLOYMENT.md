# Deployment Guide — VPS Production

**Target:** Hetzner CX22 (2 vCPU, 4GB RAM, Ubuntu 22.04)  
**Stack:** Node.js + PostgreSQL + PM2 + Nginx  
**Cập nhật:** 2026-05-11

---

## 1. Chuẩn bị VPS

```bash
# Update hệ thống
sudo apt update && sudo apt upgrade -y

# Cài Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Cài PostgreSQL 16
sudo apt install -y postgresql postgresql-contrib

# Cài Nginx
sudo apt install -y nginx

# Cài PM2
sudo npm install -g pm2
```

---

## 2. Cấu hình PostgreSQL

```bash
sudo -u postgres psql

CREATE USER salegenius WITH PASSWORD 'strong-password-here';
CREATE DATABASE salegenius_prod OWNER salegenius;
GRANT ALL PRIVILEGES ON DATABASE salegenius_prod TO salegenius;
\q
```

---

## 3. Deploy code

```bash
# Tạo thư mục app
mkdir -p /var/www/salegenius
cd /var/www/salegenius

# Clone code (hoặc upload qua scp/rsync)
git clone <repo-url> .

# Backend
cd backend
npm install --production
cp .env.example .env
nano .env   # Điền DATABASE_URL, JWT secrets, ...
npx prisma migrate deploy
npx prisma generate

# Frontend build
cd ../frontend
npm install
npm run build   # Output: dist/
```

---

## 4. PM2 — Process Manager

```bash
cd /var/www/salegenius/backend

# Khởi động backend
pm2 start npm --name "salegenius-api" -- start

# Lưu cấu hình PM2
pm2 save
pm2 startup   # Tự khởi động sau reboot
```

**pm2 ecosystem file** (`ecosystem.config.js`):
```js
module.exports = {
  apps: [{
    name: 'salegenius-api',
    script: './src/index.js',
    env: { NODE_ENV: 'production', PORT: 3001 },
    max_memory_restart: '500M',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
  }]
};
```

```bash
pm2 start ecosystem.config.js
pm2 status       # Xem trạng thái
pm2 logs         # Xem logs
pm2 restart all  # Restart
```

---

## 5. Nginx — Reverse Proxy

```bash
sudo nano /etc/nginx/sites-available/salegenius
```

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Frontend (React build)
    root /var/www/salegenius/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/salegenius /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 6. SSL (HTTPS) — Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
# Auto-renew
sudo systemctl enable certbot.timer
```

---

## 7. Firewall

```bash
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

---

## 8. Deploy updates

```bash
cd /var/www/salegenius
git pull

# Backend
cd backend
npm install --production
npx prisma migrate deploy
pm2 restart salegenius-api

# Frontend
cd ../frontend
npm install
npm run build
# Nginx tự phục vụ từ dist/
```

---

## 9. Monitoring & Maintenance

```bash
# Xem logs
pm2 logs salegenius-api --lines 100

# Xem resource usage
pm2 monit

# Backup PostgreSQL
pg_dump -U salegenius salegenius_prod > backup_$(date +%Y%m%d).sql

# Restore
psql -U salegenius salegenius_prod < backup_20260511.sql
```

**Cron job backup hằng ngày** (`crontab -e`):
```cron
0 2 * * * pg_dump -U salegenius salegenius_prod | gzip > /var/backups/salegenius_$(date +\%Y\%m\%d).sql.gz
# Xóa backup cũ hơn 30 ngày
0 3 * * * find /var/backups -name "salegenius_*.sql.gz" -mtime +30 -delete
```

---

## 10. Chi phí ước tính

| Dịch vụ | Chi phí/tháng |
|---|---|
| Hetzner CX22 (2 vCPU, 4GB RAM, 40GB SSD) | €3.79 (~$4.5) |
| Domain .com (chia 12 tháng) | ~$1 |
| **Tổng** | **~$5.5** |
