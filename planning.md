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


## Decisions Log — Product Model

- **Schema translation that went smoothly**: The Product table mapped 1:1 from the spec
  into Prisma — `id Int @id @default(autoincrement())`, the required `String`/`Float`
  fields, and `imageUrl String @map("image_url")` so the DB column stays snake_case while
  the Prisma field is camelCase. Added `@@map("products")` for the table name. The
  `orderItems OrderItem[]` back-relation is intentionally commented out until the
  `OrderItem` model exists (this task is Product-only).

- **Field decision I made during implementation that wasn't in the original spec**:
  Stayed strict to the spec — deliberately did *not* add `@updatedAt`/`@createdAt` to
  Product, to avoid drifting from the documented contract. The one cross-cutting addition
  was a `serializeProduct()` helper in `server.js` that converts Prisma's `imageUrl` back
  to `image_url` on every response, so the API output matches what the frontend reads.

- **Route behavior that needed a spec update**: No spec change needed — all five routes
  were implemented exactly as documented (`GET` list/one, `POST` 201, `PUT` 200, `DELETE`
  204; 404 `{ "error": "Product not found" }` via Prisma's `P2025` error code). One
  **addition** beyond the spec: routes return `400 { "error": "Product id must be an
  integer" }` when `:id` isn't numeric — input the contract didn't cover.

- **Tooling note (not a model decision)**: `npx prisma` initially pulled v7, which rejects
  `url = env(...)` in `schema.prisma`. Pinned the CLI to `prisma@^6` (matching
  `@prisma/client@^6`) as a devDependency to fix it. **Migration not yet run** — needs a
  real Postgres `DATABASE_URL` in `.env` (still placeholder). Run later:
  `cd student-store-api && npx prisma migrate dev --name init_products_table`


## Spec Reconciliation — Milestone 4 (Schema Audit)

> **Status: implemented and tested.** `OrderItem` was added with relations to `Order` and
> `Product`, cascade deletes enabled on both, migration `add_order_items_with_relations`
> applied, and the transactional `POST /orders` / fetch-with-items flow wired up. All
> behaviors below were verified end to end via curl against the live `student-store` DB.

### Schema vs. spec gaps found
- **No gaps — schema matched the spec exactly.** `OrderItem` was translated verbatim from
  the Section 1 table: `id Int @id @default(autoincrement())`, `orderId Int @map("order_id")`,
  `productId Int @map("product_id")`, `quantity Int`, `price Float`, plus
  `@@map("order_items")`. No extra fields; no spec fields omitted.
- **Relationships modeled correctly:** `OrderItem` holds both foreign keys; its two
  `@relation` fields point at `Order.id` and `Product.id`. The previously commented-out
  back-relations (`orderItems OrderItem[]`) on `Order` and `Product` were uncommented —
  this was the one expected "gap" from earlier Product-/Order-only milestones, now closed.
- **Cascade rules implemented as documented:** `onDelete: Cascade` on *both* OrderItem
  relations. Confirmed in the generated migration SQL — both FK constraints
  (`order_items_order_id_fkey`, `order_items_product_id_fkey`) carry `ON DELETE CASCADE`.
- **Note (price semantics):** `OrderItem.price` is the unit price captured at time of
  purchase. `POST /orders` looks the price up from the `Product` table server-side rather
  than trusting the client, and stores it on the item — matching Section 3 intent.

### Cascade delete verification
- Deleting a Product removes associated OrderItems: ✅ tested — `DELETE /products/31`
  (a product referenced by an order item) returned `204`, and that `OrderItem` row
  disappeared from `GET /order-items` and from the order's `items`.
- Deleting an Order removes associated OrderItems: ✅ tested — `DELETE /orders/2` returned
  `204`, and `GET /order-items` then returned `[]` (its remaining items were removed).
- Also verified: `POST /orders` with an `items` array → `201` with the created `items`
  and a server-computed `total_price` (29.99×2 + 1.99×1 = **61.97**); `GET /orders/:id`
  returns the order **with** its `items`; bad input → `400` (nonexistent product id and
  empty `items` both rejected before any rows are written).



## Decisions Log — Order Creation Transaction

- **What my Transactional Flow spec got right**: The Section 3 ordering held up exactly:
  validate → resolve products & look up prices server-side → reject unknown product ids
  *before* writing → compute `totalPrice` → create the Order with nested `orderItems` in
  one call. Using Prisma's **nested create** (rather than a manual `$transaction([...])`)
  was enough, because a nested create is itself one implicit transaction.

- **What the spec missed that I discovered during implementation**: Nothing major, but
  two practical details: (1) the `price` stored on each `OrderItem` must come from the
  Product table, not the request body — the spec said this but it's easy to miss. (2) The
  response needed a `serializeOrderItem()` helper and a tweak to `serializeOrder()` to emit
  the nested `items` array in snake_case (`order_item_id`, etc.); the model returns Prisma's
  `orderItems`, so the route maps it. I used a typed `BadOrderError` so the route can tell
  "bad input → 400" apart from a real 500.

- **How the transaction error handling works**: `prisma.order.create({ data: { orderItems:
  { create: [...] } } })` runs as a single implicit transaction. If creating the Order or
  *any* one of its OrderItems fails, Prisma rolls back the whole unit — so you never end up
  with an Order that has only some of its items, or an Order with no items. (For
  multi-step logic that can't be one nested write, the equivalent guarantee comes from
  wrapping the steps in the explicit `prisma.$transaction([...])` API.) Because I also
  validate product ids *before* the create, the common bad-input case (nonexistent product)
  is rejected with a 400 and nothing is written at all.

- **What the success and failure tests confirmed**: Success case — a valid order with two
  items returned `201` with the order plus both `items`, and a server-computed
  `total_price` of 61.97 (29.99×2 + 1.99×1). Failure case — an order whose `items` included
  a nonexistent `product_id` returned `400 { "error": "Product <id> does not exist" }`, and
  a follow-up `GET /order-items` confirmed **no partial order or stray items** were
  written. Empty/missing `items` is likewise rejected with `400` before any DB write.

- **One thing I'd design differently if starting over**: I'd type `price`/`totalPrice` as
  `Decimal` instead of `Float` from the start to avoid floating-point rounding on money
  (the spec already flags this). I'd also compute `totalPrice` from the persisted
  OrderItems in the same transaction, so the stored total can never drift from the line
  items even if the creation path changes later.



## Final Spec Reconciliation: Project Complete

> **Status: full system connected and tested.** Frontend (`student-store-ui`, Vite on
> 5173) talks to the backend (`student-store-api`, Express on 3001) over CORS. The
> complete flow — browse products → add to cart → place order → see receipt — was
> exercised end to end against the live `student-store` database.

### One complete user flow: a customer placing an order
1. **Browse** — On mount, `App.jsx` calls `GET /products` and renders the 9 seeded
   products. Each card reads `image_url`, `name`, `price` — exactly the snake_case shape
   the API serializes. ✅ matches contract.
2. **Cart** — Cart is local state `{ [productId]: quantity }`. At checkout it is
   transformed into the contract's `items: [{ product_id: <int>, quantity }]` (product ids
   are `Number()`-coerced, since cart keys are strings). ✅
3. **Order** — `POST /orders` is sent with `{ customer: <int>, customer_email, items }`.
   This matches the **Detailed contract: POST /orders** exactly: no client-supplied
   prices, server computes `total_price`. Verified response: `201` with `order_id`,
   `total_price`, and the nested `items` array. ✅
4. **Receipt** — The response includes everything the frontend needs (`order_id`,
   `items[].quantity/price`, `total_price`). `CheckoutSuccess` renders a
   `purchase.receipt.lines` array, which the spec/API does **not** return — see "gaps"
   below for how this was resolved.

### Full-system audit result
- **All endpoints match the API contract.** `GET /products`, `GET /products/:id`, and
  `POST /orders` (the three the UI uses) line up on path, request body, and response
  field names. The other documented routes (`PUT`/`DELETE /products`, full `/orders`
  CRUD, `/order-items`, `POST /orders/:order_id/items`) exist and were tested earlier.
- **CORS** is enabled (`app.use(cors())` in `server.js`); preflight `OPTIONS /orders`
  returns `204` with `Access-Control-Allow-Origin: *`, so the browser cross-origin call
  from `:5173` → `:3001` succeeds.
- **Edge cases the spec defines, and how the system handles them:**
  - *Empty cart* — the spec says `items` must be non-empty (`400`). The frontend guards
    this **before** sending ("Your cart is empty.") so a request is never made; the
    backend would also reject it. ✅ covered on both sides.
  - *Product not found* — `POST /orders` with a bad `product_id` → backend `400`
    `{ "error": "Product <id> does not exist" }`, no partial order written; the frontend
    surfaces `err.response.data.error` in the error banner. ✅
  - *Failed order / network down* — `GET /products` failure shows "Failed to load
    products. Is the API server running?"; checkout failure shows the server's error
    message. ✅
- **Things the implementation does that the spec didn't document** (now noted here):
  (1) numeric-id guard returning `400 "… must be an integer"` on non-numeric `:id`;
  (2) CORS configuration; (3) the UI-built `purchase.receipt.lines` view model.

### Gaps resolved during frontend integration
- **Frontend had zero working API calls.** axios was imported but unused and
  `handleOnCheckout` was an empty stub. Resolved by wiring `GET /products` (App mount),
  `GET /products/:id` (ProductDetail), and `POST /orders` (checkout) to `API_BASE_URL`
  (`http://localhost:3001`, overridable via `VITE_API_BASE_URL`).
- **`userInfo` shape mismatch.** State was `{ name, dorm_number }` and `PaymentInfo` bound
  the email input to `userInfo.id` (always undefined) while writing to `email`. Fixed the
  bindings to `{ name, email }`, relabeled the field "Email", and mapped at checkout:
  `customer: Number(userInfo.name)`, `customer_email: userInfo.email`. (The form's
  "Student ID" is the integer `customer`, per the contract.)
- **Response-shape mismatch at the receipt.** `CheckoutSuccess` expects
  `order.purchase.receipt.lines`, but the API returns a flat order. Rather than rewrite
  the component, the checkout handler builds the `purchase.receipt.lines` view model from
  the real response (`order_id`, item lines, `total_price`) — the contract stays as the
  source of truth and the UI adapts to it.
- **Float money artifact (cosmetic).** A computed `total_price` can surface as
  `80.94999999999999` (the `Float` rounding the spec already flags). The UI's
  `formatPrice()` rounds to 2 decimals (`$80.95`), so display is correct; the documented
  fix remains "use `Decimal` for currency."

### What the spec enabled during this project
- Having the contract written first made the integration almost mechanical: every
  mismatch was a quick diff between "what the frontend sends/reads" and a documented
  field name, rather than a guessing game. The snake_case-vs-camelCase boundary
  (`image_url`, `total_price`, `order_id`) was decided once in the spec and enforced by
  the serializers, so the frontend and backend never disagreed on field names once wired.