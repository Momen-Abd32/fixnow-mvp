import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Card, Chip, IconButton, PrimaryButton, ScreenTitle, formatJod, shortDate } from "@/components/fixnow-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { STATUS_LABELS, type RequestStatus } from "@/shared/types";

const TECHNICIAN_NEXT: Partial<Record<RequestStatus, RequestStatus>> = { TECHNICIAN_ACCEPTED: "ON_THE_WAY", ON_THE_WAY: "ARRIVED", ARRIVED: "IN_PROGRESS", IN_PROGRESS: "COMPLETED" };

export default function RequestDetailScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const requestId = Number(id);
  const { user, isAuthenticated } = useAuth();
  const request = trpc.requests.get.useQuery({ requestId }, { enabled: isAuthenticated && Number.isFinite(requestId), refetchInterval: 12_000 });
  const matches = trpc.requests.matches.useQuery({ requestId }, { enabled: isAuthenticated && request.data?.request.status === "PENDING", refetchInterval: 12_000 });
  const techProfile = trpc.technicians.myProfile.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const choose = trpc.requests.chooseTechnician.useMutation({ onSuccess: () => { void request.refetch(); void matches.refetch(); } });
  const accept = trpc.requests.accept.useMutation({ onSuccess: () => void request.refetch() });
  const transition = trpc.requests.transition.useMutation({ onSuccess: () => void request.refetch() });
  const cancel = trpc.requests.cancel.useMutation({ onSuccess: () => void request.refetch() });
  const payment = trpc.payments.create.useMutation({ onSuccess: () => void request.refetch() });
  const confirmCash = trpc.payments.confirmCash.useMutation({ onSuccess: () => void request.refetch() });
  const review = trpc.reviews.create.useMutation({ onSuccess: () => void request.refetch() });
  const [finalPrice, setFinalPrice] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const showMessage = (title: string, message: string) => typeof window !== "undefined" ? window.alert(`${title}: ${message}`) : Alert.alert(title, message);

  if (!isAuthenticated) return <ScreenContainer className="p-5"><View style={styles.guest}><IconButton icon="arrow-back" label="Back" onPress={() => router.back()} /><Text style={[styles.errorTitle, { color: colors.foreground }]}>Sign in to view this secure request.</Text><PrimaryButton label="Sign in" icon="lock-outline" onPress={() => router.push("/auth")} /></View></ScreenContainer>;
  if (request.isLoading) return <ScreenContainer className="items-center justify-center"><ActivityIndicator color={colors.primary} /></ScreenContainer>;
  if (request.error || !request.data) return <ScreenContainer className="p-5"><View style={styles.guest}><IconButton icon="arrow-back" label="Back" onPress={() => router.back()} /><Text style={[styles.errorTitle, { color: colors.foreground }]}>This service request is unavailable.</Text><Text style={{ color: colors.muted, textAlign: "center" }}>It may no longer be associated with your account.</Text></View></ScreenContainer>;

  const detail = request.data;
  const isCustomer = detail.request.customerId === user?.id;
  const isAssignedTech = techProfile.data?.id === detail.request.technicianId;
  const status = detail.request.status as RequestStatus;
  const nextStatus = TECHNICIAN_NEXT[status];
  const progress = ["PENDING", "TECHNICIAN_ASSIGNED", "TECHNICIAN_ACCEPTED", "ON_THE_WAY", "ARRIVED", "IN_PROGRESS", "COMPLETED", "PAID", "REVIEWED"].indexOf(status);
  const pendingActions = choose.isPending || accept.isPending || transition.isPending || cancel.isPending || payment.isPending || confirmCash.isPending || review.isPending;
  const launchMap = () => void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${detail.request.latitude},${detail.request.longitude}`);
  const moveJob = async () => {
    if (!nextStatus) return;
    const agreedPrice = nextStatus === "COMPLETED" ? Number(finalPrice) : undefined;
    if (nextStatus === "COMPLETED" && (!agreedPrice || agreedPrice < 1)) { showMessage("Final price needed", "Enter the agreed price before marking the job complete."); return; }
    try { await transition.mutateAsync({ requestId, nextStatus, finalPrice: agreedPrice }); } catch (error) { showMessage("Update not saved", error instanceof Error ? error.message : "Please try again."); }
  };
  const cancelRequest = async () => { try { await cancel.mutateAsync({ requestId, reason: "Cancelled by account holder" }); } catch (error) { showMessage("Cancellation unavailable", error instanceof Error ? error.message : "Please try again."); } };
  const createCashPayment = async () => { try { await payment.mutateAsync({ requestId, method: "cash" }); } catch (error) { showMessage("Payment unavailable", error instanceof Error ? error.message : "Please try again."); } };
  const submitReview = async () => { try { await review.mutateAsync({ requestId, rating, comment: comment.trim() || undefined }); } catch (error) { showMessage("Review not saved", error instanceof Error ? error.message : "Please try again."); } };

  return (
    <ScreenContainer className="px-5">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.nav}><IconButton icon="arrow-back" label="Back" onPress={() => router.back()} /><Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/chat/[id]", params: { id: String(requestId) } })} style={({ pressed }) => [styles.chatTop, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.65 : 1 }]}><MaterialIcons name="chat-bubble-outline" size={17} color={colors.primary} /><Text style={[styles.chatTopText, { color: colors.foreground }]}>Chat</Text></Pressable></View>
        <ScreenTitle eyebrow={`Request #${requestId}`} title={detail.category.name} subtitle={`Created ${shortDate(detail.request.createdAt)} · ${detail.request.urgency} priority`} />
        <Card style={styles.statusCard}><View style={styles.statusHeader}><View><Text style={[styles.statusLabel, { color: colors.muted }]}>CURRENT STATUS</Text><Text style={[styles.statusValue, { color: colors.foreground }]}>{STATUS_LABELS[status]}</Text></View><Chip label={status.replaceAll("_", " ")} tone={status === "CANCELLED" || status === "DISPUTED" ? "danger" : status === "COMPLETED" || status === "PAID" || status === "REVIEWED" ? "success" : "primary"} /></View><View style={styles.timeline}>{["PENDING", "TECHNICIAN_ASSIGNED", "ON_THE_WAY", "IN_PROGRESS", "COMPLETED", "PAID"].map((step, index) => <View key={step} style={styles.timelinePart}><View style={[styles.timelineDot, { backgroundColor: progress >= [0, 1, 3, 5, 6, 7][index] ? colors.primary : colors.border }]} />{index < 5 ? <View style={[styles.timelineLine, { backgroundColor: progress > [0, 1, 3, 5, 6][index] ? colors.primary : colors.border }]} /> : null}</View>)}</View><View style={styles.timelineLabels}><Text style={[styles.timelineText, { color: colors.muted }]}>Requested</Text><Text style={[styles.timelineText, { color: colors.muted }]}>Travel</Text><Text style={[styles.timelineText, { color: colors.muted }]}>Paid</Text></View></Card>
        <Card><Text style={[styles.description, { color: colors.foreground }]}>{detail.request.description}</Text>{detail.request.notes ? <Text style={[styles.notes, { color: colors.muted }]}>Note: {detail.request.notes}</Text> : null}<View style={[styles.priceRow, { borderTopColor: colors.border }]}><View><Text style={[styles.priceLabel, { color: colors.muted }]}>ESTIMATE</Text><Text style={[styles.price, { color: colors.foreground }]}>{formatJod(detail.request.estimatedMin)} – {formatJod(detail.request.estimatedMax)}</Text></View>{detail.request.finalPrice ? <View style={styles.finalPrice}><Text style={[styles.priceLabel, { color: colors.muted }]}>FINAL</Text><Text style={[styles.price, { color: colors.foreground }]}>{formatJod(detail.request.finalPrice)}</Text></View> : null}</View></Card>
        {status === "PENDING" && isCustomer ? <View style={styles.matchSection}><ScreenTitle eyebrow="Choose your specialist" title="Qualified nearby technicians" subtitle="Ranked by distance, rating, availability, and completed work—not rating alone." />{matches.isLoading ? <Card><ActivityIndicator color={colors.primary} /></Card> : matches.data?.length ? matches.data.map(({ match, profile, user: technician }) => <Card key={match.id}><View style={styles.techTop}><View style={[styles.avatar, { backgroundColor: `${colors.primary}18` }]}><Text style={[styles.avatarText, { color: colors.primary }]}>{(technician.name ?? "T").slice(0, 1)}</Text></View><View style={styles.techCopy}><View style={styles.techNameRow}><Text style={[styles.techName, { color: colors.foreground }]}>{technician.name ?? "Verified technician"}</Text><Chip label="VERIFIED" tone="success" /></View><Text style={[styles.techMeta, { color: colors.muted }]}>★ {profile.rating.toFixed(1)} · {profile.completedJobs} jobs · {match.distanceKm.toFixed(1)} km away</Text></View></View><View style={[styles.techStats, { borderTopColor: colors.border }]}><Text style={[styles.techStat, { color: colors.foreground }]}>{match.etaMinutes} min ETA</Text><Text style={[styles.techStat, { color: colors.foreground }]}>{formatJod(match.estimatedPrice)} est.</Text></View><PrimaryButton label="Choose this technician" icon="person-add-alt-1" onPress={() => void choose.mutateAsync({ requestId, technicianId: match.technicianId })} loading={choose.isPending} /></Card>) : <Card><Text style={{ color: colors.muted, textAlign: "center", lineHeight: 20 }}>No verified technician is currently within service range. FixNow will expand the search and notify you when availability changes.</Text></Card>}</View> : null}
        {detail.technician && status !== "PENDING" ? <Card><View style={styles.techTop}><View style={[styles.avatar, { backgroundColor: `${colors.primary}18` }]}><Text style={[styles.avatarText, { color: colors.primary }]}>{(detail.technicianUser?.name ?? "T").slice(0, 1)}</Text></View><View style={styles.techCopy}><View style={styles.techNameRow}><Text style={[styles.techName, { color: colors.foreground }]}>{detail.technicianUser?.name ?? "Your technician"}</Text><Chip label={detail.technician.verificationStatus.toUpperCase()} tone="success" /></View><Text style={[styles.techMeta, { color: colors.muted }]}>★ {detail.technician.rating.toFixed(1)} · {detail.technician.completedJobs} completed jobs</Text></View></View><View style={styles.actionPair}><Pressable accessibilityRole="button" onPress={launchMap} style={({ pressed }) => [styles.secondaryAction, { borderColor: colors.border, opacity: pressed ? 0.65 : 1 }]}><MaterialIcons name="map" size={18} color={colors.primary} /><Text style={[styles.secondaryActionText, { color: colors.foreground }]}>Location</Text></Pressable><Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/chat/[id]", params: { id: String(requestId) } })} style={({ pressed }) => [styles.secondaryAction, { borderColor: colors.border, opacity: pressed ? 0.65 : 1 }]}><MaterialIcons name="chat-bubble-outline" size={18} color={colors.primary} /><Text style={[styles.secondaryActionText, { color: colors.foreground }]}>Message</Text></Pressable></View></Card> : null}
        {isCustomer && ["TECHNICIAN_ACCEPTED", "ON_THE_WAY", "ARRIVED", "IN_PROGRESS"].includes(status) ? <Card><View style={styles.trackingTop}><View style={[styles.pulse, { backgroundColor: colors.success }]} /><View><Text style={[styles.trackingTitle, { color: colors.foreground }]}>Live location sharing is active</Text><Text style={[styles.trackingBody, { color: colors.muted }]}>Updates refresh while the technician keeps FixNow open during the job.</Text></View></View><View style={[styles.mapPreview, { backgroundColor: `${colors.primary}0F` }]}><MaterialIcons name="location-on" size={31} color={colors.primary} /><View style={[styles.route, { backgroundColor: colors.primary }]} /><MaterialIcons name="directions-car" size={25} color={colors.foreground} /></View><PrimaryButton label="Open directions" icon="navigation" tone="light" onPress={launchMap} /></Card> : null}
        {isAssignedTech && status === "TECHNICIAN_ASSIGNED" ? <Card><Text style={[styles.roleTitle, { color: colors.foreground }]}>You were selected for this job.</Text><Text style={[styles.roleBody, { color: colors.muted }]}>Accept only if you can complete the task safely and within the estimated arrival window.</Text><PrimaryButton label="Accept this job" icon="check-circle" onPress={() => void accept.mutateAsync({ requestId })} loading={accept.isPending} /></Card> : null}
        {isAssignedTech && nextStatus ? <Card><Text style={[styles.roleTitle, { color: colors.foreground }]}>Update the customer</Text><Text style={[styles.roleBody, { color: colors.muted }]}>The status update is recorded in the request and sends the customer a notification.</Text>{nextStatus === "COMPLETED" ? <TextInput value={finalPrice} onChangeText={setFinalPrice} keyboardType="numeric" placeholder="Agreed final price (JOD)" placeholderTextColor={colors.muted} style={[styles.priceInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]} /> : null}<PrimaryButton label={`Mark as ${STATUS_LABELS[nextStatus]}`} icon="arrow-forward" onPress={() => void moveJob()} loading={transition.isPending} /></Card> : null}
        {isCustomer && status === "COMPLETED" ? <Card><Text style={[styles.roleTitle, { color: colors.foreground }]}>Confirm payment</Text><Text style={[styles.roleBody, { color: colors.muted }]}>Cash payment is active for this MVP. Card and wallet payment records are reserved for the configured processor integration.</Text>{payment.isSuccess ? <PrimaryButton label="Confirm cash paid" icon="payments" onPress={() => void confirmCash.mutateAsync({ requestId })} loading={confirmCash.isPending} /> : <PrimaryButton label={`Pay ${formatJod(detail.request.finalPrice)} by cash`} icon="payments" onPress={() => void createCashPayment()} loading={payment.isPending} />}</Card> : null}
        {isCustomer && status === "PAID" ? <Card><Text style={[styles.roleTitle, { color: colors.foreground }]}>How did it go?</Text><View style={styles.ratingRow}>{[1, 2, 3, 4, 5].map((star) => <Pressable key={star} accessibilityLabel={`Rate ${star} stars`} onPress={() => setRating(star)}><MaterialIcons name={star <= rating ? "star" : "star-border"} size={31} color={star <= rating ? colors.warning : colors.border} /></Pressable>)}</View><TextInput value={comment} onChangeText={setComment} placeholder="Share a short review (optional)" placeholderTextColor={colors.muted} multiline style={[styles.reviewInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]} /><PrimaryButton label="Publish review" icon="rate-review" onPress={() => void submitReview()} loading={review.isPending} /></Card> : null}
        {isCustomer && ["PENDING", "TECHNICIAN_ASSIGNED", "TECHNICIAN_ACCEPTED", "ON_THE_WAY", "ARRIVED", "IN_PROGRESS"].includes(status) ? <Pressable accessibilityRole="button" disabled={pendingActions} onPress={() => void cancelRequest()} style={({ pressed }) => [styles.cancel, { borderColor: `${colors.error}65`, opacity: pressed || pendingActions ? 0.55 : 1 }]}><MaterialIcons name="cancel" size={18} color={colors.error} /><Text style={[styles.cancelText, { color: colors.error }]}>Cancel this request</Text></Pressable> : null}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: 12, paddingBottom: 35, gap: 17 },
  guest: { paddingTop: 12, alignItems: "center", gap: 18 },
  errorTitle: { fontSize: 20, lineHeight: 26, fontWeight: "800", textAlign: "center", marginTop: 15 },
  nav: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  chatTop: { minHeight: 40, borderRadius: 13, borderWidth: 1, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 6 },
  chatTopText: { fontSize: 12, lineHeight: 16, fontWeight: "800" },
  statusCard: { gap: 13 },
  statusHeader: { flexDirection: "row", justifyContent: "space-between", gap: 8, alignItems: "flex-start" },
  statusLabel: { fontSize: 10, lineHeight: 14, fontWeight: "800", letterSpacing: 0.8 },
  statusValue: { fontSize: 18, lineHeight: 24, fontWeight: "800", marginTop: 1 },
  timeline: { flexDirection: "row", alignItems: "center", paddingHorizontal: 4 },
  timelinePart: { flex: 1, flexDirection: "row", alignItems: "center" },
  timelineDot: { width: 10, height: 10, borderRadius: 5 },
  timelineLine: { flex: 1, height: 2 },
  timelineLabels: { flexDirection: "row", justifyContent: "space-between" },
  timelineText: { fontSize: 10, lineHeight: 14, fontWeight: "600" },
  description: { fontSize: 14, lineHeight: 21, fontWeight: "600" },
  notes: { fontSize: 12, lineHeight: 18 },
  priceRow: { borderTopWidth: 1, paddingTop: 10, flexDirection: "row", justifyContent: "space-between" },
  priceLabel: { fontSize: 10, lineHeight: 14, fontWeight: "800", letterSpacing: 0.6 },
  price: { fontSize: 14, lineHeight: 19, fontWeight: "800", marginTop: 2 },
  finalPrice: { alignItems: "flex-end" },
  matchSection: { gap: 13 },
  techTop: { flexDirection: "row", alignItems: "center", gap: 11 },
  avatar: { width: 46, height: 46, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 18, fontWeight: "800" },
  techCopy: { flex: 1, gap: 3 },
  techNameRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  techName: { fontSize: 15, lineHeight: 20, fontWeight: "800" },
  techMeta: { fontSize: 11, lineHeight: 16 },
  techStats: { borderTopWidth: 1, paddingTop: 9, flexDirection: "row", justifyContent: "space-between" },
  techStat: { fontSize: 12, lineHeight: 17, fontWeight: "800" },
  actionPair: { flexDirection: "row", gap: 9 },
  secondaryAction: { flex: 1, minHeight: 43, borderWidth: 1, borderRadius: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  secondaryActionText: { fontSize: 12, lineHeight: 16, fontWeight: "800" },
  trackingTop: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  pulse: { height: 9, width: 9, borderRadius: 5, marginTop: 5 },
  trackingTitle: { fontSize: 14, lineHeight: 19, fontWeight: "800" },
  trackingBody: { fontSize: 11, lineHeight: 16, marginTop: 1 },
  mapPreview: { height: 106, borderRadius: 17, flexDirection: "row", alignItems: "center", justifyContent: "space-evenly" },
  route: { width: 94, height: 3, borderRadius: 2, transform: [{ rotate: "-12deg" }] },
  roleTitle: { fontSize: 15, lineHeight: 20, fontWeight: "800" },
  roleBody: { fontSize: 12, lineHeight: 18 },
  priceInput: { minHeight: 47, borderWidth: 1, borderRadius: 13, paddingHorizontal: 12, fontSize: 13, lineHeight: 18 },
  ratingRow: { flexDirection: "row", gap: 4 },
  reviewInput: { minHeight: 80, borderRadius: 13, borderWidth: 1, padding: 10, fontSize: 13, lineHeight: 18, textAlignVertical: "top" },
  cancel: { minHeight: 45, borderWidth: 1, borderRadius: 14, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7 },
  cancelText: { fontSize: 13, lineHeight: 17, fontWeight: "800" },
});
