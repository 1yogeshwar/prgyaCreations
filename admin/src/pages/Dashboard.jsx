import { useEffect, useState } from "react";
import axios from "axios";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Loader from "../components/Loader";

const API = process.env.REACT_APP_API_URL;

const token = () => localStorage.getItem("admin-token");

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);

        const response = await axios.get(`${API}/admin/analytics`, {
          headers: {
            Authorization: `Bearer ${token()}`,
          },
        });

        setStats(response.data);
      } catch (error) {
        console.error("Dashboard load error:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const cards = [
    {
      label: "Total Products",
      value: stats?.totalProducts,
      color: "#7c3aed",
    },
    {
      label: "Total Orders",
      value: stats?.totalOrders,
      color: "#0ea5e9",
    },
    {
      label: "Total Users",
      value: stats?.totalUsers,
      color: "#10b981",
    },
    {
      label: "Revenue (paid)",
      value: `₹${stats?.totalRevenue || 0}`,
      color: "#f59e0b",
    },
  ];

  const logout = () => {
    localStorage.clear();
    navigate("/login");
  };

  // Dashboard API load hone tak heart loader
  if (loading) {
    return <Loader type="heart" />;
  }

  return (
    <div className="admin-page dashboard-page">
      <h2
        className="admin-page-title"
        style={{ marginBottom: 24 }}
      >
        Dashboard
      </h2>

      <div
        className="dashboard-stats"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 20,
        }}
      >
        {cards.map(({ label, value, color }) => (
          <div
            className="dashboard-stat-card"
            key={label}
            style={{
              "--stat-accent": color,
              background: "#fff",
              padding: 24,
              borderRadius: 12,
              borderTop: `4px solid ${color}`,
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            }}
          >
            <p
              style={{
                color: "#6b7280",
                marginBottom: 8,
              }}
            >
              {label}
            </p>

            <h3
              style={{
                fontSize: 28,
                color,
              }}
            >
              {value ?? "0"}
            </h3>
          </div>
        ))}
      </div>

      <button
        className="mobile-only dashboard-mobile-logout"
        type="button"
        onClick={logout}
      >
        <LogOut
          size={18}
          aria-hidden="true"
        />

        Logout
      </button>
    </div>
  );
}