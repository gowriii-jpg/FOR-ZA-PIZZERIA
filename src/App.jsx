
import { useState, useEffect } from "react";
import RestaurantDashboard from "./RestaurantDashboard";
import "./App.css";
import { supabase } from "./supabaseClient";

function App() {
  const [cart, setCart] = useState([]);
  const [currentPage, setCurrentPage] = useState("menu");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [orderTotal, setOrderTotal] = useState(0);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderError, setOrderError] = useState("");

  const [pizzas, setPizzas] = useState([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Load the available menu from Supabase.
  useEffect(() => {
    async function loadMenu() {
      try {
        const { data, error } = await supabase
          .from("menu_items")
          .select("id, name, price, image_url")
          .eq("available", true)
          .order("id");

        if (error) throw error;

        const formattedPizzas = (data ?? []).map((pizza) => ({
          ...pizza,
          name:
            pizza.name.toLowerCase() === "spicy pizza"
              ? "Paneer Makhani Pizza"
              : pizza.name,
          price: Number(pizza.price),
        }));

        setPizzas(formattedPizzas);
      } catch (error) {
        console.error("Error loading menu:", error);
        setMenuError(
          "We couldn't load the menu. Please refresh the page."
        );
      } finally {
        setMenuLoading(false);
      }
    }

    loadMenu();
  }, []);

  // Find the Creamy Alfredo Pizza for the featured section.
  const featuredPizza =
    pizzas.find((pizza) =>
      pizza.name.toLowerCase().includes("creamy alfredo")
    ) || pizzas[0];

  // Add a pizza to the cart.
  function addToCart(pizza) {
    setCart((currentCart) => {
      const existing = currentCart.find(
        (item) => item.id === pizza.id
      );

      if (existing) {
        return currentCart.map((item) =>
          item.id === pizza.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...currentCart, { ...pizza, quantity: 1 }];
    });
  }

  // Change the quantity of a cart item.
  function changeQuantity(id, amount) {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.id === id
            ? { ...item, quantity: item.quantity + amount }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  // Remove an item from the cart.
  function removeFromCart(id) {
    setCart((currentCart) =>
      currentCart.filter((item) => item.id !== id)
    );
  }

  const itemCount = cart.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  // Search the menu.
  const filteredPizzas = pizzas.filter((pizza) =>
    pizza.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Place the order in Supabase.
  async function placeOrder() {
    if (orderSubmitting) return;

    if (cart.length === 0) {
      alert("Your cart is empty.");
      return;
    }

    if (!customerName.trim()) {
      alert("Please enter your name.");
      return;
    }

    if (!/^\d{10}$/.test(customerPhone)) {
      alert("Please enter a valid 10-digit phone number.");
      return;
    }

    setOrderSubmitting(true);
    setOrderError("");

    try {
      const { data, error } = await supabase.rpc("place_order", {
        p_customer_name: customerName.trim(),
        p_customer_phone: customerPhone,
        p_items: cart.map((item) => ({
          menu_item_id: item.id,
          quantity: item.quantity,
        })),
      });

      if (error) throw error;

      if (!data || !data.order_id) {
        throw new Error(
          "The database did not return an order number."
        );
      }

      setOrderNumber(
        "FORZA-" + String(data.order_id).padStart(6, "0")
      );

      setOrderTotal(Number(data.total));
      setCart([]);
      setCurrentPage("success");
    } catch (error) {
      console.error("Error placing order:", error);

      setOrderError(
        "We couldn't place your order. Please try again. " +
        "If this continues, contact the restaurant."
      );
    } finally {
      setOrderSubmitting(false);
    }
  }

  // Keep the restaurant dashboard working.
  if (
    window.location.pathname.replace(/\/+$/, "") === "/restaurant"
  ) {
    return <RestaurantDashboard />;
  }

  // Customer-facing website.
  return (
    <div className="storefront">

      {/* HEADER */}
      <header className="top-navigation" id="top">
        <a
          href="#top"
          className="brand"
          onClick={() => setCurrentPage("menu")}
          aria-label="FOR'ZA Pizzeria home"
        >
          <span className="brand-symbol">F</span>

          <span className="brand-name">
            FOR'ZA
            <span>PIZZERIA</span>
          </span>
        </a>

        {currentPage === "menu" ? (
          <>
            <nav className="main-navigation">
              <a href="#menu">THE MENU</a>
              <a href="#our-pick">OUR PICK</a>
              <a href="#about">ABOUT US</a>
            </nav>

            <div className="nav-right">
              <a href="#about" className="collection-label">
                <span className="status-dot"></span>
                COUNTER COLLECTION
              </a>
            </div>
          </>
        ) : (
          <button
            className="nav-back-button"
            onClick={() => setCurrentPage("menu")}
          >
            BACK TO MENU
          </button>
        )}
      </header>

      {currentPage === "menu" && (
        <>
          {/* FLOATING CART */}
          <button
            className="floating-cart"
            onClick={() => setCurrentPage("cart")}
            disabled={cart.length === 0}
            aria-label={`View cart, ${itemCount} items`}
          >
            <span>🛒</span>
            CART
            <span className="floating-cart-count">{itemCount}</span>
            <span className="floating-cart-total">₹{total}</span>
          </button>

          <main>
            {/* HERO */}
            <section className="hero-section">
              <div className="hero-content">
                <p className="eyebrow">
                  FOR THE LOVE OF GREAT PIZZA
                </p>

                <h1>
                  GAME ON.
                  <br />
                  <span>HUNGER OFF.</span>
                </h1>

                <p className="hero-description">
                  Freshly made pizzas. Bold flavours.
                  Your next favourite bite is waiting.
                </p>

                <a href="#menu" className="hero-button">
                  EXPLORE THE MENU <span>→</span>
                </a>

                <div className="hero-note">
                  <span>✦</span>
                  MADE FRESH. SERVED HOT.
                </div>
              </div>

              <div className="hero-art">
                <div className="hero-circle hero-circle-one"></div>
                <div className="hero-circle hero-circle-two"></div>

                {featuredPizza?.image_url ? (
                  <img
                    className="hero-pizza-image"
                    src={featuredPizza.image_url}
                    alt={featuredPizza.name}
                  />
                ) : (
                  <div className="hero-pizza-placeholder">🍕</div>
                )}

                <div className="hero-sticker">
                  <strong>HOT</strong>
                  FRESH
                  <br />
                  EVERY TIME
                </div>

                <span className="hero-decoration">✦</span>
              </div>

              <div className="hero-bottom-line">
                <span>FRESH INGREDIENTS</span>
                <span>✦</span>
                <span>BOLD FLAVOURS</span>
                <span>✦</span>
                <span>MADE TO ORDER</span>
              </div>
            </section>

            {/* OUR PICK */}
            <section className="catalogue-section" id="our-pick">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">EDITOR'S CHOICE</p>
                  <h2>OUR PICK</h2>
                  <p className="section-description">
                    A favourite worth coming back for.
                  </p>
                </div>

                <span className="section-number">
                  01 / FEATURED
                </span>
              </div>

              {menuLoading ? (
                <p className="status-message">Loading our pick...</p>
              ) : featuredPizza ? (
                <article className="featured-card">
                  <div className="featured-image-wrap">
                    <img
                      src={featuredPizza.image_url}
                      alt={featuredPizza.name}
                    />
                    <span className="featured-tag">
                      FOR'ZA SPECIAL
                    </span>
                  </div>

                  <div className="featured-details">
                    <p className="eyebrow">THE ONE TO TRY</p>

                    <h3>{featuredPizza.name}</h3>

                    <p>
                      Creamy, comforting and freshly prepared.
                      Discover why this pizza deserves the spotlight.
                    </p>

                    <div className="featured-bottom">
                      <strong>₹{featuredPizza.price}</strong>

                      <button
                        onClick={() => addToCart(featuredPizza)}
                      >
                        ADD TO CART <span>+</span>
                      </button>
                    </div>
                  </div>
                </article>
              ) : (
                <p className="status-message">
                  Our featured pizza is currently unavailable.
                </p>
              )}
            </section>

            {/* MENU */}
            <section className="catalogue-section menu-section" id="menu">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">PICK YOUR FAVOURITE</p>
                  <h2>THE MENU</h2>
                  <p className="section-description">
                    Choose your pizza. We'll handle the rest.
                  </p>
                </div>

                <span className="section-number">
                  {pizzas.length} ITEMS
                </span>
              </div>

              <div className="menu-tools">
                <div className="menu-tabs">
                  <span className="menu-tab active-tab">
                    ALL PIZZAS
                  </span>
                </div>

                <div className="search-box">
                  <span>⌕</span>

                  <input
                    type="text"
                    placeholder="Search pizzas..."
                    value={searchTerm}
                    onChange={(event) =>
                      setSearchTerm(event.target.value)
                    }
                    aria-label="Search pizzas"
                  />

                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      aria-label="Clear search"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {menuLoading ? (
                <p className="status-message">Loading the menu...</p>
              ) : menuError ? (
                <p className="status-message error-message">
                  {menuError}
                </p>
              ) : filteredPizzas.length === 0 ? (
                <div className="empty-menu">
                  <span>🍕</span>
                  <h3>No pizzas found</h3>
                  <p>Try searching with another name.</p>
                </div>
              ) : (
                <div className="pizza-grid">
                  {filteredPizzas.map((pizza, index) => (
                    <article className="pizza-card" key={pizza.id}>
                      <div className="pizza-card-image">
                        <img
                          src={pizza.image_url}
                          alt={pizza.name}
                        />
                        <span className="pizza-index">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                      </div>

                      <div className="pizza-card-content">
                        <div className="pizza-card-title-row">
                          <h3>{pizza.name}</h3>
                          <strong>₹{pizza.price}</strong>
                        </div>

                        <p>Freshly prepared and made to order.</p>

                        <button
                          className="add-button"
                          onClick={() => addToCart(pizza)}
                        >
                          ADD TO CART
                          <span className="add-symbol">+</span>
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            {/* ABOUT US / FOUNDER STORY */}
            <section className="closing-banner" id="about">
              <div className="about-story">
                <p className="eyebrow">THE STORY BEHIND FOR'ZA</p>

                <h2>BUILT ON PASSION. BAKED WITH PURPOSE.</h2>

                <p>
                  FOR'ZA PIZZERIA began with Shashank, a founder
                  whose passion for cooking grew into a dream
                  of building something of his own.
                </p>

                <p>
                  He wanted to bring people the joy of authentic,
                  freshly baked pizzas without making premium
                  food feel out of reach. His belief was simple:
                  great pizza should not be a luxury reserved
                  for a few. Everyone deserves to enjoy quality
                  ingredients, carefully prepared flavours and
                  a satisfying meal at a pocket-friendly price.
                </p>

                <p>
                  What started as a personal passion became
                  FOR'ZA — a business built around good food,
                  honest value and the excitement of sharing
                  something he truly loves making.
                </p>

                <p className="about-ending">
                  Every pizza is a little part of that dream.
                  Made with passion, served with pride.
                </p>
              </div>

              <a href="#menu">EXPLORE OUR MENU →</a>
            </section>
          </main>

          {/* FOOTER */}
          <footer className="site-footer">
            <div className="brand footer-brand">
              <span className="brand-symbol">F</span>

              <span className="brand-name">
                FOR'ZA
                <span>PIZZERIA</span>
              </span>
            </div>

            <p>Fresh pizza. Bold flavour. Every time.</p>
            <span>© FOR'ZA PIZZERIA</span>
          </footer>

          {/* BOTTOM CART BAR */}
          <div className="cart-bar">
            <div>
              <strong>
                {itemCount === 0
                  ? "YOUR CART IS EMPTY"
                  : `${itemCount} ITEMS IN YOUR CART`}
              </strong>
              <span>₹{total}</span>
            </div>

            <button
              disabled={cart.length === 0}
              onClick={() => setCurrentPage("cart")}
            >
              VIEW CART <span>→</span>
            </button>
          </div>
        </>
      )}

      {/* CART PAGE */}
      {currentPage === "cart" && (
        <main className="inner-page">
          <div className="inner-page-heading">
            <p className="eyebrow">YOUR SELECTION</p>
            <h1>YOUR CART</h1>
            <p>Review your selection before checkout.</p>
          </div>

          <section className="cart-panel">
            {cart.length === 0 ? (
              <div className="empty-menu">
                <span>🛒</span>
                <h3>Your cart is empty</h3>
                <p>Add a pizza from the menu to get started.</p>
              </div>
            ) : (
              cart.map((item) => (
                <div className="cart-item" key={item.id}>
                  <div className="cart-item-image">
                    <img src={item.image_url} alt={item.name} />
                  </div>

                  <div className="cart-item-info">
                    <h3>{item.name}</h3>
                    <p>₹{item.price} each</p>
                    <strong>
                      Subtotal: ₹{item.price * item.quantity}
                    </strong>
                  </div>

                  <div className="cart-item-actions">
                    <div className="quantity-control">
                      <button
                        aria-label={`Decrease ${item.name} quantity`}
                        onClick={() => changeQuantity(item.id, -1)}
                      >
                        −
                      </button>

                      <span>{item.quantity}</span>

                      <button
                        aria-label={`Increase ${item.name} quantity`}
                        onClick={() => changeQuantity(item.id, 1)}
                      >
                        +
                      </button>
                    </div>

                    <button
                      className="remove-button"
                      onClick={() => removeFromCart(item.id)}
                    >
                      REMOVE
                    </button>
                  </div>
                </div>
              ))
            )}

            <div className="cart-total-row">
              <span>TOTAL</span>
              <strong>₹{total}</strong>
            </div>

            <div className="page-actions">
              <button
                className="secondary-button"
                onClick={() => setCurrentPage("menu")}
              >
                ← BACK TO MENU
              </button>

              <button
                className="primary-button"
                disabled={cart.length === 0}
                onClick={() => {
                  setOrderError("");
                  setCurrentPage("checkout");
                }}
              >
                PROCEED TO CHECKOUT →
              </button>
            </div>
          </section>
        </main>
      )}

      {/* CHECKOUT PAGE */}
      {currentPage === "checkout" && (
        <main className="inner-page">
          <div className="inner-page-heading">
            <p className="eyebrow">ALMOST THERE</p>
            <h1>CHECKOUT</h1>
            <p>Enter your details for counter collection.</p>
          </div>

          <section className="checkout-panel">
            <div className="checkout-order-summary">
              <span>YOUR ORDER TOTAL</span>
              <strong>₹{total}</strong>
              <p>Collection at the restaurant counter.</p>
            </div>

            <div className="form-group">
              <label htmlFor="customerName">YOUR NAME</label>
              <input
                id="customerName"
                type="text"
                placeholder="Enter your name"
                value={customerName}
                onChange={(event) =>
                  setCustomerName(event.target.value)
                }
              />
            </div>

            <div className="form-group">
              <label htmlFor="customerPhone">PHONE NUMBER</label>
              <input
                id="customerPhone"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="Enter your 10-digit phone number"
                value={customerPhone}
                onChange={(event) =>
                  setCustomerPhone(
                    event.target.value.replace(/\D/g, "")
                  )
                }
              />
            </div>

            {orderError && (
              <p className="order-error" role="alert">
                {orderError}
              </p>
            )}

            <div className="page-actions">
              <button
                className="secondary-button"
                disabled={orderSubmitting}
                onClick={() => setCurrentPage("cart")}
              >
                ← BACK TO CART
              </button>

              <button
                className="primary-button"
                disabled={orderSubmitting || cart.length === 0}
                onClick={placeOrder}
              >
                {orderSubmitting
                  ? "PLACING ORDER..."
                  : "PLACE ORDER →"}
              </button>
            </div>
          </section>
        </main>
      )}

      {/* SUCCESS PAGE */}
      {currentPage === "success" && (
        <main className="inner-page">
          <section className="success-panel">
            <div className="success-icon">✓</div>

            <p className="eyebrow">ORDER CONFIRMED</p>
            <h1>YOU'RE ALL SET!</h1>

            <p>Your order has been placed successfully.</p>

            <div className="order-number-box">
              <span>YOUR ORDER NUMBER</span>
              <strong>{orderNumber}</strong>
            </div>

            <h2>₹{orderTotal}</h2>

            <p>Thank you for ordering from FOR'ZA PIZZERIA.</p>
            <p>Your order is confirmed for counter collection.</p>

            <button
              className="primary-button"
              onClick={() => {
                setCustomerName("");
                setCustomerPhone("");
                setOrderError("");
                setSearchTerm("");
                setCurrentPage("menu");
              }}
            >
              BACK TO MENU →
            </button>
          </section>
        </main>
      )}
    </div>
  );
}

export default App;
