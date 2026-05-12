# Monitoring & Logging — MVP

**Phiên bản:** 1.0  
**Ngày:** 2026-05-12  
**Nguồn:** ROADMAP.md §Phase 1 | 05-DEPLOYMENT.md | 12-SECURITY_BASELINE.md §5

> Scope MVP: PM2 logs + structured console logging + health check endpoint. **Không** dùng Datadog/Sentry/ELK — defer Phase 3.

---

## 1. Structured Logging (Console → PM2)

Stack: **Node.js `console`** → PM2 captures → log files trên VPS.  
Format: **JSON một dòng** — dễ grep, dễ pipe vào tool sau.

```typescript
// lib/logger.ts
type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  ts:        string;          // ISO8601
  level:     LogLevel;
  msg:       string;
  [key: string]: unknown;    // Extra fields
}

function log(level: LogLevel, msg: string, extra: Record<string, unknown> = {}): void {
  const entry: LogEntry = {
    ts:    new Date().toISOString(),
    level,
    msg,
    ...extra,
  };
  // PM2 capture stdout/stderr
  if (level === 'error') {
    console.error(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

export const logger = {
  info:  (msg: string, extra?: Record<string, unknown>) => log('info',  msg, extra),
  warn:  (msg: string, extra?: Record<string, unknown>) => log('warn',  msg, extra),
  error: (msg: string, extra?: Record<string, unknown>) => log('error', msg, extra),
  debug: (msg: string, extra?: Record<string, unknown>) => {
    if (process.env.NODE_ENV !== 'production') log('debug', msg, extra);
  },
};
```

**Ví dụ output:**
```json
{"ts":"2026-05-12T08:30:00.123Z","level":"info","msg":"Order status changed","orderId":"uuid-001","from":"called_1","to":"confirmed","userId":"user-xyz"}
{"ts":"2026-05-12T08:30:01.456Z","level":"error","msg":"Sheet connection failed","brandId":"brand-001","error":"Request timeout after 30000ms"}
```

---

## 2. Request Logging Middleware

```typescript
// middleware/requestLogger.ts
import { logger } from '../lib/logger';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const ms = Date.now() - start;

    // Bỏ qua health check để tránh log noise
    if (req.path === '/health') return;

    const entry = {
      method:    req.method,
      path:      req.path,
      status:    res.statusCode,
      ms,
      userId:    (req as any).user?.userId,
      brandId:   req.params.brandId,
      ip:        req.ip,
    };

    if (res.statusCode >= 500) {
      logger.error('Request error', entry);
    } else if (res.statusCode >= 400) {
      logger.warn('Request warn', entry);
    } else {
      logger.info('Request', entry);
    }
  });

  next();
}
```

**Gắn vào app (trước routes):**
```typescript
app.use(requestLogger);
```

---

## 3. Health Check Endpoint

```typescript
// routes/health.ts
import { prisma } from '../lib/prisma';

router.get('/health', async (_req, res) => {
  const checks: Record<string, 'ok' | 'error'> = {};

  // DB ping
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.db = 'ok';
  } catch {
    checks.db = 'error';
  }

  const healthy = Object.values(checks).every(v => v === 'ok');

  res.status(healthy ? 200 : 503).json({
    status:    healthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
    uptime:    process.uptime(),
    version:   process.env.APP_VERSION ?? 'dev',
  });
});
```

**Response 200:**
```json
{
  "status": "ok",
  "timestamp": "2026-05-12T08:30:00.000Z",
  "checks": { "db": "ok" },
  "uptime": 3600.12,
  "version": "1.0.0"
}
```

**Response 503 (DB down):**
```json
{
  "status": "degraded",
  "checks": { "db": "error" }
}
```

---

## 4. PM2 Configuration

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name:         'chotdon-api',
    script:       'dist/server.js',
    instances:    1,                    // Single instance MVP (không cần cluster)
    exec_mode:    'fork',
    env_production: {
      NODE_ENV:    'production',
      PORT:        3001,
    },

    // Log files
    out_file:     '/var/log/chotdon/out.log',
    error_file:   '/var/log/chotdon/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

    // Rotation (tránh log file quá lớn)
    max_size:     '100M',   // pm2-logrotate module
    retain:       7,        // Giữ 7 file xoay

    // Restart policy
    watch:        false,
    max_restarts: 10,
    min_uptime:   '10s',

    // Memory limit — restart nếu leak
    max_memory_restart: '512M',
  }],
};
```

**Cài pm2-logrotate:**
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 100M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

---

## 5. Nginx Access Log

```nginx
# /etc/nginx/sites-available/chotdon
server {
    listen 443 ssl;
    server_name api.chotdon.vn;

    # Log format JSON
    log_format json_combined escape=json
      '{'
        '"ts":"$time_iso8601",'
        '"ip":"$remote_addr",'
        '"method":"$request_method",'
        '"path":"$request_uri",'
        '"status":$status,'
        '"bytes":$body_bytes_sent,'
        '"ms":$request_time,'
        '"ua":"$http_user_agent"'
      '}';

    access_log /var/log/nginx/chotdon_access.log json_combined;
    error_log  /var/log/nginx/chotdon_error.log  warn;

    location /api/ {
        proxy_pass         http://127.0.0.1:3001;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 30s;
    }
}
```

---

## 6. Key Metrics cần theo dõi (thủ công MVP)

| Metric | Cách xem | Alert khi |
|---|---|---|
| App còn sống | `pm2 status` | Status ≠ `online` |
| Memory | `pm2 monit` | > 400MB |
| CPU | `pm2 monit` | > 80% liên tục 5 phút |
| Disk logs | `du -sh /var/log/chotdon/` | > 80% disk |
| DB connections | `SELECT count(*) FROM pg_stat_activity` | > 80 connections |
| 5xx rate | `grep '"status":5' /var/log/nginx/*.log \| wc -l` | > 10/phút |
| Restart count | `pm2 info chotdon-api` | `restart_time` tăng |

**Uptime check (miễn phí):** [UptimeRobot](https://uptimerobot.com) → ping `/health` mỗi 5 phút → alert email nếu 503.

---

## 7. Log Grep Cookbook (thường dùng)

```bash
# Tất cả lỗi 5xx trong giờ qua
grep '"level":"error"' /var/log/chotdon/error.log | grep "$(date -u +%Y-%m-%dT%H)"

# Request chậm > 3s
grep '"ms"' /var/log/nginx/chotdon_access.log | \
  node -e "require('readline').createInterface({input:process.stdin}).on('line',l=>{const o=JSON.parse(l);if(o.ms>3)console.log(l)})"

# Lỗi login của 1 IP
grep 'auth.login_failed' /var/log/chotdon/out.log | grep '"ip":"1.2.3.4"'

# Tất cả export trong ngày
grep 'export.created' /var/log/chotdon/out.log | grep "$(date +%Y-%m-%d)"

# Count errors by type trong 24h
grep '"level":"error"' /var/log/chotdon/error.log | \
  node -e "const m={};require('readline').createInterface({input:process.stdin}).on('line',l=>{try{const o=JSON.parse(l);m[o.msg]=(m[o.msg]||0)+1}catch{}}).on('close',()=>console.table(m))"
```

---

## 8. Events phải log ở Application Layer

> Bổ sung từ `12-SECURITY_BASELINE.md §5` — đây là danh sách log **kỹ thuật** (không phải audit), ghi vào `stdout`, **không** vào DB.

| Sự kiện | Level | Fields |
|---|---|---|
| App start | `info` | `port`, `env`, `version` |
| DB connected | `info` | — |
| App shutdown (SIGTERM) | `info` | — |
| Request > 2s | `warn` | `path`, `ms`, `userId` |
| Sheet sync start/end | `info` | `brandId`, `rowCount`, `ms` |
| Sheet sync fail | `error` | `brandId`, `error` |
| Export start/end | `info` | `brandId`, `count`, `filename` |
| Import file received | `info` | `brandId`, `size`, `rows` |
| Rate limit hit | `warn` | `ip`, `userId`, `endpoint` |
| Unhandled exception | `error` | full stack |

---

## 9. Checklist MVP Monitoring

| # | Hạng mục | Trạng thái |
|---|---|---|
| 1 | `logger.ts` JSON structured logging | ☐ |
| 2 | `requestLogger` middleware gắn vào app | ☐ |
| 3 | `GET /health` trả DB status | ☐ |
| 4 | PM2 `ecosystem.config.js` với log paths | ☐ |
| 5 | `pm2-logrotate` cài + cấu hình 100M/7 ngày | ☐ |
| 6 | Nginx JSON access log | ☐ |
| 7 | UptimeRobot ping `/health` mỗi 5 phút | ☐ |
| 8 | Alert email khi app restart (PM2 config) | ☐ |
| 9 | `/var/log/chotdon/` có đủ quyền ghi | ☐ |
| 10 | Disk log không vượt 80% | ☐ |
