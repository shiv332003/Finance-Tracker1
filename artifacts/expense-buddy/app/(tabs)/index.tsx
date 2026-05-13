import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback } from "react";
import {
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
import { useNotifications } from "@/context/NotificationContext";
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
  const { unreadCount } = useNotifications();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const recent = transactions.slice(0, 8);

  const pendingTotal = transactions
    .filter((t) => !t.settled && t.type === "received")
    .reduce((s, t) => s + t.amount, 0);

  const oweTotal = transactions
    .filter((t) => !t.settled && t.type === "sent")
    .reduce((s, t) => s + t.amount, 0);

  const onRefresh = useCallback(async () => { await refreshData(); }, [refreshData]);

  const totalWalletBalance = groups.reduce((s, g) => s + g.walletBalance, 0);

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

      {/* Top bar */}
      <View style={styles.topBar}>
        <View />
        <Pressable
          style={[styles.bellBtn, { backgroundColor: colors.card }]}
          onPress={() => router.push("/notifications")}
        >
          <Feather name="bell" size={20} color={colors.text} />
          {unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.destructive }]}>
              <Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <BalanceCard
        walletBalance={user?.walletBalance ?? 0}
        totalOwed={pendingTotal}
        totalOwe={oweTotal}
        name={user?.name ?? ""}
      />

      {/* Shared Wallets Strip */}
      {groups.length > 0 && (
        <View style={[styles.section, { paddingHorizontal: 0 }]}>
          <View style={[styles.sectionHeader, { paddingHorizontal: 16 }]}>
            <View style={styles.sectionTitleRow}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Shared Wallets</Text>
              <View style={[styles.walletTotalBadge, { backgroundColor: colors.primary + "18" }]}>
                <Text style={[styles.walletTotalText, { color: colors.primary }]}>
                  ₹{totalWalletBalance.toLocaleString("en-IN")} total
                </Text>
              </View>
            </View>
            <Pressable onPress={() => router.push("/(tabs)/groups")}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>All groups</Text>
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 16, paddingRight: 8, gap: 12 }}
          >
            {groups.map((g) => {
              const ws = g.walletSettings;
              const pct = Math.min((g.walletBalance / Math.max(g.walletLimit, 1)) * 100, 100);
              const isLow = ws.alertEnabled && g.walletBalance < ws.minBalanceAlert;
              return (
                <Pressable
                  key={g.id}
                  style={[
                    styles.walletCard,
                    {
                      backgroundColor: ws.frozen ? colors.warning + "18" : colors.primary,
                      borderColor: isLow ? colors.warning : "transparent",
                      borderWidth: isLow ? 1.5 : 0,
                    },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(`/wallet/${g.id}`);
                  }}
                >
                  <View style={styles.walletCardTop}>
                    <Text style={[styles.walletCardName, { color: ws.frozen ? colors.warning : "rgba(255,255,255,0.8)" }]} numberOfLines={1}>
                      {ws.name || g.name}
                    </Text>
                    {ws.frozen ? (
                      <Feather name="lock" size={13} color={colors.warning} />
                    ) : isLow ? (
                      <Feather name="alert-triangle" size={13} color="#fff" />
                    ) : null}
                  </View>
                  <Text style={[styles.walletCardBalance, { color: ws.frozen ? colors.warning : "#fff" }]}>
                    ₹{g.walletBalance.toLocaleString("en-IN")}
                  </Text>
                  <View style={[styles.walletProgressTrack, { backgroundColor: ws.frozen ? colors.warning + "33" : "rgba(255,255,255,0.25)" }]}>
                    <View style={[styles.walletProgressFill, { width: `${pct}%` as any, backgroundColor: ws.frozen ? colors.warning : "rgba(255,255,255,0.85)" }]} />
                  </View>
                  <Text style={[styles.walletCardMembers, { color: ws.frozen ? colors.warning + "88" : "rgba(255,255,255,0.65)" }]}>
                    {g.members.length} members · {g.walletTransactions.length} txns
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Quick Actions */}
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

      {/* Recent Activity */}
      <View style={[styles.section, { paddingHorizontal: 0 }]}>
        <View style={[styles.sectionHeader, { paddingHorizontal: 16 }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
          <Pressable onPress={() => router.push("/notifications")}>
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
            recent.map((tx) => <TransactionItem key={tx.id} transaction={tx} />)
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 16, marginBottom: 12 },
  bellBtn: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  badge: { position: "absolute", top: -4, right: -4, width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  badgeText: { fontSize: 10, color: "#fff", fontFamily: "Inter_700Bold" },
  section: { paddingHorizontal: 16, marginTop: 24 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  walletTotalBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  walletTotalText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  seeAll: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  walletCard: {
    width: 180,
    padding: 16,
    borderRadius: 18,
    gap: 8,
  },
  walletCardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  walletCardName: { fontSize: 12, fontFamily: "Inter_500Medium", flex: 1, marginRight: 4 },
  walletCardBalance: { fontSize: 24, fontFamily: "Inter_700Bold" },
  walletProgressTrack: { height: 4, borderRadius: 2, overflow: "hidden" },
  walletProgressFill: { height: "100%", borderRadius: 2 },
  walletCardMembers: { fontSize: 11, fontFamily: "Inter_400Regular" },
  actionsRow: { flexDirection: "row", gap: 12 },
  actionBtn: { flex: 1, alignItems: "center", paddingVertical: 16, borderRadius: 16, gap: 8 },
  actionIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  actionLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  txCard: { borderRadius: 16, paddingHorizontal: 16, overflow: "hidden" },
  empty: { alignItems: "center", paddingVertical: 32, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
