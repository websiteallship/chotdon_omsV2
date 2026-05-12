# MVP Contract - Single Source of Truth

Ngay cap nhat: 2026-05-12

## 1) Roles (bat buoc)
- Chi co 2 roles: `admin` | `sale`.
- Khong su dung `super_admin`, `brand_admin`, `viewer`.

## 2) Phase 1 scope (bat buoc)
- Bao gom ca 2 nguon du lieu lead:
  - Google Sheets API (manual sync ngay trong MVP).
  - Import CSV/Excel theo dinh dang chuan.
- Khong tri hoan Google Sheets API sang phase sau.

## 3) State machine (bat buoc, nhieu trang thai)
- `new`
- `called_1`
- `called_2`
- `called_3`
- `pending`
- `failed`
- `confirmed`
- `template_ready`
- `exported`
- `cancelled`

## 4) Nguon du lieu thuc te
- Lead thuc te den tu:
  - Keo qua API Google Sheet (service account).
  - Import CSV/Excel chuan.
- Du lieu can duoc dedup bang `sheet_row_id` (doi voi Sheet) va khoa duy nhat tuong ung (doi voi CSV).

## 5) Rule dong bo tai lieu
- README, docs/00, docs/01, docs/ROADMAP, CHANGELOG phai thong nhat voi contract nay.
- Neu co mau thuan, file nay la uu tien cao nhat de sua.
