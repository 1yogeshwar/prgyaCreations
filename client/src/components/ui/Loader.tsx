import React from "react";
import "./Loader.css";

function Loader() {
  return (
    <div className="loader-wrapper" role="status" aria-label="Loading">
      <svg
        className="heart"
        viewBox="-5 -5 278 56"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
      >
        <filter id="blur">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>

        <g transform="translate(29.1 -127.42)">
          <path
            pathLength="1"
            d="M-28.73 167.2c26.43 9.21 68.46-9.46 85.45-12.03 18.45-2.78 32.82 4.86 28.75 9.83-3.82 4.66-25.77-21.18-14.81-31.5 9.54-8.98 17.64 10.64 16.42 17.06-1.51-6.2 2.95-26.6 14.74-22.11 11.7 4.46-4.33 49.03-15.44 44.08-6.97-3.1 15.44-16.26 26.1-16 23.03.56 55.6 27.51 126.63 3.36"
            className="heart-line"
          />
        </g>

        <g transform="translate(29.1 -127.42)">
          <path
            pathLength="1"
            d="M-28.73 167.2c26.43 9.21 68.46-9.46 85.45-12.03 18.45-2.78 32.82 4.86 28.75 9.83-3.82 4.66-25.77-21.18-14.81-31.5 9.54-8.98 17.64 10.64 16.42 17.06-1.51-6.2 2.95-26.6 14.74-22.11 11.7 4.46-4.33 49.03-15.44 44.08-6.97-3.1 15.44-16.26 26.1-16 23.03.56 55.6 27.51 126.63 3.36"
            className="heart-point"
            filter="url(#blur)"
          />
        </g>
      </svg>

      <span className="loader-text">Pragya Creations</span>
    </div>
  );
}

export { Loader };