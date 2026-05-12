# Test Plan — MVP Test Matrix

**Phiên bản:** 1.0  
**Ngày:** 2026-05-12  
**Nguồn:** 06-STATE_MACHINE.md | 07-RBAC_POLICY.md | 08-DATA_CONTRACTS.md | 09-EXPORT_SPEC.md

> File này là nguồn sự thật duy nhất cho test coverage MVP. Mọi unit/integration test phải map vào matrix này.

---

## 1. Parser Sản phẩm (`parseProductString`)

**Nguồn:** `08-DATA_CONTRACTS.md §8.3, §8.4`

| ID | Input | Expected Output | Notes |
|---|---|---|---|
| PP-01 | `"Mua 1 đôi D005 giá 269k"` | `{ model: 'D005', qty: 1, price: 269000 }` | Happy path ZAPATI |
| PP-02 | `"Mua 2 đôi D010CR giá 350k"` | `{ model: 'D010CR', qty: 2, price: 350000 }` | Có suffix CR |
| PP-03 | `"Mua 5 cây dao cắt 509k"` | `{ qty: 5, price: 509000 }` | ALLSHIP product |
| PP-04 | `"Mua 1 đôi D005 màu trắng size 40 giá 269k"` | `{ model: 'D005', color: 'trắng', size: '40', qty: 1, price: 269000 }` | Đầy đủ thuộc tính |
| PP-05 | `"D005CR40"` (ALLSHIP cột `Loại`) | `{ sku_raw: 'D005CR40' }` | Variant tổng hợp không tách |
| PP-06 | `""` (rỗng) | `{ qty: 1, price: null }` | Fallback mặc định |
| PP-07 | `"Mua 1 đôi D005 giá abc"` | `{ qty: 1, price: null }` | Price parse fail → null |
| PP-08 | `"Mua 0 đôi D005 giá 269k"` | `{ qty: 1, price: 269000 }` | qty < 1 → fallback 1 |

---

## 2. Parse Địa chỉ (`parseAddress`)

**Nguồn:** `08-DATA_CONTRACTS.md §7 step [5], [6]`

| ID | Input | Expected Output | Status |
|---|---|---|---|
| PA-01 | `"123 Nguyễn Trãi, Phường 3, Quận 5, TP HCM"` | `{ street: '123 Nguyễn Trãi', ward: 'Phường 3', district: 'Quận 5', province: 'TP HCM' }` | `auto_mapped` |
| PA-02 | `"45 Lê Lợi, Bến Nghé, Quận 1, Hồ Chí Minh"` | `{ ward: 'Bến Nghé', district: 'Quận 1', province: 'Hồ Chí Minh' }` | `auto_mapped` |
| PA-03 | `"Hà Nội"` (thiếu ward/district) | `{ province: 'Hà Nội', ward: null, district: null }` | `pending` |
| PA-04 | `"Thôn 5, Xã Tân Lập, Huyện Đan Phượng, Hà Nội"` | `{ ward: 'Tân Lập', district: 'Đan Phượng', province: 'Hà Nội' }` | `auto_mapped` |
| PA-05 | `""` (rỗng) | `{ ward: null, district: null, province: null }` | `pending` |
| PA-06 | `"123/4 Hẻm XYZ, Phường Không Tồn Tại, Quận 9, HCM"` | parse ok, lookup fail | `pending` (không block import) |
| PA-07 | Địa chỉ ALLSHIP thiếu cấp ward | `{ ward: null, district: 'Quận 9', province: 'HCM' }` | `pending` |

**Lookup codes (integration):**

| ID | ward_name + district_name | Expected ward_code | district_code |
|---|---|---|---|
| PA-L01 | `Phường 3` + `Quận 5` | `27127` | `774` |
| PA-L02 | Không tìm thấy | `null` | `null` |
| PA-L03 | Exact match case-insensitive | tìm được | không phân biệt hoa/thường |

---

## 3. Mapping SKU (`lookupSku`)

**Nguồn:** `08-DATA_CONTRACTS.md §7 step [7]`

| ID | Input (model, color, size) | Expected `sku_status` | Expected `product_sku` |
|---|---|---|---|
| SK-01 | model=`D005`, color=`trắng`, size=`40` | `auto` | `D005TR40` |
| SK-02 | model=`D005`, color=`trắng`, size=null | `needs_combo` | null (nhiều kết quả) |
| SK-03 | model=`ZZZ999` (không tồn tại) | `needs_sku` | null |
| SK-04 | sku_raw=`D005CR40` (ALLSHIP exact) | `auto` | `D005CR40` |
| SK-05 | sku_raw=`D005CR` (partial, nhiều size) | `needs_combo` | null |
| SK-06 | model=`D005`, color=`đỏ`, size=`38` → 1 kết quả | `auto` | mapped SKU |
| SK-07 | model=null, color=null, size=null | `needs_sku` | null |

---

## 4. State Transitions

**Nguồn:** `06-STATE_MACHINE.md §2, §5`

### 4.1 Valid Transitions

| ID | From | To | Role | Expected |
|---|---|---|---|---|
| ST-01 | `new` | `called_1` | sale | ✅ 200 |
| ST-02 | `new` | `confirmed` | sale | ✅ 200 (nếu pass gate §5) |
| ST-03 | `new` | `cancelled` | sale | ✅ 200 |
| ST-04 | `new` | `pending` | sale | ✅ 200 |
| ST-05 | `called_1` | `called_2` | sale | ✅ 200 |
| ST-06 | `called_2` | `called_3` | sale | ✅ 200 |
| ST-07 | `called_3` | `confirmed` | sale | ✅ 200 (nếu pass gate) |
| ST-08 | `called_3` | `failed` | sale | ✅ 200 |
| ST-09 | `failed` | `pending` | sale | ✅ 200 |
| ST-10 | `pending` | `called_1` | sale | ✅ 200 |
| ST-11 | `confirmed` | `template_ready` | admin | ✅ 200 |
| ST-12 | `confirmed` | `cancelled` | admin | ✅ 200 |
| ST-13 | `template_ready` | `exported` | admin | ✅ 200 |

### 4.2 Invalid Transitions (phải trả 422)

| ID | From | To | Expected Error |
|---|---|---|---|
| ST-I01 | `exported` | `called_1` | `INVALID_STATE_TRANSITION` HTTP 422 |
| ST-I02 | `cancelled` | `new` | `INVALID_STATE_TRANSITION` HTTP 422 |
| ST-I03 | `called_3` | `called_1` | `INVALID_STATE_TRANSITION` HTTP 422 |
| ST-I04 | `confirmed` | `new` | `INVALID_STATE_TRANSITION` HTTP 422 |
| ST-I05 | `new` | `new` | `SAME_STATUS` HTTP 422 |
| ST-I06 | `exported` | `cancelled` | `INVALID_STATE_TRANSITION` HTTP 422 |

### 4.3 Confirmation Gate (to=`confirmed`)

| ID | Điều kiện vi phạm | Expected Error Code |
|---|---|---|
| ST-G01 | `sku_status = 'needs_sku'` | `SKU_NOT_MAPPED` |
| ST-G02 | `product_sku = null` | `SKU_NOT_MAPPED` |
| ST-G03 | `address_status = 'pending'` | `ADDRESS_NOT_MAPPED` |
| ST-G04 | `ward_code = null` | `ADDRESS_NOT_MAPPED` |
| ST-G05 | `district_code = null` | `ADDRESS_NOT_MAPPED` |
| ST-G06 | `quantity = 0` | `INVALID_QUANTITY` |
| ST-G07 | `selling_price = 0` | `INVALID_PRICE` |
| ST-G08 | `customer_name = ''` | `MISSING_CUSTOMER_NAME` |
| ST-G09 | `phone = ''` | `MISSING_PHONE` |
| ST-G10 | Nhiều lỗi cùng lúc | Trả mảng `errors[]` đầy đủ |

---

## 5. Export OR

**Nguồn:** `09-EXPORT_SPEC.md §1, §3, §4, §6`

### 5.1 Điều kiện xuất file

| ID | Tình huống | Expected |
|---|---|---|
| EX-01 | Đơn `status=confirmed`, `ward_code` ✓, `district_code` ✓ | Vào batch, xuất OK |
| EX-02 | Đơn `status=confirmed`, `ward_code=null` | BLOCK — `ADDRESS_NOT_MAPPED` |
| EX-03 | Đơn `status=confirmed`, `district_code=null` | BLOCK — `ADDRESS_NOT_MAPPED` |
| EX-04 | Đơn `status=new` | Không vào batch |
| EX-05 | Đơn `sku_status='needs_sku'` (ward/district ✓) | ⚠️ Warning, không block |
| EX-06 | Đơn `address_status='pending'` (ward/district ✓) | ⚠️ Warning, không block |
| EX-07 | Không có đơn nào `confirmed` trong khoảng ngày | `NO_CONFIRMED_ORDERS` HTTP 422 |

### 5.2 Tên file và Batch Sequence

| ID | Scenario | Expected filename |
|---|---|---|
| EX-F01 | Brand ZAPATI, ngày 2026-05-12, batch đầu tiên | `ZAPATI_OR_20260512_01.xlsx` |
| EX-F02 | Brand ZAPATI, ngày 2026-05-12, batch thứ 2 | `ZAPATI_OR_20260512_02.xlsx` |
| EX-F03 | Brand ALLSHIP, ngày 2026-05-12, batch đầu tiên | `ALLSHIP_OR_20260512_01.xlsx` |

### 5.3 OR Code Generation

| ID | brandCode | date | seq | Expected or_code |
|---|---|---|---|---|
| EX-C01 | `ZAPATI` | `20260512` | 1 | `ZAPATI20260512001` |
| EX-C02 | `ZAPATI` | `20260512` | 42 | `ZAPATI20260512042` |
| EX-C03 | `ALLSHIP` | `20260512` | 3 | `ALLSHIP20260512003` |

### 5.4 Column Mapping trong file Excel

| ID | OR Column | DB Field | Test |
|---|---|---|---|
| EX-M01 | Col 1 `Mã OR đối tác` | `orders.or_code` | Không null sau export |
| EX-M02 | Col 20 `Thu hộ (COD)` | `orders.selling_price` | Là số nguyên, không format dấu phẩy |
| EX-M03 | Col 16 `Phường/xã (code)` | `orders.ward_code` | 5 chữ số |
| EX-M04 | Col 17 `Quận/huyện (code)` | `orders.district_code` | 3 chữ số |
| EX-M05 | Col 7 `Mã kho` | `brands.warehouse_code` | Lấy từ brand, không phải order |
| EX-M06 | Headers đầy đủ 21 cột | — | `sheet[0].length === 21` |

### 5.5 Post-export State

| ID | Hành động | Expected |
|---|---|---|
| EX-S01 | Export thành công | `orders.status → 'exported'` |
| EX-S02 | Export thành công | `orders.exported_at` không null |
| EX-S03 | Export thành công | `orders.or_code` đã được gán |
| EX-S04 | Export thành công | `orders.export_batch` = tên file |
| EX-S05 | Export thành công | `activity_logs` có 1 record `action='export'` |

---

## 6. Phân quyền (RBAC)

**Nguồn:** `07-RBAC_POLICY.md §3–§12`

### 6.1 Admin-only endpoints (Sale phải nhận 403)

| ID | Method | Endpoint | Sale → Expected |
|---|---|---|---|
| RB-01 | POST | `/brands/:id/export` | 403 FORBIDDEN |
| RB-02 | GET | `/brands/:id/export/preview` | 403 FORBIDDEN |
| RB-03 | POST | `/brands/:id/products/import` | 403 FORBIDDEN |
| RB-04 | POST | `/brands` | 403 FORBIDDEN |
| RB-05 | PATCH | `/brands/:id` | 403 FORBIDDEN |
| RB-06 | POST | `/brands/:id/users` | 403 FORBIDDEN |
| RB-07 | DELETE | `/brands/:id/users/:uid` | 403 FORBIDDEN |
| RB-08 | POST | `/admin/district-ward-codes/import` | 403 FORBIDDEN |

### 6.2 Shared endpoints (cả Admin và Sale)

| ID | Method | Endpoint | Admin | Sale |
|---|---|---|---|---|
| RB-09 | GET | `/brands/:id/orders` | ✅ 200 | ✅ 200 |
| RB-10 | GET | `/brands/:id/orders/:oid` | ✅ 200 | ✅ 200 |
| RB-11 | PATCH | `/brands/:id/orders/:oid` | ✅ 200 | ✅ 200 |
| RB-12 | POST | `/brands/:id/orders/sync` | ✅ 200 | ✅ 200 |
| RB-13 | POST | `/brands/:id/orders/import-csv` | ✅ 200 | ✅ 200 |
| RB-14 | GET | `/brands/:id/products` | ✅ 200 | ✅ 200 |
| RB-15 | GET | `/district-ward-codes/lookup` | ✅ 200 | ✅ 200 |

### 6.3 Transition-level RBAC

| ID | Transition | Sale | Admin | Expected |
|---|---|---|---|---|
| RB-T01 | `confirmed → cancelled` | ❌ | ✅ | Sale → 403 |
| RB-T02 | `confirmed → template_ready` | ❌ | ✅ | Sale → 403 |
| RB-T03 | `template_ready → exported` | ❌ | ✅ | Sale → 403 |
| RB-T04 | `new → called_1` | ✅ | ✅ | Cả hai OK |
| RB-T05 | `called_3 → failed` | ✅ | ✅ | Cả hai OK |

### 6.4 Brand Isolation

| ID | Scenario | Expected |
|---|---|---|
| RB-BI01 | User thuộc Brand A truy cập endpoint Brand B | 403 FORBIDDEN |
| RB-BI02 | User không active (`active=false`) | 403 FORBIDDEN |
| RB-BI03 | Token hết hạn | 401 UNAUTHORIZED |
| RB-BI04 | User `admin` Brand A không phải admin Brand B | 403 trên Brand B endpoint |

---

## 7. Tổng hợp Coverage

| Module | Số test cases | Critical Path |
|---|---|---|
| Parser sản phẩm | 8 | PP-01, PP-06 |
| Parse địa chỉ | 10 (7 unit + 3 lookup) | PA-01, PA-03, PA-L02 |
| Mapping SKU | 7 | SK-01, SK-02, SK-03 |
| State transitions | 22 (13 valid + 6 invalid + 3 gate tests còn lại là gate) | ST-I01, ST-G01→G09 |
| Export OR | 20 | EX-02, EX-07, EX-S01 |
| Phân quyền | 21 | RB-01, RB-T01, RB-BI01 |
| **Tổng** | **~88** | |

---

## 8. Môi trường & Tools

| Layer | Tool |
|---|---|
| Unit tests | Vitest |
| Integration tests | Vitest + Supertest + test DB |
| DB isolation | `prisma.$transaction` rollback sau mỗi test |
| Coverage target | ≥ 80% cho lib/stateMachine, lib/parser, lib/skuLookup |
| CI | Run on PR → block merge nếu fail |
