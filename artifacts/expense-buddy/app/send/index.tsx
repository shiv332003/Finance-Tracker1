import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SplitAfterPaymentModal } from "@/components/SplitAfterPaymentModal";
import { useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

const CONTACTS = [
  { id: "u2", name: "Rahul Sharma", phone: "9876543210", initials: "RS", color: "#FF6B6B" },
  { id: "u3", name: "Priya Nair", phone: "9123456780", initials: "PN", color: "#4ECDC4" },
  { id: "u4", name: "Amit Kumar", phone: "9988776655", initials: "AK", color: "#45B7D1" },
  { id: "u5", name: "Sneha Patel", phone: "9234567890", initials: "SP", color: "#96CEB4" },
];

const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000];

export default function SendScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { sendMoney } = useData();

  const [step, setStep] = useState<"select" | "amount" | "success">("select");
  const [selected, setSelected] = useState<typeof CONTACTS[0] | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const handleSelectContact = (c: typeof CONTACTS[0]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(c);
    setStep("amount");
  };

  const handleSend = async () => {
    if (!selected || !amount) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setSending(true);
    try {
      await sendMoney(selected.name, selected.phone, parseFloat(amount), note);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep("success");
    } finally {
      setSending(false);
    }
  };

  const handleDone = () => {
    setShowSplitModal(false);
    router.back();
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => { if (step === "amount") setStep("select"); else router.back(); }}>
          <Feather name="arrow-left" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Send Money</Text>
        <View style={{ width: 22 }} />
      </View>

      {step === "select" && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100, gap: 20 }}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Choose recipient</Text>
            <View style={styles.contactList}>
              {CONTACTS.map((c) => (
                <Pressable
                  key={c.id}
                  style={({ pressed }) => [styles.contactCard, { backgroundColor: colors.card, opacity: pressed ? 0.85 : 1 }]}
                  onPress={() => handleSelectContact(c)}
                >
                  <View style={[styles.avatar, { backgroundColor: c.color + "22" }]}>
                    <Text style={[styles.initials, { color: c.color }]}>{c.initials}</Text>
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={[styles.contactName, { color: colors.text }]}>{c.name}</Text>
                    <Text style={[styles.contactPhone, { color: colors.mutedForeground }]}>+91 {c.phone}</Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>
      )}

      {step === "amount" && selected && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100, gap: 24 }}>
          <View style={styles.recipientRow}>
            <View style={[styles.recipientAvatar, { backgroundColor: selected.color + "22" }]}>
              <Text style={[styles.recipientInitials, { color: selected.color }]}>{selected.initials}</Text>
            </View>
            <View>
              <Text style={[styles.recipientName, { color: colors.text }]}>{selected.name}</Text>
              <Text style={[styles.recipientPhone, { color: colors.mutedForeground }]}>+91 {selected.phone}</Text>
            </View>
          </View>

          <View style={[styles.amountContainer, { backgroundColor: colors.card }]}>
            <Text style={[styles.amountLabel, { color: colors.mutedForeground }]}>Enter Amount</Text>
            <View style={styles.amountInputRow}>
              <Text style={[styles.rupeeSymbol, { color: colors.text }]}>₹</Text>
              <TextInput
                style={[styles.amountInput, { color: colors.text }]}
                placeholder="0"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
                autoFocus
              />
            </View>
            <View style={styles.quickAmounts}>
              {QUICK_AMOUNTS.map((q) => (
                <Pressable
                  key={q}
                  style={[styles.quickBtn, { backgroundColor: colors.accent }]}
                  onPress={() => setAmount(q.toString())}
                >
                  <Text style={[styles.quickBtnText, { color: colors.text }]}>+₹{q}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <TextInput
            style={[styles.noteInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
            placeholder="Add a note (optional)"
            placeholderTextColor={colors.mutedForeground}
            value={note}
            onChangeText={setNote}
          />

          <Pressable
            style={({ pressed }) => [styles.sendBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
            onPress={handleSend}
            disabled={!amount || sending}
          >
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="send" size={18} color="#fff" />
                <Text style={styles.sendBtnText}>Send ₹{parseFloat(amount || "0").toLocaleString("en-IN")}</Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      )}

      {step === "success" && selected && (
        <View style={styles.successScreen}>
          <View style={[styles.successCircle, { backgroundColor: colors.success + "18" }]}>
            <Feather name="check-circle" size={60} color={colors.success} />
          </View>
          <Text style={[styles.successTitle, { color: colors.text }]}>Sent!</Text>
          <Text style={[styles.successAmount, { color: colors.success }]}>
            ₹{parseFloat(amount).toLocaleString("en-IN")}
          </Text>
          <Text style={[styles.successTo, { color: colors.mutedForeground }]}>to {selected.name}</Text>
          {note ? <Text style={[styles.successNote, { color: colors.mutedForeground }]}>"{note}"</Text> : null}

          {/* Split prompt */}
          <View style={[styles.splitPromptCard, { backgroundColor: colors.primary + "14", borderColor: colors.primary + "33" }]}>
            <View style={styles.splitPromptRow}>
              <View style={[styles.splitPromptIcon, { backgroundColor: colors.primary + "22" }]}>
                <Feather name="divide-circle" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.splitPromptTitle, { color: colors.text }]}>Want to split this?</Text>
                <Text style={[styles.splitPromptSub, { color: colors.mutedForeground }]}>
                  Divide ₹{parseFloat(amount).toLocaleString("en-IN")} with your contacts or a group
                </Text>
              </View>
            </View>
            <Pressable
              style={[styles.splitYesBtn, { backgroundColor: colors.primary }]}
              onPress={() => setShowSplitModal(true)}
            >
              <Feather name="users" size={14} color="#fff" />
              <Text style={styles.splitYesBtnText}>Split this payment</Text>
            </Pressable>
          </View>

          <View style={styles.successActions}>
            <Pressable
              style={[styles.successBtn, { backgroundColor: colors.card }]}
              onPress={() => {
                setStep("select");
                setAmount("");
                setNote("");
                setSelected(null);
              }}
            >
              <Text style={[styles.successBtnText, { color: colors.text }]}>Send Again</Text>
            </Pressable>
            <Pressable
              style={[styles.successBtn, { backgroundColor: colors.secondary }]}
              onPress={() => router.back()}
            >
              <Text style={[styles.successBtnText, { color: colors.text }]}>Done</Text>
            </Pressable>
          </View>
        </View>
      )}

      <SplitAfterPaymentModal
        visible={showSplitModal}
        onClose={handleDone}
        amount={parseFloat(amount || "0")}
        description={note || `Payment to ${selected?.name ?? ""}`}
        toName={selected?.name}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 14 },
  contactList: { gap: 10 },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    gap: 12,
  },
  avatar: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  initials: { fontSize: 15, fontFamily: "Inter_700Bold" },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  contactPhone: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  recipientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
  },
  recipientAvatar: { width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  recipientInitials: { fontSize: 18, fontFamily: "Inter_700Bold" },
  recipientName: { fontSize: 18, fontFamily: "Inter_700Bold" },
  recipientPhone: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  amountContainer: { borderRadius: 20, padding: 24, gap: 16 },
  amountLabel: { fontSize: 12, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },
  amountInputRow: { flexDirection: "row", alignItems: "center" },
  rupeeSymbol: { fontSize: 32, fontFamily: "Inter_600SemiBold", marginRight: 8 },
  amountInput: { flex: 1, fontSize: 48, fontFamily: "Inter_700Bold" },
  quickAmounts: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  quickBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  noteInput: {
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    borderRadius: 16,
  },
  sendBtnText: { color: "#fff", fontSize: 17, fontFamily: "Inter_700Bold" },
  successScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 24,
  },
  successCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  successTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  successAmount: { fontSize: 44, fontFamily: "Inter_700Bold" },
  successTo: { fontSize: 15, fontFamily: "Inter_400Regular" },
  successNote: { fontSize: 14, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  splitPromptCard: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    gap: 12,
    marginTop: 8,
  },
  splitPromptRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  splitPromptIcon: { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  splitPromptTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  splitPromptSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  splitYesBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 11,
    borderRadius: 10,
  },
  splitYesBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
  successActions: { flexDirection: "row", gap: 12, marginTop: 4 },
  successBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  successBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
