const OrderItem = require('../models/orderItem')
const Order = require('../models/order')
const Product = require('../models/product')
const { serializeOrderItem } = require('../utils/serializers')

/**
 * Order item controllers — the stretch endpoints for working with order items
 * directly (list all; add an item to an existing order).
 */

// GET /order-items — list all order items
async function listOrderItems(req, res) {
  try {
    const items = await OrderItem.list()
    res.status(200).json(items.map(serializeOrderItem))
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch order items' })
  }
}

// POST /orders/:order_id/items — add a new item to an existing order
async function addItemToOrder(req, res) {
  const orderId = Number(req.params.order_id)
  if (!Number.isInteger(orderId)) {
    return res.status(400).json({ error: 'Order id must be an integer' })
  }

  const { product_id, quantity } = req.body
  if (product_id === undefined || quantity === undefined) {
    return res.status(400).json({ error: 'Missing required field: product_id and quantity' })
  }

  try {
    // The order must exist.
    const order = await Order.get(orderId)
    if (!order) {
      return res.status(404).json({ error: 'Order not found' })
    }

    // The product must exist; capture its current price for the line item.
    const product = await Product.get(product_id)
    if (!product) {
      return res.status(400).json({ error: `Product ${product_id} does not exist` })
    }

    const item = await OrderItem.create({
      orderId,
      productId: product_id,
      quantity,
      price: product.price,
    })
    res.status(201).json(serializeOrderItem(item))
  } catch (err) {
    res.status(500).json({ error: 'Failed to add order item' })
  }
}

module.exports = { listOrderItems, addItemToOrder }
