const prisma = require('../db/db')

/**
 * Product model — wraps Prisma Client CRUD operations for the Product table.
 *
 * Prisma fields are camelCase (e.g. `imageUrl`), but the API/frontend use
 * snake_case (`image_url`). Serialization between the two shapes is handled in
 * the route layer (server.js), so this class deals purely in Prisma fields.
 */
class Product {
  // Fetch all products.
  static async list() {
    return prisma.product.findMany({ orderBy: { id: 'asc' } })
  }

  // Fetch a single product by id. Returns null if not found.
  static async get(id) {
    return prisma.product.findUnique({ where: { id } })
  }

  // Create a new product. `data` uses Prisma field names (imageUrl, not image_url).
  static async create(data) {
    return prisma.product.create({ data })
  }

  // Update an existing product. Throws Prisma P2025 if the id does not exist.
  static async update(id, data) {
    return prisma.product.update({ where: { id }, data })
  }

  // Delete a product. Throws Prisma P2025 if the id does not exist.
  static async remove(id) {
    return prisma.product.delete({ where: { id } })
  }
}

module.exports = Product
