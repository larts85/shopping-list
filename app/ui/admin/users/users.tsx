"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/app/actions/profile";

type AppUser = { email: string; role: "admin" | "user" };

export default function Users() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [currentEmail, setCurrentEmail] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/users", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudieron cargar los usuarios.");
      setUsers(result);
      setCurrentEmail((await getCurrentUser()).email);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron cargar los usuarios.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function changeRole(user: AppUser, role: AppUser["role"]) {
    if (user.role === role || saving) return;
    setSaving(user.email);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: user.email, role }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo cambiar el rol.");
      setUsers((current) => current.map((item) => item.email === user.email ? { ...item, role } : item));
      setMessage(`Se actualizó el rol de ${user.email}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cambiar el rol.");
    } finally {
      setSaving("");
    }
  }

  return (
    <main>
      <h1 className="page-heading">Usuarios</h1>
      <p className="page-description">Administra los roles de acceso a la aplicación. Tu propio rol no se puede modificar desde esta pantalla.</p>
      {error && <p role="alert" className="error-notice mt-5">{error}</p>}
      {message && <p role="status" className="mt-5 text-sm text-emerald-700">{message}</p>}
      {loading ? <p role="status" className="mt-6">Cargando usuarios…</p> : !users.length ? (
        <p className="empty-state mt-6">No hay usuarios registrados.</p>
      ) : (
        <div className="panel mt-6 overflow-x-auto p-0">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
              <tr><th scope="col" className="px-4 py-3 font-medium">Correo</th><th scope="col" className="px-4 py-3 font-medium">Rol</th></tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {users.map((user) => (
                <tr key={user.email}>
                  <th scope="row" className="px-4 py-3 font-medium">{user.email}</th>
                  <td className="px-4 py-3">
                    <select aria-label={`Rol de ${user.email}`} className="field max-w-44" value={user.role} onChange={(event) => void changeRole(user, event.target.value as AppUser["role"])} disabled={!!saving || user.email === currentEmail}>
                      <option value="user">Usuario</option>
                      <option value="admin">Administrador</option>
                    </select>
                    {saving === user.email && <span role="status" className="ml-2 text-zinc-500">Guardando…</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

Users.displayName = "Users";
