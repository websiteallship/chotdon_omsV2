# Data Contracts — Input từ Google Sheets & CSV

**Phiên bản:** 1.0  
**Ngày:** 2026-05-12  
**Nguồn:** 01-CHUC_NANG_CHI_TIET.md §4, §6, §7 | 02-DATABASE_SCHEMA.md

> File này là **nguồn sự thật duy nhất** cho chuẩn dữ liệu đầu vào. Mọi service import/sync phải tuân thủ.

---

## 1. Nguồn dữ liệu hỗ trợ

| Nguồn | Endpoint | Format | Encoding |
|---|---|---|---|
| Google Sheets API | `POST /orders/sync` | JSON array (Sheets API v4) | UTF-8 (Sheets tự xử lý) |
| File CSV | `POST /orders/import-csv` | CSV | **Bắt buộc UTF-8** (có BOM hoặc không) |
| File Excel (.xlsx) | `POST /orders/import-csv` | XLSX binary | UTF-8 nội bộ (xlsx lib tự decode) |

---

## 2. Encoding & Format

### 2.1 CSV

- **Encoding:** UTF-8. Nếu client upload file Windows-1252 (ANSI) → server phải **detect + reject** với lỗi `ENCODING_ERROR`.
- **Delimiter:** dấu phẩy `,` hoặc tab `\t` (auto-detect).
- **Header row:** Bắt buộc có ở dòng 1.
- **Line ending:** LF hoặc CRLF đều chấp nhận.
- **Quoted fields:** Hỗ trợ `"` để bao quanh giá trị chứa dấu phẩy.

```typescript
// Detect encoding khi nhận file
import chardet from 'chardet';
import iconv from 'iconv-lite';

function decodeBuffer(buffer: Buffer): string {
  const detected = chardet.detect(buffer); // 'UTF-8' | 'windows-1252' | ...
  if (detected !== 'UTF-8' && detected !== 'ASCII') {
    throw new AppError('ENCODING_ERROR', `File encoding "${detected}" không được hỗ trợ. Vui lòng lưu file dưới định dạng UTF-8.`);
  }
  return iconv.decode(buffer, 'utf-8');
}
```

### 2.2 Excel (.xlsx)

- Dùng thư viện `xlsx` (SheetJS) — tự decode Unicode nội bộ.
- Sheet đầu tiên (`SheetNames[0]`) được đọc.
- Dòng 1 = header row.

### 2.3 Google Sheets API

- Sheets API v4 trả về string UTF-8.
- Đọc theo `sheet_range` cấu hình trong brand (e.g. `Sheet1!A:U`).
- Row đầu tiên = header (dùng làm lookup key cho `column_mapping`).

---

## 3. Column Mapping per Brand

### 3.1 Cơ chế mapping

Mỗi brand lưu `column_mapping` (JSONB) dạng:
```
{ "<DB field>": "<Tên cột trong sheet/CSV>" }
```

Khi import, với mỗi row:
```typescript
function mapRow(rawRow: Record<string, string>, columnMapping: Record<string, string>): MappedRow {
  const mapped: Partial<MappedRow> = {};
  for (const [dbField, sheetCol] of Object.entries(columnMapping)) {
    mapped[dbField] = rawRow[sheetCol]?.trim() ?? null;
  }
  return mapped as MappedRow;
}
```

### 3.2 Column Mapping — Brand ZAPATI

| DB Field | Tên cột sheet | Bắt buộc |
|---|---|---|
| `customer_name` | `Tên` | ✅ |
| `phone` | `SĐT` | ✅ |
| `address_full` | `Địa chỉ` | ✅ |
| `product_name_raw` | `Sản phẩm` | ✅ |
| `color_raw` | `Màu sắc` | ❌ |
| `size_raw` | `Size` | ❌ |
| `note` | `Ghi chú` | ❌ |
| `created_at` | `Thời gian` | ❌ |
| `utm_source` | `utm_source` | ❌ |
| `utm_medium` | `utm_medium` | ❌ |
| `utm_campaign` | `utm_campaign` | ❌ |
| `utm_term` | `utm_term` | ❌ |
| `utm_content` | `utm_content` | ❌ |
| `ip_address` | `IP` | ❌ |
| `form_id` | `FORM` | ❌ |
| `source_url` | `URL link` | ❌ |
| `lead_status` | `lead_status` | ❌ |

### 3.3 Column Mapping — Brand ALLSHIP

| DB Field | Tên cột sheet | Bắt buộc | Ghi chú |
|---|---|---|---|
| `customer_name` | `Tên` | ✅ | |
| `phone` | `SĐT` | ✅ | |
| `address_full` | `Địa chỉ` | ✅ | Thường thiếu cấp ward — fuzzy match |
| `product_name_raw` | `Sản phẩm` | ✅ | |
| `color_raw` | `Loại` | ❌ | Cột variant tổng hợp, không tách `Màu`/`Size` |
| `created_at` | `Ngày` | ❌ | |
| `utm_source` | `utm_source` | ❌ | |
| `utm_medium` | `utm_medium` | ❌ | |
| `utm_campaign` | `utm_campaign` | ❌ | |
| `utm_term` | `utm_term` | ❌ | |
| `utm_content` | `utm_content` | ❌ | |
| `ip_address` | `IP` | ❌ | |
| `form_id` | `FORM` | ❌ | |
| `source_url` | `Link URL` | ❌ | |

> ⚠️ ALLSHIP **không có** cột `Size`, `Ghi chú`. `sku_variant_field = "Loại"` — variant nằm trong 1 cột.

---

## 4. Required Fields (Validate trước khi insert)

| Field | DB column | Rule | Lỗi khi vi phạm |
|---|---|---|---|
| Tên khách hàng | `customer_name` | Not null, not empty string | `MISSING_CUSTOMER_NAME` |
| Số điện thoại | `phone` | Not null, không rỗng | `MISSING_PHONE` |

> Chỉ 2 field bắt buộc ở tầng import. Các validate khác (SKU, địa chỉ) thực hiện khi **chốt đơn**.

```typescript
function validateRequiredFields(row: MappedRow): string[] {
  const errors: string[] = [];
  if (!row.customer_name?.trim()) errors.push('MISSING_CUSTOMER_NAME');
  if (!row.phone?.trim())         errors.push('MISSING_PHONE');
  return errors;
}
```

---

## 5. Dedup Key (Chống import trùng)

### 5.1 Google Sheets — `sheet_row_id`

- Dùng **Ladi Tracking ID** nếu có (cột `FORM` hoặc cột tracking từ brand config).
- Fallback: **row index tuyệt đối** trong sheet (e.g. `row_7`, `row_42`).
- DB unique constraint: `UNIQUE(brand_id, sheet_row_id)`.

```typescript
function buildSheetRowId(rawRow: Record<string, string>, rowIndex: number, brand: Brand): string {
  // Ưu tiên lấy form_id nếu có
  const formIdCol = brand.columnMapping['form_id'];
  const formId = formIdCol ? rawRow[formIdCol]?.trim() : null;
  if (formId) return formId;

  // Fallback: row index
  return `row_${rowIndex}`;
}
```

### 5.2 CSV/Excel import — `sheet_row_id`

- Tương tự Sheets: ưu tiên cột tracking ID, fallback `csv_row_{index}`.
- Nếu cùng brand đã có record với `sheet_row_id` này → **bỏ qua** (không update).

### 5.3 Xử lý conflict

```typescript
// Upsert với conflict ignore
await prisma.order.createMany({
  data: rows,
  skipDuplicates: true,  // Bỏ qua nếu UNIQUE(brand_id, sheet_row_id) đã tồn tại
});
```

---

## 6. Xử lý Row Lỗi

### 6.1 Phân loại

| Loại lỗi | `import_status` | Hành động |
|---|---|---|
| Thiếu `customer_name` hoặc `phone` | `invalid` | Insert với `import_status='invalid'`, không tạo đơn active |
| Row trùng `sheet_row_id` | *(bỏ qua)* | `skipDuplicates = true`, đếm vào `skipped` |
| Row hợp lệ | `ok` | Insert bình thường, `status = 'new'` |

### 6.2 Response trả về sau import/sync

```typescript
interface SyncResult {
  new: number;       // Leads mới thêm thành công
  skipped: number;   // Trùng sheet_row_id → bỏ qua
  invalid: number;   // Thiếu tên/SĐT
  invalidRows: Array<{
    row: number;         // Row index trong file/sheet
    sheetRowId: string;
    reason: string;      // 'MISSING_CUSTOMER_NAME' | 'MISSING_PHONE'
    rawData: Record<string, string>;
  }>;
}
```

**Ví dụ response:**
```json
{
  "new": 12,
  "skipped": 45,
  "invalid": 2,
  "invalidRows": [
    { "row": 5, "sheetRowId": "row_5", "reason": "MISSING_PHONE", "rawData": { "Tên": "Nguyễn A", "SĐT": "" } },
    { "row": 18, "sheetRowId": "row_18", "reason": "MISSING_CUSTOMER_NAME", "rawData": { "Tên": "", "SĐT": "0901234567" } }
  ]
}
```

---

## 7. Transform Pipeline (thứ tự xử lý)

```
Raw rows (sheet/CSV)
        │
        ▼
[1] Parse header → apply column_mapping → MappedRow[]
        │
        ▼
[2] Validate required fields (phone, name)
    ├── fail → mark import_status='invalid', collect invalidRows
    └── pass → continue
        │
        ▼
[3] Build sheet_row_id (form_id hoặc row index)
        │
        ▼
[4] Parse product string → product_lines_json (regex)
        │
        ▼
[5] Parse address string → street/ward/district/province (split by comma)
        │
        ▼
[6] Lookup address codes (exact match → district_ward_codes)
    ├── exact → address_status='auto_mapped', ward_code, district_code filled
    ├── no match → address_status='pending'
    └── (Phase 2) fuzzy match → address_status='needs_review'
        │
        ▼
[7] Lookup SKU (model + color + size → products table)
    ├── 1 match → sku_status='auto', product_sku filled
    ├── multi combo → sku_status='needs_combo'
    └── no match → sku_status='needs_sku'
        │
        ▼
[8] createMany({ skipDuplicates: true })
        │
        ▼
[9] Return SyncResult
```

---

## 8. Validate Format Các Trường Cụ Thể

### 8.1 Phone

```typescript
function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  // Bỏ khoảng trắng, dấu gạch, chấm
  const cleaned = raw.replace(/[\s\-\.]/g, '');
  // Chấp nhận: 10 số bắt đầu 0, hoặc +84 + 9 số
  if (/^0\d{9}$/.test(cleaned)) return cleaned;
  if (/^\+84\d{9}$/.test(cleaned)) return '0' + cleaned.slice(3);
  return cleaned; // Lưu nguyên, không block import
}
```

> Phone không hợp lệ format → vẫn lưu, không block import. Chỉ block nếu **rỗng hoàn toàn**.

### 8.2 created_at từ sheet

```typescript
function parseSheetDate(raw: string): Date | null {
  if (!raw) return null;
  // Format thực tế từ Ladi: "2026/05/10 08:32:15" hoặc "10/05/2026"
  const parsed = new Date(raw.replace(/\//g, '-'));
  return isNaN(parsed.getTime()) ? null : parsed;
}
```

### 8.3 Selling Price từ product string

```typescript
// "Mua 1 đôi D005 giá 269k" → 269000
// "Mua 5 cây dao cắt 509k" → 509000
const PRICE_REGEX = /giá\s+(\d+)k/i;

function parsePrice(productRaw: string): number | null {
  const match = productRaw.match(PRICE_REGEX);
  return match ? parseInt(match[1]) * 1000 : null;
}
```

### 8.4 Quantity

```typescript
// ZAPATI: "Mua (\d+) đôi"
// ALLSHIP: "Mua (\d+) cây"
const QTY_REGEX = /Mua\s+(\d+)\s+/i;

function parseQty(productRaw: string): number {
  const match = productRaw.match(QTY_REGEX);
  return match ? parseInt(match[1]) : 1;
}
```

---

## 9. Các Trường Luôn Được Set Tự Động Khi Import

| Field | Giá trị mặc định | Ghi chú |
|---|---|---|
| `status` | `new` | Mọi lead mới |
| `import_status` | `ok` | Trừ row thiếu tên/SĐT → `invalid` |
| `address_status` | `pending` → update sau step [6] | Sau parse địa chỉ |
| `sku_status` | `pending` → update sau step [7] | Sau lookup SKU |
| `quantity` | `1` | Nếu parse thất bại |
| `selling_price` | `0` | Nếu parse thất bại |
| `selected_line_idx` | `0` | |
| `created_at` | `now()` hoặc giá trị parse từ sheet | Ưu tiên giá trị sheet |

---

## 10. Giới hạn & Ràng buộc

| Ràng buộc | Giá trị | Ghi chú |
|---|---|---|
| Max rows per sync | 5,000 rows | Nếu vượt → trả lỗi `TOO_MANY_ROWS`, yêu cầu chia nhỏ |
| Max file size CSV/Excel | 10 MB | |
| Timeout đọc Sheet API | 30 giây | |
| Encoding CSV | UTF-8 only | |
| Batch insert size | 500 rows/batch | Tránh timeout Prisma `createMany` |

```typescript
const BATCH_SIZE = 500;

async function batchInsert(rows: OrderCreateInput[]): Promise<void> {
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await prisma.order.createMany({ data: batch, skipDuplicates: true });
  }
}
```
