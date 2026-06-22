import ProductCard from "../ProductCard/ProductCard"
import "./ProductGrid.css"

function ProductGrid({ addToCart, removeFromCart, getQuantityOfItemInCart, products = [], activeCategory, searchInputValue }) {

  return (
    <div id="Buy" className="ProductGrid">
      <div className="content">
        {/* Keying the grid on the active filter remounts the cards so their
            entrance animation replays each time the user switches tabs. */}
        <div className="grid" key={`${activeCategory}-${searchInputValue}`}>

          {!products?.length ? (
            <div className="card">
              <p>No products available</p>
            </div>
          ) : products.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              index={index}
              quantity={getQuantityOfItemInCart(product)}
              addToCart={() => addToCart(product)}
              removeFromCart={() => removeFromCart(product)}
            />
          ))}

        </div>
      </div>
    </div>
  )

}

export default ProductGrid;