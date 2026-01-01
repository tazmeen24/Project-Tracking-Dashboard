// frontend/src/config.js
const API_URL =
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://project-tracking-dashboard.onrender.com"  
    : "http://localhost:8000");

export default API_URL;