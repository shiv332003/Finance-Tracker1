import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WalletMember, useData } from "@/context/DataContext";
import { useNotifications } from "@/context/NotificationContext";
import { useColors } from "@/hooks/useColors";

type WalletTab = "overview" | "members" | "transactions" | "analytics" | "settings";
type PayMethod = "qr" | "phone" | "upi" | "bank" | "contact";
type SplitStep = "ask" | "choose_type" | "unequal_input" | "confirm";
type SplitType = "equal" | "unequal";

const CATEGORIES = ["Groceries", "Food", "Utilities", "Transport", "Hotel", "Entertainment", "Shopping", "Other"];
const CATEGORY_ICONS: Record<string, string> = {
  Groceries: "shopping-cart",
  Food: "coffee",
  Utilities: "zap",
  Transport: "navigation",
  Hotel: "home",
  Entertainment: "film",
  Shopping: "gift",
  Contribution: "arrow-down-circle",
  Other: "more-horizontal",
};

const PAY_METHODS: { id: PayMethod; icon: string; iconLib: "feather" | "mci"; label: string; desc: string; color: string }[] = [
  { id: "qr", icon: "qr-code-scanner", iconLib: "mci", label: "Scan QR", desc: "Scan any UPI QR code", color: "#7C5CFF" },
  { id: "phone", icon: "phone", iconLib: "feather", label: "Phone Number", desc: "Pay via mobile number", color: "#4ECDC4" },
  { id: "upi", icon: "at-sign", iconLib: "feather", label: "UPI ID", desc: "Enter UPI/VPA address", color: "#FF9500" },
  { id: "bank", icon: "credit-card", iconLib: "feather", label: "Bank Transfer", desc: "Account + IFSC transfer", color: "#00D395" },
  { id: "contact", icon: "users", iconLib: "feather", label: "Group Member", desc: "Pay a member directly", color: "#FF6B6B" },
];

function formatTs(ts: string) {
  const d = new Date(ts);
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

interface LastSpend {
  amount: number;
  description: string;
  category: string;
  recipient?: string;
}

export default function WalletScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    groups, addWalletContribution, spendFromWallet, applyWalletSpent,
    updateWalletSettings, updateWalletMember, freezeWallet, addExpense,
  } = useData();
  const { addNotification } = useNotifications();

  const group = groups.find((g) => g.id === id);

  const [tab, setTab] = useState<WalletTab>("overview");

  // Add Funds
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [fundAmount, setFundAmount] = useState("");

  // Pay hub
  const [showPayHub, setShowPayHub] = useState(false);
  const [payMethod, setPayMethod] = useState<PayMethod | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");
  const [payCategory, setPayCategory] = useState("Other");
  const [payPhone, setPayPhone] = useState("");
  const [payUPI, setPayUPI] = useState("");
  const [payBankAcc, setPayBankAcc] = useState("");
  const [payBankIFSC, setPayBankIFSC] = useState("");
  const [payContact, setPayContact] = useState<{ id: string; name: string } | null>(null);
  const [qrScanned, setQrScanned] = useState(false);
  const [qrInfo, setQrInfo] = useState<{ name: string; upi: string } | null>(null);
  const [payProcessing, setPayProcessing] = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);

  // Post-spend split flow
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitStep, setSplitStep] = useState<SplitStep>("ask");
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [lastSpend, setLastSpend] = useState<LastSpend | null>(null);
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  // Member edit
  const [showEditMember, setShowEditMember] = useState<WalletMember | null>(null);
  const [editSpendLimit, setEditSpendLimit] = useState("");
  const [editDailyLimit, setEditDailyLimit] = useState("");

  // Misc
  const [txFilter, setTxFilter] = useState<"all" | "credit" | "debit">("all");
  const [saving, setSaving] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  if (!group) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ color: colors.text }}>Wallet not found</Text>
      </View>
    );
  }

  const ws = group.walletSettings;
  const isAdmin = group.walletMembers.find((wm) => wm.userId === "me")?.role === "admin";
  const myWalletMember = group.walletMembers.find((wm) => wm.userId === "me");
  const pct = Math.min((group.walletBalance / Math.max(group.walletLimit, 1)) * 100, 100);
  const filteredTxs = group.walletTransactions.filter((tx) => txFilter === "all" ? true : tx.type === txFilter);
  const totalContributions = group.walletMembers.reduce((s, wm) => s + wm.totalContributed, 0);
  const totalSpent = group.walletMembers.reduce((s, wm) => s + wm.totalSpent, 0);

  const categorySpending = useMemo(() => {
    const map: Record<string, number> = {};
    group.walletTransactions.filter((t) => t.type === "debit").forEach((t) => {
      map[t.category] = (map[t.category] ?? 0) + t.amount;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [group.walletTransactions]);

  const equalShare = lastSpend && selectedMembers.length > 0 ? lastSpend.amount / selectedMembers.length : 0;
  const customTotal = Object.values(customSplits).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const customRemaining = lastSpend ? lastSpend.amount - customTotal : 0;

  const openSplitFlow = (spend: LastSpend) => {
    setLastSpend(spend);
    setSelectedMembers(group.members.map((m) => m.id));
    const initSplits: Record<string, string> = {};
    group.members.forEach((m) => { initSplits[m.id] = ""; });
    setCustomSplits(initSplits);
    setSplitStep("ask");
    setShowSplitModal(true);
  };

  const toggleMember = (uid: string) => {
    setSelectedMembers((prev) => prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid]);
  };

  const confirmSplit = async () => {
    if (!lastSpend || selectedMembers.length === 0) return;
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const memberSplits = group.members
      .filter((m) => selectedMembers.includes(m.id))
      .map((m) => ({
        userId: m.id,
        amount: splitType === "equal" ? equalShare : (parseFloat(customSplits[m.id]) || 0),
        settled: m.id === "me",
      }));

    // Record as group expense
    await addExpense({
      groupId: group.id, title: lastSpend.description, amount: lastSpend.amount,
      paidBy: "me", paidByName: "You", splits: memberSplits,
      date: new Date().toISOString().split("T")[0], category: lastSpend.category,
    });

    // Update each member's totalSpent by only their share (not the full amount)
    await applyWalletSpent(
      group.id,
      memberSplits.map((s) => ({ userId: s.userId, amount: s.amount }))
    );

    // Notify each member of their share
    for (const m of group.members.filter((m) => selectedMembers.includes(m.id) && m.id !== "me")) {
      const share = splitType === "equal" ? equalShare : (parseFloat(customSplits[m.id]) || 0);
      await addNotification({
        type: "split_request",
        title: `${m.name} owes ₹${share.toFixed(0)}`,
        body: `Wallet expense "${lastSpend.description}" — ${m.name}'s share is ₹${share.toFixed(0)}`,
        amount: share, groupId: group.id,
      });
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaving(false);
    setShowSplitModal(false);
    setSplitStep("ask");
  };

  // When user skips the split, the full amount is attributed to the payer (me)
  const skipSplit = async () => {
    if (lastSpend) {
      await applyWalletSpent(group.id, [{ userId: "me", amount: lastSpend.amount }]);
    }
    setShowSplitModal(false);
    setSplitStep("ask");
  };

  // ─── Add Funds ────────────────────────────────────────────────────────────
  const handleAddFunds = async () => {
    if (!fundAmount) return;
    setSaving(true);
    try {
      const amt = parseFloat(fundAmount);
      const result = await addWalletContribution(group.id, amt, "You", "me");
      if (!result.success) { setSaving(false); return; }
      await addNotification({
        type: "payment_received",
        title: `₹${amt.toFixed(0)} added to ${ws.name}`,
        body: `You contributed ₹${amt.toFixed(0)} to the shared wallet`,
        amount: amt, groupId: group.id,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setFundAmount("");
      setShowAddFunds(false);
    } finally {
      setSaving(false);
    }
  };

  // ─── QR simulation ────────────────────────────────────────────────────────
  const simulateQRScan = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setQrScanned(false);
    setTimeout(() => {
      const fakeVendors = [
        { name: "Swiggy Food", upi: "swiggy@icici" },
        { name: "Big Bazaar", upi: "bigbazaar@sbi" },
        { name: "Ola Cabs", upi: "ola@paytm" },
        { name: "Blinkit", upi: "blinkit@hdfc" },
      ];
      const v = fakeVendors[Math.floor(Math.random() * fakeVendors.length)];
      setQrInfo(v);
      setPayNote(`Payment to ${v.name}`);
      setQrScanned(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 1500);
  };

  // ─── Validate recipient for each method ───────────────────────────────────
  const isRecipientValid = () => {
    if (!payMethod) return false;
    if (payMethod === "qr") return qrScanned && !!qrInfo;
    if (payMethod === "phone") return payPhone.length === 10;
    if (payMethod === "upi") return payUPI.includes("@");
    if (payMethod === "bank") return payBankAcc.length >= 9 && payBankIFSC.length === 11;
    if (payMethod === "contact") return !!payContact;
    return false;
  };

  const getRecipientName = () => {
    if (payMethod === "qr" && qrInfo) return qrInfo.name;
    if (payMethod === "phone") return `+91 ${payPhone}`;
    if (payMethod === "upi") return payUPI;
    if (payMethod === "bank") return `A/c ${payBankAcc}`;
    if (payMethod === "contact") return payContact?.name ?? "";
    return "Recipient";
  };

  // ─── Process wallet payment ───────────────────────────────────────────────
  const handleWalletPay = async () => {
    if (!payAmount || !isRecipientValid()) return;
    setPayProcessing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await new Promise((r) => setTimeout(r, 1400));
    try {
      const amt = parseFloat(payAmount);
      const desc = payNote || `Payment to ${getRecipientName()}`;
      const result = await spendFromWallet(group.id, amt, desc, payCategory, "You", "me");
      if (!result.success) {
        await addNotification({
          type: "reminder",
          title: "Payment Failed",
          body: result.error ?? "Could not complete payment",
          groupId: group.id,
        });
        setPayProcessing(false);
        return;
      }
      setPaySuccess(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await addNotification({
        type: "payment_received",
        title: `₹${amt.toFixed(0)} paid via ${PAY_METHODS.find((p) => p.id === payMethod)?.label}`,
        body: `Paid ₹${amt.toFixed(0)} to ${getRecipientName()} from ${ws.name}`,
        amount: amt, groupId: group.id,
      });
      const newBalance = group.walletBalance - amt;
      if (ws.alertEnabled && newBalance < ws.minBalanceAlert) {
        await addNotification({
          type: "reminder",
          title: "⚠️ Low Wallet Balance",
          body: `${ws.name} balance: ₹${newBalance.toFixed(0)} (below ₹${ws.minBalanceAlert} threshold)`,
          amount: newBalance, groupId: group.id,
        });
      }
      const spend: LastSpend = { amount: amt, description: desc, category: payCategory, recipient: getRecipientName() };
      await new Promise((r) => setTimeout(r, 900));
      // Reset pay hub
      setPaySuccess(false);
      setPayProcessing(false);
      setPayAmount("");
      setPayNote("");
      setPayPhone("");
      setPayUPI("");
      setPayBankAcc("");
      setPayBankIFSC("");
      setPayContact(null);
      setQrScanned(false);
      setQrInfo(null);
      setPayMethod(null);
      setShowPayHub(false);
      setTimeout(() => openSplitFlow(spend), 350);
    } catch {
      setPayProcessing(false);
    }
  };

  const handleSaveMember = async () => {
    if (!showEditMember) return;
    await updateWalletMember(group.id, showEditMember.userId, {
      spendingLimit: parseFloat(editSpendLimit) || 0,
      dailyLimit: parseFloat(editDailyLimit) || 0,
    });
    setShowEditMember(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleRoleToggle = async (userId: string, currentRole: "admin" | "member") => {
    if (userId === "me") return;
    await updateWalletMember(group.id, userId, { role: currentRole === "admin" ? "member" : "admin" });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleFreeze = async (frozen: boolean) => {
    await freezeWallet(group.id, frozen);
    await addNotification({
      type: "reminder",
      title: frozen ? "Wallet Frozen" : "Wallet Unfrozen",
      body: frozen ? `${ws.name} has been frozen.` : `${ws.name} is active again.`,
      groupId: group.id,
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  };

  const TABS: { key: WalletTab; icon: string; label: string }[] = [
    { key: "overview", icon: "home", label: "Overview" },
    { key: "members", icon: "users", label: "Members" },
    { key: "transactions", icon: "list", label: "History" },
    { key: "analytics", icon: "bar-chart-2", label: "Analytics" },
    { key: "settings", icon: "settings", label: "Settings" },
  ];

  const selectedMethodMeta = PAY_METHODS.find((p) => p.id === payMethod);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{ws.name || group.name}</Text>
          <View style={styles.headerStatusRow}>
            {ws.frozen && (
              <View style={[styles.frozenBadge, { backgroundColor: colors.warning + "22" }]}>
                <Feather name="lock" size={10} color={colors.warning} />
                <Text style={[styles.frozenText, { color: colors.warning }]}>Frozen</Text>
              </View>
            )}
            {isAdmin && (
              <View style={[styles.adminBadge, { backgroundColor: colors.primary + "22" }]}>
                <Text style={[styles.adminText, { color: colors.primary }]}>Admin</Text>
              </View>
            )}
          </View>
        </View>
        {!ws.frozen && (
          <View style={styles.headerActions}>
            <Pressable style={[styles.headerBtn, { backgroundColor: colors.success + "18" }]} onPress={() => setShowAddFunds(true)}>
              <Feather name="plus" size={14} color={colors.success} />
              <Text style={[styles.headerBtnText, { color: colors.success }]}>Add</Text>
            </Pressable>
            <Pressable style={[styles.headerBtn, { backgroundColor: colors.primary }]} onPress={() => { setPayMethod(null); setShowPayHub(true); }}>
              <Feather name="zap" size={14} color="#fff" />
              <Text style={[styles.headerBtnText, { color: "#fff" }]}>Pay</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Balance Hero */}
      <View style={[styles.balanceHero, { backgroundColor: ws.frozen ? colors.warning + "18" : colors.primary }]}>
        <Text style={[styles.heroLabel, { color: ws.frozen ? colors.warning : "rgba(255,255,255,0.75)" }]}>
          {ws.frozen ? "WALLET FROZEN" : "SHARED BALANCE"}
        </Text>
        <Text style={[styles.heroBalance, { color: ws.frozen ? colors.warning : "#fff" }]}>
          ₹{group.walletBalance.toLocaleString("en-IN")}
        </Text>
        <View style={[styles.progressTrack, { backgroundColor: ws.frozen ? colors.warning + "33" : "rgba(255,255,255,0.25)" }]}>
          <View style={[styles.progressFill, { width: `${pct}%` as any, backgroundColor: ws.frozen ? colors.warning : "#fff" }]} />
        </View>
        <Text style={[styles.progressLabel, { color: ws.frozen ? colors.warning : "rgba(255,255,255,0.75)" }]}>
          ₹{group.walletBalance.toLocaleString("en-IN")} / ₹{group.walletLimit.toLocaleString("en-IN")} limit
        </Text>
        {ws.alertEnabled && group.walletBalance < ws.minBalanceAlert && (
          <View style={styles.alertBanner}>
            <Feather name="alert-triangle" size={12} color="#fff" />
            <Text style={styles.alertBannerText}>Balance below ₹{ws.minBalanceAlert} alert threshold</Text>
          </View>
        )}
        <View style={styles.heroStats}>
          {[
            { label: "Total In", val: `₹${totalContributions.toLocaleString("en-IN")}` },
            { label: "Total Spent", val: `₹${totalSpent.toLocaleString("en-IN")}` },
            { label: "Members", val: `${group.members.length}` },
          ].map((s, i, arr) => (
            <React.Fragment key={s.label}>
              <View style={styles.heroStat}>
                <Text style={[styles.heroStatVal, { color: ws.frozen ? colors.warning : "#fff" }]}>{s.val}</Text>
                <Text style={[styles.heroStatLabel, { color: ws.frozen ? colors.warning + "88" : "rgba(255,255,255,0.65)" }]}>{s.label}</Text>
              </View>
              {i < arr.length - 1 && <View style={[styles.heroStatDivider, { backgroundColor: ws.frozen ? colors.warning + "44" : "rgba(255,255,255,0.3)" }]} />}
            </React.Fragment>
          ))}
        </View>
      </View>

      {/* Tab strip */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.tabStrip}>
        {TABS.map((t) => (
          <Pressable key={t.key} style={[styles.tabItem, tab === t.key && { backgroundColor: colors.primary }]} onPress={() => setTab(t.key)}>
            <Feather name={t.icon as any} size={14} color={tab === t.key ? "#fff" : colors.mutedForeground} />
            <Text style={[styles.tabItemText, { color: tab === t.key ? "#fff" : colors.mutedForeground }]}>{t.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 80, paddingTop: 12 }}>

        {/* OVERVIEW */}
        {tab === "overview" && (
          <View style={{ paddingHorizontal: 16, gap: 14 }}>
            {/* Pay shortcuts */}
            <View style={styles.payShortcutRow}>
              {PAY_METHODS.map((m) => (
                <Pressable
                  key={m.id}
                  style={[styles.payShortcut, { backgroundColor: m.color + "18" }]}
                  onPress={() => { setPayMethod(m.id); setShowPayHub(true); }}
                >
                  <View style={[styles.payShortcutIcon, { backgroundColor: m.color + "28" }]}>
                    {m.iconLib === "mci"
                      ? <MaterialCommunityIcons name={m.icon as any} size={18} color={m.color} />
                      : <Feather name={m.icon as any} size={18} color={m.color} />
                    }
                  </View>
                  <Text style={[styles.payShortcutLabel, { color: m.color }]} numberOfLines={1}>{m.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>RECENT ACTIVITY</Text>
            {group.walletTransactions.slice(0, 6).map((tx) => (
              <View key={tx.id} style={[styles.txRow, { backgroundColor: colors.card }]}>
                <View style={[styles.txIcon, { backgroundColor: (tx.type === "credit" ? colors.success : colors.destructive) + "20" }]}>
                  <Feather name={(CATEGORY_ICONS[tx.category] ?? "circle") as any} size={16} color={tx.type === "credit" ? colors.success : colors.destructive} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.txDesc, { color: colors.text }]}>{tx.description}</Text>
                  <Text style={[styles.txMeta, { color: colors.mutedForeground }]}>{tx.by} · {formatTs(tx.timestamp)}</Text>
                </View>
                <Text style={[styles.txAmount, { color: tx.type === "credit" ? colors.success : colors.destructive }]}>
                  {tx.type === "credit" ? "+" : "-"}₹{tx.amount.toLocaleString("en-IN")}
                </Text>
              </View>
            ))}
            {group.walletTransactions.length === 0 && (
              <View style={styles.empty}>
                <Feather name="inbox" size={32} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No transactions yet</Text>
              </View>
            )}
            <View style={[styles.descCard, { backgroundColor: colors.card }]}>
              <Feather name="info" size={16} color={colors.primary} />
              <Text style={[styles.descText, { color: colors.mutedForeground }]}>{ws.description || "No description set."}</Text>
            </View>
          </View>
        )}

        {/* MEMBERS */}
        {tab === "members" && (
          <View style={{ paddingHorizontal: 16, gap: 10 }}>
            {group.members.map((m) => {
              const wm = group.walletMembers.find((w) => w.userId === m.id);
              if (!wm) return null;
              const contribPct = totalContributions > 0 ? (wm.totalContributed / totalContributions) * 100 : 0;
              return (
                <View key={m.id} style={[styles.memberCard, { backgroundColor: colors.card }]}>
                  <View style={[styles.memberAvatar, { backgroundColor: m.color + "22" }]}>
                    <Text style={[styles.memberInitials, { color: m.color }]}>{m.initials}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={styles.memberNameRow}>
                      <Text style={[styles.memberName, { color: colors.text }]}>{m.id === "me" ? "You" : m.name}</Text>
                      <View style={[styles.roleBadge, { backgroundColor: wm.role === "admin" ? colors.primary + "22" : colors.success + "16" }]}>
                        <Text style={[styles.roleText, { color: wm.role === "admin" ? colors.primary : colors.success }]}>{wm.role === "admin" ? "Admin" : "Member"}</Text>
                      </View>
                    </View>
                    <View style={styles.memberStats}>
                      <Text style={[styles.memberStat, { color: colors.mutedForeground }]}>In: <Text style={{ color: colors.success }}>₹{wm.totalContributed.toLocaleString("en-IN")}</Text></Text>
                      <Text style={[styles.memberStat, { color: colors.mutedForeground }]}>Spent: <Text style={{ color: colors.destructive }}>₹{wm.totalSpent.toLocaleString("en-IN")}</Text></Text>
                    </View>
                    <View style={[styles.contribBar, { backgroundColor: colors.secondary }]}>
                      <View style={[styles.contribFill, { width: `${contribPct}%` as any, backgroundColor: m.color }]} />
                    </View>
                    <View style={styles.memberLimits}>
                      {wm.spendingLimit > 0 && <Text style={[styles.limitChip, { color: colors.warning, backgroundColor: colors.warning + "16" }]}>Limit ₹{wm.spendingLimit.toLocaleString("en-IN")}</Text>}
                      {wm.dailyLimit > 0 && <Text style={[styles.limitChip, { color: colors.primary, backgroundColor: colors.primary + "16" }]}>Daily ₹{wm.dailyLimit.toLocaleString("en-IN")}</Text>}
                    </View>
                  </View>
                  {isAdmin && m.id !== "me" && (
                    <Pressable style={[styles.editMemberBtn, { backgroundColor: colors.accent }]} onPress={() => { setShowEditMember(wm); setEditSpendLimit(wm.spendingLimit > 0 ? wm.spendingLimit.toString() : ""); setEditDailyLimit(wm.dailyLimit > 0 ? wm.dailyLimit.toString() : ""); }}>
                      <Feather name="edit-2" size={14} color={colors.primary} />
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* TRANSACTIONS */}
        {tab === "transactions" && (
          <View style={{ paddingHorizontal: 16, gap: 10 }}>
            <View style={styles.filterRow}>
              {(["all", "credit", "debit"] as const).map((f) => (
                <Pressable key={f} style={[styles.filterBtn, { backgroundColor: txFilter === f ? colors.primary : colors.card }]} onPress={() => setTxFilter(f)}>
                  <Text style={[styles.filterText, { color: txFilter === f ? "#fff" : colors.mutedForeground }]}>{f === "all" ? "All" : f === "credit" ? "Money In" : "Money Out"}</Text>
                </Pressable>
              ))}
            </View>
            {filteredTxs.length === 0 ? (
              <View style={styles.empty}><Feather name="list" size={32} color={colors.mutedForeground} /><Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No transactions</Text></View>
            ) : filteredTxs.map((tx) => (
              <View key={tx.id} style={[styles.txCard, { backgroundColor: colors.card }]}>
                <View style={[styles.txCardIcon, { backgroundColor: (tx.type === "credit" ? colors.success : colors.destructive) + "18" }]}>
                  <Feather name={(CATEGORY_ICONS[tx.category] ?? "circle") as any} size={18} color={tx.type === "credit" ? colors.success : colors.destructive} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={[styles.txCardDesc, { color: colors.text }]}>{tx.description}</Text>
                  <Text style={[styles.txCardBy, { color: colors.mutedForeground }]}>{tx.by}</Text>
                  <View style={styles.txCardMeta}>
                    <View style={[styles.catChip, { backgroundColor: colors.accent }]}><Text style={[styles.catChipText, { color: colors.primary }]}>{tx.category}</Text></View>
                    <Text style={[styles.txCardDate, { color: colors.mutedForeground }]}>{formatTs(tx.timestamp)}</Text>
                  </View>
                </View>
                <Text style={[styles.txCardAmount, { color: tx.type === "credit" ? colors.success : colors.destructive }]}>
                  {tx.type === "credit" ? "+" : "-"}₹{tx.amount.toLocaleString("en-IN")}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ANALYTICS */}
        {tab === "analytics" && (
          <View style={{ paddingHorizontal: 16, gap: 16 }}>
            <View style={[styles.analyticsCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.analyticsTitle, { color: colors.text }]}>Member Contributions</Text>
              {group.members.map((m) => {
                const wm = group.walletMembers.find((w) => w.userId === m.id);
                if (!wm) return null;
                const pctVal = totalContributions > 0 ? (wm.totalContributed / totalContributions) * 100 : 0;
                return (
                  <View key={m.id} style={styles.analyticsRow}>
                    <View style={[styles.analyticsAvatar, { backgroundColor: m.color + "22" }]}><Text style={[styles.analyticsInitials, { color: m.color }]}>{m.initials}</Text></View>
                    <View style={{ flex: 1, gap: 4 }}>
                      <View style={styles.analyticsNameRow}>
                        <Text style={[styles.analyticsName, { color: colors.text }]}>{m.id === "me" ? "You" : m.name}</Text>
                        <Text style={[styles.analyticsPct, { color: colors.mutedForeground }]}>{pctVal.toFixed(0)}%</Text>
                      </View>
                      <View style={[styles.analyticsBg, { backgroundColor: colors.secondary }]}><View style={[styles.analyticsBar, { width: `${pctVal}%` as any, backgroundColor: m.color }]} /></View>
                      <Text style={[styles.analyticsAmount, { color: colors.mutedForeground }]}>₹{wm.totalContributed.toLocaleString("en-IN")}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
            {categorySpending.length > 0 && (
              <View style={[styles.analyticsCard, { backgroundColor: colors.card }]}>
                <Text style={[styles.analyticsTitle, { color: colors.text }]}>Spending Categories</Text>
                {categorySpending.map(([cat, amt]) => {
                  const pctVal = totalSpent > 0 ? (amt / totalSpent) * 100 : 0;
                  return (
                    <View key={cat} style={styles.analyticsRow}>
                      <View style={[styles.catIconBox, { backgroundColor: colors.primary + "18" }]}><Feather name={(CATEGORY_ICONS[cat] ?? "circle") as any} size={16} color={colors.primary} /></View>
                      <View style={{ flex: 1, gap: 4 }}>
                        <View style={styles.analyticsNameRow}>
                          <Text style={[styles.analyticsName, { color: colors.text }]}>{cat}</Text>
                          <Text style={[styles.analyticsPct, { color: colors.mutedForeground }]}>{pctVal.toFixed(0)}%</Text>
                        </View>
                        <View style={[styles.analyticsBg, { backgroundColor: colors.secondary }]}><View style={[styles.analyticsBar, { width: `${pctVal}%` as any, backgroundColor: colors.primary }]} /></View>
                        <Text style={[styles.analyticsAmount, { color: colors.mutedForeground }]}>₹{amt.toLocaleString("en-IN")}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
            <View style={[styles.summaryGrid, { backgroundColor: colors.card }]}>
              <View style={styles.summaryCell}><Text style={[styles.summaryCellVal, { color: colors.success }]}>₹{totalContributions.toLocaleString("en-IN")}</Text><Text style={[styles.summaryCellLabel, { color: colors.mutedForeground }]}>Contributed</Text></View>
              <View style={[styles.summaryCellDivider, { backgroundColor: colors.border }]} />
              <View style={styles.summaryCell}><Text style={[styles.summaryCellVal, { color: colors.destructive }]}>₹{totalSpent.toLocaleString("en-IN")}</Text><Text style={[styles.summaryCellLabel, { color: colors.mutedForeground }]}>Spent</Text></View>
              <View style={[styles.summaryCellDivider, { backgroundColor: colors.border }]} />
              <View style={styles.summaryCell}><Text style={[styles.summaryCellVal, { color: colors.primary }]}>₹{group.walletBalance.toLocaleString("en-IN")}</Text><Text style={[styles.summaryCellLabel, { color: colors.mutedForeground }]}>Remaining</Text></View>
            </View>
          </View>
        )}

        {/* SETTINGS */}
        {tab === "settings" && (
          <View style={{ paddingHorizontal: 16, gap: 12 }}>
            {!isAdmin && (
              <View style={[styles.noAdminNote, { backgroundColor: colors.warning + "18", borderColor: colors.warning + "33" }]}>
                <Feather name="lock" size={14} color={colors.warning} />
                <Text style={[styles.noAdminText, { color: colors.warning }]}>Only the admin can change settings</Text>
              </View>
            )}
            <View style={[styles.settingSection, { backgroundColor: colors.card }]}>
              <Text style={[styles.settingGroupTitle, { color: colors.text }]}>Wallet Info</Text>
              <View style={styles.settingRow}>
                <Text style={[styles.settingLabel, { color: colors.mutedForeground }]}>Name</Text>
                <TextInput style={[styles.settingInput, { color: colors.text, backgroundColor: colors.secondary, borderColor: colors.border }]} value={ws.name} onChangeText={(v) => isAdmin && updateWalletSettings(group.id, { name: v })} editable={isAdmin} placeholderTextColor={colors.mutedForeground} />
              </View>
              <View style={styles.settingRow}>
                <Text style={[styles.settingLabel, { color: colors.mutedForeground }]}>Description</Text>
                <TextInput style={[styles.settingInput, { color: colors.text, backgroundColor: colors.secondary, borderColor: colors.border }]} value={ws.description} onChangeText={(v) => isAdmin && updateWalletSettings(group.id, { description: v })} editable={isAdmin} placeholder="Describe this wallet" placeholderTextColor={colors.mutedForeground} />
              </View>
            </View>
            <View style={[styles.settingSection, { backgroundColor: colors.card }]}>
              <Text style={[styles.settingGroupTitle, { color: colors.text }]}>Limits</Text>
              <View style={styles.settingRow}>
                <View><Text style={[styles.settingLabel, { color: colors.text }]}>Max Transaction</Text><Text style={[styles.settingHint, { color: colors.mutedForeground }]}>0 = no limit</Text></View>
                <TextInput style={[styles.settingInputSm, { color: colors.text, backgroundColor: colors.secondary, borderColor: colors.border }]} value={ws.maxTxAmount > 0 ? ws.maxTxAmount.toString() : ""} onChangeText={(v) => isAdmin && updateWalletSettings(group.id, { maxTxAmount: parseFloat(v) || 0 })} keyboardType="numeric" editable={isAdmin} placeholder="₹0" placeholderTextColor={colors.mutedForeground} />
              </View>
            </View>
            <View style={[styles.settingSection, { backgroundColor: colors.card }]}>
              <Text style={[styles.settingGroupTitle, { color: colors.text }]}>Low Balance Alert</Text>
              <View style={styles.settingRow}>
                <View style={{ flex: 1 }}><Text style={[styles.settingLabel, { color: colors.text }]}>Enable alerts</Text><Text style={[styles.settingHint, { color: colors.mutedForeground }]}>Notify when balance drops</Text></View>
                <Switch value={ws.alertEnabled} onValueChange={(v) => isAdmin && updateWalletSettings(group.id, { alertEnabled: v })} disabled={!isAdmin} trackColor={{ true: colors.primary, false: colors.border }} />
              </View>
              {ws.alertEnabled && (
                <View style={styles.settingRow}>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>Alert below ₹</Text>
                  <TextInput style={[styles.settingInputSm, { color: colors.text, backgroundColor: colors.secondary, borderColor: colors.border }]} value={ws.minBalanceAlert > 0 ? ws.minBalanceAlert.toString() : ""} onChangeText={(v) => isAdmin && updateWalletSettings(group.id, { minBalanceAlert: parseFloat(v) || 0 })} keyboardType="numeric" editable={isAdmin} placeholder="500" placeholderTextColor={colors.mutedForeground} />
                </View>
              )}
            </View>
            {isAdmin && (
              <View style={[styles.settingSection, { backgroundColor: colors.card }]}>
                <Text style={[styles.settingGroupTitle, { color: colors.text }]}>Wallet Control</Text>
                <View style={styles.settingRow}>
                  <View style={{ flex: 1 }}><Text style={[styles.settingLabel, { color: colors.text }]}>Freeze Wallet</Text><Text style={[styles.settingHint, { color: colors.mutedForeground }]}>Block all transactions</Text></View>
                  <Switch value={ws.frozen} onValueChange={handleFreeze} trackColor={{ true: colors.warning, false: colors.border }} />
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* ═══════════════════════ ADD FUNDS MODAL ══════════════════════════════ */}
      <Modal visible={showAddFunds} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.card }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Add to {ws.name}</Text>
            <View style={[styles.amountRow, { backgroundColor: colors.input, borderColor: colors.border }]}>
              <Text style={[styles.rupee, { color: colors.text }]}>₹</Text>
              <TextInput style={[styles.amountInput, { color: colors.text }]} placeholder="0" placeholderTextColor={colors.mutedForeground} keyboardType="numeric" value={fundAmount} onChangeText={setFundAmount} autoFocus />
            </View>
            <View style={styles.quickAmounts}>
              {[500, 1000, 2000, 5000].map((q) => (
                <Pressable key={q} style={[styles.quickBtn, { backgroundColor: colors.accent }]} onPress={() => setFundAmount(q.toString())}>
                  <Text style={[styles.quickBtnText, { color: colors.text }]}>₹{q.toLocaleString("en-IN")}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.sheetActions}>
              <Pressable style={[styles.sheetBtn, { backgroundColor: colors.secondary }]} onPress={() => setShowAddFunds(false)}>
                <Text style={[styles.sheetBtnText, { color: colors.text }]}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.sheetBtn, { backgroundColor: colors.success, flex: 1.5, opacity: !fundAmount || saving ? 0.5 : 1 }]} onPress={handleAddFunds} disabled={!fundAmount || saving}>
                <Text style={[styles.sheetBtnText, { color: "#fff" }]}>{saving ? "Adding..." : "Add Funds"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ═══════════════════════ PAY HUB MODAL ═══════════════════════════════ */}
      <Modal visible={showPayHub} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.paySheet, { backgroundColor: colors.card }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />

            {/* ── Processing / Success overlay ── */}
            {(payProcessing || paySuccess) && (
              <View style={[styles.payOverlay, { backgroundColor: colors.card }]}>
                {paySuccess ? (
                  <>
                    <View style={[styles.payResultIcon, { backgroundColor: colors.success + "20" }]}>
                      <Feather name="check-circle" size={40} color={colors.success} />
                    </View>
                    <Text style={[styles.payResultTitle, { color: colors.text }]}>Payment Successful!</Text>
                    <Text style={[styles.payResultAmt, { color: colors.success }]}>₹{parseFloat(payAmount || "0").toLocaleString("en-IN")}</Text>
                    <Text style={[styles.payResultSub, { color: colors.mutedForeground }]}>to {getRecipientName()}</Text>
                  </>
                ) : (
                  <>
                    <View style={[styles.payResultIcon, { backgroundColor: colors.primary + "20" }]}>
                      <Feather name="zap" size={40} color={colors.primary} />
                    </View>
                    <Text style={[styles.payResultTitle, { color: colors.text }]}>Processing...</Text>
                    <Text style={[styles.payResultSub, { color: colors.mutedForeground }]}>Deducting from {ws.name}</Text>
                  </>
                )}
              </View>
            )}

            {/* ── Method selector ── */}
            {!payMethod && !payProcessing && !paySuccess && (
              <>
                <View style={styles.payHubHeader}>
                  <Text style={[styles.sheetTitle, { color: colors.text }]}>Pay from Wallet</Text>
                  <View style={[styles.walletBalBadge, { backgroundColor: colors.primary + "18" }]}>
                    <Text style={[styles.walletBalText, { color: colors.primary }]}>₹{group.walletBalance.toLocaleString("en-IN")} available</Text>
                  </View>
                </View>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Choose payment method</Text>
                <View style={styles.methodGrid}>
                  {PAY_METHODS.map((m) => (
                    <Pressable
                      key={m.id}
                      style={[styles.methodCard, { backgroundColor: colors.secondary, borderColor: m.color + "44" }]}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPayMethod(m.id); }}
                    >
                      <View style={[styles.methodIcon, { backgroundColor: m.color + "20" }]}>
                        {m.iconLib === "mci"
                          ? <MaterialCommunityIcons name={m.icon as any} size={24} color={m.color} />
                          : <Feather name={m.icon as any} size={24} color={m.color} />
                        }
                      </View>
                      <Text style={[styles.methodLabel, { color: colors.text }]}>{m.label}</Text>
                      <Text style={[styles.methodDesc, { color: colors.mutedForeground }]}>{m.desc}</Text>
                    </Pressable>
                  ))}
                </View>
                <Pressable style={[styles.sheetBtn, { backgroundColor: colors.secondary }]} onPress={() => setShowPayHub(false)}>
                  <Text style={[styles.sheetBtnText, { color: colors.text }]}>Cancel</Text>
                </Pressable>
              </>
            )}

            {/* ── Payment input form ── */}
            {payMethod && !payProcessing && !paySuccess && (
              <>
                <View style={styles.payFormHeader}>
                  <Pressable style={[styles.backChip, { backgroundColor: colors.secondary }]} onPress={() => { setPayMethod(null); setQrScanned(false); setQrInfo(null); }}>
                    <Feather name="arrow-left" size={14} color={colors.text} />
                  </Pressable>
                  <View style={[styles.methodBadge, { backgroundColor: selectedMethodMeta!.color + "20" }]}>
                    {selectedMethodMeta!.iconLib === "mci"
                      ? <MaterialCommunityIcons name={selectedMethodMeta!.icon as any} size={16} color={selectedMethodMeta!.color} />
                      : <Feather name={selectedMethodMeta!.icon as any} size={16} color={selectedMethodMeta!.color} />
                    }
                    <Text style={[styles.methodBadgeText, { color: selectedMethodMeta!.color }]}>{selectedMethodMeta!.label}</Text>
                  </View>
                </View>

                {/* QR Scanner */}
                {payMethod === "qr" && (
                  <View style={{ gap: 12 }}>
                    {!qrScanned ? (
                      <Pressable style={[styles.qrBox, { backgroundColor: colors.secondary, borderColor: colors.primary + "44" }]} onPress={simulateQRScan}>
                        <MaterialCommunityIcons name="qr-code-scanner" size={56} color={colors.primary} />
                        <Text style={[styles.qrBoxLabel, { color: colors.text }]}>Tap to Scan QR Code</Text>
                        <Text style={[styles.qrBoxSub, { color: colors.mutedForeground }]}>Supports PhonePe, GPay, Paytm, BHIM & all UPI</Text>
                      </Pressable>
                    ) : (
                      <View style={[styles.qrResult, { backgroundColor: colors.success + "14", borderColor: colors.success + "33" }]}>
                        <Feather name="check-circle" size={20} color={colors.success} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.qrResultName, { color: colors.text }]}>{qrInfo?.name}</Text>
                          <Text style={[styles.qrResultUPI, { color: colors.mutedForeground }]}>{qrInfo?.upi}</Text>
                        </View>
                        <Pressable onPress={() => { setQrScanned(false); setQrInfo(null); }}>
                          <Feather name="refresh-cw" size={16} color={colors.primary} />
                        </Pressable>
                      </View>
                    )}
                  </View>
                )}

                {/* Phone Number */}
                {payMethod === "phone" && (
                  <View style={[styles.inputRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                    <Text style={[styles.inputPrefix, { color: colors.mutedForeground }]}>+91</Text>
                    <TextInput style={[styles.inputField, { color: colors.text }]} placeholder="10-digit mobile number" placeholderTextColor={colors.mutedForeground} keyboardType="phone-pad" maxLength={10} value={payPhone} onChangeText={setPayPhone} autoFocus />
                    {payPhone.length === 10 && <Feather name="check-circle" size={16} color={colors.success} />}
                  </View>
                )}

                {/* UPI ID */}
                {payMethod === "upi" && (
                  <View style={[styles.inputRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                    <Feather name="at-sign" size={16} color={colors.mutedForeground} />
                    <TextInput style={[styles.inputField, { color: colors.text }]} placeholder="yourname@upi" placeholderTextColor={colors.mutedForeground} autoCapitalize="none" keyboardType="email-address" value={payUPI} onChangeText={setPayUPI} autoFocus />
                    {payUPI.includes("@") && <Feather name="check-circle" size={16} color={colors.success} />}
                  </View>
                )}

                {/* Bank Transfer */}
                {payMethod === "bank" && (
                  <View style={{ gap: 10 }}>
                    <View style={[styles.inputRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                      <Feather name="hash" size={16} color={colors.mutedForeground} />
                      <TextInput style={[styles.inputField, { color: colors.text }]} placeholder="Account number" placeholderTextColor={colors.mutedForeground} keyboardType="numeric" value={payBankAcc} onChangeText={setPayBankAcc} autoFocus />
                    </View>
                    <View style={[styles.inputRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                      <Feather name="code" size={16} color={colors.mutedForeground} />
                      <TextInput style={[styles.inputField, { color: colors.text }]} placeholder="IFSC Code (e.g. SBIN0001234)" placeholderTextColor={colors.mutedForeground} autoCapitalize="characters" maxLength={11} value={payBankIFSC} onChangeText={setPayBankIFSC} />
                    </View>
                    {payBankAcc.length >= 9 && payBankIFSC.length === 11 && (
                      <View style={[styles.verifiedRow, { backgroundColor: colors.success + "14" }]}>
                        <Feather name="check-circle" size={14} color={colors.success} />
                        <Text style={[styles.verifiedText, { color: colors.success }]}>Bank details look valid</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Group Member Contact */}
                {payMethod === "contact" && (
                  <ScrollView style={{ maxHeight: 180 }} showsVerticalScrollIndicator={false}>
                    {group.members.filter((m) => m.id !== "me").map((m) => (
                      <Pressable
                        key={m.id}
                        style={[styles.contactRow, {
                          backgroundColor: payContact?.id === m.id ? colors.primary + "14" : colors.secondary,
                          borderColor: payContact?.id === m.id ? colors.primary : "transparent",
                        }]}
                        onPress={() => setPayContact({ id: m.id, name: m.name })}
                      >
                        <View style={[styles.contactAvatar, { backgroundColor: m.color + "22" }]}>
                          <Text style={[styles.contactInitials, { color: m.color }]}>{m.initials}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.contactName, { color: colors.text }]}>{m.name}</Text>
                          <Text style={[styles.contactPhone, { color: colors.mutedForeground }]}>+91 {m.phone || "—"}</Text>
                        </View>
                        {payContact?.id === m.id && <Feather name="check-circle" size={18} color={colors.primary} />}
                      </Pressable>
                    ))}
                  </ScrollView>
                )}

                {/* Amount + Note (common) */}
                <View style={[styles.amountRow, { backgroundColor: colors.input, borderColor: colors.border }]}>
                  <Text style={[styles.rupee, { color: colors.text }]}>₹</Text>
                  <TextInput style={[styles.amountInput, { color: colors.text }]} placeholder="Amount" placeholderTextColor={colors.mutedForeground} keyboardType="numeric" value={payAmount} onChangeText={setPayAmount} />
                </View>
                <View style={styles.quickAmounts}>
                  {[100, 500, 1000, 2000].map((q) => (
                    <Pressable key={q} style={[styles.quickBtn, { backgroundColor: colors.accent }]} onPress={() => setPayAmount(q.toString())}>
                      <Text style={[styles.quickBtnText, { color: colors.text }]}>₹{q}</Text>
                    </Pressable>
                  ))}
                </View>
                <TextInput
                  style={[styles.noteInput, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]}
                  placeholder="Add a note (optional)"
                  placeholderTextColor={colors.mutedForeground}
                  value={payNote}
                  onChangeText={setPayNote}
                />
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {CATEGORIES.map((c) => (
                    <Pressable key={c} style={[styles.catSelectBtn, { backgroundColor: payCategory === c ? colors.primary + "22" : colors.secondary, borderColor: payCategory === c ? colors.primary : "transparent", borderWidth: 1.5 }]} onPress={() => setPayCategory(c)}>
                      <Text style={[styles.catSelectText, { color: payCategory === c ? colors.primary : colors.mutedForeground }]}>{c}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
                {myWalletMember?.spendingLimit ? (
                  <Text style={[styles.limitNote, { color: colors.warning }]}>Your limit: ₹{myWalletMember.spendingLimit.toLocaleString("en-IN")} per transaction</Text>
                ) : null}
                <View style={styles.sheetActions}>
                  <Pressable style={[styles.sheetBtn, { backgroundColor: colors.secondary }]} onPress={() => setShowPayHub(false)}>
                    <Text style={[styles.sheetBtnText, { color: colors.text }]}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.sheetBtn, { backgroundColor: colors.primary, flex: 1.5, opacity: (!payAmount || !isRecipientValid()) ? 0.4 : 1 }]}
                    onPress={handleWalletPay}
                    disabled={!payAmount || !isRecipientValid() || payProcessing}
                  >
                    <Feather name="zap" size={16} color="#fff" />
                    <Text style={[styles.sheetBtnText, { color: "#fff" }]}>Pay ₹{payAmount || "0"}</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ═══════════════════════ POST-SPEND SPLIT MODAL ══════════════════════ */}
      <Modal visible={showSplitModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.splitSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />

            {splitStep === "ask" && (
              <>
                <View style={[styles.splitSuccessIcon, { backgroundColor: colors.success + "20" }]}>
                  <Feather name="check-circle" size={32} color={colors.success} />
                </View>
                <Text style={[styles.splitAskTitle, { color: colors.text }]}>Payment Successful!</Text>
                <Text style={[styles.splitAskAmount, { color: colors.success }]}>₹{lastSpend?.amount.toLocaleString("en-IN")}</Text>
                <Text style={[styles.splitAskSubtitle, { color: colors.mutedForeground }]}>"{lastSpend?.description}"</Text>
                <View style={[styles.splitPromptCard, { backgroundColor: colors.primary + "14", borderColor: colors.primary + "33" }]}>
                  <Feather name="users" size={20} color={colors.primary} />
                  <Text style={[styles.splitPromptText, { color: colors.text }]}>
                    Split this expense among <Text style={{ color: colors.primary, fontFamily: "Inter_700Bold" }}>{group.name}</Text> members?
                  </Text>
                </View>
                <View style={styles.sheetActions}>
                  <Pressable style={[styles.sheetBtn, { backgroundColor: colors.secondary }]} onPress={skipSplit}>
                    <Text style={[styles.sheetBtnText, { color: colors.text }]}>Skip</Text>
                  </Pressable>
                  <Pressable style={[styles.sheetBtn, { backgroundColor: colors.primary, flex: 1.5 }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSplitStep("choose_type"); }}>
                    <Feather name="divide-circle" size={16} color="#fff" />
                    <Text style={[styles.sheetBtnText, { color: "#fff" }]}>Yes, Split!</Text>
                  </Pressable>
                </View>
              </>
            )}

            {splitStep === "choose_type" && (
              <>
                <Text style={[styles.splitStepTitle, { color: colors.text }]}>How to split?</Text>
                <Text style={[styles.splitStepSub, { color: colors.mutedForeground }]}>₹{lastSpend?.amount.toLocaleString("en-IN")} · "{lastSpend?.description}"</Text>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginTop: 4 }]}>Select members</Text>
                <ScrollView style={{ maxHeight: 160 }} showsVerticalScrollIndicator={false}>
                  {group.members.map((m) => {
                    const selected = selectedMembers.includes(m.id);
                    return (
                      <Pressable key={m.id} style={[styles.memberSelectRow, { borderBottomColor: colors.border }]} onPress={() => toggleMember(m.id)}>
                        <View style={[styles.memberSelectAvatar, { backgroundColor: m.color + "22" }]}><Text style={[styles.memberSelectInitials, { color: m.color }]}>{m.initials}</Text></View>
                        <Text style={[styles.memberSelectName, { color: colors.text }]}>{m.id === "me" ? "You" : m.name}</Text>
                        <View style={[styles.checkBox, { backgroundColor: selected ? colors.primary : "transparent", borderColor: selected ? colors.primary : colors.border }]}>
                          {selected && <Feather name="check" size={12} color="#fff" />}
                        </View>
                      </Pressable>
                    );
                  })}
                </ScrollView>
                <View style={styles.splitTypeRow}>
                  {([{ id: "equal", icon: "divide-circle", label: "Equal", hint: selectedMembers.length > 0 ? `₹${(lastSpend ? lastSpend.amount / selectedMembers.length : 0).toFixed(0)} each` : "—" }, { id: "unequal", icon: "sliders", label: "Custom", hint: "Set each person's share" }] as const).map((t) => (
                    <Pressable key={t.id} style={[styles.splitTypeCard, { backgroundColor: splitType === t.id ? colors.primary : colors.secondary, borderColor: splitType === t.id ? colors.primary : colors.border }]} onPress={() => setSplitType(t.id)}>
                      <Feather name={t.icon} size={22} color={splitType === t.id ? "#fff" : colors.mutedForeground} />
                      <Text style={[styles.splitTypeLabel, { color: splitType === t.id ? "#fff" : colors.text }]}>{t.label}</Text>
                      <Text style={[styles.splitTypeHint, { color: splitType === t.id ? "rgba(255,255,255,0.75)" : colors.mutedForeground }]}>{t.hint}</Text>
                    </Pressable>
                  ))}
                </View>
                <View style={styles.sheetActions}>
                  <Pressable style={[styles.sheetBtn, { backgroundColor: colors.secondary }]} onPress={() => setSplitStep("ask")}><Text style={[styles.sheetBtnText, { color: colors.text }]}>Back</Text></Pressable>
                  <Pressable style={[styles.sheetBtn, { backgroundColor: colors.primary, flex: 1.5, opacity: selectedMembers.length === 0 ? 0.4 : 1 }]} disabled={selectedMembers.length === 0} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSplitStep(splitType === "unequal" ? "unequal_input" : "confirm"); }}>
                    <Text style={[styles.sheetBtnText, { color: "#fff" }]}>Next →</Text>
                  </Pressable>
                </View>
              </>
            )}

            {splitStep === "unequal_input" && (
              <>
                <Text style={[styles.splitStepTitle, { color: colors.text }]}>Enter each person's share</Text>
                <Text style={[styles.splitStepSub, { color: colors.mutedForeground }]}>Total: ₹{lastSpend?.amount.toLocaleString("en-IN")}</Text>
                <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
                  {group.members.filter((m) => selectedMembers.includes(m.id)).map((m) => (
                    <View key={m.id} style={[styles.unequalRow, { borderBottomColor: colors.border }]}>
                      <View style={[styles.memberSelectAvatar, { backgroundColor: m.color + "22" }]}><Text style={[styles.memberSelectInitials, { color: m.color }]}>{m.initials}</Text></View>
                      <Text style={[styles.unequalName, { color: colors.text }]}>{m.id === "me" ? "You" : m.name}</Text>
                      <View style={[styles.unequalInputWrap, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                        <Text style={[styles.unequalRupee, { color: colors.mutedForeground }]}>₹</Text>
                        <TextInput style={[styles.unequalInput, { color: colors.text }]} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.mutedForeground} value={customSplits[m.id] ?? ""} onChangeText={(v) => setCustomSplits((prev) => ({ ...prev, [m.id]: v }))} />
                      </View>
                    </View>
                  ))}
                </ScrollView>
                <View style={[styles.remainingRow, { backgroundColor: Math.abs(customRemaining) < 0.5 ? colors.success + "18" : colors.warning + "18" }]}>
                  <Text style={[styles.remainingLabel, { color: colors.mutedForeground }]}>Remaining:</Text>
                  <Text style={[styles.remainingAmt, { color: Math.abs(customRemaining) < 0.5 ? colors.success : colors.warning }]}>₹{customRemaining.toFixed(2)}</Text>
                </View>
                <View style={styles.sheetActions}>
                  <Pressable style={[styles.sheetBtn, { backgroundColor: colors.secondary }]} onPress={() => setSplitStep("choose_type")}><Text style={[styles.sheetBtnText, { color: colors.text }]}>Back</Text></Pressable>
                  <Pressable style={[styles.sheetBtn, { backgroundColor: colors.primary, flex: 1.5, opacity: Math.abs(customRemaining) > 0.5 ? 0.4 : 1 }]} disabled={Math.abs(customRemaining) > 0.5} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSplitStep("confirm"); }}>
                    <Text style={[styles.sheetBtnText, { color: "#fff" }]}>Review →</Text>
                  </Pressable>
                </View>
              </>
            )}

            {splitStep === "confirm" && (
              <>
                <Text style={[styles.splitStepTitle, { color: colors.text }]}>Confirm Split</Text>
                <Text style={[styles.splitStepSub, { color: colors.mutedForeground }]}>"{lastSpend?.description}" · ₹{lastSpend?.amount.toLocaleString("en-IN")}</Text>
                <View style={[styles.splitSummaryCard, { backgroundColor: colors.accent }]}>
                  <View style={styles.splitSummaryRow}><Text style={[styles.splitSummaryLabel, { color: colors.mutedForeground }]}>Split type</Text><Text style={[styles.splitSummaryVal, { color: colors.primary }]}>{splitType === "equal" ? "Equal" : "Custom"}</Text></View>
                  <View style={styles.splitSummaryRow}><Text style={[styles.splitSummaryLabel, { color: colors.mutedForeground }]}>Members</Text><Text style={[styles.splitSummaryVal, { color: colors.text }]}>{selectedMembers.length} people</Text></View>
                </View>
                <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
                  {group.members.filter((m) => selectedMembers.includes(m.id)).map((m) => {
                    const share = splitType === "equal" ? equalShare : (parseFloat(customSplits[m.id]) || 0);
                    return (
                      <View key={m.id} style={[styles.confirmRow, { borderBottomColor: colors.border }]}>
                        <View style={[styles.memberSelectAvatar, { backgroundColor: m.color + "22" }]}><Text style={[styles.memberSelectInitials, { color: m.color }]}>{m.initials}</Text></View>
                        <Text style={[styles.confirmName, { color: colors.text }]}>{m.id === "me" ? "You" : m.name}</Text>
                        <Text style={[styles.confirmShare, { color: colors.primary }]}>₹{share.toFixed(2)}</Text>
                        {m.id !== "me" && <View style={[styles.notifyPill, { backgroundColor: colors.primary + "18" }]}><Feather name="bell" size={10} color={colors.primary} /><Text style={[styles.notifyPillText, { color: colors.primary }]}>Notified</Text></View>}
                      </View>
                    );
                  })}
                </ScrollView>
                <View style={styles.sheetActions}>
                  <Pressable style={[styles.sheetBtn, { backgroundColor: colors.secondary }]} onPress={() => setSplitStep(splitType === "equal" ? "choose_type" : "unequal_input")}><Text style={[styles.sheetBtnText, { color: colors.text }]}>Back</Text></Pressable>
                  <Pressable style={[styles.sheetBtn, { backgroundColor: colors.primary, flex: 1.5, opacity: saving ? 0.6 : 1 }]} onPress={confirmSplit} disabled={saving}>
                    <Feather name="check" size={16} color="#fff" />
                    <Text style={[styles.sheetBtnText, { color: "#fff" }]}>{saving ? "Saving..." : "Record Split"}</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ═══════════════════════ EDIT MEMBER MODAL ════════════════════════════ */}
      <Modal visible={!!showEditMember} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.card }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>{group.members.find((m) => m.id === showEditMember?.userId)?.name ?? "Member"} Limits</Text>
            <View style={styles.settingRow}>
              <View style={{ flex: 1 }}><Text style={[styles.settingLabel, { color: colors.text }]}>Role</Text><Text style={[styles.settingHint, { color: colors.mutedForeground }]}>Toggle admin access</Text></View>
              <Pressable style={[styles.roleSwitchBtn, { backgroundColor: showEditMember?.role === "admin" ? colors.primary + "22" : colors.success + "18" }]} onPress={() => showEditMember && handleRoleToggle(showEditMember.userId, showEditMember.role)}>
                <Text style={[styles.roleSwitchText, { color: showEditMember?.role === "admin" ? colors.primary : colors.success }]}>{showEditMember?.role === "admin" ? "Admin" : "Member"}</Text>
              </Pressable>
            </View>
            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Per-transaction limit (₹)</Text>
              <TextInput style={[styles.settingInputSm, { color: colors.text, backgroundColor: colors.secondary, borderColor: colors.border }]} value={editSpendLimit} onChangeText={setEditSpendLimit} keyboardType="numeric" placeholder="0 = unlimited" placeholderTextColor={colors.mutedForeground} />
            </View>
            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Daily limit (₹)</Text>
              <TextInput style={[styles.settingInputSm, { color: colors.text, backgroundColor: colors.secondary, borderColor: colors.border }]} value={editDailyLimit} onChangeText={setEditDailyLimit} keyboardType="numeric" placeholder="0 = unlimited" placeholderTextColor={colors.mutedForeground} />
            </View>
            <View style={styles.sheetActions}>
              <Pressable style={[styles.sheetBtn, { backgroundColor: colors.secondary }]} onPress={() => setShowEditMember(null)}><Text style={[styles.sheetBtnText, { color: colors.text }]}>Cancel</Text></Pressable>
              <Pressable style={[styles.sheetBtn, { backgroundColor: colors.primary, flex: 1.5 }]} onPress={handleSaveMember}><Text style={[styles.sheetBtnText, { color: "#fff" }]}>Save Changes</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  headerStatusRow: { flexDirection: "row", gap: 6, marginTop: 3 },
  frozenBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  frozenText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  adminBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  adminText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  headerActions: { flexDirection: "row", gap: 8 },
  headerBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  headerBtnText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  balanceHero: { marginHorizontal: 16, borderRadius: 20, padding: 24, gap: 8, marginBottom: 4 },
  heroLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1.5, textTransform: "uppercase" },
  heroBalance: { fontSize: 42, fontFamily: "Inter_700Bold" },
  progressTrack: { height: 8, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  progressLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  alertBanner: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(0,0,0,0.2)", padding: 8, borderRadius: 8 },
  alertBannerText: { fontSize: 12, color: "#fff", fontFamily: "Inter_500Medium", flex: 1 },
  heroStats: { flexDirection: "row", marginTop: 4 },
  heroStat: { flex: 1, alignItems: "center", gap: 3 },
  heroStatVal: { fontSize: 16, fontFamily: "Inter_700Bold" },
  heroStatLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  heroStatDivider: { width: 1 },
  tabStrip: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  tabItem: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  tabItemText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  // Pay shortcuts on overview
  payShortcutRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  payShortcut: { flex: 1, minWidth: 60, alignItems: "center", padding: 10, borderRadius: 14, gap: 6 },
  payShortcutIcon: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  payShortcutLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, textTransform: "uppercase" },
  txRow: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 12, gap: 10 },
  txIcon: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  txDesc: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  txMeta: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  txAmount: { fontSize: 14, fontFamily: "Inter_700Bold" },
  descCard: { flexDirection: "row", gap: 10, padding: 12, borderRadius: 12, alignItems: "flex-start" },
  descText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  memberCard: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 14, gap: 12 },
  memberAvatar: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  memberInitials: { fontSize: 15, fontFamily: "Inter_700Bold" },
  memberNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  memberName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  roleText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  memberStats: { flexDirection: "row", gap: 14 },
  memberStat: { fontSize: 12, fontFamily: "Inter_400Regular" },
  contribBar: { height: 4, borderRadius: 2, overflow: "hidden" },
  contribFill: { height: "100%", borderRadius: 2 },
  memberLimits: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  limitChip: { fontSize: 10, fontFamily: "Inter_600SemiBold", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  editMemberBtn: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  filterRow: { flexDirection: "row", gap: 8 },
  filterBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center" },
  filterText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  txCard: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 14, gap: 12 },
  txCardIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  txCardDesc: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  txCardBy: { fontSize: 12, fontFamily: "Inter_400Regular" },
  txCardMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  catChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  catChipText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  txCardDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
  txCardAmount: { fontSize: 16, fontFamily: "Inter_700Bold" },
  analyticsCard: { borderRadius: 16, padding: 16, gap: 14 },
  analyticsTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  analyticsRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  analyticsAvatar: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  analyticsInitials: { fontSize: 11, fontFamily: "Inter_700Bold" },
  analyticsNameRow: { flexDirection: "row", justifyContent: "space-between" },
  analyticsName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  analyticsPct: { fontSize: 12, fontFamily: "Inter_400Regular" },
  analyticsBg: { height: 6, borderRadius: 3, overflow: "hidden" },
  analyticsBar: { height: "100%", borderRadius: 3 },
  analyticsAmount: { fontSize: 11, fontFamily: "Inter_400Regular" },
  catIconBox: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  summaryGrid: { flexDirection: "row", borderRadius: 16, padding: 20 },
  summaryCell: { flex: 1, alignItems: "center", gap: 4 },
  summaryCellVal: { fontSize: 16, fontFamily: "Inter_700Bold" },
  summaryCellLabel: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
  summaryCellDivider: { width: 1 },
  settingSection: { borderRadius: 16, padding: 16, gap: 16 },
  settingGroupTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  settingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  settingLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  settingHint: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  settingInput: { flex: 1, borderRadius: 8, borderWidth: 1.5, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, fontFamily: "Inter_400Regular" },
  settingInputSm: { width: 110, borderRadius: 8, borderWidth: 1.5, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "right" },
  noAdminNote: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  noAdminText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  roleSwitchBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  roleSwitchText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  limitNote: { fontSize: 12, fontFamily: "Inter_500Medium" },
  empty: { alignItems: "center", paddingVertical: 32, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.6)" },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, gap: 14 },
  splitSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, gap: 14, maxHeight: "90%" },
  paySheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, gap: 14, maxHeight: "92%" },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center" },
  sheetTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  amountRow: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14 },
  rupee: { fontSize: 22, fontFamily: "Inter_600SemiBold", marginRight: 6 },
  amountInput: { flex: 1, fontSize: 28, fontFamily: "Inter_700Bold", paddingVertical: 12 },
  quickAmounts: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  quickBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  quickBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  noteInput: { borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontFamily: "Inter_400Regular" },
  fieldLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },
  catSelectBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  catSelectText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  sheetActions: { flexDirection: "row", gap: 12 },
  sheetBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 14, borderRadius: 12 },
  sheetBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  // Pay Hub
  payHubHeader: { gap: 8 },
  walletBalBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, alignSelf: "flex-start" },
  walletBalText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  methodGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  methodCard: { width: "47%", padding: 14, borderRadius: 16, gap: 8, borderWidth: 1.5 },
  methodIcon: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  methodLabel: { fontSize: 14, fontFamily: "Inter_700Bold" },
  methodDesc: { fontSize: 11, fontFamily: "Inter_400Regular" },
  payFormHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  backChip: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  methodBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  methodBadgeText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  // QR
  qrBox: { alignItems: "center", padding: 28, borderRadius: 20, gap: 10, borderWidth: 2, borderStyle: "dashed" },
  qrBoxLabel: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  qrBoxSub: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
  qrResult: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 14, borderWidth: 1 },
  qrResultName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  qrResultUPI: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  // Input
  inputRow: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 12 },
  inputPrefix: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  inputField: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  verifiedRow: { flexDirection: "row", alignItems: "center", gap: 6, padding: 10, borderRadius: 10 },
  verifiedText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  // Contact picker
  contactRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1.5 },
  contactAvatar: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  contactInitials: { fontSize: 13, fontFamily: "Inter_700Bold" },
  contactName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  contactPhone: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  // Processing overlay
  payOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderTopLeftRadius: 28, borderTopRightRadius: 28, zIndex: 10, alignItems: "center", justifyContent: "center", gap: 12 },
  payResultIcon: { width: 80, height: 80, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  payResultTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  payResultAmt: { fontSize: 36, fontFamily: "Inter_700Bold" },
  payResultSub: { fontSize: 14, fontFamily: "Inter_400Regular" },
  // Split modal
  splitSuccessIcon: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center", alignSelf: "center" },
  splitAskTitle: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  splitAskAmount: { fontSize: 26, fontFamily: "Inter_700Bold", textAlign: "center" },
  splitAskSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  splitPromptCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 14, borderWidth: 1 },
  splitPromptText: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", lineHeight: 20 },
  splitStepTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  splitStepSub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  splitTypeRow: { flexDirection: "row", gap: 10 },
  splitTypeCard: { flex: 1, alignItems: "center", padding: 16, borderRadius: 16, gap: 6, borderWidth: 1.5 },
  splitTypeLabel: { fontSize: 14, fontFamily: "Inter_700Bold" },
  splitTypeHint: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
  memberSelectRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  memberSelectAvatar: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  memberSelectInitials: { fontSize: 12, fontFamily: "Inter_700Bold" },
  memberSelectName: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  checkBox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  unequalRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  unequalName: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  unequalInputWrap: { flexDirection: "row", alignItems: "center", borderRadius: 8, borderWidth: 1.5, paddingHorizontal: 8, paddingVertical: 6, width: 110 },
  unequalRupee: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginRight: 3 },
  unequalInput: { flex: 1, fontSize: 14, fontFamily: "Inter_700Bold" },
  remainingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12, borderRadius: 10 },
  remainingLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  remainingAmt: { fontSize: 16, fontFamily: "Inter_700Bold" },
  splitSummaryCard: { borderRadius: 12, padding: 14, gap: 10 },
  splitSummaryRow: { flexDirection: "row", justifyContent: "space-between" },
  splitSummaryLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  splitSummaryVal: { fontSize: 13, fontFamily: "Inter_700Bold" },
  confirmRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  confirmName: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  confirmShare: { fontSize: 15, fontFamily: "Inter_700Bold" },
  notifyPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  notifyPillText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
});
