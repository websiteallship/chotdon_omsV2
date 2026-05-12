# Export Spec — Template OR (Order Request)

**Phiên bản:** 1.0  
**Ngày:** 2026-05-12  
**Nguồn:** 01-CHUC_NANG_CHI_TIET.md §10 | 02-DATABASE_SCHEMA.md | 06-STATE_MACHINE.md

> File này là **nguồn sự thật duy nhất** cho toàn bộ logic sinh file export gửi WMS/OR.

---

## 1. Điều kiện xuất file

Chỉ export đơn thỏa **đồng thời** tất cả điều kiện:

| # | Điều kiện | Giá trị | Hành động nếu sai |
|---|---|---|---|
| 1 | Trạng thái đơn | `status = 'confirmed'` | BLOCK — không đưa vào batch |
| 2 | Ward code | `ward_code IS NOT NULL` | BLOCK — `ADDRESS_NOT_MAPPED` |
| 3 | District code | `district_code IS NOT NULL` | BLOCK — `ADDRESS_NOT_MAPPED` |
| 4 | SKU status | `sku_status = 'auto'` | ⚠️ Cảnh báo đỏ (không block) |
| 5 | Address status | `address_status = 'auto_mapped'` | ⚠️ Cảnh báo đỏ (không block) |

> **Nguyên tắc:** Thiếu mã địa chỉ = block cứng. SKU/address status không hoàn hảo = admin tự quyết.

---

## 2. Đặt tên file & Batch Number

### 2.1 Tên file

```
{BRAND_CODE}_OR_{YYYYMMDD}_{BATCH_SEQ}.xlsx
```

| Token | Ý nghĩa | Ví dụ |
|---|---|---|
| `BRAND_CODE` | `brands.code` | `ZAPATI`, `ALLSHIP` |
| `YYYYMMDD` | Ngày export (server time) | `20260512` |
| `BATCH_SEQ` | Số batch trong ngày, 2 chữ số, bắt đầu `01` | `01`, `02` |

**Ví dụ:**
- `ZAPATI_OR_20260512_01.xlsx`
- `ALLSHIP_OR_20260512_02.xlsx`

### 2.2 Sinh Batch Sequence

```typescript
async function nextBatchSeq(brandId: string, date: string): Promise<string> {
  // date format: 'YYYYMMDD'
  const prefix = `%_OR_${date}_%`;
  const count = await prisma.order.count({
    where: {
      brandId,
      exportBatch: { startsWith: `${brand.code}_OR_${date}_` },
    },
  });
  return String(count + 1).padStart(2, '0');
}
```

---

## 3. Sinh Mã Đơn OR (`or_code`)

Format: `{BRAND_CODE}{YYYYMMDD}{SEQ_5}`

| Token | Ý nghĩa | Ví dụ |
|---|---|---|
| `BRAND_CODE` | `brands.code` | `ZAPATI` |
| `YYYYMMDD` | Ngày export | `20260512` |
| `SEQ_5` | Số thứ tự trong ngày, 3 chữ số | `001`, `042` |

**Ví dụ:** `ZAPATI20260512001`, `ALLSHIP20260512003`

```typescript
async function generateOrCode(brandCode: string, date: string, seq: number): Promise<string> {
  return `${brandCode}${date}${String(seq).padStart(3, '0')}`;
}
```

---

## 4. Column Mapping — OR Template

Thứ tự cột trong file Excel phải **khớp chính xác** với template WMS/OR:

| # | Tên cột OR Template | Nguồn dữ liệu | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|---|---|
| 1 | Mã OR đối tác | `orders.or_code` | string | ✅ | Sinh khi export |
| 2 | Mã SKU đối tác | `orders.product_sku` (`partner_sku` nếu khác) | string | ✅ | |
| 3 | Số lượng | `orders.quantity` | number | ✅ | |
| 4 | Kênh bán hàng | `brands.sales_channel` | string | ✅ | e.g. `Facebook` |
| 5 | Yêu cầu chứng từ | `brands.export_config.require_document` | string | ✅ | `NO` |
| 6 | Loại | `brands.export_config.order_type` | string | ✅ | `Order` |
| 7 | Mã kho | `brands.warehouse_code` | string | ✅ | e.g. `KQ7` |
| 8 | BizType | `brands.export_config.biz_type` | string | ✅ | `B2C` |
| 9 | Người mua | `orders.customer_name` | string | ✅ | |
| 10 | Điện thoại | `orders.phone` | string | ✅ | |
| 11 | Địa chỉ giao hàng | `orders.address_full` | string | ✅ | Chuỗi gốc từ sheet |
| 12 | Địa chỉ | `orders.street_address` | string | ✅ | Phần số nhà, đường |
| 13 | Tên phường/xã | `orders.ward_name` | string | ✅ | |
| 14 | Tên quận/huyện | `orders.district_name` | string | ✅ | |
| 15 | Tên tỉnh/TP | `orders.province_name` | string | ✅ | |
| 16 | Phường/xã (code) | `orders.ward_code` | string | ✅ | 5 chữ số: `14770` |
| 17 | Quận/huyện (code) | `orders.district_code` | string | ✅ | 3 chữ số: `380` |
| 18 | Mã Tình trạng HH | `brands.export_config.goods_status` | string | ✅ | `NEW` |
| 19 | Lấy hàng tại kho | `brands.export_config.pickup_at_warehouse` | string | ✅ | `YES` |
| 20 | Thu hộ (COD) | `orders.selling_price` | number | ✅ | VNĐ, không format dấu phẩy |
| 21 | Mã gói vận chuyển | `brands.export_config.shipping_package` | string | ✅ | `STD` |

---

## 5. Giá trị cố định từ `export_config` per Brand

### ZAPATI

| Field | Giá trị |
|---|---|
| `order_type` | `Order` |
| `biz_type` | `B2C` |
| `require_document` | `NO` |
| `pickup_at_warehouse` | `YES` |
| `goods_status` | `NEW` |
| `shipping_package` | `STD` |
| `need_packaging` | `NO` |

### ALLSHIP

| Field | Giá trị |
|---|---|
| `order_type` | `Order` |
| `biz_type` | `B2C` |
| `require_document` | `NO` |
| `pickup_at_warehouse` | `YES` |
| `goods_status` | `NEW` |
| `shipping_package` | `STD` |
| `need_packaging` | `NO` |

---

## 6. Luồng Generate File (Step-by-step)

```
[1] Admin chọn khoảng ngày → GET /export/preview
        │
        ▼
[2] Query: orders WHERE brand_id=? AND status='confirmed'
    AND created_at BETWEEN from AND to
        │
        ▼
[3] Validate từng đơn:
    ├── ward_code NULL → BLOCK (collect lỗi)
    ├── district_code NULL → BLOCK (collect lỗi)
    ├── sku_status ≠ 'auto' → WARNING (collect cảnh báo)
    └── address_status ≠ 'auto_mapped' → WARNING
        │
        ▼
[4] Nếu có BLOCK → response preview với danh sách lỗi, không cho export
    Nếu chỉ WARNING → hiển thị cảnh báo đỏ, admin confirm rồi export
        │
        ▼
[5] POST /export → admin xác nhận
        │
        ▼
[6] Sinh batch info:
    - date = today YYYYMMDD
    - batchSeq = nextBatchSeq(brandId, date)
    - filename = {BRAND_CODE}_OR_{date}_{batchSeq}.xlsx
        │
        ▼
[7] Với mỗi đơn trong batch:
    - or_code = generateOrCode(brandCode, date, seq++)
    - map fields theo §4
        │
        ▼
[8] Dùng SheetJS tạo workbook → worksheet → buffer
        │
        ▼
[9] Transaction DB:
    - orders.status → 'template_ready' (batch chuẩn bị)
    - orders.or_code = generated
    - orders.export_batch = filename
    - orders.exported_at = now()
    - orders.status → 'exported'
    - INSERT activity_logs (action='export')
        │
        ▼
[10] Trả buffer về client với header:
     Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
     Content-Disposition: attachment; filename="{filename}"
        │
        ▼
[11] (Phase 2) Write-back Google Sheet:
     Cột brands.lead_status_col → "Đã xuất Excel"
     Dùng sheet_row_id để xác định đúng dòng
```

---

## 7. Generate Excel — Code Reference

```typescript
import * as XLSX from 'xlsx';

interface ExportRow {
  or_code: string;
  product_sku: string;
  quantity: number;
  sales_channel: string;
  require_document: string;
  order_type: string;
  warehouse_code: string;
  biz_type: string;
  customer_name: string;
  phone: string;
  address_full: string;
  street_address: string;
  ward_name: string;
  district_name: string;
  province_name: string;
  ward_code: string;
  district_code: string;
  goods_status: string;
  pickup_at_warehouse: string;
  selling_price: number;
  shipping_package: string;
}

const OR_HEADERS = [
  'Mã OR đối tác', 'Mã SKU đối tác', 'Số lượng', 'Kênh bán hàng',
  'Yêu cầu chứng từ', 'Loại', 'Mã kho', 'BizType',
  'Người mua', 'Điện thoại', 'Địa chỉ giao hàng', 'Địa chỉ',
  'Tên phường/xã', 'Tên quận/huyện', 'Tên tỉnh/TP',
  'Phường/xã (code)', 'Quận/huyện (code)',
  'Mã Tình trạng HH', 'Lấy hàng tại kho', 'Thu hộ', 'Mã gói vận chuyển',
];

function buildExcelBuffer(rows: ExportRow[], filename: string): Buffer {
  const wb = XLSX.utils.book_new();

  const data = [
    OR_HEADERS,
    ...rows.map(r => [
      r.or_code, r.product_sku, r.quantity, r.sales_channel,
      r.require_document, r.order_type, r.warehouse_code, r.biz_type,
      r.customer_name, r.phone, r.address_full, r.street_address,
      r.ward_name, r.district_name, r.province_name,
      r.ward_code, r.district_code,
      r.goods_status, r.pickup_at_warehouse, r.selling_price, r.shipping_package,
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Orders');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}
```

---

## 8. Preview Response Contract

```typescript
// GET /brands/:brandId/export/preview?from=2026-05-01&to=2026-05-12
interface ExportPreviewResponse {
  count: number;       // Tổng đơn đủ điều kiện
  blockedCount: number; // Đơn bị block (thiếu mã địa chỉ)
  warningCount: number; // Đơn có cảnh báo
  canExport: boolean;  // false nếu blockedCount > 0
  orders: Array<{
    id: string;
    or_code_preview: string; // or_code dự kiến (chưa chắc chắn)
    customer_name: string;
    product_sku: string;
    quantity: number;
    selling_price: number;
    address_status: string;
    sku_status: string;
    issues: string[];        // ['WARD_CODE_MISSING', 'SKU_NOT_AUTO']
    isBlocked: boolean;
  }>;
}
```

**Ví dụ:**
```json
{
  "count": 23,
  "blockedCount": 1,
  "warningCount": 3,
  "canExport": false,
  "orders": [
    {
      "id": "uuid-001",
      "customer_name": "Nguyễn Văn A",
      "product_sku": "D005CR40",
      "quantity": 1,
      "selling_price": 269000,
      "address_status": "pending",
      "sku_status": "auto",
      "issues": ["WARD_CODE_MISSING"],
      "isBlocked": true
    }
  ]
}
```

---

## 9. Activity Log khi Export

```json
{
  "action": "export",
  "detail": {
    "batch": "ZAPATI_OR_20260512_01.xlsx",
    "count": 22,
    "from": "2026-05-01",
    "to": "2026-05-12",
    "orderIds": ["uuid-001", "uuid-002", "..."]
  }
}
```

---

## 10. Write-back Google Sheet *(Phase 2)*

Sau khi export thành công:

```typescript
// Với mỗi đơn đã export:
// Tìm row trong sheet theo sheet_row_id → ghi giá trị vào cột lead_status_col
async function writeBackExported(orders: Order[], brand: Brand): Promise<void> {
  const updates = orders.map(o => ({
    range: `${brand.sheetRange.split('!')[0]}!${brand.leadStatusCol}${o.sheetRowIndex}`,
    values: [['Đã xuất Excel']],
  }));

  await sheetsClient.spreadsheets.values.batchUpdate({
    spreadsheetId: brand.sheetId,
    requestBody: { data: updates, valueInputOption: 'RAW' },
  });
}
```

> `brands.lead_status_col` = cột letter (e.g. `T`) — ghi trực tiếp tại đúng row.

---

## 11. Error Codes liên quan Export

| Code | HTTP | Tình huống |
|---|---|---|
| `ADDRESS_NOT_MAPPED` | 422 | `ward_code` hoặc `district_code` null |
| `NO_CONFIRMED_ORDERS` | 422 | Không có đơn nào ở trạng thái `confirmed` trong khoảng ngày |
| `EXPORT_BLOCKED` | 422 | Còn đơn bị block (xem `blockedCount`) |
| `SHEET_WRITE_ERROR` | 502 | Write-back Google Sheet thất bại (Phase 2) |
