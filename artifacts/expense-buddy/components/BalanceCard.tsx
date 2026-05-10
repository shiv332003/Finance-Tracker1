import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface BalanceCardProps {
  walletBalance: number;
  totalOwed: number;
  totalOwe: number;
  name: string;
}

export function BalanceCard({ walletBalance, totalOwed, totalOwe, name }: BalanceCardProps) {
  const colors = useColors();
  const net = totalOwed - totalOwe;

  return (
    <View style={[styles.card, { backgroundColor: colors.primary }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good {getTimeOfDay()},</Text>
          <Text style={styles.name}>{name || "Friend"}</Text>
        </View>
        <View style={[styles.iconWrap, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
          <MaterialCommunityIcons name="wallet-outline" size={22} color="#fff" />
        </View>
      </View>

      <View style={styles.balanceSection}>
        <Text style={styles.balanceLabel}>Wallet Balance</Text>
        <Text style={styles.balanceAmount}>₹{walletBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</Text>
      </View>

      <View style={[styles.divider, { backgroundColor: "rgba(255,255,255,0.2)" }]} />

      <View style={styles.row}>
        <View style={styles.stat}>
          <MaterialCommunityIcons name="arrow-down-circle-outline" size={18} color="#00FF9D" />
          <Text style={styles.statLabel}>You'll receive</Text>
          <Text style={[styles.statAmount, { color: "#00FF9D" }]}>
            ₹{totalOwed.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
          </Text>
        </View>

        <View style={[styles.netBox, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
          <Text style={styles.netLabel}>Net</Text>
          <Text style={[styles.netAmount, { color: net >= 0 ? "#00FF9D" : "#FF8888" }]}>
            {net >= 0 ? "+" : ""}₹{Math.abs(net).toLocaleString("en-IN", { minimumFractionDigits: 0 })}
          </Text>
        </View>

        <View style={[styles.stat, { alignItems: "flex-end" }]}>
          <MaterialCommunityIcons name="arrow-up-circle-outline" size={18} color="#FFB3B3" />
          <Text style={styles.statLabel}>You owe</Text>
          <Text style={[styles.statAmount, { color: "#FFB3B3" }]}>
            ₹{totalOwe.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
          </Text>
        </View>
      </View>
    </View>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 24,
    marginHorizontal: 16,
    ...(Platform.OS === "web"
      ? { boxShadow: "0 8px 32px rgba(124,92,255,0.4)" }
      : {
          shadowColor: "#7C5CFF",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.4,
          shadowRadius: 16,
          elevation: 12,
        }),
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  greeting: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    fontFamily: "Inter_400Regular",
  },
  name: {
    fontSize: 20,
    color: "#fff",
    fontFamily: "Inter_700Bold",
    marginTop: 2,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  balanceSection: {
    marginBottom: 20,
  },
  balanceLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    fontFamily: "Inter_400Regular",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  balanceAmount: {
    fontSize: 36,
    color: "#fff",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  divider: {
    height: 1,
    marginBottom: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stat: {
    flex: 1,
    gap: 4,
  },
  statLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.6)",
    fontFamily: "Inter_400Regular",
  },
  statAmount: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  netBox: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  netLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.6)",
    fontFamily: "Inter_400Regular",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  netAmount: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    marginTop: 2,
  },
});
