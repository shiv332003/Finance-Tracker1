import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
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
import { GroupCard } from "@/components/GroupCard";
import { GroupType, useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

const GROUP_TYPES: { value: GroupType; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
  { value: "flatmates", label: "Flatmates", icon: "home-city-outline" },
  { value: "trip", label: "Trip", icon: "airplane" },
  { value: "hostel", label: "Hostel", icon: "bed-outline" },
  { value: "party", label: "Party", icon: "party-popper" },
  { value: "office", label: "Office", icon: "office-building-outline" },
];

const GROUP_COLORS: Record<GroupType, string> = {
  flatmates: "#7C5CFF",
  trip: "#4ECDC4",
  hostel: "#FF9500",
  party: "#FF6B6B",
  office: "#45B7D1",
};

export default function GroupsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { groups, createGroup } = useData();
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<GroupType>("flatmates");
  const [creating, setCreating] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const totalOwed = groups.reduce((s, g) => s + (g.myBalance > 0 ? g.myBalance : 0), 0);
  const totalOwe = groups.reduce((s, g) => s + (g.myBalance < 0 ? -g.myBalance : 0), 0);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await createGroup(name.trim(), type);
      setName("");
      setType("flatmates");
      setShowModal(false);
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Text style={[styles.title, { color: colors.text }]}>Groups</Text>
        <Pressable
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => setShowModal(true)}
        >
          <Feather name="plus" size={18} color="#fff" />
          <Text style={styles.addBtnText}>New</Text>
        </Pressable>
      </View>

      <View style={[styles.summaryRow, { marginHorizontal: 16 }]}>
        <View style={[styles.summaryCard, { backgroundColor: colors.success + "18", flex: 1 }]}>
          <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>To receive</Text>
          <Text style={[styles.summaryAmount, { color: colors.success }]}>₹{totalOwed.toLocaleString("en-IN")}</Text>
        </View>
        <View style={{ width: 12 }} />
        <View style={[styles.summaryCard, { backgroundColor: colors.destructive + "18", flex: 1 }]}>
          <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>You owe</Text>
          <Text style={[styles.summaryAmount, { color: colors.destructive }]}>₹{totalOwe.toLocaleString("en-IN")}</Text>
        </View>
      </View>

      <FlatList
        data={groups}
        keyExtractor={(g) => g.id}
        renderItem={({ item }) => <GroupCard group={item} />}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 100 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialCommunityIcons name="account-group-outline" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No groups yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
              Create your first group to start splitting expenses
            </Text>
          </View>
        }
      />

      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>Create Group</Text>

            <TextInput
              style={[styles.textInput, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]}
              placeholder="Group name (e.g. Flat 12B)"
              placeholderTextColor={colors.mutedForeground}
              value={name}
              onChangeText={setName}
              autoFocus
            />

            <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Group Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {GROUP_TYPES.map((t) => (
                <Pressable
                  key={t.value}
                  style={[
                    styles.typeChip,
                    {
                      backgroundColor: type === t.value ? GROUP_COLORS[t.value] + "22" : colors.secondary,
                      borderColor: type === t.value ? GROUP_COLORS[t.value] : "transparent",
                      borderWidth: 2,
                    },
                  ]}
                  onPress={() => setType(t.value)}
                >
                  <MaterialCommunityIcons
                    name={t.icon}
                    size={18}
                    color={type === t.value ? GROUP_COLORS[t.value] : colors.mutedForeground}
                  />
                  <Text
                    style={[
                      styles.typeLabel,
                      { color: type === t.value ? GROUP_COLORS[t.value] : colors.mutedForeground },
                    ]}
                  >
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: colors.secondary }]}
                onPress={() => setShowModal(false)}
              >
                <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: colors.primary, flex: 1.5 }]}
                onPress={handleCreate}
                disabled={!name.trim() || creating}
              >
                <Text style={[styles.modalBtnText, { color: "#fff" }]}>
                  {creating ? "Creating..." : "Create Group"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  title: { fontSize: 28, fontFamily: "Inter_700Bold" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
  },
  addBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 },
  summaryRow: { flexDirection: "row", marginBottom: 8 },
  summaryCard: { padding: 14, borderRadius: 14, gap: 4 },
  summaryLabel: { fontSize: 11, fontFamily: "Inter_400Regular", textTransform: "uppercase", letterSpacing: 0.5 },
  summaryAmount: { fontSize: 20, fontFamily: "Inter_700Bold" },
  empty: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32, gap: 12 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  emptySubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  modalSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, gap: 18 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 8 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  textInput: {
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  inputLabel: { fontSize: 12, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  typeLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  modalActions: { flexDirection: "row", gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  modalBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
