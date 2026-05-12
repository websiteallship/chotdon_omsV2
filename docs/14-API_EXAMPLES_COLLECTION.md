# API Examples Collection

**Base URL:** `http://localhost:3001/api` (dev) | `https://yourdomain.com/api` (prod)  
**Format:** Bruno-style (có thể import vào Postman/Insomnia/Bruno)  
**Ngày:** 2026-05-12  
**Auth:** Bearer token — lấy từ response login, gán vào header `Authorization: Bearer <token>`

---

## Biến môi trường (Environment Variables)

```
BASE_URL      = http://localhost:3001/api
ACCESS_TOKEN  = (lấy từ response login)
BRAND_ID      = (UUID của brand đang test)
ORDER_ID      = (UUID của order đang test)
```

---

## 1. AUTH

### 1.1 Login

```http
POST {{BASE_URL}}/auth/login
Content-Type: application/json

{
  "email": "admin@zapati.vn",
  "password": "Admin@123"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1dWlkLTEyMyIsInJvbGUiOiJhZG1pbiIsImJyYW5kSWRzIjpbInV1aWQtYnJhbmQtMSJdLCJpYXQiOjE3NDcwMDAwMDAsImV4cCI6MTc0NzAwOTAwMH0.abc",
    "user": {
      "id": "uuid-123",
      "name": "Nguyễn Admin",
      "email": "admin@zapati.vn",
      "role": "admin",
      "brands": [
        { "id": "uuid-brand-1", "name": "ZAPATI", "code": "ZAPATI" }
      ]
    }
  }
}
```

**Response 401 — Sai mật khẩu:**
```json
{
  "success": false,
  "error": "Email hoặc mật khẩu không đúng",
  "code": "INVALID_CREDENTIALS"
}
```

---

### 1.2 Get current user

```http
GET {{BASE_URL}}/auth/me
Authorization: Bearer {{ACCESS_TOKEN}}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-123",
    "name": "Nguyễn Admin",
    "email": "admin@zapati.vn",
    "role": "admin",
    "brands": [
      { "id": "uuid-brand-1", "name": "ZAPATI", "code": "ZAPATI" }
    ]
  }
}
```

---

### 1.3 Refresh token

```http
POST {{BASE_URL}}/auth/refresh
# Cookie: refresh_token=<httpOnly cookie tự động gửi>
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGci..."
  }
}
```

---

### 1.4 Logout

```http
POST {{BASE_URL}}/auth/logout
Authorization: Bearer {{ACCESS_TOKEN}}
```

**Response 200:**
```json
{ "success": true }
```

---

## 2. BRANDS

### 2.1 List brands

```http
GET {{BASE_URL}}/brands
Authorization: Bearer {{ACCESS_TOKEN}}
```

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-brand-1",
      "name": "ZAPATI",
      "code": "ZAPATI",
      "sheetId": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms",
      "sheetRange": "Sheet1!A:U",
      "isConnected": true,
      "createdAt": "2026-05-01T00:00:00Z"
    }
  ]
}
```

---

### 2.2 Tạo brand mới (admin only)

```http
POST {{BASE_URL}}/brands
Authorization: Bearer {{ACCESS_TOKEN}}
Content-Type: application/json

{
  "name": "BRAND B",
  "code": "BRANDB",
  "sheetId": "1abc...",
  "sheetRange": "Sheet1!A:V",
  "columnMapping": {
    "customer_name": "B",
    "phone": "C",
    "product_name_raw": "E",
    "color_raw": "F",
    "size_raw": "G",
    "address_full": "H",
    "note": "D"
  }
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-brand-new",
    "name": "BRAND B",
    "code": "BRANDB"
  }
}
```

---

### 2.3 Test kết nối Google Sheet

```http
POST {{BASE_URL}}/brands/{{BRAND_ID}}/test-connection
Authorization: Bearer {{ACCESS_TOKEN}}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "headers": ["Thời gian", "Tên", "SĐT", "Size", "Ghi chú", "Sản phẩm", "Màu sắc", "Địa chỉ"],
    "preview": [
      ["2026-05-10 08:30", "Nguyễn Văn A", "0901234567", "40", "", "Mua 1 đôi D005 giá 269k + Freeship", "Màu Cá Sấu", "123 Lê Lợi, P. Bến Nghé, Q.1, TP.HCM"]
    ],
    "totalRows": 245
  }
}
```

**Response 502 — Sheet lỗi:**
```json
{
  "success": false,
  "error": "Không thể kết nối Google Sheet",
  "code": "SHEET_CONNECTION_ERROR",
  "detail": "The caller does not have permission"
}
```

---

## 3. ORDERS

### 3.1 List orders (với filter)

```http
GET {{BASE_URL}}/brands/{{BRAND_ID}}/orders?status=new&status=called_1&page=1&limit=15
Authorization: Bearer {{ACCESS_TOKEN}}
```

**Query params:**
- `status` — multi-value: `new`, `called_1`, `called_2`, `called_3`, `pending`, `failed`, `confirmed`, `template_ready`, `exported`, `cancelled`
- `search` — tìm theo tên / SĐT
- `from`, `to` — `YYYY-MM-DD`
- `page`, `limit` — phân trang
- `skuStatus` — `needs_sku`, `needs_combo`, `auto`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "ord-uuid-001",
        "customerName": "Nguyễn Văn A",
        "phone": "0901234567",
        "status": "new",
        "skuStatus": "needs_combo",
        "addressStatus": "auto_mapped",
        "productNameRaw": "Mua 1 đôi D005 giá 269k + Freeship\nMua 2 đôi D005 giá 489k + Freeship",
        "productSku": null,
        "quantity": null,
        "sellingPrice": null,
        "createdAt": "2026-05-10T08:30:00Z",
        "updatedAt": "2026-05-10T08:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 15,
      "total": 84,
      "totalPages": 6
    }
  }
}
```

---

### 3.2 Chi tiết đơn

```http
GET {{BASE_URL}}/brands/{{BRAND_ID}}/orders/{{ORDER_ID}}
Authorization: Bearer {{ACCESS_TOKEN}}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "ord-uuid-001",
    "brandId": "uuid-brand-1",
    "customerName": "Nguyễn Văn A",
    "phone": "0901234567",
    "addressFull": "123 Lê Lợi, P. Bến Nghé, Q.1, TP.HCM",
    "provinceName": "Thành phố Hồ Chí Minh",
    "districtName": "Quận 1",
    "wardName": "Phường Bến Nghé",
    "districtCode": "760",
    "wardCode": "26734",
    "addressStatus": "auto_mapped",
    "productNameRaw": "Mua 1 đôi D005 giá 269k...\nMua 2 đôi D005 giá 489k...",
    "productLinesJson": [
      { "qty": 1, "productRaw": "D005", "priceRaw": 269000 },
      { "qty": 2, "productRaw": "D005", "priceRaw": 489000 }
    ],
    "selectedLineIdx": null,
    "productSku": null,
    "quantity": null,
    "sellingPrice": null,
    "skuStatus": "needs_combo",
    "status": "new",
    "note": "",
    "statusHistory": [
      { "status": "new", "at": "2026-05-10T08:30:00Z", "by": "system" }
    ],
    "sheetRowId": "row_245",
    "createdAt": "2026-05-10T08:30:00Z",
    "updatedAt": "2026-05-10T08:30:00Z"
  }
}
```

---

### 3.3 Cập nhật đơn (thông tin + đổi trạng thái)

```http
PATCH {{BASE_URL}}/brands/{{BRAND_ID}}/orders/{{ORDER_ID}}
Authorization: Bearer {{ACCESS_TOKEN}}
Content-Type: application/json

{
  "status": "called_1",
  "productSku": "D005CS40",
  "quantity": 2,
  "sellingPrice": 489000,
  "selectedLineIdx": 1,
  "note": "Gọi lại chiều mai"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "ord-uuid-001",
    "status": "called_1",
    "productSku": "D005CS40",
    "quantity": 2,
    "sellingPrice": 489000,
    "updatedAt": "2026-05-10T10:15:00Z"
  }
}
```

**Response 422 — Transition không hợp lệ:**
```json
{
  "success": false,
  "error": "INVALID_TRANSITION",
  "code": "INVALID_STATE_TRANSITION",
  "from": "exported",
  "to": "called_1",
  "message": "exported → called_1 is not allowed"
}
```

---

### 3.4 Chốt đơn (confirm)

> Endpoint này validate đầy đủ trước khi chuyển sang `confirmed`.

```http
POST {{BASE_URL}}/brands/{{BRAND_ID}}/orders/{{ORDER_ID}}/confirm
Authorization: Bearer {{ACCESS_TOKEN}}
Content-Type: application/json

{
  "note": "Khách đồng ý, giao thứ 2"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "ord-uuid-001",
    "status": "confirmed",
    "updatedAt": "2026-05-10T10:20:00Z"
  }
}
```

**Response 422 — Validation gate thất bại:**
```json
{
  "success": false,
  "error": "CONFIRMATION_VALIDATION_FAILED",
  "code": "CONFIRMATION_VALIDATION_FAILED",
  "errors": [
    { "field": "product_sku", "code": "SKU_NOT_RESOLVED", "message": "SKU chưa được xác định" },
    { "field": "ward_code", "code": "WARD_CODE_MISSING", "message": "Thiếu mã phường/xã" }
  ]
}
```

---

### 3.5 Sync từ Google Sheet

```http
POST {{BASE_URL}}/brands/{{BRAND_ID}}/orders/sync
Authorization: Bearer {{ACCESS_TOKEN}}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "new": 12,
    "skipped": 45,
    "invalid": 2,
    "invalidRows": [
      { "row": 5, "reason": "Thiếu SĐT" },
      { "row": 18, "reason": "Thiếu tên khách hàng" }
    ],
    "syncedAt": "2026-05-10T10:25:00Z"
  }
}
```

**Response 502 — Sheet lỗi:**
```json
{
  "success": false,
  "error": "Không thể kết nối Google Sheet",
  "code": "SHEET_CONNECTION_ERROR"
}
```

---

### 3.6 Import CSV / Excel

```http
POST {{BASE_URL}}/brands/{{BRAND_ID}}/orders/import-csv
Authorization: Bearer {{ACCESS_TOKEN}}
Content-Type: multipart/form-data

file: <file.csv or file.xlsx>
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "imported": 38,
    "skipped": 2,
    "invalid": 1,
    "invalidRows": [
      { "row": 15, "reason": "SĐT không hợp lệ: 090123" }
    ]
  }
}
```

---

## 4. PRODUCTS (SKU)

### 4.1 List SKU

```http
GET {{BASE_URL}}/brands/{{BRAND_ID}}/products?search=D005&active=true&page=1&limit=20
Authorization: Bearer {{ACCESS_TOKEN}}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "sku-uuid-001",
        "sku": "D005CS40",
        "skuPartner": "ZP-D005-CS-40",
        "name": "Giày D005",
        "color": "Màu Cá Sấu",
        "size": "40",
        "price": 269000,
        "active": true
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 48 }
  }
}
```

---

### 4.2 Lookup SKU từ text

```http
GET {{BASE_URL}}/brands/{{BRAND_ID}}/products/lookup?q=D005&color=Cá Sấu&size=40
Authorization: Bearer {{ACCESS_TOKEN}}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "matches": [
      { "sku": "D005CS40", "name": "Giày D005", "color": "Màu Cá Sấu", "size": "40", "price": 269000, "score": 0.95 },
      { "sku": "D005CS41", "name": "Giày D005", "color": "Màu Cá Sấu", "size": "41", "price": 269000, "score": 0.72 }
    ]
  }
}
```

---

### 4.3 Upload SKU Excel (admin only)

```http
POST {{BASE_URL}}/brands/{{BRAND_ID}}/products/import
Authorization: Bearer {{ACCESS_TOKEN}}
Content-Type: multipart/form-data

file: <Danh_sach_san_pham.xlsx>
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "inserted": 150,
    "updated": 12,
    "deactivated": 3,
    "errors": []
  }
}
```

---

## 5. EXPORT

### 5.1 Preview đơn sẽ export

```http
GET {{BASE_URL}}/brands/{{BRAND_ID}}/export/preview?from=2026-05-10&to=2026-05-12
Authorization: Bearer {{ACCESS_TOKEN}}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "count": 23,
    "orders": [
      {
        "id": "ord-uuid-001",
        "customerName": "Nguyễn Văn A",
        "phone": "0901234567",
        "sku": "D005CS40",
        "quantity": 2,
        "cod": 538000,
        "addressStatus": "auto_mapped",
        "wardCode": "26734",
        "districtCode": "760"
      }
    ],
    "warnings": [
      { "orderId": "ord-uuid-002", "issue": "address_not_mapped", "customerName": "Trần Thị B" }
    ]
  }
}
```

---

### 5.2 Generate file xlsx

```http
POST {{BASE_URL}}/brands/{{BRAND_ID}}/export
Authorization: Bearer {{ACCESS_TOKEN}}
Content-Type: application/json

{
  "from": "2026-05-10",
  "to": "2026-05-12",
  "forceExport": false
}
```

**Response 200 — File download:**
```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="ZAPATI_OR_20260512_001.xlsx"

<binary xlsx data>
```

**Response 422 — Có đơn chưa map địa chỉ (forceExport=false):**
```json
{
  "success": false,
  "error": "ADDRESS_NOT_MAPPED",
  "code": "ADDRESS_NOT_MAPPED",
  "message": "2 đơn chưa map được địa chỉ. Dùng forceExport=true để bỏ qua.",
  "orders": [
    { "id": "ord-uuid-002", "customerName": "Trần Thị B", "addressFull": "..." }
  ]
}
```

---

### 5.3 Export history

```http
GET {{BASE_URL}}/brands/{{BRAND_ID}}/export/history?page=1&limit=10
Authorization: Bearer {{ACCESS_TOKEN}}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "exports": [
      {
        "id": "exp-uuid-001",
        "filename": "ZAPATI_OR_20260512_001.xlsx",
        "orderCount": 23,
        "exportedBy": "Nguyễn Admin",
        "exportedAt": "2026-05-12T08:00:00Z"
      }
    ],
    "pagination": { "page": 1, "limit": 10, "total": 5 }
  }
}
```

---

## 6. USERS (Admin only)

### 6.1 List users trong brand

```http
GET {{BASE_URL}}/brands/{{BRAND_ID}}/users
Authorization: Bearer {{ACCESS_TOKEN}}
```

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "user-uuid-001",
      "name": "Trần Sale",
      "email": "sale@zapati.vn",
      "roleInBrand": "sale",
      "isActive": true,
      "createdAt": "2026-05-01T00:00:00Z"
    }
  ]
}
```

---

### 6.2 Tạo user mới + gán brand

```http
POST {{BASE_URL}}/brands/{{BRAND_ID}}/users
Authorization: Bearer {{ACCESS_TOKEN}}
Content-Type: application/json

{
  "name": "Lê Sale Mới",
  "email": "sale2@zapati.vn",
  "password": "Sale@123",
  "roleInBrand": "sale"
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "user-uuid-002",
    "name": "Lê Sale Mới",
    "email": "sale2@zapati.vn",
    "roleInBrand": "sale"
  }
}
```

---

## 7. DISTRICT WARD CODES

### 7.1 Lookup mã địa chỉ

```http
GET {{BASE_URL}}/district-ward-codes/lookup?province=TP Hồ Chí Minh&district=Quận 1&ward=Phường Bến Nghé
Authorization: Bearer {{ACCESS_TOKEN}}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "provinceName": "Thành phố Hồ Chí Minh",
    "districtName": "Quận 1",
    "wardName": "Phường Bến Nghé",
    "districtCode": "760",
    "wardCode": "26734",
    "confidence": 0.98,
    "matchType": "exact"
  }
}
```

**Response 200 — Không khớp chính xác (fuzzy):**
```json
{
  "success": true,
  "data": {
    "confidence": 0.72,
    "matchType": "fuzzy",
    "suggestions": [
      { "wardName": "Phường Bến Nghé", "districtName": "Quận 1", "wardCode": "26734", "score": 0.92 },
      { "wardName": "Phường Bến Thành", "districtName": "Quận 1", "wardCode": "26737", "score": 0.71 }
    ]
  }
}
```

---

## 8. LOGS & HISTORY

### 8.1 History của 1 đơn

```http
GET {{BASE_URL}}/brands/{{BRAND_ID}}/orders/{{ORDER_ID}}/logs
Authorization: Bearer {{ACCESS_TOKEN}}
```

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "log-uuid-001",
      "action": "status_change",
      "detail": { "from": "new", "to": "called_1", "note": "Khách không nghe máy" },
      "performedBy": "Trần Sale",
      "createdAt": "2026-05-10T09:00:00Z"
    },
    {
      "id": "log-uuid-002",
      "action": "status_change",
      "detail": { "from": "called_1", "to": "confirmed", "note": "Khách đồng ý" },
      "performedBy": "Trần Sale",
      "createdAt": "2026-05-10T14:30:00Z"
    }
  ]
}
```

---

### 8.2 Activity log của brand

```http
GET {{BASE_URL}}/brands/{{BRAND_ID}}/logs?type=export&type=sync_sheet&page=1&limit=20
Authorization: Bearer {{ACCESS_TOKEN}}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "log-brand-001",
        "action": "export",
        "detail": { "filename": "ZAPATI_OR_20260512_001.xlsx", "count": 23 },
        "performedBy": "Nguyễn Admin",
        "createdAt": "2026-05-12T08:00:00Z"
      },
      {
        "id": "log-brand-002",
        "action": "sync_sheet",
        "detail": { "new": 12, "skipped": 45 },
        "performedBy": "Trần Sale",
        "createdAt": "2026-05-12T07:30:00Z"
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 48 }
  }
}
```

---

## 9. ERROR CODES — Quick Reference

| HTTP | Code | Ý nghĩa |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body request thiếu / sai format |
| 401 | `UNAUTHORIZED` | Không có token / token hết hạn |
| 403 | `FORBIDDEN` | Không có quyền trên brand này |
| 404 | `NOT_FOUND` | Resource không tồn tại |
| 422 | `INVALID_STATE_TRANSITION` | Chuyển trạng thái không hợp lệ |
| 422 | `CONFIRMATION_VALIDATION_FAILED` | Gate chốt đơn thất bại (multi-error) |
| 422 | `SKU_NOT_RESOLVED` | SKU chưa được xác định |
| 422 | `SKU_MISSING` | SKU null/rỗng |
| 422 | `ADDRESS_NOT_MAPPED` | Địa chỉ chưa map mã OR |
| 422 | `WARD_CODE_MISSING` | Thiếu ward_code |
| 422 | `DISTRICT_CODE_MISSING` | Thiếu district_code |
| 422 | `INVALID_QUANTITY` | Số lượng < 1 |
| 422 | `INVALID_PRICE` | Giá ≤ 0 |
| 429 | `RATE_LIMIT_EXCEEDED` | Quá nhiều request |
| 502 | `SHEET_CONNECTION_ERROR` | Lỗi kết nối Google Sheet |
| 500 | `INTERNAL_ERROR` | Lỗi server không xác định |

---

## 10. Cách import vào Bruno / Postman

### Bruno (khuyến nghị)
1. Tạo collection folder `chotdon-api`
2. Tạo file `.bru` cho từng request theo format trên
3. Tạo file `environments/local.bru` với các biến `BASE_URL`, `ACCESS_TOKEN`, ...

### Postman
1. File → Import → Raw text → paste JSON dạng Postman Collection v2.1
2. Hoặc dùng Postman Environment để lưu `ACCESS_TOKEN` sau khi login

### Insomnia
1. File → Import → Paste YAML/JSON
2. Dùng `_.environment.ACCESS_TOKEN` trong header

> **Tip QA:** Sau login, copy `access_token` vào env variable. Tất cả request còn lại sẽ tự dùng.
