import { Redirect } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { View } from "react-native";
import { useColors } from "@/hooks/useColors";

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();
  const colors = useColors();

  if (isLoading) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/auth/phone" />;
  }

  return <Redirect href="/(tabs)" />;
}
