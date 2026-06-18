import { useNavigate } from "react-router-dom"
import "./SubNavbar.css"

function SubNavbar({ activeCategory, setActiveCategory, searchInputValue, handleOnSearchInputChange }) {

  const navigate = useNavigate();

  const categories = ["All Categories", "Accessories", "Apparel", "Books", "Snacks", "Supplies"];

  // Selecting a category filters the catalog. Navigate home first so it works
  // even from a product detail page (which has no product grid to filter).
  const handleSelectCategory = (cat) => {
    setActiveCategory(cat);
    navigate("/");
  };

  // Searching should also bring the user back to the catalog to see results.
  const handleSearchChange = (event) => {
    handleOnSearchInputChange(event);
    navigate("/");
  };

  return (
    <nav className="SubNavbar">

      <div className="content">

        <div className="row">
          <div className="search-bar">
            <input
              type="text"
              name="search"
              placeholder="Search"
              value={searchInputValue}
              onChange={handleSearchChange}
            />
            <i className="material-icons">search</i>
          </div>
        </div>

        <div className="row">
          <ul className={`category-menu`}>
            {categories.map((cat) => (
              <li className={activeCategory === cat ? "is-active" : ""} key={cat}>
                <button onClick={() => handleSelectCategory(cat)}>{cat}</button>
              </li>
            ))}
          </ul>
        </div>

      </div>
    </nav>
  )
}

export default SubNavbar;