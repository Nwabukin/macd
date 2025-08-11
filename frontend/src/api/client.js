import axios from 'axios';

const apiBaseUrl =
  process.env.REACT_APP_BACKEND_URL?.replace(/\/$/, '') || 'http://localhost:5000';

export const api = axios.create({
  baseURL: `${apiBaseUrl}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
});

// Attach Authorization header if token exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Simple response handler
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Optional: redirect to login on 401
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const health = async () => {
  const res = await fetch(`${apiBaseUrl}/health`);
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
};

export default api;


