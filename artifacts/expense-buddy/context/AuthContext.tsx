import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

export interface User {
  id: string;
  phone: string;
  name: string;
  upiId: string;
  walletBalance: number;
  totalOwed: number;
  totalOwe: number;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  sendOTP: (phone: string) => Promise<void>;
  verifyOTP: (phone: string, otp: string) => Promise<boolean>;
  updateProfile: (name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_KEY = "@expensebuddy_auth";
const USER_KEY = "@expensebuddy_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const stored = await AsyncStorage.getItem(USER_KEY);
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const sendOTP = async (_phone: string) => {
    await new Promise((r) => setTimeout(r, 1000));
  };

  const verifyOTP = async (phone: string, otp: string): Promise<boolean> => {
    await new Promise((r) => setTimeout(r, 1200));
    if (otp.length !== 6) return false;

    const existing = await AsyncStorage.getItem(USER_KEY);
    let u: User;
    if (existing) {
      u = JSON.parse(existing);
    } else {
      u = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        phone,
        name: "",
        upiId: phone + "@expensebuddy",
        walletBalance: 2450.0,
        totalOwed: 1280.5,
        totalOwe: 340.0,
      };
    }
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(u));
    await AsyncStorage.setItem(AUTH_KEY, "true");
    setUser(u);
    return true;
  };

  const updateProfile = async (name: string) => {
    if (!user) return;
    const updated = { ...user, name };
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(updated));
    setUser(updated);
  };

  const logout = async () => {
    await AsyncStorage.removeItem(AUTH_KEY);
    await AsyncStorage.removeItem(USER_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        sendOTP,
        verifyOTP,
        updateProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
