import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
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

type SplitType = "equal" | "percentage" | "custom";

const CONTACTS = [
  { id: "u2", name: "Rahul Sharma", initials: "RS", color: "#FF6B6B" },
  { id: "u3", name: "Priya Nair", initials: "PN", color: "#4ECDC4" },
  { id: "u4", name: "Amit Kumar", initials: "AK", color: "#45B7D1" },
  { id: "u5", name: "Sneha Patel", initials: "SP", color: "#96CEB4" },
];

export default function NewSplitScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { groups, addExpense } = useData();

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const selectedContacts = CONTACTS.filter((c) => selected.includes(c.id));
  const totalPeople = selectedContacts.length + 1;
  const perPerson = amount && totalPeople > 0 ? parseFloat(amount) / totalPeople : 0;

  const toggleContact = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleSplit = async () => {
    if (!title || !amount || selected.length === 0) {
      Alert.alert("Incomplete", "Please fill in all fields and select at least one person.");
      return;
    }
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      if (groups.length > 0) {
        const g = groups[0];
        const splits = [
          { userId: "me", amount: perPerson, settled: true },
          ...selectedContacts.map((c) => ({ userId: c.id, amount: perPerson, settled: false })),
        ];
        await addExpense({
          groupId: g.id,
          title,
          amount: parseFloat(amount),
          paidBy: "me",
          paidByName: "You",
          splits,
          date: new Date().toISOString().split("T")[0],
          category: "Split",
        });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        router.back();
      }, 1800);
    } finally {
      setSaving(false);
    }
  };

  if (success) {
    return (
      <View style={[styles.root, styles.successScreen, { backgroundColor: colors.background }]}>
        <View style={[styles.successCircle, { backgroundColor: colors.success + "22" }]}>
          <Feather name="check-circle" size={56} color={colors.success} />
        </View>
        <Text style={[styles.successTitle, { color: colors.text }]}>Split Created!</Text>
        <Text style={[styles.successSub, { color: colors.mutedForeground }]}>
          ₹{perPerson.toFixed(0)} per person · {totalPeople} people
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()}>
          <Feather name="x" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Split Expense</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 20, gap: 24 }}>
        <View style={{ gap: 8 }}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>DESCRIPTION</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
            placeholder="What are you splitting?"
            placeholderTextColor={colors.mutedForeground}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View style={{ gap: 8 }}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>TOTAL AMOUNT</Text>
          <View style={[styles.amountRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
        </View>

        <View style={{ gap: 12 }}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>SPLIT TYPE</Text>
          <View style={styles.splitTypeRow}>
            {(["equal", "percentage", "custom"] as SplitType[]).map((t) => (
              <Pressable
                key={t}
                style={[
                  styles.splitTypeBtn,
                  { backgroundColor: splitType === t ? colors.primary : colors.card, borderColor: colors.border },
                ]}
                onPress={() => setSplitType(t)}
              >
                <Text style={[styles.splitTypeTxt, { color: splitType === t ? "#fff" : colors.mutedForeground }]}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={{ gap: 12 }}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>SPLIT WITH</Text>
          <View style={{ gap: 10 }}>
            {CONTACTS.map((c) => {
              const isSelected = selected.includes(c.id);
              return (
                <Pressable
                  key={c.id}
                  style={[
                    styles.contactRow,
                    {
                      backgroundColor: colors.card,
                      borderColor: isSelected ? c.color : colors.border,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                  onPress={() => toggleContact(c.id)}
                >
                  <View style={[styles.avatar, { backgroundColor: c.color + "22" }]}>
                    <Text style={[styles.initials, { color: c.color }]}>{c.initials}</Text>
                  </View>
                  <Text style={[styles.contactName, { color: colors.text }]}>{c.name}</Text>
                  <View
                    style={[
                      styles.checkbox,
                      { backgroundColor: isSelected ? c.color : "transparent", borderColor: isSelected ? c.color : colors.border },
                    ]}
                  >
                    {isSelected && <Feather name="check" size={12} color="#fff" />}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {selected.length > 0 && amount ? (
          <View style={[styles.summaryBox, { backgroundColor: colors.primary + "15", borderColor: colors.primary }]}>
            <Text style={[styles.summaryTitle, { color: colors.primary }]}>Split Summary</Text>
            <Text style={[styles.summaryText, { color: colors.text }]}>
              ₹{parseFloat(amount).toLocaleString("en-IN")} ÷ {totalPeople} people = ₹{perPerson.toFixed(2)} each
            </Text>
          </View>
        ) : null}

        <Pressable
          style={({ pressed }) => [styles.createBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
          onPress={handleSplit}
          disabled={saving}
        >
          <Feather name="divide-circle" size={18} color="#fff" />
          <Text style={styles.createBtnText}>{saving ? "Splitting..." : "Create Split"}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  successScreen: { justifyContent: "center", alignItems: "center", gap: 16 },
  successCircle: { width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center" },
  successTitle: { fontSize: 26, fontFamily: "Inter_700Bold" },
  successSub: { fontSize: 15, fontFamily: "Inter_400Regular" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  label: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, textTransform: "uppercase" },
  input: {
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
  },
  rupee: { fontSize: 24, fontFamily: "Inter_600SemiBold", marginRight: 6 },
  amountInput: { flex: 1, fontSize: 30, fontFamily: "Inter_700Bold", paddingVertical: 12 },
  splitTypeRow: { flexDirection: "row", gap: 10 },
  splitTypeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center", borderWidth: 1 },
  splitTypeTxt: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    gap: 12,
  },
  avatar: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  initials: { fontSize: 13, fontFamily: "Inter_700Bold" },
  contactName: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  summaryBox: { padding: 14, borderRadius: 12, borderWidth: 1.5, gap: 4 },
  summaryTitle: { fontSize: 12, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.5 },
  summaryText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  createBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16, borderRadius: 16 },
  createBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
});
