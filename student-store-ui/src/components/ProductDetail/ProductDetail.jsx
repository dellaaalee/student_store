import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import NotFound from "../NotFound/NotFound";
import { formatPrice } from "../../utils/format";
import { API_BASE_URL } from "../../constants";
import "./ProductDetail.css";

function ProductDetail({ products = [], addToCart, removeFromCart, getQuantityOfItemInCart }) {

  const { productId } = useParams();

  // Seed from the already-loaded catalog so the page renders instantly with no
  // "Loading..." flash when navigating from the grid. Falls back to a fetch
  // only if the product isn't already in the list (e.g. direct URL visit).
  const preloaded = products.find((p) => String(p.id) === String(productId));
  const [product, setProduct] = useState(preloaded || null);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Already have it from the catalog — nothing to fetch.
    const fromList = products.find((p) => String(p.id) === String(productId));
    if (fromList) {
      setProduct(fromList);
      setError(false);
      return;
    }
    // Otherwise fetch the single product (direct link / refresh).
    let active = true;
    const fetchProduct = async () => {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/products/${productId}`);
        if (active) setProduct(data);
      } catch (err) {
        if (active) setError(true);
      }
    };
    fetchProduct();
    return () => {
      active = false;
    };
  }, [productId, products]);

  if (error) {
    return <NotFound />;
  }

  if (!product) {
    return (
      <div className="ProductDetail">
        <Link to="/" className="back-link">← Back to shop</Link>
        <div className="product-card loading">
          <div className="media skeleton" />
          <div className="product-info">
            <div className="skeleton-line lg" />
            <div className="skeleton-line md" />
            <div className="skeleton-line" />
          </div>
        </div>
      </div>
    );
  }

  const quantity = getQuantityOfItemInCart(product);

  const handleAddToCart = () => {
    if (product.id) {
      addToCart(product)
    }
  };

  const handleRemoveFromCart = () => {
    if (product.id) {
      removeFromCart(product);
    }
  };

  return (
    <div className="ProductDetail">
      <Link to="/" className="back-link">← Back to shop</Link>
      <div className="product-card">
        <div className="media">
          <img src={product.image_url || "/placeholder.png"} alt={product.name} />
        </div>
        <div className="product-info">
          <p className="product-name">{product.name}</p>
          <p className="product-price">{formatPrice(product.price)}</p>
          <p className="description">{product.description}</p>
          <div className="actions">
            <button onClick={handleAddToCart}>Add to Cart</button>
            {quantity > 0 && <button onClick={handleRemoveFromCart}>Remove from Cart</button>}
            {quantity > 0 && <span className="quantity">Quantity: {quantity}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}


export default ProductDetail;
