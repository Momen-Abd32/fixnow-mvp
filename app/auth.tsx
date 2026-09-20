import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { FixNowMark, PrimaryButton } from "@/components/fixnow-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";

export default function AuthScreen() {
  const colors = useColors();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    if (!email.trim() || !password) return setError("Please enter your email and password.");
    if (mode === "register" && !name.trim()) return setError("Please enter your name.");
    setLoading(true);
    try {
      const result = mode === "login"
        ? await Api.login(email.trim(), password)
        : await Api.register(name.trim(), email.trim(), password);
      await Auth.setSessionToken(result.sessionToken);
      await Auth.setUserInfo({
        id: result.user.id,
        openId: result.user.openId,
        name: result.user.name,
        email: result.user.email,
        loginMethod: result.user.loginMethod,
        lastSignedIn: new Date(result.user.lastSignedIn || Date.now()),
      });
      router.replace("/(tabs)");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer className="px-5" edges={["top", "bottom", "left", "right"]}>
      <View style={styles.page}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.back, { borderColor: colors.border, opacity: pressed ? 0.65 : 1 }]}>
          <MaterialIcons name="arrow-back" size={21} color={colors.foreground} />
        </Pressable>
        <View style={styles.center}>
          <FixNowMark />
          <View style={[styles.art, { backgroundColor: colors.foreground }]}>
            <View style={[styles.artCircle, { borderColor: colors.primary + "80" }]}>
              <MaterialIcons name={mode === "login" ? "lock-outline" : "person-add"} size={50} color="#FFFFFF" />
            </View>
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {mode === "login" ? "Welcome back." : "Create your FixNow account."}
          </Text>
          <Text style={[styles.body, { color: colors.muted }]}>
            {mode === "login" ? "Sign in to manage your services and requests." : "Create an account to request trusted specialists and track your services."}
          </Text>
          {mode === "register" && <TextInput value={name} onChangeText={setName} placeholder="Full name" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, borderColor: colors.border }]} />}
          <TextInput value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, borderColor: colors.border }]} autoCapitalize="none" keyboardType="email-address" />
          <TextInput value={password} onChangeText={setPassword} placeholder="Password (6+ characters)" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, borderColor: colors.border }]} secureTextEntry autoCapitalize="none" />
          {!!error && <Text style={[styles.error, { color: colors.error }]}>{error}</Text>}
        </View>
        <View style={styles.footer}>
          <PrimaryButton label={mode === "login" ? "Sign in" : "Create account"} icon="lock-outline" onPress={submit} loading={loading} />
          <Pressable onPress={() => { setError(""); setMode(mode === "login" ? "register" : "login"); }}>
            <Text style={[styles.switch, { color: colors.primary }]}>
              {mode === "login" ? "Don't have an account? Create one" : "Already have an account? Sign in"}
            </Text>
          </Pressable>
          <Text style={[styles.legal, { color: colors.muted }]}>Your password is securely hashed and never stored in plain text.</Text>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingTop: 12, paddingBottom: 14 },
  back: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 12 },
  art: { width: 110, height: 110, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  artCircle: { width: 80, height: 80, borderWidth: 1, borderRadius: 27, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 28, lineHeight: 34, fontWeight: "800", textAlign: "center" },
  body: { fontSize: 14, lineHeight: 21, textAlign: "center", maxWidth: 335 },
  input: { width: "100%", maxWidth: 380, height: 50, borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, fontSize: 15 },
  error: { fontSize: 13, textAlign: "center", maxWidth: 380 },
  footer: { gap: 12 },
  switch: { fontSize: 14, fontWeight: "700", textAlign: "center" },
  legal: { fontSize: 11, lineHeight: 16, textAlign: "center", paddingHorizontal: 12 },
});
