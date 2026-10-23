
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

  // Load available pizzas from Supabase.
  useEffect(() => {
    async function loadMenu() {
      try {
        const { data, error } = await supabase
          .from("menu_items")
          .select("id, name, price, image_url")
          .eq("available", true)
          .order("id");

        if (error) throw error;

        setPizzas(
          (data ?? []).map((pizza) => ({
            ...pizza,
            price: Number(pizza.price),
          }))
        );
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

  function addToCart(pizza) {
    const existing = cart.find(
      (item) => item.id === pizza.id
    );

    if (existing) {
      setCart(
        cart.map((item) =>
          item.id === pizza.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([...cart, { ...pizza, quantity: 1 }]);
    }
  }

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

  // Save the customer order in the Supabase database.
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

  // IMPORTANT: Restaurant routing belongs here,
  // outside placeOrder() and before the customer page return.
  if (
    window.location.pathname.replace(/\/+$/, "") === "/restaurant"
  ) {
    return <RestaurantDashboard />;
  }

  // Customer-facing website starts here.
  return (
    <div>
      <header className="site-header">
        <h1>FOR'ZA PIZZERIA</h1>
        <p>Authentic Neapolitan pizzas, made just for you!</p>
      </header>

      {currentPage === "menu" && (
        <>
          {menuLoading ? (
            <p>Loading menu...</p>
          ) : menuError ? (
            <p>{menuError}</p>
          ) : pizzas.length === 0 ? (
            <p>No pizzas are currently available.</p>
          ) : (
            <div className="pizza-container">
              {pizzas.map((pizza) => (
                <div className="pizza-card" key={pizza.id}>
                  <img
                    className="pizza-image"
                    src={pizza.image_url}
                    alt={pizza.name}
                  />
                  <h2>{pizza.name}</h2>
                  <h3>₹{pizza.price}</h3>
                  <button onClick={() => addToCart(pizza)}>
                    Add to Cart
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="cart-summary cart-bar">
            <div>
              <h2>
                {itemCount === 0
                  ? "Your cart is empty"
                  : `${itemCount} ${
                      itemCount === 1 ? "item" : "items"
                    } · ₹${total}`}
              </h2>
              <p>
                {itemCount === 0
                  ? "Choose a pizza to get started."
                  : "Your delicious choices are waiting."}
              </p>
            </div>

            <button
              className="checkout-button"
              disabled={cart.length === 0}
              onClick={() => setCurrentPage("cart")}
            >
              View Cart
            </button>
          </div>
        </>
      )}

      {currentPage === "cart" && (
        <div className="cart-summary review-page">
          <h1>Your Cart</h1>
          <p>Review your selection before checkout.</p>

          {cart.map((item) => (
            <div className="cart-item" key={item.id}>
              <div>
                <h3>{item.name}</h3>
                <p>₹{item.price} each</p>
                <p>
                  Subtotal: ₹{item.price * item.quantity}
                </p>
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
                  Remove
                </button>
              </div>
            </div>
          ))}

          <h2 className="cart-total">Total: ₹{total}</h2>

          <div className="page-actions">
            <button
              className="secondary-button"
              onClick={() => setCurrentPage("menu")}
            >
              ← Back to Menu
            </button>

            <button
              className="checkout-button"
              disabled={cart.length === 0}
              onClick={() => {
                setOrderError("");
                setCurrentPage("checkout");
              }}
            >
              Proceed to Checkout
            </button>
          </div>
        </div>
      )}

      {currentPage === "checkout" && (
        <div className="cart-summary checkout-form">
          <h1>Complete Your Order</h1>
          <p>Please enter your details for counter collection.</p>

          <div className="form-group">
            <label htmlFor="customerName">Your Name</label>
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
            <label htmlFor="customerPhone">Phone Number</label>
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

          <h2>Total: ₹{total}</h2>

          {orderError && <p role="alert">{orderError}</p>}

          <div className="page-actions">
            <button
              className="secondary-button"
              disabled={orderSubmitting}
              onClick={() => setCurrentPage("cart")}
            >
              ← Back to Cart
            </button>

            <button
              className="checkout-button"
              disabled={orderSubmitting || cart.length === 0}
              onClick={placeOrder}
            >
              {orderSubmitting
                ? "Placing Order..."
                : "Place Order"}
            </button>
          </div>
        </div>
      )}

      {currentPage === "success" && (
        <div className="cart-summary order-confirmation">
          <h1>🎉 Order Placed Successfully!</h1>
          <p>Your order number:</p>
          <h2>{orderNumber}</h2>
          <p>Order total: ₹{orderTotal}</p>
          <p>Thank you for ordering from FOR'ZA PIZZERIA.</p>
          <p>Your order is confirmed for counter collection.</p>

          <button
            className="checkout-button"
            onClick={() => {
              setCustomerName("");
              setCustomerPhone("");
              setOrderError("");
              setCurrentPage("menu");
            }}
          >
            Back to Menu
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
