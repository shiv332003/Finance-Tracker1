import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Group } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  group: Group;
}

const GROUP_ICONS: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  flatmates: "home-city-outline",
  trip: "airplane",
  hostel: "bed-outline",
  party: "party-popper",
  office: "office-building-outline",
};

const GROUP_COLORS: Record<string, string> = {
  flatmates: "#7C5CFF",
  trip: "#4ECDC4",
  hostel: "#FF9500",
  party: "#FF6B6B",
  office: "#45B7D1",
};

export function GroupCard({ group }: Props) {
  const colors = useColors();
  const router = useRouter();
  const accentColor = GROUP_COLORS[group.type] ?? colors.primary;
  const pendingCount = group.expenses.reduce(
    (sum, e) => sum + e.splits.filter((s) => !s.settled && s.userId === "me").length,
    0
  );

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, opacity: pressed ? 0.9 : 1 },
      ]}
      onPress={() => router.push(`/group/${group.id}`)}
    >
      <View style={[styles.iconBox, { backgroundColor: accentColor + "22" }]}>
        <MaterialCommunityIcons name={GROUP_ICONS[group.type] ?? "account-group"} size={22} color={accentColor} />
      </View>

      <View style={styles.info}>
        <View style={styles.titleRow}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {group.name}
          </Text>
          {pendingCount > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.destructive + "22" }]}>
              <Text style={[styles.badgeText, { color: colors.destructive }]}>{pendingCount} pending</Text>
            </View>
          )}
        </View>
        <Text style={[styles.members, { color: colors.mutedForeground }]}>
          {group.members.length} members · ₹{group.totalExpenses.toLocaleString("en-IN")} total
        </Text>
      </View>

      <View style={styles.right}>
        <Text
          style={[
            styles.balance,
            { color: group.myBalance >= 0 ? colors.success : colors.destructive },
          ]}
        >
          {group.myBalance >= 0 ? "+" : ""}₹{Math.abs(group.myBalance).toLocaleString("en-IN")}
        </Text>
        <Text style={[styles.balanceLabel, { color: colors.mutedForeground }]}>
          {group.myBalance >= 0 ? "you get" : "you owe"}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    ...(Platform.OS === "web"
      ? { boxShadow: "0 2px 12px rgba(0,0,0,0.15)" }
      : {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.12,
          shadowRadius: 8,
          elevation: 4,
        }),
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  name: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    flexShrink: 1,
  },
  members: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
  right: {
    alignItems: "flex-end",
  },
  balance: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  balanceLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
});
