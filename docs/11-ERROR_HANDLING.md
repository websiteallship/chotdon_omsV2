# Error Handling — Chuẩn xử lý lỗi

**Phiên bản:** 1.0  
**Ngày:** 2026-05-12  
**Nguồn:** 03-API_DESIGN.md | 06-STATE_MACHINE.md | 07-RBAC_POLICY.md | 09-EXPORT_SPEC.md

> File này là **nguồn sự thật duy nhất** cho error codes, HTTP status, và error response format. Tất cả handler phải tuân thủ.

---

## 1. Error Response Format (chuẩn toàn hệ thống)

```typescript
// Mọi error response đều có cùng shape
interface ErrorResponse {
  error:   string;          // Error code — UPPER_SNAKE_CASE, dùng để xử lý phía client
  message: string;          // Mô tả ngắn — hiển thị cho dev, không hiển thị end-user
  details?: unknown;        // Dữ liệu bổ sung (validation errors, field list...)
  requestId?: string;       // Trace ID cho debugging
}
```

**Ví dụ:**
```json
{
  "error": "INVALID_TRANSITION",
  "message": "exported → called_1 is not allowed",
  "details": { "from": "exported", "to": "called_1", "allowed": [] }
}
```

> **Nghiêm cấm** trả plain string, HTML, hoặc stack trace trong response trên production.

---

## 2. AppError Class — Custom Error

```typescript
// lib/errors/AppError.ts
export class AppError extends Error {
  constructor(
    public readonly code:    string,   // Error code — UPPER_SNAKE_CASE
    public readonly message: string,
    public readonly httpStatus: number = 400,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Shorthand factories
export const errors = {
  unauthorized:  (msg = 'Unauthorized')           => new AppError('UNAUTHORIZED',           msg, 401),
  forbidden:     (msg = 'Forbidden')              => new AppError('FORBIDDEN',              msg, 403),
  notFound:      (resource: string)               => new AppError('NOT_FOUND',              `${resource} not found`, 404),
  conflict:      (msg: string)                    => new AppError('CONFLICT',               msg, 409),
  validation:    (msg: string, details?: unknown) => new AppError('VALIDATION_ERROR',       msg, 422, details),
  invalidTrans:  (from: string, to: string, allowed: string[]) =>
    new AppError('INVALID_TRANSITION', `${from} → ${to} is not allowed`, 422, { from, to, allowed }),
  badGateway:    (msg: string)                    => new AppError('BAD_GATEWAY',            msg, 502),
};
```

---

## 3. Global Error Handler (Express)

```typescript
// middleware/errorHandler.ts
import { AppError } from '../lib/errors/AppError';
import { Prisma }   from '@prisma/client';
import { ZodError } from 'zod';

const IS_PROD = process.env.NODE_ENV === 'production';

export function globalErrorHandler(
  err:  unknown,
  req:  Request,
  res:  Response,
  _next: NextFunction,
): void {
  // --- AppError (business logic) ---
  if (err instanceof AppError) {
    res.status(err.httpStatus).json({
      error:   err.code,
      message: err.message,
      ...(err.details !== undefined && { details: err.details }),
    });
    return;
  }

  // --- Zod validation ---
  if (err instanceof ZodError) {
    res.status(422).json({
      error:   'VALIDATION_ERROR',
      message: 'Request body validation failed',
      details: err.flatten().fieldErrors,
    });
    return;
  }

  // --- Prisma unique constraint ---
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({
        error:   'CONFLICT',
        message: 'Duplicate record',
        details: { fields: (err.meta as any)?.target },
      });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Record not found' });
      return;
    }
  }

  // --- Unknown / unhandled ---
  console.error({ err, url: req.url, method: req.method, userId: (req as any).user?.userId });

  res.status(500).json({
    error:   'INTERNAL_SERVER_ERROR',
    message: IS_PROD ? 'An unexpected error occurred' : (err as Error).message,
    ...(IS_PROD ? {} : { stack: (err as Error).stack }),
  });
}
```

**Gắn vào app (phải đặt cuối cùng, sau tất cả routes):**
```typescript
app.use(globalErrorHandler);
```

---

## 4. Async Handler Wrapper

```typescript
// lib/asyncHandler.ts
import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Bọc async route handler, tự động pass error vào next().
 * Tránh viết try/catch lặp trong mỗi handler.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Dùng:
router.patch('/:id', asyncHandler(async (req, res) => {
  const order = await updateOrder(req.params.id, req.body);
  res.json({ success: true, data: order });
}));
```

---

## 5. Error Codes — Danh mục đầy đủ

### 5.1 Auth

| Code | HTTP | Tình huống |
|---|---|---|
| `UNAUTHORIZED` | 401 | Token thiếu, hết hạn, hoặc không hợp lệ |
| `INVALID_REFRESH_TOKEN` | 401 | Refresh token không tồn tại / đã revoke |
| `MISSING_REFRESH_TOKEN` | 401 | Request `/auth/refresh` không có cookie |
| `FORBIDDEN` | 403 | Không thuộc brand hoặc không đủ role |
| `ACCOUNT_INACTIVE` | 403 | User bị vô hiệu hóa (`active=false`) |

### 5.2 Validation chung

| Code | HTTP | Tình huống |
|---|---|---|
| `VALIDATION_ERROR` | 422 | Request body không pass Zod schema |
| `NOT_FOUND` | 404 | Resource (order, brand, product) không tồn tại |
| `CONFLICT` | 409 | Unique constraint vi phạm (duplicate sheet_row_id...) |

### 5.3 State Machine

| Code | HTTP | Tình huống | Nguồn |
|---|---|---|---|
| `INVALID_TRANSITION` | 422 | Chuyển trạng thái không hợp lệ | `06-STATE_MACHINE.md §2` |
| `SAME_STATUS` | 422 | `from === to` | `06-STATE_MACHINE.md §2` |
| `CONFIRMATION_VALIDATION_FAILED` | 422 | Gate chốt đơn thất bại | `06-STATE_MACHINE.md §5` |
| `SKU_NOT_RESOLVED` | 422 | `sku_status = needs_sku` | |
| `SKU_MISSING` | 422 | `product_sku = null` | |
| `ADDRESS_NOT_MAPPED` | 422 | `ward_code` hoặc `district_code` null | |
| `WARD_CODE_MISSING` | 422 | `ward_code = null` | |
| `DISTRICT_CODE_MISSING` | 422 | `district_code = null` | |
| `INVALID_QUANTITY` | 422 | `quantity < 1` | |
| `INVALID_PRICE` | 422 | `selling_price <= 0` | |
| `MISSING_CUSTOMER_NAME` | 422 | `customer_name` rỗng | |
| `MISSING_PHONE` | 422 | `phone` rỗng | |

### 5.4 Import / Sync

| Code | HTTP | Tình huống | Nguồn |
|---|---|---|---|
| `ENCODING_ERROR` | 422 | File CSV không phải UTF-8 | `08-DATA_CONTRACTS.md §2.1` |
| `TOO_MANY_ROWS` | 422 | Vượt 5,000 rows/batch | `08-DATA_CONTRACTS.md §10` |
| `MISSING_CUSTOMER_NAME` | 422 | Row thiếu tên KH | |
| `MISSING_PHONE` | 422 | Row thiếu SĐT | |
| `SHEET_CONNECTION_ERROR` | 502 | Không kết nối được Google Sheet API | |

### 5.5 Export

| Code | HTTP | Tình huống | Nguồn |
|---|---|---|---|
| `NO_CONFIRMED_ORDERS` | 422 | Không có đơn `confirmed` trong khoảng ngày | `09-EXPORT_SPEC.md §11` |
| `EXPORT_BLOCKED` | 422 | Batch còn đơn bị block (thiếu mã địa chỉ) | `09-EXPORT_SPEC.md §11` |
| `SHEET_WRITE_ERROR` | 502 | Write-back Google Sheet thất bại | `09-EXPORT_SPEC.md §11` |

### 5.6 Hệ thống

| Code | HTTP | Tình huống |
|---|---|---|
| `TOO_MANY_REQUESTS` | 429 | Vượt rate limit |
| `EXPORT_RATE_LIMIT_EXCEEDED` | 429 | Vượt limit export riêng |
| `IMPORT_RATE_LIMIT_EXCEEDED` | 429 | Vượt limit import riêng |
| `INTERNAL_SERVER_ERROR` | 500 | Lỗi không xử lý được |
| `BAD_GATEWAY` | 502 | External service (Google Sheet, GHN...) lỗi |

---

## 6. Error Handling theo từng Layer

### 6.1 Route Handler → throw AppError

```typescript
// routes/orders.ts
router.patch('/:id/status', asyncHandler(async (req, res) => {
  const { id }     = req.params;
  const { status } = req.body;

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) throw errors.notFound('Order');

  assertValidTransition(order.status, status);   // throws AppError nếu sai

  if (status === 'confirmed') {
    const errs = validateConfirmationGuard(order);
    if (errs.length > 0) {
      throw new AppError('CONFIRMATION_VALIDATION_FAILED',
        'Đơn chưa đủ điều kiện chốt', 422, { errors: errs });
    }
  }

  const updated = await prisma.order.update({ where: { id }, data: { status } });
  res.json({ success: true, data: updated });
}));
```

### 6.2 External Service (Google Sheets) → wrap lỗi

```typescript
// lib/googleSheets.ts
export async function readSheet(brand: Brand): Promise<string[][]> {
  try {
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: brand.sheetId,
      range:         brand.sheetRange,
    });
    return response.data.values ?? [];
  } catch (err: unknown) {
    // Không để Googleapis error leak ra ngoài
    const msg = err instanceof Error ? err.message : 'Unknown error';
    throw new AppError('SHEET_CONNECTION_ERROR',
      `Không thể đọc Google Sheet: ${msg}`, 502);
  }
}
```

### 6.3 Import — Lỗi partial (không throw, collect và báo cáo)

```typescript
// Không throw khi 1 row lỗi — tiếp tục xử lý các row còn lại
const result: SyncResult = { new: 0, skipped: 0, invalid: 0, invalidRows: [] };

for (const [index, row] of rows.entries()) {
  const errors = validateRequiredFields(row);
  if (errors.length > 0) {
    result.invalid++;
    result.invalidRows.push({ row: index + 2, sheetRowId: buildSheetRowId(row, index, brand), reason: errors[0], rawData: row });
    continue;
  }
  // ... process row
}

res.json({ success: true, data: result });
```

---

## 7. Client-side Error Handling (Frontend Guidelines)

### 7.1 Phân loại xử lý theo error code

```typescript
// frontend/lib/apiError.ts
export function handleApiError(code: string, details?: unknown): void {
  switch (code) {
    case 'UNAUTHORIZED':
    case 'INVALID_REFRESH_TOKEN':
      // Redirect về login, xóa token khỏi memory
      authStore.logout();
      router.push('/login');
      break;

    case 'FORBIDDEN':
      toast.error('Bạn không có quyền thực hiện thao tác này');
      break;

    case 'INVALID_TRANSITION':
      toast.error('Không thể chuyển trạng thái này');
      break;

    case 'CONFIRMATION_VALIDATION_FAILED':
      // Hiển thị danh sách lỗi từ details.errors[]
      showValidationErrors(details as ValidationError[]);
      break;

    case 'TOO_MANY_REQUESTS':
      toast.warning('Quá nhiều yêu cầu. Vui lòng thử lại sau.');
      break;

    case 'INTERNAL_SERVER_ERROR':
    case 'BAD_GATEWAY':
      toast.error('Lỗi hệ thống. Vui lòng thử lại hoặc liên hệ hỗ trợ.');
      break;

    default:
      toast.error(`Đã xảy ra lỗi: ${code}`);
  }
}
```

### 7.2 Retry Policy cho External Service

| Lỗi | Retry | Delay | Ghi chú |
|---|---|---|---|
| `SHEET_CONNECTION_ERROR` | 3 lần | 1s, 2s, 4s (exponential) | Chỉ retry idempotent GET |
| `BAD_GATEWAY` | 2 lần | 1s, 3s | |
| `INTERNAL_SERVER_ERROR` | Không retry | — | Có thể side-effect |
| `VALIDATION_ERROR` | Không retry | — | Fix input trước |

---

## 8. Không bao giờ làm

| ❌ Anti-pattern | ✅ Thay bằng |
|---|---|
| `res.json({ error: err.message })` trực tiếp | `throw new AppError(...)` → global handler |
| `console.log(err)` không structured | `console.error({ err, url, userId })` |
| Trả `500` cho lỗi validation | Dùng `422 VALIDATION_ERROR` |
| Expose Prisma error message ra client | Wrap thành `AppError` |
| `catch` rỗng `catch (_) {}` | Ít nhất log hoặc rethrow |
| Trả `{ success: false, message: "Lỗi rồi" }` chung chung | Error code cụ thể theo danh mục §5 |
