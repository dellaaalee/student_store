const Product = require('../models/product')
const { serializeProduct } = require('../utils/serializers')

/**
 * Product controllers — request/response handling for the product endpoints.
 * Data access lives in the Product model; serialization in utils/serializers.
 */

// GET /products — list all products
async function listProducts(req, res) {
  try {
    const products = await Product.list()
    res.status(200).json(products.map(serializeProduct))
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products' })
  }
}

// GET /products/:id — fetch one product
async function getProduct(req, res) {
  const id = Number(req.params.id)
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Product id must be an integer' })
  }

  try {
    const product = await Product.get(id)
    if (!product) {
      return res.status(404).json({ error: 'Product not found' })
    }
    res.status(200).json(serializeProduct(product))
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch product' })
  }
}

// POST /products — create a product
async function createProduct(req, res) {
  const { name, description, price, image_url, category } = req.body

  // Validate required fields (all Product fields are required per the spec).
  const required = { name, description, price, image_url, category }
  for (const [field, value] of Object.entries(required)) {
    if (value === undefined || value === null || value === '') {
      return res.status(400).json({ error: `Missing required field: ${field}` })
    }
  }

  try {
    const product = await Product.create({
      name,
      description,
      price,
      imageUrl: image_url,
      category,
    })
    res.status(201).json(serializeProduct(product))
  } catch (err) {
    res.status(500).json({ error: 'Failed to create product' })
  }
}

// PUT /products/:id — update a product
async function updateProduct(req, res) {
  const id = Number(req.params.id)
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Product id must be an integer' })
  }

  // Only forward fields that were provided; map image_url → imageUrl.
  const { name, description, price, image_url, category } = req.body
  const data = {}
  if (name !== undefined) data.name = name
  if (description !== undefined) data.description = description
  if (price !== undefined) data.price = price
  if (image_url !== undefined) data.imageUrl = image_url
  if (category !== undefined) data.category = category

  try {
    const product = await Product.update(id, data)
    res.status(200).json(serializeProduct(product))
  } catch (err) {
    // Prisma throws P2025 when the record to update does not exist.
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Product not found' })
    }
    res.status(500).json({ error: 'Failed to update product' })
  }
}

// DELETE /products/:id — remove a product
async function deleteProduct(req, res) {
  const id = Number(req.params.id)
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Product id must be an integer' })
  }

  try {
    await Product.remove(id)
    res.status(204).send()
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Product not found' })
    }
    res.status(500).json({ error: 'Failed to delete product' })
  }
}

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
}
