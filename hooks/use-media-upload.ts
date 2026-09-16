import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Alert, Platform } from "react-native";
import { trpc } from "@/lib/trpc";

export type UploadedMedia = { url: string; key: string; mimeType: "image/jpeg" | "image/png" | "image/webp" | "video/mp4" | "application/pdf" };
type UploadPurpose = "request" | "verification" | "review" | "profile";

export function useMediaUpload() {
  const [uploading, setUploading] = useState(false);
  const mutation = trpc.uploads.create.useMutation();

  const choosePhotos = async (purpose: UploadPurpose, limit = 3): Promise<UploadedMedia[]> => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images", "videos"], allowsMultipleSelection: limit > 1, selectionLimit: limit, quality: 0.7, videoMaxDuration: 20 });
      if (result.canceled || !result.assets.length) return [];
      setUploading(true);
      const uploaded = await Promise.all(result.assets.map(async (asset, index) => {
        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) throw new Error("Each file must be 5 MB or smaller.");
        const mimeType = asset.mimeType === "image/png" ? "image/png" : asset.mimeType === "image/webp" ? "image/webp" : asset.mimeType === "video/mp4" ? "video/mp4" : "image/jpeg";
        const extension = mimeType === "video/mp4" ? "mp4" : mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
        const dataBase64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
        return mutation.mutateAsync({ filename: `${purpose}-${Date.now()}-${index}.${extension}`, mimeType, dataBase64, purpose });
      }));
      return uploaded;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to select this media.";
      if (Platform.OS === "web") window.alert(message); else Alert.alert("Upload unavailable", message);
      return [];
    } finally { setUploading(false); }
  };

  return { choosePhotos, uploading: uploading || mutation.isPending };
}
