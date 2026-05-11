# Frontend Rules

## Tham khảo `frontend.jsx` là Source of Truth cho UI

Các view chính (navigation):
```
leads | export | products | users | history | settings_data | settings_brand
```

## Component Patterns

```tsx
// ✅ Typed props, functional components
interface OrderDrawerProps {
  order: Order | null
  onClose: () => void
  onConfirm: (id: string) => Promise<void>
}

// ✅ State update functional form
setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))

// ✅ Loading/error state luôn xử lý
{isLoading && <Spinner />}
{error && <ErrorBanner message={error} />}
{data && <DataTable rows={data} />}
```

## API Call Pattern (TanStack Query)

```ts
// Query
const { data: orders, isLoading } = useQuery({
  queryKey: ['orders', brandId, filters],
  queryFn: () => api.getOrders(brandId, filters),
  staleTime: 30_000,
})

// Mutation với optimistic update
const confirmOrder = useMutation({
  mutationFn: (id: string) => api.confirmOrder(brandId, id),
  onSuccess: () => queryClient.invalidateQueries(['orders', brandId]),
})
```

## UI Conventions (từ frontend.jsx)

- **Brand Selector**: luôn hiển thị ở header, filter toàn bộ data
- **Status Filter**: Tất cả / Mới / Đang gọi / Chốt đơn / Đã xuất Excel
- **Phân trang**: 15 hoặc 30 dòng/trang
- **Order Drawer**: slide-in từ phải, validate SKU + địa chỉ trước khi cho phép Confirm
- **Confirm button**: disabled nếu SKU hoặc địa chỉ chưa map
- **Export preview**: hiển thị cảnh báo nếu có đơn lỗi trước khi download

## Error Display

```ts
// API error codes → thông báo tiếng Việt
const ERROR_MESSAGES: Record<string, string> = {
  ADDRESS_NOT_MAPPED: 'Địa chỉ chưa được map — vui lòng chỉnh thủ công',
  SKU_NOT_MAPPED: 'Chưa xác định SKU',
  FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này',
  INVALID_STATE_TRANSITION: 'Không thể chuyển trạng thái đơn',
}
```

## Performance

- `useMemo` cho danh sách đã filter/sort
- `useCallback` cho handlers truyền xuống component con
- Lazy load trang nặng (Export, History)
- Debounce 500ms cho search input
