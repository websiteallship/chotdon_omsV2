# Security Baseline — MVP

**Phiên bản:** 1.0  
**Ngày:** 2026-05-12  
**Nguồn:** 03-API_DESIGN.md | 07-RBAC_POLICY.md

> Tất cả mục trong file này **BẮT BUỘC** thực thi trước khi deploy MVP. Không được defer sang phase sau.

---

## 1. JWT & Refresh Token

### 1.1 Access Token

```typescript
// lib/auth/jwt.ts
import jwt from 'jsonwebtoken';

const ACCESS_TOKEN_TTL  = '15m';   // Ngắn — giảm thiệt hại nếu lộ
const REFRESH_TOKEN_TTL = '7d';

export function signAccessToken(payload: { userId: string; email: string }): string {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET not set');
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL,
    issuer:   'chotdon-oms',
    audience: 'chotdon-client',
  });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, process.env.JWT_SECRET!, {
    issuer:   'chotdon-oms',
    audience: 'chotdon-client',
  });
}
```

> **Không** nhúng `role` hay `brandId` trong payload — query DB mỗi request để tránh stale permission.

### 1.2 Refresh Token — Lưu DB (Revocable)

```typescript
// Khi login thành công:
const refreshToken = crypto.randomBytes(64).toString('hex');  // opaque token, không phải JWT

await prisma.refreshToken.create({
  data: {
    token:     refreshToken,               // lưu dạng hash (SHA-256)
    userId:    user.id,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    userAgent: req.headers['user-agent'] ?? null,
    ipAddress: req.ip,
  },
});
```

```typescript
// POST /auth/refresh
async function refreshHandler(req, res) {
  const rawToken = req.cookies['refresh_token'];   // đọc từ HttpOnly cookie
  if (!rawToken) return res.status(401).json({ error: 'MISSING_REFRESH_TOKEN' });

  const hashed = crypto.createHash('sha256').update(rawToken).digest('hex');
  const stored = await prisma.refreshToken.findFirst({
    where: { token: hashed, expiresAt: { gt: new Date() }, revokedAt: null },
    include: { user: true },
  });

  if (!stored) return res.status(401).json({ error: 'INVALID_REFRESH_TOKEN' });

  // Rotate: revoke cũ, cấp mới
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data:  { revokedAt: new Date() },
  });

  const newRefreshToken = crypto.randomBytes(64).toString('hex');
  await prisma.refreshToken.create({ data: { /* ... */ } });

  const accessToken = signAccessToken({ userId: stored.userId, email: stored.user.email });

  setRefreshCookie(res, newRefreshToken);
  return res.json({ access_token: accessToken });
}
```

### 1.3 Logout — Revoke Token

```typescript
// POST /auth/logout
async function logoutHandler(req, res) {
  const rawToken = req.cookies['refresh_token'];
  if (rawToken) {
    const hashed = crypto.createHash('sha256').update(rawToken).digest('hex');
    await prisma.refreshToken.updateMany({
      where: { token: hashed },
      data:  { revokedAt: new Date() },
    });
  }
  res.clearCookie('refresh_token', COOKIE_OPTIONS);
  return res.json({ success: true });
}
```

### 1.4 Schema bổ sung (Prisma)

```prisma
model RefreshToken {
  id        String    @id @default(uuid())
  token     String    @unique           // SHA-256 hash của raw token
  userId    String
  user      User      @relation(fields: [userId], references: [id])
  expiresAt DateTime
  revokedAt DateTime?
  userAgent String?
  ipAddress String?
  createdAt DateTime  @default(now())

  @@index([userId])
  @@index([token])
}
```

---

## 2. Cookie Policy

### 2.1 Cấu hình cookie refresh_token

```typescript
// lib/auth/cookie.ts
const IS_PROD = process.env.NODE_ENV === 'production';

export const COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,                        // JavaScript không đọc được
  secure:   IS_PROD,                     // HTTPS only trên production
  sameSite: IS_PROD ? 'strict' : 'lax', // CSRF protection
  maxAge:   7 * 24 * 60 * 60 * 1000,    // 7 ngày, ms
  path:     '/api/auth',                 // Chỉ gửi kèm request đến /api/auth
};

export function setRefreshCookie(res: Response, token: string): void {
  res.cookie('refresh_token', token, COOKIE_OPTIONS);
}
```

### 2.2 Bảng thuộc tính cookie

| Thuộc tính | Giá trị | Lý do |
|---|---|---|
| `HttpOnly` | `true` | Block XSS đọc cookie |
| `Secure` | `true` (prod) | Chỉ gửi qua HTTPS |
| `SameSite` | `Strict` (prod) | Chặn CSRF cross-site |
| `Path` | `/api/auth` | Giới hạn scope cookie |
| `MaxAge` | 7 ngày | Khớp với TTL refresh token |
| Tên | `refresh_token` | Không prefix `__Secure-` vì có `Secure` flag |

> Access token **KHÔNG** lưu cookie — client giữ trong memory (biến JS), gửi qua `Authorization: Bearer`.

---

## 3. Security Headers (Helmet)

```typescript
// app.ts
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      imgSrc:     ["'self'", 'data:'],
      connectSrc: ["'self'"],
      frameSrc:   ["'none'"],
    },
  },
  frameguard:     { action: 'deny' },     // X-Frame-Options: DENY
  hidePoweredBy:  true,                   // Bỏ X-Powered-By
  noSniff:        true,                   // X-Content-Type-Options: nosniff
  hsts: {
    maxAge:            31_536_000,        // 1 năm
    includeSubDomains: true,
    preload:           true,
  },
  referrerPolicy: { policy: 'no-referrer' },
}));
```

### CORS

```typescript
import cors from 'cors';

const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS ?? 'http://localhost:3000').split(',');

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`Origin ${origin} not allowed`));
  },
  credentials:     true,   // Cần cho cookie
  methods:         ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders:  ['Authorization', 'Content-Type'],
  exposedHeaders:  ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  maxAge:          600,
}));
```

---

## 4. Rate Limiting

### 4.1 Cấu hình per-endpoint

```typescript
// middleware/rateLimiter.ts
import rateLimit from 'express-rate-limit';

// Auth endpoints — chống brute force
export const authLimiter = rateLimit({
  windowMs:              15 * 60 * 1000,   // 15 phút
  max:                   10,               // 10 lần login/15 phút/IP
  skipSuccessfulRequests: true,
  standardHeaders:       true,
  legacyHeaders:         false,
  message: { error: 'TOO_MANY_REQUESTS', retryAfterSeconds: 900 },
  keyGenerator: (req) => req.ip,
});

// API chung
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,    // 1 phút
  max:      120,           // 120 req/phút/user
  keyGenerator: (req) => (req as any).user?.userId ?? req.ip,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'TOO_MANY_REQUESTS' },
});

// Export (heavy operation)
export const exportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 giờ
  max:      20,               // 20 export/giờ/user
  keyGenerator: (req) => (req as any).user?.userId ?? req.ip,
  message: { error: 'EXPORT_RATE_LIMIT_EXCEEDED' },
});

// Import file (heavy I/O)
export const importLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1 phút
  max:      5,
  keyGenerator: (req) => (req as any).user?.userId ?? req.ip,
  message: { error: 'IMPORT_RATE_LIMIT_EXCEEDED' },
});
```

### 4.2 Áp dụng

```typescript
// routes/auth.ts
router.post('/login',   authLimiter,   loginHandler);
router.post('/refresh', authLimiter,   refreshHandler);

// routes/index.ts
app.use('/api/', apiLimiter);

// routes/export.ts
router.post('/', exportLimiter, adminOnly, doExport);

// routes/orders.ts
router.post('/sync',       importLimiter, anyRole, syncSheet);
router.post('/import-csv', importLimiter, anyRole, importCsv);
```

### 4.3 Bảng giới hạn

| Endpoint | Window | Max | Key |
|---|---|---|---|
| `/auth/login` | 15 phút | 10 | IP |
| `/auth/refresh` | 15 phút | 10 | IP |
| `GET /api/*` | 1 phút | 120 | userId hoặc IP |
| `POST /export` | 1 giờ | 20 | userId |
| `POST /sync`, `POST /import-csv` | 1 phút | 5 | userId |

---

## 5. Audit Log

**Nguồn:** `activity_logs` table (đã có trong `02-DATABASE_SCHEMA.md`).

### 5.1 Events phải log

| Event | `action` | Ai trigger | Ghi thêm |
|---|---|---|---|
| Login thành công | `auth.login` | system | `ipAddress`, `userAgent` |
| Login thất bại | `auth.login_failed` | system | `email` cố login |
| Logout | `auth.logout` | user | |
| Đổi trạng thái đơn | `order.status_change` | user | `from`, `to`, `orderId` |
| Chốt đơn | `order.confirmed` | user | `orderId` |
| Export batch | `export.created` | user | `filename`, `count`, `orderIds[]` |
| Import CSV/Sheet | `import.sync` | user | `new`, `skipped`, `invalid` |
| Import SKU | `product.import` | admin | `count` |
| Import mã địa chỉ | `address.import` | admin | `count` |
| Hủy đơn đã chốt | `order.cancelled_confirmed` | admin | `orderId`, `reason` |
| Thay đổi config brand | `brand.config_updated` | admin | changed fields |
| Tạo/sửa/xóa user | `user.created/updated/removed` | admin | `targetUserId` |

### 5.2 Helper function

```typescript
// lib/auditLog.ts
import { prisma } from './prisma';

interface AuditLogInput {
  action:   string;
  brandId?: string;
  userId?:  string;
  orderId?: string;
  detail:   Record<string, unknown>;
  ipAddress?: string;
}

export async function writeAuditLog(input: AuditLogInput): Promise<void> {
  await prisma.activityLog.create({
    data: {
      action:    input.action,
      brandId:   input.brandId,
      userId:    input.userId,
      orderId:   input.orderId,
      detail:    input.detail,
      ipAddress: input.ipAddress ?? null,
      createdAt: new Date(),
    },
  });
}
```

### 5.3 Retention Policy

| Loại log | Giữ bao lâu | Hành động sau |
|---|---|---|
| `auth.*` | 90 ngày | Xóa cứng |
| `order.*` | 1 năm | Archive hoặc xóa |
| `export.*` | 2 năm | Bắt buộc giữ (audit trail) |
| `import.*` | 90 ngày | Xóa cứng |

> MVP: Chưa cần auto-purge. Ghi chú để implement cron job phase sau.

---

## 6. Secrets Management

### 6.1 Biến môi trường bắt buộc

| Biến | Mô tả | Cách sinh |
|---|---|---|
| `JWT_SECRET` | Ký access token | `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `DATABASE_URL` | PostgreSQL connection string | — |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | JSON credentials Google Sheet | Google Cloud Console |
| `CORS_ORIGINS` | Danh sách origin cho phép | e.g. `https://app.chotdon.vn` |
| `NODE_ENV` | `production` \| `development` | — |

### 6.2 Validation khi khởi động

```typescript
// lib/env.ts
const REQUIRED_ENVS = [
  'JWT_SECRET',
  'DATABASE_URL',
  'GOOGLE_SERVICE_ACCOUNT_JSON',
  'CORS_ORIGINS',
] as const;

export function validateEnv(): void {
  const missing = REQUIRED_ENVS.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }

  // JWT_SECRET phải đủ mạnh (≥ 64 bytes hex = 128 chars)
  if (process.env.JWT_SECRET!.length < 64) {
    throw new Error('JWT_SECRET must be at least 64 characters');
  }
}

// Gọi ngay khi app start
validateEnv();
```

### 6.3 .env.example (commit vào repo, không commit .env thật)

```bash
# .env.example
JWT_SECRET=<generate: node -e "require('crypto').randomBytes(64).toString('hex')">
DATABASE_URL=postgresql://user:password@localhost:5432/chotdon
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
CORS_ORIGINS=http://localhost:3000
NODE_ENV=development
```

### 6.4 .gitignore bắt buộc

```gitignore
.env
.env.local
.env.production
*.pem
*.key
service-account*.json
```

### 6.5 Production Secrets (Vercel / Railway / Docker)

| Platform | Cơ chế | Ghi chú |
|---|---|---|
| Vercel | Environment Variables UI | Không dùng file `.env` |
| Railway | Variables tab | Encrypt at rest |
| Docker | `--env-file` hoặc Docker Secrets | Không bake vào image |

> **NGHIÊM CẤM** hardcode secret trong source code hoặc commit vào Git.

---

## 7. Input Validation (Zod)

```typescript
// lib/validators/auth.ts
import { z } from 'zod';

export const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(8).max(128),
});

// lib/validators/order.ts
export const patchOrderSchema = z.object({
  status:        z.enum(['new','called_1','called_2','called_3','pending','failed','confirmed','template_ready','exported','cancelled']).optional(),
  product_sku:   z.string().max(50).optional(),
  quantity:      z.number().int().min(1).max(999).optional(),
  selling_price: z.number().min(0).optional(),
  note:          z.string().max(500).optional(),
});

// Middleware factory
export function validate(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(422).json({
        error:  'VALIDATION_ERROR',
        issues: result.error.flatten().fieldErrors,
      });
    }
    req.body = result.data;   // sanitized data
    next();
  };
}
```

---

## 8. Error Response — Không Leak Internal Detail

```typescript
// middleware/errorHandler.ts
export function globalErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const isDev = process.env.NODE_ENV !== 'production';

  // Log đầy đủ phía server
  console.error({ err, url: req.url, method: req.method });

  // Không trả stack trace ra client trên production
  res.status(500).json({
    error:   'INTERNAL_SERVER_ERROR',
    message: isDev ? err.message : 'An unexpected error occurred',
    ...(isDev && { stack: err.stack }),
  });
}
```

> Error message từ Prisma, JWT, hoặc các thư viện nội bộ **không được** expose thẳng ra response.

---

## 9. Checklist Trước Deploy MVP

| # | Hạng mục | Trạng thái |
|---|---|---|
| 1 | JWT secret ≥ 64 chars, đọc từ env | ☐ |
| 2 | Refresh token lưu DB dạng hash, revocable | ☐ |
| 3 | Cookie `refresh_token`: HttpOnly + Secure + SameSite=Strict | ☐ |
| 4 | Helmet headers đã bật | ☐ |
| 5 | CORS origin whitelist (không dùng `*`) | ☐ |
| 6 | Rate limit auth endpoints (10 req/15 phút/IP) | ☐ |
| 7 | Rate limit export (20 req/giờ/user) | ☐ |
| 8 | Audit log ghi đủ: login, status_change, export, import | ☐ |
| 9 | `.env` không commit vào Git | ☐ |
| 10 | `validateEnv()` chạy khi app start | ☐ |
| 11 | Zod validation trên tất cả endpoint nhận body | ☐ |
| 12 | Error handler không leak stack trace trên production | ☐ |
| 13 | HTTPS bắt buộc trên production (reverse proxy hoặc platform) | ☐ |
| 14 | DB URL không chứa password trong logs | ☐ |
