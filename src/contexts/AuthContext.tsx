import {IAuthProviderProps} from "@/interfaces/IAuthProviderProps.tsx";
import {createContext, FC, useContext, useState} from "react";
import {IAuthContext} from "@/interfaces/IAuthContext.tsx";
import axios from "axios";

const AuthContext = createContext<IAuthContext | undefined>(undefined);

export const AuthProvider: FC<IAuthProviderProps> = ({children}) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const login = async (username: string, password: string) => {
    try {
      const response = await axios.post(
        "http://localhost:8080/api/auth/login",
        {username, password},
        {withCredentials: true}
      );
      setAccessToken(response.data.access_token);
    } catch (error) {
      console.error(error);
    }
  };

  const refresh = async () => {
    const response = await axios.post(
      "http://localhost:8080/api/auth/refresh",
      {withCredentials: true}
    );
    setAccessToken(response.data.access_token);
  }

  const logout = async () => {
    await axios.post(
      "http://localhost:8080/api/auth/refresh",
      {},
      {withCredentials: true}
    );
    setAccessToken(null);
  };

  return (
    <AuthContext.Provider value={{accessToken, login, refresh, logout}}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider")
  }
  return context;
}
