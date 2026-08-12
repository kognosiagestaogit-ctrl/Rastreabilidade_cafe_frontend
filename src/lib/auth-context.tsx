import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  apiClient,
  getStoredToken,
  setStoredToken,
  clearStoredToken,
} from "./api-client";

export interface UserSession {
  id: string;
  email: string;
  nome: string;
  role: "admin" | "gerente" | "funcionario";
  ativo: boolean;
}

const SESSION_KEY = "pedra_negra_user_session";

type AuthContextType = {
  user: UserSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Tenta restaurar sessão salva e valida o token com o backend
  useEffect(() => {
    const restore = async () => {
      const token = getStoredToken();
      const storedSession = typeof window !== "undefined"
        ? localStorage.getItem(SESSION_KEY)
        : null;

      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        // Valida o token junto ao backend buscando o usuário atual
        const me = await apiClient.get<UserSession>("/api/auth/me");
        setUser(me);
      } catch {
        // Token inválido ou expirado — limpa tudo
        clearStoredToken();
        if (typeof window !== "undefined") localStorage.removeItem(SESSION_KEY);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    restore();
  }, []);

  // Escuta o evento de 401 disparado pelo api-client
  useEffect(() => {
    const handleUnauthorized = () => {
      clearStoredToken();
      if (typeof window !== "undefined") localStorage.removeItem(SESSION_KEY);
      setUser(null);
    };

    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    const data = await apiClient.post<{ token: string; user: UserSession }>("/api/auth/login", {
      email: email.trim().toLowerCase(),
      password,
    });

    console.log("dat: ", data)

    setStoredToken(data.token);
    setUser(data.user);

    if (typeof window !== "undefined") {
      localStorage.setItem(SESSION_KEY, JSON.stringify(data.user));
    }
  };

  const logout = () => {
    clearStoredToken();
    setUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(SESSION_KEY);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro do AuthProvider");
  return ctx;
}
