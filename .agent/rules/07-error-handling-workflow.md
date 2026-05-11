# Error Handling & Workflow Rules

## Backend Error Handler

```ts
// src/middlewares/errorHandler.ts
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'

export function errorHandler(err, req, res, next) {
  // Zod validation errors
  if (err instanceof ZodError) {
    return res.status(422).json({
      success: false,
      code: 'VALIDATION_ERROR',
      errors: err.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
    })
  }

  // Prisma unique constraint
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    return res.status(409).json({ success: false, code: 'DUPLICATE', error: 'Already exists' })
  }

  // Business logic errors (thrown manually)
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false, code: err.code, error: err.message
    })
  }

  // Unknown — không lộ detail
  console.error('[Unhandled]', err)
  res.status(500).json({ success: false, code: 'INTERNAL_ERROR', error: 'Server error' })
}

// Custom operational error
class AppError extends Error {
  isOperational = true
  constructor(public message: string, public statusCode = 400, public code = 'APP_ERROR') {
    super(message)
  }
}

// Usage trong service
throw new AppError('Địa chỉ không khớp bảng mã', 422, 'ADDRESS_NOT_MAPPED')
throw new AppError('Không thể chuyển trạng thái', 422, 'INVALID_STATE_TRANSITION')
```

## State Machine Validation

```ts
const VALID_TRANSITIONS: Record<string, string[]> = {
  new:       ['called_1', 'failed', 'cancelled'],
  called_1:  ['called_2', 'confirmed', 'failed', 'cancelled'],
  called_2:  ['called_3', 'confirmed', 'failed', 'cancelled'],
  called_3:  ['confirmed', 'failed', 'cancelled'],
  confirmed: ['exported', 'cancelled'],
  failed:    ['new'],      // có thể retry
  exported:  [],           // terminal
  cancelled: [],           // terminal
}

function validateTransition(from: string, to: string) {
  if (!VALID_TRANSITIONS[from]?.includes(to)) {
    throw new AppError(`Không thể chuyển từ ${from} → ${to}`, 422, 'INVALID_STATE_TRANSITION')
  }
}
```

## Activity Log — Luôn ghi khi đổi trạng thái

```ts
// Dùng Prisma transaction để đảm bảo atomic
await prisma.$transaction([
  prisma.order.update({ where: { id }, data: { status: newStatus } }),
  prisma.activityLog.create({
    data: {
      brandId, orderId: id, userId: req.user.userId,
      action: 'status_change',
      detail: { from: oldStatus, to: newStatus, note }
    }
  })
])
```

## Development Workflow

```bash
# Backend
cd backend && npm run dev       # nodemon port 3001

# Frontend
cd frontend && npm run dev      # vite port 5173

# DB migrations
cd backend && npx prisma migrate dev --name <tên_rõ_ràng>

# Sau khi sửa schema
npx prisma generate

# Test
npm test                        # vitest
```

## Commit Convention

```
feat: thêm export xlsx với address mapping
fix: sửa bug parse địa chỉ khi thiếu phường
refactor: tách parseProduct thành service riêng
docs: cập nhật API design cho /export endpoint
```
