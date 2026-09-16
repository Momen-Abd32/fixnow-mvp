import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useMemo } from "react";
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card, Chip, FixNowMark, IconButton, PrimaryButton, ScreenTitle } from "@/components/fixnow-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

type CatalogItem = { id: number; name: string; description: string; icon: string; basePriceMin: number; basePriceMax: number };

export default function HomeScreen() {
  const colors = useColors();
  const { data, isLoading, isFetching } = trpc.catalog.list.useQuery(undefined, { retry: 1 });
  const categories = useMemo<CatalogItem[]>(() => data ?? [], [data]);

  const goToRequest = (serviceId?: number) => {
    router.push({ pathname: "/request/new", params: serviceId ? { serviceId: String(serviceId) } : {} });
  };

  return (
    <ScreenContainer className="px-5" containerClassName="bg-background">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.nav}><FixNowMark /><View style={styles.navActions}><IconButton icon="notifications-none" label="Notifications" onPress={() => router.push("/(tabs)/profile")} /><IconButton icon="person-outline" label="Profile" onPress={() => router.push("/(tabs)/profile")} /></View></View>

        <View style={[styles.hero, { backgroundColor: colors.foreground }]}>
          <View style={styles.heroTop}><Chip label="LOCAL HOME SERVICES" tone="primary" /><View style={styles.heroIcon}><MaterialIcons name="bolt" size={22} color="#FFFFFF" /></View></View>
          <Text style={styles.heroTitle}>A better fix{`\n`}starts here.</Text>
          <Text style={styles.heroBody}>Tell us what is wrong, choose a verified specialist, and follow every step until the job is done.</Text>
          <View style={styles.heroAction}><PrimaryButton label="Start a service request" icon="arrow-forward" onPress={() => goToRequest()} /></View>
        </View>

        <Pressable accessibilityRole="button" onPress={() => router.push("/diagnosis")} style={({ pressed }) => [styles.diagnosis, { backgroundColor: `${colors.primary}14`, borderColor: `${colors.primary}36`, opacity: pressed ? 0.8 : 1 }]}>
          <View style={[styles.diagnosisIcon, { backgroundColor: colors.primary }]}><MaterialIcons name="auto-awesome" size={22} color="#FFFFFF" /></View>
          <View style={styles.diagnosisCopy}><Text style={[styles.diagnosisTitle, { color: colors.foreground }]}>Not sure who to call?</Text><Text style={[styles.diagnosisBody, { color: colors.muted }]}>Get a safe, preliminary AI assessment in minutes.</Text></View>
          <MaterialIcons name="arrow-forward" size={20} color={colors.primary} />
        </Pressable>

        <ScreenTitle eyebrow="Book a specialist" title="What needs attention?" subtitle="Clear estimates before you choose." />
        {isLoading ? <View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={{ color: colors.muted }}>Loading local services…</Text></View> : null}
        {!isLoading ? <FlatList
          scrollEnabled={false}
          data={categories}
          numColumns={2}
          keyExtractor={(item) => String(item.id)}
          columnWrapperStyle={styles.categoryRow}
          contentContainerStyle={styles.categoryList}
          renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`Request ${item.name}`} onPress={() => goToRequest(item.id)} style={({ pressed }) => [styles.category, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}><View style={[styles.categoryIcon, { backgroundColor: `${colors.primary}12` }]}><MaterialIcons name={item.icon as any} size={22} color={colors.primary} /></View><Text style={[styles.categoryName, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text><Text style={[styles.categoryPrice, { color: colors.muted }]}>{item.basePriceMin}–{item.basePriceMax} JOD</Text></Pressable>}
        /> : null}

        <Card style={styles.emergencyCard}>
          <View style={styles.emergencyTop}><View style={[styles.emergencyIcon, { backgroundColor: `${colors.error}14` }]}><MaterialIcons name="warning-amber" size={21} color={colors.error} /></View><View style={styles.emergencyCopy}><Text style={[styles.emergencyTitle, { color: colors.foreground }]}>Urgent home issue?</Text><Text style={[styles.emergencyBody, { color: colors.muted }]}>For fire, sparking, gas smells, flooding, or immediate danger, move to safety and call emergency services.</Text></View></View>
          <Pressable accessibilityRole="button" onPress={() => goToRequest()} style={({ pressed }) => [styles.emergencyAction, { borderColor: colors.error, opacity: pressed ? 0.7 : 1 }]}><Text style={[styles.emergencyActionText, { color: colors.error }]}>Create emergency request</Text><MaterialIcons name="arrow-forward" size={18} color={colors.error} /></Pressable>
        </Card>

        <View style={styles.howHeader}><Text style={[styles.sectionLabel, { color: colors.foreground }]}>HOW FIXNOW WORKS</Text>{isFetching ? <ActivityIndicator size="small" color={colors.primary} /> : null}</View>
        <View style={styles.steps}>{[["1", "Describe", "Share what happened"], ["2", "Choose", "Compare local experts"], ["3", "Relax", "Track from arrival to review"]].map(([number, title, body]) => <View key={number} style={styles.step}><Text style={[styles.stepNumber, { color: colors.primary }]}>{number}</Text><Text style={[styles.stepTitle, { color: colors.foreground }]}>{title}</Text><Text style={[styles.stepBody, { color: colors.muted }]}>{body}</Text></View>)}</View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: 12, paddingBottom: 34, gap: 22 },
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  navActions: { flexDirection: "row", gap: 8 },
  hero: { borderRadius: 28, padding: 22, gap: 12, overflow: "hidden" },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heroIcon: { width: 39, height: 39, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.13)", alignItems: "center", justifyContent: "center" },
  heroTitle: { color: "#FFFFFF", fontSize: 31, lineHeight: 36, fontWeight: "800", letterSpacing: -1.1, marginTop: 7 },
  heroBody: { color: "rgba(255,255,255,0.72)", fontSize: 14, lineHeight: 21, maxWidth: 300 },
  heroAction: { marginTop: 7, alignSelf: "flex-start", minWidth: 210 },
  diagnosis: { borderWidth: 1, borderRadius: 20, padding: 15, flexDirection: "row", alignItems: "center", gap: 12 },
  diagnosisIcon: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  diagnosisCopy: { flex: 1, gap: 2 },
  diagnosisTitle: { fontSize: 15, lineHeight: 20, fontWeight: "800" },
  diagnosisBody: { fontSize: 12, lineHeight: 17 },
  loading: { minHeight: 120, alignItems: "center", justifyContent: "center", gap: 10 },
  categoryList: { gap: 11 },
  categoryRow: { gap: 11 },
  category: { flex: 1, minHeight: 132, borderWidth: 1, borderRadius: 20, padding: 14, justifyContent: "space-between" },
  categoryIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  categoryName: { fontSize: 14, lineHeight: 19, fontWeight: "800", marginTop: 10 },
  categoryPrice: { fontSize: 11, lineHeight: 15, fontWeight: "600" },
  emergencyCard: { gap: 14 },
  emergencyTop: { flexDirection: "row", gap: 12 },
  emergencyIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  emergencyCopy: { flex: 1, gap: 3 },
  emergencyTitle: { fontSize: 15, lineHeight: 20, fontWeight: "800" },
  emergencyBody: { fontSize: 12, lineHeight: 18 },
  emergencyAction: { minHeight: 40, borderWidth: 1, borderRadius: 13, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7 },
  emergencyActionText: { fontSize: 13, lineHeight: 17, fontWeight: "800" },
  howHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionLabel: { fontSize: 11, lineHeight: 15, fontWeight: "800", letterSpacing: 1.2 },
  steps: { flexDirection: "row", gap: 8 },
  step: { flex: 1, gap: 4 },
  stepNumber: { fontSize: 14, lineHeight: 19, fontWeight: "900" },
  stepTitle: { fontSize: 13, lineHeight: 17, fontWeight: "800" },
  stepBody: { fontSize: 11, lineHeight: 16 },
});
