import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Chip, IconButton } from "@/components/fixnow-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

export default function ChatScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const requestId = Number(id);
  const { user, isAuthenticated } = useAuth();
  const messages = trpc.messages.list.useQuery({ requestId }, { enabled: isAuthenticated && Number.isFinite(requestId), refetchInterval: 8_000 });
  const request = trpc.requests.get.useQuery({ requestId }, { enabled: isAuthenticated && Number.isFinite(requestId), refetchInterval: 12_000 });
  const send = trpc.messages.send.useMutation({ onSuccess: () => { setDraft(""); void messages.refetch(); } });
  const [draft, setDraft] = useState("");
  const displayMessages = useMemo(() => messages.data ?? [], [messages.data]);
  const sendMessage = async () => {
    if (!draft.trim()) return;
    try { await send.mutateAsync({ requestId, message: draft.trim() }); }
    catch (error) { const text = error instanceof Error ? error.message : "Unable to send this message."; if (Platform.OS === "web") window.alert(text); else Alert.alert("Message not sent", text); }
  };
  if (!isAuthenticated) return <ScreenContainer className="p-5"><View style={styles.center}><IconButton icon="arrow-back" label="Back" onPress={() => router.back()} /><Text style={[styles.centerTitle, { color: colors.foreground }]}>Sign in to use secure request chat.</Text></View></ScreenContainer>;
  const otherName = request.data?.request.customerId === user?.id ? request.data?.technicianUser?.name ?? "Your technician" : "Customer";
  return (
    <ScreenContainer className="px-5" edges={["top", "bottom", "left", "right"]}>
      <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}><IconButton icon="arrow-back" label="Back" onPress={() => router.back()} /><View style={styles.headerCopy}><Text style={[styles.headerTitle, { color: colors.foreground }]}>{otherName}</Text><View style={styles.online}><View style={[styles.onlineDot, { backgroundColor: colors.success }]} /><Text style={[styles.onlineText, { color: colors.muted }]}>Secure request chat</Text></View></View><Chip label={`#${requestId}`} tone="primary" /></View>
        <View style={styles.notice}><MaterialIcons name="lock-outline" size={15} color={colors.muted} /><Text style={[styles.noticeText, { color: colors.muted }]}>Messages are attached to this service request for clarity and support.</Text></View>
        <View style={styles.messages}>{messages.isLoading ? <ActivityIndicator color={colors.primary} /> : displayMessages.length ? displayMessages.map((entry) => { const mine = entry.senderId === user?.id; return <View key={entry.id} style={[styles.bubbleWrap, mine ? styles.mineWrap : styles.theirWrap]}><View style={[styles.bubble, { backgroundColor: mine ? colors.primary : colors.surface, borderColor: mine ? colors.primary : colors.border }]}><Text style={[styles.bubbleText, { color: mine ? "#FFFFFF" : colors.foreground }]}>{entry.message}</Text></View><Text style={[styles.time, { color: colors.muted }]}>{new Date(entry.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text></View>; }) : <View style={styles.empty}><MaterialIcons name="forum" size={27} color={colors.primary} /><Text style={[styles.emptyTitle, { color: colors.foreground }]}>Start with the details</Text><Text style={[styles.emptyText, { color: colors.muted }]}>Ask about arrival time, access, or what to prepare. Never share payment details in chat.</Text></View>}</View>
        <View style={[styles.composer, { borderTopColor: colors.border }]}><TextInput accessibilityLabel="Message" value={draft} onChangeText={setDraft} placeholder="Write a message…" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]} multiline maxLength={1200} /><Pressable accessibilityRole="button" accessibilityLabel="Send message" disabled={!draft.trim() || send.isPending} onPress={() => void sendMessage()} style={({ pressed }) => [styles.send, { backgroundColor: colors.primary, opacity: !draft.trim() || send.isPending || pressed ? 0.55 : 1 }]}>{send.isPending ? <ActivityIndicator color="#FFFFFF" /> : <MaterialIcons name="send" size={20} color="#FFFFFF" />}</Pressable></View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 18 },
  centerTitle: { fontSize: 18, lineHeight: 24, fontWeight: "800", textAlign: "center" },
  header: { minHeight: 66, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: 1 },
  headerCopy: { flex: 1, gap: 2 },
  headerTitle: { fontSize: 15, lineHeight: 20, fontWeight: "800" },
  online: { flexDirection: "row", alignItems: "center", gap: 5 },
  onlineDot: { width: 7, height: 7, borderRadius: 4 },
  onlineText: { fontSize: 10, lineHeight: 14 },
  notice: { minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 13 },
  noticeText: { fontSize: 10, lineHeight: 14, textAlign: "center" },
  messages: { flex: 1, gap: 11, paddingTop: 5, justifyContent: "flex-end" },
  bubbleWrap: { gap: 3, maxWidth: "81%" },
  mineWrap: { alignSelf: "flex-end", alignItems: "flex-end" },
  theirWrap: { alignSelf: "flex-start", alignItems: "flex-start" },
  bubble: { borderWidth: 1, borderRadius: 17, paddingHorizontal: 12, paddingVertical: 10 },
  bubbleText: { fontSize: 13, lineHeight: 19 },
  time: { fontSize: 9, lineHeight: 13, marginHorizontal: 3 },
  empty: { alignItems: "center", gap: 7, paddingVertical: 34, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 16, lineHeight: 21, fontWeight: "800" },
  emptyText: { fontSize: 12, lineHeight: 18, textAlign: "center" },
  composer: { paddingTop: 10, paddingBottom: 3, borderTopWidth: 1, flexDirection: "row", alignItems: "flex-end", gap: 8 },
  input: { flex: 1, minHeight: 45, maxHeight: 110, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, borderWidth: 1, fontSize: 13, lineHeight: 18 },
  send: { width: 45, height: 45, borderRadius: 14, alignItems: "center", justifyContent: "center" },
});
