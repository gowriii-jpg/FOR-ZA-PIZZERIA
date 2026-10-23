
import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";
import "./RestaurantDashboard.css";

const statuses = [
  "New",
  "Accepted",
  "Preparing",
  "Ready",
  "Completed",
  "Cancelled",
];

function RestaurantDashboard() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [dashboardError, setDashboardError] = useState("");
  const [orders, setOrders] = useState([]);
  const [isStaff, setIsStaff] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  // Restore an existing login and listen for sign-in/sign-out.
  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;

      if (error) setLoginError(error.message);
      setSession(data?.session ?? null);
      setAuthReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        setSession(nextSession);
        setAuthReady(true);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // Fetch orders. Database permissions decide what staff can see.
  const loadOrders = useCallback(async () => {
    setLoadingOrders(true);
    setDashboardError("");

    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          customer_name,
          customer_phone,
          total,
          status,
          created_at,
          order_items (
            id,
            pizza_name,
            quantity,
            unit_price
          )
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setOrders(data ?? []);
    } catch (error) {
      console.error("Loading orders failed:", error);
      setDashboardError(
        "Couldn't load orders: " + error.message
      );
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  // Verify staff access before displaying customer orders.
  useEffect(() => {
    if (!authReady) return;

    if (!session) {
      setIsStaff(false);
      setCheckingAccess(false);
      setOrders([]);
      return;
    }

    let cancelled = false;

    async function verifyStaff() {
      setCheckingAccess(true);
      setDashboardError("");

      try {
        const { data, error } = await supabase.rpc(
          "is_restaurant_staff"
        );

        if (error) throw error;
        if (cancelled) return;

        if (data !== true) {
          setIsStaff(false);
          setDashboardError(
            "This account is not approved as restaurant staff."
          );
          return;
        }

        setIsStaff(true);
        await loadOrders();
      } catch (error) {
        if (!cancelled) {
          setIsStaff(false);
          setDashboardError(
            "Access check failed: " + error.message
          );
        }
      } finally {
        if (!cancelled) setCheckingAccess(false);
      }
    }

    verifyStaff();

    return () => {
      cancelled = true;
    };
  }, [authReady, session, loadOrders]);

  async function handleLogin(event) {
    event.preventDefault();
    setLoginLoading(true);
    setLoginError("");

    try {
      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (error) throw error;

      setSession(data.session);
      setPassword("");
    } catch (error) {
      setLoginError(error.message);
    } finally {
      setLoginLoading(false);
    }
  }

  async function updateOrderStatus(orderId, status) {
    setUpdatingOrderId(orderId);
    setDashboardError("");

    try {
      const { error } = await supabase
        .from("orders")
        .update({ status })
        .eq("id", orderId);

      if (error) throw error;

      await loadOrders();
    } catch (error) {
      setDashboardError(
        "Status update failed: " + error.message
      );
    } finally {
      setUpdatingOrderId(null);
    }
  }

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      setDashboardError("Sign-out failed: " + error.message);
    }
  }

  function formatPrice(amount) {
    return "₹" + Number(amount).toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    });
  }

  if (!authReady) {
    return <main className="restaurant-shell">Loading...</main>;
  }

  if (!session) {
    return (
      <main className="restaurant-shell">
        <section className="restaurant-login">
          <h1>FOR'ZA PIZZERIA</h1>
          <h2>Restaurant Staff Login</h2>
          <p>Sign in to manage customer orders.</p>

          <form onSubmit={handleLogin}>
            <label htmlFor="staffEmail">Email</label>
            <input
              id="staffEmail"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />

            <label htmlFor="staffPassword">Password</label>
            <input
              id="staffPassword"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />

            {loginError && (
              <p className="restaurant-error" role="alert">
                {loginError}
              </p>
            )}

            <button
              className="restaurant-button"
              disabled={loginLoading}
            >
              {loginLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  if (checkingAccess) {
    return (
      <main className="restaurant-shell">
        Checking restaurant staff access...
      </main>
    );
  }

  if (!isStaff) {
    return (
      <main className="restaurant-shell">
        <h1>Restaurant access denied</h1>
        <p>
          {dashboardError ||
            "This account is not approved as restaurant staff."}
        </p>
        <button
          className="restaurant-button"
          onClick={handleLogout}
        >
          Sign Out
        </button>
      </main>
    );
  }

  return (
    <main className="restaurant-shell">
      <header className="restaurant-header">
        <div>
          <h1>FOR'ZA PIZZERIA</h1>
          <p>Restaurant Order Dashboard</p>
        </div>
        <button
          className="restaurant-button secondary"
          onClick={handleLogout}
        >
          Sign Out
        </button>
      </header>

      <section className="restaurant-stats">
        <div>
          <span>Total Orders</span>
          <strong>{orders.length}</strong>
        </div>
        <div>
          <span>New Orders</span>
          <strong>
            {orders.filter((order) => order.status === "New").length}
          </strong>
        </div>
        <div>
          <span>In Preparation</span>
          <strong>
            {orders.filter(
              (order) =>
                order.status === "Accepted" ||
                order.status === "Preparing"
            ).length}
          </strong>
        </div>
        <div>
          <span>Ready</span>
          <strong>
            {orders.filter((order) => order.status === "Ready").length}
          </strong>
        </div>
      </section>

      <div className="restaurant-orders-heading">
        <h2>Customer Orders</h2>
        <button
          className="restaurant-button"
          onClick={loadOrders}
          disabled={loadingOrders}
        >
          {loadingOrders ? "Refreshing..." : "Refresh Orders"}
        </button>
      </div>

      {dashboardError && (
        <p className="restaurant-error" role="alert">
          {dashboardError}
        </p>
      )}

      {loadingOrders && orders.length === 0 && (
        <p>Loading customer orders...</p>
      )}

      {!loadingOrders && orders.length === 0 && !dashboardError && (
        <p className="restaurant-empty">
          No orders yet. New orders will appear here.
        </p>
      )}

      <section className="restaurant-order-list">
        {orders.map((order) => (
          <article className="restaurant-order-card" key={order.id}>
            <div className="restaurant-order-top">
              <div>
                <h3>Order #{order.id}</h3>
                <p>
                  {new Date(order.created_at).toLocaleString("en-IN")}
                </p>
              </div>
              <strong>{formatPrice(order.total)}</strong>
            </div>

            <div className="restaurant-customer">
              <p><strong>Customer:</strong> {order.customer_name}</p>
              <p><strong>Phone:</strong> {order.customer_phone}</p>
            </div>

            <h4>Items</h4>
            <ul className="restaurant-items">
              {(order.order_items ?? []).map((item) => (
                <li key={item.id}>
                  <span>
                    {item.pizza_name} × {item.quantity}
                  </span>
                  <span>
                    {formatPrice(
                      Number(item.unit_price) * item.quantity
                    )}
                  </span>
                </li>
              ))}
            </ul>

            <div className="restaurant-status-row">
              <label htmlFor={`status-${order.id}`}>
                Update status
              </label>
              <select
                id={`status-${order.id}`}
                value={order.status}
                disabled={updatingOrderId === order.id}
                onChange={(event) =>
                  updateOrderStatus(order.id, event.target.value)
                }
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              {updatingOrderId === order.id && (
                <span>Saving...</span>
              )}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

export default RestaurantDashboard;
