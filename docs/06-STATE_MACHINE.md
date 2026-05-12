# State Machine — Trạng thái Đơn hàng (Order Status)

**Phiên bản:** 1.0  
**Ngày:** 2026-05-12  
**Nguồn:** 01-CHUC_NANG_CHI_TIET.md §5.3, §5.4 | 02-DATABASE_SCHEMA.md

---

## 1. Danh sách trạng thái

| Status | Tên hiển thị | Màu UI | Mô tả |
|---|---|---|---|
| `new` | Mới | 🔵 Blue | Lead vừa sync từ sheet, chưa xử lý |
| `called_1` | Gọi lần 1 | 🟡 Yellow | Đã thực hiện cuộc gọi lần 1 |
| `called_2` | Gọi lần 2 | 🟠 Orange | Đã thực hiện cuộc gọi lần 2 |
| `called_3` | Gọi lần 3 | 🔴 Red-light | Đã thực hiện cuộc gọi lần 3 |
| `pending` | Chờ | ⚪ Gray | Tạm hoãn, chờ KH phản hồi sau |
| `failed` | Thất bại | 🔴 Red | Không liên lạc được / KH từ chối |
| `confirmed` | Đã chốt | 🟢 Green | Đơn đã xác nhận, chờ xuất OR |
| `template_ready` | Sẵn sàng xuất | 🟢 Green-dark | Đơn nằm trong batch sắp export |
| `exported` | Đã xuất | ⬛ Dark | **Terminal** — Đã xuất file OR |
| `cancelled` | Đã hủy | ⬛ Gray-dark | **Terminal** — Đơn bị hủy |

---

## 2. Bảng transition hợp lệ

| Từ trạng thái | Có thể chuyển sang | Ghi chú |
|---|---|---|
| `new` | `called_1`, `confirmed`, `cancelled`, `pending` | Import xong → mặc định `new` |
| `called_1` | `called_2`, `confirmed`, `failed`, `pending` | |
| `called_2` | `called_3`, `confirmed`, `failed`, `pending` | |
| `called_3` | `confirmed`, `failed`, `pending` | Tối đa 3 lần gọi |
| `pending` | `called_1`, `confirmed`, `cancelled` | Retry sau khi chờ |
| `failed` | `pending` | Cho phép retry về pending |
| `confirmed` | `template_ready`, `cancelled` | Chỉ admin hủy đơn đã chốt |
| `template_ready` | `exported` | Tự động khi export batch |
| `exported` | *(terminal)* | Không được phép đổi |
| `cancelled` | *(terminal)* | Không được phép đổi |

> **Quy tắc cứng:** Mọi transition không có trong bảng trên đều bị **REJECT** ở backend (HTTP 422).

---

## 3. Sơ đồ luồng (Flow Diagram)

```
                        ┌─────────┐
         [import]       │   new   │
        ─────────────►  └────┬────┘
                             │
              ┌──────────────┼──────────────┬──────────────┐
              ▼              ▼              ▼              ▼
         called_1        confirmed      cancelled       pending
              │              │                            │
       ┌──────┼──────┐       │                     ┌─────┼──────┐
       ▼      ▼      ▼       │                     ▼            ▼
  called_2  conf  pending    │               called_1       confirmed
       │      │      │       │
  ┌────┼──┐   │      │       │
  ▼       ▼   │      │       │
called_3 conf │      │       │
  │           │      │       │
  └───┬───────┘      │       │
      ▼              │       │
   confirmed ◄───────┘       │
      │                      │
      ├──► template_ready     │
      │         │             │
      ▼         ▼             │
  cancelled   exported        │
   (terminal) (terminal)      │
                              │
   failed ◄──── (từ called_*)  │
      │                       │
      └──────► pending ◄───────┘
```

---

## 4. Transition Matrix (code-ready)

```typescript
// lib/stateMachine.ts
export const ORDER_STATUS = [
  'new', 'called_1', 'called_2', 'called_3',
  'pending', 'failed', 'confirmed', 'template_ready',
  'exported', 'cancelled'
] as const;

export type OrderStatus = typeof ORDER_STATUS[number];

export const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  new:            ['called_1', 'confirmed', 'cancelled', 'pending'],
  called_1:       ['called_2', 'confirmed', 'failed', 'pending'],
  called_2:       ['called_3', 'confirmed', 'failed', 'pending'],
  called_3:       ['confirmed', 'failed', 'pending'],
  pending:        ['called_1', 'confirmed', 'cancelled'],
  failed:         ['pending'],
  confirmed:      ['template_ready', 'cancelled'],
  template_ready: ['exported'],
  exported:       [],   // terminal
  cancelled:      [],   // terminal
};

export const TERMINAL_STATUSES: OrderStatus[] = ['exported', 'cancelled'];

/**
 * Kiểm tra transition hợp lệ.
 * Throw nếu không hợp lệ — caller bắt và trả HTTP 422.
 */
export function assertValidTransition(from: OrderStatus, to: OrderStatus): void {
  if (from === to) throw new Error(`SAME_STATUS: already ${from}`);
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new Error(
      `INVALID_TRANSITION: ${from} → ${to}. Allowed: [${allowed.join(', ')}]`
    );
  }
}

export function isTerminal(status: OrderStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}
```

---

## 5. Validate Gate trước khi chuyển `confirmed`

Khi `to === 'confirmed'`, **bắt buộc pass toàn bộ** các check sau trước khi ghi DB:

| # | Check | Điều kiện | Lỗi trả về |
|---|---|---|---|
| 1 | SKU đã xác định | `order.sku_status !== 'needs_sku'` và `order.sku_status !== 'needs_combo'` | `SKU_NOT_RESOLVED` |
| 2 | SKU không rỗng | `order.product_sku` is not null/empty | `SKU_MISSING` |
| 3 | Địa chỉ đã map | `order.address_status !== 'pending'` và `order.address_status !== 'needs_review'` | `ADDRESS_NOT_MAPPED` |
| 4 | Ward code tồn tại | `order.ward_code` is not null | `WARD_CODE_MISSING` |
| 5 | District code tồn tại | `order.district_code` is not null | `DISTRICT_CODE_MISSING` |
| 6 | Số lượng hợp lệ | `order.quantity >= 1` | `INVALID_QUANTITY` |
| 7 | Giá hợp lệ | `order.selling_price > 0` | `INVALID_PRICE` |
| 8 | Tên KH tồn tại | `order.customer_name` not empty | `MISSING_CUSTOMER_NAME` |
| 9 | SĐT tồn tại | `order.phone` not empty | `MISSING_PHONE` |

```typescript
// lib/confirmationGuard.ts
import type { Order } from '@prisma/client';

interface ValidationError {
  field: string;
  code: string;
  message: string;
}

export function validateConfirmationGuard(order: Order): ValidationError[] {
  const errors: ValidationError[] = [];

  if (order.skuStatus === 'needs_sku' || order.skuStatus === 'needs_combo') {
    errors.push({ field: 'product_sku', code: 'SKU_NOT_RESOLVED', message: 'SKU chưa được xác định' });
  }
  if (!order.productSku) {
    errors.push({ field: 'product_sku', code: 'SKU_MISSING', message: 'SKU trống' });
  }
  if (order.addressStatus === 'pending' || order.addressStatus === 'needs_review') {
    errors.push({ field: 'address_status', code: 'ADDRESS_NOT_MAPPED', message: 'Địa chỉ chưa được xác nhận' });
  }
  if (!order.wardCode) {
    errors.push({ field: 'ward_code', code: 'WARD_CODE_MISSING', message: 'Thiếu mã phường/xã' });
  }
  if (!order.districtCode) {
    errors.push({ field: 'district_code', code: 'DISTRICT_CODE_MISSING', message: 'Thiếu mã quận/huyện' });
  }
  if (!order.quantity || order.quantity < 1) {
    errors.push({ field: 'quantity', code: 'INVALID_QUANTITY', message: 'Số lượng phải ≥ 1' });
  }
  if (!order.sellingPrice || order.sellingPrice <= 0) {
    errors.push({ field: 'selling_price', code: 'INVALID_PRICE', message: 'Giá COD phải > 0' });
  }
  if (!order.customerName?.trim()) {
    errors.push({ field: 'customer_name', code: 'MISSING_CUSTOMER_NAME', message: 'Thiếu tên khách hàng' });
  }
  if (!order.phone?.trim()) {
    errors.push({ field: 'phone', code: 'MISSING_PHONE', message: 'Thiếu số điện thoại' });
  }

  return errors;
}
```

---

## 6. Validate Gate trước khi Export (`template_ready → exported`)

Khi trigger export batch, hệ thống kiểm tra **từng đơn** trong batch:

| Check | Điều kiện | Hành động |
|---|---|---|
| Status đúng | `status === 'confirmed'` | Block nếu sai |
| Ward code | `ward_code` not null | Block — `ADDRESS_NOT_MAPPED` |
| District code | `district_code` not null | Block — `ADDRESS_NOT_MAPPED` |
| SKU status | `sku_status === 'auto'` | **Cảnh báo đỏ** (không block) |
| Address status | `address_status === 'auto_mapped'` | **Cảnh báo đỏ** (không block) |

> **Nguyên tắc:** `ward_code` / `district_code` null = **BLOCK cứng**.  
> `sku_status ≠ 'auto'` hoặc `address_status ≠ 'auto_mapped'` = **Cảnh báo**, admin tự quyết.

---

## 7. Quyền thực hiện transition theo Role

| Transition | Admin | Sale | Ghi chú |
|---|---|---|---|
| `new → called_*` | ✅ | ✅ | |
| `new → confirmed` | ✅ | ✅ | Phải pass validation gate §5 |
| `new → cancelled` | ✅ | ✅ | |
| `new → pending` | ✅ | ✅ | |
| `called_* → *` | ✅ | ✅ | Các transition hợp lệ |
| `pending → *` | ✅ | ✅ | |
| `failed → pending` | ✅ | ✅ | |
| `confirmed → template_ready` | ✅ | ❌ | Chỉ admin (qua batch export) |
| `confirmed → cancelled` | ✅ | ❌ | Chỉ admin hủy đơn đã chốt |
| `template_ready → exported` | ✅ | ❌ | Tự động khi export thành công |

---

## 8. API Contract

### PATCH `/api/brands/:brandId/orders/:orderId/status`

**Body:**
```json
{
  "status": "confirmed",
  "note": "Khách đồng ý, giao hàng thứ 2"
}
```

**Response 200:**
```json
{
  "id": "uuid",
  "status": "confirmed",
  "updatedAt": "2026-05-12T07:44:00Z"
}
```

**Response 422 — Transition không hợp lệ:**
```json
{
  "error": "INVALID_TRANSITION",
  "from": "exported",
  "to": "called_1",
  "message": "exported → called_1 is not allowed"
}
```

**Response 422 — Validation gate thất bại (khi to=confirmed):**
```json
{
  "error": "CONFIRMATION_VALIDATION_FAILED",
  "errors": [
    { "field": "ward_code", "code": "WARD_CODE_MISSING", "message": "Thiếu mã phường/xã" },
    { "field": "selling_price", "code": "INVALID_PRICE", "message": "Giá COD phải > 0" }
  ]
}
```

---

## 9. Activity Log khi đổi trạng thái

Mỗi transition thành công ghi 1 record vào `activity_logs`:

```json
{
  "action": "status_change",
  "detail": {
    "from": "called_1",
    "to": "confirmed",
    "note": "Khách đồng ý, giao hàng thứ 2"
  }
}
```

---

## 10. Tóm tắt nhanh (Quick Reference)

```
new ──► called_1 ──► called_2 ──► called_3 ──┐
 │          │             │                   │
 │     failed/pending  failed/pending     failed/pending
 │                                            │
 ├──────────────────────────────────► confirmed ──► template_ready ──► exported (✗)
 │                                        │
 └──────────────────────────────► cancelled (✗)

failed ──► pending ──► called_1 / confirmed / cancelled

(✗) = terminal, không đổi được
```

**Gate chốt đơn (confirmed):** SKU ✓ + Địa chỉ 3 cấp ✓ + ward_code ✓ + district_code ✓ + qty≥1 ✓ + price>0 ✓ + tên ✓ + SĐT ✓
