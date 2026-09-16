import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { Card, Chip, EmptyState, FieldLabel, FixNowMark, LoginRequired, PrimaryButton, ScreenTitle, formatJod } from "@/components/fixnow-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { useMediaUpload, type UploadedMedia } from "@/hooks/use-media-upload";
import { trpc } from "@/lib/trpc";
import { DEFAULT_CATEGORIES, STATUS_LABELS, type RequestStatus } from "@/shared/types";

export default function TechnicianScreen() {
  const colors = useColors();
  const { isAuthenticated, loading } = useAuth();
  const profile = trpc.technicians.myProfile.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const categories = trpc.catalog.list.useQuery();
  const jobs = trpc.technicians.jobs.useQuery(undefined, { enabled: Boolean(profile.data), refetchInterval: 12_000, retry: false });
  const register = trpc.technicians.register.useMutation({ onSuccess: () => void profile.refetch() });
  const availability = trpc.technicians.availability.useMutation({ onSuccess: () => void profile.refetch() });
  const updateLocation = trpc.technicians.updateLocation.useMutation();
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [radius, setRadius] = useState("10");
  const [rate, setRate] = useState("22");
  const [bio, setBio] = useState("");
  const [documents, setDocuments] = useState<UploadedMedia[]>([]);
  const { choosePhotos, uploading } = useMediaUpload();
  const serviceList = useMemo(() => categories.data?.length ? categories.data : DEFAULT_CATEGORIES, [categories.data]);
  const notify = (title: string, body: string) => typeof window !== "undefined" ? window.alert(`${title}: ${body}`) : Alert.alert(title, body);
  const toggleService = (serviceId: number) => setSelectedServiceIds((current) => current.includes(serviceId) ? current.filter((id) => id !== serviceId) : [...current, serviceId]);
  const uploadDocument = async () => { const added = await choosePhotos("verification", 2); if (added.length) setDocuments((current) => [...current, ...added].slice(0, 5)); };
  const submitRegistration = async () => {
    const serviceIds = selectedServiceIds.length ? selectedServiceIds : serviceList.slice(0, 1).map((item) => item.id);
    const serviceRadiusKm = Number(radius); const hourlyRate = Number(rate);
    if (!Number.isInteger(serviceRadiusKm) || serviceRadiusKm < 1 || serviceRadiusKm > 50) { notify("Check your service radius", "Choose a whole number from 1 to 50 km."); return; }
    if (!Number.isInteger(hourlyRate) || hourlyRate < 5) { notify("Check your hourly rate", "Enter a valid hourly amount in JOD."); return; }
    try { await register.mutateAsync({ serviceIds, serviceRadiusKm, hourlyRate, bio: bio.trim() || undefined, documents: documents.map(({ key, url }, index) => ({ key, url, name: `Verification evidence ${index + 1}` })) }); }
    catch (error) { notify("Profile not submitted", error instanceof Error ? error.message : "Please try again."); }
  };
  const shareLocation = async () => {
    try { const permission = await Location.requestForegroundPermissionsAsync(); if (permission.status !== "granted") throw new Error("Allow foreground location to share your current job position."); const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }); await updateLocation.mutateAsync({ latitude: position.coords.latitude, longitude: position.coords.longitude }); notify("Location updated", "Your current location is available for relevant job tracking while FixNow remains open."); }
    catch (error) { notify("Location not shared", error instanceof Error ? error.message : "Please try again."); }
  };
  if (loading) return <ScreenContainer className="items-center justify-center"><ActivityIndicator color={colors.primary} /></ScreenContainer>;
  if (!isAuthenticated) return <ScreenContainer className="p-5"><View style={styles.guest}><FixNowMark /><ScreenTitle eyebrow="For specialists" title="Build a trusted local business." subtitle="Sign in to submit verification, set availability, and manage assigned work." /><LoginRequired body="Sign in securely to create a technician profile and receive service requests." /></View></ScreenContainer>;
  if (profile.isLoading) return <ScreenContainer className="items-center justify-center"><ActivityIndicator color={colors.primary} /></ScreenContainer>;
  if (!profile.data) return <ScreenContainer className="px-5"><ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"><View style={styles.nav}><FixNowMark compact /><Chip label="TECHNICIAN JOIN" tone="primary" /></View><ScreenTitle eyebrow="Offer your expertise" title="Create your professional profile." subtitle="Verification protects customers and helps qualified technicians stand out." /><Card><FieldLabel>Services you offer</FieldLabel><View style={styles.serviceGrid}>{serviceList.map((item) => <Pressable key={item.id} accessibilityRole="button" onPress={() => toggleService(item.id)} style={({ pressed }) => [styles.serviceChoice, { backgroundColor: selectedServiceIds.includes(item.id) ? `${colors.primary}16` : colors.background, borderColor: selectedServiceIds.includes(item.id) ? colors.primary : colors.border, opacity: pressed ? 0.65 : 1 }]}><MaterialIcons name={selectedServiceIds.includes(item.id) ? "check-circle" : "add-circle-outline"} size={17} color={colors.primary} /><Text style={[styles.serviceText, { color: colors.foreground }]}>{item.name}</Text></Pressable>)}</View></Card><Card><FieldLabel>Service radius (km)</FieldLabel><TextInput value={radius} onChangeText={setRadius} keyboardType="numeric" maxLength={2} placeholder="10" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]} /><FieldLabel>Typical hourly rate (JOD)</FieldLabel><TextInput value={rate} onChangeText={setRate} keyboardType="numeric" maxLength={4} placeholder="22" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]} /><FieldLabel>Professional introduction</FieldLabel><TextInput value={bio} onChangeText={setBio} multiline maxLength={600} placeholder="Briefly describe your experience and approach." placeholderTextColor={colors.muted} style={[styles.bio, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]} textAlignVertical="top" /></Card><Card><View style={styles.cardHead}><MaterialIcons name="verified-user" size={20} color={colors.primary} /><Text style={[styles.cardTitle, { color: colors.foreground }]}>Verification evidence</Text></View><Text style={[styles.helper, { color: colors.muted }]}>Add a clear image of a licence, business registration, or relevant professional credential. It is reviewed before you can receive new jobs.</Text>{documents.map((document, index) => <View key={document.key} style={[styles.document, { backgroundColor: `${colors.primary}12` }]}><MaterialIcons name="description" size={17} color={colors.primary} /><Text style={[styles.documentText, { color: colors.foreground }]}>Evidence {index + 1}</Text><Pressable accessibilityLabel={`Remove evidence ${index + 1}`} onPress={() => setDocuments((current) => current.filter((item) => item.key !== document.key))}><MaterialIcons name="close" size={17} color={colors.muted} /></Pressable></View>)}<PrimaryButton label={documents.length ? "Add another document" : "Upload verification evidence"} icon="upload-file" tone="light" onPress={() => void uploadDocument()} loading={uploading} /></Card><PrimaryButton label="Submit technician profile" icon="send" onPress={() => void submitRegistration()} loading={register.isPending} disabled={uploading} /><Text style={[styles.finePrint, { color: colors.muted }]}>Submitting creates a pending technician profile. A platform administrator must verify your documents before you can turn on availability.</Text></ScrollView></ScreenContainer>;
  const verification = profile.data.verificationStatus;
  const active = profile.data.availability;
  return <ScreenContainer className="px-5"><ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}><View style={styles.nav}><FixNowMark compact /><Chip label={verification.toUpperCase()} tone={verification === "verified" ? "success" : verification === "rejected" ? "danger" : "warning"} /></View><ScreenTitle eyebrow="Technician workspace" title={active ? "You are available." : "You are offline."} subtitle={verification === "verified" ? "Control when you receive new service requests." : "Your verification must be approved before you receive new requests."} /><Card><View style={styles.availabilityRow}><View style={styles.availabilityCopy}><Text style={[styles.availabilityTitle, { color: colors.foreground }]}>Accept new jobs</Text><Text style={[styles.availabilityBody, { color: colors.muted }]}>{active ? "Customers can find you when you match their service and radius." : "Switch on when you are ready to take work."}</Text></View><Switch value={active} disabled={verification !== "verified" || availability.isPending} onValueChange={(value) => void availability.mutateAsync({ availability: value })} trackColor={{ false: colors.border, true: `${colors.primary}80` }} thumbColor={active ? colors.primary : colors.muted} /></View><View style={[styles.divider, { backgroundColor: colors.border }]} /><View style={styles.workingDetails}><Text style={[styles.detail, { color: colors.foreground }]}>{profile.data.serviceRadiusKm} km service area</Text><Text style={[styles.detail, { color: colors.foreground }]}>{formatJod(profile.data.hourlyRate)}/hour</Text><Text style={[styles.detail, { color: colors.foreground }]}>★ {profile.data.rating.toFixed(1)} ({profile.data.completedJobs} jobs)</Text></View><PrimaryButton label="Update current location" icon="my-location" tone="light" onPress={() => void shareLocation()} loading={updateLocation.isPending} /></Card><ScreenTitle eyebrow="Assigned work" title="Your job queue" subtitle="Accepted and selected requests refresh while FixNow is open." />{jobs.isLoading ? <Card><ActivityIndicator color={colors.primary} /></Card> : jobs.data?.length ? jobs.data.map((job) => { const status = job.request.status as RequestStatus; return <Pressable key={job.request.id} accessibilityRole="button" onPress={() => router.push({ pathname: "/request/[id]", params: { id: String(job.request.id) } })} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}><Card><View style={styles.jobHead}><View style={[styles.categoryIcon, { backgroundColor: `${colors.primary}12` }]}><MaterialIcons name={job.category.icon as any} size={21} color={colors.primary} /></View><View style={styles.jobCopy}><Text style={[styles.jobName, { color: colors.foreground }]}>{job.category.name}</Text><Text style={[styles.jobAddress, { color: colors.muted }]} numberOfLines={1}>{job.request.address}</Text></View><Chip label={STATUS_LABELS[status]} tone="primary" /></View><Text style={[styles.jobDescription, { color: colors.foreground }]} numberOfLines={2}>{job.request.description}</Text></Card></Pressable>; }) : <EmptyState icon="inbox" title="Your queue is clear" body="Selected requests will appear here. Stay verified, online, and share your current location to match customers." />}</ScrollView></ScreenContainer>;
}

const styles = StyleSheet.create({
  scroll: { paddingTop: 12, paddingBottom: 34, gap: 18 },
  guest: { paddingTop: 12, gap: 26 },
  nav: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  serviceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  serviceChoice: { minHeight: 38, borderRadius: 12, borderWidth: 1, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 5 },
  serviceText: { fontSize: 11, lineHeight: 15, fontWeight: "700" },
  input: { minHeight: 47, borderRadius: 13, borderWidth: 1, paddingHorizontal: 12, fontSize: 13, lineHeight: 18, marginBottom: 5 },
  bio: { minHeight: 84, borderRadius: 13, borderWidth: 1, padding: 11, fontSize: 13, lineHeight: 18 },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 7 },
  cardTitle: { fontSize: 15, lineHeight: 20, fontWeight: "800" },
  helper: { fontSize: 11, lineHeight: 16 },
  document: { minHeight: 35, flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 10, borderRadius: 10 },
  documentText: { flex: 1, fontSize: 12, lineHeight: 16, fontWeight: "700" },
  finePrint: { fontSize: 10, lineHeight: 15, textAlign: "center", paddingHorizontal: 16 },
  availabilityRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  availabilityCopy: { flex: 1, gap: 3 },
  availabilityTitle: { fontSize: 15, lineHeight: 20, fontWeight: "800" },
  availabilityBody: { fontSize: 12, lineHeight: 17 },
  divider: { height: 1, marginVertical: 3 },
  workingDetails: { flexDirection: "row", gap: 7, flexWrap: "wrap" },
  detail: { fontSize: 11, lineHeight: 16, fontWeight: "700" },
  jobHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  categoryIcon: { width: 43, height: 43, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  jobCopy: { flex: 1, gap: 2 },
  jobName: { fontSize: 14, lineHeight: 19, fontWeight: "800" },
  jobAddress: { fontSize: 10, lineHeight: 15 },
  jobDescription: { fontSize: 12, lineHeight: 18 },
});
