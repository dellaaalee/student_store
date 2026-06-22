import "./CheckoutSuccess.css"

const CheckoutSuccess = ({ order, setOrder, toggleSidebar }) => {
  const handleOnClose = () => {
    setOrder(null)
    // Close the sidebar so the product catalog is clickable again. The sidebar
    // is a fixed full-height overlay, so leaving it open blocks the page.
    toggleSidebar()
  }

  const renderReceipt = () => (
    <>
      <p className="header">{order.purchase.receipt.lines[0]}</p>
      <ul className="purchase">
        {order.purchase.receipt.lines.slice(1).map((line, idx) => (Boolean(line) ? <li key={idx}>{line}</li> : null))}
      </ul>
    </>
  )

  return (
    <div className="CheckoutSuccess">
      <h3>Checkout Info</h3>
      {order?.purchase ? (
        <div className="card">
          <header className="card-head">
            <h4 className="card-title">Receipt</h4>
          </header>
          <section className="card-body">{order?.purchase?.receipt ? renderReceipt() : "Success!"}</section>
          <footer className="card-foot">
            <button className="button is-success" onClick={handleOnClose}>
              Shop More
            </button>
            <button className="button" onClick={handleOnClose}>
              Exit
            </button>
          </footer>
        </div>
      ) : (
        <div className="content">
          <p>
            A confirmation email will be sent to you so that you can confirm this order. Once you have confirmed the
            order, it will be delivered to your dorm room.
          </p>
        </div>
      )}
    </div>
  )
}

export default CheckoutSuccess
