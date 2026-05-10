import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function PhoneScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { sendOTP } = useAuth();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const isValid = phone.replace(/\D/g, "").length === 10;

  const handleSendOTP = async () => {
    if (!isValid) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      const cleaned = phone.replace(/\D/g, "");
      await sendOTP(cleaned);
      router.push({ pathname: "/auth/otp", params: { phone: cleaned } });
    } catch {
      Alert.alert("Error", "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.container, { paddingTop: topPad + 40, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.topSection}>
          <View style={[styles.logoBox, { backgroundColor: colors.primary }]}>
            <MaterialCommunityIcons name="wallet-outline" size={32} color="#fff" />
          </View>
          <Text style={[styles.appName, { color: colors.text }]}>ExpenseBuddy</Text>
          <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
            Split smart. Settle fast.
          </Text>
        </View>

        <View style={styles.formSection}>
          <Text style={[styles.title, { color: colors.text }]}>Enter your number</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            We'll send a verification code to confirm it's you.
          </Text>

          <View style={[styles.inputRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.flagBox, { borderRightColor: colors.border }]}>
              <Text style={[styles.flag, { color: colors.text }]}>+91</Text>
            </View>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="10-digit mobile number"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="phone-pad"
              maxLength={10}
              value={phone}
              onChangeText={setPhone}
              autoFocus
            />
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.btn,
              { backgroundColor: isValid ? colors.primary : colors.muted, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={handleSendOTP}
            disabled={!isValid || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.btnText}>Get OTP</Text>
                <Feather name="arrow-right" size={18} color="#fff" />
              </>
            )}
          </Pressable>
        </View>

        <Text style={[styles.footer, { color: colors.mutedForeground }]}>
          By continuing, you agree to our Terms & Privacy Policy.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  topSection: {
    alignItems: "center",
    gap: 10,
  },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  appName: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  formSection: {
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  flagBox: {
    paddingHorizontal: 14,
    paddingVertical: 16,
    borderRightWidth: 1.5,
  },
  flag: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 16,
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    letterSpacing: 1,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 4,
  },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  footer: {
    textAlign: "center",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
