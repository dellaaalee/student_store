import { useState, useEffect, useRef } from "react"
import { Link, useNavigate } from "react-router-dom"
import logo from "../../assets/codepath.svg"
import "./SubNavbar.css"

function SubNavbar({
  activeCategory,
  setActiveCategory,
  searchInputValue,
  handleOnSearchInputChange,
  toggleSidebar,
  getTotalItemsInCart,
}) {

  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const searchRef = useRef(null);

  const categories = ["All Categories", "Accessories", "Apparel", "Books", "Snacks", "Supplies"];

  // Close the search bar when clicking anywhere outside of it.
  useEffect(() => {
    if (!searchOpen) return;
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchOpen]);

  // Selecting a category filters the catalog. Navigate home first so it works
  // even from a product detail page (which has no product grid to filter).
  const handleSelectCategory = (cat) => {
    setActiveCategory(cat);
    setMenuOpen(false); // collapse the mobile menu after picking a category
    navigate("/");
  };

  // Searching should also bring the user back to the catalog to see results.
  const handleSearchChange = (event) => {
    handleOnSearchInputChange(event);
    navigate("/");
  };

  const totalItems = getTotalItemsInCart ? getTotalItemsInCart() : 0;

  return (
    <nav className="SubNavbar">
      <div className="content">

        <Link to="/" className="brand">
          <img src={logo} alt="CodePath" />
        </Link>

        {/* Hamburger — only visible on mobile; toggles the category menu. */}
        <button
          className="menu-toggle"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label="Toggle categories"
        >
          <i className="material-icons">{menuOpen ? "close" : "menu"}</i>
        </button>

        <ul className={`category-menu ${menuOpen ? "open" : ""}`}>
          {categories.map((cat) => (
            <li className={activeCategory === cat ? "is-active" : ""} key={cat}>
              <button onClick={() => handleSelectCategory(cat)}>{cat}</button>
            </li>
          ))}
        </ul>

        <div className="nav-actions">
          <div className={`search-bar ${searchOpen ? "open" : ""}`} ref={searchRef}>
            <input
              type="text"
              name="search"
              placeholder="Search products"
              value={searchInputValue}
              onChange={handleSearchChange}
            />
            <i
              className="material-icons search-toggle"
              onClick={() => setSearchOpen((open) => !open)}
            >
              search
            </i>
          </div>

          <Link to="/orders" className="history-button" aria-label="Past orders">
            <i className="material-icons">history</i>
          </Link>

          <button className="cart-button" onClick={toggleSidebar} aria-label="Open cart">
            <i className="material-icons">shopping_cart</i>
            {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
          </button>
        </div>

      </div>
    </nav>
  )
}

export default SubNavbar;
