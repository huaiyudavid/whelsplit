import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/", label: "Dashboard" },
  { to: "/expenses", label: "Expenses" },
  { to: "/expenses/new", label: "Add" },
  { to: "/people", label: "People" },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-brand-200 bg-white/95 backdrop-blur dark:border-brand-700 dark:bg-brand-900/90">
      <ul className="mx-auto grid max-w-md grid-cols-4 gap-2 px-2 py-2">
        {navItems.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                `flex h-12 items-center justify-center rounded-xl text-sm font-semibold transition ${
                  isActive ? "bg-brand-500 text-white dark:bg-brand-600" : "text-brand-700 dark:text-brand-200"
                }`
              }
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
