# Security Rules

## Auth Middleware — BẮT BUỘC

```ts
// authGuard: kiểm tra JWT access token
// brandGuard: kiểm tra user thuộc brand + role
// Thứ tự: authGuard → brandGuard → roleGuard → handler

router.get('/api/brands/:brandId/orders', authGuard, brandGuard, handler)
```

## JWT
- Access token: 15 phút, payload chỉ chứa `{ userId, brandId, role }`
- Refresh token: 7 ngày, httpOnly cookie, lưu hash trong DB
- Secret lấy từ `process.env.JWT_ACCESS_SECRET` — KHÔNG hardcode
- Logout: xóa refresh token trong DB + clear cookie

## Brand Isolation (CRITICAL)
```ts
// Mọi query liên quan brand PHẢI filter theo brandId
// brandId lấy từ URL param, đã được brandGuard xác thực
const orders = await prisma.order.findMany({
  where: { brandId: req.params.brandId, ...filters }
})
// ❌ KHÔNG BAO GIỜ query không có brandId filter
```

## Input Validation
```ts
// Dùng Zod cho mọi body/query/param
// Prisma tự escape SQL — KHÔNG dùng raw query với input user
// Nếu cần raw query: dùng Prisma.$queryRaw với tagged template
const result = await prisma.$queryRaw`SELECT * FROM orders WHERE id = ${id}`
```

## Error Response — Không lộ thông tin nội bộ
```ts
// ❌ BAD — lộ stack trace
res.status(500).json({ error: err.message, stack: err.stack })

// ✅ GOOD — generic message, log chi tiết phía server
console.error('[OrderService]', err)
res.status(500).json({ success: false, error: 'Internal server error' })
```

## Role Check Pattern
```ts
function requireAdmin(req, res, next) {
  if (req.userBrand.role !== 'admin') {
    return res.status(403).json({ success: false, code: 'FORBIDDEN' })
  }
  next()
}
```

## Checklist trước khi commit
- [ ] Không hardcode secrets/tokens
- [ ] Mọi route protected có `authGuard` + `brandGuard`
- [ ] Admin-only routes có `requireAdmin`
- [ ] Input validated qua Zod
- [ ] Error response không lộ stack trace
