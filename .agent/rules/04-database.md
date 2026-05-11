# Database Rules

## Prisma — Quy tắc sử dụng

```ts
// ✅ SELECT chỉ cột cần thiết
const order = await prisma.order.findUnique({
  where: { id },
  select: { id: true, status: true, customerName: true, phone: true }
})

// ❌ KHÔNG select tất cả khi không cần
const order = await prisma.order.findUnique({ where: { id } })

// ✅ Pagination bắt buộc cho list
const orders = await prisma.order.findMany({
  where: { brandId },
  skip: (page - 1) * limit,
  take: limit,
  orderBy: { createdAt: 'desc' }
})
```

## Index quan trọng — phải có

```sql
-- Đã định nghĩa trong schema, đảm bảo tồn tại sau migrate
CREATE INDEX idx_orders_brand_status ON orders(brand_id, status);
CREATE INDEX idx_orders_brand_phone  ON orders(brand_id, phone);
CREATE UNIQUE INDEX idx_orders_sheet_row ON orders(brand_id, sheet_row_id);
CREATE UNIQUE INDEX idx_products_brand_sku ON products(brand_id, sku);

-- Phase 2: fuzzy search địa chỉ
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_dwc_ward_trgm ON district_ward_codes USING gin (ward_name gin_trgm_ops);
CREATE INDEX idx_dwc_district_trgm ON district_ward_codes USING gin (district_name gin_trgm_ops);
```

## Address Mapping Logic

```ts
// Khi export Excel: map địa chỉ 3 cấp từ district_ward_codes
// Phase 1: exact match (case-insensitive, trim)
// Phase 2: fuzzy match với pg_trgm (similarity > 0.7)

// Nếu KHÔNG khớp → BLOCK export dòng đó
// → Trả về lỗi ADDRESS_NOT_MAPPED với danh sách đơn lỗi
// → User phải sửa địa chỉ thủ công rồi export lại
```

## SKU Cache (In-memory)

```ts
// Cache SKU per brand dùng Map, invalidate khi reload
const skuCache = new Map<string, Product[]>() // key: brandId

// Populate khi brand khởi động / sau import SKU
// KHÔNG dùng Redis
```

## Transaction khi cần atomic

```ts
// Ví dụ: update order status + tạo activity_log cùng lúc
await prisma.$transaction([
  prisma.order.update({ where: { id }, data: { status: 'confirmed' } }),
  prisma.activityLog.create({ data: { orderId: id, action: 'status_change', ... } })
])
```

## Quy tắc migration
- `npx prisma migrate dev` — development
- `npx prisma migrate deploy` — production (không reset data)
- Đặt tên migration rõ ràng: `add_export_batch_to_orders`
