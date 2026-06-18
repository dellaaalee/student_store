## Section 1: Data Models

Three models: **Product**, **Order**, and **OrderItem**. All primary keys are integer
`id` fields that auto-increment (`@id @default(autoincrement())`).

> **Naming note:** Prisma model fields use camelCase, but the source data
> ([data/products.json](student-store-api/data/products.json),
> [data/orders.json](student-store-api/data/orders.json)) and the frontend use
> snake_case. We bridge this with `@map(...)` so the database column name matches the
> snake_case convention while the Prisma field stays camelCase. The field names below
> are exactly what [seed.js](student-store-api/seed.js) already references.
>
> **Money note:** `price` / `totalPrice` are typed `Float` to match the plain numbers in
> the seed data. (`Decimal` is more correct for currency and avoids float rounding — a
> reasonable future improvement, but `Float` keeps the seed and JS numbers simple here.)

### Product

| Field        | Prisma type   | Required | Default              | Notes                          |
|--------------|---------------|----------|----------------------|--------------------------------|
| `id`         | `Int`         | yes      | `autoincrement()`    | Primary key, auto-increments   |
| `name`       | `String`      | yes      | —                    |                                |
| `description`| `String`      | yes      | —                    |                                |
| `price`      | `Float`       | yes      | —                    |                                |
| `imageUrl`   | `String`      | yes      | —                    | `@map("image_url")`            |
| `category`   | `String`      | yes      | —                    | e.g. Apparel, Books, Snacks    |
| `orderItems` | `OrderItem[]` | —        | —                    | Relation (one product → many)  |

### Order

| Field          | Prisma type   | Required | Default              | Notes                                   |
|----------------|---------------|----------|----------------------|-----------------------------------------|
| `id`           | `Int`         | yes      | `autoincrement()`    | Primary key (the `order_id`)            |
| `customer`     | `Int`         | yes      | —                    | from `customer_id`                      |
| `customerEmail`| `String?`     | no       | —                    | Optional; enables filter-by-email stretch. Nullable so existing seed data loads. |
| `totalPrice`   | `Float`       | yes      | —                    | `@map("total_price")`                   |
| `status`       | `String`      | yes      | `"pending"`          | e.g. "pending", "completed"             |
| `createdAt`    | `DateTime`    | yes      | `now()`              | `@map("created_at")`                    |
| `orderItems`   | `OrderItem[]` | —        | —                    | Relation (one order → many items)       |

### OrderItem

| Field       | Prisma type | Required | Default           | Notes                              |
|-------------|-------------|----------|-------------------|------------------------------------|
| `id`        | `Int`       | yes      | `autoincrement()` | Primary key (the `order_item_id`)  |
| `orderId`   | `Int`       | yes      | —                 | FK → Order. `@map("order_id")`     |
| `productId` | `Int`       | yes      | —                 | FK → Product. `@map("product_id")` |
| `quantity`  | `Int`       | yes      | —                 |                                    |
| `price`     | `Float`     | yes      | —                 | Unit price captured at order time  |
| `order`     | `Order`     | yes      | —                 | Relation                           |
| `product`   | `Product`   | yes      | —                 | Relation                           |

### Cascade behavior

**In plain language:**
- An `OrderItem` cannot exist on its own — it always belongs to one `Order` and points at
  one `Product`.
- **Deleting a Product** must also delete every `OrderItem` that references that product.
- **Deleting an Order** must also delete every `OrderItem` that belongs to that order.
- Deleting an `OrderItem` deletes nothing else (it's the leaf of the dependency chain).

**In Prisma terms** — set `onDelete: Cascade` on the OrderItem side of both relations:

```prisma
model OrderItem {
  // ...
  order   Order   @relation(fields: [orderId],   references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)
}
```

When a parent `Order` or `Product` row is deleted, Postgres (via Prisma's generated
foreign-key constraint) removes the dependent `OrderItem` rows in the same operation.


## Section 2: API Contract

**Global error shape** — every error response across the API uses:

```json
{ "error": "human-readable message" }
```

Validation/bad-input errors return `400`, missing resources return `404`, and unexpected
failures return `500`. Product/order JSON sent to the client uses snake_case keys
(`image_url`, `total_price`, `created_at`, `order_id`, …) to match the frontend.

### Product endpoints

| Method & path        | Request                                      | Success                          | Error (example)                            |
|----------------------|----------------------------------------------|----------------------------------|--------------------------------------------|
| `GET /products`      | —                                            | `200` → `[ {product}, ... ]`     | `500` `{ "error": "..." }`                 |
| `GET /products/:id`  | route param `id`                             | `200` → `{product}`              | `404` `{ "error": "Product not found" }`   |
| `POST /products`     | body: `name, description, price, image_url, category` | `201` → `{product}` (created)    | `400` `{ "error": "Missing required field: name" }` |
| `PUT /products/:id`  | route param `id`; body: any updatable fields | `200` → `{product}` (updated)    | `404` `{ "error": "Product not found" }`   |
| `DELETE /products/:id` | route param `id`                           | `204` (no body)                  | `404` `{ "error": "Product not found" }`   |

A `{product}` body shape:

```json
{ "id": 1, "name": "College Hoodie", "description": "...", "price": 29.99,
  "image_url": "https://...", "category": "Apparel" }
```

### Order endpoints

| Method & path             | Request                                  | Success                              | Error (example)                          |
|---------------------------|------------------------------------------|--------------------------------------|------------------------------------------|
| `GET /orders`             | optional query `?email=` (filter stretch) | `200` → `[ {order}, ... ]`           | `500` `{ "error": "..." }`               |
| `GET /orders/:order_id`   | route param `order_id`                   | `200` → `{order}` **with `items`**   | `404` `{ "error": "Order not found" }`   |
| `POST /orders`            | see detailed contract below              | `201` → `{order}` with `items`       | `400` `{ "error": "Product 99 does not exist" }` |
| `PUT /orders/:order_id`   | route param; body e.g. `{ "status": "completed" }` | `200` → `{order}` (updated)          | `404` `{ "error": "Order not found" }`   |
| `DELETE /orders/:order_id`| route param `order_id`                   | `204` (no body)                      | `404` `{ "error": "Order not found" }`   |

> The `?email=` query param on `GET /orders` powers the "filter past orders by email"
> stretch feature; when omitted, all orders are returned. An unmatched email returns
> `200` with an empty array `[]` (the UI renders "no orders found").

### Stretch endpoints

| Method & path                  | Request                                          | Success                       | Error (example)                          |
|--------------------------------|--------------------------------------------------|-------------------------------|------------------------------------------|
| `GET /order-items`             | —                                                | `200` → `[ {order_item}, ... ]` | `500` `{ "error": "..." }`               |
| `POST /orders/:order_id/items` | route param; body: `{ "product_id", "quantity" }` | `201` → `{order_item}`        | `404` `{ "error": "Order not found" }` / `400` for bad product |

### Detailed contract: `POST /orders`

This endpoint creates an order **and** its line items in one atomic request.

**Request body:**

```json
{
  "customer": 101,
  "customer_email": "student@school.edu",
  "status": "pending",
  "items": [
    { "product_id": 1, "quantity": 2 },
    { "product_id": 4, "quantity": 1 }
  ]
}
```

- `customer` (Int, required), `customer_email` (String, optional), `status` (String,
  optional — defaults to `"pending"`).
- `items` (array, required, non-empty). Each item carries only `product_id` and
  `quantity` — **the server looks up the unit price from the Product table** rather than
  trusting a client-supplied price. `total_price` is computed server-side.

**Success — `201 Created`:**

```json
{
  "order_id": 3,
  "customer": 101,
  "customer_email": "student@school.edu",
  "total_price": 61.97,
  "status": "pending",
  "created_at": "2026-06-17T10:00:00.000Z",
  "items": [
    { "order_item_id": 5, "order_id": 3, "product_id": 1, "quantity": 2, "price": 29.99 },
    { "order_item_id": 6, "order_id": 3, "product_id": 4, "quantity": 1, "price": 1.99 }
  ]
}
```

**Error cases:**
- `400` — empty/missing `items`, or an item references a nonexistent product:
  `{ "error": "Product 99 does not exist" }`. No order is created (see Section 3).
- `400` — missing `customer`: `{ "error": "Missing required field: customer" }`.


## Section 3: Transactional Flow

`POST /orders` is the most architecturally significant endpoint: it creates one `Order`
plus N `OrderItem` rows, computes the total, and must do so **atomically** — a failure on
any item leaves zero rows behind. Step by step at the data layer:

1. **Parse & validate the request body.** Ensure `customer` is present and `items` is a
   non-empty array. If not → respond `400`, no DB writes.

2. **Resolve products & prices.** Collect the `product_id`s from `items` and fetch them:
   `prisma.product.findMany({ where: { id: { in: productIds } } })`. If any requested
   `product_id` is not found in the result, the body references a nonexistent product →
   respond `400` (`{ "error": "Product <id> does not exist" }`) **before opening any
   transaction**. This is the answer to "what if an item references a nonexistent
   product?": we detect it up front and never create a partial order.

3. **Compute the total.** For each item, take the unit `price` from the fetched product
   and multiply by `quantity`; sum across items to get `totalPrice`. Each item's
   server-resolved `price` is stored on its `OrderItem` so historical orders keep the
   price at purchase time even if the product's price later changes.

4. **Write atomically inside `prisma.$transaction`.** Create the `Order`, then create its
   `OrderItem` rows linked to the new order. The cleanest form is a single nested create:

   ```js
   const order = await prisma.order.create({
     data: {
       customer,
       customerEmail,            // optional
       status,                   // defaults to "pending"
       totalPrice,
       orderItems: {
         create: items.map(i => ({
           productId: i.product_id,
           quantity:  i.quantity,
           price:     priceByProductId[i.product_id],
         })),
       },
     },
     include: { orderItems: true },
   })
   ```

   A nested `create` runs in an implicit transaction, so if any `OrderItem` insert fails
   (e.g. a constraint violation), Prisma rolls back the whole thing — the `Order` is not
   left half-created. For multi-step logic that can't be expressed as one nested write,
   wrap the steps in an explicit `prisma.$transaction([...])` / interactive transaction
   for the same all-or-nothing guarantee.

5. **Respond.** On success return `201` with the created order and its `items` included
   (the `include: { orderItems: true }` above). On any thrown error inside the
   transaction, nothing was committed → respond `400`/`500` with the standard
   `{ "error": "..." }` shape.

**Net guarantee:** either a complete order with all its line items exists, or nothing
does. There is no state where an order exists without its items, or where some items were
created and others were not.
