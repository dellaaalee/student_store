# Student Store 


## Section 1: Data Models

Three models — **Product**, **Order**, **OrderItem** — all with auto-incrementing integer
`id` PKs (`@id @default(autoincrement())`).

### Product
| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `id` | `Int` | yes | `autoincrement()` | PK |
| `name` | `String` | yes | — | |
| `description` | `String` | yes | — | |
| `price` | `Float` | yes | — | |
| `imageUrl` | `String` | yes | — | `@map("image_url")` |
| `category` | `String` | yes | — | e.g. Apparel, Books, Snacks |
| `orderItems` | `OrderItem[]` | — | — | relation (one → many) |

### Order
| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `id` | `Int` | yes | `autoincrement()` | PK (the `order_id`) |
| `customer` | `Int` | yes | — | from `customer_id` |
| `customerEmail` | `String?` | no | — | `@map("customer_email")`; powers email filter |
| `totalPrice` | `Float` | yes | — | `@map("total_price")` |
| `status` | `String` | yes | `"pending"` | "pending" / "completed" |
| `createdAt` | `DateTime` | yes | `now()` | `@map("created_at")` |
| `orderItems` | `OrderItem[]` | — | — | relation (one → many) |

### OrderItem
| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `id` | `Int` | yes | `autoincrement()` | PK (the `order_item_id`) |
| `orderId` | `Int` | yes | — | FK → Order. `@map("order_id")` |
| `productId` | `Int` | yes | — | FK → Product. `@map("product_id")` |
| `quantity` | `Int` | yes | — | |
| `price` | `Float` | yes | — | unit price captured at order time |
| `order` / `product` | relation | yes | — | see cascade below |

### Cascade behavior
An `OrderItem` never exists alone. Deleting a **Product** or an **Order** deletes the
`OrderItem` rows that reference it; deleting an `OrderItem` cascades to nothing. Implemented
with `onDelete: Cascade` on both OrderItem relations:

```prisma
model OrderItem {
  order   Order   @relation(fields: [orderId],   references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)
}
```


## Section 2: API Contract

Responses use snake_case keys. Errors use a single shape — see **Section 4**.

### Product endpoints
| Method & path | Request | Success | Error |
|---------------|---------|---------|-------|
| `GET /products` | — | `200` → `[{product}]` | `500` |
| `GET /products/:id` | param `id` | `200` → `{product}` | `404` not found |
| `POST /products` | body: `name, description, price, image_url, category` | `201` → `{product}` | `400` missing field |
| `PUT /products/:id` | param `id`; any updatable fields | `200` → `{product}` | `404` not found |
| `DELETE /products/:id` | param `id` | `204` | `404` not found |

`{product}` shape:
```json
{ "id": 1, "name": "College Hoodie", "description": "...", "price": 29.99,
  "image_url": "https://...", "category": "Apparel" }
```

### Order endpoints
| Method & path | Request | Success | Error |
|---------------|---------|---------|-------|
| `GET /orders` | optional `?email=` filter | `200` → `[{order}]` | `500` |
| `GET /orders/:order_id` | param `order_id` | `200` → `{order}` **with `items`** | `404` not found |
| `POST /orders` | see below | `201` → `{order}` with `items` | `400` (see Section 4) |
| `PUT /orders/:order_id` | body e.g. `{ "status": "completed" }` | `200` → `{order}` | `404` not found |
| `DELETE /orders/:order_id` | param `order_id` | `204` | `404` not found |

> `GET /orders?email=` filters by `customer_email`; omitted → all orders; no match → `200`
> with `[]` (UI shows "no orders found").

### Stretch endpoints
| Method & path | Request | Success | Error |
|---------------|---------|---------|-------|
| `GET /order-items` | — | `200` → `[{order_item}]` | `500` |
| `POST /orders/:order_id/items` | body: `{ product_id, quantity }` | `201` → `{order_item}` | `404` order / `400` bad product |

### Detailed contract: `POST /orders`
Creates an order **and** its items in one atomic request.

**Request** — `customer` (Int, required), `customer_email` (String, optional), `status`
(optional, defaults `"pending"`), `items` (non-empty array of `{ product_id, quantity }`).
The server looks up each unit price from the Product table and computes `total_price` —
clients never send prices.
```json
{
  "customer": 101,
  "customer_email": "student@school.edu",
  "items": [ { "product_id": 1, "quantity": 2 }, { "product_id": 4, "quantity": 1 } ]
}
```

**Success — `201`:**
```json
{
  "order_id": 3, "customer": 101, "customer_email": "student@school.edu",
  "total_price": 61.97, "status": "pending", "created_at": "2026-06-17T10:00:00.000Z",
  "items": [
    { "order_item_id": 5, "order_id": 3, "product_id": 1, "quantity": 2, "price": 29.99 },
    { "order_item_id": 6, "order_id": 3, "product_id": 4, "quantity": 1, "price": 1.99 }
  ]
}
```


## Section 3: Transactional Flow (`POST /orders`)

Creates one Order + N OrderItems atomically — a failure on any item leaves zero rows.

1. **Validate** `customer` present and `items` non-empty → else `400`, no DB writes.
2. **Resolve products** via `prisma.product.findMany({ where: { id: { in: productIds } } })`.
   If any `product_id` is missing → `400 "Product <id> does not exist"` **before any write**.
3. **Compute total** = Σ (product price × quantity); store each resolved unit price on its
   OrderItem (so historical orders keep their price even if the product changes later).
4. **Write atomically** with a single nested create — itself an implicit transaction, so a
   failure on any OrderItem rolls back the Order too:
   ```js
   const order = await prisma.order.create({
     data: {
       customer, customerEmail, status, totalPrice,
       orderItems: { create: items.map(i => ({
         productId: i.product_id, quantity: i.quantity,
         price: priceByProductId[i.product_id],
       })) },
     },
     include: { orderItems: true },
   })
   ```
   (Multi-step logic that can't be one nested write uses explicit `prisma.$transaction([...])`.)
5. **Respond** `201` with the order + `items`.

**Guarantee:** either a complete order with all its items exists, or nothing does.


## Section 4: Error Handling

Every error returns the same shape:
```json
{ "error": "human-readable message" }
```

**Where it lives:** there is no global error middleware — each **controller**
([src/controllers/](student-store-api/src/controllers)) wraps its logic in `try/catch`,
validates input, and maps outcomes to status codes. The **model**
([src/models/order.js](student-store-api/src/models/order.js)) throws a custom
`BadOrderError` for order business-rule violations, which `orderController` catches and
turns into a `400`.

**Status policy:** `400` bad/invalid input · `404` missing resource · `500` unexpected.

| Cause | Status | Example body | Where |
|-------|--------|--------------|-------|
| Missing required field | `400` | `{ "error": "Missing required field: name" }` | product/order controllers |
| Non-integer `:id` route param | `400` | `{ "error": "Product id must be an integer" }` | controllers (guard before DB) |
| Record not found (GET, or Prisma `P2025` on update/delete) | `404` | `{ "error": "Product not found" }` | null check / `err.code === 'P2025'` |
| Empty `items` or nonexistent `product_id` (POST /orders) | `400` | `{ "error": "Product 99 does not exist" }` | `BadOrderError` from model |
| Anything unexpected (DB down, etc.) | `500` | `{ "error": "Failed to fetch products" }` | catch-all in each method |

**Transaction safety:** bad product ids are rejected *before* the transaction opens, and the
nested create rolls back fully on any failure — so a failed `POST /orders` never leaves a
partial order.

**Known gap:** no global error middleware and no JSON 404 catch-all for unmatched routes —
unknown paths return Express's default bare `"Not Found"` instead of the `{ "error": ... }`
shape.


## Implementation Notes & Status

- **Built & deployed.** All three models migrated; cascade deletes verified (deleting a
  Product or Order removes its OrderItems). Full flow — browse → cart → place order →
  receipt — tested locally and on Render (frontend static site + Express web service +
  Postgres).
- **Serialization.** Prisma camelCase → API snake_case via `@map` columns +
  `serialize{Product,Order,OrderItem}` helpers; `POST /orders` returns the order with a
  nested `items` array.
- **Frontend integration resolutions:** wired `GET /products`, `GET /products/:id`,
  `POST /orders` (axios was imported but unused); fixed `userInfo` to `{ name, email }`
  (Student ID → integer `customer`, email → `customer_email`); the receipt's
  `purchase.receipt.lines` view model is built client-side from the flat order response
  (the contract stays the source of truth).
- **Money:** `Float` today; `Decimal` is the documented future fix to avoid float rounding
  (e.g. `80.9499…`), which `formatPrice()` currently masks by rounding to 2 dp.
