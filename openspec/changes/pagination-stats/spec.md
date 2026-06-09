# Spec: pagination-stats

## Change Summary

Introduces offset pagination for `GET /api/orders/all` and `GET /api/cfdi`, adds
a dedicated aggregate endpoint `GET /api/orders/stats`, adds a `creadoEn` index
migration on `Pedido`, and updates all five admin frontend consumers to the new
response shapes.

## Capability Specs

| Capability | Spec File | Type |
|---|---|---|
| order-pagination | `specs/order-pagination/spec.md` | New |
| cfdi-pagination | `specs/cfdi-pagination/spec.md` | New |

## Non-Goals (from proposal)

- `GET /api/clientes` pagination — deferred
- Date-range filtering on stats — deferred
- CfdiComponent pedido-selector search-as-you-type redesign — deferred
- Hardcoded demo charts (`ventasMes`, `metodos`, `categorias`) — untouched
- Rename `/orders/all` → `/orders/admin` — skipped

## Response Envelope Contract

Both paginated endpoints MUST return the existing `Paginated<T>` shape:

```typescript
{ data: T[]; meta: { total: number; page: number; limit: number; pages: number } }
```

Default `page=1`, default `limit=20`, max `limit=100` — identical to the existing
products pagination pattern.

## Invariants

1. No endpoint introduced by this change MUST alter existing role guards.
2. No list endpoint MUST perform an unbounded `findMany` after this change.
3. `GET /api/orders/stats` MUST use Prisma `aggregate`/`count` — never a row fetch.
4. `ticketPromedio` MUST be `0` (not `NaN`, not `Infinity`) when `pedidosCount` is `0`.
5. The `@@index([creadoEn])` migration MUST be additive (no data change).
6. All five frontend consumers (`PedidosComponent`, `DashboardComponent`,
   `ReportesComponent`, `CfdiComponent` × 2 usages) MUST render without runtime errors.
