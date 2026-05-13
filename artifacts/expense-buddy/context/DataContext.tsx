import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

export type GroupType = "flatmates" | "trip" | "hostel" | "party" | "office";

export interface Member {
  id: string;
  name: string;
  phone: string;
  initials: string;
  color: string;
  contribution: number;
}

export interface WalletMember {
  userId: string;
  role: "admin" | "member";
  spendingLimit: number;
  dailyLimit: number;
  totalContributed: number;
  totalSpent: number;
}

export interface WalletSettings {
  name: string;
  description: string;
  minBalanceAlert: number;
  maxTxAmount: number;
  frozen: boolean;
  alertEnabled: boolean;
}

export interface ExpenseSplit {
  userId: string;
  amount: number;
  settled: boolean;
}

export interface Expense {
  id: string;
  groupId: string;
  title: string;
  amount: number;
  paidBy: string;
  paidByName: string;
  splits: ExpenseSplit[];
  date: string;
  category: string;
  note?: string;
}

export interface WalletTx {
  id: string;
  type: "credit" | "debit";
  amount: number;
  description: string;
  category: string;
  by: string;
  byId: string;
  date: string;
  timestamp: string;
}

export interface Group {
  id: string;
  name: string;
  type: GroupType;
  members: Member[];
  walletMembers: WalletMember[];
  walletSettings: WalletSettings;
  totalExpenses: number;
  myBalance: number;
  walletBalance: number;
  walletLimit: number;
  walletTransactions: WalletTx[];
  expenses: Expense[];
  createdAt: string;
}

export interface Transaction {
  id: string;
  type: "sent" | "received" | "split_paid" | "split_received" | "wallet_in" | "wallet_out";
  amount: number;
  description: string;
  person: string;
  personInitials: string;
  personColor: string;
  date: string;
  category: string;
  groupId?: string;
  settled: boolean;
}

interface DataContextType {
  groups: Group[];
  transactions: Transaction[];
  isLoading: boolean;
  createGroup: (name: string, type: GroupType) => Promise<Group>;
  addExpense: (expense: Omit<Expense, "id">) => Promise<void>;
  settleExpense: (groupId: string, expenseId: string, userId: string) => Promise<void>;
  addWalletContribution: (groupId: string, amount: number, by: string, byId?: string) => Promise<{ success: boolean; error?: string }>;
  spendFromWallet: (groupId: string, amount: number, description: string, category: string, by: string, byId: string) => Promise<{ success: boolean; error?: string }>;
  applyWalletSpent: (groupId: string, splits: { userId: string; amount: number }[]) => Promise<void>;
  updateWalletSettings: (groupId: string, settings: Partial<WalletSettings>) => Promise<void>;
  updateWalletMember: (groupId: string, userId: string, updates: Partial<WalletMember>) => Promise<void>;
  freezeWallet: (groupId: string, frozen: boolean) => Promise<void>;
  sendMoney: (toName: string, toPhone: string, amount: number, note: string) => Promise<void>;
  refreshData: () => Promise<void>;
  addGroupMember: (groupId: string, member: Omit<Member, "contribution">) => Promise<void>;
  removeGroupMember: (groupId: string, memberId: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const GROUPS_KEY = "@expensebuddy_groups_v2";
const TXS_KEY = "@expensebuddy_transactions";

export const MEMBER_COLORS = ["#7C5CFF", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8"];

const makeWalletMembers = (members: Member[], adminId = "me"): WalletMember[] =>
  members.map((m) => ({
    userId: m.id,
    role: m.id === adminId ? "admin" : "member",
    spendingLimit: 0,
    dailyLimit: 0,
    totalContributed: m.contribution,
    totalSpent: 0,
  }));

const SEED_GROUPS: Group[] = [
  {
    id: "g1",
    name: "Sunrise Flatmates",
    type: "flatmates",
    members: [
      { id: "me", name: "You", phone: "", initials: "ME", color: "#7C5CFF", contribution: 3200 },
      { id: "u2", name: "Rahul Sharma", phone: "9876543210", initials: "RS", color: "#FF6B6B", contribution: 2800 },
      { id: "u3", name: "Priya Nair", phone: "9123456780", initials: "PN", color: "#4ECDC4", contribution: 3100 },
      { id: "u4", name: "Amit Kumar", phone: "9988776655", initials: "AK", color: "#45B7D1", contribution: 2600 },
    ],
    walletMembers: [
      { userId: "me", role: "admin", spendingLimit: 0, dailyLimit: 0, totalContributed: 3200, totalSpent: 320 },
      { userId: "u2", role: "member", spendingLimit: 2000, dailyLimit: 0, totalContributed: 2800, totalSpent: 850 },
      { userId: "u3", role: "member", spendingLimit: 0, dailyLimit: 1500, totalContributed: 3100, totalSpent: 0 },
      { userId: "u4", role: "member", spendingLimit: 1500, dailyLimit: 0, totalContributed: 2600, totalSpent: 0 },
    ],
    walletSettings: {
      name: "Flatmates Shared Wallet",
      description: "Monthly expenses, groceries and utilities",
      minBalanceAlert: 500,
      maxTxAmount: 5000,
      frozen: false,
      alertEnabled: true,
    },
    totalExpenses: 11700,
    myBalance: 480,
    walletBalance: 4200,
    walletLimit: 10000,
    walletTransactions: [
      { id: "wt1", type: "credit", amount: 1000, description: "Monthly contribution", category: "Contribution", by: "You", byId: "me", date: "2026-05-01", timestamp: "2026-05-01T10:00:00Z" },
      { id: "wt2", type: "debit", amount: 850, description: "Grocery run - Bigbasket", category: "Groceries", by: "Rahul Sharma", byId: "u2", date: "2026-05-03", timestamp: "2026-05-03T15:30:00Z" },
      { id: "wt3", type: "credit", amount: 1000, description: "Monthly contribution", category: "Contribution", by: "Priya Nair", byId: "u3", date: "2026-05-01", timestamp: "2026-05-01T11:00:00Z" },
      { id: "wt4", type: "debit", amount: 320, description: "Electricity bill part", category: "Utilities", by: "You", byId: "me", date: "2026-05-05", timestamp: "2026-05-05T09:00:00Z" },
      { id: "wt5", type: "credit", amount: 800, description: "Monthly contribution", category: "Contribution", by: "Amit Kumar", byId: "u4", date: "2026-05-01", timestamp: "2026-05-01T12:00:00Z" },
    ],
    expenses: [
      {
        id: "e1", groupId: "g1", title: "Monthly Groceries", amount: 3400, paidBy: "me", paidByName: "You",
        splits: [
          { userId: "me", amount: 850, settled: true },
          { userId: "u2", amount: 850, settled: false },
          { userId: "u3", amount: 850, settled: true },
          { userId: "u4", amount: 850, settled: false },
        ],
        date: "2026-05-10", category: "Groceries"
      },
      {
        id: "e2", groupId: "g1", title: "Internet Bill", amount: 999, paidBy: "u2", paidByName: "Rahul Sharma",
        splits: [
          { userId: "me", amount: 250, settled: false },
          { userId: "u2", amount: 250, settled: true },
          { userId: "u3", amount: 250, settled: true },
          { userId: "u4", amount: 249, settled: false },
        ],
        date: "2026-05-08", category: "Utilities"
      },
    ],
    createdAt: "2026-01-15",
  },
  {
    id: "g2",
    name: "Goa Trip 2026",
    type: "trip",
    members: [
      { id: "me", name: "You", phone: "", initials: "ME", color: "#7C5CFF", contribution: 5000 },
      { id: "u2", name: "Rahul Sharma", phone: "9876543210", initials: "RS", color: "#FF6B6B", contribution: 5000 },
      { id: "u5", name: "Sneha Patel", phone: "9234567890", initials: "SP", color: "#96CEB4", contribution: 5000 },
    ],
    walletMembers: [
      { userId: "me", role: "admin", spendingLimit: 0, dailyLimit: 0, totalContributed: 5000, totalSpent: 0 },
      { userId: "u2", role: "member", spendingLimit: 5000, dailyLimit: 3000, totalContributed: 5000, totalSpent: 4200 },
      { userId: "u5", role: "member", spendingLimit: 4000, dailyLimit: 0, totalContributed: 5000, totalSpent: 3800 },
    ],
    walletSettings: {
      name: "Goa Trip Fund",
      description: "All trip expenses - hotels, food, transport",
      minBalanceAlert: 1000,
      maxTxAmount: 10000,
      frozen: false,
      alertEnabled: true,
    },
    totalExpenses: 18600,
    myBalance: -820,
    walletBalance: 2400,
    walletLimit: 20000,
    walletTransactions: [
      { id: "wt6", type: "credit", amount: 5000, description: "Trip fund contribution", category: "Contribution", by: "You", byId: "me", date: "2026-04-20", timestamp: "2026-04-20T09:00:00Z" },
      { id: "wt7", type: "debit", amount: 4200, description: "Hotel booking - 2 nights", category: "Hotel", by: "Rahul Sharma", byId: "u2", date: "2026-05-02", timestamp: "2026-05-02T11:00:00Z" },
      { id: "wt8", type: "debit", amount: 3800, description: "Scooter rentals + fuel", category: "Transport", by: "Sneha Patel", byId: "u5", date: "2026-05-04", timestamp: "2026-05-04T10:00:00Z" },
      { id: "wt9", type: "credit", amount: 5000, description: "Trip fund contribution", category: "Contribution", by: "Rahul Sharma", byId: "u2", date: "2026-04-20", timestamp: "2026-04-20T10:00:00Z" },
    ],
    expenses: [
      {
        id: "e4", groupId: "g2", title: "Hotel Booking", amount: 8400, paidBy: "u2", paidByName: "Rahul Sharma",
        splits: [
          { userId: "me", amount: 2800, settled: false },
          { userId: "u2", amount: 2800, settled: true },
          { userId: "u5", amount: 2800, settled: true },
        ],
        date: "2026-05-02", category: "Hotel"
      },
      {
        id: "e5", groupId: "g2", title: "Beach Restaurant Dinner", amount: 2760, paidBy: "me", paidByName: "You",
        splits: [
          { userId: "me", amount: 920, settled: true },
          { userId: "u2", amount: 920, settled: false },
          { userId: "u5", amount: 920, settled: true },
        ],
        date: "2026-05-03", category: "Food"
      },
    ],
    createdAt: "2026-04-10",
  },
];

const SEED_TXS: Transaction[] = [
  { id: "t1", type: "sent", amount: 500, description: "Rent share", person: "Rahul Sharma", personInitials: "RS", personColor: "#FF6B6B", date: "2026-05-09", category: "Rent", settled: true },
  { id: "t2", type: "received", amount: 250, description: "Dinner split", person: "Priya Nair", personInitials: "PN", personColor: "#4ECDC4", date: "2026-05-08", category: "Food", settled: true },
  { id: "t3", type: "split_paid", amount: 3400, description: "Monthly Groceries", person: "Flatmates", personInitials: "FL", personColor: "#45B7D1", date: "2026-05-10", category: "Groceries", groupId: "g1", settled: false },
  { id: "t4", type: "received", amount: 820, description: "Movie tickets reimbursement", person: "Amit Kumar", personInitials: "AK", date: "2026-05-07", personColor: "#96CEB4", category: "Entertainment", settled: true },
  { id: "t5", type: "sent", amount: 180, description: "Coffee + snacks", person: "Sneha Patel", personInitials: "SP", personColor: "#DDA0DD", date: "2026-05-06", category: "Food", settled: true },
  { id: "t6", type: "wallet_in", amount: 1000, description: "Goa Trip wallet", person: "Goa Trip 2026", personInitials: "GT", personColor: "#FFEAA7", date: "2026-05-05", category: "Wallet", settled: true },
  { id: "t7", type: "sent", amount: 2800, description: "Hotel booking share", person: "Rahul Sharma", personInitials: "RS", personColor: "#FF6B6B", date: "2026-05-02", category: "Hotel", settled: false },
];

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [storedGroups, storedTxs] = await Promise.all([
        AsyncStorage.getItem(GROUPS_KEY),
        AsyncStorage.getItem(TXS_KEY),
      ]);
      if (storedGroups) {
        setGroups(JSON.parse(storedGroups));
      } else {
        setGroups(SEED_GROUPS);
        await AsyncStorage.setItem(GROUPS_KEY, JSON.stringify(SEED_GROUPS));
      }
      if (storedTxs) {
        setTransactions(JSON.parse(storedTxs));
      } else {
        setTransactions(SEED_TXS);
        await AsyncStorage.setItem(TXS_KEY, JSON.stringify(SEED_TXS));
      }
    } catch {
      setGroups(SEED_GROUPS);
      setTransactions(SEED_TXS);
    } finally {
      setIsLoading(false);
    }
  };

  const saveGroups = async (g: Group[]) => {
    setGroups(g);
    await AsyncStorage.setItem(GROUPS_KEY, JSON.stringify(g));
  };

  const saveTxs = async (t: Transaction[]) => {
    setTransactions(t);
    await AsyncStorage.setItem(TXS_KEY, JSON.stringify(t));
  };

  const createGroup = async (name: string, type: GroupType): Promise<Group> => {
    const members: Member[] = [{ id: "me", name: "You", phone: "", initials: "ME", color: "#7C5CFF", contribution: 0 }];
    const g: Group = {
      id: Date.now().toString(),
      name,
      type,
      members,
      walletMembers: makeWalletMembers(members),
      walletSettings: {
        name: `${name} Wallet`,
        description: "",
        minBalanceAlert: 500,
        maxTxAmount: 0,
        frozen: false,
        alertEnabled: true,
      },
      totalExpenses: 0,
      myBalance: 0,
      walletBalance: 0,
      walletLimit: 5000,
      walletTransactions: [],
      expenses: [],
      createdAt: new Date().toISOString().split("T")[0],
    };
    await saveGroups([...groups, g]);
    return g;
  };

  const addExpense = async (expense: Omit<Expense, "id">) => {
    const newExpense: Expense = { ...expense, id: Date.now().toString() };
    const updated = groups.map((g) => {
      if (g.id !== expense.groupId) return g;
      const myShare = expense.splits.find((s) => s.userId === "me")?.amount ?? 0;
      const delta = expense.paidBy === "me" ? expense.amount - myShare : -myShare;
      return {
        ...g,
        expenses: [newExpense, ...g.expenses],
        totalExpenses: g.totalExpenses + expense.amount,
        myBalance: g.myBalance + delta,
      };
    });
    await saveGroups(updated);
    const tx: Transaction = {
      id: (Date.now() + 1).toString(),
      type: "split_paid",
      amount: expense.amount,
      description: expense.title,
      person: "Group",
      personInitials: "GR",
      personColor: MEMBER_COLORS[Math.floor(Math.random() * MEMBER_COLORS.length)],
      date: expense.date,
      category: expense.category,
      groupId: expense.groupId,
      settled: false,
    };
    await saveTxs([tx, ...transactions]);
  };

  const settleExpense = async (groupId: string, expenseId: string, userId: string) => {
    const updated = groups.map((g) => {
      if (g.id !== groupId) return g;
      return {
        ...g,
        expenses: g.expenses.map((e) => {
          if (e.id !== expenseId) return e;
          return { ...e, splits: e.splits.map((s) => (s.userId === userId ? { ...s, settled: true } : s)) };
        }),
      };
    });
    await saveGroups(updated);
  };

  const addWalletContribution = async (
    groupId: string, amount: number, by: string, byId = "me"
  ): Promise<{ success: boolean; error?: string }> => {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return { success: false, error: "Group not found" };
    if (group.walletSettings.frozen) return { success: false, error: "Wallet is frozen" };

    const tx: WalletTx = {
      id: Date.now().toString(),
      type: "credit",
      amount,
      description: "Wallet contribution",
      category: "Contribution",
      by,
      byId,
      date: new Date().toISOString().split("T")[0],
      timestamp: new Date().toISOString(),
    };
    const updated = groups.map((g) => {
      if (g.id !== groupId) return g;
      const walletMembers = g.walletMembers.map((wm) =>
        wm.userId === byId ? { ...wm, totalContributed: wm.totalContributed + amount } : wm
      );
      return {
        ...g,
        walletBalance: g.walletBalance + amount,
        walletTransactions: [tx, ...g.walletTransactions],
        walletMembers,
      };
    });
    await saveGroups(updated);
    const globalTx: Transaction = {
      id: (Date.now() + 1).toString(),
      type: "wallet_in",
      amount,
      description: `${group.walletSettings.name || group.name} Wallet`,
      person: group.name,
      personInitials: group.name.substring(0, 2).toUpperCase(),
      personColor: "#7C5CFF",
      date: new Date().toISOString().split("T")[0],
      category: "Wallet",
      groupId,
      settled: true,
    };
    await saveTxs([globalTx, ...transactions]);
    return { success: true };
  };

  const spendFromWallet = async (
    groupId: string, amount: number, description: string, category: string, by: string, byId: string
  ): Promise<{ success: boolean; error?: string }> => {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return { success: false, error: "Group not found" };
    if (group.walletSettings.frozen) return { success: false, error: "Wallet is currently frozen by the admin" };
    if (group.walletBalance < amount) return { success: false, error: `Insufficient balance. Wallet has ₹${group.walletBalance}` };
    if (group.walletSettings.maxTxAmount > 0 && amount > group.walletSettings.maxTxAmount)
      return { success: false, error: `Amount exceeds max transaction limit of ₹${group.walletSettings.maxTxAmount}` };

    const walletMember = group.walletMembers.find((wm) => wm.userId === byId);
    if (walletMember) {
      if (walletMember.spendingLimit > 0 && amount > walletMember.spendingLimit)
        return { success: false, error: `Amount exceeds your spending limit of ₹${walletMember.spendingLimit}` };
    }

    const tx: WalletTx = {
      id: Date.now().toString(),
      type: "debit",
      amount,
      description,
      category,
      by,
      byId,
      date: new Date().toISOString().split("T")[0],
      timestamp: new Date().toISOString(),
    };

    const newBalance = group.walletBalance - amount;
    const updated = groups.map((g) => {
      if (g.id !== groupId) return g;
      return {
        ...g,
        walletBalance: newBalance,
        walletTransactions: [tx, ...g.walletTransactions],
      };
    });
    await saveGroups(updated);
    return { success: true };
  };

  const applyWalletSpent = async (
    groupId: string,
    splits: { userId: string; amount: number }[]
  ): Promise<void> => {
    const updated = groups.map((g) => {
      if (g.id !== groupId) return g;
      const walletMembers = g.walletMembers.map((wm) => {
        const split = splits.find((s) => s.userId === wm.userId);
        return split ? { ...wm, totalSpent: wm.totalSpent + split.amount } : wm;
      });
      return { ...g, walletMembers };
    });
    await saveGroups(updated);
  };

  const updateWalletSettings = async (groupId: string, settings: Partial<WalletSettings>) => {
    const updated = groups.map((g) => {
      if (g.id !== groupId) return g;
      return { ...g, walletSettings: { ...g.walletSettings, ...settings } };
    });
    await saveGroups(updated);
  };

  const updateWalletMember = async (groupId: string, userId: string, updates: Partial<WalletMember>) => {
    const updated = groups.map((g) => {
      if (g.id !== groupId) return g;
      return {
        ...g,
        walletMembers: g.walletMembers.map((wm) => wm.userId === userId ? { ...wm, ...updates } : wm),
      };
    });
    await saveGroups(updated);
  };

  const freezeWallet = async (groupId: string, frozen: boolean) => {
    await updateWalletSettings(groupId, { frozen });
  };

  const sendMoney = async (toName: string, _toPhone: string, amount: number, note: string) => {
    await new Promise((r) => setTimeout(r, 1500));
    const tx: Transaction = {
      id: Date.now().toString(),
      type: "sent",
      amount,
      description: note || "Money transfer",
      person: toName,
      personInitials: toName.substring(0, 2).toUpperCase(),
      personColor: MEMBER_COLORS[Math.floor(Math.random() * MEMBER_COLORS.length)],
      date: new Date().toISOString().split("T")[0],
      category: "Transfer",
      settled: true,
    };
    await saveTxs([tx, ...transactions]);
  };

  const addGroupMember = async (groupId: string, member: Omit<Member, "contribution">) => {
    const updated = groups.map((g) => {
      if (g.id !== groupId) return g;
      if (g.members.find((m) => m.id === member.id)) return g;
      const newMember = { ...member, contribution: 0 };
      const newWalletMember: WalletMember = {
        userId: member.id,
        role: "member",
        spendingLimit: 0,
        dailyLimit: 0,
        totalContributed: 0,
        totalSpent: 0,
      };
      return {
        ...g,
        members: [...g.members, newMember],
        walletMembers: [...g.walletMembers, newWalletMember],
      };
    });
    await saveGroups(updated);
  };

  const removeGroupMember = async (groupId: string, memberId: string) => {
    if (memberId === "me") return;
    const updated = groups.map((g) => {
      if (g.id !== groupId) return g;
      return {
        ...g,
        members: g.members.filter((m) => m.id !== memberId),
        walletMembers: g.walletMembers.filter((wm) => wm.userId !== memberId),
      };
    });
    await saveGroups(updated);
  };

  const refreshData = async () => { await loadData(); };

  return (
    <DataContext.Provider value={{
      groups, transactions, isLoading,
      createGroup, addExpense, settleExpense,
      addWalletContribution, spendFromWallet, applyWalletSpent,
      updateWalletSettings, updateWalletMember, freezeWallet,
      sendMoney, refreshData, addGroupMember, removeGroupMember,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
