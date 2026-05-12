# Operations — SLO, Alert, Backup & Release Checklist

**Phiên bản:** 1.0  
**Ngày:** 2026-05-12  
**Áp dụng:** VPS Hetzner CX22 + PM2 + Nginx + PostgreSQL

---

## 1. SLO / SLA Nội bộ

> Đây là cam kết nội bộ (internal SLO), không phải SLA khách hàng.

### 1.1 Availability

| Chỉ số | Mục tiêu | Đo lường |
|---|---|---|
| Uptime / tháng | ≥ 99.0% (~7h downtime/tháng) | UptimeRobot free tier (5 phút/check) |
| Planned maintenance | < 30 phút/lần, ngoài giờ hành chính | Thông báo trước 24h qua Telegram |
| Unplanned downtime recovery | ≤ 30 phút | Tính từ lúc alert đến service up |

### 1.2 Performance

| Endpoint | P95 Latency | Ghi chú |
|---|---|---|
| `GET /orders` (list) | < 500ms | Với 15 records/page |
| `PATCH /orders/:id` (status) | < 300ms | Write + log |
| `POST /export` (generate xlsx) | < 10s | Tối đa 500 đơn/batch |
| `POST /sync` (Google Sheet) | < 30s | Tối đa 1,000 rows |

### 1.3 Data Integrity

| Chỉ số | Mục tiêu |
|---|---|
| Không mất đơn đã `confirmed` / `exported` | 100% |
| RPO (Recovery Point Objective) | ≤ 24h (backup daily) |
| RTO (Recovery Time Objective) | ≤ 2h (restore + redeploy) |

---

## 2. Alert Tối thiểu

### 2.1 Stack monitoring đề xuất (free/cheap)

```
UptimeRobot (free)     → HTTP check mỗi 5 phút → Alert Telegram/Email
PM2 + pm2-logrotate    → Process crash alert → tự restart + log
PostgreSQL logs        → Slow query (> 1s) → ghi file log
Nginx access.log       → 5xx spike → check thủ công / cron script
```

### 2.2 Alert rules tối thiểu

| Loại | Trigger | Kênh | Người nhận |
|---|---|---|---|
| Service down | HTTP 200 fails 2 lần liên tiếp (10 phút) | Telegram bot | Admin |
| PM2 process crash | App restart > 3 lần trong 5 phút | PM2 hook → Telegram | Admin |
| Disk > 80% | Cron 6h/lần check `df -h` | Telegram | Admin |
| DB slow query | Query > 2s (pg_stat_statements) | Log file | Review hàng tuần |
| Failed login spike | > 10 lần sai mật khẩu trong 5 phút | App log | Admin review |
| Export thất bại | `POST /export` trả 5xx | App error log | Admin |

### 2.3 Telegram Bot setup (1 lần)

```bash
# 1. Tạo bot: chat với @BotFather → /newbot
# 2. Lấy BOT_TOKEN và CHAT_ID
# 3. Cấu hình PM2 hook (ecosystem.config.js):

module.exports = {
  apps: [{
    name: 'chotdon-api',
    script: 'dist/index.js',
    max_restarts: 10,
    error_file: '/var/log/pm2/error.log',
    out_file: '/var/log/pm2/out.log',
  }]
};

# 4. Script alert đơn giản (/opt/scripts/alert.sh):
#!/bin/bash
MSG=$1
curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
  -d "chat_id=${CHAT_ID}&text=${MSG}"
```

### 2.4 Cron jobs tối thiểu

```cron
# /etc/cron.d/chotdon

# Disk check mỗi 6 tiếng
0 */6 * * * root /opt/scripts/check_disk.sh

# DB backup daily 2AM
0 2 * * * postgres /opt/scripts/backup_db.sh

# Log rotate (dùng pm2-logrotate, config tự động)
```

---

## 3. Backup & Restore Drill

### 3.1 Backup Strategy

| Loại | Tần suất | Lưu trữ | Giữ lại |
|---|---|---|---|
| PostgreSQL full dump | Daily 2AM | `/var/backups/pg/` trên VPS | 7 ngày |
| PostgreSQL dump | Weekly Sunday | Upload Google Drive (rclone) | 4 tuần |
| Code / config | Git push mỗi deploy | GitHub | Vĩnh viễn |
| `.env` file | Thủ công sau khi sửa | Encrypted note / Vault | Manual |

### 3.2 Backup Script

```bash
#!/bin/bash
# /opt/scripts/backup_db.sh

DB_NAME="chotdon_db"
BACKUP_DIR="/var/backups/pg"
DATE=$(date +%Y%m%d_%H%M%S)
FILE="$BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz"

mkdir -p "$BACKUP_DIR"
pg_dump "$DB_NAME" | gzip > "$FILE"

# Xóa backup cũ hơn 7 ngày
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +7 -delete

echo "Backup done: $FILE"
/opt/scripts/alert.sh "✅ DB Backup OK: ${DATE}"
```

### 3.3 Restore Drill (chạy thử mỗi tháng)

**Mục tiêu:** Xác nhận backup có thể restore trong < 2h.

```bash
# Bước 1: List backup có sẵn
ls -lh /var/backups/pg/

# Bước 2: Restore vào DB test (KHÔNG restore vào production trực tiếp)
createdb chotdon_restore_test
gunzip -c /var/backups/pg/chotdon_db_YYYYMMDD_HHMMSS.sql.gz \
  | psql chotdon_restore_test

# Bước 3: Verify dữ liệu
psql chotdon_restore_test -c "SELECT COUNT(*) FROM orders;"
psql chotdon_restore_test -c "SELECT COUNT(*) FROM orders WHERE status='exported';"

# Bước 4: Drop DB test
dropdb chotdon_restore_test

# Bước 5: Ghi log kết quả vào doc này (xem §3.4)
```

### 3.4 Restore Drill Log

| Ngày | Backup được dùng | Thời gian restore | Kết quả | Người thực hiện |
|---|---|---|---|---|
| _(ghi sau khi drill)_ | | | | |

### 3.5 Disaster Recovery — Full Restore Steps

> Dùng khi VPS bị hỏng / mất hoàn toàn.

```bash
# 1. Tạo VPS mới (Hetzner CX22)
# 2. Cài đặt cơ bản
apt update && apt install -y nodejs npm postgresql nginx certbot

# 3. Clone code
git clone https://github.com/websiteallship/chotdon_omsV2.git /opt/chotdon
cd /opt/chotdon && npm install && npm run build

# 4. Restore database
gunzip -c <backup_file>.sql.gz | psql -U postgres chotdon_db

# 5. Copy .env (từ secure storage)
# 6. Run migrations nếu cần
npx prisma migrate deploy

# 7. Start với PM2
pm2 start ecosystem.config.js
pm2 save && pm2 startup

# 8. Cấu hình Nginx + SSL
certbot --nginx -d yourdomain.com
```

---

## 4. Release Checklist

> Chạy checklist này **mỗi lần deploy** lên production.

### 4.1 Pre-deploy

- [ ] Code đã được review (ít nhất 1 người khác hoặc self-review kỹ)
- [ ] Tất cả tests pass: `npm test`
- [ ] Build không lỗi: `npm run build`
- [ ] DB migration đã được review kỹ (không có destructive change)
- [ ] `.env` production đã cập nhật nếu có biến mới
- [ ] Backup DB thủ công trước deploy: `pg_dump chotdon_db | gzip > /var/backups/pg/pre_deploy_$(date +%Y%m%d).sql.gz`
- [ ] Thông báo team (nếu deploy trong giờ làm việc)

### 4.2 Deploy

```bash
# 1. Pull code
cd /opt/chotdon && git pull origin main

# 2. Install deps (nếu package.json thay đổi)
npm ci --production

# 3. Build
npm run build

# 4. Run migrations
NODE_ENV=production npx prisma migrate deploy

# 5. Reload (zero-downtime với PM2)
pm2 reload chotdon-api

# 6. Check status
pm2 status
pm2 logs chotdon-api --lines 50
```

### 4.3 Post-deploy Smoke Test

- [ ] `GET /api/auth/me` → 401 (không có token) ✓
- [ ] Login → nhận `access_token` ✓
- [ ] `GET /api/brands` → trả danh sách brands ✓
- [ ] `GET /api/brands/:id/orders?limit=5` → trả orders ✓
- [ ] Nginx logs không có 5xx: `tail -20 /var/log/nginx/error.log`
- [ ] PM2 không crash: `pm2 status` → `online`

### 4.4 Post-deploy Monitoring (30 phút đầu)

- [ ] UptimeRobot không trigger alert
- [ ] PM2 restart count = 0
- [ ] Không có error spike trong app logs: `pm2 logs --lines 100`

---

## 5. Rollback Plan

### 5.1 Rollback Code (< 5 phút)

```bash
# Cách 1: Rollback git
cd /opt/chotdon
git log --oneline -10          # xem commit history
git checkout <previous_commit>
npm run build
pm2 reload chotdon-api

# Cách 2: Rollback về tag
git checkout tags/v1.2.0
npm run build && pm2 reload chotdon-api
```

### 5.2 Rollback Database Migration

> **QUAN TRỌNG:** Chỉ rollback migration nếu thực sự cần. Prisma không hỗ trợ auto-rollback.

```bash
# Xem migration history
npx prisma migrate status

# Nếu migration mới thêm cột (không destructive) → để nguyên, rollback code là đủ
# Nếu migration xóa cột / bảng → PHẢI restore từ backup (xem §3.5)

# Restore DB từ backup pre-deploy:
dropdb chotdon_db
createdb chotdon_db
gunzip -c /var/backups/pg/pre_deploy_YYYYMMDD.sql.gz | psql chotdon_db
```

### 5.3 Rollback Decision Tree

```
Deploy xong → Có lỗi?
│
├── Không → ✅ Done
│
└── Có lỗi
    │
    ├── Lỗi code (logic, UI) → Rollback code (§5.1)
    │   └── Không cần rollback DB
    │
    ├── Lỗi migration (DB schema sai) → 
    │   ├── Migration additive (thêm cột) → Rollback code, giữ DB
    │   └── Migration destructive → Restore DB từ backup + Rollback code
    │
    └── Lỗi .env / config → Fix .env + pm2 reload (không cần rollback)
```

---

## 6. Incident Response

### 6.1 Mức độ sự cố

| Level | Mô tả | Response Time | Người xử lý |
|---|---|---|---|
| P1 — Critical | Service down, không vào được | ≤ 15 phút | Admin ngay lập tức |
| P2 — High | Export bị lỗi, mất dữ liệu | ≤ 1h | Admin trong ngày |
| P3 — Medium | Tính năng phụ lỗi, UI bug | ≤ 24h | Plan sprint tiếp |
| P4 — Low | Giao diện chậm, cảnh báo nhỏ | ≤ 72h | Backlog |

### 6.2 Post-Incident Template

```markdown
## Incident Report — [Tên sự cố] — [Ngày]

**Thời gian:** Từ HH:MM đến HH:MM (X phút)
**Mức độ:** P1/P2/P3
**Ảnh hưởng:** Mô tả ngắn (VD: Sale không xuất được file trong 45 phút)

### Timeline
- HH:MM — Phát hiện
- HH:MM — Bắt đầu điều tra
- HH:MM — Root cause tìm ra
- HH:MM — Fix deploy
- HH:MM — Confirmed resolved

### Root Cause
[Mô tả nguyên nhân gốc]

### Fix
[Giải pháp đã áp dụng]

### Action Items
- [ ] [Việc cần làm để tránh tái diễn]
```
