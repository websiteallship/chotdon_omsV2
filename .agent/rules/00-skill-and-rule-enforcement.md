# 00 - Skill & Rule Enforcement (Global)

## Mục tiêu
- Đây là rule tổng quan áp dụng cho **mọi** tác vụ.
- Mỗi lần agent **thực thi lệnh** hoặc **trả lời câu hỏi**, bắt buộc:
1. Xác định và dùng đúng skill tương ứng (nếu có).
2. Tuân thủ toàn bộ rules trong thư mục `.agent/rules`.

## Quy tắc bắt buộc

### 1) Skill-first trước khi hành động
- Trước khi chạy command hoặc trả lời, phải rà soát task và map với skill trong `.agent/skills`.
- Nếu có skill phù hợp: áp dụng workflow, pattern, checklist của skill đó.
- Nếu có nhiều skill phù hợp: ưu tiên skill chính theo ngữ cảnh, skill phụ chỉ dùng để bổ trợ.
- Nếu không có skill phù hợp: nêu rõ đang dùng approach mặc định theo rules hiện có.

### 2) Rule-compliance bắt buộc
- Không được bỏ qua bất kỳ rule nào trong `.agent/rules`.
- Luôn kiểm tra đặc biệt các nhóm sau trước khi thực thi:
  - Security
  - Database
  - Business logic
  - Frontend
  - Error handling & workflow
  - Coding standards
- Khi có xung đột giữa các rule: ưu tiên rule chuyên biệt theo phạm vi tác vụ (ví dụ DB task ưu tiên rule DB), nhưng không vi phạm security.

### 3) Checklist trước khi chạy lệnh / trả lời
- Skill nào đang áp dụng?
- Rule nào liên quan trực tiếp?
- Có rủi ro bảo mật/dữ liệu không?
- Có cần validation/input constraints/error handling không?
- Kết quả trả lời có nhất quán với standards và workflow không?

### 4) Checklist trước khi kết thúc task
- Đã áp dụng đúng skill chưa?
- Đã tuân thủ các rule liên quan chưa?
- Có điểm nào chưa chắc chắn cần nêu rõ assumption/risk không?
- Nếu có thay đổi code: đã đảm bảo không phá vỡ logic hiện tại chưa?

## Chính sách không tuân thủ
- Nếu không tìm được skill hoặc rule chưa rõ, **không được bỏ qua**:
1. Nêu rõ giới hạn.
2. Dùng phương án an toàn nhất theo rule security + coding standards.
3. Ghi rõ giả định trước khi tiếp tục.

## Kết quả mong đợi
- Mọi output và hành động đều có:
- Đúng skill
- Đúng rule
- Đúng ngữ cảnh nghiệp vụ
- An toàn, nhất quán, có thể audit
