import { useEffect, useRef, useState } from "react";
import { CalendarDays, LogOut, Palette } from "lucide-react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import MobileBottomNav from "./MobileBottomNav";
import MobileHeader from "./MobileHeader";

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuSheetRef = useRef(null);
  const mobileMenuTriggerRef = useRef(null);
  const logout = () => { localStorage.clear(); navigate("/login"); };
  const closeMobileMenu = (restoreFocus = false) => {
    setIsMobileMenuOpen(false);
    if (restoreFocus) {
      const restoreTriggerFocus = () => mobileMenuTriggerRef.current?.focus();
      if (typeof window.requestAnimationFrame === "function") {
        window.requestAnimationFrame(restoreTriggerFocus);
      } else {
        window.setTimeout(restoreTriggerFocus, 0);
      }
    }
  };
  const toggleMobileMenu = (event) => {
    if (!isMobileMenuOpen) mobileMenuTriggerRef.current = event.currentTarget;
    setIsMobileMenuOpen(open => !open);
  };

  useEffect(() => {
    closeMobileMenu();
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobileMenuOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") closeMobileMenu(true);
    };
    window.addEventListener("keydown", onKeyDown);
    mobileMenuSheetRef.current?.querySelector("a, button")?.focus();

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMobileMenuOpen]);

  return (
    <div className="admin-shell" style={{ display: "flex", minHeight: "100vh" }}>
      <aside className="admin-sidebar" style={{ width: 220, background: "#1e1e2e", color: "#fff", padding: 20 }}>
        <h2 style={{ marginBottom: 32, fontSize: 20 }}>⚒ CraftWorld</h2>
        {[
          { to: "/", label: "📊 Dashboard" },
          { to: "/products", label: "📦 Products" },
          { to: "/orders", label: "🧾 Orders" },
          { to: "/users", label: "👥 Users" },
          { to: "/events", label: "🎪 Events" },
          { to: "/custom-orders", label: "🎨 Custom Orders" }
        ].map(({ to, label }) => (
          <NavLink key={to} to={to} end={to === "/"}
            style={({ isActive }) => ({
              display: "block", padding: "10px 12px", marginBottom: 8,
              borderRadius: 8, textDecoration: "none",
              background: isActive ? "#7c3aed" : "transparent",
              color: "#fff", fontSize: 15,
            })}>
            {label}
          </NavLink>
        ))}
        <button onClick={logout} style={{
          marginTop: 40, width: "100%", padding: 10,
          background: "#ef4444", color: "#fff", border: "none",
          borderRadius: 8, cursor: "pointer"
        }}>Logout</button>
      </aside>
      <MobileHeader
        isMenuOpen={isMobileMenuOpen}
        onMenuToggle={toggleMobileMenu}
      />

      <main className="admin-main" style={{ flex: 1, padding: 32, background: "#f9fafb" }}>
        <Outlet context={{ logout }} />
      </main>

      <MobileBottomNav
        isMoreOpen={isMobileMenuOpen}
        onMoreToggle={toggleMobileMenu}
        onNavigate={closeMobileMenu}
      />

      {isMobileMenuOpen && (
        <div className="mobile-more-overlay" role="presentation" onClick={() => closeMobileMenu(true)}>
          <section
            ref={mobileMenuSheetRef}
            className="mobile-more-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-more-title"
            onClick={event => event.stopPropagation()}
          >
            <div className="mobile-more-sheet__handle" />
            <p id="mobile-more-title" className="mobile-more-sheet__title">More</p>
            <NavLink to="/events" onClick={closeMobileMenu} className="mobile-more-link">
              <CalendarDays size={19} />
              Events & Fairs
            </NavLink>
            <NavLink to="/custom-orders" onClick={closeMobileMenu} className="mobile-more-link">
              <Palette size={19} />
              Custom Orders
            </NavLink>
            <button type="button" onClick={logout} className="mobile-more-link mobile-more-link--logout">
              <LogOut size={19} />
              Logout
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
