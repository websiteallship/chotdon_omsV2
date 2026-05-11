# Hệ thống chốt đơn bán hàng online — Tài liệu thiết kế

**Phiên bản:** 1.0  
**Ngày:** 2026-05-11  
**Trạng thái:** Bản nháp thiết kế

---

## 1. Tổng quan

Hệ thống web giúp đội sale chốt đơn hàng từ leads Facebook/Landing page, quản lý trạng thái từng đơn, và xuất file Excel đúng chuẩn **Template Import OR** để nhập vào hệ thống WMS/kho.

### 1.1 Mục tiêu chính

- Tập trung leads từ nhiều nguồn (Google Sheet per brand) vào 1 hệ thống duy nhất
- Nhân viên sale xử lý từng lead, cập nhật trạng thái theo luồng quy định
- Tự động map SKU sản phẩm từ tên + màu + size
- Xuất file Excel đúng Template Import OR, sẵn sàng nhập kho
- Hỗ trợ **đa brand**: mỗi brand độc lập về data nhưng dùng chung hạ tầng

### 1.2 Người dùng

| Role | Quyền |
|---|---|
| Super Admin | Quản lý toàn bộ hệ thống, tất cả brand |
| Brand Admin | Quản lý 1 brand: users, sản phẩm, data sheet |
| Sale | Xem + chốt đơn thuộc brand được phân |
| Viewer | Chỉ xem báo cáo, không chỉnh sửa |

---

## 2. Tính năng đa brand (Multi-Brand)

### 2.1 Khái niệm Brand

Mỗi **Brand** là một đơn vị kinh doanh độc lập trong hệ thống, có:

- Danh sách sản phẩm (SKU) riêng
- Nguồn data leads riêng (Google Sheet ID riêng)
- File export riêng (cùng cấu trúc Template OR)
- Nhân viên sale riêng (phân quyền theo brand)
- Báo cáo thống kê riêng

### 2.2 Ví dụ triển khai

```
Brand ZAPATI   → Sheet D005 → SKU list Zapati  → export Zapati_OR_20260511.xlsx
Brand BRAND_B  → Sheet B001 → SKU list Brand B → export BrandB_OR_20260511.xlsx
Brand BRAND_C  → Sheet C003 → SKU list Brand C → export BrandC_OR_20260511.xlsx
```

### 2.3 Dữ liệu tách biệt theo brand

| Đối tượng | Tách theo brand? | Ghi chú |
|---|---|---|
| Leads / Đơn hàng | ✅ Có | Mỗi đơn thuộc 1 brand |
| Danh sách SKU | ✅ Có | Upload riêng theo file sản phẩm |
| Google Sheet source | ✅ Có | Mỗi brand cấu hình sheet ID riêng |
| File export Excel | ✅ Có | Filename có brand + ngày |
| Users / Sale | ✅ Có | 1 user có thể thuộc nhiều brand |
| Template OR | ❌ Chung | Cùng cấu trúc cột cho tất cả brand |
| Mã quận/huyện | ❌ Chung | Dùng chung bảng DistrictWardCode |

---

## 3. Kiến trúc hệ thống

### 3.1 Tech stack đề xuất

```
Frontend  : React 18 + Vite + TailwindCSS
Backend   : Node.js + Express (hoặc Fastify)
Database  : PostgreSQL (Primary storage)
Cache     : In-memory Map (Process-level)
Auth      : JWT (Stateless)
File Gen  : ExcelJS (tạo .xlsx)
Sheet Sync: Google Sheets API v4
Deploy    : VPS (Hetzner/Vultr) + PM2 + Nginx
```

### 3.2 Sơ đồ tầng

```
┌─────────────────────────────────────────────┐
│  CLIENT (React)                              │
│  Trang chốt đơn │ Dashboard │ Quản lý users │
└────────────────────┬────────────────────────┘
                     │ HTTPS / REST API
┌────────────────────▼────────────────────────┐
│  BACKEND (Node.js + Express)                │
│  Order API │ Sheet Sync │ Export Service    │
│  Auth/JWT  │ Activity Log │ Brand API       │
└──────┬─────────────┬──────────────┬─────────┘
       │             │              │
  PostgreSQL      Google         Redis
  (orders,       Sheets API     (sessions,
   users,        (leads input)   SKU cache)
   brands,
   logs)
```

### 3.3 Cấu trúc database (chính)

```sql
-- Brands
brands (id, name, code, sheet_id, sheet_range, created_at)

-- Users
users (id, name, email, password_hash, role, created_at)
user_brands (user_id, brand_id, role_in_brand)

-- Products (SKU per brand)
products (id, brand_id, sku, sku_partner, name, color, size, price, active)

-- Leads / Orders
orders (
  id, brand_id, assigned_to,
  customer_name, phone, address, ward, district, province,
  product_id, quantity, price, note,
  status, status_history (jsonb),
  sheet_row_id, exported_at,
  created_at, updated_at
)

-- Activity log
activity_logs (id, user_id, brand_id, order_id, action, detail, created_at)
```

---

## 4. Luồng xử lý đơn hàng

### 4.1 Luồng tổng quát

```
Google Sheet (leads mới)
        │
        ▼
[1] Import / Sync
    - Đọc sheet theo brand
    - Tạo order record trong DB
    - Trạng thái ban đầu: "Mới"
        │
        ▼
[2] Sale xử lý
    - Xem danh sách leads (lọc theo brand + trạng thái)
    - Mở từng lead, kiểm tra thông tin
    - Chọn sản phẩm (lookup SKU từ danh sách brand)
    - Cập nhật trạng thái
        │
        ▼
[3] Chốt đơn
    - Xác nhận thông tin: tên, SĐT, địa chỉ, SKU, số lượng, giá
    - Lưu trạng thái "Chốt đơn"
        │
        ▼
[4] Export Excel
    - Gom tất cả đơn "Chốt đơn" của brand (theo ngày / batch)
    - Tạo file Excel theo Template OR
    - Cập nhật trạng thái → "Đã xuất Excel"
    - Ghi timestamp xuất vào sheet gốc (tuỳ chọn)
```

### 4.2 Trạng thái đơn hàng (State Machine)

```
Mới ──────────────────────────────────────────────────┐
  │                                                    │
  ├──► Gọi lần 1 ──► Gọi lần 2 ──► Gọi lần 3         │
  │         │               │              │           │
  │         └───────────────┴──────────────┴──► Thất bại
  │                                                    │
  ├──► Chốt đơn ──► Đã chuyển Template                │
  │         │                │                         │
  │         │                └──► Đã xuất Excel        │
  │         │                                          │
  └─────────┴──────────────────────────────────► Hủy  │
                                                       │
                                               Chờ xử lý
```

| Trạng thái | Mã | Mô tả |
|---|---|---|
| Mới | `new` | Lead vừa import vào hệ thống |
| Gọi lần 1 | `called_1` | Đã gọi lần 1, chưa có kết quả |
| Gọi lần 2 | `called_2` | Đã gọi lần 2 |
| Gọi lần 3 | `called_3` | Đã gọi lần 3 |
| Thất bại | `failed` | Không liên lạc được / từ chối |
| Chốt đơn | `confirmed` | Khách đồng ý mua |
| Đã chuyển Template | `template_ready` | Đã điền vào template, chờ export |
| Đã xuất Excel | `exported` | Đã xuất file, gửi kho |
| Hủy | `cancelled` | Khách hủy sau khi đã chốt |
| Chờ xử lý | `pending` | Cần kiểm tra thêm |

---

## 5. Tích hợp Google Sheets API

### 5.1 Cấu hình per brand

Mỗi brand lưu:
- `sheet_id`: ID của Google Sheet
- `sheet_range`: VD `Sheet1!A:U` (cột A đến U)
- `column_mapping`: JSON map cột sheet → trường hệ thống

### 5.2 Mapping cột (dựa theo file D005)

| Cột trong Sheet | Trường trong DB |
|---|---|
| Thời gian | `created_at` (from sheet) |
| Tên | `customer_name` |
| SĐT | `phone` |
| Size | `size_raw` |
| Ghi chú | `note` |
| Sản phẩm | `product_name_raw` |
| Màu sắc | `color_raw` |
| Địa chỉ | `address_full` |
| utm_source | `utm_source` |
| utm_campaign | `utm_campaign` |
| lead_status | `sheet_status` |

### 5.3 Sync strategy

- **Manual import**: Admin bấm nút "Sync now" → kéo tất cả row mới từ sheet
- **Auto sync** (optional): Cron job mỗi 15 phút kéo row mới (dựa theo timestamp)
- **Dedup**: Dùng `sheet_row_id` (số thứ tự dòng) để tránh import trùng
- **Write-back**: Sau khi export, ghi cột `lead_status = "Đã xuất Excel"` vào sheet gốc

---

## 6. Mapping SKU sản phẩm

### 6.1 Logic tìm SKU

Từ thông tin thô của lead (tên SP + màu + size), hệ thống tự động lookup SKU:

```
Input:  product_name="D005", color="Màu Cá Sấu", size="SIZE 40"
Lookup: products WHERE brand_id=X 
        AND name LIKE '%D005%' 
        AND color LIKE '%Cá Sấu%' 
        AND size = '40'
Output: SKU = "D005CS40", price = 269000
```

Nếu không tìm được SKU tự động → sale phải chọn thủ công từ dropdown.

### 6.2 Danh sách sản phẩm

- Upload file Excel (cùng cấu trúc file `Danh_sách_sản_phẩm_chi_tiết`)
- Admin quản lý per brand
- Cache SKU list trong In-memory Map (tự reset khi server restart)

### 6.3 Parse cột Sản phẩm từ chuỗi marketing

Cột "Sản phẩm" trong Google Sheet thường chứa chuỗi khuyến mãi thô, **không phải tên sản phẩm thuần túy**.

#### Các dạng input thực tế

| Loại | Ví dụ |
|---|---|
| Single line — có mã SP | `Mua 1 đôi D001 giá 269k + Freeship + TẶNG 1 lọ Xi...` |
| Single line — không mã | `Mua 5 cây dao cắt 549k + TẶNG 2 CÂY + FREESHIP` |
| Multi-line — nhiều combo | `Mua 1 đôi D001...\nMua 2 đôi D005...\nMua 3 đôi D005...` |

#### Bước 1 — Tách dòng (multi-line → array)

```js
const lines = rawProductStr
  .split(/\n|\r\n|;/)
  .map(s => s.trim())
  .filter(Boolean);
// → ["Mua 1 đôi D001 giá 269k...", "Mua 2 đôi D005 giá 489k..."]
```

#### Bước 2 — Regex extract từ mỗi dòng

```js
// Pattern: Mua {qty} {unit?} {product_name} {price}k
const PRODUCT_REGEX =
  /mua\s+(\d+)\s+(?:đôi|cây|cái|hộp|bộ|gói)?\s*([\w\s\d]+?)\s+(?:giá\s*)?(\d+)k/i;

function parseLine(line) {
  const m = line.match(PRODUCT_REGEX);
  if (!m) return null;
  return {
    qty:          parseInt(m[1]),           // 1, 2, 5...
    product_raw:  m[2].trim(),              // "D001", "D005", "dao cắt"
    price_raw:    parseInt(m[3]) * 1000,    // 269000
    full_line:    line,
  };
}
```

**Kết quả ví dụ:**
```
"Mua 1 đôi D001 giá 269k + Freeship..."
→ { qty: 1, product_raw: "D001", price_raw: 269000 }

"Mua 5 cây dao cắt 549k + TẶNG 2 CÂY + FREESHIP"
→ { qty: 5, product_raw: "dao cắt", price_raw: 549000 }
```

#### Bước 3 — Lookup SKU từ `product_raw`

```js
// Tìm trong bảng products của brand
SELECT * FROM products
WHERE brand_id = :brandId
  AND (name ILIKE '%D001%' OR name ILIKE '%dao cắt%')
ORDER BY similarity(name, :product_raw) DESC
LIMIT 5;
```

#### Bước 4 — Quyết định theo số dòng

```
Số dòng = 1  +  SKU tìm thấy  → AUTO FILL (qty, sku, price)
Số dòng = 1  +  SKU không có  → MANUAL (sale chọn SKU từ dropdown)
Số dòng > 1                   → REQUIRE SELECTION (sale chọn 1 combo)
```

#### UI khi có nhiều combo (multi-line)

```
┌────────────────────────────────────────────────────────────┐
│ 📦 Khách hỏi nhiều gói — chọn gói khách đã chốt:          │
│                                                            │
│ ○  Mua 1 đôi D001   269k  +Freeship +Tặng Xi              │
│ ●  Mua 2 đôi D005   489k  +Freeship +Tặng 4 Xi  ← chọn   │
│ ○  Mua 3 đôi D005   619k  +Freeship +Tặng 6 Xi            │
│                                                            │
│ Số lượng: [2]    Giá: [489,000]    SKU: [D005-40 ▼]       │
│                                           [Xác nhận]       │
└────────────────────────────────────────────────────────────┘
```

#### Lưu thêm vào `orders`

```sql
orders (
  ...
  product_name_raw    TEXT,   -- chuỗi gốc từ sheet
  product_lines_json  JSONB,  -- array các combo parse được
  selected_line_idx   INT,    -- index dòng sale đã chọn (null = chưa chọn)
  sku_status          VARCHAR(20) -- 'auto' | 'needs_sku' | 'needs_combo'
)
```

---

## 7. Export Template Import OR

### 7.1 Cấu trúc file xuất

File Excel với các cột theo `Template_Import_OR.xlsm`, sheet "Đơn Xuất":

| Cột | Nguồn dữ liệu |
|---|---|
| Mã OR đối tác | Auto-generate: `{BRAND}_{DATE}_{SEQ}` |
| SKU (Barcode) | Từ bảng products |
| Mã SKU đối tác | Từ bảng products |
| Số lượng | Từ order |
| Kênh bán hàng | Mặc định theo brand config |
| Loại | `Order` |
| Mã kho | Config theo brand |
| BizType | `B2C` |
| Người mua | customer_name |
| Điện thoại | phone |
| Địa chỉ giao hàng | address_full |
| Tên phường/xã | Parse từ địa chỉ (VLOOKUP WardCode) |
| Tên quận/huyện | Parse từ địa chỉ |
| Tên tỉnh/TP | Parse từ địa chỉ |
| Quận/huyện (code) | Lookup DistrictWardCode |
| Phường/xã (code) | Lookup DistrictWardCode |
| Thu hộ | Giá bán (COD) |
| Ghi chú | note |
| Cần Đóng Gói | `YES` |
| Mã gói vận chuyển | `STD` |
| Yêu cầu chứng từ | `NO` |
| Lấy hàng tại kho | `YES` |

### 7.2 Tên file xuất

```
{BRAND_CODE}_OR_{YYYYMMDD}_{BATCH}.xlsx
Ví dụ: ZAPATI_OR_20260511_001.xlsx
        BRANDB_OR_20260511_001.xlsx
```

### 7.3 Batch export

- Admin chọn brand + khoảng ngày → preview danh sách đơn sẽ xuất
- Xác nhận → tạo file → download
- Hệ thống đánh dấu các đơn đó là `exported`, lưu `exported_at`

---

## 8. Giao diện người dùng (UI)

### 8.1 Layout chính

```
┌─────────────────────────────────────────────────────┐
│ HEADER: Logo │ [Brand Selector ▼] │ User │ Logout  │
├───────────────┬─────────────────────────────────────┤
│ SIDEBAR       │ MAIN CONTENT                        │
│               │                                     │
│ Tổng quan     │ (tuỳ trang)                         │
│ Leads         │                                     │
│  └ Mới (24)   │                                     │
│  └ Gọi (12)   │                                     │
│  └ Chốt (8)   │                                     │
│  └ Thất bại   │                                     │
│               │                                     │
│ Export        │                                     │
│ Sản phẩm      │                                     │
│ Cài đặt       │                                     │
└───────────────┴─────────────────────────────────────┘
```

### 8.2 Trang chốt đơn (core UX)

```
┌──────────────────────────────────────────────────────────┐
│ [Lọc: Trạng thái ▼] [Tìm SĐT/tên] [Ngày ▼]  [Sync ↺]  │
├────────────────────────┬─────────────────────────────────┤
│ DANH SÁCH LEADS        │ CHI TIẾT ĐƠN                   │
│                        │                                 │
│ ○ Nguyễn Văn A         │ Tên: Nguyễn Văn A              │
│   0901234567  Mới      │ SĐT: 0901234567                 │
│   D005 - Size 40       │ Địa chỉ: [địa chỉ đầy đủ]      │
│                        │                                 │
│ ○ Trần Thị B           │ Sản phẩm: [D005 Cá Sấu 40 ▼]  │
│   0912345678  Gọi lần 1│ Số lượng: [1]  Giá: [269,000]  │
│                        │                                 │
│ ...                    │ Ghi chú: [________________]    │
│                        │                                 │
│                        │ Trạng thái: [Mới           ▼]  │
│                        │                                 │
│                        │ [Lưu thay đổi]  [Chốt đơn ✓]  │
└────────────────────────┴─────────────────────────────────┘
```

### 8.3 Brand Selector

- Header luôn hiện brand đang làm việc
- Dropdown chuyển brand (nếu user thuộc nhiều brand)
- Toàn bộ data hiển thị tự động filter theo brand hiện tại

---

## 9. API Endpoints

### 9.1 Auth

```
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
GET    /api/auth/me
```

### 9.2 Brands

```
GET    /api/brands                    # List brands (theo quyền user)
GET    /api/brands/:id
POST   /api/brands                    # Tạo brand mới (super admin)
PUT    /api/brands/:id/sheet-config   # Cấu hình Google Sheet
```

### 9.3 Orders

```
GET    /api/brands/:brandId/orders             # List orders (filter, paginate)
GET    /api/brands/:brandId/orders/:id
PATCH  /api/brands/:brandId/orders/:id/status  # Đổi trạng thái
PATCH  /api/brands/:brandId/orders/:id         # Cập nhật thông tin
POST   /api/brands/:brandId/orders/sync        # Sync từ Google Sheet
```

### 9.4 Products

```
GET    /api/brands/:brandId/products           # List SKU
POST   /api/brands/:brandId/products/import    # Upload file Excel SKU
GET    /api/brands/:brandId/products/search    # Lookup SKU (name+color+size)
```

### 9.5 Export

```
POST   /api/brands/:brandId/export/preview     # Preview danh sách sẽ xuất
POST   /api/brands/:brandId/export/generate    # Tạo + download file xlsx
GET    /api/brands/:brandId/export/history     # Lịch sử export
```

### 9.6 Users

```
GET    /api/users
POST   /api/users
PUT    /api/users/:id/brands    # Gán brand cho user
```

---

## 10. Bảo mật & phân quyền

### 10.1 JWT Auth

- Access token: 15 phút
- Refresh token: 7 ngày (lưu trong httpOnly cookie)
- Payload: `{ userId, role, brandIds[] }`

### 10.2 Brand isolation

Mọi query đến orders/products đều bắt buộc qua `brand_id`:
- Middleware kiểm tra user có quyền trên brand đó không
- Nếu không → 403 Forbidden

### 10.3 Role matrix

| Action | Super Admin | Brand Admin | Sale | Viewer |
|---|---|---|---|---|
| Xem orders | ✅ All | ✅ Own brand | ✅ Own brand | ✅ Own brand |
| Sửa order / status | ✅ | ✅ | ✅ | ❌ |
| Import sheet | ✅ | ✅ | ❌ | ❌ |
| Export xlsx | ✅ | ✅ | ❌ | ❌ |
| Upload SKU | ✅ | ✅ | ❌ | ❌ |
| Tạo user | ✅ | ✅ (brand) | ❌ | ❌ |
| Tạo brand | ✅ | ❌ | ❌ | ❌ |
| Xem báo cáo | ✅ | ✅ | ❌ | ✅ |

---

## 11. Roadmap phát triển

### Phase 1 — Core (MVP)
- [ ] Auth + phân quyền cơ bản
- [ ] CRUD brands + users
- [ ] Import leads từ file CSV (không cần Sheet API)
- [ ] Giao diện chốt đơn + đổi trạng thái
- [ ] Upload + quản lý SKU per brand
- [ ] Export file xlsx theo Template OR

### Phase 2 — Integration
- [ ] Google Sheets API: sync tự động + write-back
- [ ] Auto-lookup SKU (name + màu + size → SKU code)
- [ ] Parse địa chỉ → mã phường/quận/tỉnh tự động
- [ ] Activity log đầy đủ

### Phase 3 — Analytics & Polish
- [ ] Dashboard thống kê per brand (chốt đơn, thất bại, tỉ lệ)
- [ ] Báo cáo theo ngày / tuần / tháng
- [ ] Thông báo realtime (WebSocket) khi có lead mới
- [ ] Mobile-responsive

---

## 12. Cấu trúc thư mục dự án

```
project-root/
├── backend/
│   ├── src/
│   │   ├── routes/          # auth, brands, orders, products, export
│   │   ├── controllers/
│   │   ├── services/
│   │   │   ├── sheetSync.js
│   │   │   ├── exportService.js
│   │   │   └── skuLookup.js
│   │   ├── middlewares/     # auth, brandGuard, rbac
│   │   ├── models/          # Sequelize / Prisma models
│   │   └── utils/
│   ├── prisma/schema.prisma
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── OrderBoard/  # Trang chốt đơn chính
│   │   │   ├── Dashboard/
│   │   │   ├── Products/
│   │   │   └── Settings/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── stores/          # Zustand stores
│   └── package.json
├── docker-compose.yml
└── README.md
```

---

## 13. Ghi chú kỹ thuật

### Google Sheet auth
Dùng **Service Account** (không cần OAuth user):
1. Tạo Service Account trong Google Cloud Console
2. Download JSON key
3. Share Google Sheet với email của Service Account
4. Lưu key vào env variable server

### Parse địa chỉ → mã phường/quận/tỉnh

#### Dữ liệu nguồn
Bảng `DistrictWardCode` (~10,000 records) import vào PostgreSQL từ Template OR:
```sql
district_ward_codes (
  id, province_name, district_name, ward_name,
  district_code, ward_code
)
-- Index:
CREATE INDEX idx_dwc_province ON district_ward_codes (province_name);
CREATE INDEX idx_dwc_district ON district_ward_codes (district_name);
CREATE INDEX idx_dwc_ward     ON district_ward_codes (ward_name);
```

#### Thuật toán parse địa chỉ thô

**Input:** `"Đường số 12 công ty dong xuyên anpha vũng tàu , Phường Rạch Dừa, Thành phố Vũng Tàu, Bà Rịa - Vũng Tàu, Việt Nam"`

**Bước 1 — Tách chuỗi theo dấu phẩy (phải → trái):**
```
parts = input.split(",").map(trim)
→ ["Đường số 12...", "Phường Rạch Dừa", "Thành phố Vũng Tàu", "Bà Rịa - Vũng Tàu", "Việt Nam"]

Bỏ phần tử cuối nếu là "Việt Nam" / "Vietnam"
→ province_raw = "Bà Rịa - Vũng Tàu"   (parts[-1])
→ district_raw = "Thành phố Vũng Tàu"   (parts[-2])
→ ward_raw     = "Phường Rạch Dừa"       (parts[-3])
→ street       = phần còn lại join lại
```

**Bước 2 — Chuẩn hóa (normalize):**
```
Bỏ prefix: Phường, Xã, Thị trấn, Quận, Huyện, Thành phố, Thị xã, Tỉnh
Normalize unicode: "Vũng Tàu" → "Vung Tau" (lowercase, no diacritics) để so sánh

ward_normalized     = "Rach Dua"
district_normalized = "Vung Tau"
province_normalized = "Ba Ria Vung Tau"
```

**Bước 3 — Lookup theo thứ tự ưu tiên:**
```
1. Exact match (sau normalize):
   SELECT * FROM district_ward_codes
   WHERE normalize(province_name) = province_normalized
     AND normalize(district_name) = district_normalized
     AND normalize(ward_name)     = ward_normalized

2. Nếu không có exact → Fuzzy match (similarity):
   Dùng pg_trgm (PostgreSQL trigram similarity):
   WHERE similarity(ward_name, ward_raw) > 0.6
     AND province_name = province_exact  -- province fix trước
   ORDER BY similarity DESC LIMIT 5
```

**Bước 4 — Quyết định:**
```
confidence >= 0.85 → AUTO MAP (ghi ward_code, district_code vào order)
confidence 0.6–0.85 → SUGGEST (trả về top 3 gợi ý, user xác nhận)
confidence < 0.6   → MANUAL (đánh dấu address_status = 'needs_review')
```

#### Xử lý khi không khớp (Manual Map UI)

Khi `address_status = 'needs_review'`, giao diện hiển thị:
```
┌──────────────────────────────────────────────────────────────┐
│ ⚠ Không tìm được địa chỉ cho đơn #12345                     │
│                                                              │
│ Địa chỉ gốc: Phường Rạch Dừa, Thành phố Vũng Tàu, ...      │
│                                                              │
│ Tỉnh/TP:     [Bà Rịa - Vũng Tàu ▼]  ← auto điền nếu khớp  │
│ Quận/Huyện:  [Thành phố Vũng Tàu ▼] ← dropdown lọc theo tỉnh│
│ Phường/Xã:   [Rạch Dừa             ▼] ← dropdown lọc theo quận│
│                                                              │
│              [Bỏ qua]    [Xác nhận & Lưu]                   │
└──────────────────────────────────────────────────────────────┘
```

#### Lưu trạng thái địa chỉ vào `orders`
```sql
orders (
  ...
  address_full       TEXT,          -- chuỗi gốc từ sheet
  province_name      TEXT,          -- sau parse
  district_name      TEXT,
  ward_name          TEXT,
  district_code      VARCHAR(10),   -- mã OR
  ward_code          VARCHAR(10),   -- mã OR
  address_status     VARCHAR(20)    -- 'auto_mapped' | 'needs_review' | 'manual_mapped'
)
```

#### Enable pg_trgm trong PostgreSQL
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_dwc_ward_trgm     ON district_ward_codes USING gin (ward_name gin_trgm_ops);
CREATE INDEX idx_dwc_district_trgm ON district_ward_codes USING gin (district_name gin_trgm_ops);
```

### ExcelJS — tạo file xlsx
```js
const wb = new ExcelJS.Workbook();
const ws = wb.addWorksheet('Đơn Xuất');
// Giữ nguyên 50 cột theo template OR
// Điền data từ danh sách orders đã chốt
await wb.xlsx.writeBuffer(); // → download
```

---

*Tài liệu này là bản thiết kế sơ bộ. Chi tiết kỹ thuật sẽ được cập nhật trong quá trình phát triển.*

---

## 14. Hosting & Hạ tầng — Tối ưu chi phí

> **Kết luận:** VPS $5–10/tháng **đủ dùng** cho quy mô 2,000 đơn/tháng.

### 14.1 Phân tích tải thực tế

| Thành phần | Ước tính | Ghi chú |
|---|---|---|
| Orders/tháng | 2,000 | ~67 đơn/ngày, ~3/giờ |
| Concurrent users | 5–15 sale | Không phải hệ thống public |
| DB size/năm | ~500MB | Orders + logs + SKU + DistrictWardCode |
| RAM cần | 512MB–1GB | Node.js + PostgreSQL + Nginx |
| CPU | 1 vCPU | Tải thấp |

### 14.2 So sánh hosting phù hợp

| Option | Giá/tháng | RAM / CPU | Đánh giá |
|---|---|---|---|
| **Hetzner CX22** | ~$4.5 | 4GB / 2 vCPU | ✅ **Khuyến nghị** — tốt nhất về giá/hiệu năng |
| DigitalOcean Basic | $6 | 1GB / 1 vCPU | ✅ Ổn định, hỗ trợ tốt |
| Vultr Cloud Compute | $5 | 1GB / 1 vCPU | ✅ Chấp nhận được |
| Railway / Render free | $0–$5 | Giới hạn | ⚠️ Không ổn định, cold start |

> **Chọn Hetzner CX22** — 4GB RAM, 2 vCPU, đủ scale lên 20,000 đơn/tháng mà không cần upgrade.

### 14.3 Cấu hình tối ưu chi phí

```
VPS Hetzner CX22 (~$4.5/tháng)
├── Node.js + PM2       # Backend (không cần Docker ở phase đầu)
├── PostgreSQL          # DB chạy cùng máy
├── Nginx               # Reverse proxy + serve frontend build (dist/)
└── Certbot             # SSL miễn phí (Let's Encrypt)

Google Sheets API       → Free (quota 60 req/min, đủ dùng)
ExcelJS export          → Chạy trực tiếp trên VPS
```

### 14.4 Tối ưu bỏ Redis

Với quy mô 2,000 đơn/tháng, **Redis không cần thiết**:

| Dùng Redis cho | Thay thế | Lý do |
|---|---|---|
| SKU cache | In-memory `Map` trong Node.js process (TTL tự reset) | SKU list nhỏ, ít thay đổi |
| Session store | JWT stateless (access + refresh token) | Không cần shared state |
| Pub/Sub realtime | Phase 3 mới xét, hoặc dùng polling đơn giản | Tải thấp |

→ **Tiết kiệm ~50MB RAM** + giảm 1 service cần maintain.

### 14.5 Tổng chi phí vận hành ước tính

| Hạng mục | Chi phí/tháng |
|---|---|
| VPS Hetzner CX22 | ~$4.5 (~110,000 VNĐ) |
| Domain (.com) | ~$1 (tính trung bình) |
| Google Sheets API | Miễn phí |
| SSL (Let's Encrypt) | Miễn phí |
| **Tổng** | **~$5.5/tháng** |
