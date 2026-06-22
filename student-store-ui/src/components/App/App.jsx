import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import SubNavbar from "../SubNavbar/SubNavbar";
import Sidebar from "../Sidebar/Sidebar";
import Home from "../Home/Home";
import ProductDetail from "../ProductDetail/ProductDetail";
import PastOrders from "../PastOrders/PastOrders";
import OrderDetail from "../OrderDetail/OrderDetail";
import NotFound from "../NotFound/NotFound";
import { removeFromCart, addToCart, getQuantityOfItemInCart, getTotalItemsInCart } from "../../utils/cart";
import { calculateTaxesAndFees, calculateTotal } from "../../utils/calculations";
import { formatPrice } from "../../utils/format";
import { API_BASE_URL } from "../../constants";
import "./App.css";

function App() {

  // State variables
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All Categories");
  const [searchInputValue, setSearchInputValue] = useState("");
  const [userInfo, setUserInfo] = useState({ name: "", email: "" });
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState({});
  const [isFetching, setIsFetching] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [error, setError] = useState(null);
  const [order, setOrder] = useState(null);

  // Fetch the product catalog from the backend on first render.
  useEffect(() => {
    const fetchProducts = async () => {
      setIsFetching(true);
      setError(null);
      try {
        const { data } = await axios.get(`${API_BASE_URL}/products`);
        setProducts(data);
      } catch (err) {
        setError("Failed to load products. Is the API server running?");
      } finally {
        setIsFetching(false);
      }
    };
    fetchProducts();
  }, []);

  // Toggles the cart drawer. When closing it, clear the entered payment info
  // and dismiss any completed-order receipt so the next open shows the cart
  // + payment form rather than a stale receipt.
  const toggleSidebar = () =>
    setSidebarOpen((isOpen) => {
      if (isOpen) {
        setUserInfo({ name: "", email: "" });
        setOrder(null);
      }
      return !isOpen;
    });

  // Functions to change state (used for lifting state)
  const handleOnRemoveFromCart = (item) => setCart(removeFromCart(cart, item));
  const handleOnAddToCart = (item) => setCart(addToCart(cart, item));
  const handleGetItemQuantity = (item) => getQuantityOfItemInCart(cart, item);
  const handleGetTotalCartItems = () => getTotalItemsInCart(cart);

  const handleOnSearchInputChange = (event) => {
    setSearchInputValue(event.target.value);
  };

  const handleOnCheckout = async () => {
    // Don't attempt an order with an empty cart (spec: items must be non-empty).
    const productIds = Object.keys(cart);
    if (!productIds.length) {
      setError("Your cart is empty.");
      return;
    }

    // Validate Student ID: must be a whole, positive number (the contract's
    // integer `customer` field).
    const studentId = userInfo.name.trim();
    if (!/^\d+$/.test(studentId)) {
      setError("Student ID must be a number.");
      return;
    }

    // Validate email format.
    const email = userInfo.email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsCheckingOut(true);
    setError(null);

    // Transform the cart ({ [productId]: quantity }) into the contract's items
    // array. product_id must be an integer; the server looks up unit prices.
    const items = productIds.map((id) => ({
      product_id: Number(id),
      quantity: cart[id],
    }));

    try {
      const { data } = await axios.post(`${API_BASE_URL}/orders`, {
        // `customer` is an integer id per the contract; carried by the Student
        // ID field (validated above to be numeric).
        customer: Number(studentId),
        customer_email: email,
        items,
      });

      // The API returns a flat order ({ order_id, total_price, items: [...] }).
      // Build the receipt-lines shape the CheckoutSuccess component renders.
      const productMapping = products.reduce((acc, p) => {
        acc[p.id] = p;
        return acc;
      }, {});
      const lines = [
        `Order #${data.order_id} confirmed — thank you!`,
        ...data.items.map((item) => {
          const name = productMapping[item.product_id]?.name || `Product ${item.product_id}`;
          return `${item.quantity} x ${name} @ ${formatPrice(item.price)}`;
        }),
        `Total: ${formatPrice(data.total_price)}`,
      ];

      setOrder({ ...data, purchase: { receipt: { lines } } });
      setCart({});
    } catch (err) {
      setError(err?.response?.data?.error || "Checkout failed. Please try again.");
    } finally {
      setIsCheckingOut(false);
    }
  };


  return (
    <div className="App">
      <BrowserRouter>
        <main>
          <SubNavbar
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
            searchInputValue={searchInputValue}
            handleOnSearchInputChange={handleOnSearchInputChange}
            toggleSidebar={toggleSidebar}
            getTotalItemsInCart={handleGetTotalCartItems}
          />
          <Routes>
            <Route
              path="/"
              element={
                <Home
                  error={error}
                  products={products}
                  isFetching={isFetching}
                  activeCategory={activeCategory}
                  setActiveCategory={setActiveCategory}
                  addToCart={handleOnAddToCart}
                  searchInputValue={searchInputValue}
                  removeFromCart={handleOnRemoveFromCart}
                  getQuantityOfItemInCart={handleGetItemQuantity}
                />
              }
            />
            <Route path="/orders" element={<PastOrders />} />
            <Route
              path="/orders/:orderId"
              element={<OrderDetail products={products} />}
            />
            <Route
              path="/:productId"
              element={
                <ProductDetail
                  cart={cart}
                  error={error}
                  products={products}
                  addToCart={handleOnAddToCart}
                  removeFromCart={handleOnRemoveFromCart}
                  getQuantityOfItemInCart={handleGetItemQuantity}
                />
              }
            />
            <Route
              path="*"
              element={
                <NotFound
                  error={error}
                  products={products}
                  activeCategory={activeCategory}
                  setActiveCategory={setActiveCategory}
                />
              }
            />
          </Routes>
        </main>

        {/* Dimmed backdrop — clicking it closes the cart drawer. */}
        <div
          className={`cart-overlay ${sidebarOpen ? "open" : ""}`}
          onClick={toggleSidebar}
        />

        {/* Cart drawer — slides in from the right. */}
        <Sidebar
          cart={cart}
          error={error}
          userInfo={userInfo}
          setUserInfo={setUserInfo}
          isOpen={sidebarOpen}
          products={products}
          toggleSidebar={toggleSidebar}
          isCheckingOut={isCheckingOut}
          addToCart={handleOnAddToCart}
          removeFromCart={handleOnRemoveFromCart}
          getQuantityOfItemInCart={handleGetItemQuantity}
          getTotalItemsInCart={handleGetTotalCartItems}
          handleOnCheckout={handleOnCheckout}
          order={order}
          setOrder={setOrder}
        />
      </BrowserRouter>
    </div>
  );
}

export default App;
 