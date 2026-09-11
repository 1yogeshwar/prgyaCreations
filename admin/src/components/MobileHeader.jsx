import { Menu, Sparkles } from "lucide-react";

export default function MobileHeader({ isMenuOpen, onMenuToggle }) {
  return (
    <header className="mobile-header">
      <div className="mobile-brand" aria-label="Pragya Creations admin">
        <span className="mobile-brand__mark"><Sparkles size={18} strokeWidth={2.25} /></span>
        <span>Pragya Creations</span>
      </div>
      <button
        type="button"
        className="mobile-header__menu-button"
        aria-label={isMenuOpen ? "Close menu" : "Open menu"}
        aria-expanded={isMenuOpen}
        onClick={onMenuToggle}
      >
        <Menu size={22} />
      </button>
    </header>
  );
}
