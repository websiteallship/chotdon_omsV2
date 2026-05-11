# Database Schema — SaleGenius

**Engine:** PostgreSQL 16 | **ORM:** Prisma | **Cập nhật:** 2026-05-11

---

## ERD Overview

```
brands ──────────────── user_brands ──────── users
  │
  ├── products (SKU per brand)
  ├── orders ──── activity_logs
  │     └── (FK → district_ward_codes via district_code/ward_code)
  └── district_ward_codes (global, không per brand)
```

---

## Bảng: `brands`

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `name` | `varchar(100)` | NOT NULL | Tên brand |
| `code` | `varchar(20)` | UNIQUE NOT NULL | `ZAPATI`, `ALLSHIP` |
| `sheet_id` | `text` | | Google Sheet ID |
| `sheet_range` | `varchar(50)` | default `Sheet1!A:T` | Vùng dữ liệu |
| `lead_status_col` | `varchar(10)` | default `T` | Cột write-back `lead_status` |
| `column_mapping` | `jsonb` | default `{}` | Map tên cột sheet → field DB |
| `sku_variant_field` | `varchar(50)` | | Tên cột sheet chứa variant (null nếu không có) |
| `warehouse_code` | `varchar(20)` | | Mã kho OR (e.g. `KQ7`) |
| `sales_channel` | `varchar(100)` | | Kênh bán hàng (e.g. `Facebook`) |
| `export_config` | `jsonb` | default `{}` | Config cố định Template OR |
| `active` | `boolean` | default `true` | |
| `created_at` | `timestamptz` | default now() | |
| `updated_at` | `timestamptz` | auto-update | |

**`column_mapping` — Brand ZAPATI (D005 sheet):**
```json
{
  "created_at":       "Thời gian",
  "customer_name":    "Tên",
  "phone":            "SĐT",
  "size_raw":         "Size",
  "note":             "Ghi chú",
  "product_name_raw": "Sản phẩm",
  "color_raw":        "Màu sắc",
  "address_full":     "Địa chỉ",
  "source_url":       "URL link",
  "utm_source":       "utm_source",
  "utm_medium":       "utm_medium",
  "utm_campaign":     "utm_campaign",
  "utm_term":         "utm_term",
  "utm_content":      "utm_content",
  "ip_address":       "IP",
  "form_id":          "FORM",
  "lead_status":      "lead_status"
}
```

**`column_mapping` — Brand ALLSHIP (Dao cắt băng keo sheet):**
```json
{
  "created_at":       "Ngày",
  "customer_name":    "Tên",
  "phone":            "SĐT",
  "address_full":     "Địa chỉ",
  "product_name_raw": "Sản phẩm",
  "color_raw":        "Loại",
  "source_url":       "Link URL",
  "utm_source":       "utm_source",
  "utm_medium":       "utm_medium",
  "utm_campaign":     "utm_campaign",
  "utm_term":         "utm_term",
  "utm_content":      "utm_content",
  "ip_address":       "IP",
  "form_id":          "FORM"
}
```
> ⚠️ ALLSHIP **không có** cột `Size`, `Ghi chú`, `Màu sắc` riêng. Variant được chứa trong cột `Loại` (e.g. `"Mẫu 5018 - Dùng cho băng keo rộng 4 - 5 cm"`). Trường `sku_variant_field = "Loại"`.

**`export_config` — Brand ZAPATI:**
```json
{
  "order_type":          "Order",
  "biz_type":            "B2C",
  "require_document":    "NO",
  "pickup_at_warehouse": "YES",
  "goods_status":        "NEW",
  "shipping_package":    "STD",
  "need_packaging":      "NO"
}
```

**`export_config` — Brand ALLSHIP:**
```json
{
  "order_type":          "Order",
  "biz_type":            "B2C",
  "require_document":    "NO",
  "pickup_at_warehouse": "YES",
  "goods_status":        "NEW",
  "shipping_package":    "STD",
  "need_packaging":      "NO"
}
```

---

## Bảng: `users`

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `name` | `varchar(100)` | NOT NULL | |
| `email` | `varchar(150)` | UNIQUE NOT NULL | |
| `password_hash` | `text` | NOT NULL | bcrypt ≥10 rounds |
| `refresh_token_hash` | `text` | | Hash của refresh token |
| `active` | `boolean` | default `true` | |
| `last_login_at` | `timestamptz` | | |
| `created_at` | `timestamptz` | default now() | |

---

## Bảng: `user_brands`

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | FK → users | |
| `brand_id` | `uuid` | FK → brands | |
| `role` | `varchar(10)` | NOT NULL | `admin` \| `sale` |
| `created_at` | `timestamptz` | default now() | |

**Index:** `UNIQUE (user_id, brand_id)`

---

## Bảng: `products`

Import từ file Excel "Danh sách sản phẩm chi tiết" của WMS/OR.

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `brand_id` | `uuid` | FK → brands | |
| `sku` | `varchar(50)` | NOT NULL | Mã SKU hệ thống (e.g. `D005CR40`) |
| `partner_sku` | `varchar(50)` | | Mã SKU đối tác OR (thường = sku) |
| `name` | `varchar(200)` | NOT NULL | Tên sản phẩm đầy đủ |
| `model_code` | `varchar(20)` | | Mã model (e.g. `D005`) — từ cột "Mã SP khai báo thuế" |
| `tax_name` | `varchar(200)` | | Tên khai báo thuế (e.g. `Dép Da Nam Đế PU D005`) |
| `category_code` | `varchar(20)` | | Mã danh mục OR (e.g. `QNH`, `DQN`, `DQC`) |
| `unit_code` | `varchar(10)` | default `DOI` | Mã đơn vị tính OR |
| `color_name` | `varchar(100)` | | Màu (tiếng Việt: `Đen Trơn`, `Cá Sấu`...) |
| `color_code` | `varchar(10)` | | Mã màu (BK, MB, GY, NV, CR, BR) |
| `size` | `varchar(10)` | | Cỡ (38–44) |
| `warehouse_price` | `integer` | | Giá nhập kho (VNĐ) |
| `selling_price` | `integer` | NOT NULL | Giá bán COD (VNĐ, e.g. 269000) |
| `active` | `boolean` | default `true` | |
| `created_at` | `timestamptz` | default now() | |

**Index:**
```sql
CREATE UNIQUE INDEX idx_products_brand_sku  ON products(brand_id, sku);
CREATE INDEX idx_products_brand_model ON products(brand_id, model_code);
```

**Color code mapping (ZAPATI):**
| Mã màu | Tên tiếng Việt | Ghi chú |
|---|---|---|
| `BK` | Đen Trơn | Black |
| `MB` | Đen Nhám | Matte Black |
| `GY` | Xám | Grey |
| `NV` | Xanh Navy | Navy |
| `CR` | Cá Sấu | Crocodile |
| `BR` | Nâu | Brown |

**SKU format:** `{MODEL}{COLOR_CODE}{SIZE}` → `D005CR40`, `D005NV41`

---

## Bảng: `orders`

| Cột | Kiểu | Mặc định | Mô tả |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `brand_id` | `uuid` | FK → brands | |
| `created_by` | `uuid` | FK → users nullable | Sale phụ trách |
| **Sheet** | | | |
| `sheet_row_id` | `varchar(100)` | | ID duy nhất từ sheet (dùng ladi tracking ID hoặc row index) |
| `sheet_row_data` | `jsonb` | | Raw object của dòng sheet |
| `lead_status` | `varchar(50)` | | Trạng thái gốc từ cột lead_status sheet |
| `form_id` | `varchar(20)` | | FORM6, FORM7... |
| **Thông tin KH** | | | |
| `customer_name` | `varchar(200)` | | Tên KH |
| `phone` | `varchar(20)` | | SĐT |
| **Địa chỉ** | | | |
| `address_full` | `text` | | Chuỗi địa chỉ gốc từ sheet |
| `street_address` | `text` | | Số nhà, đường (phần trước dấu phẩy đầu) |
| `ward_name` | `varchar(100)` | | Phường/Xã |
| `district_name` | `varchar(100)` | | Quận/Huyện |
| `province_name` | `varchar(100)` | | Tỉnh/TP |
| `district_code` | `varchar(10)` | | Mã quận/huyện OR (3 chữ số, e.g. `380`) |
| `ward_code` | `varchar(10)` | | Mã phường/xã OR (5 chữ số, e.g. `14770`) |
| `address_status` | `varchar(20)` | `pending` | `pending` \| `auto_mapped` \| `needs_review` \| `manual_mapped` |
| **Sản phẩm** | | | |
| `product_name_raw` | `text` | | Chuỗi sản phẩm gốc từ sheet (cột "Sản phẩm") |
| `color_raw` | `varchar(100)` | | Màu gốc từ sheet (e.g. `Màu Cá Sấu`) |
| `size_raw` | `varchar(50)` | | Size gốc (e.g. `SIZE 40`) |
| `note` | `text` | | Ghi chú KH (cột "Ghi chú", có thể multi-line combo) |
| `product_lines_json` | `jsonb` | | Array parsed: `[{qty, model, color_code, size, sku, price}]` |
| `selected_line_idx` | `integer` | `0` | Index combo sale đã chọn |
| `product_sku` | `varchar(50)` | | SKU đã map (e.g. `D005CR40`) |
| `quantity` | `integer` | `1` | Số lượng |
| `selling_price` | `integer` | `0` | Giá COD (VNĐ) |
| `sku_status` | `varchar(20)` | `pending` | `pending` \| `auto` \| `needs_sku` \| `needs_combo` |
| **Trạng thái đơn** | | | |
| `status` | `varchar(20)` | `new` | Xem State Machine |
| `import_status` | `varchar(20)` | `ok` | `ok` \| `invalid` |
| **Export** | | | |
| `or_code` | `varchar(50)` | | Mã đơn OR xuất (e.g. `SO20260511001`) |
| `exported_at` | `timestamptz` | | |
| `export_batch` | `varchar(100)` | | Tên file batch: `ZAPATI_OR_20260511_01.xlsx` |
| **UTM / Tracking** | | | |
| `utm_source` | `varchar(100)` | | |
| `utm_medium` | `varchar(100)` | | |
| `utm_campaign` | `varchar(100)` | | |
| `utm_term` | `varchar(200)` | | |
| `utm_content` | `varchar(100)` | | |
| `ip_address` | `varchar(45)` | | IPv4/IPv6 |
| `source_url` | `text` | | URL landing page |
| `created_at` | `timestamptz` | now() | |
| `updated_at` | `timestamptz` | auto | |

**Index:**
```sql
CREATE INDEX idx_orders_brand_status   ON orders(brand_id, status);
CREATE INDEX idx_orders_brand_phone    ON orders(brand_id, phone);
CREATE UNIQUE INDEX idx_orders_sheet_row ON orders(brand_id, sheet_row_id);
CREATE INDEX idx_orders_export_batch   ON orders(export_batch) WHERE export_batch IS NOT NULL;
```

**State Machine:**
```
new → called_1 → called_2 → called_3 → confirmed → exported
    ↘ failed (có thể retry về new)
    ↘ cancelled (terminal)
```

**`product_lines_json` — cấu trúc:**
```json
[
  { "qty": 1, "model": "D005", "color_code": "CR", "color_name": "Cá Sấu", "size": "40", "sku": "D005CR40", "price": 269000 },
  { "qty": 1, "model": "D005", "color_code": "NV", "color_name": "Xanh Navy", "size": "40", "sku": "D005NV40", "price": 269000 }
]
```
> Combo 2 đôi khác màu: `selected_line_idx = -1` (cần sale chọn) hoặc xuất 2 dòng OR.

---

## Bảng: `activity_logs`

| Cột | Kiểu | Mô tả |
|---|---|---|
| `id` | `uuid` PK | |
| `brand_id` | `uuid` FK | |
| `user_id` | `uuid` FK | |
| `order_id` | `uuid` FK nullable | |
| `action` | `varchar(50)` | `status_change` \| `sync_sheet` \| `export` \| `import_sku` \| `address_map` |
| `detail` | `jsonb` | `{ from, to, note, file, count, batch }` |
| `created_at` | `timestamptz` | |

**Index:** `(order_id, created_at DESC)`, `(brand_id, action, created_at DESC)`

---

## Bảng: `district_ward_codes`

Dùng chung toàn hệ thống. Import từ file mã địa chỉ OR.

| Cột | Kiểu | Mô tả |
|---|---|---|
| `id` | `serial` PK | |
| `province_name` | `varchar(100)` NOT NULL | e.g. `Tỉnh Thanh Hóa`, `Thành phố Hà Nội` |
| `district_name` | `varchar(100)` NOT NULL | e.g. `Thành phố Thanh Hóa`, `Quận Thanh Xuân` |
| `ward_name` | `varchar(100)` NOT NULL | e.g. `Phường Phú Sơn` |
| `district_code` | `varchar(5)` NOT NULL | 3 chữ số: `380`, `009`, `311` |
| `ward_code` | `varchar(6)` NOT NULL | 5 chữ số: `14770`, `00355`, `11524` |

**Index:**
```sql
CREATE INDEX idx_dwc_province    ON district_ward_codes(province_name);
CREATE INDEX idx_dwc_district    ON district_ward_codes(district_name);
CREATE INDEX idx_dwc_ward        ON district_ward_codes(ward_name);
-- Phase 2: fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_dwc_ward_trgm     ON district_ward_codes USING gin(ward_name gin_trgm_ops);
CREATE INDEX idx_dwc_district_trgm ON district_ward_codes USING gin(district_name gin_trgm_ops);
```

**Ví dụ dữ liệu thực:**
| ward_name | district_name | province_name | district_code | ward_code |
|---|---|---|---|---|
| Phường Phú Sơn | Thành phố Thanh Hóa | Tỉnh Thanh Hóa | 380 | 14770 |
| Phường Thanh Xuân Trung | Quận Thanh Xuân | Thành phố Hà Nội | 009 | 00355 |
| Xã Đông Sơn | Thành phố Thuỷ Nguyên | Thành phố Hải Phòng | 311 | 11524 |
| Phường 11 | Thành phố Vũng Tàu | Tỉnh Bà Rịa - Vũng Tàu | 747 | 26539 |

---

## Mapping: Sheet → DB → Template OR

| Sheet column | DB field | OR Template column |
|---|---|---|
| Tên | `customer_name` | Người mua |
| SĐT | `phone` | Điện thoại |
| Địa chỉ (full) | `address_full` | Địa chỉ giao hàng |
| Địa chỉ (parsed street) | `street_address` | Địa chỉ |
| Địa chỉ (parsed ward) | `ward_name` | Tên phường/xã |
| Địa chỉ (parsed district) | `district_name` | Tên quận/huyện |
| Địa chỉ (parsed province) | `province_name` | Tên tỉnh/TP |
| `district_ward_codes.district_code` | `district_code` | Quận/huyện |
| `district_ward_codes.ward_code` | `ward_code` | Phường/xã |
| Sản phẩm (parsed SKU) | `product_sku` | Mã SKU đối tác |
| — | `quantity` | Số lượng |
| — | `selling_price` | Thu hộ (COD) |
| — | brands.warehouse_code | Mã kho |
| — | brands.sales_channel | Kênh bán hàng |
| — | auto-generated | Mã OR đối tác |

---

## Prisma Schema (đầy đủ)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Brand {
  id              String   @id @default(uuid())
  name            String   @db.VarChar(100)
  code            String   @unique @db.VarChar(20)
  sheetId         String?  @map("sheet_id")
  sheetRange      String?  @default("Sheet1!A:T") @map("sheet_range")
  leadStatusCol   String?  @default("T") @map("lead_status_col")
  columnMapping   Json     @default("{}") @map("column_mapping")
  skuVariantField String?  @db.VarChar(50) @map("sku_variant_field")
  warehouseCode   String?  @db.VarChar(20) @map("warehouse_code")
  salesChannel    String?  @db.VarChar(100) @map("sales_channel")
  exportConfig    Json     @default("{}") @map("export_config")
  active          Boolean  @default(true)
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  userBrands UserBrand[]
  products   Product[]
  orders     Order[]
  @@map("brands")
}

model User {
  id                String    @id @default(uuid())
  name              String    @db.VarChar(100)
  email             String    @unique @db.VarChar(150)
  passwordHash      String    @map("password_hash")
  refreshTokenHash  String?   @map("refresh_token_hash")
  active            Boolean   @default(true)
  lastLoginAt       DateTime? @map("last_login_at")
  createdAt         DateTime  @default(now()) @map("created_at")

  userBrands   UserBrand[]
  orders       Order[]
  activityLogs ActivityLog[]
  @@map("users")
}

model UserBrand {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  brandId   String   @map("brand_id")
  role      String   @db.VarChar(10)
  createdAt DateTime @default(now()) @map("created_at")

  user  User  @relation(fields: [userId], references: [id])
  brand Brand @relation(fields: [brandId], references: [id])

  @@unique([userId, brandId])
  @@map("user_brands")
}

model Product {
  id             String   @id @default(uuid())
  brandId        String   @map("brand_id")
  sku            String   @db.VarChar(50)
  partnerSku     String?  @db.VarChar(50) @map("partner_sku")
  name           String   @db.VarChar(200)
  modelCode      String?  @db.VarChar(20) @map("model_code")
  taxName        String?  @db.VarChar(200) @map("tax_name")
  categoryCode   String?  @db.VarChar(20) @map("category_code")
  unitCode       String?  @default("DOI") @db.VarChar(10) @map("unit_code")
  colorName      String?  @db.VarChar(100) @map("color_name")
  colorCode      String?  @db.VarChar(10) @map("color_code")
  size           String?  @db.VarChar(10)
  warehousePrice Int?     @map("warehouse_price")
  sellingPrice   Int      @map("selling_price")
  active         Boolean  @default(true)
  createdAt      DateTime @default(now()) @map("created_at")

  brand Brand @relation(fields: [brandId], references: [id])

  @@unique([brandId, sku])
  @@index([brandId, modelCode])
  @@map("products")
}

model Order {
  id              String    @id @default(uuid())
  brandId         String    @map("brand_id")
  createdBy       String?   @map("created_by")
  // Sheet
  sheetRowId      String?   @db.VarChar(100) @map("sheet_row_id")
  sheetRowData    Json?     @map("sheet_row_data")
  leadStatus      String?   @db.VarChar(50) @map("lead_status")
  formId          String?   @db.VarChar(20) @map("form_id")
  // Customer
  customerName    String?   @db.VarChar(200) @map("customer_name")
  phone           String?   @db.VarChar(20)
  // Address
  addressFull     String?   @map("address_full")
  streetAddress   String?   @map("street_address")
  wardName        String?   @db.VarChar(100) @map("ward_name")
  districtName    String?   @db.VarChar(100) @map("district_name")
  provinceName    String?   @db.VarChar(100) @map("province_name")
  districtCode    String?   @db.VarChar(5) @map("district_code")
  wardCode        String?   @db.VarChar(6) @map("ward_code")
  addressStatus   String    @default("pending") @db.VarChar(20) @map("address_status")
  // Product
  productNameRaw  String?   @map("product_name_raw")
  colorRaw        String?   @db.VarChar(100) @map("color_raw")
  sizeRaw         String?   @db.VarChar(50) @map("size_raw")
  note            String?
  productLinesJson Json?    @map("product_lines_json")
  selectedLineIdx Int       @default(0) @map("selected_line_idx")
  productSku      String?   @db.VarChar(50) @map("product_sku")
  quantity        Int       @default(1)
  sellingPrice    Int       @default(0) @map("selling_price")
  skuStatus       String    @default("pending") @db.VarChar(20) @map("sku_status")
  // Status
  status          String    @default("new") @db.VarChar(20)
  importStatus    String    @default("ok") @db.VarChar(20) @map("import_status")
  // Export
  orCode          String?   @db.VarChar(50) @map("or_code")
  exportedAt      DateTime? @map("exported_at")
  exportBatch     String?   @db.VarChar(100) @map("export_batch")
  // UTM
  utmSource       String?   @db.VarChar(100) @map("utm_source")
  utmMedium       String?   @db.VarChar(100) @map("utm_medium")
  utmCampaign     String?   @db.VarChar(100) @map("utm_campaign")
  utmTerm         String?   @db.VarChar(200) @map("utm_term")
  utmContent      String?   @db.VarChar(100) @map("utm_content")
  ipAddress       String?   @db.VarChar(45) @map("ip_address")
  sourceUrl       String?   @map("source_url")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  brand        Brand         @relation(fields: [brandId], references: [id])
  creator      User?         @relation(fields: [createdBy], references: [id])
  activityLogs ActivityLog[]

  @@unique([brandId, sheetRowId])
  @@index([brandId, status])
  @@index([brandId, phone])
  @@index([exportBatch])
  @@map("orders")
}

model ActivityLog {
  id        String   @id @default(uuid())
  brandId   String   @map("brand_id")
  userId    String   @map("user_id")
  orderId   String?  @map("order_id")
  action    String   @db.VarChar(50)
  detail    Json?
  createdAt DateTime @default(now()) @map("created_at")

  brand Brand  @relation(fields: [brandId], references: [id])
  user  User   @relation(fields: [userId], references: [id])
  order Order? @relation(fields: [orderId], references: [id])

  @@index([orderId, createdAt(sort: Desc)])
  @@index([brandId, action, createdAt(sort: Desc)])
  @@map("activity_logs")
}

model DistrictWardCode {
  id           Int    @id @default(autoincrement())
  provinceName String @db.VarChar(100) @map("province_name")
  districtName String @db.VarChar(100) @map("district_name")
  wardName     String @db.VarChar(100) @map("ward_name")
  districtCode String @db.VarChar(5) @map("district_code")
  wardCode     String @db.VarChar(6) @map("ward_code")

  @@index([provinceName])
  @@index([districtName])
  @@index([wardName])
  @@map("district_ward_codes")
}
```

---

## Appendix: So sánh cấu hình 2 Brand thực tế

### ZAPATI (Dép da nam)

| Thuộc tính | Giá trị |
|---|---|
| `code` | `ZAPATI` |
| `warehouse_code` | `KQ7` |
| `sales_channel` | `Facebook` |
| `sku_variant_field` | `null` (Size + Màu sắc là 2 cột riêng) |
| `unit_code` sản phẩm | `DOI` |
| Đối tác WMS | `ZPT` |
| Sheet columns đặc biệt | `Size`, `Màu sắc`, `Ghi chú` |
| SKU format | `{MODEL}{COLOR_CODE}{SIZE}` → `D005CR40` |
| Variant logic | `color_raw` + `size_raw` + `model` → lookup SKU |
| Địa chỉ | 4 cấp chuẩn + "Việt Nam" |

**Products mẫu:**
| SKU | Tên | Giá bán |
|---|---|---|
| D005CR40 | ZAPATI Hero D005 - Màu Cá Sấu - Size 40 | 269,000đ |
| D005NV41 | ZAPATI Hero D005 - Màu Xanh Navy - Size 41 | 269,000đ |
| T003BK42 | ZAPATI Riva T003 - Màu Đen - Size 42 | 269,000đ |

---

### ALLSHIP (Dao cắt băng keo)

| Thuộc tính | Giá trị |
|---|---|
| `code` | `ALLSHIP` |
| `warehouse_code` | *(cần xác nhận)* |
| `sales_channel` | `Facebook` |
| `sku_variant_field` | `"Loại"` (variant trong 1 cột) |
| `unit_code` sản phẩm | `Cai` |
| Đối tác WMS | `ALL` |
| Sheet columns đặc biệt | `Loại` (thay thế `Màu sắc`/`Size`) |
| SKU format | `AS{MODEL}{COLOR}` → `AS5018OR`, `AS6018BL` |
| Variant logic | `color_raw` (cột "Loại") match prefix model → lookup SKU |
| Địa chỉ | **Không chuẩn** — thiếu cấp, lộn xộn → cần fuzzy match nhiều hơn |

**Products mẫu:**
| SKU | Tên | Giá bán |
|---|---|---|
| AS5018OR | Dao cắt băng keo 2 inches màu cam | 159,000đ |
| AS5018BL | Dao cắt băng keo 2 inches màu xanh dương | 159,000đ |
| AS6018OR | Dao cắt băng keo 2.5 inches màu cam | 189,000đ |
| AS6018BL | Dao cắt băng keo 2.5 inches màu xanh dương | 189,000đ |

**Cột "Loại" → SKU mapping:**
| Giá trị cột "Loại" | SKU prefix |
|---|---|
| `Mẫu 5018 - Dùng cho băng keo rộng 4 - 5 cm` | `AS5018` |
| `Mẫu 6018 - Dùng cho băng keo rộng 6 cm` | `AS6018` |

> ⚠️ ALLSHIP **không có cột màu riêng** — màu cam/xanh được xác định qua cột `Loại`. SKU không encode màu từ `color_raw` mà từ lookup trực tiếp cột Loại → model code → sale chọn màu trong form chốt đơn.

**Parse sản phẩm ALLSHIP:**
- `"Mua 2 cây dao cắt 199k + FREESHIP"` → qty=2, price=199000
- `"Mua 5 cây dao cắt 509k + TẶNG 1 CÂY + FREESHIP"` → qty=5, price=509000
- Unit: `cây` (≠ `đôi` của ZAPATI)
- Không có combo nhiều màu trong cột Ghi chú

**Địa chỉ đặc biệt ALLSHIP:**
- Có dòng bị đổi cột (địa chỉ lẫn vào cột Sản phẩm — row 18, 19, 20 trong data mẫu)
- Địa chỉ thường thiếu cấp ward: `"13 ngô thì nhậm, hà đông"` (chỉ có street + district)
- → Cần fuzzy threshold thấp hơn, hỗ trợ 2 cấp (district + province)
