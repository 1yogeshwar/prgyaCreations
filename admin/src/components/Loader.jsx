import React from "react";
import "./Loader.css";

export default function Loader({
  type = "heart",
  columns = 4,
  rows = 5,
}) {
  // =========================
  // AUTH / LOGIN LOADER
  // =========================
  if (type === "auth") {
    return (
      <div
        className="auth-loader-screen"
        role="status"
        aria-label="Authenticating"
      >
        <div className="auth-preloader">
          <div className="auth-crack auth-crack1"></div>
          <div className="auth-crack auth-crack2"></div>
          <div className="auth-crack auth-crack3"></div>
          <div className="auth-crack auth-crack4"></div>
          <div className="auth-crack auth-crack5"></div>
        </div>

        <span className="auth-loader-label">
          Pragya Creations
        </span>
      </div>
    );
  }

  // =========================
  // TABLE SKELETON LOADER
  // Products / Orders / Users
  // =========================
  if (type === "table") {
    return (
      <div
        className="table-loader-wrapper"
        style={{
          "--loader-columns": columns,
        }}
        role="status"
        aria-label="Loading data"
      >
        <div className="table-loader-head">
          {Array.from({ length: columns }).map((_, index) => (
            <div
              key={`head-${index}`}
              className="table-loader-head-cell"
            />
          ))}
        </div>

        <div className="table-loader-body">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div
              key={`row-${rowIndex}`}
              className="table-loader-row"
            >
              {Array.from({ length: columns }).map(
                (_, columnIndex) => (
                  <div
                    key={`cell-${rowIndex}-${columnIndex}`}
                    className="table-loader-cell"
                  >
                    <div className="table-loader-shimmer" />
                  </div>
                )
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // =========================
  // SMALL BUTTON SPINNER
  // Create / Update / Delete
  // =========================
  if (type === "button") {
    return (
      <span
        className="button-loader-spinner"
        role="status"
        aria-label="Processing"
      />
    );
  }

  // =========================
  // DEFAULT HEART LOADER
  // Dashboard
  // =========================
  return (
    <div
      className="loader-wrapper"
      role="status"
      aria-label="Loading"
    >
      <svg
        className="heart-loader"
        viewBox="-5 -5 278 56"
        xmlns="http://www.w3.org/2000/svg"
      >
        <filter id="admin-loader-blur">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>

        <g transform="translate(29.1 -127.42)">
          <path
            pathLength="1"
            className="heart-loader-line"
            d="M-28.73 167.2c26.43 9.21 68.46-9.46 85.45-12.03 18.45-2.78 32.82 4.86 28.75 9.83-3.82 4.66-25.77-21.18-14.81-31.5 9.54-8.98 17.64 10.64 16.42 17.06-1.51-6.2 2.95-26.6 14.74-22.11 11.7 4.46-4.33 49.03-15.44 44.08-6.97-3.1 15.44-16.26 26.1-16 23.03.56 55.6 27.51 126.63 3.36"
          />
        </g>

        <g transform="translate(29.1 -127.42)">
          <path
            pathLength="1"
            className="heart-loader-point"
            filter="url(#admin-loader-blur)"
            d="M-28.73 167.2c26.43 9.21 68.46-9.46 85.45-12.03 18.45-2.78 32.82 4.86 28.75 9.83-3.82 4.66-25.77-21.18-14.81-31.5 9.54-8.98 17.64 10.64 16.42 17.06-1.51-6.2 2.95-26.6 14.74-22.11 11.7 4.46-4.33 49.03-15.44 44.08-6.97-3.1 15.44-16.26 26.1-16 23.03.56 55.6 27.51 126.63 3.36"
          />
        </g>
      </svg>

      <span className="loader-label">
        Pragya Creations
      </span>
    </div>
  );
}