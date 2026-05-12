# API Design — SaleGenius

**Base URL:** `http://localhost:3001/api`  
**Auth:** Bearer Token (JWT) trong header `Authorization`  
**Cập nhật:** 2026-05-12

---

## Quy ước

- Response thành công: `{ success: true, data: {...} }`
- Response lỗi: `{ success: false, error: "message", code: "ERROR_CODE" }`
- Phân trang: `?page=1&limit=15`
- Brand context: Mọi request cần `brandId` qua URL param
- Phân quyền chi tiết theo `07-RBAC_POLICY.md`
- State machine và gate validate theo `06-STATE_MACHINE.md`

---

## 1. Auth

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| POST | `/auth/login` | Đăng nhập → access_token + refresh cookie | ❌ |
| POST | `/auth/logout` | Đăng xuất, xóa refresh token | ✅ |
| POST | `/auth/refresh` | Lấy access_token mới từ refresh cookie | ❌ |
| GET | `/auth/me` | Thông tin user + danh sách brand | ✅ |

**Login request/response:**
```json
// POST /auth/login
{ "email": "admin@brand.vn", "password": "..." }

// 200 OK
{ "access_token": "eyJ...", "user": { "id": "uuid", "name": "...", "brands": [...] } }
// Set-Cookie: refresh_token=...; HttpOnly
```

---

## 2. Brands

> Admin only (trừ GET)

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/brands` | Danh sách brand của user |
| POST | `/brands` | Tạo brand mới |
| GET | `/brands/:id` | Chi tiết + config |
| PATCH | `/brands/:id` | Cập nhật sheet config, column mapping, export config |
| POST | `/brands/:id/test-connection` | Test kết nối Google Sheet |

**test-connection response:**
```json
{ "headers": ["Tên", "SĐT", "Sản phẩm", ...], "preview": [["Nguyễn A", "0901...", ...]] }
```

---

## 3. Users

> Admin only

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/brands/:brandId/users` | Danh sách users trong brand |
| POST | `/brands/:brandId/users` | Tạo user + gán brand |
| PATCH | `/brands/:brandId/users/:id` | Sửa role / vô hiệu hóa |
| DELETE | `/brands/:brandId/users/:id` | Gỡ user khỏi brand |

---

## 4. Products (SKU)

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/brands/:brandId/products` | Danh sách SKU (`?search=&active=`) |
| POST | `/brands/:brandId/products/import` | Upload Excel SKU (`multipart/form-data`) |
| POST | `/brands/:brandId/products` | Thêm SKU thủ công |
| PATCH | `/brands/:brandId/products/:id` | Sửa SKU |
| GET | `/brands/:brandId/products/lookup` | Tìm SKU từ text (`?q=&color=&size=`) |

**lookup response:**
```json
{ "matches": [{ "sku": "D005CS40", "name": "Giày D005", "price": 269000, "score": 0.95 }] }
```

---

## 5. Orders

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/brands/:brandId/orders` | Danh sách leads (filter, search, phân trang) |
| GET | `/brands/:brandId/orders/:id` | Chi tiết đơn + history |
| PATCH | `/brands/:brandId/orders/:id` | Cập nhật đơn / đổi trạng thái |
| POST | `/brands/:brandId/orders/:id/confirm` | Chốt đơn (validate SKU + địa chỉ) |
| POST | `/brands/:brandId/orders/sync` | Manual sync từ Google Sheet |
| POST | `/brands/:brandId/orders/import-csv` | Import từ file CSV/Excel |

**GET orders params:** `?status=new&status=called_1&search=0901&page=1&limit=15&from=2026-05-01&to=2026-05-11`

**PATCH order:**
```json
{ "status": "called_1", "product_sku": "D005CS40", "quantity": 2, "price": 269000, "note": "Gọi lại chiều" }
```

**Role notes:**
- `PATCH /brands/:brandId/orders/:id`: `admin` và `sale` đều gọi được, nhưng transition thực tế bị chặn theo RBAC + state machine.
- `confirmed -> cancelled`, `confirmed -> template_ready`, `template_ready -> exported`: chỉ `admin`.

**sync response:**
```json
{ "new": 12, "skipped": 45, "invalid": 2, "invalidRows": [{ "row": 5, "reason": "Thiếu SĐT" }] }
```

---

## 6. Export

> `admin` only. `sale` phải nhận `403 FORBIDDEN`.

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/brands/:brandId/export/preview` | Preview đơn sẽ export (`?from=&to=`) |
| POST | `/brands/:brandId/export` | Generate + download xlsx |

**preview response:**
```json
{
  "count": 23,
  "orders": [{ "id": "...", "customer_name": "...", "sku": "...", "cod": 538000 }],
  "warnings": [{ "orderId": "ORD-001", "issue": "address_not_mapped" }]
}
```

**export — nếu có đơn lỗi địa chỉ:**
```json
{
  "success": false,
  "code": "ADDRESS_NOT_MAPPED",
  "orders": [{ "id": "ORD-001", "customer_name": "Nguyễn A", "address_full": "..." }]
}
```

---

## 7. District Ward Codes

| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/admin/district-ward-codes/import` | Import file bảng mã địa chỉ |
| GET | `/district-ward-codes/lookup` | Tra cứu mã (`?province=&district=&ward=`) |

---

## 8. Logs & History

> `admin` và `sale` đều xem được trong phạm vi brand được gán.

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/brands/:brandId/orders/:id/logs` | History của 1 đơn |
| GET | `/brands/:brandId/logs` | Lịch sử brand (`?type=export&type=sync_sheet`) |

---

## Error Codes

| Code | HTTP | Mô tả |
|---|---|---|
| `UNAUTHORIZED` | 401 | Token hết hạn / chưa đăng nhập |
| `FORBIDDEN` | 403 | Không có quyền trên brand |
| `NOT_FOUND` | 404 | Resource không tồn tại |
| `VALIDATION_ERROR` | 422 | Dữ liệu không hợp lệ |
| `INVALID_STATE_TRANSITION` | 422 | Chuyển trạng thái không hợp lệ |
| `SKU_NOT_MAPPED` | 422 | Chưa map SKU trước khi chốt |
| `ADDRESS_NOT_MAPPED` | 422 | Địa chỉ không khớp bảng mã |
| `SHEET_CONNECTION_ERROR` | 502 | Không kết nối được Google Sheet |
