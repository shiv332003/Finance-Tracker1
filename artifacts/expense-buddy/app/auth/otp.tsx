import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
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

export default function OTPScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { verifyOTP, updateProfile } = useAuth();

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const inputRefs = useRef<TextInput[]>([]);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer((p) => p - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const handleDigit = (val: string, idx: number) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[idx] = digit;
    setOtp(next);
    if (digit && idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    }
    if (next.every((d) => d !== "")) {
      handleVerify(next.join(""));
    }
  };

  const handleKeyPress = (key: string, idx: number) => {
    if (key === "Backspace" && !otp[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handleVerify = async (code?: string) => {
    const finalCode = code ?? otp.join("");
    if (finalCode.length !== 6) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      const success = await verifyOTP(phone ?? "", finalCode);
      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await updateProfile("User");
        router.replace("/(tabs)");
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Invalid OTP", "Enter any 6-digit code to continue (demo mode).");
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
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
      <View style={[styles.container, { paddingTop: topPad + 20, paddingBottom: insets.bottom + 24 }]}>
        <Pressable style={styles.back} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.text} />
        </Pressable>

        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]}>Verify number</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Enter the 6-digit code sent to{"\n"}
            <Text style={[styles.phone, { color: colors.text }]}>+91 {phone}</Text>
          </Text>
          <Text style={[styles.demo, { color: colors.primary }]}>
            Demo: Enter any 6 digits
          </Text>

          <View style={styles.otpRow}>
            {otp.map((digit, idx) => (
              <TextInput
                key={idx}
                ref={(r) => { if (r) inputRefs.current[idx] = r; }}
                style={[
                  styles.otpBox,
                  {
                    backgroundColor: colors.card,
                    borderColor: digit ? colors.primary : colors.border,
                    color: colors.text,
                  },
                ]}
                value={digit}
                onChangeText={(v) => handleDigit(v, idx)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, idx)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                autoFocus={idx === 0}
              />
            ))}
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.btn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={() => handleVerify()}
            disabled={loading || otp.some((d) => !d)}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Verify & Continue</Text>
            )}
          </Pressable>

          {resendTimer > 0 ? (
            <Text style={[styles.resendInfo, { color: colors.mutedForeground }]}>
              Resend OTP in {resendTimer}s
            </Text>
          ) : (
            <Pressable onPress={() => setResendTimer(30)}>
              <Text style={[styles.resendBtn, { color: colors.primary }]}>Resend OTP</Text>
            </Pressable>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 24 },
  back: { marginBottom: 32 },
  content: { gap: 20 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  subtitle: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
  phone: { fontFamily: "Inter_600SemiBold" },
  demo: { fontSize: 12, fontFamily: "Inter_500Medium" },
  otpRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  otpBox: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    textAlign: "center",
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  btn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
  },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  resendInfo: {
    textAlign: "center",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  resendBtn: {
    textAlign: "center",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
