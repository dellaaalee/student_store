const prisma = require('../db/db')

/**
 * Error thrown when a POST /orders request references a product that does not
 * exist. The route layer catches this and returns a 400 (see Section 3 of
 * planning.md — bad product ids are rejected before any rows are written).
 */
class BadOrderError extends Error {
  constructor(message) {
    super(message)
    this.name = 'BadOrderError'
  }
}

/**
 * Order model — wraps Prisma Client operations for the Order table.
 *
 * Prisma fields are camelCase (e.g. `totalPrice`, `customerEmail`), but the
 * API/frontend use snake_case (`total_price`, `customer_email`). Serialization
 * between the two shapes is handled in the route layer (server.js), so this
 * class deals purely in Prisma fields.
 */
class Order {
  // Fetch all orders. Optionally filter by customer email (stretch feature).
  static async list(email) {
    const where = email ? { customerEmail: email } : undefined
    return prisma.order.findMany({ where, orderBy: { id: 'asc' } })
  }

  // Fetch a single order by id, including its associated order items.
  // Returns null if not found.
  static async get(id) {
    return prisma.order.findUnique({
      where: { id },
      include: { orderItems: true },
    })
  }

  /**
   * Create an order together with its line items, atomically.
   *
   * `input` is the parsed request body (snake_case): { customer, customerEmail,
   * status, items: [{ product_id, quantity }] }. Implements the transactional
   * flow from planning.md Section 3:
   *   1. validate items is a non-empty array
   *   2. look up referenced products; reject unknown product ids (BadOrderError)
   *   3. compute totalPrice server-side from each product's unit price
   *   4. create the order + nested order items in one (implicit) transaction
   *   5. return the order with its items included
   */
  static async createWithItems({ customer, customerEmail, status, items }) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new BadOrderError('items must be a non-empty array')
    }

    // Resolve products and verify each referenced product exists.
    const productIds = items.map((i) => i.product_id)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    })
    const priceByProductId = {}
    for (const p of products) priceByProductId[p.id] = p.price

    for (const id of productIds) {
      if (priceByProductId[id] === undefined) {
        throw new BadOrderError(`Product ${id} does not exist`)
      }
    }

    // Compute the total from server-side prices × quantities.
    const totalPrice = items.reduce(
      (sum, i) => sum + priceByProductId[i.product_id] * i.quantity,
      0
    )

    // Nested create runs in an implicit transaction — all or nothing.
    return prisma.order.create({
      data: {
        customer,
        customerEmail,
        ...(status !== undefined ? { status } : {}),
        totalPrice,
        orderItems: {
          create: items.map((i) => ({
            productId: i.product_id,
            quantity: i.quantity,
            price: priceByProductId[i.product_id],
          })),
        },
      },
      include: { orderItems: true },
    })
  }

  // Update an existing order (e.g. change status). Throws Prisma P2025 if missing.
  static async update(id, data) {
    return prisma.order.update({ where: { id }, data })
  }

  // Delete an order. Cascade removes its order items. Throws P2025 if missing.
  static async remove(id) {
    return prisma.order.delete({ where: { id } })
  }
}

module.exports = Order
module.exports.BadOrderError = BadOrderError
