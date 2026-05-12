# CHANGELOG

Tất cả thay đổi đáng chú ý của dự án được ghi lại tại đây.

Định dạng theo [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Planned
- Phase 1 MVP: Auth, CRUD, Google Sheets API sync, Import CSV chuẩn, Export xlsx, trang chốt đơn nhiều trạng thái
- Phase 2: Google Sheets API sync, fuzzy matching
- Phase 3: Dashboard, realtime, mobile

### Added
- Bộ tài liệu vận hành và governance cho MVP:
  - `docs/MVP_CONTRACT.md`
  - `docs/06-STATE_MACHINE.md`
  - `docs/07-RBAC_POLICY.md`
  - `docs/08-DATA_CONTRACTS.md`
  - `docs/09-IMPORT_SYNC_RUNBOOK.md`
  - `docs/09-EXPORT_SPEC.md`
  - `docs/10-TEST_PLAN.md`
  - `docs/11-ERROR_HANDLING.md`
  - `docs/12-SECURITY_BASELINE.md`
  - `docs/13-OPERATIONS_SLO.md`
  - `docs/14-API_EXAMPLES_COLLECTION.md`
  - `docs/15-GLOSSARY.md`
  - `docs/16-MONITORING.md`

### Changed
- Đồng bộ tài liệu theo `MVP_CONTRACT`:
  - Chỉ dùng 2 roles: `admin | sale`
  - Phase 1 bao gồm Google Sheets API + import CSV/Excel chuẩn
  - State machine nhiều trạng thái (bao gồm `pending`, `template_ready`)
- Cập nhật `docs/02-DATABASE_SCHEMA.md` để khớp state machine chuẩn từ `docs/06-STATE_MACHINE.md`
- Cập nhật `docs/03-API_DESIGN.md` để làm rõ RBAC/state machine references và role notes cho orders/export/logs
- Cập nhật `docs/04-SETUP_GUIDE.md`:
  - Google Service Account là bắt buộc cho Phase 1 khi dùng sync Sheet
  - Thống nhất test stack: `Vitest + Supertest`
- Cập nhật `docs/10-TEST_PLAN.md`:
  - Chuẩn hóa error codes theo API/error docs (`INVALID_STATE_TRANSITION`, `SKU_NOT_MAPPED`, `ADDRESS_NOT_MAPPED`)
  - Đồng bộ framework test về `Vitest`

---

## [0.1.0] — 2026-05-11

### Added
- Thiết kế hệ thống multi-brand (`docs/00-HE_THONG_CHOT_DON_MULTI_BRAND.md`)
- Danh sách chức năng chi tiết (`docs/01-CHUC_NANG_CHI_TIET.md`)
- Roadmap phát triển 3 phase (`docs/ROADMAP.md`)
- Prototype UI frontend (`frontend.jsx`) — React + Tailwind, 8 views
- Thiết kế parse sản phẩm từ chuỗi marketing (regex engine)
- Thiết kế parse + map địa chỉ 3 cấp (exact match → fuzzy fallback)
- Quyết định kiến trúc: VPS $5/tháng, bỏ Redis, dùng in-memory cache
- Skills setup: postgresql, prisma-expert, react-best-practices, cc-skill-backend-patterns, googlesheets-automation, tailwind-design-system, frontend-ui-dark-ts, tanstack-query-expert, api-design-principles, error-handling-patterns, javascript-pro, testing-patterns, shadcn, github-actions-templates

### Architecture Decisions
- **Roles**: 2 roles `admin` | `sale` (không dùng super_admin/viewer)
- **Cache**: In-memory Map thay Redis (tiết kiệm RAM trên VPS $5)
- **Auth**: JWT stateless, refresh token httpOnly cookie
- **Address mapping**: Dựa trên bảng `district_ward_codes` đã import; không khớp → báo lỗi, user sửa thủ công
- **Google Sheets**: Service Account (không OAuth user)
- **Deployment**: VPS + PM2 + Nginx (không Docker ở Phase 1)
