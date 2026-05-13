import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Member, useData } from "@/context/DataContext";
import { useNotifications } from "@/context/NotificationContext";
import { useColors } from "@/hooks/useColors";

const CATEGORIES = ["Food", "Groceries", "Utilities", "Hotel", "Transport", "Entertainment", "Other"];

const ALL_CONTACTS: Omit<Member, "contribution">[] = [
  { id: "u2", name: "Rahul Sharma", phone: "9876543210", initials: "RS", color: "#FF6B6B" },
  { id: "u3", name: "Priya Nair", phone: "9123456780", initials: "PN", color: "#4ECDC4" },
  { id: "u4", name: "Amit Kumar", phone: "9988776655", initials: "AK", color: "#45B7D1" },
  { id: "u5", name: "Sneha Patel", phone: "9234567890", initials: "SP", color: "#96CEB4" },
  { id: "u6", name: "Karan Mehta", phone: "9345678901", initials: "KM", color: "#DDA0DD" },
  { id: "u7", name: "Anjali Gupta", phone: "9456789012", initials: "AG", color: "#FFEAA7" },
];

export default function GroupDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { groups, addExpense, settleExpense, addWalletContribution, addGroupMember, removeGroupMember } = useData();
  const { addNotification } = useNotifications();

  const group = groups.find((g) => g.id === id);
  const [tab, setTab] = useState<"expenses" | "wallet" | "members">("expenses");
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [expTitle, setExpTitle] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expCategory, setExpCategory] = useState("Food");
  const [adding, setAdding] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  if (!group) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: colors.text }}>Group not found</Text>
      </View>
    );
  }

  const myUnsettled = group.expenses
    .flatMap((e) => e.splits.filter((s) => s.userId === "me" && !s.settled).map((s) => ({ expense: e, split: s })))
    .reduce((sum, { split }) => sum + split.amount, 0);

  const availableContacts = ALL_CONTACTS.filter((c) => !group.members.find((m) => m.id === c.id));

  const handleAddExpense = async () => {
    if (!expTitle || !expAmount) return;
    setAdding(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const amount = parseFloat(expAmount);
      const perPerson = amount / group.members.length;
      await addExpense({
        groupId: group.id,
        title: expTitle,
        amount,
        paidBy: "me",
        paidByName: "You",
        splits: group.members.map((m) => ({ userId: m.id, amount: perPerson, settled: m.id === "me" })),
        date: new Date().toISOString().split("T")[0],
        category: expCategory,
      });
      await addNotification({
        type: "split_request",
        title: `Expense added: ${expTitle}`,
        body: `₹${amount.toFixed(0)} split among ${group.members.length} members in ${group.name}`,
        amount,
        groupId: group.id,
      });
      setExpTitle("");
      setExpAmount("");
      setShowAddExpense(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } finally {
      setAdding(false);
    }
  };

  const handleAddMember = async (contact: Omit<Member, "contribution">) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await addGroupMember(group.id, contact);
    await addNotification({
      type: "group_added",
      title: `${contact.name} added to ${group.name}`,
      body: `${contact.name} is now a member of ${group.name} and the shared wallet`,
      groupId: group.id,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleRemoveMember = (memberId: string, memberName: string) => {
    if (memberId === "me") return;
    Alert.alert("Remove Member", `Remove ${memberName} from this group?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove", style: "destructive",
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          await removeGroupMember(group.id, memberId);
        },
      },
    ]);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.text} />
        </Pressable>
        <View style={styles.headerInfo}>
          <Text style={[styles.groupName, { color: colors.text }]}>{group.name}</Text>
          <Text style={[styles.memberCount, { color: colors.mutedForeground }]}>{group.members.length} members</Text>
        </View>
        <Pressable
          style={[styles.addExpBtn, { backgroundColor: colors.primary }]}
          onPress={() => setShowAddExpense(true)}
        >
          <Feather name="plus" size={16} color="#fff" />
          <Text style={styles.addExpBtnText}>Add</Text>
        </Pressable>
      </View>

      {/* Balance summary */}
      <View style={styles.balanceSummary}>
        <View style={[styles.summaryCard, { backgroundColor: colors.success + "18" }]}>
          <Text style={[styles.sumLabel, { color: colors.mutedForeground }]}>Wallet</Text>
          <Text style={[styles.sumAmount, { color: colors.success }]}>₹{group.walletBalance.toLocaleString("en-IN")}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: (group.myBalance >= 0 ? colors.success : colors.destructive) + "18" }]}>
          <Text style={[styles.sumLabel, { color: colors.mutedForeground }]}>My balance</Text>
          <Text style={[styles.sumAmount, { color: group.myBalance >= 0 ? colors.success : colors.destructive }]}>
            {group.myBalance >= 0 ? "+" : ""}₹{Math.abs(group.myBalance).toLocaleString("en-IN")}
          </Text>
        </View>
        {myUnsettled > 0 && (
          <View style={[styles.summaryCard, { backgroundColor: colors.warning + "18" }]}>
            <Text style={[styles.sumLabel, { color: colors.mutedForeground }]}>I owe</Text>
            <Text style={[styles.sumAmount, { color: colors.warning }]}>₹{myUnsettled.toLocaleString("en-IN")}</Text>
          </View>
        )}
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: colors.card, marginHorizontal: 16 }]}>
        {(["expenses", "wallet", "members"] as const).map((t) => (
          <Pressable
            key={t}
            style={[styles.tabBtn, tab === t && { backgroundColor: colors.primary }]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, { color: tab === t ? "#fff" : colors.mutedForeground }]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 80, paddingTop: 12 }}
      >
        {/* EXPENSES TAB */}
        {tab === "expenses" && (
          <View style={{ paddingHorizontal: 16, gap: 10 }}>
            {group.expenses.length === 0 ? (
              <View style={styles.empty}>
                <Feather name="credit-card" size={32} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No expenses yet. Add one!</Text>
              </View>
            ) : (
              group.expenses.map((expense) => {
                const myShare = expense.splits.find((s) => s.userId === "me");
                const settled = myShare?.settled ?? true;
                return (
                  <View key={expense.id} style={[styles.expCard, { backgroundColor: colors.card }]}>
                    <View style={styles.expRow}>
                      <View style={[styles.catBadge, { backgroundColor: colors.accent }]}>
                        <Text style={[styles.catBadgeText, { color: colors.primary }]}>{expense.category}</Text>
                      </View>
                      <Text style={[styles.expDate, { color: colors.mutedForeground }]}>{expense.date}</Text>
                    </View>
                    <Text style={[styles.expTitle, { color: colors.text }]}>{expense.title}</Text>
                    <View style={styles.expMeta}>
                      <Text style={[styles.expPaidBy, { color: colors.mutedForeground }]}>Paid by {expense.paidByName}</Text>
                      <Text style={[styles.expAmount, { color: colors.text }]}>₹{expense.amount.toLocaleString("en-IN")}</Text>
                    </View>
                    <View style={styles.splitsRow}>
                      {expense.splits.slice(0, 5).map((s) => {
                        const m = group.members.find((mem) => mem.id === s.userId);
                        if (!m) return null;
                        return (
                          <View key={s.userId} style={styles.splitChip}>
                            <View style={[styles.splitAvatar, { backgroundColor: m.color + "22" }]}>
                              <Text style={[styles.splitInitials, { color: m.color }]}>{m.initials}</Text>
                            </View>
                            <View style={[styles.splitStatus, { backgroundColor: s.settled ? colors.success + "22" : colors.warning + "22" }]}>
                              <Feather name={s.settled ? "check" : "clock"} size={9} color={s.settled ? colors.success : colors.warning} />
                            </View>
                          </View>
                        );
                      })}
                    </View>
                    {myShare && (
                      <View style={[styles.expFooter, { borderTopColor: colors.border }]}>
                        <Text style={[styles.myShare, { color: colors.mutedForeground }]}>Your share: ₹{myShare.amount.toFixed(0)}</Text>
                        {settled ? (
                          <View style={[styles.settledBadge, { backgroundColor: colors.success + "22" }]}>
                            <Feather name="check-circle" size={12} color={colors.success} />
                            <Text style={[styles.settledText, { color: colors.success }]}>Settled</Text>
                          </View>
                        ) : (
                          <Pressable
                            style={[styles.settleBtn, { backgroundColor: colors.primary }]}
                            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); settleExpense(group.id, expense.id, "me"); }}
                          >
                            <Text style={styles.settleBtnText}>Settle</Text>
                          </Pressable>
                        )}
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* WALLET TAB — full-featured entry point */}
        {tab === "wallet" && (
          <View style={{ paddingHorizontal: 16, gap: 12 }}>
            {/* Wallet card linking to full wallet screen */}
            <Pressable
              style={[styles.walletEntryCard, { backgroundColor: group.walletSettings.frozen ? colors.warning + "18" : colors.primary }]}
              onPress={() => router.push(`/wallet/${group.id}`)}
            >
              <View style={styles.walletEntryTop}>
                <View>
                  <Text style={[styles.walletEntryName, { color: group.walletSettings.frozen ? colors.warning : "rgba(255,255,255,0.8)" }]}>
                    {group.walletSettings.name || "Shared Wallet"}
                  </Text>
                  {group.walletSettings.frozen && (
                    <View style={styles.frozenRow}>
                      <Feather name="lock" size={12} color={colors.warning} />
                      <Text style={[styles.frozenLabel, { color: colors.warning }]}>Frozen</Text>
                    </View>
                  )}
                </View>
                <View style={[styles.openWalletBtn, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                  <Text style={styles.openWalletText}>Open Wallet</Text>
                  <Feather name="arrow-right" size={14} color="#fff" />
                </View>
              </View>
              <Text style={[styles.walletEntryBalance, { color: group.walletSettings.frozen ? colors.warning : "#fff" }]}>
                ₹{group.walletBalance.toLocaleString("en-IN")}
              </Text>
              <View style={[styles.walletProgressTrack, { backgroundColor: group.walletSettings.frozen ? colors.warning + "33" : "rgba(255,255,255,0.25)" }]}>
                <View style={[styles.walletProgressFill, {
                  width: `${Math.min((group.walletBalance / Math.max(group.walletLimit, 1)) * 100, 100)}%` as any,
                  backgroundColor: group.walletSettings.frozen ? colors.warning : "rgba(255,255,255,0.85)",
                }]} />
              </View>
              <Text style={[styles.walletEntryLimit, { color: group.walletSettings.frozen ? colors.warning + "88" : "rgba(255,255,255,0.65)" }]}>
                Limit: ₹{group.walletLimit.toLocaleString("en-IN")} · {group.members.length} members
              </Text>
              {group.walletSettings.alertEnabled && group.walletBalance < group.walletSettings.minBalanceAlert && (
                <View style={[styles.lowBal, { backgroundColor: "rgba(0,0,0,0.2)" }]}>
                  <Feather name="alert-triangle" size={12} color="#fff" />
                  <Text style={styles.lowBalText}>Balance below alert threshold (₹{group.walletSettings.minBalanceAlert})</Text>
                </View>
              )}
            </Pressable>

            {/* Recent wallet transactions preview */}
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>RECENT TRANSACTIONS</Text>
            {group.walletTransactions.slice(0, 5).map((tx) => (
              <View key={tx.id} style={[styles.walletTxRow, { backgroundColor: colors.card }]}>
                <View style={[styles.walletTxIcon, { backgroundColor: (tx.type === "credit" ? colors.success : colors.destructive) + "20" }]}>
                  <Feather name={tx.type === "credit" ? "arrow-down-left" : "arrow-up-right"} size={16} color={tx.type === "credit" ? colors.success : colors.destructive} />
                </View>
                <View style={styles.walletTxInfo}>
                  <Text style={[styles.walletTxDesc, { color: colors.text }]}>{tx.description}</Text>
                  <Text style={[styles.walletTxBy, { color: colors.mutedForeground }]}>{tx.by} · {tx.date}</Text>
                </View>
                <Text style={[styles.walletTxAmount, { color: tx.type === "credit" ? colors.success : colors.destructive }]}>
                  {tx.type === "credit" ? "+" : "-"}₹{tx.amount.toLocaleString("en-IN")}
                </Text>
              </View>
            ))}
            {group.walletTransactions.length === 0 && (
              <View style={styles.empty}>
                <MaterialCommunityIcons name="wallet-outline" size={32} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No wallet activity yet</Text>
              </View>
            )}
            <Pressable
              style={[styles.viewAllBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push(`/wallet/${group.id}`)}
            >
              <Feather name="external-link" size={14} color={colors.primary} />
              <Text style={[styles.viewAllText, { color: colors.primary }]}>View full wallet with analytics & settings</Text>
            </Pressable>
          </View>
        )}

        {/* MEMBERS TAB */}
        {tab === "members" && (
          <View style={{ paddingHorizontal: 16, gap: 10 }}>
            {availableContacts.length > 0 && (
              <Pressable
                style={[styles.addMemberBtn, { backgroundColor: colors.primary + "14", borderColor: colors.primary + "33" }]}
                onPress={() => setShowAddMember(true)}
              >
                <View style={[styles.addMemberIcon, { backgroundColor: colors.primary + "22" }]}>
                  <Feather name="user-plus" size={18} color={colors.primary} />
                </View>
                <Text style={[styles.addMemberText, { color: colors.primary }]}>Add Member</Text>
              </Pressable>
            )}
            {group.members.map((member) => {
              const wm = group.walletMembers?.find((w) => w.userId === member.id);
              return (
                <View key={member.id} style={[styles.memberCard, { backgroundColor: colors.card }]}>
                  <View style={[styles.memberAvatar, { backgroundColor: member.color + "22" }]}>
                    <Text style={[styles.memberInitials, { color: member.color }]}>{member.initials}</Text>
                  </View>
                  <View style={styles.memberInfo}>
                    <View style={styles.memberNameRow}>
                      <Text style={[styles.memberName, { color: colors.text }]}>{member.id === "me" ? "You" : member.name}</Text>
                      {member.id === "me" && (
                        <View style={[styles.youBadge, { backgroundColor: colors.primary + "22" }]}>
                          <Text style={[styles.youBadgeText, { color: colors.primary }]}>You</Text>
                        </View>
                      )}
                      {wm?.role === "admin" && (
                        <View style={[styles.adminBadge, { backgroundColor: colors.success + "18" }]}>
                          <Text style={[styles.adminBadgeText, { color: colors.success }]}>Admin</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.memberContrib, { color: colors.mutedForeground }]}>
                      Contributed: ₹{member.contribution.toLocaleString("en-IN")}
                      {wm ? ` · Spent: ₹${wm.totalSpent.toLocaleString("en-IN")}` : ""}
                    </Text>
                  </View>
                  {member.id !== "me" && (
                    <Pressable
                      style={[styles.removeBtn, { backgroundColor: colors.destructive + "18" }]}
                      onPress={() => handleRemoveMember(member.id, member.name)}
                    >
                      <Feather name="user-minus" size={14} color={colors.destructive} />
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Add Expense Modal */}
      <Modal visible={showAddExpense} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.card }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Add Expense</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]}
              placeholder="What's this for?"
              placeholderTextColor={colors.mutedForeground}
              value={expTitle}
              onChangeText={setExpTitle}
              autoFocus
            />
            <View style={[styles.amountRow, { backgroundColor: colors.input, borderColor: colors.border }]}>
              <Text style={[styles.rupee, { color: colors.text }]}>₹</Text>
              <TextInput
                style={[styles.amountInput, { color: colors.text }]}
                placeholder="Amount"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
                value={expAmount}
                onChangeText={setExpAmount}
              />
            </View>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {CATEGORIES.map((c) => (
                <Pressable
                  key={c}
                  style={[styles.catChip, {
                    backgroundColor: expCategory === c ? colors.primary + "22" : colors.secondary,
                    borderColor: expCategory === c ? colors.primary : "transparent",
                    borderWidth: 1.5,
                  }]}
                  onPress={() => setExpCategory(c)}
                >
                  <Text style={[styles.catChipText, { color: expCategory === c ? colors.primary : colors.mutedForeground }]}>{c}</Text>
                </Pressable>
              ))}
            </ScrollView>
            {expAmount ? (
              <Text style={[styles.splitInfo, { color: colors.mutedForeground }]}>
                ₹{(parseFloat(expAmount) / group.members.length).toFixed(2)} per person ({group.members.length} members)
              </Text>
            ) : null}
            <View style={styles.modalActions}>
              <Pressable style={[styles.modalBtn, { backgroundColor: colors.secondary }]} onPress={() => setShowAddExpense(false)}>
                <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: colors.primary, flex: 1.5 }]}
                onPress={handleAddExpense}
                disabled={adding || !expTitle || !expAmount}
              >
                <Text style={[styles.modalBtnText, { color: "#fff" }]}>{adding ? "Adding..." : "Add Expense"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Member Modal */}
      <Modal visible={showAddMember} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.card }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Add Member</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 340 }}>
              {availableContacts.map((c) => (
                <Pressable
                  key={c.id}
                  style={[styles.addContactRow, { borderBottomColor: colors.border }]}
                  onPress={() => { handleAddMember(c); setShowAddMember(false); }}
                >
                  <View style={[styles.memberAvatar, { backgroundColor: c.color + "22" }]}>
                    <Text style={[styles.memberInitials, { color: c.color }]}>{c.initials}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.memberName, { color: colors.text }]}>{c.name}</Text>
                    <Text style={[styles.memberContrib, { color: colors.mutedForeground }]}>+91 {c.phone}</Text>
                  </View>
                  <View style={[styles.addIcon, { backgroundColor: colors.primary + "22" }]}>
                    <Feather name="plus" size={16} color={colors.primary} />
                  </View>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable style={[styles.modalBtn, { backgroundColor: colors.secondary }]} onPress={() => setShowAddMember(false)}>
              <Text style={[styles.modalBtnText, { color: colors.text }]}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, gap: 12 },
  backBtn: { padding: 4 },
  headerInfo: { flex: 1 },
  groupName: { fontSize: 20, fontFamily: "Inter_700Bold" },
  memberCount: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  addExpBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  addExpBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 13 },
  balanceSummary: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 14, flexWrap: "wrap" },
  summaryCard: { flex: 1, minWidth: 90, padding: 12, borderRadius: 12, gap: 3 },
  sumLabel: { fontSize: 10, fontFamily: "Inter_400Regular", textTransform: "uppercase" },
  sumAmount: { fontSize: 16, fontFamily: "Inter_700Bold" },
  tabs: { flexDirection: "row", borderRadius: 12, padding: 4, marginBottom: 4 },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: "center" },
  tabText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  empty: { alignItems: "center", paddingTop: 40, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  expCard: { borderRadius: 14, padding: 14, gap: 8 },
  expRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  catBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  catBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  expDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
  expTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  expMeta: { flexDirection: "row", justifyContent: "space-between" },
  expPaidBy: { fontSize: 12, fontFamily: "Inter_400Regular" },
  expAmount: { fontSize: 16, fontFamily: "Inter_700Bold" },
  splitsRow: { flexDirection: "row", gap: 6 },
  splitChip: { position: "relative" },
  splitAvatar: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  splitInitials: { fontSize: 10, fontFamily: "Inter_700Bold" },
  splitStatus: { position: "absolute", bottom: -2, right: -2, width: 14, height: 14, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  expFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth },
  myShare: { fontSize: 13, fontFamily: "Inter_400Regular" },
  settledBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  settledText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  settleBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  settleBtnText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  walletEntryCard: { borderRadius: 20, padding: 22, gap: 10 },
  walletEntryTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  walletEntryName: { fontSize: 12, fontFamily: "Inter_500Medium" },
  frozenRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  frozenLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  openWalletBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  openWalletText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  walletEntryBalance: { fontSize: 38, fontFamily: "Inter_700Bold" },
  walletProgressTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  walletProgressFill: { height: "100%", borderRadius: 3 },
  walletEntryLimit: { fontSize: 12, fontFamily: "Inter_400Regular" },
  lowBal: { flexDirection: "row", alignItems: "center", gap: 6, padding: 8, borderRadius: 8 },
  lowBalText: { color: "#fff", fontSize: 11, fontFamily: "Inter_500Medium", flex: 1 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, textTransform: "uppercase" },
  walletTxRow: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 12, gap: 12 },
  walletTxIcon: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  walletTxInfo: { flex: 1 },
  walletTxDesc: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  walletTxBy: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  walletTxAmount: { fontSize: 15, fontFamily: "Inter_700Bold" },
  viewAllBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, borderRadius: 12, borderWidth: 1 },
  viewAllText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  addMemberBtn: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 14, borderWidth: 1.5 },
  addMemberIcon: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  addMemberText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  memberCard: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 14, gap: 12 },
  memberAvatar: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  memberInitials: { fontSize: 15, fontFamily: "Inter_700Bold" },
  memberInfo: { flex: 1 },
  memberNameRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  memberName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  memberContrib: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  youBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7 },
  youBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  adminBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7 },
  adminBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  removeBtn: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  addContactRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  addIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.55)" },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, gap: 14 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center" },
  sheetTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  textInput: { borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 14, fontSize: 15, fontFamily: "Inter_400Regular" },
  amountRow: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14 },
  rupee: { fontSize: 22, fontFamily: "Inter_600SemiBold", marginRight: 6 },
  amountInput: { flex: 1, fontSize: 24, fontFamily: "Inter_700Bold", paddingVertical: 12 },
  fieldLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },
  catChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  catChipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  splitInfo: { fontSize: 13, fontFamily: "Inter_400Regular" },
  modalActions: { flexDirection: "row", gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  modalBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
