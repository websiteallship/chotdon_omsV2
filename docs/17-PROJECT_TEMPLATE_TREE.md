# Project Template Tree — SaleGenius

**Phiên bản:** 1.0  
**Ngày:** 2026-05-12  
**Mục tiêu:** Chuẩn cây thư mục khởi tạo cho dự án chốt đơn multi-brand.

---

## 1. Cây thư mục đề xuất

```text
toolchotdon/
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   ├── src/
│   │   ├── app.ts
│   │   ├── server.ts
│   │   ├── config/
│   │   │   ├── env.ts
│   │   │   ├── db.ts
│   │   │   └── logger.ts
│   │   ├── lib/
│   │   │   ├── errors/
│   │   │   │   ├── AppError.ts
│   │   │   │   └── errorCodes.ts
│   │   │   ├── stateMachine.ts
│   │   │   ├── validators.ts
│   │   │   └── utils.ts
│   │   ├── middlewares/
│   │   │   ├── authGuard.ts
│   │   │   ├── brandGuard.ts
│   │   │   ├── rbac.ts
│   │   │   └── errorHandler.ts
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── auth.routes.ts
│   │   │   │   └── auth.schema.ts
│   │   │   ├── brands/
│   │   │   ├── users/
│   │   │   ├── orders/
│   │   │   ├── products/
│   │   │   ├── export/
│   │   │   ├── district-ward-codes/
│   │   │   └── logs/
│   │   ├── integrations/
│   │   │   └── google-sheets/
│   │   │       ├── sheets.client.ts
│   │   │       ├── sheets.sync.ts
│   │   │       └── sheets.writeback.ts
│   │   ├── jobs/
│   │   │   ├── syncSheet.job.ts
│   │   │   └── cleanupLogs.job.ts
│   │   └── tests/
│   │       ├── unit/
│   │       ├── integration/
│   │       └── fixtures/
│   └── uploads/
│       ├── imports/
│       └── exports/
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── .env.example
│   ├── public/
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── app/
│       │   ├── router.tsx
│       │   ├── providers.tsx
│       │   └── store.ts
│       ├── api/
│       │   ├── client.ts
│       │   ├── auth.api.ts
│       │   ├── orders.api.ts
│       │   ├── products.api.ts
│       │   ├── brands.api.ts
│       │   └── export.api.ts
│       ├── features/
│       │   ├── auth/
│       │   ├── leads/
│       │   ├── orders/
│       │   ├── products/
│       │   ├── export/
│       │   ├── users/
│       │   ├── settings/
│       │   └── history/
│       ├── components/
│       │   ├── layout/
│       │   ├── forms/
│       │   ├── tables/
│       │   └── ui/
│       ├── hooks/
│       ├── styles/
│       ├── utils/
│       └── tests/
├── data-raw/
│   ├── Template_Import_OR.csv
│   ├── sample-sheet-zapati.csv
│   ├── sample-sheet-allship.csv
│   └── sample-products.csv
├── scripts/
│   ├── import-district-ward-codes.ts
│   ├── import-products.ts
│   ├── smoke-test-sync.ts
│   └── backup-db.sh
├── docs/
│   ├── 00-HE_THONG_CHOT_DON_MULTI_BRAND.md
│   ├── 01-CHUC_NANG_CHI_TIET.md
│   ├── 02-DATABASE_SCHEMA.md
│   ├── 03-API_DESIGN.md
│   ├── 04-SETUP_GUIDE.md
│   ├── 05-DEPLOYMENT.md
│   ├── 06-STATE_MACHINE.md
│   ├── 07-RBAC_POLICY.md
│   ├── 08-DATA_CONTRACTS.md
│   ├── 09-IMPORT_SYNC_RUNBOOK.md
│   ├── 09-EXPORT_SPEC.md
│   ├── 10-TEST_PLAN.md
│   ├── 11-ERROR_HANDLING.md
│   ├── 12-SECURITY_BASELINE.md
│   ├── 13-OPERATIONS_SLO.md
│   ├── 14-API_EXAMPLES_COLLECTION.md
│   ├── 15-GLOSSARY.md
│   ├── 16-MONITORING.md
│   ├── 17-PROJECT_TEMPLATE_TREE.md
│   ├── MVP_CONTRACT.md
│   └── ROADMAP.md
├── .agent/
│   └── rules/
├── .gitignore
├── README.md
└── CHANGELOG.md
```

---

## 2. Quy ước nhanh

- `backend/modules/*`: tổ chức theo domain nghiệp vụ, mỗi module có `controller/service/routes/schema`.
- `backend/integrations/google-sheets`: tách riêng client, sync logic, write-back để dễ test/retry.
- `frontend/features/*`: chia theo màn hình/chức năng để team mở rộng không đụng nhau.
- `docs/*`: giữ làm source of truth, khi thay đổi nghiệp vụ phải cập nhật docs tương ứng.

---

## 3. Mapping với MVP hiện tại

- Roles: chỉ `admin | sale`
- Sources: Google Sheets API + CSV/Excel import
- State machine: nhiều trạng thái, chuẩn theo `06-STATE_MACHINE.md`
- Validation/contract: chuẩn theo `08-DATA_CONTRACTS.md` và `11-ERROR_HANDLING.md`
