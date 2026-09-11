import { useEffect, useState } from "react";
import axios from "axios";
import Loader from "../components/Loader";

const API = process.env.REACT_APP_API_URL;

const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("admin-token")}`,
});

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);

        const response = await axios.get(`${API}/admin/users`, {
          headers: authHeader(),
        });

        setUsers(response.data);
      } catch (error) {
        console.error("Users load error:", error);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  return (
    <div className="admin-page users-page">
      <h2
        className="admin-page-title"
        style={{ marginBottom: 24 }}
      >
        Users
      </h2>

      {loading ? (
        <Loader
          type="table"
          columns={4}
          rows={6}
        />
      ) : (
        <>
          {/* =========================
              DESKTOP USERS TABLE
              ========================= */}
          <div
            className="desktop-only users-table-wrapper"
            style={{
              background: "#fff",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
              }}
            >
              <thead
                style={{
                  background: "#f3f4f6",
                }}
              >
                <tr>
                  {["Name", "Email", "Phone", "Joined"].map((h) => (
                    <th
                      key={h}
                      style={thStyle}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {users.map((u) => (
                  <tr
                    key={u._id}
                    style={{
                      borderBottom: "1px solid #f3f4f6",
                    }}
                  >
                    <td style={tdStyle}>
                      {u.name}
                    </td>

                    <td style={tdStyle}>
                      {u.email}
                    </td>

                    <td style={tdStyle}>
                      {u.phone || "—"}
                    </td>

                    <td style={tdStyle}>
                      {new Date(
                        u.createdAt
                      ).toLocaleDateString()}
                    </td>
                  </tr>
                ))}

                {users.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      style={{
                        padding: 24,
                        textAlign: "center",
                        color: "#9ca3af",
                      }}
                    >
                      No users yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* =========================
              MOBILE USERS CARDS
              ========================= */}
          <div className="mobile-only users-mobile-list">
            {users.map((u) => (
              <article
                className="user-mobile-card"
                key={u._id}
              >
                <h3 className="user-mobile-name">
                  {u.name}
                </h3>

                <dl className="user-mobile-details">
                  <div className="user-mobile-detail">
                    <dt>Email</dt>
                    <dd>{u.email}</dd>
                  </div>

                  <div className="user-mobile-detail">
                    <dt>Phone</dt>
                    <dd>{u.phone || "—"}</dd>
                  </div>

                  <div className="user-mobile-detail">
                    <dt>Joined</dt>
                    <dd>
                      {new Date(
                        u.createdAt
                      ).toLocaleDateString()}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}

            {users.length === 0 && (
              <p className="users-mobile-empty">
                No users yet
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const thStyle = {
  padding: "12px 16px",
  textAlign: "left",
  fontSize: 13,
  fontWeight: 600,
};

const tdStyle = {
  padding: "12px 16px",
  fontSize: 14,
  color: "#374151",
};