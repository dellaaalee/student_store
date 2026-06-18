// Base URL of the Student Store API backend. Override with VITE_API_BASE_URL
// in a .env file if the backend runs on a different host/port.
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3001"
