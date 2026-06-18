const prisma = require('../db/db')

/**
 * OrderItem model — wraps Prisma Client operations for the OrderItem table.
 *
 * An OrderItem always belongs to one Order and references one Product. The
 * `price` stored here is the unit price captured at time of purchase, so
 * historical orders keep their price even if the product's price later changes.
 *
 * Prisma fields are camelCase (`orderId`, `productId`); the API uses snake_case
 * (`order_id`, `product_id`). Serialization is handled in the route layer.
 */
class OrderItem {
  // Fetch all order items (supports the GET /order-items stretch endpoint).
  static async list() {
    return prisma.orderItem.findMany({ orderBy: { id: 'asc' } })
  }

  // Fetch all order items belonging to a single order.
  static async listByOrder(orderId) {
    return prisma.orderItem.findMany({
      where: { orderId },
      orderBy: { id: 'asc' },
    })
  }

  // Create a single order item. `data` uses Prisma field names
  // (orderId, productId, quantity, price).
  static async create(data) {
    return prisma.orderItem.create({ data })
  }
}

module.exports = OrderItem
