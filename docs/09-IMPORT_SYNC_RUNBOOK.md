# Import & Sync Runbook — Google Sheets API / CSV

**Phiên bản:** 1.0  
**Ngày:** 2026-05-12  
**Nguồn:** `08-DATA_CONTRACTS.md` | `07-RBAC_POLICY.md` | `11-ERROR_HANDLING.md` | `MVP_CONTRACT.md`

> File này là runbook vận hành thực tế cho team khi kéo lead từ Google Sheets API hoặc import CSV/Excel vào hệ thống.

---

## 1. Mục tiêu

- Sync lead mới từ Google Sheets API theo brand
- Import lead từ file CSV/Excel chuẩn khi team có file offline
- Đảm bảo dedup đúng, không tạo trùng lead
- Xử lý nhanh các lỗi thường gặp mà không làm hỏng dữ liệu đang có

---

## 2. Phân quyền vận hành

| Hành động | admin | sale |
|---|---|---|
| `POST /brands/:brandId/orders/sync` | ✅ | ✅ |
| `POST /brands/:brandId/orders/import-csv` | ✅ | ✅ |
| Xem `invalidRows` sau import | ✅ | ✅ |
| Sửa column mapping / sheet config | ✅ | ❌ |
| Retry sau lỗi mapping/cấu hình | ✅ | ❌ |

---

## 3. Khi nào dùng nguồn nào

| Tình huống | Nguồn nên dùng |
|---|---|
| Lead đang đổ liên tục từ landing page / form | Google Sheets API sync |
| Team nhận file bàn giao từ đối tác / nhóm ads | CSV/Excel import |
| Cần backfill dữ liệu cũ theo lô | CSV/Excel import |
| Cần lấy nhanh lead mới nhất trong ngày | Google Sheets API sync |

---

## 4. Checklist trước khi chạy

### 4.1 Google Sheets API

- Brand đã có `sheet_id`
- Brand đã có `sheet_range`
- `column_mapping` đã map đủ `customer_name`, `phone`, `address_full`, `product_name_raw`
- Service Account còn quyền đọc sheet
- Không đổi tên header trong sheet mà chưa cập nhật mapping

### 4.2 CSV/Excel

- File đúng brand
- CSV phải là UTF-8
- Header khớp `column_mapping` của brand
- File không vượt 10 MB
- Nếu có tracking ID thì giữ nguyên cột đó để dedup

---

## 5. Quy trình sync Google Sheets

### 5.1 Luồng chuẩn

1. Chọn đúng brand.
2. Gọi `POST /brands/:brandId/orders/sync`.
3. Kiểm tra response:
   - `new`
   - `skipped`
   - `invalid`
   - `invalidRows`
4. Nếu `invalid = 0`, tiếp tục xử lý lead trong màn hình chốt đơn.
5. Nếu có `invalidRows`, chuyển qua bước xử lý lỗi ở mục 7.

### 5.2 Kỳ vọng kết quả

- Lead mới hợp lệ vào DB với `status = 'new'`
- Lead trùng bị bỏ qua qua `sheet_row_id`
- Lead thiếu tên/SĐT được đánh dấu `import_status = 'invalid'`

---

## 6. Quy trình import CSV/Excel

### 6.1 Luồng chuẩn

1. Chọn đúng brand.
2. Upload file vào `POST /brands/:brandId/orders/import-csv`.
3. Kiểm tra response:
   - `new`
   - `skipped`
   - `invalid`
   - `invalidRows`
4. Nếu file lỗi encoding hoặc header, dừng và sửa file trước khi import lại.
5. Nếu import xong, kiểm tra nhanh danh sách lead mới theo filter ngày hiện tại.

### 6.2 Kỳ vọng kết quả

- File hợp lệ được parse theo `column_mapping`
- CSV/Excel vẫn đi cùng pipeline chuẩn như sync sheet
- Không overwrite lead cũ nếu `sheet_row_id` đã tồn tại

---

## 7. Cách xử lý lỗi thường gặp

| Lỗi | Dấu hiệu | Cách xử lý |
|---|---|---|
| `SHEET_CONNECTION_ERROR` | Không đọc được sheet | Admin kiểm tra quyền Service Account, `sheet_id`, `sheet_range`, network |
| `ENCODING_ERROR` | CSV bị reject ngay khi upload | Mở file và lưu lại dưới UTF-8 rồi import lại |
| `VALIDATION_ERROR` | Header/body không khớp | So lại `column_mapping`, tên cột, field bắt buộc |
| `CONFLICT` | Trùng unique key | Thường là dedup đang hoạt động đúng, kiểm tra `skipped` |
| `TOO_MANY_ROWS` | File/sync quá lớn | Chia nhỏ file hoặc range rồi chạy lại |
| `FORBIDDEN` | Sale không có quyền trên brand | Kiểm tra user có thuộc brand không |

### 7.1 Khi có `invalidRows`

- Nếu thiếu `customer_name` hoặc `phone`: không retry ngay
- Xuất danh sách `invalidRows` cho team sale/admin rà lại nguồn
- Chỉ retry sau khi nguồn đã sửa

### 7.2 Khi `new = 0`, `skipped` cao

- Đây thường không phải lỗi
- Nghĩa là dữ liệu đã từng được import/sync trước đó
- Chỉ kiểm tra lại nếu team chắc chắn có lead mới chưa lên hệ thống

---

## 8. Quy tắc retry an toàn

- Có thể retry với lỗi đọc ngoài hệ thống như `SHEET_CONNECTION_ERROR`
- Không retry mù với `ENCODING_ERROR` hoặc `VALIDATION_ERROR`
- Retry import/sync là an toàn khi dữ liệu nguồn không đổi vì hệ thống dedup theo `sheet_row_id`
- Không xóa tay dữ liệu DB chỉ để import lại cùng một file

---

## 9. Điều tra nhanh khi team báo “không thấy lead”

1. Kiểm tra đúng brand chưa.
2. Kiểm tra vừa chạy `sync` hay `import-csv` chưa.
3. So `new/skipped/invalid`.
4. Nếu `skipped` tăng, tìm theo `phone` hoặc `sheet_row_id`.
5. Nếu `invalid` tăng, xem `invalidRows`.
6. Nếu không đọc được sheet, admin test lại `POST /brands/:id/test-connection`.

---

## 10. Nhật ký cần có sau mỗi lần chạy

- `brandId`
- `source` = `sheet` hoặc `csv`
- `triggeredBy`
- `startedAt`
- `finishedAt`
- `new`
- `skipped`
- `invalid`
- `errorCode` nếu fail

> Các thông tin này nên có trong `activity_logs` hoặc monitoring log để lần sau điều tra nhanh hơn.

---

## 11. Tình huống thực tế của team

### 11.1 Team sale tự sync trong ngày

- Dùng Google Sheets API
- Chạy nhiều lần vẫn an toàn vì có dedup
- Sau sync chỉ cần lọc `status = new`

### 11.2 Team ads gửi file cuối ngày

- Dùng import CSV/Excel
- Admin hoặc sale có thể import
- Nếu file không chuẩn UTF-8 thì sửa file trước, không cố import lặp lại

### 11.3 Đổi cấu trúc cột nguồn

- Không sync/import ngay
- Admin cập nhật `column_mapping`
- Test trước với `test-connection` hoặc file mẫu nhỏ
- Chỉ khi mapping đúng mới chạy full

---

## 12. Quy ước escalation

- Sale xử lý được: retry sync, import lại file chuẩn, đọc `invalidRows`
- Escalate cho admin khi:
  - lỗi quyền sheet
  - lỗi `column_mapping`
  - lỗi hàng loạt nhiều brand
  - cần sửa cấu hình brand
- Escalate cho dev khi:
  - dedup sai
  - import thành công nhưng không tạo order đúng
  - response code không khớp docs
  - log không đủ để điều tra

---

## 13. Kết quả mong đợi sau khi áp dụng runbook

- Team biết lúc nào dùng `sync` và lúc nào dùng `import-csv`
- Retry đúng chỗ, không retry mù
- Giảm nguy cơ tạo lead trùng hoặc bỏ sót lead
- Điều tra lỗi nhanh hơn giữa sale, admin và dev
