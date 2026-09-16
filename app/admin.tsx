import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card, Chip, IconButton, PrimaryButton, ScreenTitle, formatJod, shortDate } from "@/components/fixnow-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

export default function AdminScreen() {
  const colors = useColors();
  const { isAuthenticated } = useAuth();
  const account = trpc.profile.me.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const isAdmin = account.data?.user.role === "admin";
  const overview = trpc.admin.overview.useQuery(undefined, { enabled: isAdmin, retry: false });
  const technicians = trpc.admin.technicians.useQuery(undefined, { enabled: isAdmin, retry: false });
  const requests = trpc.admin.requests.useQuery(undefined, { enabled: isAdmin, retry: false });
  const reviews = trpc.admin.reviews.useQuery(undefined, { enabled: isAdmin, retry: false });
  const verify = trpc.admin.setVerification.useMutation({ onSuccess: () => { void technicians.refetch(); void overview.refetch(); } });
  const moderateReview = trpc.admin.setReviewVisibility.useMutation({ onSuccess: () => void reviews.refetch() });
  if (account.isLoading) return <ScreenContainer className="items-center justify-center"><ActivityIndicator color={colors.primary} /></ScreenContainer>;
  if (!isAdmin) return <ScreenContainer className="p-5"><View style={styles.guest}><IconButton icon="arrow-back" label="Back" onPress={() => router.back()} /><View style={[styles.lock, { backgroundColor: `${colors.error}12` }]}><MaterialIcons name="admin-panel-settings" size={36} color={colors.error} /></View><Text style={[styles.deniedTitle, { color: colors.foreground }]}>Admin access required</Text><Text style={[styles.deniedText, { color: colors.muted }]}>This operational surface is restricted to authorized FixNow administrators.</Text></View></ScreenContainer>;
  const metrics = [{ label: "Users", value: overview.data?.users, icon: "people" as const }, { label: "Technicians", value: overview.data?.technicians, icon: "handyman" as const }, { label: "Active requests", value: overview.data?.requests, icon: "receipt-long" as const }, { label: "Completed", value: overview.data?.completed, icon: "task-alt" as const }, { label: "Revenue", value: overview.data ? formatJod(overview.data.revenue) : "—", icon: "payments" as const }, { label: "Average rating", value: overview.data?.rating ? `★ ${overview.data.rating}` : "—", icon: "star" as const }];
  return <ScreenContainer className="px-5"><ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}><View style={styles.nav}><IconButton icon="arrow-back" label="Back" onPress={() => router.back()} /><Chip label="OPERATIONS" tone="success" /></View><ScreenTitle eyebrow="FixNow control center" title="Platform operations" subtitle="Monitor the core marketplace and verify specialists before they become available." />{overview.isLoading ? <Card><ActivityIndicator color={colors.primary} /></Card> : <View style={styles.metrics}>{metrics.map((metric) => <Card key={metric.label} style={styles.metric}><View style={[styles.metricIcon, { backgroundColor: `${colors.primary}12` }]}><MaterialIcons name={metric.icon} size={18} color={colors.primary} /></View><Text style={[styles.metricValue, { color: colors.foreground }]}>{metric.value ?? "—"}</Text><Text style={[styles.metricLabel, { color: colors.muted }]}>{metric.label}</Text></Card>)}</View>}<ScreenTitle eyebrow="Verification queue" title="Technician review" subtitle="Review documents outside the app before approving. Approval enables availability." />{technicians.isLoading ? <Card><ActivityIndicator color={colors.primary} /></Card> : technicians.data?.length ? technicians.data.map(({ profile, user }) => <Card key={profile.id}><View style={styles.personTop}><View style={[styles.avatar, { backgroundColor: `${colors.primary}14` }]}><Text style={[styles.avatarText, { color: colors.primary }]}>{(user.name ?? "T").slice(0, 1)}</Text></View><View style={styles.personCopy}><Text style={[styles.personName, { color: colors.foreground }]}>{user.name ?? "Technician"}</Text><Text style={[styles.personMeta, { color: colors.muted }]}>{profile.serviceIds.length} services · {profile.serviceRadiusKm} km · {formatJod(profile.hourlyRate)}/hour</Text></View><Chip label={profile.verificationStatus.toUpperCase()} tone={profile.verificationStatus === "verified" ? "success" : profile.verificationStatus === "rejected" ? "danger" : "warning"} /></View><View style={[styles.adminDivider, { backgroundColor: colors.border }]} /><Text style={[styles.personMeta, { color: colors.muted }]}>Documents: {profile.documents?.length ?? 0} · Rating: ★ {profile.rating.toFixed(1)} · Completed jobs: {profile.completedJobs}</Text>{profile.verificationStatus !== "verified" ? <View style={styles.actionRow}><Pressable accessibilityRole="button" onPress={() => void verify.mutateAsync({ technicianId: profile.id, verificationStatus: "rejected" })} style={({ pressed }) => [styles.reject, { borderColor: `${colors.error}70`, opacity: pressed ? 0.65 : 1 }]}><Text style={[styles.rejectText, { color: colors.error }]}>Reject</Text></Pressable><View style={styles.approve}><PrimaryButton label="Verify" icon="verified" onPress={() => void verify.mutateAsync({ technicianId: profile.id, verificationStatus: "verified" })} loading={verify.isPending} /></View></View> : null}</Card>) : <Card><Text style={{ color: colors.muted }}>No technician profiles have been submitted.</Text></Card>}<ScreenTitle eyebrow="Request monitor" title="Recent service activity" subtitle="Open requests stay available for customer and technician status updates." />{requests.isLoading ? <Card><ActivityIndicator color={colors.primary} /></Card> : requests.data?.length ? requests.data.slice(0, 10).map(({ request, category, customer }) => <Card key={request.id}><View style={styles.requestLine}><View style={styles.requestCopy}><Text style={[styles.requestTitle, { color: colors.foreground }]}>{category.name} · #{request.id}</Text><Text style={[styles.personMeta, { color: colors.muted }]}>{customer.name ?? "Customer"} · {shortDate(request.createdAt)}</Text></View><Chip label={request.status.replaceAll("_", " ")} tone={request.status === "CANCELLED" || request.status === "DISPUTED" ? "danger" : request.status === "COMPLETED" || request.status === "PAID" || request.status === "REVIEWED" ? "success" : "primary"} /></View><Text style={[styles.requestDescription, { color: colors.muted }]} numberOfLines={2}>{request.description}</Text></Card>) : <Card><Text style={{ color: colors.muted }}>No customer requests have been created yet.</Text></Card>}<ScreenTitle eyebrow="Trust & quality" title="Review moderation" subtitle="Hide a review from public technician rating surfaces when it violates policy." />{reviews.isLoading ? <Card><ActivityIndicator color={colors.primary} /></Card> : reviews.data?.length ? reviews.data.slice(0, 10).map((review) => <Card key={review.id}><View style={styles.requestLine}><Text style={[styles.requestTitle, { color: colors.foreground }]}>★ {review.rating} review</Text><Chip label={review.visible ? "VISIBLE" : "HIDDEN"} tone={review.visible ? "success" : "neutral"} /></View>{review.comment ? <Text style={[styles.requestDescription, { color: colors.muted }]}>{review.comment}</Text> : null}<Pressable accessibilityRole="button" onPress={() => void moderateReview.mutateAsync({ reviewId: review.id, visible: !review.visible })} style={({ pressed }) => [styles.moderate, { borderColor: colors.border, opacity: pressed ? 0.65 : 1 }]}><Text style={[styles.moderateText, { color: colors.foreground }]}>{review.visible ? "Hide review" : "Restore review"}</Text></Pressable></Card>) : <Card><Text style={{ color: colors.muted }}>Reviews will appear here after completed and paid jobs.</Text></Card>}<Text style={[styles.audit, { color: colors.muted }]}>MVP note: sensitive verification documents should be reviewed through a secure administrator document viewer before approval. Add immutable audit logs and complaint-resolution workflow before launch.</Text></ScrollView></ScreenContainer>;
}

const styles = StyleSheet.create({
  scroll: { paddingTop: 12, paddingBottom: 34, gap: 18, maxWidth: 960, width: "100%", alignSelf: "center" },
  nav: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  guest: { flex: 1, paddingTop: 12, alignItems: "center", justifyContent: "center", gap: 12 },
  lock: { height: 70, width: 70, borderRadius: 23, alignItems: "center", justifyContent: "center", marginTop: 60 },
  deniedTitle: { fontSize: 21, lineHeight: 27, fontWeight: "800" },
  deniedText: { fontSize: 13, lineHeight: 19, textAlign: "center", maxWidth: 290 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metric: { width: "31%", minWidth: 145, flexGrow: 1, minHeight: 115, justifyContent: "space-between" },
  metricIcon: { height: 35, width: 35, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  metricValue: { fontSize: 21, lineHeight: 27, fontWeight: "800" },
  metricLabel: { fontSize: 11, lineHeight: 15, fontWeight: "700" },
  personTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { height: 42, width: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 16, fontWeight: "800" },
  personCopy: { flex: 1, gap: 2 },
  personName: { fontSize: 14, lineHeight: 19, fontWeight: "800" },
  personMeta: { fontSize: 10, lineHeight: 15 },
  adminDivider: { height: 1, marginVertical: 1 },
  actionRow: { flexDirection: "row", gap: 8 },
  reject: { width: 80, minHeight: 46, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  rejectText: { fontSize: 12, lineHeight: 16, fontWeight: "800" },
  approve: { flex: 1 },
  requestLine: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  requestCopy: { flex: 1, gap: 2 },
  requestTitle: { fontSize: 13, lineHeight: 18, fontWeight: "800" },
  requestDescription: { fontSize: 11, lineHeight: 16 },
  moderate: { alignSelf: "flex-start", minHeight: 34, paddingHorizontal: 11, borderRadius: 10, borderWidth: 1, justifyContent: "center" },
  moderateText: { fontSize: 11, lineHeight: 15, fontWeight: "800" },
  audit: { fontSize: 10, lineHeight: 15, textAlign: "center", paddingHorizontal: 16, marginTop: 3 },
});
