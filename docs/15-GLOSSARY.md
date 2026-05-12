# Glossary — Từ điển thuật ngữ hệ thống Chốt Đơn

**Phiên bản:** 1.0  
**Ngày:** 2026-05-12  
**Mục đích:** Định nghĩa thống nhất thuật ngữ giữa team Tech, Sale, và QA. Tránh hiểu sai khi giao tiếp.

---

## A

### `address_status`
Trường trong bảng `orders`, phản ánh mức độ tin cậy của việc map địa chỉ khách sang mã OR.

| Giá trị | Ý nghĩa |
|---|---|
| `pending` | Chưa xử lý (trạng thái ban đầu khi import) |
| `auto_mapped` | Hệ thống tự map được, confidence ≥ 0.85 |
| `needs_review` | Fuzzy match (0.6–0.85), cần user xác nhận |
| `manual_mapped` | User đã chọn thủ công qua dropdown |

> **Sale:** "Đơn bị cờ đỏ địa chỉ" = `address_status = 'needs_review'`  
> **Tech:** Xem `06-STATE_MACHINE.md §5`, `00-HE_THONG.md §13`

---

### `activity_log`
Bảng ghi lại mọi hành động quan trọng: đổi trạng thái đơn, export batch, sync sheet, upload SKU. Mỗi record có `user_id`, `brand_id`, `order_id` (nếu có), `action`, `detail` (JSON).

> Không dùng để debug lỗi kỹ thuật (xem `app.log`). Dùng để audit trail nghiệp vụ.

---

### `admin`
Role cao nhất trong một brand. Có toàn quyền: tạo user, cấu hình brand, upload SKU, export file, hủy đơn đã chốt. Xem ma trận phân quyền đầy đủ: `07-RBAC_POLICY.md`.

> Một user `admin` chỉ có quyền trên brand mình được gán. Không phải super-admin toàn hệ thống.

---

### `access_token`
JWT ngắn hạn (15 phút) dùng để xác thực mọi API request. Gửi qua header `Authorization: Bearer <token>`. Khi hết hạn, dùng `refresh_token` để lấy token mới.

---

## B

### `batch export` / `batch`
Hành động xuất một tập đơn hàng (nhiều đơn cùng lúc) ra file Excel. Admin chọn brand + khoảng ngày → preview → xác nhận → download file.

> **Sale gọi:** "Chạy batch", "xuất đơn"  
> **Tech gọi:** `POST /brands/:id/export` → tạo file `.xlsx` và cập nhật trạng thái các đơn lên `exported`

---

### `brand`
Đơn vị kinh doanh độc lập trong hệ thống. Mỗi brand có SKU riêng, Google Sheet riêng, nhân viên riêng, file export riêng.

> **Ví dụ:** `ZAPATI` là 1 brand. `BRAND_B` là 1 brand khác. Dữ liệu không lẫn nhau.

---

### `brand_code`
Mã ngắn định danh brand, dùng trong tên file export. In hoa, không dấu, không khoảng trắng.

> Ví dụ: `ZAPATI`, `BRANDB`, `ALLSHIP`  
> Tên file: `ZAPATI_OR_20260512_001.xlsx`

---

### `brand isolation`
Nguyên tắc: mọi query đến orders/products **đều bắt buộc** đi qua `brand_id`. Backend middleware kiểm tra user có quyền trên brand đó không → nếu không → 403. Không có cơ chế "xem tất cả brand" nếu không được gán.

---

## C

### `called_1`, `called_2`, `called_3`
Trạng thái đơn hàng khi sale đã thực hiện cuộc gọi lần 1, 2, 3. Tối đa 3 lần gọi. Sau lần 3 nếu không được → chuyển `failed` hoặc `pending`.

> **Sale gọi:** "Đơn đang ở gọi lần 2"  
> **Tech:** `status = 'called_2'`

---

### `cancelled`
Trạng thái **terminal** — đơn đã bị hủy. Không thể đổi sang trạng thái khác. Admin mới có quyền hủy đơn đã `confirmed`.

---

### `COD` (Cash on Delivery)
Hình thức thu tiền khi giao hàng. Cột `Thu hộ` trong file export OR = giá trị COD = `selling_price` của đơn.

---

### `column_mapping`
JSON config trong brand, ánh xạ cột Google Sheet sang trường trong DB.

```json
{
  "customer_name": "B",
  "phone": "C",
  "product_name_raw": "E",
  "color_raw": "F",
  "size_raw": "G",
  "address_full": "H"
}
```

> Mỗi brand có thể có mapping khác nhau vì format sheet khác nhau.

---

### `confirmed`
Trạng thái đơn đã được chốt: khách đồng ý mua, SKU đã xác định, địa chỉ đã map đủ 3 cấp. Đây là điều kiện bắt buộc để đơn được đưa vào batch export.

> **Gate chốt đơn:** SKU ✓ + ward_code ✓ + district_code ✓ + qty ≥ 1 ✓ + price > 0 ✓ + tên ✓ + SĐT ✓  
> Xem đầy đủ: `06-STATE_MACHINE.md §5`

---

### `confidence` (address confidence)
Điểm tương đồng khi fuzzy match địa chỉ khách với bảng `district_ward_codes`, từ 0.0 đến 1.0.

| Ngưỡng | Hành động |
|---|---|
| ≥ 0.85 | Auto map |
| 0.6 – 0.85 | Gợi ý, cần user xác nhận |
| < 0.6 | Đánh dấu `needs_review`, manual |

---

## D

### `dedup` (deduplication)
Cơ chế tránh import trùng lead từ Google Sheet. Dùng `sheet_row_id` (số thứ tự dòng trong sheet) làm unique key. Nếu row đã tồn tại trong DB → bỏ qua (skipped).

---

### `district_code`
Mã quận/huyện theo chuẩn Template Import OR. Ví dụ: `760` (Quận 1, HCM). Lookup từ bảng `district_ward_codes`.

---

### `district_ward_codes`
Bảng tra cứu mã địa chính (~10,000 records), import từ file Template OR. Chứa: tỉnh, quận/huyện, phường/xã, mã quận, mã phường.

---

## E

### `exported`
Trạng thái **terminal** — đơn đã được xuất vào file Excel OR và gửi kho. Không thể chỉnh sửa hoặc đổi trạng thái. Timestamp xuất lưu vào `exported_at`.

---

### `export history`
Danh sách các lần export đã thực hiện, lưu trong `activity_logs` với `action = 'export'`. Ghi lại: tên file, số đơn, người xuất, thời gian.

---

## F

### `failed`
Trạng thái đơn không liên lạc được hoặc khách từ chối sau nhiều lần gọi. Không phải terminal — có thể retry về `pending` nếu muốn thử lại sau.

---

### `forceExport`
Tham số trong request `POST /export`. Khi `false` (mặc định): block nếu có đơn chưa map địa chỉ. Khi `true`: xuất luôn, bỏ qua các đơn lỗi địa chỉ (admin tự chịu trách nhiệm).

---

### `fuzzy match`
Thuật toán khớp địa chỉ không chính xác hoàn toàn, dùng `pg_trgm` (PostgreSQL trigram similarity). Trả về `confidence score` thay vì chỉ đúng/sai.

---

## G

### `gate` (validation gate)
Tập điều kiện bắt buộc phải pass trước khi cho phép một hành động quan trọng. Hệ thống có 2 gate chính:
1. **Confirmation gate** — trước khi chốt đơn (`→ confirmed`)
2. **Export gate** — trước khi xuất file (`template_ready → exported`)

> Xem chi tiết: `06-STATE_MACHINE.md §5, §6`

---

## I

### `import` (leads import)
Quá trình kéo dữ liệu lead từ Google Sheet (hoặc file CSV/Excel) vào hệ thống. Tạo records mới trong bảng `orders` với status = `new`.

> Phân biệt với **sync** (kéo data mới từ sheet đã kết nối, tự động dedup).

---

## L

### `lead`
Thông tin khách hàng tiềm năng — người đã để lại thông tin qua Facebook / Landing Page, chưa chắc đã mua. Khi import vào hệ thống, 1 lead = 1 record trong bảng `orders` với `status = 'new'`.

> **Sale gọi:** "lead mới", "lead chưa gọi"  
> **Tech:** `order` với `status = 'new'`

---

## M

### `manual_mapped`
Giá trị của `address_status` khi user đã chọn thủ công tỉnh/quận/phường qua dropdown UI. Sau khi manual map, đơn đủ điều kiện chốt (nếu các trường khác OK).

---

### `multi-brand`
Kiến trúc cho phép nhiều brand độc lập chạy trên cùng một hệ thống. Dữ liệu cách ly hoàn toàn theo `brand_id`. Một user có thể thuộc nhiều brand với role khác nhau.

---

## N

### `new`
Trạng thái khởi đầu của mọi đơn khi vừa import vào hệ thống. Sale chưa xử lý gì. Có thể chuyển sang: `called_1`, `confirmed`, `cancelled`, `pending`.

---

### `needs_combo`
Giá trị của `sku_status` khi cột "Sản phẩm" trong sheet có nhiều dòng (multi-line combo) và sale chưa chọn combo nào. Sale phải chọn 1 trong các combo trước khi chốt.

> **Sale gọi:** "đơn có nhiều gói"  
> **UI hiển thị:** Modal chọn combo

---

### `needs_sku`
Giá trị của `sku_status` khi hệ thống không tự lookup được SKU từ tên sản phẩm, màu, size. Sale phải chọn SKU thủ công từ dropdown.

---

## O

### `OR` (Order Request)
File Excel chuẩn Template Import OR dùng để nhập đơn vào hệ thống WMS/kho. Mỗi batch export tạo 1 file OR.

> **Tên file:** `{BRAND_CODE}_OR_{YYYYMMDD}_{BATCH}.xlsx`  
> Ví dụ: `ZAPATI_OR_20260512_001.xlsx`

### `OR code` / `Mã OR đối tác`
Mã định danh đơn hàng trong file OR, tự động generate theo pattern: `{BRAND}_{DATE}_{SEQ}`.

> Ví dụ: `ZAPATI_20260512_001`, `ZAPATI_20260512_002`

---

## P

### `pending`
Trạng thái "tạm hoãn" — khách cần gọi lại sau, hoặc cần kiểm tra thêm. Không phải terminal. Từ `pending` có thể tiếp tục sang `called_1`, `confirmed`, `cancelled`.

---

### `product_lines_json`
Trường JSONB trong bảng `orders`, lưu array các combo parse được từ cột "Sản phẩm" multi-line.

```json
[
  { "qty": 1, "productRaw": "D005", "priceRaw": 269000, "fullLine": "Mua 1 đôi D005 giá 269k..." },
  { "qty": 2, "productRaw": "D005", "priceRaw": 489000, "fullLine": "Mua 2 đôi D005 giá 489k..." }
]
```

---

### `product_name_raw`
Chuỗi thô từ cột "Sản phẩm" trong Google Sheet. Thường là text marketing dài, chứa giá, khuyến mãi, có thể multi-line. **Không phải tên sản phẩm thuần túy.**

> Ví dụ: `"Mua 1 đôi D005 Màu Cá Sấu giá 269k + Freeship + TẶNG 1 lọ Xi..."`

---

## R

### `refresh_token`
JWT dài hạn (7 ngày), lưu trong `httpOnly cookie`. Dùng để lấy `access_token` mới mà không cần đăng nhập lại. Không thể đọc từ JavaScript (chống XSS).

---

### `role_in_brand`
Role của user trong một brand cụ thể: `admin` hoặc `sale`. Lưu trong bảng `user_brands`. Một user có thể là `admin` ở brand A và `sale` ở brand B.

---

## S

### `sale`
Role nhân viên bán hàng. Có quyền xem, cập nhật đơn, đổi trạng thái, sync Google Sheet. Không có quyền export file, upload SKU, quản lý user.

---

### `selected_line_idx`
Index (0-based) của combo mà sale đã chọn trong `product_lines_json`. `null` = chưa chọn (SKU status = `needs_combo`).

---

### `selling_price`
Giá bán thực tế của đơn hàng (COD). Khác với `price` trong bảng `products` (giá gốc theo SKU). Sale có thể điều chỉnh khi chốt đơn.

---

### `sheet_row_id`
Định danh duy nhất của 1 dòng trong Google Sheet (thường là số thứ tự dòng). Dùng để dedup khi sync nhiều lần.

---

### `sheet_status`
Giá trị trả về từ cột trạng thái trong Google Sheet (nếu có). Khác với `status` trong DB. Hệ thống có thể write-back `"Đã xuất Excel"` vào cột này sau khi export.

---

### `SKU`
Mã định danh duy nhất của một sản phẩm cụ thể (tên + màu + size).

> Ví dụ: `D005CS40` = Giày D005, màu Cá Sấu, size 40

---

### `SKU partner` / `sku_partner`
Mã SKU theo chuẩn của đối tác (WMS/kho). Khác với SKU nội bộ của hệ thống. Điền vào cột "Mã SKU đối tác" trong file OR.

---

### `sku_status`
Trường trong bảng `orders`, phản ánh trạng thái xác định SKU.

| Giá trị | Ý nghĩa |
|---|---|
| `auto` | Hệ thống tự lookup được, confidence cao |
| `needs_sku` | Không tự tìm được, sale chọn thủ công |
| `needs_combo` | Nhiều combo, sale chưa chọn |

---

### `status` (order status)
Trạng thái hiện tại của đơn hàng theo state machine. Xem toàn bộ danh sách và luồng chuyển đổi: `06-STATE_MACHINE.md`.

| Mã | Tên hiển thị |
|---|---|
| `new` | Mới |
| `called_1` | Gọi lần 1 |
| `called_2` | Gọi lần 2 |
| `called_3` | Gọi lần 3 |
| `pending` | Chờ xử lý |
| `failed` | Thất bại |
| `confirmed` | Đã chốt |
| `template_ready` | Sẵn sàng xuất |
| `exported` | Đã xuất |
| `cancelled` | Đã hủy |

---

### `status_history`
Trường JSONB trong bảng `orders`, lưu toàn bộ lịch sử đổi trạng thái.

```json
[
  { "status": "new", "at": "2026-05-10T08:30:00Z", "by": "system" },
  { "status": "called_1", "at": "2026-05-10T09:00:00Z", "by": "user-uuid" },
  { "status": "confirmed", "at": "2026-05-10T14:30:00Z", "by": "user-uuid" }
]
```

---

### `sync` / `sync_sheet`
Quá trình kéo dữ liệu mới từ Google Sheet vào DB theo manual trigger (`POST /orders/sync`). Khác với `import` (upload file). Có dedup theo `sheet_row_id`.

---

## T

### `template_ready`
Trạng thái đơn đã được đưa vào batch chuẩn bị xuất, chờ admin xác nhận export. Hệ thống chuyển đơn `confirmed` → `template_ready` khi bắt đầu build file OR.

> **Sale gọi:** (thường không thấy state này trực tiếp — tự động trong quá trình export)

---

### `Template Import OR`
File Excel chuẩn (`Template_Import_OR.xlsm`) do WMS/kho quy định. Hệ thống phải xuất file đúng format này (cấu trúc cột, sheet name). Xem spec đầy đủ: `09-EXPORT_SPEC.md`.

---

### `terminal status`
Trạng thái không thể chuyển sang trạng thái khác. Trong hệ thống có 2 terminal: `exported` và `cancelled`.

---

### `transition` (state transition)
Hành động chuyển đơn từ trạng thái này sang trạng thái khác. Chỉ những transition hợp lệ (định nghĩa trong `VALID_TRANSITIONS`) mới được backend chấp nhận. Transition không hợp lệ → HTTP 422 `INVALID_STATE_TRANSITION`.

---

## U

### `user_brands`
Bảng liên kết giữa `users` và `brands`. Một user có thể thuộc nhiều brand. Mỗi record lưu `(user_id, brand_id, role_in_brand)`.

---

## V

### `VALID_TRANSITIONS`
Object định nghĩa các transition hợp lệ trong state machine. Defined tại `lib/stateMachine.ts`. Backend enforce cứng — không thể bypass qua API.

---

## W

### `ward_code`
Mã phường/xã theo chuẩn Template Import OR. Ví dụ: `26734` (Phường Bến Nghé, Q.1). Lookup từ bảng `district_ward_codes`. Bắt buộc phải có để chốt đơn.

---

### `write-back`
Tính năng tùy chọn: sau khi export thành công, hệ thống ghi lại trạng thái `"Đã xuất Excel"` vào cột `lead_status` trong Google Sheet gốc.

---

## Z

### `ZAPATI`
Brand mẫu / brand đầu tiên được triển khai. Source data từ Google Sheet D005 (`Mua D005`). SKU dạng `D005XX{size}`.

---

## Quick Reference — Thuật ngữ hay nhầm

| Nhầm | Thực ra |
|---|---|
| "Đơn hàng" vs "Lead" | **Lead** = chưa chốt (status ≠ confirmed). **Đơn hàng** = đã chốt (confirmed trở lên). Trong code, cả 2 đều là `order`. |
| "SKU" vs "Mã SKU đối tác" | SKU = mã nội bộ hệ thống. Mã SKU đối tác (`sku_partner`) = mã WMS/kho. Khác nhau. |
| "Export" vs "Sync" | **Sync** = kéo data từ Sheet vào DB. **Export** = xuất file xlsx từ DB ra file OR. Ngược chiều hoàn toàn. |
| "Chốt đơn" (action) vs "confirmed" (status) | Hành động "chốt đơn" chuyển đơn sang status `confirmed`. Đôi khi gọi tắt là "đơn chốt" = đơn có status `confirmed`. |
| "Admin" vs "Super admin" | Không có super admin. Admin chỉ có quyền trong brand được gán. Cần gán brand trước khi dùng quyền admin. |
| "Địa chỉ" vs "Địa chỉ đã map" | **Địa chỉ** = `address_full` (chuỗi thô). **Đã map** = có `ward_code` + `district_code` (lookup từ bảng mã). |
| "Batch" (danh từ) | 1 lần export = 1 batch. Tên file có số thứ tự batch: `_001`, `_002`. |
| "Template" | Thường ngắn cho "Template Import OR" = file Excel chuẩn gửi kho. Không liên quan đến template code/UI. |
