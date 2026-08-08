import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export interface UserSession {
  email: string;
  name: string;
  role: string;
}

const AUTH_STORAGE_KEY = "pedra_negra_user_session";

type AuthContextType = {
  user: UserSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") {
      setIsLoading(false);
      return;
    }
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load auth session", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    await new Promise((resolve) => setTimeout(resolve, 600));

    if (!email.trim() || !password.trim()) {
      throw new Error("Preencha o e-mail e a senha para acessar.");
    }

    if (password.length < 4) {
      throw new Error("A senha deve ter no mínimo 4 caracteres.");
    }

    const namePart = email.split("@")[0] || "Usuário";
    const name = namePart
      .split(".")
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(" ");

    const session: UserSession = {
      email: email.trim().toLowerCase(),
      name: name || "Gestor Agrícola",
      role: "Administrador de Fazenda",
    };

    setUser(session);
    if (typeof window !== "undefined") {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    }
    return true;
  };

  const logout = () => {
    setUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(AUTH_STORAGE_KEY);
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
