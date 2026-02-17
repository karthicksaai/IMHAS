import axios from "axios";

const API = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export const signup = (data) => axios.post(`${API}/auth/signup`, data);

export const login = (data) => axios.post(`${API}/auth/login`, data);

export const authApi = {
  signup,
  login,
};
