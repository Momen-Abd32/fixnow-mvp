import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Card, Chip, EmptyState, FixNowMark, LoginRequired, PrimaryButton, ScreenTitle, formatJod, shortDate } from "@/components/fixnow-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { STATUS_LABELS, type RequestStatus } from "@/shared/types";

export default function JobsScreen() {
  const colors = useColors();
  const { isAuthenticated, loading } = useAuth();
  const jobs = trpc.requests.listMine.useQuery(undefined, { enabled: isAuthenticated, refetchInterval: 12_000, retry: false });
  if (loading) return <ScreenContainer className="items-center justify-center"><ActivityIndicator color={colors.primary} /></ScreenContainer>;
  if (!isAuthenticated) return <ScreenContainer className="p-5"><View style={styles.guest}><FixNowMark /><ScreenTitle eyebrow="Your service history" title="Everything in one place." subtitle="Sign in to see status updates, messages, payment records, and reviews." /><LoginRequired /></View></ScreenContainer>;
  return (
    <ScreenContainer className="px-5">
      <FlatList
        data={jobs.data ?? []}
        keyExtractor={(item) => String(item.request.id)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshing={jobs.isFetching}
        onRefresh={() => void jobs.refetch()}
        ListHeaderComponent={<View style={styles.header}><View style={styles.nav}><FixNowMark compact /><Pressable accessibilityRole="button" onPress={() => router.push("/request/new")} style={({ pressed }) => [styles.addButton, { backgroundColor: colors.primary, opacity: pressed ? 0.72 : 1 }]}><MaterialIcons name="add" size={18} color="#FFFFFF" /><Text style={styles.addText}>New request</Text></Pressable></View><ScreenTitle eyebrow="My jobs" title="Your home, in motion." subtitle="Follow every request from specialist matching through payment and review." /></View>}
        renderItem={({ item }) => {
          const status = item.request.status as RequestStatus;
          const technicianName = item.technicianUser?.name;
          return <Pressable accessibilityRole="button" accessibilityLabel={`View ${item.category.name} request`} onPress={() => router.push({ pathname: "/request/[id]", params: { id: String(item.request.id) } })} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}><Card><View style={styles.jobHeader}><View style={[styles.categoryIcon, { backgroundColor: `${colors.primary}12` }]}><MaterialIcons name={item.category.icon as any} size={21} color={colors.primary} /></View><View style={styles.jobCopy}><Text style={[styles.jobName, { color: colors.foreground }]}>{item.category.name}</Text><Text style={[styles.jobMeta, { color: colors.muted }]}>{shortDate(item.request.createdAt)} · #{item.request.id}</Text></View><Chip label={status.replaceAll("_", " ")} tone={status === "CANCELLED" || status === "DISPUTED" ? "danger" : ["COMPLETED", "PAID", "REVIEWED"].includes(status) ? "success" : "primary"} /></View><View style={[styles.divider, { backgroundColor: colors.border }]} /><View style={styles.jobBottom}><View><Text style={[styles.status, { color: colors.foreground }]}>{STATUS_LABELS[status]}</Text><Text style={[styles.jobSub, { color: colors.muted }]}>{technicianName ? `With ${technicianName}` : status === "PENDING" ? "Comparing qualified technicians" : "Technician assignment pending"}</Text></View><View style={styles.priceBlock}><Text style={[styles.price, { color: colors.foreground }]}>{formatJod(item.request.finalPrice ?? item.request.estimatedMin)}</Text><Text style={[styles.jobSub, { color: colors.muted }]}>{item.request.finalPrice ? "final" : "from"}</Text></View></View></Card></Pressable>;
        }}
        ListEmptyComponent={jobs.isLoading ? <View style={styles.loading}><ActivityIndicator color={colors.primary} /></View> : <View style={styles.empty}><EmptyState icon="home-repair-service" title="No service requests yet" body="Start with a simple description. FixNow will show available verified specialists before you choose." actionLabel="Create your first request" onAction={() => router.push("/request/new")} /></View>}
        ListFooterComponent={<View style={styles.footer}><Text style={[styles.footerText, { color: colors.muted }]}>Need immediate help? Create an emergency request and follow the safety guidance before waiting for a technician.</Text>{jobs.error ? <PrimaryButton label="Try loading again" icon="refresh" tone="light" onPress={() => void jobs.refetch()} /> : null}</View>}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: { paddingTop: 12, paddingBottom: 34, gap: 11 },
  header: { gap: 20, marginBottom: 2 },
  nav: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  addButton: { minHeight: 38, paddingHorizontal: 12, borderRadius: 13, flexDirection: "row", alignItems: "center", gap: 5 },
  addText: { color: "#FFFFFF", fontSize: 12, lineHeight: 16, fontWeight: "800" },
  guest: { paddingTop: 12, gap: 26 },
  jobHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  categoryIcon: { width: 43, height: 43, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  jobCopy: { flex: 1, gap: 2 },
  jobName: { fontSize: 15, lineHeight: 20, fontWeight: "800" },
  jobMeta: { fontSize: 11, lineHeight: 16 },
  divider: { height: 1, marginVertical: 1 },
  jobBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  status: { fontSize: 13, lineHeight: 18, fontWeight: "800" },
  jobSub: { fontSize: 10, lineHeight: 14, marginTop: 2 },
  priceBlock: { alignItems: "flex-end" },
  price: { fontSize: 13, lineHeight: 18, fontWeight: "800" },
  empty: { marginTop: 16 },
  loading: { minHeight: 180, alignItems: "center", justifyContent: "center" },
  footer: { paddingTop: 13, gap: 10 },
  footerText: { fontSize: 11, lineHeight: 16, textAlign: "center", paddingHorizontal: 18 },
});
