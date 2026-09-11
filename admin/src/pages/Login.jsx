import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";

const API = process.env.REACT_APP_API_URL;

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/auth/login`, { email, password });
      if (data.user.role !== "admin") {
        toast.error("Not an admin account");
        return;
      }
      localStorage.setItem("admin-token", data.token);
      localStorage.setItem("admin-user", JSON.stringify(data.user));
      toast.success("Welcome Admin!");
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f3f4f6" }}>
      <form className="login-form" onSubmit={handleSubmit} style={{ background: "#fff", padding: 40, borderRadius: 12, width: 360, boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}>
        <h2 style={{ marginBottom: 24, textAlign: "center" }}>⚒ Admin Login</h2>
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
          style={inputStyle} required />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
          style={inputStyle} required />
        <button type="submit" disabled={loading} style={btnStyle}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}

const inputStyle = { width: "100%", padding: 10, marginBottom: 16, borderRadius: 8, border: "1px solid #ddd", fontSize: 15, boxSizing: "border-box" };
const btnStyle = { width: "100%", padding: 12, background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, fontSize: 16, cursor: "pointer" };
