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

export interface Group {
  id: string;
  name: string;
  type: GroupType;
  members: Member[];
  totalExpenses: number;
  myBalance: number;
  walletBalance: number;
  walletLimit: number;
  walletTransactions: WalletTx[];
  expenses: Expense[];
  createdAt: string;
}

export interface WalletTx {
  id: string;
  type: "credit" | "debit";
  amount: number;
  description: string;
  by: string;
  date: string;
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
  addWalletContribution: (groupId: string, amount: number, by: string) => Promise<void>;
  sendMoney: (toName: string, toPhone: string, amount: number, note: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const GROUPS_KEY = "@expensebuddy_groups";
const TXS_KEY = "@expensebuddy_transactions";

const MEMBER_COLORS = ["#7C5CFF", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8"];

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
    totalExpenses: 11700,
    myBalance: 480,
    walletBalance: 4200,
    walletLimit: 10000,
    walletTransactions: [
      { id: "wt1", type: "credit", amount: 1000, description: "Monthly contribution", by: "You", date: "2026-05-01" },
      { id: "wt2", type: "debit", amount: 850, description: "Grocery run - Bigbasket", by: "Rahul Sharma", date: "2026-05-03" },
      { id: "wt3", type: "credit", amount: 1000, description: "Monthly contribution", by: "Priya Nair", date: "2026-05-01" },
      { id: "wt4", type: "debit", amount: 320, description: "Electricity bill part", by: "You", date: "2026-05-05" },
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
      {
        id: "e3", groupId: "g1", title: "Electricity Bill", amount: 1280, paidBy: "u3", paidByName: "Priya Nair",
        splits: [
          { userId: "me", amount: 320, settled: false },
          { userId: "u2", amount: 320, settled: true },
          { userId: "u3", amount: 320, settled: true },
          { userId: "u4", amount: 320, settled: false },
        ],
        date: "2026-05-06", category: "Utilities"
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
    totalExpenses: 18600,
    myBalance: -820,
    walletBalance: 2400,
    walletLimit: 20000,
    walletTransactions: [
      { id: "wt5", type: "credit", amount: 5000, description: "Trip fund contribution", by: "You", date: "2026-04-20" },
      { id: "wt6", type: "debit", amount: 4200, description: "Hotel booking - 2 nights", by: "Rahul Sharma", date: "2026-05-02" },
      { id: "wt7", type: "debit", amount: 3800, description: "Scooter rentals + fuel", by: "Sneha Patel", date: "2026-05-04" },
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

  useEffect(() => {
    loadData();
  }, []);

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
    const g: Group = {
      id: Date.now().toString(),
      name,
      type,
      members: [{ id: "me", name: "You", phone: "", initials: "ME", color: "#7C5CFF", contribution: 0 }],
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
      id: Date.now().toString(),
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
          return {
            ...e,
            splits: e.splits.map((s) => (s.userId === userId ? { ...s, settled: true } : s)),
          };
        }),
      };
    });
    await saveGroups(updated);
  };

  const addWalletContribution = async (groupId: string, amount: number, by: string) => {
    const updated = groups.map((g) => {
      if (g.id !== groupId) return g;
      const tx: WalletTx = {
        id: Date.now().toString(),
        type: "credit",
        amount,
        description: "Wallet contribution",
        by,
        date: new Date().toISOString().split("T")[0],
      };
      return {
        ...g,
        walletBalance: g.walletBalance + amount,
        walletTransactions: [tx, ...g.walletTransactions],
      };
    });
    await saveGroups(updated);
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

  const refreshData = async () => {
    await loadData();
  };

  return (
    <DataContext.Provider
      value={{ groups, transactions, isLoading, createGroup, addExpense, settleExpense, addWalletContribution, sendMoney, refreshData }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
