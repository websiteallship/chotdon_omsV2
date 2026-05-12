# Setup Guide — Môi trường phát triển

**OS:** Windows / Linux / macOS  
**Cập nhật:** 2026-05-11

---

## Yêu cầu

| Tool | Phiên bản | Link |
|---|---|---|
| Node.js | ≥ 20 LTS | https://nodejs.org |
| PostgreSQL | ≥ 16 | https://postgresql.org |
| Git | latest | https://git-scm.com |

---

## 1. Clone & cấu trúc

```bash
git clone <repo-url>
cd toolchotdon
```

```
toolchotdon/
├── backend/       # Node.js API
├── frontend/      # React app
└── docs/          # Tài liệu
```

---

## 2. Backend

### 2.1 Cài đặt dependencies

```bash
cd backend
npm install
```

### 2.2 Tạo file `.env`

```bash
cp .env.example .env
```

Nội dung `.env`:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/salegenius_dev"
JWT_ACCESS_SECRET="dev-access-secret-change-in-prod"
JWT_REFRESH_SECRET="dev-refresh-secret-change-in-prod"
JWT_ACCESS_EXPIRES="15m"
JWT_REFRESH_EXPIRES="7d"
GOOGLE_SERVICE_ACCOUNT_PATH="./keys/service-account.json"
PORT=3001
NODE_ENV=development
```

### 2.3 Tạo database PostgreSQL

```bash
# Windows (psql)
psql -U postgres -c "CREATE DATABASE salegenius_dev;"

# Linux/macOS
createdb salegenius_dev
```

### 2.4 Chạy migrations

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 2.5 Seed data (optional)

```bash
npx prisma db seed
```

### 2.6 Chạy dev server

```bash
npm run dev
# API chạy tại http://localhost:3001
```

---

## 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
```

`.env.local`:
```env
VITE_API_URL=http://localhost:3001/api
```

```bash
npm run dev
# App chạy tại http://localhost:5173
```

---

## 4. Google Service Account (bắt buộc ở Phase 1 nếu dùng sync Sheet)

1. Vào [Google Cloud Console](https://console.cloud.google.com)
2. Tạo project → Enable **Google Sheets API**
3. IAM & Admin → Service Accounts → Tạo mới
4. Download JSON key → đặt tại `backend/keys/service-account.json`
5. Share Google Sheet với email của Service Account (Viewer)

---

## 5. Database Management

```bash
# Xem data qua Prisma Studio
cd backend
npx prisma studio
# Mở browser tại http://localhost:5555

# Reset database (dev only)
npx prisma migrate reset

# Generate client sau khi sửa schema
npx prisma generate
```

---

## 6. Scripts thường dùng

| Script | Lệnh | Mô tả |
|---|---|---|
| Backend dev | `cd backend && npm run dev` | Nodemon + ts watch |
| Frontend dev | `cd frontend && npm run dev` | Vite HMR |
| DB migrate | `cd backend && npx prisma migrate dev` | Tạo migration mới |
| DB studio | `cd backend && npx prisma studio` | GUI quản lý DB |
| Build backend | `cd backend && npm run build` | Compile TS |
| Build frontend | `cd frontend && npm run build` | Vite build |
| Tests | `cd backend && npm test` | Vitest |

> Quy ước test stack của dự án:
- Unit tests: `Vitest`
- Integration/API tests: `Vitest` + `Supertest`

---

## 7. Troubleshooting

**Lỗi kết nối PostgreSQL:**
```
Error: Can't reach database server at localhost:5432
```
→ Kiểm tra PostgreSQL đang chạy: `pg_ctl status` hoặc `sudo service postgresql status`

**Lỗi Prisma client out of sync:**
```bash
npx prisma generate
```

**Port 3001 đang bị dùng:**
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <pid> /F

# Linux
lsof -ti:3001 | xargs kill
```
