import React, { useCallback, useEffect, useState } from "react";
import { FaRedo, FaSave, FaUserShield } from "react-icons/fa";

export default function DashboardUsersWorkspace({ http }) {
  const [scope, setScope] = useState("travel");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const loadUsers = useCallback(async () => {
    if (typeof http !== "function") return;
    setLoading(true);
    setErr("");
    try {
      const payload = await http(`/api/admin/dashboard-users?scope=${encodeURIComponent(scope)}`);
      const list = Array.isArray(payload?.users) ? payload.users : [];
      setUsers(list);
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }, [http, scope]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const saveUser = async () => {
    if (typeof http !== "function") return;
    const u = String(username || "").trim().toLowerCase();
    if (!u) {
      setErr("Username is required.");
      return;
    }
    if (!password || password.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      await http("/api/admin/dashboard-users", {
        method: "POST",
        body: JSON.stringify({ scope, username: u, password, active: true })
      });
      setMsg("Dashboard user saved successfully.");
      setPassword("");
      await loadUsers();
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dc-shell mt-12">
      <div className="dc-hero">
        <div>
          <h3 className="m-0"><FaUserShield /> Dashboard Users</h3>
          <div className="small mt-6">Create or update login users for dashboard credential access.</div>
        </div>
      </div>

      <section className="dc-card mt-12">
        <h4 className="m-0">Create / Update User</h4>
        <div className="small mt-6">Safe mode: this operation only creates or updates one user, no destructive actions.</div>
        <div className="form-grid mt-12">
          <div className="field">
            <label>Scope</label>
            <select className="input" value={scope} onChange={(e) => setScope(String(e.target.value || "travel"))}>
              <option value="travel">travel</option>
            </select>
          </div>
          <div className="field">
            <label>Username</label>
            <input
              className="input"
              value={username}
              onChange={(e) => setUsername(String(e.target.value || ""))}
              placeholder="travel_admin"
              autoComplete="username"
            />
          </div>
          <div className="field full">
            <label>Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(String(e.target.value || ""))}
              placeholder="Minimum 8 characters"
              autoComplete="new-password"
            />
          </div>
        </div>
        <div className="flex-gap10-wrap mt-12">
          <button className="btn primary" type="button" onClick={saveUser} disabled={busy}>
            <FaSave /> {busy ? "Saving..." : "Save User"}
          </button>
          <button className="btn" type="button" onClick={loadUsers} disabled={busy || loading}>
            <FaRedo /> {loading ? "Loading..." : "Reload Users"}
          </button>
        </div>
        {msg ? <div className="small mt-10">{msg}</div> : null}
        {err ? <div className="small mt-10 text-danger">{err}</div> : null}
      </section>

      <section className="dc-card mt-12">
        <h4 className="m-0">Existing Users</h4>
        <div className="table-wrap mt-10">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Scope</th>
                <th>Username</th>
                <th>Status</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {users.length ? users.map((u, idx) => (
                <tr key={`${u?.id || "row"}_${idx}`}>
                  <td>{idx + 1}</td>
                  <td>{String(u?.scope || "travel")}</td>
                  <td>{String(u?.username || "")}</td>
                  <td>{u?.active === false ? "inactive" : "active"}</td>
                  <td>{String(u?.updatedAt || u?.createdAt || "")}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="small">{loading ? "Loading users..." : "No users found for this scope."}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

