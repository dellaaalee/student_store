import ShoppingCart from "../ShoppingCart/ShoppingCart"
import "./Sidebar.css"


function Sidebar({ cart, isOpen, products, userInfo, setUserInfo, toggleSidebar, handleOnCheckout, isCheckingOut, order, setOrder, error }) {
  return (
    <aside className={`Sidebar ${isOpen ? "open" : "closed"}`}>
      <div className="wrapper">

        <div className="drawer-head">
          <h3>Your Cart</h3>
          <span className="close-button" onClick={toggleSidebar}>
            <i className="material-icons">close</i>
          </span>
        </div>

        <ShoppingCart
          isOpen={isOpen}
          cart={cart}
          products={products}
          toggleSidebar={toggleSidebar}
          userInfo={userInfo}
          setUserInfo={setUserInfo}
          handleOnCheckout={handleOnCheckout}
          isCheckingOut={isCheckingOut}
          error={error}
          order={order}
          setOrder={setOrder}
        />

      </div>
    </aside>
  )
}

export default Sidebar;
