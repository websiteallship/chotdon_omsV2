# ROADMAP — Hệ thống Chốt Đơn Multi-Brand

**Cập nhật:** 2026-05-12  
**Trạng thái:** Đang phát triển Phase 1

---

## Tổng quan

```
Phase 1 (MVP)       Phase 2 (Integration)     Phase 3 (Analytics)
───────────────     ─────────────────────     ────────────────────
Tuần 1–4            Tuần 5–8                  Tuần 9–12
Core + Sheet API    Integration + Fuzzy       Dashboard & Báo cáo
```

---

## Phase 1 — MVP *(Tuần 1–4)*

**Mục tiêu:** Hệ thống hoạt động end-to-end cho 1 brand, bao gồm Google Sheets API và import CSV chuẩn.

### Tuần 1 — Backend Foundation
- [ ] Khởi tạo project (Node.js + Express + Prisma + PostgreSQL)
- [ ] Schema DB: `brands`, `users`, `user_brands`, `products`, `orders`, `activity_logs`, `district_ward_codes`
- [ ] Auth: JWT (Access 15 phút + Refresh 7 ngày httpOnly cookie)
- [ ] Middleware: `authGuard`, `brandGuard` (2 roles: admin / sale)
- [ ] API: Auth routes (`/login`, `/logout`, `/refresh`)

### Tuần 2 — Core APIs
- [ ] API: CRUD Brands
- [ ] API: CRUD Users + gán brand
- [ ] API: Upload + Import SKU từ Excel (ExcelJS)
- [ ] API: Import `district_ward_codes` từ file (bảng địa chỉ 3 cấp)
- [ ] API: CRUD Orders (leads)
- [ ] API: Cập nhật trạng thái đơn (state machine validation)

### Tuần 3 — Business Logic
- [ ] Parse chuỗi sản phẩm marketing (Regex engine)
- [ ] Parse + Map địa chỉ 3 cấp từ `district_ward_codes` (exact match)
- [ ] Import leads từ file CSV/Excel chuẩn (manual import)
- [ ] Google Sheets API sync (manual sync trong MVP)
- [ ] Column Mapping config per brand (lưu JSONB)
- [ ] API Export: generate file xlsx Template OR (ExcelJS)
  - Map địa chỉ → `district_code`, `ward_code`
  - Báo lỗi nếu không khớp

### Tuần 4 — Frontend & Polish
- [ ] React app (Vite + Tailwind)
- [ ] Trang Leads: bảng, filter, search, phân trang, sync button
- [ ] Order Drawer: form chốt đơn, state machine UI
- [ ] Trang Export: preview, download xlsx
- [ ] Trang SKU: upload, danh sách
- [ ] Trang Users: danh sách, thêm/sửa
- [ ] Trang Settings: Sheet config, Column Mapping, Brand config
- [ ] Trang History: log sync/import/export
- [ ] Deploy lên VPS (Hetzner CX22) với PM2 + Nginx

**Milestone:** ✅ Admin có thể sync leads từ Google Sheets API + import CSV chuẩn → chốt đơn nhiều trạng thái → export xlsx Template OR

---

## Phase 2 — Integration & Fuzzy *(Tuần 5–8)*

**Mục tiêu:** Nâng cao chất lượng integration: write-back, fuzzy matching SKU/địa chỉ, auto sync và logging.

### Tuần 5 — Google Sheets API
- [ ] Harden Google Sheets API client (retry/timeout/error handling)
- [ ] Chuẩn hóa test-connection + healthcheck cho sync pipeline
- [ ] Tối ưu sync leads từ Google Sheet → DB (incremental + dedup theo `sheet_row_id`)
- [ ] API: Write-back `lead_status = "Đã xuất Excel"` sau export
- [ ] UI: Nút "Sync now", hiển thị kết quả sync

### Tuần 6 — Fuzzy Matching
- [ ] Enable `pg_trgm` extension PostgreSQL
- [ ] Fuzzy lookup SKU (similarity > 0.6 → top 5 gợi ý)
- [ ] Fuzzy parse địa chỉ:
  - confidence ≥ 0.85 → AUTO MAP
  - 0.6–0.85 → SUGGEST top 3
  - < 0.6 → MANUAL form dropdown
- [ ] UI: Combo selector khi sản phẩm multi-line
- [ ] UI: Address suggestion confirm dialog

### Tuần 7 — Auto Sync & Logging
- [ ] Cron job auto sync Google Sheet mỗi 15 phút (node-cron)
- [ ] Activity log chi tiết per order (from/to state, user, timestamp)
- [ ] UI: Timeline log trong Order Drawer
- [ ] Email notification khi sync thất bại (optional)

### Tuần 8 — Optimization & Testing
- [ ] In-memory cache SKU per brand (Map, invalidate khi reload)
- [ ] Rate limiting API (express-rate-limit)
- [ ] Input validation (Zod)
- [ ] Unit tests core logic (Vitest): parse sản phẩm, parse địa chỉ, state machine
- [ ] Integration tests API (Vitest + Supertest): sync/import, RBAC, export gate
- [ ] Load test với 2.000 đơn

**Milestone:** ✅ Sync tự động từ Google Sheet, fuzzy match địa chỉ + SKU

---

## Phase 3 — Analytics & Polish *(Tuần 9–12)*

**Mục tiêu:** Dashboard báo cáo, realtime, mobile.

### Tuần 9–10 — Dashboard
- [ ] Dashboard per brand: leads mới, đơn chốt, tỉ lệ chốt, doanh thu COD
- [ ] Biểu đồ theo ngày (Recharts/Chart.js)
- [ ] Báo cáo: breakdown theo trạng thái, top sale
- [ ] Export báo cáo CSV/Excel

### Tuần 11 — Realtime & UX
- [ ] WebSocket (Socket.io): notify lead mới, badge cập nhật realtime
- [ ] Mobile-responsive layout
- [ ] Keyboard shortcuts (j/k navigate leads, Enter mở drawer)
- [ ] Dark mode (optional)

### Tuần 12 — Hardening
- [ ] Security audit: SQL injection, XSS, CSRF
- [ ] Backup PostgreSQL tự động (daily)
- [ ] Monitoring: PM2 logs + Uptime check
- [ ] Documentation API (Swagger/OpenAPI)
- [ ] User manual (hướng dẫn sử dụng cho sale)
- [ ] Runbook vận hành import/sync và incident flow (handover cho sale/admin)

**Milestone:** ✅ Production-ready, multi-brand, realtime dashboard

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js 20 + Express + Prisma ORM |
| Database | PostgreSQL 16 (local trên VPS) |
| Auth | JWT stateless (no Redis) |
| Frontend | React 18 + Vite + Tailwind CSS |
| Excel | ExcelJS |
| Google Sheets | googleapis (Service Account) |
| Fuzzy Match | pg_trgm (PostgreSQL extension) |
| Process | PM2 + Nginx |
| Hosting | Hetzner CX22 ~$4.5/tháng |

---

## Chi phí vận hành ước tính

| Dịch vụ | Chi phí/tháng |
|---|---|
| Hetzner CX22 VPS (2 vCPU, 4GB RAM) | ~$4.5 |
| Domain .com | ~$1 |
| **Tổng** | **~$5.5** |
