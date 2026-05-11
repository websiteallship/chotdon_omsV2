# Coding Standards

## Nguyên tắc
- **KISS**: giải pháp đơn giản nhất hoạt động được
- **DRY**: trích xuất logic lặp lại thành functions/services
- **YAGNI**: không build trước khi cần
- Functions tối đa ~50 dòng — chia nhỏ nếu vượt

## TypeScript/JavaScript

```ts
// ✅ Tên biến/hàm rõ nghĩa, verb-noun
const isAddressMapped = true
async function parseProductString(raw: string) {}
function validateOrderTransition(from: string, to: string): boolean {}

// ✅ Immutability
const updated = { ...order, status: 'confirmed' }
const newList = [...items, newItem]

// ✅ Early return thay nested if
if (!user) return res.status(401).json({ error: 'Unauthorized' })
if (user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' })

// ✅ Named constants — không dùng magic numbers
const MAX_RETRIES = 3
const DEBOUNCE_MS = 500
const ORDERS_PER_PAGE = 15

// ✅ Parallel async khi không phụ thuộc nhau
const [orders, products] = await Promise.all([fetchOrders(), fetchProducts()])
```

## Response Format API (nhất quán toàn hệ thống)
```ts
// Success
res.json({ success: true, data: result })
res.json({ success: true, data: list, meta: { total, page, limit } })

// Error
res.status(400).json({ success: false, error: 'message', code: 'ERROR_CODE' })
```

## Zod Validation (bắt buộc cho mọi request body)
```ts
const schema = z.object({
  phone: z.string().regex(/^0\d{9}$/),
  status: z.enum(['new','called_1','called_2','called_3','confirmed','failed','cancelled']),
})
const body = schema.parse(req.body)
```

## Comments
- Giải thích **TẠI SAO**, không giải thích CÁI GÌ
- JSDoc cho public service functions
- Tiếng Việt OK trong comments business logic
