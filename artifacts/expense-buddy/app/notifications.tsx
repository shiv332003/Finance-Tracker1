import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppNotification, useNotifications } from "@/context/NotificationContext";
import { useColors } from "@/hooks/useColors";

const NOTIF_ICONS: Record<AppNotification["type"], string> = {
  split_request: "divide-circle",
  payment_received: "arrow-down-left",
  split_settled: "check-circle",
  group_added: "users",
  reminder: "clock",
};

const NOTIF_COLORS: Record<AppNotification["type"], string> = {
  split_request: "#7C5CFF",
  payment_received: "#00D395",
  split_settled: "#4ECDC4",
  group_added: "#45B7D1",
  reminder: "#FF9500",
};

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { notifications, markAllRead, markRead, clearAll } = useNotifications();

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => {
    const timer = setTimeout(markAllRead, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Notifications</Text>
        {notifications.length > 0 ? (
          <Pressable onPress={clearAll}>
            <Text style={[styles.clearAll, { color: colors.destructive }]}>Clear all</Text>
          </Pressable>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 32 }}
      >
        {notifications.length === 0 ? (
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
              <Feather name="bell-off" size={36} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No notifications</Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
              Split expenses and send payments to see activity here
            </Text>
          </View>
        ) : (
          notifications.map((n) => {
            const iconColor = NOTIF_COLORS[n.type] ?? colors.primary;
            return (
              <Pressable
                key={n.id}
                style={[
                  styles.notifRow,
                  { backgroundColor: n.read ? colors.card : colors.primary + "0A", borderBottomColor: colors.border },
                ]}
                onPress={() => markRead(n.id)}
              >
                <View style={[styles.notifIcon, { backgroundColor: iconColor + "20" }]}>
                  <Feather name={NOTIF_ICONS[n.type] as any} size={20} color={iconColor} />
                </View>
                <View style={styles.notifContent}>
                  <View style={styles.notifTitleRow}>
                    <Text style={[styles.notifTitle, { color: colors.text }]} numberOfLines={1}>
                      {n.title}
                    </Text>
                    {!n.read && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
                  </View>
                  <Text style={[styles.notifBody, { color: colors.mutedForeground }]} numberOfLines={2}>
                    {n.body}
                  </Text>
                  <Text style={[styles.notifTime, { color: colors.mutedForeground }]}>{formatTime(n.createdAt)}</Text>
                </View>
                {n.amount && (
                  <Text style={[styles.notifAmount, { color: iconColor }]}>₹{n.amount.toFixed(0)}</Text>
                )}
              </Pressable>
            );
          })
        )}
      </ScrollView>
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
  title: { fontSize: 20, fontFamily: "Inter_700Bold" },
  clearAll: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  empty: { alignItems: "center", paddingTop: 80, gap: 14, paddingHorizontal: 32 },
  emptyIcon: { width: 80, height: 80, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  emptySubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  notifRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  notifIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  notifContent: { flex: 1, gap: 3 },
  notifTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  notifTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  notifBody: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  notifTime: { fontSize: 11, fontFamily: "Inter_400Regular" },
  notifAmount: { fontSize: 15, fontFamily: "Inter_700Bold" },
});
