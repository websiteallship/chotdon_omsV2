# Danh sách chức năng chi tiết — Hệ thống Chốt Đơn Multi-Brand

**Phiên bản:** 1.0  
**Ngày:** 2026-05-11  
**Nguồn:** 00-HE_THONG_CHOT_DON_MULTI_BRAND.md

---

## MỤC LỤC

1. [Quản lý Brand](#1-quản-lý-brand)
2. [Quản lý Users & Phân quyền](#2-quản-lý-users--phân-quyền)
3. [Tích hợp Google Sheets](#3-tích-hợp-google-sheets)
4. [Import & Sync Leads](#4-import--sync-leads)
5. [Xử lý Lead — Trang chốt đơn](#5-xử-lý-lead--trang-chốt-đơn)
6. [Parse Sản phẩm từ chuỗi marketing](#6-parse-sản-phẩm-từ-chuỗi-marketing)
7. [Parse & Map Địa chỉ](#7-parse--map-địa-chỉ)
8. [Mapping SKU sản phẩm](#8-mapping-sku-sản-phẩm)
9. [Quản lý Danh sách Sản phẩm (SKU)](#9-quản-lý-danh-sách-sản-phẩm-sku)
10. [Export Template Import OR](#10-export-template-import-or)
11. [Dashboard & Báo cáo](#11-dashboard--báo-cáo)
12. [Cài đặt Hệ thống](#12-cài-đặt-hệ-thống)
13. [Auth & Bảo mật](#13-auth--bảo-mật)

---

## 1. Quản lý Brand

### 1.1 Tạo Brand mới *(admin)*
- Nhập: tên brand, mã brand (code), mã kho, kênh bán hàng mặc định
- Sinh `brand_code` dùng trong tên file export (`ZAPATI_OR_...`)
- Mỗi brand hoàn toàn độc lập về data

### 1.2 Cấu hình Google Sheet per Brand *(admin)*
- Nhập `sheet_id` (lấy từ URL Google Sheet)
- Nhập `sheet_range` (ví dụ: `Sheet1!A:U`)
- Preview 5 dòng đầu của sheet để kiểm tra kết nối
- Lưu cấu hình vào DB

### 1.3 Cấu hình Column Mapping per Brand *(admin)*
- Đọc header row của sheet → hiển thị danh sách cột
- Admin kéo/chọn dropdown để map: `tên cột sheet` → `trường hệ thống`
- Các trường cần map: tên KH, SĐT, sản phẩm, màu, size, địa chỉ, ghi chú, utm_source, utm_campaign, lead_status
- Lưu dạng JSON `column_mapping` vào bảng `brands`
- Cảnh báo nếu thiếu trường bắt buộc (tên, SĐT)

### 1.4 Xem danh sách Brand *(admin)*
- Danh sách tất cả brand với trạng thái kết nối sheet
- Số liệu tổng: tổng leads, tổng đơn chốt, tổng đơn đã export

### 1.5 Chỉnh sửa / Vô hiệu hóa Brand *(admin)*
- Sửa tên, code, cấu hình
- Vô hiệu hóa brand (ẩn khỏi hệ thống, giữ nguyên data)

---

## 2. Quản lý Users & Phân quyền

### 2.1 Tạo User *(Admin)*
- Nhập: tên, email, password tạm
- Chọn role: `admin` | `sale` (chỉ 2 role)
- Gán brand(s) cho user

### 2.2 Phân quyền theo Brand *(Admin)*
- Gán user vào brand với role `admin` hoặc `sale`
- Thu hồi quyền truy cập brand

### 2.3 Xem danh sách User *(Admin)*
- Lọc theo brand, theo role
- Hiển thị trạng thái hoạt động, lần đăng nhập cuối

### 2.4 Chỉnh sửa / Vô hiệu hóa User *(Admin)*
- Đổi mật khẩu, đổi role
- Vô hiệu hóa tài khoản (không xóa data)

### 2.5 Brand Selector (Header)
- Hiển thị brand đang làm việc hiện tại
- Dropdown chuyển sang brand khác nếu user thuộc nhiều brand
- Toàn bộ data tự động filter theo brand được chọn

---

## 3. Tích hợp Google Sheets

### 3.1 Kiểm tra kết nối Sheet *(admin)*
- Test đọc 5 dòng đầu của sheet
- Báo lỗi nếu: sheet không tồn tại, Service Account không có quyền, range sai

### 3.2 Đọc Header Row
- Đọc hàng đầu tiên để lấy danh sách tên cột
- Dùng cho tính năng Column Mapping

### 3.3 Đọc Data Rows (Sync)
- Đọc tất cả rows từ `sheet_range`
- Áp dụng `column_mapping` để transform về schema hệ thống
- Trả về array records chuẩn hóa

### 3.4 Write-back lên Sheet *(sau export)*
- Ghi `"Đã xuất Excel"` vào cột `lead_status` tương ứng
- Dùng `sheet_row_id` để xác định đúng dòng

---

## 4. Import & Sync Leads

### 4.1 Manual Sync *(admin | sale)*
- Bấm "Sync now" → kéo toàn bộ row mới từ sheet
- Dedup bằng `sheet_row_id`: chỉ insert row chưa có trong DB
- Hiển thị kết quả: X leads mới, Y đã có (bỏ qua)
- Mỗi lead mới tạo record `orders` với `status = 'new'`

### 4.2 Auto Sync *(Phase 2)*
- Cron job mỗi 15 phút
- Tự động kéo row mới dựa theo timestamp
- Log kết quả vào `activity_logs`

### 4.3 Xử lý row lỗi khi import
- Row thiếu SĐT hoặc tên → đánh dấu `import_status = 'invalid'`
- Hiển thị danh sách row lỗi để admin xem xét

### 4.4 Transform dữ liệu khi import
- Parse cột Sản phẩm (chuỗi marketing → qty/sku/price)
- Parse cột Địa chỉ (chuỗi → 3 cấp + mã) theo danh sách địa chỉ có trước
- Map SKU tự động
- Lưu chuỗi gốc song song với dữ liệu đã parse

---

## 5. Xử lý Lead — Trang chốt đơn

### 5.1 Danh sách Leads (panel trái)
- Hiển thị leads thuộc brand + user hiện tại
- **Lọc:** trạng thái, ngày tạo, ngày cập nhật
- **Tìm kiếm:** SĐT, tên khách hàng
- Badge đếm leads theo trạng thái trong sidebar

### 5.2 Form chốt đơn (panel phải)
Cho phép xem và chỉnh sửa:
- Tên KH, SĐT, Địa chỉ đầy đủ
- Sản phẩm (dropdown lookup SKU), Số lượng, Giá (COD), Ghi chú
- Trạng thái (dropdown theo state machine)
- `[Lưu thay đổi]` — lưu không đổi trạng thái
- `[Chốt đơn ✓]` — chuyển `confirmed` + validate đầy đủ

### 5.3 State Machine trạng thái

| Từ | Có thể chuyển sang |
|---|---|
| `new` | `called_1`, `confirmed`, `cancelled`, `pending` |
| `called_1` | `called_2`, `confirmed`, `failed`, `pending` |
| `called_2` | `called_3`, `confirmed`, `failed`, `pending` |
| `called_3` | `confirmed`, `failed`, `pending` |
| `confirmed` | `template_ready`, `cancelled` |
| `template_ready` | `exported` |
| `failed` | `pending` |
| `pending` | `called_1`, `confirmed`, `cancelled` |
| `exported` | *(terminal)* |
| `cancelled` | *(terminal)* |

### 5.4 Validate trước khi chốt
- [ ] SKU đã chọn (`sku_status ≠ 'needs_sku'`)
- [ ] Địa chỉ 3 cấp đã xác nhận (`address_status ≠ 'needs_review'`)
- [ ] Số lượng ≥ 1, Giá > 0
- Nếu thiếu → highlight field lỗi, không cho chốt

### 5.5 Activity Log
Mỗi thay đổi trạng thái ghi log: user, brand, order, action, detail (from/to), timestamp

---

## 6. Parse Sản phẩm từ chuỗi marketing

### 6.1 Input thực tế (từ ZAPATI D005)
- **Cột "Sản phẩm"**: `"Mua 1 đôi D005 giá 269k + Freeship + TẶNG 1 lọ Xi đánh giày ZAPATI trị giá 59K"`
- **Cột "Màu sắc"**: `"Màu Cá Sấu"` — tách riêng, không trong chuỗi sản phẩm
- **Cột "Size"**: `"SIZE 40"` — tách riêng
- **Cột "Ghi chú"**: combo nhiều màu `"1 xanh navy\n1 cá sấu"` (multi-line)

### 6.2 Regex extract
Pattern chuỗi: `Mua (\d+) đôi (\w+) giá (\d+)k`
- qty: `1` hoặc `2`
- model: `D005`, `T003`, `D001`...
- price: `269` → `269000` VNĐ

### 6.3 Xây dựng SKU
`{model}{color_code}{size}` → tra bảng `products`

| Màu sheet | color_code | Ví dụ SKU |
|---|---|---|
| Màu Đen Trơn | BK | D005BK40 |
| Màu Đen Nhám | MB | D005MB40 |
| Màu Xám | GY | D005GY40 |
| Màu Xanh Navy | NV | D005NV40 |
| Màu Cá Sấu | CR | D005CR40 |
| Màu Nâu | BR | T003BR40 |

### 6.4 Quyết định

| Tình huống | Hành động |
|---|---|
| 1 màu + size + model match → 1 SKU | **Auto fill**, `sku_status = 'auto'` |
| Ghi chú có combo 2 màu khác nhau | **UI chọn combo**, `sku_status = 'needs_combo'` |
| Không tìm thấy SKU | **Dropdown** sale chọn tay, `sku_status = 'needs_sku'` |

### 6.5 Lưu DB
- `product_name_raw`, `color_raw`, `size_raw`, `note` (gốc)
- `product_lines_json`, `selected_line_idx`
- `product_sku`, `quantity`, `selling_price`

---

## 7. Parse & Map Địa chỉ

### 7.1 Format địa chỉ thực tế (Ladi form)
```
"To 13 ấp an bình xa bình an Long thành Dong nai, Xã Bình An, Huyện Long Thành, Đồng Nai, Việt Nam"
```
Cấu trúc: `street, ward, district, province, Việt Nam`

### 7.2 Parse (từ phải → trái, split dấu phẩy)
- Bỏ phần tử cuối `"Việt Nam"`
- `parts[-1]` → `province_name`
- `parts[-2]` → `district_name`  
- `parts[-3]` → `ward_name`
- `parts[0..-4].join(",")` → `street_address`

### 7.3 Lookup `district_ward_codes`
1. **Phase 1**: Exact match (sau normalize: lowercase, trim, bỏ prefix Phường/Xã/Quận/Huyện)
2. **Phase 2**: Fuzzy match `pg_trgm` nếu exact miss

### 7.4 Ngưỡng quyết định

| Kết quả | Hành động | address_status |
|---|---|---|
| Exact match | Auto fill district_code + ward_code | `auto_mapped` |
| Fuzzy ≥ 0.7 | Gợi ý top 3, user confirm | `needs_review` |
| Fuzzy < 0.7 | Sale nhập tay 3 dropdown | `manual_mapped` |

### 7.5 Kết quả thực tế (ví dụ)
| Địa chỉ sheet | ward_code | district_code |
|---|---|---|
| Phường Phú Sơn, TP Thanh Hóa | 14770 | 380 |
| Phường Thanh Xuân Trung, Q. Thanh Xuân, HN | 00355 | 009 |
| Xã Đông Sơn, TP Thuỷ Nguyên, HP | 11524 | 311 |
| Phường 11, TP Vũng Tàu | 26539 | 747 |

---

## 8. Mapping SKU sản phẩm

### 8.1 Auto lookup
`product_raw` + `color_raw` + `size_raw` → LIKE query → SKU code + giá

### 8.2 Fuzzy lookup
`similarity()` pg_trgm → top 5 gợi ý

### 8.3 Manual select
Dropdown tìm kiếm SKU, filter theo tên/màu/size, chọn → auto fill

---

## 9. Quản lý Danh sách Sản phẩm (SKU)

### 9.1 Upload file SKU *(admin)*
File mẫu: `Danh sách sản phẩm chi tiết.csv` — format thực tế WMS OR:

| Cột CSV | Field DB |
|---|---|
| SKU | `sku` |
| Mã SKU đối tác | `partner_sku` |
| Tên sản phẩm | `name` |
| Mã SP khai báo thuế | `model_code` |
| Tên SP khai báo thuế | `tax_name` |
| Mã danh mục | `category_code` |
| Mã đơn vị tính | `unit_code` |
| Giá (cột 125000) | `warehouse_price` |
| Giá (cột cuối 269000) | `selling_price` |

SKU format: `{MODEL}{COLOR_CODE}{SIZE}` (e.g. `D005CR40`, `T003BR44`)

### 9.2 Xem danh sách SKU
- Lọc theo model (D005, T003...), màu, size, active
- Tìm kiếm theo SKU/tên

### 9.3 Thêm / Sửa SKU thủ công *(admin)*
- Form: SKU, tên, model_code, color_code, size, selling_price, partner_sku

### 9.4 Vô hiệu hóa SKU
- `active = false` → ẩn khỏi dropdown

### 9.5 Cache in-memory
- Load toàn bộ SKU active của brand vào `Map<brandId, Product[]>` khi start
- Invalidate khi admin import SKU mới

---

## 10. Export Template Import OR

### 10.1 Preview *(Admin)*
- Lọc đơn `status = 'confirmed'` theo khoảng ngày
- Preview: Mã đơn, Khách hàng, SKU, SL, COD
- **Cảnh báo đỏ** nếu bất kỳ đơn nào có `address_status = 'pending'/'needs_review'` hoặc `sku_status ≠ 'auto'`
- Không cho download nếu còn đơn lỗi

### 10.2 Generate file Excel — Mapping columns thực tế

| OR Template Column | Nguồn dữ liệu |
|---|---|
| Mã OR đối tác | Auto: `{BRAND_CODE}{YYYYMMDD}{SEQ}` |
| Mã SKU đối tác | `orders.product_sku` |
| Số lượng | `orders.quantity` |
| Kênh bán hàng | `brands.sales_channel` (e.g. Facebook) |
| Yêu cầu chứng từ | `brands.export_config.require_document` (NO) |
| Loại | `brands.export_config.order_type` (Order) |
| Mã kho | `brands.warehouse_code` (e.g. KQ7) |
| BizType | `brands.export_config.biz_type` (B2C) |
| Người mua | `orders.customer_name` |
| Điện thoại | `orders.phone` |
| Địa chỉ giao hàng | `orders.address_full` |
| Địa chỉ (street) | `orders.street_address` |
| Tên phường/xã | `orders.ward_name` |
| Tên quận/huyện | `orders.district_name` |
| Tên tỉnh/TP | `orders.province_name` |
| Phường/xã (code) | `orders.ward_code` (5 chữ số: 14770) |
| Quận/huyện (code) | `orders.district_code` (3 chữ số: 380) |
| Mã Tình trạng HH | `brands.export_config.goods_status` (NEW) |
| Lấy hàng tại kho | `brands.export_config.pickup_at_warehouse` (YES) |
| Thu hộ | `orders.selling_price` |
| Mã gói vận chuyển | `brands.export_config.shipping_package` (STD) |

- **BLOCK export** nếu `ward_code` hoặc `district_code` null → lỗi `ADDRESS_NOT_MAPPED`
- Tên file: `{BRAND_CODE}_OR_{YYYYMMDD}_{BATCH}.xlsx`

### 10.3 Download & Log
- Browser tự download
- Ghi `activity_logs`: action=`export`, detail=`{ batch, count, file }`

### 10.4 Đánh dấu sau export
- `orders.status → 'exported'`, `exported_at = now()`, `export_batch = filename`
- **Phase 2**: Write-back sheet cột `lead_status` = `"Đã xuất Excel"` (dùng `brands.lead_status_col`)

### 10.5 Lịch sử export
- Lọc `activity_logs` theo `action = 'export'` per brand
- Hiển thị: ngày, user, số đơn, tên file batch

---

## 11. Dashboard & Báo cáo

### 11.1 Dashboard tổng quan *(per brand)*
- Hôm nay: leads mới, đơn chốt, thất bại, đã export
- Tỉ lệ chốt (%)
- Biểu đồ 7 ngày / 30 ngày

### 11.2 Báo cáo theo trạng thái *(Phase 3)*
- Breakdown theo trạng thái
- Thời gian trung bình `new → confirmed`
- Top sale theo số đơn

### 11.3 Báo cáo ngày/tuần/tháng *(Phase 3)*
- Trends leads, đơn, doanh thu COD
- Export CSV/Excel

### 11.4 Realtime notify *(Phase 3)*
- WebSocket: badge leads cập nhật realtime
- Thông báo khi có lead mới sync

---

## 12. Cài đặt Hệ thống

### 12.1 Cài đặt Google Sheet *(admin)*
- Sheet ID, Sheet Range, Column Mapping
- Nút test kết nối
- Interval auto sync

### 12.2 Cài đặt Brand *(admin)*
- Tên, mã brand, mã kho, kênh bán hàng mặc định

### 12.3 Quản lý DistrictWardCode *(admin)*
- Import file mã phường/quận từ Template OR
- Rebuild index pg_trgm

---

## 13. Auth & Bảo mật

### 13.1 Đăng nhập
- Form email + password
- Access Token 15 phút + Refresh Token 7 ngày (httpOnly cookie)

### 13.2 Refresh Token
- Tự refresh khi access token hết hạn
- Logout nếu refresh token hết hạn

### 13.3 Đăng xuất
- Xóa refresh token phía server + clear cookie

### 13.4 Brand Isolation Middleware
- Kiểm tra quyền trên brand cho mọi request `/api/brands/:brandId/*`
- 403 Forbidden nếu không có quyền

### 13.5 Role Matrix (2 roles)

| Action | Admin | Sale |
|---|---|---|
| Xem orders | ✅ | ✅ |
| Sửa order / đổi trạng thái | ✅ | ✅ |
| Chốt đơn `[XÁC NHẬN CHỐT ĐƢN]` | ✅ | ✅ |
| Sync Google Sheet | ✅ | ✅ |
| Xem lịch sử xuất/nhập | ✅ | ✅ |
| Import SKU Excel | ✅ | ❌ |
| Export xlsx Template OR | ✅ | ❌ |
| Column Mapping cài đặt | ✅ | ❌ |
| Cấu hình Brand / Export config | ✅ | ❌ |
| Quản lý Users | ✅ | ❌ |

---

## Mapping UI → Chức năng (từ frontend.jsx)

| View / Component | Chức năng |
|---|---|
| `renderLeadsView` | Bảng leads, filter trạng thái, tìm kiếm (mã/tên/sđt), sync, phân trang 15/30 |
| `renderExportView` | Chọn ngày, preview table, nút download xlsx |
| `renderProductsView` | Drag & drop import SKU, danh sách SKU, tìm kiếm SKU |
| `renderUsersView` | Danh sách users, thêm thành viên, sửa role |
| `renderSettingsDataView` | Sheet ID + Range, Column Mapping (add/edit/remove), cấu hình xuất kho |
| `renderSettingsBrandView` | Mã kho, kênh bán, config cố định Template OR (Type/BizType/STD/YES/NO) |
| `renderHistoryView` | Lịch sử sync sheet / import SKU / xuất Excel, filter theo loại |
| Order Drawer | Tên, SĐT, địa chỉ, SKU dropdown, qty, price, COD, ghi chú, trạng thái, history log |
| Drawer Footer | `[Báo hủy]` `[Lưu]` `[XÁC NHẬN CHỐT ĐƢN]` |
| Brand Selector header | Dropdown chuyển brand, filter data theo brand |
| Status filter dropdown | Tất cả / Mới / Đang gọi / Chốt đơn / Đã xuất Excel |

## Phân loại theo Phase

### Phase 1 — MVP
- Auth (2 roles: admin / sale) + JWT stateless
- CRUD Brands + Users per brand
- Upload + quản lý SKU per brand (drag & drop)
- Import leads từ Google Sheet API (manual sync)
- Import leads từ CSV/Excel chuẩn (manual import)
- Trang chốt đơn + state machine nhiều trạng thái (`new/called_1/called_2/called_3/pending/failed/confirmed/template_ready/exported/cancelled`)
- Column Mapping UI per brand (add/edit/remove trường)
- Parse sản phẩm từ chuỗi marketing (regex + combo selector)
- Map địa chỉ 3 cấp từ bảng đã import (exact match → báo lỗi để sửa thủ công)
- Export xlsx Template OR (với map địa chỉ + config cố định per brand)
- Lịch sử xuất/nhập file (history log)
- Cấu hình xuất kho (mã kho, kênh bán, BizType, STD...)

### Phase 2 — Integration
- Google Sheets API write-back sau export
- Auto-lookup SKU fuzzy (pg_trgm)
- Parse địa chỉ fuzzy suggest (top 3 gợi ý)
- Activity log chi tiết per order
- Auto sync cron job (15 phút)

### Phase 3 — Analytics & Polish
- Dashboard thống kê per brand
- Báo cáo ngày/tuần/tháng + export CSV
- Realtime notify (WebSocket)
- Mobile-responsive
