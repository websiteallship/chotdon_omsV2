# SaleGenius — Hệ thống Chốt Đơn Multi-Brand

Hệ thống web giúp đội sale chốt đơn hàng từ leads Facebook/Landing page, quản lý trạng thái từng đơn, và xuất file Excel đúng chuẩn **Template Import OR** để nhập vào hệ thống WMS/kho.

---

## Tính năng chính

- **Multi-brand**: nhiều brand độc lập về data, dùng chung hạ tầng
- **Import leads đa nguồn**: Google Sheets API (manual sync + auto cron) + import CSV chuẩn
- **Trang chốt đơn**: state machine nhiều trạng thái (`new/called_1/called_2/called_3/pending/failed/confirmed/template_ready/exported/cancelled`), SKU lookup, địa chỉ 3 cấp
- **Parse sản phẩm** từ chuỗi marketing (`"Mua 2 đôi D005 giá 489k + Freeship..."`)
- **Map địa chỉ** từ bảng `district_ward_codes` đã import → báo lỗi nếu không khớp
- **Export xlsx** đúng Template Import OR (tự động điền mã phường/quận)
- **2 roles**: `admin` (toàn quyền) | `sale` (chốt đơn + sync)
- **Column Mapping** linh hoạt per brand (cấu hình tên cột Sheet → trường DB)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js 20 + Express + Prisma |
| Database | PostgreSQL 16 |
| Auth | JWT stateless (no Redis) |
| Frontend | React 18 + Vite + Tailwind CSS |
| Excel | ExcelJS |
| Google Sheets | googleapis (Service Account) |
| Process | PM2 + Nginx |
| Hosting | Hetzner CX22 ~$5.5/tháng |

---

## Cấu trúc thư mục

```
toolchotdon/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── routes/
│   │   ├── middlewares/
│   │   ├── services/
│   │   └── utils/
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── stores/
│   └── package.json
├── docs/
│   ├── 00-HE_THONG_CHOT_DON_MULTI_BRAND.md
│   ├── 01-CHUC_NANG_CHI_TIET.md
│   └── ROADMAP.md
├── frontend.jsx          # UI prototype (tham khảo)
├── CHANGELOG.md
└── README.md
```

---

## Quick Start

### Yêu cầu
- Node.js ≥ 20
- PostgreSQL ≥ 16
- Google Service Account JSON key

### Backend
```bash
cd backend
npm install
cp .env.example .env   # Điền DB_URL, JWT_SECRET, GOOGLE_KEY_PATH
npx prisma migrate dev
npm run dev            # http://localhost:3001
```

### Frontend
```bash
cd frontend
npm install
npm run dev            # http://localhost:5173
```

### Biến môi trường (`.env`)
```env
DATABASE_URL="postgresql://user:pass@localhost:5432/salegenius"
JWT_ACCESS_SECRET="your-access-secret"
JWT_REFRESH_SECRET="your-refresh-secret"
GOOGLE_SERVICE_ACCOUNT_PATH="./keys/service-account.json"
PORT=3001
```

---

## Tài liệu

| File | Nội dung |
|---|---|
| [docs/00-HE_THONG_CHOT_DON_MULTI_BRAND.md](docs/00-HE_THONG_CHOT_DON_MULTI_BRAND.md) | Thiết kế hệ thống tổng quan |
| [docs/01-CHUC_NANG_CHI_TIET.md](docs/01-CHUC_NANG_CHI_TIET.md) | Danh sách chức năng chi tiết |
| [docs/MVP_CONTRACT.md](docs/MVP_CONTRACT.md) | Nguồn chuẩn phạm vi MVP: roles, phase scope, state machine |
| [docs/06-STATE_MACHINE.md](docs/06-STATE_MACHINE.md) | State machine + transition + gate validate |
| [docs/07-RBAC_POLICY.md](docs/07-RBAC_POLICY.md) | Ma trận phân quyền theo endpoint/action |
| [docs/08-DATA_CONTRACTS.md](docs/08-DATA_CONTRACTS.md) | Chuẩn dữ liệu input Google Sheets/CSV/Excel |
| [docs/09-IMPORT_SYNC_RUNBOOK.md](docs/09-IMPORT_SYNC_RUNBOOK.md) | Runbook vận hành import/sync thực tế |
| [docs/09-EXPORT_SPEC.md](docs/09-EXPORT_SPEC.md) | Đặc tả export Template OR |
| [docs/10-TEST_PLAN.md](docs/10-TEST_PLAN.md) | Test matrix MVP (Vitest + Supertest) |
| [docs/11-ERROR_HANDLING.md](docs/11-ERROR_HANDLING.md) | Danh mục lỗi và cách xử lý |
| [docs/12-SECURITY_BASELINE.md](docs/12-SECURITY_BASELINE.md) | Baseline bảo mật triển khai |
| [docs/13-OPERATIONS_SLO.md](docs/13-OPERATIONS_SLO.md) | SLO/backup/rollback/release checklist |
| [docs/14-API_EXAMPLES_COLLECTION.md](docs/14-API_EXAMPLES_COLLECTION.md) | Bộ request/response mẫu API |
| [docs/15-GLOSSARY.md](docs/15-GLOSSARY.md) | Từ điển thuật ngữ nghiệp vụ/kỹ thuật |
| [docs/16-MONITORING.md](docs/16-MONITORING.md) | Monitoring, healthcheck, logging |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Roadmap phát triển 3 phase |
| [CHANGELOG.md](CHANGELOG.md) | Lịch sử thay đổi |

---

## Phát triển

Xem [ROADMAP.md](docs/ROADMAP.md) để biết kế hoạch phát triển.

**Phase 1 (MVP):** Tuần 1–4 — Core features + Google Sheets API + import CSV chuẩn  
**Phase 2 (Integration):** Tuần 5–8 — Sheet API, fuzzy matching  
**Phase 3 (Analytics):** Tuần 9–12 — Dashboard, realtime, mobile  

---

## Chi phí vận hành

~$5.5/tháng (Hetzner CX22 + Domain)
