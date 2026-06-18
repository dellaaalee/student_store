const express = require('express')
const {
  listOrders,
  getOrder,
  createOrder,
  updateOrder,
  deleteOrder,
} = require('../controllers/orderController')
const { addItemToOrder } = require('../controllers/orderItemController')

const router = express.Router()

router.get('/', listOrders)
router.get('/:order_id', getOrder)
router.post('/', createOrder)
router.put('/:order_id', updateOrder)
router.delete('/:order_id', deleteOrder)

// Stretch: add a line item to an existing order
router.post('/:order_id/items', addItemToOrder)

module.exports = router
