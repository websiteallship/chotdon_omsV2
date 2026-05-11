# Business Logic Rules

## Parse Sản phẩm — Per-Brand Strategy

### ZAPATI (3 cột riêng: Sản phẩm + Màu sắc + Size)

```
Sản phẩm: "Mua 1 đôi D005 giá 269k + Freeship + TẶNG..."
Màu sắc:  "Màu Cá Sấu"
Size:     "SIZE 40"
Ghi chú:  "1 xanh navy\n1 cá sấu"  ← combo multi-line
```

Regex: `Mua (\d+) đôi (\w+) giá (\d+)k`
SKU build: `{model}{color_code}{size}` → tra `products`

| Màu sheet | color_code |
|---|---|
| Màu Đen Trơn | BK |
| Màu Đen Nhám | MB |
| Màu Xám | GY |
| Màu Xanh Navy | NV |
| Màu Cá Sấu | CR |
| Màu Nâu | BR |

Combo: Ghi chú multi-line → `sku_status = 'needs_combo'`, sale chọn màu từng dòng

### ALLSHIP (cột Loại thay thế Màu sắc+Size)

```
Sản phẩm: "Mua 2 cây dao cắt 199k + FREESHIP"
Loại:     "Mẫu 5018 - Dùng cho băng keo rộng 4 - 5 cm"
          ← map vào sku_variant_field = "Loại"
```

Regex: `Mua (\d+) cây dao cắt (\d+)k`
SKU lookup: cột "Loại" → model prefix → sale chọn màu (OR/BL) trong form

| Giá trị cột Loại | Model prefix |
|---|---|
| Mẫu 5018 - ... 4 - 5 cm | AS5018 |
| Mẫu 6018 - ... 6 cm | AS6018 |

> ALLSHIP không auto-build SKU được vì thiếu màu — `sku_status = 'needs_sku'` mặc định

### SKU lookup chung

```ts
// Bước 1: Từ product_name_raw → extract model_code (ZAPATI) hoặc model_prefix (ALLSHIP)
// Bước 2: Filter products table theo brand_id + model_code
// Bước 3: ZAPATI → thêm color_code + size → exact match 1 SKU (auto)
//         ALLSHIP → trả về list SKU theo model_prefix → sale chọn
// Lưu: product_name_raw, product_lines_json, product_sku, quantity, selling_price
```

---

## Parse Địa chỉ — Per-Brand Behavior

### ZAPATI — Địa chỉ 4 cấp chuẩn
```
"street, Phường/Xã X, Quận/Huyện Y, Tỉnh/TP Z, Việt Nam"
```
Split dấu phẩy, bỏ "Việt Nam", parse phải → trái: province/district/ward/street

### ALLSHIP — Địa chỉ không chuẩn
```
"33 bình thung, bình an, dĩ an, Bình Dương"      ← thiếu prefix Phường/Xã
"174 Thích Quảng Đức, P.4, Q.Phú Nhuận, TPHCM"  ← viết tắt
"13 ngô thì nhậm, hà đông"                        ← chỉ 2 cấp
```
→ Dùng cùng logic nhưng **fuzzy threshold thấp hơn (0.6)**
→ Hỗ trợ 2-cấp fallback: nếu không tìm được ward → chỉ map district+province

```ts
// address_status:
// 'auto_mapped'   — exact match
// 'needs_review'  — fuzzy ≥ 0.6, user confirm
// 'manual_mapped' — user sửa tay
// 'pending'       — chưa map
```

---

## Export Excel — Quy tắc cứng

```
1. Chỉ export status = 'confirmed', sku_status = 'auto', address_status ≠ 'pending'
2. Kiểm tra district_code + ward_code trước khi ghi Excel
3. Nếu bất kỳ đơn nào thiếu mã → BLOCK toàn bộ → lỗi ADDRESS_NOT_MAPPED
4. Sau export: status='exported', exported_at, export_batch
5. Phase 2: write-back sheet cột lead_status = "Đã xuất Excel"
6. Tên file: {BRAND_CODE}_OR_{YYYYMMDD}_{BATCH}.xlsx
```

---

## Sync Google Sheet

```ts
// Dedup bằng sheet_row_id (ladi tracking ID hoặc row index)
// Row thiếu phone/name → import_status = 'invalid'
// Áp dụng brands.column_mapping để map tên cột → field DB
// ALLSHIP: validate cột không bị đổi thứ tự (Địa chỉ đôi khi lẫn vào cột Sản phẩm)
// → Heuristic: nếu cột Địa chỉ trống nhưng cột Sản phẩm có dạng địa chỉ → swap
```

---

## Column Mapping — Settings UI

```ts
// brands.column_mapping: { db_field: "tên_cột_sheet" }
// brands.sku_variant_field: tên cột chứa variant (null nếu dùng cột Màu sắc + Size riêng)

// ZAPATI:  sku_variant_field = null
// ALLSHIP: sku_variant_field = "Loại"

// UI Settings → Data tab → admin kéo thả / nhập tên cột
```
