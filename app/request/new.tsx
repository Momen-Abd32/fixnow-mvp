import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Card, Chip, FieldLabel, IconButton, LoginRequired, PrimaryButton, ScreenTitle } from "@/components/fixnow-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { useMediaUpload, type UploadedMedia } from "@/hooks/use-media-upload";
import { trpc } from "@/lib/trpc";
import { DEFAULT_CATEGORIES, type Urgency } from "@/shared/types";

export default function NewRequestScreen() {
  const colors = useColors();
  const params = useLocalSearchParams<{ serviceId?: string; description?: string; suggestedCategory?: string; urgency?: Urgency }>();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { data: serverCategories } = trpc.catalog.list.useQuery();
  const categories = serverCategories?.length ? serverCategories : DEFAULT_CATEGORIES;
  const suggestedServiceId = DEFAULT_CATEGORIES.find((category) => category.name === params.suggestedCategory)?.id;
  const initialServiceId = Number(params.serviceId) || suggestedServiceId || categories[0]?.id || 1;
  const [serviceId, setServiceId] = useState(initialServiceId);
  const [description, setDescription] = useState(params.description ?? "");
  const [notes, setNotes] = useState("");
  const [urgency, setUrgency] = useState<Urgency>(params.urgency === "priority" || params.urgency === "emergency" ? params.urgency : "standard");
  const [address, setAddress] = useState("");
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [media, setMedia] = useState<UploadedMedia[]>([]);
  const { choosePhotos, uploading } = useMediaUpload();
  const createRequest = trpc.requests.create.useMutation();
  const selected = useMemo(() => categories.find((item) => item.id === serviceId), [categories, serviceId]);

  const showMessage = (title: string, message: string) => {
    if (typeof window !== "undefined") window.alert(`${title}: ${message}`); else Alert.alert(title, message);
  };
  const getLocation = async () => {
    setLocating(true);
    try {
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) throw new Error("Turn on Location Services to match a nearby specialist.");
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") throw new Error("Location permission is needed to match nearby specialists. You can allow it in Settings and try again.");
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const location = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      setCoordinates(location);
      try {
        const places = await Location.reverseGeocodeAsync(location);
        const place = places[0];
        const line = [place?.name, place?.street, place?.streetNumber, place?.district, place?.city].filter(Boolean).join(", ");
        setAddress(line || `Current location (${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)})`);
      } catch { setAddress(`Current location (${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)})`); }
    } catch (error) { showMessage("Location unavailable", error instanceof Error ? error.message : "Unable to get your location."); }
    finally { setLocating(false); }
  };
  const attachEvidence = async () => {
    const uploaded = await choosePhotos("request", 3);
    if (uploaded.length) setMedia((existing) => [...existing, ...uploaded].slice(0, 5));
  };
  const submit = async () => {
    if (!user || !isAuthenticated) { router.push("/auth"); return; }
    if (description.trim().length < 12) { showMessage("Add a few details", "Please describe the issue in at least 12 characters so technicians can prepare."); return; }
    if (!coordinates || address.trim().length < 5) { showMessage("Location needed", "Use your current location before matching a nearby specialist."); return; }
    try {
      const result = await createRequest.mutateAsync({ serviceId, description: description.trim(), notes: notes.trim() || undefined, media, address: address.trim(), ...coordinates, urgency });
      router.replace({ pathname: "/request/[id]", params: { id: String(result.requestId) } });
    } catch (error) { showMessage("Request not created", error instanceof Error ? error.message : "Please try again."); }
  };

  if (authLoading) return <ScreenContainer className="items-center justify-center"><ActivityIndicator color={colors.primary} /></ScreenContainer>;
  if (!isAuthenticated) return <ScreenContainer className="p-5"><View style={styles.guestTop}><IconButton icon="arrow-back" label="Back" onPress={() => router.back()} /><LoginRequired body="Sign in before you share a home address or create a service request." /></View></ScreenContainer>;
  return (
    <ScreenContainer className="px-5">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.nav}><IconButton icon="arrow-back" label="Back" onPress={() => router.back()} /><Chip label="SECURE REQUEST" tone="success" /></View>
        <ScreenTitle eyebrow="New service request" title="Tell us what needs fixing." subtitle="You will see qualified nearby technicians before anyone is assigned." />
        <View style={styles.group}><FieldLabel>Service category</FieldLabel><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>{categories.map((category) => <Pressable key={category.id} accessibilityRole="button" onPress={() => setServiceId(category.id)} style={({ pressed }) => [styles.categoryChoice, { backgroundColor: serviceId === category.id ? colors.primary : colors.surface, borderColor: serviceId === category.id ? colors.primary : colors.border, opacity: pressed ? 0.72 : 1 }]}><MaterialIcons name={category.icon as any} size={17} color={serviceId === category.id ? "#FFFFFF" : colors.primary} /><Text style={[styles.categoryText, { color: serviceId === category.id ? "#FFFFFF" : colors.foreground }]}>{category.name}</Text></Pressable>)}</ScrollView></View>
        <Card><View style={styles.cardTitle}><MaterialIcons name="description" size={19} color={colors.primary} /><Text style={[styles.cardTitleText, { color: colors.foreground }]}>{selected?.name ?? "Service request"}</Text></View><FieldLabel>What is happening?</FieldLabel><TextInput accessibilityLabel="Problem description" multiline value={description} onChangeText={setDescription} placeholder="For example: the AC runs but it has stopped cooling the living room." placeholderTextColor={colors.muted} style={[styles.textArea, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]} textAlignVertical="top" maxLength={1600} /><Text style={[styles.counter, { color: colors.muted }]}>{description.length}/1600</Text><Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/diagnosis", params: { description } })} style={({ pressed }) => [styles.diagnosisLink, { opacity: pressed ? 0.65 : 1 }]}><MaterialIcons name="auto-awesome" size={16} color={colors.primary} /><Text style={[styles.diagnosisText, { color: colors.primary }]}>Get an AI preliminary assessment first</Text></Pressable></Card>
        <Card><View style={styles.cardTitle}><MaterialIcons name="location-on" size={19} color={colors.primary} /><Text style={[styles.cardTitleText, { color: colors.foreground }]}>Service location</Text></View><Text style={[styles.locationText, { color: address ? colors.foreground : colors.muted }]}>{address || "Use your current location for accurate matching."}</Text><PrimaryButton label={coordinates ? "Location confirmed" : "Use current location"} icon={coordinates ? "check-circle" : "my-location"} tone={coordinates ? "light" : "primary"} onPress={() => void getLocation()} loading={locating} /></Card>
        <Card><View style={styles.cardTitle}><MaterialIcons name="attach-file" size={19} color={colors.primary} /><Text style={[styles.cardTitleText, { color: colors.foreground }]}>Photos or short video</Text></View><Text style={[styles.helper, { color: colors.muted }]}>Optional, but evidence helps a specialist understand the issue before arrival. Up to 5 files, 5 MB each.</Text><View style={styles.attachments}>{media.map((item, index) => <View key={item.key} style={[styles.attachment, { backgroundColor: `${colors.primary}12` }]}><MaterialIcons name={item.mimeType === "video/mp4" ? "play-circle-outline" : "image"} size={17} color={colors.primary} /><Text style={[styles.attachmentText, { color: colors.foreground }]}>File {index + 1}</Text><Pressable onPress={() => setMedia((current) => current.filter((entry) => entry.key !== item.key))} accessibilityLabel={`Remove file ${index + 1}`}><MaterialIcons name="close" size={17} color={colors.muted} /></Pressable></View>)}</View><Pressable accessibilityRole="button" onPress={() => void attachEvidence()} disabled={uploading || media.length >= 5} style={({ pressed }) => [styles.upload, { borderColor: colors.border, opacity: pressed || uploading || media.length >= 5 ? 0.6 : 1 }]}>{uploading ? <ActivityIndicator color={colors.primary} /> : <MaterialIcons name="add-photo-alternate" size={20} color={colors.primary} />}<Text style={[styles.uploadText, { color: colors.primary }]}>{uploading ? "Uploading securely…" : "Add evidence"}</Text></Pressable></Card>
        <View style={styles.group}><FieldLabel>How urgent is it?</FieldLabel><View style={styles.urgencyRow}>{(["standard", "priority", "emergency"] as Urgency[]).map((level) => <Pressable key={level} accessibilityRole="button" onPress={() => setUrgency(level)} style={({ pressed }) => [styles.urgency, { backgroundColor: urgency === level ? (level === "emergency" ? colors.error : colors.primary) : colors.surface, borderColor: urgency === level ? (level === "emergency" ? colors.error : colors.primary) : colors.border, opacity: pressed ? 0.7 : 1 }]}><Text style={[styles.urgencyText, { color: urgency === level ? "#FFFFFF" : colors.foreground }]}>{level[0].toUpperCase() + level.slice(1)}</Text></Pressable>)}</View><Text style={[styles.helper, { color: colors.muted }]}>Choose Emergency only for urgent service needs. For fire, gas, shocks or immediate danger, contact emergency services first.</Text></View>
        <View style={styles.group}><FieldLabel>Additional notes</FieldLabel><TextInput accessibilityLabel="Additional notes" value={notes} onChangeText={setNotes} placeholder="Access instructions, preferred time, or anything helpful." placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]} maxLength={1000} /></View>
        <PrimaryButton label="Find qualified technicians" icon="search" onPress={() => void submit()} loading={createRequest.isPending} disabled={uploading} />
        <Text style={[styles.disclaimer, { color: colors.muted }]}>By continuing, you share the information above only with FixNow and selected service providers for this request.</Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: 12, paddingBottom: 34, gap: 18 },
  guestTop: { paddingTop: 12, gap: 28 },
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  group: { gap: 8 },
  categoryScroll: { gap: 8, paddingRight: 16 },
  categoryChoice: { borderWidth: 1, minHeight: 39, borderRadius: 13, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 6 },
  categoryText: { fontSize: 12, lineHeight: 16, fontWeight: "800" },
  cardTitle: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 1 },
  cardTitleText: { fontSize: 15, lineHeight: 20, fontWeight: "800" },
  textArea: { minHeight: 118, padding: 12, borderWidth: 1, borderRadius: 14, fontSize: 14, lineHeight: 20 },
  counter: { alignSelf: "flex-end", fontSize: 10, lineHeight: 14, marginTop: -5 },
  diagnosisLink: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", marginTop: 2 },
  diagnosisText: { fontSize: 12, lineHeight: 17, fontWeight: "800" },
  locationText: { fontSize: 13, lineHeight: 18, minHeight: 18 },
  helper: { fontSize: 11, lineHeight: 16 },
  attachments: { gap: 6 },
  attachment: { flexDirection: "row", alignItems: "center", minHeight: 34, paddingHorizontal: 10, borderRadius: 10, gap: 7 },
  attachmentText: { flex: 1, fontSize: 12, lineHeight: 16, fontWeight: "700" },
  upload: { minHeight: 46, borderWidth: 1, borderStyle: "dashed", borderRadius: 14, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  uploadText: { fontSize: 13, lineHeight: 17, fontWeight: "800" },
  urgencyRow: { flexDirection: "row", gap: 8 },
  urgency: { flex: 1, minHeight: 42, borderRadius: 13, borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  urgencyText: { fontSize: 11, lineHeight: 15, fontWeight: "800" },
  input: { minHeight: 48, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1, fontSize: 13, lineHeight: 18 },
  disclaimer: { fontSize: 10, lineHeight: 15, textAlign: "center", paddingHorizontal: 14 },
});
