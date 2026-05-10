import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
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
import { useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

const CONTACTS = [
  { id: "u2", name: "Rahul Sharma", phone: "9876543210", initials: "RS", color: "#FF6B6B" },
  { id: "u3", name: "Priya Nair", phone: "9123456780", initials: "PN", color: "#4ECDC4" },
  { id: "u4", name: "Amit Kumar", phone: "9988776655", initials: "AK", color: "#45B7D1" },
  { id: "u5", name: "Sneha Patel", phone: "9234567890", initials: "SP", color: "#96CEB4" },
];

export default function PayScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { sendMoney, transactions } = useData();

  const [sending, setSending] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [selectedContact, setSelectedContact] = useState<typeof CONTACTS[0] | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [success, setSuccess] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const payTxs = transactions.filter((t) => t.type === "sent" || t.type === "received").slice(0, 6);

  const handleSend = async () => {
    if (!selectedContact || !amount) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setSending(true);
    try {
      await sendMoney(selectedContact.name, selectedContact.phone, parseFloat(amount), note);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setShowSend(false);
        setAmount("");
        setNote("");
        setSelectedContact(null);
      }, 2000);
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Text style={[styles.title, { color: colors.text }]}>Pay</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 100, paddingHorizontal: 16 }}
      >
        <View style={styles.mainActions}>
          <Pressable
            style={({ pressed }) => [styles.bigBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
            onPress={() => setShowSend(true)}
          >
            <View style={[styles.bigBtnIcon, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
              <Feather name="send" size={24} color="#fff" />
            </View>
            <Text style={styles.bigBtnTitle}>Send Money</Text>
            <Text style={styles.bigBtnSub}>Transfer to contacts</Text>
          </Pressable>

          <View style={styles.secondaryActions}>
            <Pressable
              style={({ pressed }) => [styles.secBtn, { backgroundColor: colors.card, opacity: pressed ? 0.85 : 1 }]}
              onPress={() => setShowQR(true)}
            >
              <Feather name="camera" size={22} color={colors.primary} />
              <Text style={[styles.secBtnLabel, { color: colors.text }]}>Scan QR</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.secBtn, { backgroundColor: colors.card, opacity: pressed ? 0.85 : 1 }]}
              onPress={() => router.push("/split/new")}
            >
              <Feather name="divide-circle" size={22} color={colors.success} />
              <Text style={[styles.secBtnLabel, { color: colors.text }]}>Split Bill</Text>
            </Pressable>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 28, marginBottom: 8 }]}>
          Send to
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
          {CONTACTS.map((c) => (
            <Pressable
              key={c.id}
              style={[styles.contactChip, { backgroundColor: colors.card }]}
              onPress={() => { setSelectedContact(c); setShowSend(true); }}
            >
              <View style={[styles.contactAvatar, { backgroundColor: c.color + "22" }]}>
                <Text style={[styles.contactInitials, { color: c.color }]}>{c.initials}</Text>
              </View>
              <Text style={[styles.contactName, { color: colors.text }]} numberOfLines={1}>{c.name.split(" ")[0]}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24, marginBottom: 8 }]}>Recent Payments</Text>
        <View style={[styles.txList, { backgroundColor: colors.card }]}>
          {payTxs.length === 0 ? (
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No payments yet</Text>
            </View>
          ) : (
            payTxs.map((tx) => (
              <View key={tx.id} style={[styles.txRow, { borderBottomColor: colors.border }]}>
                <View style={[styles.txAvatar, { backgroundColor: tx.personColor + "22" }]}>
                  <Text style={[styles.txInitials, { color: tx.personColor }]}>{tx.personInitials}</Text>
                </View>
                <View style={styles.txInfo}>
                  <Text style={[styles.txPerson, { color: colors.text }]}>{tx.person}</Text>
                  <Text style={[styles.txDate, { color: colors.mutedForeground }]}>{tx.date}</Text>
                </View>
                <Text
                  style={[
                    styles.txAmount,
                    { color: tx.type === "received" ? colors.success : colors.destructive },
                  ]}
                >
                  {tx.type === "received" ? "+" : "-"}₹{tx.amount.toLocaleString("en-IN")}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal visible={showSend} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.card }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />

            {success ? (
              <View style={styles.successBox}>
                <View style={[styles.successCircle, { backgroundColor: colors.success + "22" }]}>
                  <Feather name="check-circle" size={48} color={colors.success} />
                </View>
                <Text style={[styles.successTitle, { color: colors.text }]}>Payment Sent!</Text>
                <Text style={[styles.successSub, { color: colors.mutedForeground }]}>
                  ₹{parseFloat(amount || "0").toLocaleString("en-IN")} sent to {selectedContact?.name}
                </Text>
              </View>
            ) : (
              <>
                <Text style={[styles.sheetTitle, { color: colors.text }]}>Send Money</Text>

                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>To</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                  {CONTACTS.map((c) => (
                    <Pressable
                      key={c.id}
                      style={[
                        styles.selectChip,
                        {
                          backgroundColor: selectedContact?.id === c.id ? c.color + "22" : colors.secondary,
                          borderColor: selectedContact?.id === c.id ? c.color : "transparent",
                          borderWidth: 2,
                        },
                      ]}
                      onPress={() => setSelectedContact(c)}
                    >
                      <Text style={[styles.chipText, { color: selectedContact?.id === c.id ? c.color : colors.mutedForeground }]}>
                        {c.name.split(" ")[0]}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>

                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Amount</Text>
                <View style={[styles.amountRow, { backgroundColor: colors.input, borderColor: colors.border }]}>
                  <Text style={[styles.rupee, { color: colors.text }]}>₹</Text>
                  <TextInput
                    style={[styles.amountInput, { color: colors.text }]}
                    placeholder="0"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="numeric"
                    value={amount}
                    onChangeText={setAmount}
                  />
                </View>

                <TextInput
                  style={[styles.noteInput, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]}
                  placeholder="Add a note (optional)"
                  placeholderTextColor={colors.mutedForeground}
                  value={note}
                  onChangeText={setNote}
                />

                <View style={styles.sheetActions}>
                  <Pressable
                    style={[styles.sheetBtn, { backgroundColor: colors.secondary }]}
                    onPress={() => setShowSend(false)}
                  >
                    <Text style={[styles.sheetBtnText, { color: colors.text }]}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.sheetBtn, { backgroundColor: colors.primary, flex: 1.5 }]}
                    onPress={handleSend}
                    disabled={!selectedContact || !amount || sending}
                  >
                    <Text style={[styles.sheetBtnText, { color: "#fff" }]}>
                      {sending ? "Sending..." : "Send Now"}
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={showQR} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.qrSheet, { backgroundColor: colors.card }]}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Your QR Code</Text>
            <View style={[styles.qrBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <MaterialCommunityIcons name="qrcode" size={120} color={colors.text} />
            </View>
            <Text style={[styles.upiId, { color: colors.primary }]}>expensebuddy@upi</Text>
            <Text style={[styles.qrSub, { color: colors.mutedForeground }]}>Scan to pay using any UPI app</Text>
            <Pressable
              style={[styles.sheetBtn, { backgroundColor: colors.primary, marginTop: 4 }]}
              onPress={() => setShowQR(false)}
            >
              <Text style={[styles.sheetBtnText, { color: "#fff" }]}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold" },
  mainActions: { gap: 12, marginTop: 8 },
  bigBtn: {
    padding: 24,
    borderRadius: 20,
    gap: 8,
  },
  bigBtnIcon: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  bigBtnTitle: { color: "#fff", fontSize: 20, fontFamily: "Inter_700Bold" },
  bigBtnSub: { color: "rgba(255,255,255,0.7)", fontSize: 13, fontFamily: "Inter_400Regular" },
  secondaryActions: { flexDirection: "row", gap: 12 },
  secBtn: {
    flex: 1,
    alignItems: "center",
    padding: 20,
    borderRadius: 16,
    gap: 8,
  },
  secBtnLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  contactChip: { alignItems: "center", padding: 12, borderRadius: 14, gap: 8, width: 72 },
  contactAvatar: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  contactInitials: { fontSize: 14, fontFamily: "Inter_700Bold" },
  contactName: { fontSize: 11, fontFamily: "Inter_500Medium" },
  txList: { borderRadius: 16, overflow: "hidden" },
  txRow: { flexDirection: "row", alignItems: "center", padding: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  txAvatar: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 12 },
  txInitials: { fontSize: 13, fontFamily: "Inter_700Bold" },
  txInfo: { flex: 1 },
  txPerson: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  txDate: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  txAmount: { fontSize: 15, fontFamily: "Inter_700Bold" },
  empty: { padding: 24, alignItems: "center" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.55)" },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, gap: 14 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 8 },
  sheetTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  fieldLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },
  selectChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  chipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 2,
  },
  rupee: { fontSize: 22, fontFamily: "Inter_600SemiBold", marginRight: 6 },
  amountInput: { flex: 1, fontSize: 28, fontFamily: "Inter_700Bold", paddingVertical: 12 },
  noteInput: {
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  sheetActions: { flexDirection: "row", gap: 12 },
  sheetBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  sheetBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  successBox: { alignItems: "center", paddingVertical: 24, gap: 14 },
  successCircle: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center" },
  successTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
  successSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  qrSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, gap: 16, alignItems: "center" },
  qrBox: { padding: 20, borderRadius: 20, borderWidth: 1 },
  upiId: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  qrSub: { fontSize: 13, fontFamily: "Inter_400Regular" },
});
