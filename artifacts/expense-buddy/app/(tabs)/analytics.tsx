import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

const MONTHLY_DATA = [
  { month: "Jan", amount: 4200 },
  { month: "Feb", amount: 5800 },
  { month: "Mar", amount: 3900 },
  { month: "Apr", amount: 7200 },
  { month: "May", amount: 6100 },
];

const CATEGORIES = [
  { name: "Food & Dining", amount: 2840, icon: "food-outline" as const, color: "#FF6B6B" },
  { name: "Rent & Utilities", amount: 5200, icon: "home-outline" as const, color: "#7C5CFF" },
  { name: "Groceries", amount: 3400, icon: "cart-outline" as const, color: "#4ECDC4" },
  { name: "Entertainment", amount: 1260, icon: "movie-outline" as const, color: "#FF9500" },
  { name: "Travel", amount: 2100, icon: "airplane-outline" as const, color: "#45B7D1" },
  { name: "Others", amount: 800, icon: "dots-horizontal-circle-outline" as const, color: "#96CEB4" },
];

export default function AnalyticsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { groups, transactions } = useData();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const maxAmount = Math.max(...MONTHLY_DATA.map((d) => d.amount));
  const totalSpent = CATEGORIES.reduce((s, c) => s + c.amount, 0);
  const maxCat = Math.max(...CATEGORIES.map((c) => c.amount));

  const totalPaid = transactions.filter((t) => t.type === "split_paid").reduce((s, t) => s + t.amount, 0);
  const totalReceived = transactions.filter((t) => t.type === "received").reduce((s, t) => s + t.amount, 0);
  const totalSent = transactions.filter((t) => t.type === "sent").reduce((s, t) => s + t.amount, 0);

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 100 }}
    >
      <View style={{ height: topPad + 12 }} />
      <View style={styles.headerPad}>
        <Text style={[styles.title, { color: colors.text }]}>Analytics</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>May 2026</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Total Spent</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>₹{totalSpent.toLocaleString("en-IN")}</Text>
          <View style={[styles.statBadge, { backgroundColor: colors.destructive + "18" }]}>
            <Feather name="trending-up" size={12} color={colors.destructive} />
            <Text style={[styles.statBadgeText, { color: colors.destructive }]}>+12%</Text>
          </View>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Received</Text>
          <Text style={[styles.statValue, { color: colors.success }]}>₹{totalReceived.toLocaleString("en-IN")}</Text>
          <View style={[styles.statBadge, { backgroundColor: colors.success + "18" }]}>
            <Feather name="trending-up" size={12} color={colors.success} />
            <Text style={[styles.statBadgeText, { color: colors.success }]}>+5%</Text>
          </View>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, marginHorizontal: 16, marginTop: 16 }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Monthly Spending</Text>
        <View style={styles.chart}>
          {MONTHLY_DATA.map((d, i) => {
            const h = (d.amount / maxAmount) * 120;
            const isCurrent = i === MONTHLY_DATA.length - 1;
            return (
              <View key={d.month} style={styles.barCol}>
                <Text style={[styles.barValue, { color: isCurrent ? colors.primary : colors.mutedForeground }]}>
                  ₹{(d.amount / 1000).toFixed(1)}k
                </Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: h,
                        backgroundColor: isCurrent ? colors.primary : colors.accent,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.barLabel, { color: isCurrent ? colors.text : colors.mutedForeground }]}>
                  {d.month}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, marginHorizontal: 16, marginTop: 14 }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Spending by Category</Text>
        <View style={{ gap: 14, marginTop: 8 }}>
          {CATEGORIES.map((cat) => (
            <View key={cat.name} style={styles.catRow}>
              <View style={[styles.catIcon, { backgroundColor: cat.color + "20" }]}>
                <MaterialCommunityIcons name={cat.icon} size={18} color={cat.color} />
              </View>
              <View style={styles.catInfo}>
                <View style={styles.catHeader}>
                  <Text style={[styles.catName, { color: colors.text }]}>{cat.name}</Text>
                  <Text style={[styles.catAmount, { color: colors.text }]}>₹{cat.amount.toLocaleString("en-IN")}</Text>
                </View>
                <View style={[styles.progressTrack, { backgroundColor: colors.accent }]}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${(cat.amount / maxCat) * 100}%` as any, backgroundColor: cat.color },
                    ]}
                  />
                </View>
                <Text style={[styles.catPercent, { color: colors.mutedForeground }]}>
                  {((cat.amount / totalSpent) * 100).toFixed(1)}% of total
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, marginHorizontal: 16, marginTop: 14 }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Group Summary</Text>
        {groups.map((g) => (
          <View key={g.id} style={[styles.groupRow, { borderBottomColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.groupName, { color: colors.text }]}>{g.name}</Text>
              <Text style={[styles.groupSub, { color: colors.mutedForeground }]}>
                ₹{g.totalExpenses.toLocaleString("en-IN")} total · {g.members.length} members
              </Text>
            </View>
            <Text style={[styles.groupBalance, { color: g.myBalance >= 0 ? colors.success : colors.destructive }]}>
              {g.myBalance >= 0 ? "+" : ""}₹{Math.abs(g.myBalance).toLocaleString("en-IN")}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerPad: { paddingHorizontal: 20, marginBottom: 16 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 2 },
  statsRow: { flexDirection: "row", gap: 12, paddingHorizontal: 16 },
  statCard: { flex: 1, padding: 16, borderRadius: 16, gap: 6 },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", textTransform: "uppercase", letterSpacing: 0.5 },
  statValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: "flex-start" },
  statBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  card: { borderRadius: 20, padding: 20 },
  cardTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 16 },
  chart: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", height: 160 },
  barCol: { flex: 1, alignItems: "center", gap: 6 },
  barValue: { fontSize: 10, fontFamily: "Inter_500Medium" },
  barTrack: { flex: 1, width: "60%", justifyContent: "flex-end" },
  bar: { width: "100%", borderRadius: 6 },
  barLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  catRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  catIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  catInfo: { flex: 1, gap: 6 },
  catHeader: { flexDirection: "row", justifyContent: "space-between" },
  catName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  catAmount: { fontSize: 14, fontFamily: "Inter_700Bold" },
  progressTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  catPercent: { fontSize: 11, fontFamily: "Inter_400Regular" },
  groupRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  groupName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  groupSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  groupBalance: { fontSize: 15, fontFamily: "Inter_700Bold" },
});
