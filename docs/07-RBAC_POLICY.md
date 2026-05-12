# RBAC Policy — Phân quyền theo Endpoint & Action

**Phiên bản:** 1.0  
**Ngày:** 2026-05-12  
**Nguồn:** 01-CHUC_NANG_CHI_TIET.md §13.5 | 03-API_DESIGN.md | 06-STATE_MACHINE.md §7

> Đây là **nguồn sự thật duy nhất** cho phân quyền. Các file khác chỉ được tham chiếu tới file này.

---

## 1. Roles

| Role | Scope | Mô tả |
|---|---|---|
| `admin` | Per brand | Quản trị toàn bộ brand được gán |
| `sale` | Per brand | Xử lý đơn hàng, xem báo cáo |

> Không có role global system. Một user có thể là `admin` của brand A và `sale` của brand B.

---

## 2. Auth Endpoints

| Method | Endpoint | Admin | Sale | Public |
|---|---|---|---|---|
| POST | `/auth/login` | — | — | ✅ |
| POST | `/auth/logout` | ✅ | ✅ | — |
| POST | `/auth/refresh` | — | — | ✅ |
| GET | `/auth/me` | ✅ | ✅ | — |

---

## 3. Brand Management

> Mọi endpoint `/brands/*` đều yêu cầu user **thuộc brand đó** (middleware `BrandIsolation`).

| Method | Endpoint | Admin | Sale | Ghi chú |
|---|---|---|---|---|
| GET | `/brands` | ✅ | ✅ | Chỉ trả brand user thuộc về |
| POST | `/brands` | ✅ | ❌ | Tạo brand mới |
| GET | `/brands/:id` | ✅ | ✅ | Chi tiết + config |
| PATCH | `/brands/:id` | ✅ | ❌ | Sửa sheet config, column mapping, export config |
| POST | `/brands/:id/test-connection` | ✅ | ❌ | Test kết nối Google Sheet |

---

## 4. User Management

| Method | Endpoint | Admin | Sale | Ghi chú |
|---|---|---|---|---|
| GET | `/brands/:brandId/users` | ✅ | ❌ | Danh sách users trong brand |
| POST | `/brands/:brandId/users` | ✅ | ❌ | Tạo user + gán brand |
| PATCH | `/brands/:brandId/users/:id` | ✅ | ❌ | Sửa role / vô hiệu hóa |
| DELETE | `/brands/:brandId/users/:id` | ✅ | ❌ | Gỡ user khỏi brand |

---

## 5. Products (SKU)

| Method | Endpoint | Action | Admin | Sale | Ghi chú |
|---|---|---|---|---|---|
| GET | `/brands/:brandId/products` | Đọc danh sách | ✅ | ✅ | Dùng cho dropdown chốt đơn |
| GET | `/brands/:brandId/products/lookup` | Tìm SKU | ✅ | ✅ | `?q=&color=&size=` |
| POST | `/brands/:brandId/products/import` | Import file | ✅ | ❌ | Upload Excel SKU |
| POST | `/brands/:brandId/products` | Thêm thủ công | ✅ | ❌ | |
| PATCH | `/brands/:brandId/products/:id` | Sửa SKU | ✅ | ❌ | |

---

## 6. Orders — Đọc

| Method | Endpoint | Admin | Sale | Ghi chú |
|---|---|---|---|---|
| GET | `/brands/:brandId/orders` | ✅ | ✅ | Filter: status, date, search |
| GET | `/brands/:brandId/orders/:id` | ✅ | ✅ | Chi tiết + history log |
| GET | `/brands/:brandId/orders/:id/logs` | ✅ | ✅ | Activity log của 1 đơn |

---

## 7. Orders — Sửa & Đổi trạng thái

| Method | Endpoint | Action | Admin | Sale | Điều kiện thêm |
|---|---|---|---|---|---|
| PATCH | `/brands/:brandId/orders/:id` | Sửa thông tin đơn | ✅ | ✅ | Không được sửa đơn `exported` hoặc `cancelled` |
| PATCH | `/brands/:brandId/orders/:id` | Đổi status (PATCH body `status`) | Xem bảng §7.1 | Xem bảng §7.1 | Theo transition matrix §06-STATE_MACHINE |
| POST | `/brands/:brandId/orders/:id/confirm` | Chốt đơn | ✅ | ✅ | Pass validation gate §5 (STATE_MACHINE) |

### 7.1 Quyền đổi trạng thái theo transition

| Transition | Admin | Sale |
|---|---|---|
| `new → called_1` | ✅ | ✅ |
| `new → confirmed` | ✅ | ✅ |
| `new → cancelled` | ✅ | ✅ |
| `new → pending` | ✅ | ✅ |
| `called_* → called_*+1` | ✅ | ✅ |
| `called_* → confirmed` | ✅ | ✅ |
| `called_* → failed` | ✅ | ✅ |
| `called_* → pending` | ✅ | ✅ |
| `pending → called_1` | ✅ | ✅ |
| `pending → confirmed` | ✅ | ✅ |
| `pending → cancelled` | ✅ | ✅ |
| `failed → pending` | ✅ | ✅ |
| `confirmed → template_ready` | ✅ | ❌ | Admin only (qua export batch) |
| `confirmed → cancelled` | ✅ | ❌ | Admin only |
| `template_ready → exported` | ✅ | ❌ | Tự động khi export thành công |

---

## 8. Sync Google Sheet

| Method | Endpoint | Action | Admin | Sale |
|---|---|---|---|---|
| POST | `/brands/:brandId/orders/sync` | Manual sync Sheet → DB | ✅ | ✅ |
| POST | `/brands/:brandId/orders/import-csv` | Import CSV/Excel | ✅ | ✅ |

---

## 9. Export

| Method | Endpoint | Action | Admin | Sale |
|---|---|---|---|---|
| GET | `/brands/:brandId/export/preview` | Preview batch trước khi xuất | ✅ | ❌ |
| POST | `/brands/:brandId/export` | Generate + download xlsx | ✅ | ❌ |

---

## 10. District Ward Codes

| Method | Endpoint | Action | Admin | Sale |
|---|---|---|---|---|
| POST | `/admin/district-ward-codes/import` | Import bảng mã địa chỉ | ✅ | ❌ |
| GET | `/district-ward-codes/lookup` | Tra cứu mã | ✅ | ✅ |

---

## 11. Logs & History

| Method | Endpoint | Admin | Sale |
|---|---|---|---|
| GET | `/brands/:brandId/logs` | ✅ | ✅ |
| GET | `/brands/:brandId/orders/:id/logs` | ✅ | ✅ |

---

## 12. Ma trận tổng hợp

| Nhóm action | Admin | Sale |
|---|---|---|
| **Đọc** orders, products, logs | ✅ | ✅ |
| **Sửa** thông tin đơn | ✅ | ✅ |
| **Đổi trạng thái** (xử lý đơn) | ✅ | ✅ |
| **Chốt đơn** (→ confirmed) | ✅ | ✅ |
| **Hủy đơn đã chốt** (confirmed → cancelled) | ✅ | ❌ |
| **Sync** Google Sheet | ✅ | ✅ |
| **Import** CSV/Excel leads | ✅ | ✅ |
| **Import** SKU Excel | ✅ | ❌ |
| **Export** xlsx Template OR | ✅ | ❌ |
| **Cấu hình** Brand, Column Mapping, Export Config | ✅ | ❌ |
| **Quản lý Users** (thêm/sửa/xóa) | ✅ | ❌ |
| **Import** bảng mã địa chỉ | ✅ | ❌ |

---

## 13. Middleware Implementation

```typescript
// middleware/rbac.ts

type Role = 'admin' | 'sale';

/**
 * Kiểm tra user có role tương ứng trong brand không.
 * Throw 403 nếu không đủ quyền.
 */
export function requireRole(...roles: Role[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { brandId } = req.params;
    const userId = req.user.id;

    const userBrand = await prisma.userBrand.findUnique({
      where: { userId_brandId: { userId, brandId } },
    });

    if (!userBrand || !userBrand.active) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Không có quyền truy cập brand này' });
    }

    if (!roles.includes(userBrand.role as Role)) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: `Yêu cầu role: [${roles.join(', ')}], hiện tại: ${userBrand.role}`,
      });
    }

    req.userRole = userBrand.role as Role;
    next();
  };
}

// Shorthand
export const adminOnly = requireRole('admin');
export const anyRole   = requireRole('admin', 'sale');
```

### Áp dụng vào router

```typescript
// routes/brands.ts
router.get   ('/',         anyRole,   listBrands);
router.post  ('/',         adminOnly, createBrand);
router.get   ('/:id',      anyRole,   getBrand);
router.patch ('/:id',      adminOnly, updateBrand);
router.post  ('/:id/test-connection', adminOnly, testConnection);

// routes/users.ts
router.get   ('/',         adminOnly, listUsers);
router.post  ('/',         adminOnly, createUser);
router.patch ('/:id',      adminOnly, updateUser);
router.delete('/:id',      adminOnly, removeUser);

// routes/products.ts
router.get   ('/',             anyRole,   listProducts);
router.get   ('/lookup',       anyRole,   lookupProduct);
router.post  ('/import',       adminOnly, importProducts);
router.post  ('/',             adminOnly, createProduct);
router.patch ('/:id',          adminOnly, updateProduct);

// routes/orders.ts
router.get   ('/',             anyRole,   listOrders);
router.get   ('/:id',          anyRole,   getOrder);
router.patch ('/:id',          anyRole,   updateOrder);   // role-level check trong handler
router.post  ('/:id/confirm',  anyRole,   confirmOrder);
router.post  ('/sync',         anyRole,   syncSheet);
router.post  ('/import-csv',   anyRole,   importCsv);

// routes/export.ts
router.get   ('/preview',      adminOnly, previewExport);
router.post  ('/',             adminOnly, doExport);
```

### Check role trong handler khi cần phân biệt trong cùng endpoint

```typescript
// routes/orders.ts — PATCH /:id handler
async function updateOrder(req: Request, res: Response) {
  const { status, ...fields } = req.body;

  if (status) {
    // Transition confirmed → cancelled chỉ admin
    if (status === 'cancelled' && order.status === 'confirmed') {
      if (req.userRole !== 'admin') {
        return res.status(403).json({ error: 'FORBIDDEN', message: 'Chỉ admin mới hủy đơn đã chốt' });
      }
    }
    // Transition → template_ready/exported: admin only (không cho gọi thủ công)
    if (['template_ready', 'exported'].includes(status)) {
      if (req.userRole !== 'admin') {
        return res.status(403).json({ error: 'FORBIDDEN', message: 'Không được phép' });
      }
    }
    assertValidTransition(order.status, status); // từ 06-STATE_MACHINE
  }

  // ... cập nhật DB
}
```

---

## 14. Error Responses

| Code | HTTP | Tình huống |
|---|---|---|
| `UNAUTHORIZED` | 401 | Token hết hạn / chưa login |
| `FORBIDDEN` | 403 | Không thuộc brand hoặc không đủ role |
| `FORBIDDEN` | 403 | Sale cố hủy đơn đã chốt |
| `FORBIDDEN` | 403 | Sale cố truy cập export/import-sku |
