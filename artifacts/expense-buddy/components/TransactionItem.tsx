import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Transaction } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  transaction: Transaction;
}

export function TransactionItem({ transaction }: Props) {
  const colors = useColors();

  const isCredit = transaction.type === "received" || transaction.type === "split_received" || transaction.type === "wallet_in";
  const amountColor = isCredit ? colors.success : transaction.type === "split_paid" ? colors.warning : colors.text;
  const sign = isCredit ? "+" : "-";

  const iconName = getIcon(transaction.type);

  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={[styles.avatar, { backgroundColor: transaction.personColor + "22" }]}>
        <Text style={[styles.initials, { color: transaction.personColor }]}>{transaction.personInitials}</Text>
      </View>

      <View style={styles.info}>
        <Text style={[styles.desc, { color: colors.text }]} numberOfLines={1}>
          {transaction.description}
        </Text>
        <View style={styles.meta}>
          <Text style={[styles.person, { color: colors.mutedForeground }]}>{transaction.person}</Text>
          <Text style={[styles.dot, { color: colors.mutedForeground }]}>·</Text>
          <Text style={[styles.date, { color: colors.mutedForeground }]}>{formatDate(transaction.date)}</Text>
        </View>
      </View>

      <View style={styles.right}>
        <Text style={[styles.amount, { color: amountColor }]}>
          {transaction.type === "split_paid" ? "" : sign}₹{transaction.amount.toLocaleString("en-IN")}
        </Text>
        {transaction.type === "split_paid" && (
          <View style={[styles.badge, { backgroundColor: colors.warning + "22" }]}>
            <Text style={[styles.badgeText, { color: colors.warning }]}>Split</Text>
          </View>
        )}
        {!transaction.settled && transaction.type !== "split_paid" && (
          <View style={[styles.badge, { backgroundColor: colors.destructive + "22" }]}>
            <Text style={[styles.badgeText, { color: colors.destructive }]}>Pending</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function getIcon(type: Transaction["type"]): string {
  switch (type) {
    case "sent": return "arrow-up-right";
    case "received": return "arrow-down-left";
    case "split_paid": return "divide-circle";
    case "split_received": return "divide-circle";
    case "wallet_in": return "inbox";
    case "wallet_out": return "send";
    default: return "circle";
  }
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return `${diff}d ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  initials: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  info: {
    flex: 1,
  },
  desc: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 3,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  person: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  dot: {
    fontSize: 12,
  },
  date: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  right: {
    alignItems: "flex-end",
    gap: 4,
  },
  amount: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
});
