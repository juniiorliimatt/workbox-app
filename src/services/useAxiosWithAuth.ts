import {useAuth} from "@/contexts/AuthContext.tsx";
import axios from "axios";

export const useAxiosWithAuth = () => {
  const {refresh, accessToken } = useAuth();

  const axiosInstance = axios.create({
    baseURL: "http://localhost:5173",
    withCredentials: true,
  });

  axiosInstance.interceptors.request.use((config) => {
    if(accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  });

  axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
      if(error.response.status === 401) {
        await refresh();
        return axiosInstance(error.config);
      }
      return Promise.reject(error);
    }
  );

  return axiosInstance;
}
