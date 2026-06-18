/**
 * Serializers — convert Prisma records (camelCase fields) into the snake_case
 * shapes the frontend/API contract expects (image_url, total_price, order_id, …).
 */

// Product → API shape: imageUrl becomes image_url.
function serializeProduct(product) {
  const { imageUrl, ...rest } = product
  return { ...rest, image_url: imageUrl }
}

// OrderItem → API shape.
function serializeOrderItem(item) {
  return {
    order_item_id: item.id,
    order_id: item.orderId,
    product_id: item.productId,
    quantity: item.quantity,
    price: item.price,
  }
}

// Order → API shape: order_id, customer_email, total_price, created_at. When the
// order was fetched/created with its `orderItems`, they are serialized as `items`.
function serializeOrder(order) {
  const { id, customerEmail, totalPrice, createdAt, orderItems, ...rest } = order
  const serialized = {
    order_id: id,
    ...rest, // customer, status
    customer_email: customerEmail,
    total_price: totalPrice,
    created_at: createdAt,
  }
  if (orderItems !== undefined) {
    serialized.items = orderItems.map(serializeOrderItem)
  }
  return serialized
}

module.exports = { serializeProduct, serializeOrderItem, serializeOrder }
