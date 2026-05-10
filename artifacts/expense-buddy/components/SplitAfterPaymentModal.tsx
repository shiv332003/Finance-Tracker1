import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useData, Group } from "@/context/DataContext";
import { useNotifications } from "@/context/NotificationContext";
import { useColors } from "@/hooks/useColors";

type Step =
  | "ask"
  | "choose_type"
  | "individual_contact"
  | "individual_amount"
  | "group_select"
  | "group_description"
  | "group_split_type"
  | "group_custom_amounts"
  | "success";

interface SplitContact {
  id: string;
  name: string;
  initials: string;
  color: string;
  phone: string;
}

const CONTACTS: SplitContact[] = [
  { id: "u2", name: "Rahul Sharma", initials: "RS", color: "#FF6B6B", phone: "9876543210" },
  { id: "u3", name: "Priya Nair", initials: "PN", color: "#4ECDC4", phone: "9123456780" },
  { id: "u4", name: "Amit Kumar", initials: "AK", color: "#45B7D1", phone: "9988776655" },
  { id: "u5", name: "Sneha Patel", initials: "SP", color: "#96CEB4", phone: "9234567890" },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  amount: number;
  description: string;
  toName?: string;
}

export function SplitAfterPaymentModal({ visible, onClose, amount, description, toName }: Props) {
  const colors = useColors();
  const { groups, addExpense } = useData();
  const { addNotification } = useNotifications();

  const [step, setStep] = useState<Step>("ask");
  const [selectedContact, setSelectedContact] = useState<SplitContact | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [contactShare, setContactShare] = useState("");
  const [expDesc, setExpDesc] = useState(description);
  const [splitType, setSplitType] = useState<"equal" | "unequal">("equal");
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setStep("ask");
      setSelectedContact(null);
      setSelectedGroup(null);
      setContactShare((amount / 2).toFixed(2));
      setExpDesc(description);
      setSplitType("equal");
      setCustomAmounts({});
      setSelectedMembers([]);
    }
  }, [visible, amount, description]);

  const close = useCallback(() => {
    setStep("ask");
    onClose();
  }, [onClose]);

  const back = useCallback(() => {
    const backMap: Partial<Record<Step, Step>> = {
      choose_type: "ask",
      individual_contact: "choose_type",
      individual_amount: "individual_contact",
      group_select: "choose_type",
      group_description: "group_select",
      group_split_type: "group_description",
      group_custom_amounts: "group_split_type",
    };
    const prev = backMap[step];
    if (prev) setStep(prev);
    else close();
  }, [step, close]);

  const handleSelectGroup = (g: Group) => {
    setSelectedGroup(g);
    const memberIds = g.members.filter((m) => m.id !== "me").map((m) => m.id);
    setSelectedMembers(memberIds);
    const perPerson = amount / g.members.length;
    const init: Record<string, string> = {};
    g.members.forEach((m) => { init[m.id] = perPerson.toFixed(2); });
    setCustomAmounts(init);
    setStep("group_description");
  };

  const toggleMember = (id: string) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const perPersonAmount = () => {
    if (!selectedGroup) return 0;
    const count = selectedMembers.length + 1;
    return amount / count;
  };

  const customTotal = () =>
    Object.values(customAmounts).reduce((s, v) => s + (parseFloat(v) || 0), 0);

  const handleIndividualSplit = async () => {
    if (!selectedContact) return;
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      const share = parseFloat(contactShare) || amount / 2;
      await addNotification({
        type: "split_request",
        title: `Split request sent to ${selectedContact.name}`,
        body: `${selectedContact.name} owes you ₹${share.toFixed(0)} for ${expDesc}`,
        amount: share,
        fromPerson: selectedContact.name,
      });
      await addNotification({
        type: "split_request",
        title: `${selectedContact.name} received your split request`,
        body: `They owe you ₹${share.toFixed(0)} · ${expDesc}`,
        amount: share,
        fromPerson: selectedContact.name,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep("success");
    } finally {
      setSaving(false);
    }
  };

  const handleGroupSplit = async () => {
    if (!selectedGroup) return;
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      const splits =
        splitType === "equal"
          ? selectedGroup.members.map((m) => ({
              userId: m.id,
              amount: perPersonAmount(),
              settled: m.id === "me",
            }))
          : selectedGroup.members.map((m) => ({
              userId: m.id,
              amount: parseFloat(customAmounts[m.id] ?? "0") || 0,
              settled: m.id === "me",
            }));

      await addExpense({
        groupId: selectedGroup.id,
        title: expDesc || description,
        amount,
        paidBy: "me",
        paidByName: "You",
        splits,
        date: new Date().toISOString().split("T")[0],
        category: "Transfer",
      });

      const groupMembers = selectedGroup.members.filter((m) => m.id !== "me" && selectedMembers.includes(m.id));
      for (const m of groupMembers) {
        const share = splitType === "equal" ? perPersonAmount() : parseFloat(customAmounts[m.id] ?? "0") || 0;
        await addNotification({
          type: "split_request",
          title: `Split sent to ${m.name}`,
          body: `${m.name} owes you ₹${share.toFixed(0)} for "${expDesc}" in ${selectedGroup.name}`,
          amount: share,
          groupId: selectedGroup.id,
          fromPerson: m.name,
        });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep("success");
    } finally {
      setSaving(false);
    }
  };

  const renderHeader = (title: string) => (
    <View style={styles.sheetHeader}>
      {step !== "ask" && step !== "success" ? (
        <Pressable style={styles.backBtn} onPress={back}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </Pressable>
      ) : <View style={styles.backBtn} />}
      <Text style={[styles.sheetTitle, { color: colors.text }]}>{title}</Text>
      <Pressable style={styles.closeBtn} onPress={close}>
        <Feather name="x" size={20} color={colors.mutedForeground} />
      </Pressable>
    </View>
  );

  const renderContent = () => {
    switch (step) {
      case "ask":
        return (
          <>
            {renderHeader("Payment Detected")}
            <View style={styles.paymentSummary}>
              <View style={[styles.paymentAmountBox, { backgroundColor: colors.primary + "18" }]}>
                <Text style={[styles.paymentLabel, { color: colors.mutedForeground }]}>You paid</Text>
                <Text style={[styles.paymentAmount, { color: colors.primary }]}>
                  ₹{amount.toLocaleString("en-IN")}
                </Text>
                {toName && <Text style={[styles.paymentTo, { color: colors.mutedForeground }]}>to {toName}</Text>}
                <Text style={[styles.paymentDesc, { color: colors.text }]}>{description}</Text>
              </View>
            </View>
            <Text style={[styles.questionText, { color: colors.text }]}>
              Want to split this payment with others?
            </Text>
            <View style={styles.askActions}>
              <Pressable
                style={[styles.askBtn, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1.5 }]}
                onPress={close}
              >
                <Feather name="x-circle" size={20} color={colors.mutedForeground} />
                <Text style={[styles.askBtnText, { color: colors.text }]}>No, thanks</Text>
              </Pressable>
              <Pressable
                style={[styles.askBtn, { backgroundColor: colors.primary }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setStep("choose_type"); }}
              >
                <Feather name="divide-circle" size={20} color="#fff" />
                <Text style={[styles.askBtnText, { color: "#fff" }]}>Yes, Split!</Text>
              </Pressable>
            </View>
          </>
        );

      case "choose_type":
        return (
          <>
            {renderHeader("Split with")}
            <View style={styles.chooseRow}>
              <Pressable
                style={[styles.typeCard, { backgroundColor: colors.card, borderColor: colors.primary + "44", borderWidth: 1.5 }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setStep("individual_contact"); }}
              >
                <View style={[styles.typeIcon, { backgroundColor: colors.primary + "18" }]}>
                  <Feather name="user" size={28} color={colors.primary} />
                </View>
                <Text style={[styles.typeTitle, { color: colors.text }]}>Individual</Text>
                <Text style={[styles.typeSub, { color: colors.mutedForeground }]}>Split with one person</Text>
              </Pressable>
              <Pressable
                style={[styles.typeCard, { backgroundColor: colors.card, borderColor: colors.success + "44", borderWidth: 1.5 }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setStep("group_select"); }}
              >
                <View style={[styles.typeIcon, { backgroundColor: colors.success + "18" }]}>
                  <Feather name="users" size={28} color={colors.success} />
                </View>
                <Text style={[styles.typeTitle, { color: colors.text }]}>Group</Text>
                <Text style={[styles.typeSub, { color: colors.mutedForeground }]}>Split across a group</Text>
              </Pressable>
            </View>
          </>
        );

      case "individual_contact":
        return (
          <>
            {renderHeader("Choose Contact")}
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              {CONTACTS.map((c) => (
                <Pressable
                  key={c.id}
                  style={[
                    styles.contactRow,
                    {
                      backgroundColor: selectedContact?.id === c.id ? colors.primary + "14" : colors.card,
                      borderColor: selectedContact?.id === c.id ? colors.primary : colors.border,
                      borderWidth: 1.5,
                    },
                  ]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedContact(c); }}
                >
                  <View style={[styles.avatar, { backgroundColor: c.color + "22" }]}>
                    <Text style={[styles.initials, { color: c.color }]}>{c.initials}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.contactName, { color: colors.text }]}>{c.name}</Text>
                    <Text style={[styles.contactPhone, { color: colors.mutedForeground }]}>+91 {c.phone}</Text>
                  </View>
                  {selectedContact?.id === c.id && (
                    <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
                      <Feather name="check" size={12} color="#fff" />
                    </View>
                  )}
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              style={[styles.nextBtn, { backgroundColor: selectedContact ? colors.primary : colors.muted }]}
              onPress={() => { if (selectedContact) setStep("individual_amount"); }}
              disabled={!selectedContact}
            >
              <Text style={styles.nextBtnText}>Continue</Text>
              <Feather name="arrow-right" size={16} color="#fff" />
            </Pressable>
          </>
        );

      case "individual_amount":
        return (
          <>
            {renderHeader(`Split with ${selectedContact?.name}`)}
            <View style={[styles.splitAmountCard, { backgroundColor: colors.secondary }]}>
              <View style={styles.splitRow}>
                <View style={[styles.avatarSm, { backgroundColor: "#7C5CFF22" }]}>
                  <Text style={[styles.initialsSm, { color: "#7C5CFF" }]}>ME</Text>
                </View>
                <Text style={[styles.splitPerson, { color: colors.text }]}>You</Text>
                <Text style={[styles.splitMyAmount, { color: colors.text }]}>
                  ₹{(amount - (parseFloat(contactShare) || 0)).toFixed(2)}
                </Text>
              </View>
              <View style={[styles.dividerH, { backgroundColor: colors.border }]} />
              <View style={styles.splitRow}>
                <View style={[styles.avatarSm, { backgroundColor: selectedContact!.color + "22" }]}>
                  <Text style={[styles.initialsSm, { color: selectedContact!.color }]}>{selectedContact!.initials}</Text>
                </View>
                <Text style={[styles.splitPerson, { color: colors.text }]}>{selectedContact!.name}</Text>
                <View style={[styles.shareInput, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.rupee, { color: colors.mutedForeground }]}>₹</Text>
                  <TextInput
                    style={[styles.shareTextInput, { color: colors.text }]}
                    value={contactShare}
                    onChangeText={setContactShare}
                    keyboardType="decimal-pad"
                    placeholder={(amount / 2).toFixed(2)}
                    placeholderTextColor={colors.mutedForeground}
                  />
                </View>
              </View>
            </View>
            <View style={[styles.quickShareRow]}>
              {["50%", "33%", "25%"].map((p) => {
                const pct = parseInt(p) / 100;
                const val = (amount * pct).toFixed(2);
                return (
                  <Pressable
                    key={p}
                    style={[styles.quickShareBtn, { backgroundColor: colors.accent }]}
                    onPress={() => setContactShare(val)}
                  >
                    <Text style={[styles.quickShareText, { color: colors.text }]}>{p}</Text>
                    <Text style={[styles.quickShareAmt, { color: colors.mutedForeground }]}>₹{parseFloat(val).toFixed(0)}</Text>
                  </Pressable>
                );
              })}
            </View>
            <TextInput
              style={[styles.noteInput, { backgroundColor: colors.secondary, color: colors.text, borderColor: colors.border }]}
              placeholder="Description (optional)"
              placeholderTextColor={colors.mutedForeground}
              value={expDesc}
              onChangeText={setExpDesc}
            />
            <Pressable
              style={[styles.nextBtn, { backgroundColor: colors.primary }]}
              onPress={handleIndividualSplit}
              disabled={saving}
            >
              <Feather name="send" size={16} color="#fff" />
              <Text style={styles.nextBtnText}>
                {saving ? "Sending..." : `Send Split Request ₹${parseFloat(contactShare || "0").toFixed(0)}`}
              </Text>
            </Pressable>
          </>
        );

      case "group_select":
        return (
          <>
            {renderHeader("Choose Group")}
            {groups.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="account-group-outline" size={40} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No groups yet. Create one first.</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
                {groups.map((g) => (
                  <Pressable
                    key={g.id}
                    style={[styles.groupRow, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleSelectGroup(g); }}
                  >
                    <View style={[styles.groupIcon, { backgroundColor: colors.primary + "18" }]}>
                      <MaterialCommunityIcons name="account-group-outline" size={22} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.groupName, { color: colors.text }]}>{g.name}</Text>
                      <Text style={[styles.groupMeta, { color: colors.mutedForeground }]}>{g.members.length} members</Text>
                    </View>
                    <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </>
        );

      case "group_description":
        return (
          <>
            {renderHeader(selectedGroup?.name ?? "Group Split")}
            <TextInput
              style={[styles.descInput, { backgroundColor: colors.secondary, color: colors.text, borderColor: colors.border }]}
              placeholder="What's this expense for?"
              placeholderTextColor={colors.mutedForeground}
              value={expDesc}
              onChangeText={setExpDesc}
              autoFocus
            />
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>SPLIT BETWEEN</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 260 }}>
              {selectedGroup?.members.filter((m) => m.id !== "me").map((m) => (
                <Pressable
                  key={m.id}
                  style={[
                    styles.memberToggle,
                    {
                      backgroundColor: selectedMembers.includes(m.id) ? m.color + "14" : colors.card,
                      borderColor: selectedMembers.includes(m.id) ? m.color : colors.border,
                      borderWidth: 1.5,
                    },
                  ]}
                  onPress={() => toggleMember(m.id)}
                >
                  <View style={[styles.avatarSm, { backgroundColor: m.color + "22" }]}>
                    <Text style={[styles.initialsSm, { color: m.color }]}>{m.initials}</Text>
                  </View>
                  <Text style={[styles.memberName, { color: colors.text }]}>{m.name}</Text>
                  <View
                    style={[
                      styles.checkbox,
                      {
                        backgroundColor: selectedMembers.includes(m.id) ? m.color : "transparent",
                        borderColor: selectedMembers.includes(m.id) ? m.color : colors.border,
                      },
                    ]}
                  >
                    {selectedMembers.includes(m.id) && <Feather name="check" size={11} color="#fff" />}
                  </View>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              style={[styles.nextBtn, { backgroundColor: expDesc.trim() && selectedMembers.length > 0 ? colors.primary : colors.muted }]}
              onPress={() => { if (expDesc.trim() && selectedMembers.length > 0) setStep("group_split_type"); }}
              disabled={!expDesc.trim() || selectedMembers.length === 0}
            >
              <Text style={styles.nextBtnText}>Continue</Text>
              <Feather name="arrow-right" size={16} color="#fff" />
            </Pressable>
          </>
        );

      case "group_split_type":
        return (
          <>
            {renderHeader("How to split?")}
            <View style={[styles.totalBox, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Total Amount</Text>
              <Text style={[styles.totalAmount, { color: colors.text }]}>₹{amount.toLocaleString("en-IN")}</Text>
              <Text style={[styles.totalSub, { color: colors.mutedForeground }]}>
                {selectedMembers.length + 1} people · ₹{perPersonAmount().toFixed(2)} each (if equal)
              </Text>
            </View>
            <View style={styles.splitTypeRow}>
              <Pressable
                style={[
                  styles.splitTypeCard,
                  {
                    backgroundColor: splitType === "equal" ? colors.primary + "18" : colors.card,
                    borderColor: splitType === "equal" ? colors.primary : colors.border,
                    borderWidth: 2,
                  },
                ]}
                onPress={() => setSplitType("equal")}
              >
                <Feather name="users" size={24} color={splitType === "equal" ? colors.primary : colors.mutedForeground} />
                <Text style={[styles.splitTypeTitle, { color: splitType === "equal" ? colors.primary : colors.text }]}>Equal Split</Text>
                <Text style={[styles.splitTypeSub, { color: colors.mutedForeground }]}>₹{perPersonAmount().toFixed(2)} each</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.splitTypeCard,
                  {
                    backgroundColor: splitType === "unequal" ? colors.warning + "18" : colors.card,
                    borderColor: splitType === "unequal" ? colors.warning : colors.border,
                    borderWidth: 2,
                  },
                ]}
                onPress={() => setSplitType("unequal")}
              >
                <Feather name="sliders" size={24} color={splitType === "unequal" ? colors.warning : colors.mutedForeground} />
                <Text style={[styles.splitTypeTitle, { color: splitType === "unequal" ? colors.warning : colors.text }]}>Custom</Text>
                <Text style={[styles.splitTypeSub, { color: colors.mutedForeground }]}>Set each person's share</Text>
              </Pressable>
            </View>
            <Pressable
              style={[styles.nextBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                if (splitType === "equal") {
                  handleGroupSplit();
                } else {
                  setStep("group_custom_amounts");
                }
              }}
              disabled={saving}
            >
              <Text style={styles.nextBtnText}>
                {saving ? "Splitting..." : splitType === "equal" ? "Confirm Equal Split" : "Set Custom Amounts"}
              </Text>
              <Feather name="arrow-right" size={16} color="#fff" />
            </Pressable>
          </>
        );

      case "group_custom_amounts": {
        const total = customTotal();
        const diff = amount - total;
        return (
          <>
            {renderHeader("Custom Amounts")}
            <View style={[styles.customTotalBar, { backgroundColor: Math.abs(diff) < 0.5 ? colors.success + "18" : colors.warning + "18", borderColor: Math.abs(diff) < 0.5 ? colors.success : colors.warning }]}>
              <Text style={[styles.customTotalText, { color: Math.abs(diff) < 0.5 ? colors.success : colors.warning }]}>
                Assigned ₹{total.toFixed(2)} of ₹{amount.toFixed(2)}
                {Math.abs(diff) >= 0.5 && `  (₹${Math.abs(diff).toFixed(2)} ${diff > 0 ? "remaining" : "over"})`}
              </Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 280 }}>
              {selectedGroup?.members.map((m) => (
                <View key={m.id} style={[styles.customRow, { borderBottomColor: colors.border }]}>
                  <View style={[styles.avatarSm, { backgroundColor: m.color + "22" }]}>
                    <Text style={[styles.initialsSm, { color: m.color }]}>{m.initials}</Text>
                  </View>
                  <Text style={[styles.customName, { color: colors.text }]}>
                    {m.id === "me" ? "You" : m.name}
                  </Text>
                  <View style={[styles.customInput, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                    <Text style={[styles.rupee, { color: colors.mutedForeground }]}>₹</Text>
                    <TextInput
                      style={[styles.customTextInput, { color: colors.text }]}
                      value={customAmounts[m.id] ?? ""}
                      onChangeText={(v) => setCustomAmounts((prev) => ({ ...prev, [m.id]: v }))}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor={colors.mutedForeground}
                    />
                  </View>
                </View>
              ))}
            </ScrollView>
            <Pressable
              style={[
                styles.nextBtn,
                { backgroundColor: Math.abs(diff) < 0.5 ? colors.primary : colors.muted },
              ]}
              onPress={handleGroupSplit}
              disabled={saving || Math.abs(diff) >= 0.5}
            >
              <Feather name="check-circle" size={16} color="#fff" />
              <Text style={styles.nextBtnText}>
                {saving ? "Splitting..." : "Confirm Split"}
              </Text>
            </Pressable>
          </>
        );
      }

      case "success":
        return (
          <View style={styles.successContent}>
            <View style={[styles.successCircle, { backgroundColor: colors.success + "18" }]}>
              <Feather name="check-circle" size={52} color={colors.success} />
            </View>
            <Text style={[styles.successTitle, { color: colors.text }]}>Split Created!</Text>
            <Text style={[styles.successSub, { color: colors.mutedForeground }]}>
              {selectedContact
                ? `${selectedContact.name} has been notified with their share of ₹${parseFloat(contactShare || "0").toFixed(0)}`
                : selectedGroup
                ? `All ${selectedMembers.length} members of ${selectedGroup.name} have been notified`
                : "Expense recorded"}
            </Text>
            <View style={[styles.notifNote, { backgroundColor: colors.primary + "14", borderColor: colors.primary + "33" }]}>
              <Feather name="bell" size={14} color={colors.primary} />
              <Text style={[styles.notifNoteText, { color: colors.primary }]}>
                Notifications sent to all participants
              </Text>
            </View>
            <Pressable style={[styles.doneBtn, { backgroundColor: colors.primary }]} onPress={close}>
              <Text style={styles.doneBtnText}>Done</Text>
            </Pressable>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          {renderContent()}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.6)" },
  sheet: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingBottom: 36, gap: 16 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 4 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  closeBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  sheetTitle: { fontSize: 18, fontFamily: "Inter_700Bold", flex: 1, textAlign: "center" },
  paymentSummary: { alignItems: "center" },
  paymentAmountBox: { padding: 20, borderRadius: 18, alignItems: "center", width: "100%", gap: 4 },
  paymentLabel: { fontSize: 12, fontFamily: "Inter_400Regular", textTransform: "uppercase", letterSpacing: 0.5 },
  paymentAmount: { fontSize: 40, fontFamily: "Inter_700Bold" },
  paymentTo: { fontSize: 13, fontFamily: "Inter_400Regular" },
  paymentDesc: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginTop: 2 },
  questionText: { fontSize: 16, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  askActions: { flexDirection: "row", gap: 12 },
  askBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14 },
  askBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  chooseRow: { flexDirection: "row", gap: 12 },
  typeCard: { flex: 1, padding: 20, borderRadius: 18, alignItems: "center", gap: 10 },
  typeIcon: { width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  typeTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  typeSub: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
  contactRow: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 12, marginBottom: 8, gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  initials: { fontSize: 14, fontFamily: "Inter_700Bold" },
  contactName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  contactPhone: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  checkCircle: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  nextBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15, borderRadius: 14 },
  nextBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  splitAmountCard: { borderRadius: 16, padding: 16, gap: 12 },
  splitRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatarSm: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  initialsSm: { fontSize: 12, fontFamily: "Inter_700Bold" },
  splitPerson: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  splitMyAmount: { fontSize: 15, fontFamily: "Inter_700Bold" },
  shareInput: { flexDirection: "row", alignItems: "center", borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 10, paddingVertical: 6 },
  rupee: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginRight: 4 },
  shareTextInput: { fontSize: 18, fontFamily: "Inter_700Bold", minWidth: 60, textAlign: "right" },
  dividerH: { height: 1 },
  quickShareRow: { flexDirection: "row", gap: 10 },
  quickShareBtn: { flex: 1, padding: 10, borderRadius: 10, alignItems: "center" },
  quickShareText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  quickShareAmt: { fontSize: 11, fontFamily: "Inter_400Regular" },
  noteInput: { borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontFamily: "Inter_400Regular" },
  groupRow: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 12, marginBottom: 8, gap: 12 },
  groupIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  groupName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  groupMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  descInput: { borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 14, fontSize: 15, fontFamily: "Inter_400Regular" },
  fieldLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 1, textTransform: "uppercase" },
  memberToggle: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 12, marginBottom: 8, gap: 10 },
  memberName: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  totalBox: { padding: 16, borderRadius: 14, gap: 4, alignItems: "center" },
  totalLabel: { fontSize: 11, fontFamily: "Inter_400Regular", textTransform: "uppercase" },
  totalAmount: { fontSize: 32, fontFamily: "Inter_700Bold" },
  totalSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  splitTypeRow: { flexDirection: "row", gap: 12 },
  splitTypeCard: { flex: 1, padding: 16, borderRadius: 16, alignItems: "center", gap: 8 },
  splitTypeTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  splitTypeSub: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
  customTotalBar: { padding: 10, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  customTotalText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  customRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  customName: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  customInput: { flexDirection: "row", alignItems: "center", borderRadius: 8, borderWidth: 1.5, paddingHorizontal: 8, paddingVertical: 4 },
  customTextInput: { fontSize: 16, fontFamily: "Inter_700Bold", minWidth: 60, textAlign: "right" },
  emptyState: { alignItems: "center", gap: 10, paddingVertical: 32 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  successContent: { alignItems: "center", gap: 14, paddingVertical: 8 },
  successCircle: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center" },
  successTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
  successSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  notifNote: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, width: "100%" },
  notifNoteText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  doneBtn: { paddingVertical: 14, paddingHorizontal: 48, borderRadius: 14 },
  doneBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
});
