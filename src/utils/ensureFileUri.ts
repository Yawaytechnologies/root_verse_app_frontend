import * as FileSystem from "expo-file-system";

/**
 * Android: content:// -> file:// (copy into cacheDirectory)
 * iOS: usually already file://
 */
export async function ensureFileUri(uri: string): Promise<string> {
  if (!uri) return uri;

  // already usable
  if (uri.startsWith("file://")) return uri;

  // convert only for Android content://
  if (uri.startsWith("content://")) {
    const filename = uri.split("/").pop() || `image_${Date.now()}.jpg`;

    const fs = FileSystem as any;
    const baseDir = fs.cacheDirectory ?? fs.documentDirectory;
    if (typeof baseDir !== "string") {
      throw new Error("FileSystem cache or document directory is not available");
    }

    const dest = `${baseDir}${filename}`;
    await FileSystem.copyAsync({ from: uri, to: dest });

    return dest; // file://...
  }

  return uri;
}
