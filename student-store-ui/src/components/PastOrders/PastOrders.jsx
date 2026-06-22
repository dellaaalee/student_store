import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { formatPrice, formatDate } from "../../utils/format";
import { API_BASE_URL } from "../../constants";
import "./PastOrders.css";

function PastOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState(null);

  const [emailInput, setEmailInput] = useState("");
  const [activeEmail, setActiveEmail] = useState(""); // the email currently filtering

  // Fetch orders, optionally filtered by email via the ?email= query param.
  const fetchOrders = async (email) => {
    setIsFetching(true);
    setError(null);
    try {
      const url = email
        ? `${API_BASE_URL}/orders?email=${encodeURIComponent(email)}`
        : `${API_BASE_URL}/orders`;
      const { data } = await axios.get(url);
      setOrders(data);
    } catch (err) {
      setError("Failed to load orders. Is the API server running?");
      setOrders([]);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleFilter = (e) => {
    e.preventDefault();
    const email = emailInput.trim();
    if (!email) return;
    setActiveEmail(email);
    fetchOrders(email);
  };

  const handleClearFilter = () => {
    setEmailInput("");
    setActiveEmail("");
    fetchOrders();
  };

  return (
    <div className="PastOrders">
      <div className="po-content">
        <h2 className="po-title">Past Orders</h2>

        <form className="po-filter" onSubmit={handleFilter}>
          <input
            type="email"
            placeholder="Filter by email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
          />
          <button type="submit" className="po-filter-btn">Filter</button>
          {activeEmail && (
            <button type="button" className="po-clear-btn" onClick={handleClearFilter}>
              Show all
            </button>
          )}
        </form>

        {activeEmail && (
          <p className="po-active-filter">
            Showing orders for <strong>{activeEmail}</strong>
          </p>
        )}

        {isFetching ? (
          <p className="po-message">Loading orders…</p>
        ) : error ? (
          <p className="po-message">{error}</p>
        ) : orders.length === 0 ? (
          <p className="po-message">No orders found.</p>
        ) : (
          <div className="po-table">
            <div className="po-row po-head">
              <span>Order ID</span>
              <span>Date</span>
              <span>Total</span>
              <span>Status</span>
            </div>
            {orders.map((order) => (
              <div
                key={order.order_id}
                className="po-row po-order"
                onClick={() => navigate(`/orders/${order.order_id}`)}
              >
                <span className="po-id">#{order.order_id}</span>
                <span>{formatDate(order.created_at)}</span>
                <span>{formatPrice(order.total_price)}</span>
                <span className={`po-status ${order.status}`}>{order.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default PastOrders;
