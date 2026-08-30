import axios from 'axios';

// baseURL vazio utiliza o proxy reverso do Vite (/api -> http://localhost:8080) em dev ou Nginx em prod
const API_BASE_URL = import.meta.env.VITE_PUBLIC_URL_API || '';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
