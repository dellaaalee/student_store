const express = require('express')
const { listOrderItems } = require('../controllers/orderItemController')

const router = express.Router()

// GET /order-items — list all order items (stretch)
router.get('/', listOrderItems)

module.exports = router
