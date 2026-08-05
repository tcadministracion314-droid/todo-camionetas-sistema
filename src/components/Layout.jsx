import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const links = [
  { to: "/inventario", label: "Inventario" },
  { to: "/ventas", label: "Ventas" },
  { to: "/encargos", label: "Encargos" },
  { to: "/clientes", label: "Clientes" },
  { to: "/reportes", label: "Reportes" },
];

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-white">
      <header className="flex items-center justify-between bg-marca-azul px-6 py-3">
        <div className="flex items-center gap-8">
          <span className="text-lg font-black uppercase tracking-tight text-white">
            Todo Camionetas
          </span>
          <nav className="flex gap-1">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `px-4 py-2 text-sm font-bold uppercase transition ${
                    isActive
                      ? "bg-marca-rojo text-white"
                      : "text-white hover:bg-white/10"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-bold text-white">{user?.email}</span>
          <button
            type="button"
            onClick={logout}
            className="bg-marca-rojo px-3 py-1.5 text-sm font-bold uppercase text-white hover:opacity-90"
          >
            Salir
          </button>
        </div>
      </header>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}
