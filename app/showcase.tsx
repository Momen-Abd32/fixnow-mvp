import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card, Chip, FixNowMark, PrimaryButton } from "@/components/fixnow-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

const services = [
  { icon: "plumbing", name: "Plumbing", price: "25–60 JOD", note: "Leaks, taps & pipes" },
  { icon: "electrical-services", name: "Electrical", price: "20–55 JOD", note: "Power, lights & wiring" },
  { icon: "ac-unit", name: "AC Repair", price: "25–70 JOD", note: "Cooling & maintenance" },
  { icon: "format-paint", name: "Painting", price: "30–90 JOD", note: "Walls & touch-ups" },
];

const specialists = [
  { name: "Ahmad K.", role: "Electrical specialist", rating: "4.9", jobs: "126 jobs", eta: "18 min" },
  { name: "Omar S.", role: "Home maintenance", rating: "4.8", jobs: "94 jobs", eta: "25 min" },
  { name: "Yazan H.", role: "AC specialist", rating: "4.9", jobs: "81 jobs", eta: "31 min" },
];

export default function ShowcaseScreen() {
  const colors = useColors();
  return (
    <ScreenContainer className="px-5">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.nav}><FixNowMark /><Chip label="LIVE DEMO" tone="success" /></View>
        <View style={[styles.hero, { backgroundColor: colors.foreground }]}>
          <Chip label="HOME SERVICES, SIMPLIFIED" tone="primary" />
          <Text style={styles.heroTitle}>Fix the problem.{"\n"}Not the whole day.</Text>
          <Text style={styles.heroBody}>A marketplace experience for finding verified local specialists, getting a preliminary AI assessment, and tracking a service from request to review.</Text>
          <View style={styles.heroActions}>
            <View style={styles.actionFlex}><PrimaryButton label="Create a request" icon="arrow-forward" onPress={() => router.push("/request/new")} /></View>
            <Pressable onPress={() => router.push("/")} style={styles.secondary}><Text style={styles.secondaryText}>Explore app</Text></Pressable>
          </View>
        </View>
        <View style={styles.stats}>
          {[["4.9", "avg. rating"], ["300+", "completed jobs"], ["5", "local matches"]].map(([value, label]) => (
            <Card key={label} style={styles.stat}><Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text><Text style={[styles.statLabel, { color: colors.muted }]}>{label}</Text></Card>
          ))}
        </View>
        <View style={styles.section}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>POPULAR SERVICES</Text>
          <Text style={[styles.heading, { color: colors.foreground }]}>Book the right specialist</Text>
          <Text style={[styles.sub, { color: colors.muted }]}>Clear starting estimates and a simple request flow.</Text>
        </View>
        <View style={styles.grid}>
          {services.map((service) => (
            <Pressable key={service.name} onPress={() => router.push("/request/new")} style={({ pressed }) => [styles.service, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.75 : 1 }]}>
              <View style={[styles.icon, { backgroundColor: colors.primary + "14" }]}><MaterialIcons name={service.icon as any} size={22} color={colors.primary} /></View>
              <Text style={[styles.serviceName, { color: colors.foreground }]}>{service.name}</Text>
              <Text style={[styles.note, { color: colors.muted }]}>{service.note}</Text>
              <Text style={[styles.price, { color: colors.primary }]}>{service.price}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.section}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>MATCHING</Text>
          <Text style={[styles.heading, { color: colors.foreground }]}>Compare specialists before you choose</Text>
        </View>
        {specialists.map((person, index) => (
          <Card key={person.name} style={styles.person}>
            <View style={[styles.avatar, { backgroundColor: colors.primary + "14" }]}><Text style={[styles.avatarText, { color: colors.primary }]}>{person.name[0]}</Text></View>
            <View style={styles.personMain}>
              <View style={styles.personRow}><Text style={[styles.personName, { color: colors.foreground }]}>{person.name}</Text><Chip label={index === 0 ? "TOP MATCH" : "VERIFIED"} tone={index === 0 ? "primary" : "success"} /></View>
              <Text style={[styles.personRole, { color: colors.muted }]}>{person.role}</Text>
              <Text style={[styles.personMeta, { color: colors.muted }]}>★ {person.rating} · {person.jobs} · {person.eta} away</Text>
            </View>
          </Card>
        ))}
        <Card style={styles.aiCard}>
          <View style={[styles.aiIcon, { backgroundColor: colors.primary }]}><MaterialIcons name="auto-awesome" size={23} color="#fff" /></View>
          <View style={styles.aiCopy}><Text style={[styles.aiTitle, { color: colors.foreground }]}>AI preliminary diagnosis</Text><Text style={[styles.aiBody, { color: colors.muted }]}>Describe the issue or add evidence. FixNow returns an estimate to help you choose the right service.</Text></View>
        </Card>
        <Text style={[styles.footer, { color: colors.muted }]}>Portfolio showcase · FixNow MVP · Expo + TypeScript + tRPC + Drizzle/MySQL</Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: 12, paddingBottom: 42, gap: 18, maxWidth: 1040, width: "100%", alignSelf: "center" },
  nav: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  hero: { borderRadius: 30, padding: 25, gap: 13, overflow: "hidden" },
  heroTitle: { color: "#fff", fontSize: 38, lineHeight: 42, fontWeight: "900", letterSpacing: -1.4, marginTop: 5 },
  heroBody: { color: "rgba(255,255,255,0.72)", fontSize: 14, lineHeight: 21, maxWidth: 680 },
  heroActions: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 7 },
  actionFlex: { minWidth: 190 },
  secondary: { minHeight: 48, paddingHorizontal: 18, borderRadius: 15, justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  secondaryText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  stats: { flexDirection: "row", gap: 10 },
  stat: { flex: 1, minHeight: 88, justifyContent: "center" },
  statValue: { fontSize: 23, fontWeight: "900" },
  statLabel: { fontSize: 11, marginTop: 2 },
  section: { gap: 4, marginTop: 4 },
  eyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 1.1 },
  heading: { fontSize: 25, lineHeight: 31, fontWeight: "900", letterSpacing: -0.5 },
  sub: { fontSize: 13, lineHeight: 19 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  service: { width: "48%", flexGrow: 1, minWidth: 170, minHeight: 155, borderRadius: 21, borderWidth: 1, padding: 15, justifyContent: "space-between" },
  icon: { width: 43, height: 43, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  serviceName: { fontSize: 15, fontWeight: "900", marginTop: 10 },
  note: { fontSize: 11, marginTop: 2 },
  price: { fontSize: 12, fontWeight: "900", marginTop: 9 },
  person: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 19, fontWeight: "900" },
  personMain: { flex: 1, marginLeft: 12, gap: 2 },
  personRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  personName: { fontSize: 14, fontWeight: "900" },
  personRole: { fontSize: 11 },
  personMeta: { fontSize: 11, marginTop: 2 },
  aiCard: { flexDirection: "row", alignItems: "center", gap: 13, padding: 18 },
  aiIcon: { width: 47, height: 47, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  aiCopy: { flex: 1, gap: 3 },
  aiTitle: { fontSize: 15, fontWeight: "900" },
  aiBody: { fontSize: 12, lineHeight: 18 },
  footer: { fontSize: 10, textAlign: "center", marginTop: 5 }
});
