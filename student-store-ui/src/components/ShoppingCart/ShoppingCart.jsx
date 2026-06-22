import PaymentInfo from "../PaymentInfo/PaymentInfo";
import CheckoutSuccess from "../CheckoutSuccess/CheckoutSuccess";
import { calculateTaxesAndFees, calculateTotal } from "../../utils/calculations";
import { formatPrice } from "../../utils/format";
import codepath from "../../assets/codepath.svg";
import "./ShoppingCart.css";


const CartSummary = ({ products, cart }) => {
  const productMapping = products.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});

  const productRows = Object.keys(cart).map((productId) => {
    const product = productMapping[productId];
    if (!product) return null;
    return {
      ...product,
      quantity: cart[productId],
      totalPrice: cart[productId] * product.price,
    };
  }).filter(Boolean);

  const subTotal = productRows.reduce((acc, p) => acc + p.totalPrice, 0);

  return (
    <div className="CartSummary">
      <div className="summary-head">
        <span className="summary-title">Order summary</span>
        <span className="summary-amount">{formatPrice(calculateTotal(subTotal))}</span>
      </div>

      <div className="line-items">
        {productRows.map((product) => (
          <div key={product.id} className="line-item">
            <div className="thumb">
              <img src={product.image_url || codepath} alt={product.name} />
              <span className="thumb-qty">{product.quantity}</span>
            </div>
            <div className="line-info">
              <span className="line-name">{product.name}</span>
              <span className="line-category">{product.category}</span>
            </div>
            <span className="line-price">{formatPrice(product.totalPrice)}</span>
          </div>
        ))}
      </div>

      <div className="totals">
        <div className="total-row">
          <span>Subtotal</span>
          <span>{formatPrice(subTotal)}</span>
        </div>
        <div className="total-row">
          <span>Shipping</span>
          <span>FREE</span>
        </div>
        <div className="total-row">
          <span>Estimated taxes</span>
          <span>{formatPrice(calculateTaxesAndFees(subTotal))}</span>
        </div>
        <div className="total-row grand">
          <span>Total</span>
          <span>{formatPrice(calculateTotal(subTotal))}</span>
        </div>
      </div>
    </div>
  );
};

export default function ShoppingCart({
  isOpen,
  products,
  cart,
  toggleSidebar,
  userInfo,
  setUserInfo,
  handleOnCheckout,
  isCheckingOut,
  order,
  setOrder,
  error,
}) {
  const hasItems = Object.keys(cart).length > 0;

  if (!isOpen) return null;

  return (
    <div className="ShoppingCart">
      <div className="open">
        {/* After a successful order, only the receipt is shown. */}
        {order?.purchase ? (
          <CheckoutSuccess
            userInfo={userInfo}
            setUserInfo={setUserInfo}
            order={order}
            setOrder={setOrder}
            toggleSidebar={toggleSidebar}
          />
        ) : !hasItems ? (
          <div className="notification">No items added to cart yet. Start shopping now!</div>
        ) : (
          <>
            <CartSummary products={products} cart={cart} />
            <PaymentInfo
              userInfo={userInfo}
              setUserInfo={setUserInfo}
              handleOnCheckout={handleOnCheckout}
              isCheckingOut={isCheckingOut}
              error={error}
            />
          </>
        )}
      </div>
    </div>
  );
}
