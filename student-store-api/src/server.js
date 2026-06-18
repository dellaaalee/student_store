require('dotenv').config()

const express = require('express')
const cors = require('cors')

const Product = require('./models/product')
const Order = require('./models/order')

const app = express()

app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 3001

// Serialize a Prisma Product (camelCase) into the snake_case shape the
// frontend/API contract expects (image_url instead of imageUrl).
function serializeProduct(product) {
  const { imageUrl, ...rest } = product
  return { ...rest, image_url: imageUrl }
}

// Serialize a Prisma Order (camelCase) into the snake_case shape the API
// contract expects: order_id, customer_email, total_price, created_at.
function serializeOrder(order) {
  const { id, customerEmail, totalPrice, createdAt, ...rest } = order
  return {
    order_id: id,
    ...rest, // customer, status
    customer_email: customerEmail,
    total_price: totalPrice,
    created_at: createdAt,
  }
}

app.get('/', (req, res) => {
  res.send('Welcome to the Student Store API!')
})

// GET /products — list all products
app.get('/products', async (req, res) => {
  try {
    const products = await Product.list()
    res.status(200).json(products.map(serializeProduct))
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products' })
  }
})

// GET /products/:id — fetch one product
app.get('/products/:id', async (req, res) => {
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
})

// POST /products — create a product
app.post('/products', async (req, res) => {
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
})

// PUT /products/:id — update a product
app.put('/products/:id', async (req, res) => {
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
})

// DELETE /products/:id — remove a product
app.delete('/products/:id', async (req, res) => {
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
})

// GET /orders — list all orders (optional ?email= filter, stretch feature)
app.get('/orders', async (req, res) => {
  try {
    const orders = await Order.list(req.query.email)
    res.status(200).json(orders.map(serializeOrder))
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' })
  }
})

// GET /orders/:order_id — fetch one order
// NOTE: the contract says this includes `items`; that will be added once the
// OrderItem model exists. For now it returns the order metadata only.
app.get('/orders/:order_id', async (req, res) => {
  const id = Number(req.params.order_id)
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Order id must be an integer' })
  }

  try {
    const order = await Order.get(id)
    if (!order) {
      return res.status(404).json({ error: 'Order not found' })
    }
    res.status(200).json(serializeOrder(order))
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch order' })
  }
})

// POST /orders — create an order
// NOTE: the full contract creates nested order items in a transaction; that
// arrives with the OrderItem model. For now this creates the order metadata.
app.post('/orders', async (req, res) => {
  const { customer, customer_email, status, total_price } = req.body

  if (customer === undefined || customer === null) {
    return res.status(400).json({ error: 'Missing required field: customer' })
  }

  try {
    const order = await Order.create({
      customer,
      customerEmail: customer_email,
      // status defaults to "pending" in the schema if omitted
      ...(status !== undefined ? { status } : {}),
      // total_price defaults to 0 until item-based totals are computed
      totalPrice: total_price ?? 0,
    })
    res.status(201).json(serializeOrder(order))
  } catch (err) {
    res.status(500).json({ error: 'Failed to create order' })
  }
})

// PUT /orders/:order_id — update an order (e.g. change status)
app.put('/orders/:order_id', async (req, res) => {
  const id = Number(req.params.order_id)
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Order id must be an integer' })
  }

  // Only forward fields that were provided; map snake_case → Prisma camelCase.
  const { customer, customer_email, status, total_price } = req.body
  const data = {}
  if (customer !== undefined) data.customer = customer
  if (customer_email !== undefined) data.customerEmail = customer_email
  if (status !== undefined) data.status = status
  if (total_price !== undefined) data.totalPrice = total_price

  try {
    const order = await Order.update(id, data)
    res.status(200).json(serializeOrder(order))
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Order not found' })
    }
    res.status(500).json({ error: 'Failed to update order' })
  }
})

// DELETE /orders/:order_id — remove an order
app.delete('/orders/:order_id', async (req, res) => {
  const id = Number(req.params.order_id)
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Order id must be an integer' })
  }

  try {
    await Order.remove(id)
    res.status(204).send()
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Order not found' })
    }
    res.status(500).json({ error: 'Failed to delete order' })
  }
})

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
