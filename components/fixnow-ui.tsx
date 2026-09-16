import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import type { ComponentProps, ReactNode } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/use-colors";

export function FixNowMark({ compact = false }: { compact?: boolean }) {
  const colors = useColors();
  return (
    <View style={styles.markRow}>
      <View style={[styles.mark, { backgroundColor: colors.primary }]}>
        <MaterialIcons name="handyman" size={compact ? 17 : 20} color="#FFFFFF" />
      </View>
      {!compact && <Text style={[styles.wordmark, { color: colors.foreground }]}>Fix<Text style={{ color: colors.primary }}>Now</Text></Text>}
    </View>
  );
}

export function ScreenTitle({ eyebrow, title, subtitle, action }: { eyebrow?: string; title: string; subtitle?: string; action?: ReactNode }) {
  const colors = useColors();
  return (
    <View style={styles.titleRow}>
      <View style={styles.titleCopy}>
        {eyebrow ? <Text style={[styles.eyebrow, { color: colors.primary }]}>{eyebrow.toUpperCase()}</Text> : null}
        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: colors.muted }]}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: object }) {
  const colors = useColors();
  return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, style]}>{children}</View>;
}

export function PrimaryButton({ label, onPress, icon, disabled = false, loading = false, tone = "primary" }: { label: string; onPress: () => void; icon?: ComponentProps<typeof MaterialIcons>["name"]; disabled?: boolean; loading?: boolean; tone?: "primary" | "dark" | "light" | "danger" }) {
  const colors = useColors();
  const background = tone === "primary" ? colors.primary : tone === "danger" ? colors.error : tone === "dark" ? colors.foreground : colors.surface;
  const foreground = tone === "light" ? colors.foreground : "#FFFFFF";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || loading}
      onPress={() => {
        if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [styles.primaryButton, { backgroundColor: background, opacity: disabled || loading ? 0.55 : pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.975 : 1 }] }]}
    >
      {loading ? <ActivityIndicator color={foreground} /> : icon ? <MaterialIcons name={icon} size={19} color={foreground} /> : null}
      <Text style={[styles.primaryButtonText, { color: foreground }]}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({ icon, label, onPress, selected = false }: { icon: ComponentProps<typeof MaterialIcons>["name"]; label: string; onPress: () => void; selected?: boolean }) {
  const colors = useColors();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.iconButton, { backgroundColor: selected ? `${colors.primary}18` : colors.surface, borderColor: selected ? colors.primary : colors.border, opacity: pressed ? 0.68 : 1 }]}> 
      <MaterialIcons name={icon} size={20} color={selected ? colors.primary : colors.foreground} />
    </Pressable>
  );
}

export function Chip({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "success" | "warning" | "danger" | "primary" }) {
  const colors = useColors();
  const color = tone === "success" ? colors.success : tone === "warning" ? colors.warning : tone === "danger" ? colors.error : tone === "primary" ? colors.primary : colors.muted;
  return <View style={[styles.chip, { backgroundColor: `${color}18` }]}><Text style={[styles.chipText, { color }]}>{label}</Text></View>;
}

export function FieldLabel({ children }: { children: string }) {
  const colors = useColors();
  return <Text style={[styles.fieldLabel, { color: colors.foreground }]}>{children}</Text>;
}

export function EmptyState({ icon, title, body, actionLabel, onAction }: { icon: ComponentProps<typeof MaterialIcons>["name"]; title: string; body: string; actionLabel?: string; onAction?: () => void }) {
  const colors = useColors();
  return (
    <View style={[styles.empty, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <View style={[styles.emptyIcon, { backgroundColor: `${colors.primary}12` }]}><MaterialIcons name={icon} size={28} color={colors.primary} /></View>
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.emptyBody, { color: colors.muted }]}>{body}</Text>
      {actionLabel && onAction ? <View style={styles.emptyAction}><PrimaryButton label={actionLabel} onPress={onAction} icon="arrow-forward" /></View> : null}
    </View>
  );
}

export function LoginRequired({ body = "Sign in to create, track, and manage your FixNow services." }: { body?: string }) {
  return <EmptyState icon="lock-outline" title="Your account keeps things secure" body={body} actionLabel="Sign in to continue" onAction={() => router.push("/auth")} />;
}

export function formatJod(amount: number | null | undefined) {
  return amount === null || amount === undefined ? "—" : `${Math.round(amount)} JOD`;
}

export function shortDate(value: Date | string | null | undefined) {
  if (!value) return "Just now";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const styles = StyleSheet.create({
  markRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  mark: { width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 11 },
  wordmark: { fontSize: 23, lineHeight: 28, fontWeight: "800", letterSpacing: -0.8 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  titleCopy: { flex: 1, gap: 3 },
  eyebrow: { fontSize: 10, lineHeight: 14, fontWeight: "800", letterSpacing: 1.05 },
  title: { fontSize: 26, lineHeight: 33, fontWeight: "800", letterSpacing: -0.7 },
  subtitle: { fontSize: 14, lineHeight: 21 },
  card: { borderRadius: 22, borderWidth: 1, padding: 16, gap: 10, shadowColor: "#102A43", shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 1 },
  primaryButton: { minHeight: 48, borderRadius: 15, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  primaryButtonText: { fontSize: 15, lineHeight: 20, fontWeight: "800" },
  iconButton: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  chip: { alignSelf: "flex-start", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10 },
  chipText: { fontSize: 11, lineHeight: 14, fontWeight: "800" },
  fieldLabel: { fontSize: 13, lineHeight: 18, fontWeight: "800", marginBottom: 6 },
  empty: { borderRadius: 22, borderWidth: 1, padding: 24, alignItems: "center", gap: 9 },
  emptyIcon: { width: 54, height: 54, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 3 },
  emptyTitle: { fontSize: 17, lineHeight: 22, fontWeight: "800", textAlign: "center" },
  emptyBody: { fontSize: 14, lineHeight: 21, textAlign: "center", maxWidth: 320 },
  emptyAction: { alignSelf: "stretch", marginTop: 8 },
});
