"use client";

import { createContext, useState, useEffect, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api";

interface User {
  id: string;
  email: string;
  username: string;
  fullName: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string, fullName: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem("token");
      if (storedToken) {
        setToken(storedToken);
        try {
          const userData = await api.get("/auth/me");
          setUser({
            id: String(userData.id),
            email: userData.email,
            username: userData.username,
            fullName: userData.full_name || userData.username,
          });
        } catch (error) {
          console.error("Auth check failed:", error);
          localStorage.removeItem("token");
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const params = new URLSearchParams();
      params.append("username", email);
      params.append("password", password);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api"}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });

      const res = await response.json();
      if (!response.ok) {
        throw new Error(res.detail || "Login failed");
      }

      localStorage.setItem("token", res.access_token);
      setToken(res.access_token);
      const userData = await api.get("/auth/me");
      setUser({
        id: String(userData.id),
        email: userData.email,
        username: userData.username,
        fullName: userData.full_name || userData.username,
      });
      router.push("/dashboard");
    } catch (error) {
      throw error;
    }
  };

  const register = async (email: string, username: string, password: string, fullName: string) => {
    try {
      await api.post("/auth/register", { email, username, password, full_name: fullName, role: "user" });
      router.push("/login");
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
