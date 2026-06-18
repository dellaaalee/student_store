const prisma = require('../db/db')

/**
 * Order model — wraps Prisma Client CRUD operations for the Order table.
 *
 * Prisma fields are camelCase (e.g. `totalPrice`, `customerEmail`), but the
 * API/frontend use snake_case (`total_price`, `customer_email`). Serialization
 * between the two shapes is handled in the route layer (server.js), so this
 * class deals purely in Prisma fields.
 *
 * NOTE: the OrderItem model is not implemented yet, so order items are not
 * included/created here. The POST /orders contract (with nested items) and
 * GET /orders/:id "with items" will be completed once OrderItem exists.
 */
class Order {
  // Fetch all orders. Optionally filter by customer email (stretch feature).
  static async list(email) {
    const where = email ? { customerEmail: email } : undefined
    return prisma.order.findMany({ where, orderBy: { id: 'asc' } })
  }

  // Fetch a single order by id. Returns null if not found.
  static async get(id) {
    return prisma.order.findUnique({ where: { id } })
  }

  // Create a new order. `data` uses Prisma field names (totalPrice, customerEmail).
  static async create(data) {
    return prisma.order.create({ data })
  }

  // Update an existing order (e.g. change status). Throws Prisma P2025 if missing.
  static async update(id, data) {
    return prisma.order.update({ where: { id }, data })
  }

  // Delete an order. Throws Prisma P2025 if the id does not exist.
  static async remove(id) {
    return prisma.order.delete({ where: { id } })
  }
}

module.exports = Order
