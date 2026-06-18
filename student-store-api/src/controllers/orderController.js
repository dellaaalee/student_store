const Order = require('../models/order')
const { BadOrderError } = require('../models/order')
const { serializeOrder } = require('../utils/serializers')

/**
 * Order controllers — request/response handling for the order endpoints.
 * Data access (including the transactional create) lives in the Order model.
 */

// GET /orders — list all orders (optional ?email= filter, stretch feature)
async function listOrders(req, res) {
  try {
    const orders = await Order.list(req.query.email)
    res.status(200).json(orders.map(serializeOrder))
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' })
  }
}

// GET /orders/:order_id — fetch one order, including its items
async function getOrder(req, res) {
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
}

// POST /orders — create an order with its line items, atomically (Section 3)
async function createOrder(req, res) {
  const { customer, customer_email, status, items } = req.body

  if (customer === undefined || customer === null) {
    return res.status(400).json({ error: 'Missing required field: customer' })
  }

  try {
    const order = await Order.createWithItems({
      customer,
      customerEmail: customer_email,
      status, // optional; defaults to "pending" in the schema
      items,
    })
    res.status(201).json(serializeOrder(order))
  } catch (err) {
    // Bad request: empty items or a nonexistent product id (no rows written).
    if (err instanceof BadOrderError) {
      return res.status(400).json({ error: err.message })
    }
    res.status(500).json({ error: 'Failed to create order' })
  }
}

// PUT /orders/:order_id — update an order (e.g. change status)
async function updateOrder(req, res) {
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
}

// DELETE /orders/:order_id — remove an order (cascades to its items)
async function deleteOrder(req, res) {
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
}

module.exports = {
  listOrders,
  getOrder,
  createOrder,
  updateOrder,
  deleteOrder,
}
