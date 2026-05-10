import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export type NotifType =
  | "split_request"
  | "payment_received"
  | "split_settled"
  | "group_added"
  | "reminder";

export interface AppNotification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  amount?: number;
  groupId?: string;
  fromPerson?: string;
  read: boolean;
  createdAt: string;
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (n: Omit<AppNotification, "id" | "read" | "createdAt">) => Promise<void>;
  markAllRead: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

const NotifContext = createContext<NotificationContextType | undefined>(undefined);
const NOTIF_KEY = "@expensebuddy_notifications";

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const s = await AsyncStorage.getItem(NOTIF_KEY);
      if (s) setNotifications(JSON.parse(s));
    } catch {}
  };

  const save = async (ns: AppNotification[]) => {
    setNotifications(ns);
    await AsyncStorage.setItem(NOTIF_KEY, JSON.stringify(ns));
  };

  const addNotification = useCallback(
    async (n: Omit<AppNotification, "id" | "read" | "createdAt">) => {
      const newN: AppNotification = {
        ...n,
        id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
        read: false,
        createdAt: new Date().toISOString(),
      };
      const current = await AsyncStorage.getItem(NOTIF_KEY);
      const existing: AppNotification[] = current ? JSON.parse(current) : [];
      await save([newN, ...existing]);
    },
    []
  );

  const markRead = useCallback(async (id: string) => {
    const current = await AsyncStorage.getItem(NOTIF_KEY);
    const existing: AppNotification[] = current ? JSON.parse(current) : [];
    await save(existing.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllRead = useCallback(async () => {
    const current = await AsyncStorage.getItem(NOTIF_KEY);
    const existing: AppNotification[] = current ? JSON.parse(current) : [];
    await save(existing.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(async () => {
    await save([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotifContext.Provider
      value={{ notifications, unreadCount, addNotification, markAllRead, markRead, clearAll }}
    >
      {children}
    </NotifContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotifContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
