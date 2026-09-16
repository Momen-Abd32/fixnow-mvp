import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { FixNowMark, PrimaryButton } from "@/components/fixnow-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { startOAuthLogin } from "@/constants/oauth";

export default function AuthScreen() {
  const colors = useColors();
  const [loading, setLoading] = useState(false);
  const signIn = async () => {
    setLoading(true);
    try { await startOAuthLogin(); } finally { setLoading(false); }
  };
  return (
    <ScreenContainer className="px-5" edges={["top", "bottom", "left", "right"]}>
      <View style={styles.page}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={({ pressed }) => [styles.back, { borderColor: colors.border, opacity: pressed ? 0.65 : 1 }]}><MaterialIcons name="arrow-back" size={21} color={colors.foreground} /></Pressable>
        <View style={styles.center}>
          <FixNowMark />
          <View style={[styles.art, { backgroundColor: colors.foreground }]}><View style={[styles.artCircle, { borderColor: `${colors.primary}80` }]}><MaterialIcons name="verified-user" size={58} color="#FFFFFF" /></View></View>
          <Text style={[styles.title, { color: colors.foreground }]}>Your home,{`\n`}handled with care.</Text>
          <Text style={[styles.body, { color: colors.muted }]}>Sign in to request trusted specialists, receive job updates, and keep your service history in one secure place.</Text>
        </View>
        <View style={styles.footer}>
          <PrimaryButton label="Continue securely" icon="lock-outline" onPress={signIn} loading={loading} />
          <Text style={[styles.legal, { color: colors.muted }]}>FixNow uses secure account authentication. We never ask you to share a password in the app.</Text>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingTop: 12, paddingBottom: 14 },
  back: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 17, paddingHorizontal: 12 },
  art: { width: 150, height: 150, borderRadius: 48, alignItems: "center", justifyContent: "center", marginBottom: 9 },
  artCircle: { width: 106, height: 106, borderWidth: 1, borderRadius: 35, alignItems: "center", justifyContent: "center" },
  title: { alignSelf: "stretch", fontSize: 31, lineHeight: 37, fontWeight: "800", letterSpacing: -1, textAlign: "center" },
  body: { fontSize: 14, lineHeight: 21, textAlign: "center", maxWidth: 335 },
  footer: { gap: 14 },
  legal: { fontSize: 11, lineHeight: 16, textAlign: "center", paddingHorizontal: 12 },
});
