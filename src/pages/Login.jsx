import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/inventario";

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch {
      setError("Correo o contraseña incorrectos.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-marca-azul px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm border-4 border-marca-rojo bg-white p-8"
      >
        <h1 className="mb-1 text-2xl font-black uppercase tracking-tight text-marca-azul">
          Todo Camionetas
        </h1>
        <p className="mb-6 text-sm font-bold text-marca-rojo">
          Sistema de gestión
        </p>

        <label className="mb-1 block text-sm font-bold text-marca-azul">
          Correo
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
        />

        <label className="mb-1 block text-sm font-bold text-marca-azul">
          Contraseña
        </label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
        />

        {error && (
          <p className="mb-4 text-sm font-bold text-marca-rojo">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-marca-rojo py-3 font-black uppercase text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </div>
  );
}
