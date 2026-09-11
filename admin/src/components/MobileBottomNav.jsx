import { ClipboardList, LayoutDashboard, MoreHorizontal, Package, Users } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

const tabs = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/products", label: "Products", icon: Package },
  { to: "/orders", label: "Orders", icon: ClipboardList },
  { to: "/users", label: "Users", icon: Users },
];

export default function MobileBottomNav({ isMoreOpen, onMoreToggle, onNavigate }) {
  const location = useLocation();
  const isMoreActive = ["/events", "/custom-orders"].includes(location.pathname);

  return (
    <nav className="mobile-bottom-nav" aria-label="Primary navigation">
      {tabs.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) => `mobile-bottom-nav__item${isActive ? " mobile-bottom-nav__item--active" : ""}`}
        >
          <Icon className="mobile-bottom-nav__icon" size={20} strokeWidth={2} />
          <span>{label}</span>
        </NavLink>
      ))}
      <button
        type="button"
        aria-label="Open more navigation"
        aria-expanded={isMoreOpen}
        onClick={onMoreToggle}
        className={`mobile-bottom-nav__item mobile-bottom-nav__button${isMoreOpen || isMoreActive ? " mobile-bottom-nav__item--active" : ""}`}
      >
        <MoreHorizontal className="mobile-bottom-nav__icon" size={21} strokeWidth={2} />
        <span>More</span>
      </button>
    </nav>
  );
}
