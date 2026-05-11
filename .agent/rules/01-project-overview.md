# Project: SaleGenius — Chốt Đơn Multi-Brand

## Stack
- **Backend**: Node.js 20 + Express + Prisma ORM + PostgreSQL 16
- **Frontend**: React 18 + Vite + Tailwind CSS
- **Auth**: JWT stateless — Access 15m + Refresh 7d (httpOnly cookie)
- **Excel**: ExcelJS | **Google Sheets**: googleapis Service Account
- **Deploy**: VPS Hetzner + PM2 + Nginx (no Docker Phase 1)
- **Cache**: In-memory Map (no Redis)

## Brands thực tế
| code | Tên | Sản phẩm | SKU format | Variant cột |
|---|---|---|---|---|
| `ZAPATI` | ZAPATI Toàn Cầu | Dép da nam (D005, T003...) | `D005CR40` | `Màu sắc` + `Size` riêng |
| `ALLSHIP` | ALLSHIP | Dao cắt băng keo (5018, 6018) | `AS5018OR` | Cột `Loại` gộp |

## Cấu trúc thư mục
```
backend/
├── src/
│   ├── routes/       # Express routers
│   ├── middlewares/  # authGuard, brandGuard, validate
│   ├── services/     # Business logic
│   └── utils/        # Helpers
├── prisma/schema.prisma
frontend/
├── src/
│   ├── pages/        # Leads, Export, Products, Users, Settings, History
│   ├── components/   # Shared UI
│   └── hooks/        # Custom hooks
docs/                 # Tài liệu hệ thống
```

## Roles (CHỈ 2 ROLE)
- `admin`: toàn quyền (export, import SKU, config, user management)
- `sale`: xem leads, chốt đơn, sync sheet

## State Machine đơn hàng
```
new → called_1 → called_2 → called_3 → confirmed → exported
   ↘ failed | cancelled
```

## Tài liệu tham khảo
- `docs/00-HE_THONG_CHOT_DON_MULTI_BRAND.md` — Kiến trúc tổng quan
- `docs/01-CHUC_NANG_CHI_TIET.md` — Danh sách chức năng
- `docs/02-DATABASE_SCHEMA.md` — Schema DB
- `docs/03-API_DESIGN.md` — API endpoints
- `frontend.jsx` — UI prototype (source of truth cho UI)
