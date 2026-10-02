import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useMemo } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card, Chip, EmptyState, FixNowMark, IconButton, LoginRequired, ScreenTitle, shortDate } from "@/components/fixnow-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

export default function ProfileScreen() {
  const colors = useColors();
  const { user, loading, isAuthenticated, logout } = useAuth();
  const profile = trpc.profile.me.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const notifications = useMemo(() => profile.data?.notifications ?? [], [profile.data?.notifications]);
  const technicianJobs = trpc.technicians.jobs.useQuery(undefined, { enabled: Boolean(profile.data?.technician), refetchInterval: 12_000, retry: false });
  const availability = trpc.technicians.availability.useMutation({ onSuccess: () => void profile.refetch() });
  if (loading) return <ScreenContainer className="items-center justify-center"><ActivityIndicator color={colors.primary} /></ScreenContainer>;
  if (!user) return <ScreenContainer className="p-5"><View style={styles.guest}><FixNowMark /><LoginRequired body="Sign in securely to manage addresses, notifications, payments, service history, and technician work." /></View></ScreenContainer>;

  const displayName = user.name ?? "FixNow member";
  return (
    <ScreenContainer className="px-5">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.nav}><FixNowMark compact /><IconButton icon="logout" label="Sign out" onPress={() => void logout()} /></View>
        <ScreenTitle eyebrow="Account" title={displayName} subtitle={user.email ?? "Your account is protected by secure authentication."} />
        <Card>
          <View style={styles.accountTop}><View style={[styles.avatar, { backgroundColor: `${colors.primary}18` }]}><Text style={[styles.avatarText, { color: colors.primary }]}>{displayName.slice(0, 1).toUpperCase()}</Text></View><View style={styles.accountCopy}><Text style={[styles.accountName, { color: colors.foreground }]}>{displayName}</Text><View style={styles.chips}><Chip label="SECURE ACCOUNT" tone="success" />{profile.data?.technician ? <Chip label="TECHNICIAN" tone="primary" /> : <Chip label="CUSTOMER" tone="neutral" />}</View></View></View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.accountLine}><MaterialIcons name="location-on" size={18} color={colors.primary} /><Text style={[styles.accountLineText, { color: colors.foreground }]}>{profile.data?.user.addresses?.[0]?.address ?? "Add a saved address when placing your first request"}</Text></View>
        </Card>

        {profile.data?.technician ? <Card style={styles.techCard}>
          <View style={styles.techHeader}>
            <View style={[styles.techIcon, { backgroundColor: `${colors.primary}12` }]}><MaterialIcons name="handyman" size={20} color={colors.primary} /></View>
            <View style={styles.techCopy}><Text style={[styles.techTitle, { color: colors.foreground }]}>Technician workspace</Text><Text style={[styles.techMeta, { color: colors.muted }]}>{profile.data.technician.verificationStatus === "verified" ? "Verified profile" : "Verification pending"} · {technicianJobs.data?.length ?? 0} assigned jobs</Text></View>
            <Pressable accessibilityRole="switch" accessibilityState={{ checked: profile.data.technician.availability }} disabled={availability.isPending || profile.data.technician.verificationStatus !== "verified"} onPress={() => void availability.mutateAsync({ availability: !profile.data.technician?.availability })} style={[styles.availability, { backgroundColor: profile.data.technician.availability ? colors.success : colors.border }]}><View style={styles.availabilityKnob} /></Pressable>
          </View>
          <View style={[styles.techStatus, { borderTopColor: colors.border }]}><Text style={[styles.techStatusText, { color: colors.muted }]}>{profile.data.technician.availability ? "Available for new service requests" : "Not accepting new requests"}</Text><Pressable onPress={() => void technicianJobs.refetch()}><Text style={[styles.link, { color: colors.primary }]}>Refresh jobs</Text></Pressable></View>
          {technicianJobs.data?.slice(0, 2).map((job) => <Pressable key={job.request.id} onPress={() => router.push({ pathname: "/request/[id]", params: { id: String(job.request.id) } })} style={({ pressed }) => [styles.techJob, { borderBottomColor: colors.border, opacity: pressed ? 0.65 : 1 }]}><View style={styles.techJobCopy}><Text style={[styles.techJobTitle, { color: colors.foreground }]}>{job.category.name} · #{job.request.id}</Text><Text style={[styles.techMeta, { color: colors.muted }]}>{job.request.status.replaceAll("_", " ")} · {shortDate(job.request.updatedAt)}</Text></View><MaterialIcons name="chevron-right" size={19} color={colors.muted} /></Pressable>)}
        </Card> : null}

        <View style={styles.sectionHeader}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Service settings</Text></View>
        <Card style={styles.menuCard}>
          <MenuRow icon="location-on" title="Saved addresses" value={`${profile.data?.user.addresses?.length ?? 0}`} onPress={() => router.push("/request/new")} />
          <MenuRow icon="receipt-long" title="Service history" onPress={() => router.push("/(tabs)/jobs")} />
          <MenuRow icon="credit-card" title="Payment methods" value="Cash active" onPress={() => router.push("/(tabs)/jobs")} />
          {profile.data?.user.role === "admin" ? <MenuRow icon="admin-panel-settings" title="Admin dashboard" value="Manage" onPress={() => router.push("/admin")} /> : null}
        </Card>

        <View style={styles.sectionHeader}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent updates</Text><Pressable onPress={() => profile.refetch()} accessibilityRole="button"><Text style={[styles.link, { color: colors.primary }]}>Refresh</Text></Pressable></View>
        {profile.isLoading ? <Card><ActivityIndicator color={colors.primary} /></Card> : notifications.length ? <Card style={styles.notificationCard}>{notifications.slice(0, 4).map((notification) => <View key={notification.id} style={[styles.notification, { borderBottomColor: colors.border }]}><View style={[styles.notificationDot, { backgroundColor: notification.read ? colors.border : colors.primary }]} /><View style={styles.notificationCopy}><Text style={[styles.notificationTitle, { color: colors.foreground }]}>{notification.title}</Text><Text style={[styles.notificationBody, { color: colors.muted }]} numberOfLines={2}>{notification.body}</Text></View><Text style={[styles.date, { color: colors.muted }]}>{shortDate(notification.createdAt)}</Text></View>)}</Card> : <EmptyState icon="notifications-none" title="Nothing new yet" body="Job acceptance, messages, payment confirmations, and other updates will appear here." />}
        <Text style={[styles.help, { color: colors.muted }]}>Need help with a request? Use the chat on its job page so your conversation stays connected to the service record.</Text>
      </ScrollView>
    </ScreenContainer>
  );
}

function MenuRow({ icon, title, value, onPress }: { icon: React.ComponentProps<typeof MaterialIcons>["name"]; title: string; value?: string; onPress: () => void }) {
  const colors = useColors();
  return <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={({ pressed }) => [styles.menuRow, { opacity: pressed ? 0.65 : 1 }]}><View style={[styles.menuIcon, { backgroundColor: `${colors.primary}12` }]}><MaterialIcons name={icon} size={18} color={colors.primary} /></View><Text style={[styles.menuTitle, { color: colors.foreground }]}>{title}</Text>{value ? <Text style={[styles.menuValue, { color: colors.muted }]}>{value}</Text> : null}<MaterialIcons name="chevron-right" size={20} color={colors.muted} /></Pressable>;
}

const styles = StyleSheet.create({
  scroll: { paddingTop: 12, paddingBottom: 34, gap: 18 },
  guest: { gap: 28, paddingTop: 5 },
  nav: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  accountTop: { flexDirection: "row", alignItems: "center", gap: 13 },
  avatar: { height: 52, width: 52, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 22, fontWeight: "800" },
  accountCopy: { flex: 1, gap: 4 },
  accountName: { fontSize: 17, lineHeight: 22, fontWeight: "800" },
  chips: { flexDirection: "row", gap: 6 },
  divider: { height: 1, marginVertical: 3 },
  accountLine: { flexDirection: "row", alignItems: "center", gap: 7 },
  accountLineText: { flex: 1, fontSize: 12, lineHeight: 17 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  sectionTitle: { fontSize: 15, lineHeight: 20, fontWeight: "800" },
  link: { fontSize: 12, lineHeight: 17, fontWeight: "800" },
  menuCard: { paddingVertical: 4, gap: 0 },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 58, paddingHorizontal: 4 },
  menuIcon: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  menuTitle: { flex: 1, fontSize: 14, lineHeight: 19, fontWeight: "700" },
  menuValue: { fontSize: 11, lineHeight: 16, fontWeight: "600" },
  notificationCard: { paddingVertical: 3, gap: 0 },
  notification: { minHeight: 64, flexDirection: "row", alignItems: "flex-start", gap: 9, paddingVertical: 11, borderBottomWidth: 1 },
  notificationDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  notificationCopy: { flex: 1, gap: 2 },
  notificationTitle: { fontSize: 13, lineHeight: 18, fontWeight: "800" },
  notificationBody: { fontSize: 11, lineHeight: 16 },
  date: { fontSize: 10, lineHeight: 14, marginTop: 2 },
  techCard: { gap: 10 },
  techHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  techIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  techCopy: { flex: 1, gap: 2 },
  techTitle: { fontSize: 14, lineHeight: 19, fontWeight: "800" },
  techMeta: { fontSize: 10, lineHeight: 15 },
  availability: { width: 48, height: 28, borderRadius: 15, padding: 3, justifyContent: "center" },
  availabilityKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#FFFFFF", alignSelf: "flex-end" },
  techStatus: { borderTopWidth: 1, paddingTop: 9, flexDirection: "row", justifyContent: "space-between", gap: 8 },
  techStatusText: { flex: 1, fontSize: 10, lineHeight: 15 },
  techJob: { minHeight: 48, borderBottomWidth: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  techJobCopy: { flex: 1, gap: 2 },
  techJobTitle: { fontSize: 12, lineHeight: 16, fontWeight: "800" },
  help: { fontSize: 11, lineHeight: 16, textAlign: "center", paddingHorizontal: 16, marginTop: 6 },
});
