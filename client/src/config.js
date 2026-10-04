import axios from "axios";

// Set VITE_API_URL in client/.env for production (e.g. https://my-api.onrender.com)
export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
};

export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

// One place for auth on every request + expired-session handling.
// Called once from main.jsx.
export function setupAxios() {
  axios.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");

    if (token && !config.headers?.Authorization && !config.headers?.authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  });

  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401 && localStorage.getItem("token")) {
        logout();
        window.location.href = "/login";
      }
      return Promise.reject(error);
    }
  );
}

export const errorMessage = (error, fallback = "Something went wrong") =>
  error.response?.data?.message || fallback;
