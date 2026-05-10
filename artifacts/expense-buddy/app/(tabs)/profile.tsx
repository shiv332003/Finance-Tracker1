import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

const SETTINGS = [
  { id: "notifications", icon: "bell-outline" as const, label: "Notifications", sub: "Reminders & alerts" },
  { id: "upi", icon: "bank-transfer" as const, label: "UPI Settings", sub: "Linked UPI IDs" },
  { id: "security", icon: "shield-check-outline" as const, label: "Security", sub: "PIN & biometrics" },
  { id: "privacy", icon: "eye-off-outline" as const, label: "Privacy", sub: "Data & permissions" },
];

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout, updateProfile } = useAuth();
  const { groups, transactions } = useData();

  const [showEdit, setShowEdit] = useState(false);
  const [name, setName] = useState(user?.name ?? "");

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const totalGroups = groups.length;
  const totalTx = transactions.length;
  const totalSpent = transactions.filter((t) => t.type === "sent").reduce((s, t) => s + t.amount, 0);

  const handleSaveName = async () => {
    await updateProfile(name);
    setShowEdit(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 100 }}
    >
      <View style={{ height: topPad + 12 }} />

      <View style={styles.profileHeader}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>
            {(user?.name || "U").substring(0, 2).toUpperCase()}
          </Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={[styles.userName, { color: colors.text }]}>{user?.name || "Set your name"}</Text>
          <Text style={[styles.userPhone, { color: colors.mutedForeground }]}>+91 {user?.phone}</Text>
          <Text style={[styles.upiId, { color: colors.primary }]}>{user?.upiId}</Text>
        </View>
        <Pressable
          style={[styles.editBtn, { backgroundColor: colors.primary + "22", borderColor: colors.primary }]}
          onPress={() => { setName(user?.name ?? ""); setShowEdit(true); }}
        >
          <Feather name="edit-2" size={16} color={colors.primary} />
        </Pressable>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>{totalGroups}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Groups</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>{totalTx}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Transactions</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statValue, { color: colors.destructive }]}>₹{(totalSpent / 1000).toFixed(1)}k</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Spent</Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>SETTINGS</Text>
        <View style={[styles.settingsList, { backgroundColor: colors.card }]}>
          {SETTINGS.map((s, i) => (
            <Pressable
              key={s.id}
              style={({ pressed }) => [
                styles.settingRow,
                {
                  borderBottomColor: colors.border,
                  borderBottomWidth: i < SETTINGS.length - 1 ? StyleSheet.hairlineWidth : 0,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <View style={[styles.settingIcon, { backgroundColor: colors.accent }]}>
                <MaterialCommunityIcons name={s.icon} size={20} color={colors.primary} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>{s.label}</Text>
                <Text style={[styles.settingSub, { color: colors.mutedForeground }]}>{s.sub}</Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </Pressable>
          ))}
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
        <Pressable
          style={({ pressed }) => [
            styles.logoutBtn,
            { backgroundColor: colors.destructive + "18", opacity: pressed ? 0.8 : 1 },
          ]}
          onPress={handleLogout}
        >
          <Feather name="log-out" size={18} color={colors.destructive} />
          <Text style={[styles.logoutText, { color: colors.destructive }]}>Sign Out</Text>
        </Pressable>
      </View>

      <Text style={[styles.version, { color: colors.mutedForeground }]}>ExpenseBuddy v1.0.0</Text>

      <Modal visible={showEdit} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.card }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Edit Profile</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]}
              placeholder="Your name"
              placeholderTextColor={colors.mutedForeground}
              value={name}
              onChangeText={setName}
              autoFocus
            />
            <View style={styles.actions}>
              <Pressable
                style={[styles.actionBtn, { backgroundColor: colors.secondary }]}
                onPress={() => setShowEdit(false)}
              >
                <Text style={[styles.actionBtnText, { color: colors.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.actionBtn, { backgroundColor: colors.primary, flex: 1.5 }]}
                onPress={handleSaveName}
              >
                <Text style={[styles.actionBtnText, { color: "#fff" }]}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 14,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 22, color: "#fff", fontFamily: "Inter_700Bold" },
  profileInfo: { flex: 1 },
  userName: { fontSize: 20, fontFamily: "Inter_700Bold" },
  userPhone: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  upiId: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 4 },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 20 },
  statCard: { flex: 1, padding: 14, borderRadius: 14, alignItems: "center", gap: 4 },
  statValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  settingsList: { borderRadius: 16, overflow: "hidden" },
  settingRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  settingIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  settingInfo: { flex: 1 },
  settingLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  settingSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, padding: 16, borderRadius: 14 },
  logoutText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  version: { textAlign: "center", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 20 },
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, gap: 16 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center" },
  sheetTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  input: {
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  actions: { flexDirection: "row", gap: 12 },
  actionBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  actionBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
