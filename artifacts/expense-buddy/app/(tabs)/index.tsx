import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BalanceCard } from "@/components/BalanceCard";
import { TransactionItem } from "@/components/TransactionItem";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

const QUICK_ACTIONS = [
  { id: "send", icon: "send" as const, label: "Send", route: "/send" },
  { id: "split", icon: "divide-circle" as const, label: "Split", route: "/split/new" },
  { id: "groups", icon: "users" as const, label: "Groups", route: "/(tabs)/groups" },
  { id: "scan", icon: "camera" as const, label: "Scan QR", route: "/send" },
];

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { transactions, groups, isLoading, refreshData } = useData();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const recent = transactions.slice(0, 8);

  const pendingTotal = transactions
    .filter((t) => !t.settled && t.type === "received")
    .reduce((s, t) => s + t.amount, 0);

  const oweTotal = transactions
    .filter((t) => !t.settled && t.type === "sent")
    .reduce((s, t) => s + t.amount, 0);

  const onRefresh = useCallback(async () => {
    await refreshData();
  }, [refreshData]);

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 100 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <View style={{ height: topPad + 12 }} />

      <BalanceCard
        walletBalance={user?.walletBalance ?? 0}
        totalOwed={pendingTotal}
        totalOwe={oweTotal}
        name={user?.name ?? ""}
      />

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          {QUICK_ACTIONS.map((a) => (
            <Pressable
              key={a.id}
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: colors.card, opacity: pressed ? 0.8 : 1 },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(a.route as any);
              }}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.primary + "22" }]}>
                <Feather name={a.icon} size={20} color={colors.primary} />
              </View>
              <Text style={[styles.actionLabel, { color: colors.text }]}>{a.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {groups.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Active Groups</Text>
            <Pressable onPress={() => router.push("/(tabs)/groups")}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
            {groups.slice(0, 4).map((g) => (
              <Pressable
                key={g.id}
                style={[styles.groupChip, { backgroundColor: colors.card }]}
                onPress={() => router.push(`/group/${g.id}`)}
              >
                <View style={[styles.chipDot, { backgroundColor: g.myBalance >= 0 ? colors.success : colors.destructive }]} />
                <Text style={[styles.chipName, { color: colors.text }]} numberOfLines={1}>{g.name}</Text>
                <Text style={[styles.chipBalance, { color: g.myBalance >= 0 ? colors.success : colors.destructive }]}>
                  {g.myBalance >= 0 ? "+" : ""}₹{Math.abs(g.myBalance)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={[styles.section, { paddingHorizontal: 0 }]}>
        <View style={[styles.sectionHeader, { paddingHorizontal: 16 }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
          <Pressable>
            <Text style={[styles.seeAll, { color: colors.primary }]}>All</Text>
          </Pressable>
        </View>
        <View style={[styles.txCard, { backgroundColor: colors.card, marginHorizontal: 16 }]}>
          {recent.length === 0 ? (
            <View style={styles.empty}>
              <Feather name="activity" size={28} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No transactions yet</Text>
            </View>
          ) : (
            recent.map((tx, i) => (
              <TransactionItem key={tx.id} transaction={tx} />
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  section: { paddingHorizontal: 16, marginTop: 28 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  seeAll: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  actionsRow: { flexDirection: "row", gap: 12 },
  actionBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  actionIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  actionLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  groupChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 150,
  },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipName: { flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold" },
  chipBalance: { fontSize: 13, fontFamily: "Inter_700Bold" },
  txCard: { borderRadius: 16, paddingHorizontal: 16, overflow: "hidden" },
  empty: { alignItems: "center", paddingVertical: 32, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
