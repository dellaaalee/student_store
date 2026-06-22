import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { formatPrice, formatDate } from "../../utils/format";
import { API_BASE_URL } from "../../constants";
import "./OrderDetail.css";

function OrderDetail({ products = [] }) {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState(null);

  // Map product id -> name so we can label each line item.
  const productNameById = products.reduce((acc, p) => {
    acc[p.id] = p.name;
    return acc;
  }, {});

  useEffect(() => {
    let active = true;
    const fetchOrder = async () => {
      setIsFetching(true);
      setError(null);
      try {
        const { data } = await axios.get(`${API_BASE_URL}/orders/${orderId}`);
        if (active) setOrder(data);
      } catch (err) {
        if (active) setError("Order not found.");
      } finally {
        if (active) setIsFetching(false);
      }
    };
    fetchOrder();
    return () => {
      active = false;
    };
  }, [orderId]);

  if (isFetching) {
    return (
      <div className="OrderDetail">
        <div className="od-content"><p className="od-message">Loading order…</p></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="OrderDetail">
        <div className="od-content">
          <Link to="/orders" className="od-back">← Back to orders</Link>
          <p className="od-message">{error || "Order not found."}</p>
        </div>
      </div>
    );
  }

  const items = order.items || [];

  return (
    <div className="OrderDetail">
      <div className="od-content">
        <Link to="/orders" className="od-back">← Back to orders</Link>

        <div className="od-header">
          <h2>Order #{order.order_id}</h2>
          <span className={`od-status ${order.status}`}>{order.status}</span>
        </div>
        <div className="od-meta">
          <span>{formatDate(order.created_at)}</span>
          {order.customer_email && <span>{order.customer_email}</span>}
        </div>

        <div className="od-card">
          <div className="od-row od-head">
            <span className="flex-2">Item</span>
            <span className="center">Qty</span>
            <span className="center">Unit price</span>
            <span className="right">Cost</span>
          </div>

          {items.map((item) => (
            <div key={item.order_item_id} className="od-row od-item">
              <span className="flex-2">
                {productNameById[item.product_id] || `Product #${item.product_id}`}
              </span>
              <span className="center">{item.quantity}</span>
              <span className="center">{formatPrice(item.price)}</span>
              <span className="right">{formatPrice(item.price * item.quantity)}</span>
            </div>
          ))}

          <div className="od-row od-total">
            <span className="flex-2">Total</span>
            <span className="center" />
            <span className="center" />
            <span className="right">{formatPrice(order.total_price)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrderDetail;
