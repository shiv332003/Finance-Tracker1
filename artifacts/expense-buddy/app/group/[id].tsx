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

  const group = groups.find((g) => g.id === id);

  const [tab, setTab] = useState<"expenses" | "wallet" | "members">("expenses");
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [expTitle, setExpTitle] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expCategory, setExpCategory] = useState("Food");
  const [walletAmount, setWalletAmount] = useState("");
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

  const availableContacts = ALL_CONTACTS.filter(
    (c) => !group.members.find((m) => m.id === c.id)
  );

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
      setExpTitle("");
      setExpAmount("");
      setShowAddExpense(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } finally {
      setAdding(false);
    }
  };

  const handleAddFunds = async () => {
    if (!walletAmount) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await addWalletContribution(group.id, parseFloat(walletAmount), "You");
    setWalletAmount("");
    setShowAddFunds(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleAddMember = async (contact: Omit<Member, "contribution">) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await addGroupMember(group.id, contact);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleRemoveMember = (memberId: string, memberName: string) => {
    if (memberId === "me") return;
    Alert.alert(
      "Remove Member",
      `Remove ${memberName} from this group?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await removeGroupMember(group.id, memberId);
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.text} />
        </Pressable>
        <View style={styles.headerInfo}>
          <Text style={[styles.groupName, { color: colors.text }]}>{group.name}</Text>
          <Text style={[styles.memberCount, { color: colors.mutedForeground }]}>
            {group.members.length} members
          </Text>
        </View>
        <Pressable
          style={[styles.addExpBtn, { backgroundColor: colors.primary }]}
          onPress={() => setShowAddExpense(true)}
        >
          <Feather name="plus" size={16} color="#fff" />
          <Text style={styles.addExpBtnText}>Add</Text>
        </Pressable>
      </View>

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
                      <Text style={[styles.expPaidBy, { color: colors.mutedForeground }]}>
                        Paid by {expense.paidByName}
                      </Text>
                      <Text style={[styles.expAmount, { color: colors.text }]}>₹{expense.amount.toLocaleString("en-IN")}</Text>
                    </View>
                    {/* Per-member settlement status */}
                    <View style={styles.splitsRow}>
                      {expense.splits.slice(0, 4).map((s) => {
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
                        <Text style={[styles.myShare, { color: colors.mutedForeground }]}>
                          Your share: ₹{myShare.amount.toFixed(0)}
                        </Text>
                        {settled ? (
                          <View style={[styles.settledBadge, { backgroundColor: colors.success + "22" }]}>
                            <Feather name="check-circle" size={12} color={colors.success} />
                            <Text style={[styles.settledText, { color: colors.success }]}>Settled</Text>
                          </View>
                        ) : (
                          <Pressable
                            style={[styles.settleBtn, { backgroundColor: colors.primary }]}
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                              settleExpense(group.id, expense.id, "me");
                            }}
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

        {tab === "wallet" && (
          <View style={{ paddingHorizontal: 16, gap: 12 }}>
            <View style={[styles.walletCard, { backgroundColor: colors.primary }]}>
              <Text style={styles.walletLabel}>Shared Wallet Balance</Text>
              <Text style={styles.walletBalance}>₹{group.walletBalance.toLocaleString("en-IN")}</Text>
              <View style={styles.limitRow}>
                <Text style={styles.limitText}>Limit: ₹{group.walletLimit.toLocaleString("en-IN")}</Text>
                <View style={[styles.limitBar, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                  <View style={[styles.limitFill, { width: `${Math.min((group.walletBalance / group.walletLimit) * 100, 100)}%` as any }]} />
                </View>
              </View>
              <Pressable
                style={[styles.addFundsBtn, { backgroundColor: "rgba(255,255,255,0.2)" }]}
                onPress={() => setShowAddFunds(true)}
              >
                <Feather name="plus-circle" size={16} color="#fff" />
                <Text style={styles.addFundsBtnText}>Add Funds</Text>
              </Pressable>
            </View>

            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>TRANSACTIONS</Text>
            {group.walletTransactions.map((tx) => (
              <View key={tx.id} style={[styles.walletTxRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
          </View>
        )}

        {tab === "members" && (
          <View style={{ paddingHorizontal: 16, gap: 10 }}>
            {/* Add Member Button */}
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

            {group.members.map((member) => (
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
                  </View>
                  <Text style={[styles.memberContrib, { color: colors.mutedForeground }]}>
                    Contributed: ₹{member.contribution.toLocaleString("en-IN")}
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
            ))}
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
                  style={[
                    styles.catChip,
                    {
                      backgroundColor: expCategory === c ? colors.primary + "22" : colors.secondary,
                      borderColor: expCategory === c ? colors.primary : "transparent",
                      borderWidth: 1.5,
                    },
                  ]}
                  onPress={() => setExpCategory(c)}
                >
                  <Text style={[styles.catChipText, { color: expCategory === c ? colors.primary : colors.mutedForeground }]}>
                    {c}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Text style={[styles.splitInfo, { color: colors.mutedForeground }]}>
              Split equally among {group.members.length} members
            </Text>
            {expAmount ? (
              <Text style={[styles.perPersonText, { color: colors.text }]}>
                ₹{(parseFloat(expAmount) / group.members.length).toFixed(2)} per person
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
                <Text style={[styles.modalBtnText, { color: "#fff" }]}>
                  {adding ? "Adding..." : "Add Expense"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Funds Modal */}
      <Modal visible={showAddFunds} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.card }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Add to Wallet</Text>
            <View style={[styles.amountRow, { backgroundColor: colors.input, borderColor: colors.border }]}>
              <Text style={[styles.rupee, { color: colors.text }]}>₹</Text>
              <TextInput
                style={[styles.amountInput, { color: colors.text }]}
                placeholder="Amount"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
                value={walletAmount}
                onChangeText={setWalletAmount}
                autoFocus
              />
            </View>
            <View style={styles.modalActions}>
              <Pressable style={[styles.modalBtn, { backgroundColor: colors.secondary }]} onPress={() => setShowAddFunds(false)}>
                <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: colors.success, flex: 1.5 }]}
                onPress={handleAddFunds}
                disabled={!walletAmount}
              >
                <Text style={[styles.modalBtnText, { color: "#fff" }]}>Add Funds</Text>
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
              {availableContacts.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.mutedForeground, textAlign: "center", paddingVertical: 24 }]}>
                  All contacts are already in this group
                </Text>
              ) : (
                availableContacts.map((c) => (
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
                ))
              )}
            </ScrollView>
            <Pressable
              style={[styles.modalBtn, { backgroundColor: colors.secondary }]}
              onPress={() => setShowAddMember(false)}
            >
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
  walletCard: { borderRadius: 20, padding: 24, gap: 12 },
  walletLabel: { fontSize: 12, color: "rgba(255,255,255,0.7)", fontFamily: "Inter_400Regular", textTransform: "uppercase", letterSpacing: 0.5 },
  walletBalance: { fontSize: 36, color: "#fff", fontFamily: "Inter_700Bold" },
  limitRow: { gap: 8 },
  limitText: { fontSize: 12, color: "rgba(255,255,255,0.7)", fontFamily: "Inter_400Regular" },
  limitBar: { height: 6, borderRadius: 3, overflow: "hidden" },
  limitFill: { height: "100%", backgroundColor: "rgba(255,255,255,0.8)", borderRadius: 3 },
  addFundsBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, alignSelf: "flex-start" },
  addFundsBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 13 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, textTransform: "uppercase" },
  walletTxRow: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, gap: 12 },
  walletTxIcon: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  walletTxInfo: { flex: 1 },
  walletTxDesc: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  walletTxBy: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  walletTxAmount: { fontSize: 15, fontFamily: "Inter_700Bold" },
  addMemberBtn: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 14, borderWidth: 1.5 },
  addMemberIcon: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  addMemberText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  memberCard: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 14, gap: 12 },
  memberAvatar: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  memberInitials: { fontSize: 15, fontFamily: "Inter_700Bold" },
  memberInfo: { flex: 1 },
  memberNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  memberName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  memberContrib: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  youBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7 },
  youBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
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
  perPersonText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  modalActions: { flexDirection: "row", gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  modalBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
