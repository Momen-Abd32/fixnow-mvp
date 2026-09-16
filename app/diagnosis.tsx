import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Card, Chip, FieldLabel, IconButton, LoginRequired, PrimaryButton, ScreenTitle, formatJod } from "@/components/fixnow-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { useMediaUpload, type UploadedMedia } from "@/hooks/use-media-upload";
import { trpc } from "@/lib/trpc";

type Diagnosis = { possibleProblem: string; recommendedCategory: string; urgency: "standard" | "priority" | "emergency"; estimatedMin: number; estimatedMax: number; safeSteps: string[]; disclaimer: string };

export default function DiagnosisScreen() {
  const colors = useColors();
  const params = useLocalSearchParams<{ description?: string }>();
  const { isAuthenticated } = useAuth();
  const [description, setDescription] = useState(params.description ?? "");
  const [media, setMedia] = useState<UploadedMedia[]>([]);
  const [result, setResult] = useState<Diagnosis | null>(null);
  const { choosePhotos, uploading } = useMediaUpload();
  const analysis = trpc.diagnosis.analyze.useMutation();
  const alertUser = (title: string, message: string) => typeof window !== "undefined" ? window.alert(`${title}: ${message}`) : Alert.alert(title, message);
  const analyze = async () => {
    if (!isAuthenticated) { router.push("/auth"); return; }
    if (description.trim().length < 12) { alertUser("Add more detail", "Describe the issue in at least 12 characters for a useful preliminary assessment."); return; }
    try { setResult((await analysis.mutateAsync({ description: description.trim(), imageUrl: media[0]?.url })) as Diagnosis); }
    catch (error) { alertUser("Assessment unavailable", error instanceof Error ? error.message : "Please try again."); }
  };
  const addPhoto = async () => { const uploads = await choosePhotos("request", 1); if (uploads.length) setMedia(uploads); };
  if (!isAuthenticated) return <ScreenContainer className="p-5"><View style={styles.guest}><IconButton icon="arrow-back" label="Back" onPress={() => router.back()} /><LoginRequired body="Sign in before sharing problem details or images with the secure AI diagnosis service." /></View></ScreenContainer>;
  return (
    <ScreenContainer className="px-5">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.nav}><IconButton icon="arrow-back" label="Back" onPress={() => router.back()} /><Chip label="PRELIMINARY ESTIMATE" tone="primary" /></View>
        <View style={[styles.hero, { backgroundColor: colors.foreground }]}><View style={[styles.heroIcon, { backgroundColor: `${colors.primary}30` }]}><MaterialIcons name="auto-awesome" size={23} color="#FFFFFF" /></View><Text style={styles.heroTitle}>Start with a little clarity.</Text><Text style={styles.heroBody}>Our AI assistant turns your description and optional photo into a cautious starting point before you book a specialist.</Text></View>
        <Card><FieldLabel>Describe the issue</FieldLabel><TextInput accessibilityLabel="Describe the issue" multiline value={description} onChangeText={setDescription} placeholder="Example: My air conditioner is running, but the room has not cooled for two hours." placeholderTextColor={colors.muted} style={[styles.textArea, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]} textAlignVertical="top" maxLength={1600} /><Text style={[styles.counter, { color: colors.muted }]}>{description.length}/1600</Text><View style={styles.evidence}><View style={styles.evidenceCopy}><MaterialIcons name="image-search" size={18} color={colors.primary} /><Text style={[styles.evidenceText, { color: colors.foreground }]}>{media.length ? "Photo attached for analysis" : "Add a photo for more context"}</Text></View>{media.length ? <Pressable accessibilityRole="button" onPress={() => setMedia([])}><Text style={[styles.remove, { color: colors.error }]}>Remove</Text></Pressable> : <Pressable accessibilityRole="button" disabled={uploading} onPress={() => void addPhoto()}><Text style={[styles.add, { color: colors.primary }]}>{uploading ? "Uploading…" : "Add photo"}</Text></Pressable>}</View><PrimaryButton label="Analyze safely" icon="auto-awesome" onPress={() => void analyze()} loading={analysis.isPending} disabled={uploading} /></Card>
        <View style={[styles.notice, { backgroundColor: `${colors.warning}14`, borderColor: `${colors.warning}35` }]}><MaterialIcons name="info-outline" size={20} color={colors.warning} /><Text style={[styles.noticeText, { color: colors.foreground }]}>This assistant offers a preliminary estimate only. It cannot replace an on-site professional inspection.</Text></View>
        {analysis.isPending ? <Card style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={{ color: colors.muted }}>Reviewing your description with safety first…</Text></Card> : null}
        {result ? <View style={styles.resultGap}><ScreenTitle eyebrow="Your preliminary assessment" title="Here is a careful starting point." /><Card><Chip label={result.urgency.toUpperCase()} tone={result.urgency === "emergency" ? "danger" : result.urgency === "priority" ? "warning" : "success"} /><Text style={[styles.problem, { color: colors.foreground }]}>{result.possibleProblem}</Text><View style={[styles.resultLine, { borderTopColor: colors.border }]}><MaterialIcons name="build" size={18} color={colors.primary} /><View style={styles.lineCopy}><Text style={[styles.lineLabel, { color: colors.muted }]}>RECOMMENDED SERVICE</Text><Text style={[styles.lineValue, { color: colors.foreground }]}>{result.recommendedCategory}</Text></View></View><View style={[styles.resultLine, { borderTopColor: colors.border }]}><MaterialIcons name="payments" size={18} color={colors.primary} /><View style={styles.lineCopy}><Text style={[styles.lineLabel, { color: colors.muted }]}>ESTIMATED RANGE</Text><Text style={[styles.lineValue, { color: colors.foreground }]}>{formatJod(result.estimatedMin)} – {formatJod(result.estimatedMax)}</Text></View></View></Card><Card><Text style={[styles.safeTitle, { color: colors.foreground }]}>Safe next steps</Text>{result.safeSteps.map((step, index) => <View key={`${step}-${index}`} style={styles.safeStep}><View style={[styles.safeDot, { backgroundColor: colors.primary }]}><Text style={styles.safeDotText}>{index + 1}</Text></View><Text style={[styles.safeText, { color: colors.foreground }]}>{step}</Text></View>)}</Card><View style={[styles.disclaimer, { backgroundColor: `${colors.error}0D` }]}><MaterialIcons name="health-and-safety" size={18} color={colors.error} /><Text style={[styles.disclaimerText, { color: colors.muted }]}>{result.disclaimer}</Text></View><PrimaryButton label="Continue to trusted specialists" icon="arrow-forward" onPress={() => router.push({ pathname: "/request/new", params: { description, suggestedCategory: result.recommendedCategory, urgency: result.urgency } })} /></View> : null}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: 12, paddingBottom: 34, gap: 18 },
  guest: { paddingTop: 12, gap: 28 },
  nav: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  hero: { borderRadius: 26, padding: 21, gap: 9 },
  heroIcon: { width: 43, height: 43, borderRadius: 15, alignItems: "center", justifyContent: "center", marginBottom: 3 },
  heroTitle: { color: "#FFFFFF", fontSize: 25, lineHeight: 31, fontWeight: "800", letterSpacing: -0.7 },
  heroBody: { color: "rgba(255,255,255,0.73)", fontSize: 13, lineHeight: 19, maxWidth: 330 },
  textArea: { minHeight: 133, padding: 12, borderRadius: 14, borderWidth: 1, fontSize: 14, lineHeight: 20 },
  counter: { alignSelf: "flex-end", fontSize: 10, lineHeight: 14, marginTop: -5 },
  evidence: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  evidenceCopy: { flex: 1, flexDirection: "row", alignItems: "center", gap: 7 },
  evidenceText: { fontSize: 12, lineHeight: 17, fontWeight: "700" },
  add: { fontSize: 12, lineHeight: 17, fontWeight: "800" },
  remove: { fontSize: 12, lineHeight: 17, fontWeight: "800" },
  notice: { borderWidth: 1, borderRadius: 16, padding: 13, flexDirection: "row", gap: 9, alignItems: "flex-start" },
  noticeText: { flex: 1, fontSize: 11, lineHeight: 16, fontWeight: "600" },
  loading: { minHeight: 86, alignItems: "center", justifyContent: "center", gap: 9 },
  resultGap: { gap: 15 },
  problem: { fontSize: 15, lineHeight: 23, fontWeight: "600" },
  resultLine: { borderTopWidth: 1, paddingTop: 11, flexDirection: "row", alignItems: "center", gap: 9 },
  lineCopy: { flex: 1, gap: 1 },
  lineLabel: { fontSize: 10, lineHeight: 14, fontWeight: "800", letterSpacing: 0.7 },
  lineValue: { fontSize: 13, lineHeight: 19, fontWeight: "800" },
  safeTitle: { fontSize: 15, lineHeight: 20, fontWeight: "800", marginBottom: 3 },
  safeStep: { flexDirection: "row", gap: 9, alignItems: "flex-start" },
  safeDot: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", marginTop: 1 },
  safeDotText: { color: "#FFFFFF", fontSize: 10, lineHeight: 13, fontWeight: "800" },
  safeText: { flex: 1, fontSize: 12, lineHeight: 18 },
  disclaimer: { padding: 13, borderRadius: 16, flexDirection: "row", alignItems: "flex-start", gap: 8 },
  disclaimerText: { flex: 1, fontSize: 10, lineHeight: 15 },
});
