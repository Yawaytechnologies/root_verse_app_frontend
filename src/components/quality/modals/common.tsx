// src/components/quality/modals/common.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import type { TextInputProps } from "react-native";
import * as FileSystem from "expo-file-system";

/* ================= UI HELPERS ================= */

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <Text className="mt-3 text-[13px] font-extrabold text-white/70">
      {children}
    </Text>
  );
}

export function TwoCol({ children }: { children: React.ReactNode }) {
  return <View className="mt-3 flex-row gap-3">{children}</View>;
}

export function ReadOnly({ value }: { value: string }) {
  return (
    <View className="mt-2 rounded-2xl border border-white/10 bg-black/35 px-4 py-3">
      <Text className="font-extrabold text-white">{value}</Text>
    </View>
  );
}

/**
 * ✅ Input wrapper (NativeWind)
 * - allows extra TextInput props
 * - keeps UI + disabled behavior
 */
type InputProps = Omit<TextInputProps, "editable"> & {
  disabled?: boolean;
};

export function Input({ disabled, className, ...rest }: InputProps) {
  const multiline = !!rest.multiline;
  const hClass = multiline ? "h-28" : "";
  const opacity = disabled ? "opacity-60" : "opacity-100";

  return (
    <TextInput
      {...rest}
      editable={!disabled}
      placeholderTextColor="rgba(255,255,255,0.35)"
      textAlignVertical={multiline ? "top" : "auto"}
      className={[
        "mt-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-extrabold text-white",
        hClass,
        opacity,
        className || "",
      ].join(" ")}
    />
  );
}

/**
 * ✅ NativeWind Select (no Picker)
 * - works same on Android/iOS
 */
export function Select<T extends string>({
  value,
  onValueChange,
  items,
  disabled,
  placeholder,
}: {
  value: T | "";
  onValueChange: (v: T) => void;
  items: readonly T[];
  disabled?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);

  const label = useMemo(() => {
    if (value) return String(value);
    return placeholder || "Select";
  }, [value, placeholder]);

  return (
    <>
      <Pressable
        onPress={() => !disabled && setOpen(true)}
        disabled={disabled}
        className={[
          "mt-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3",
          disabled ? "opacity-60" : "opacity-100",
        ].join(" ")}
      >
        <Text className="font-extrabold text-white">{label}</Text>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View className="flex-1 bg-black/60 p-4 justify-center">
          <View className="max-h-[80%] rounded-3xl border border-white/10 bg-[#0b1630] overflow-hidden">
            <View className="flex-row items-center justify-between px-4 py-4 border-b border-white/10">
              <Text className="text-white font-extrabold text-[16px]">
                {placeholder || "Select"}
              </Text>
              <Pressable onPress={() => setOpen(false)} className="px-3 py-2">
                <Text className="text-white/85 font-extrabold text-[18px]">
                  ✕
                </Text>
              </Pressable>
            </View>

            <ScrollView contentContainerClassName="p-3">
              {items.map((it) => {
                const active = String(it) === String(value);
                return (
                  <Pressable
                    key={String(it)}
                    onPress={() => {
                      onValueChange(it);
                      setOpen(false);
                    }}
                    className={[
                      "mb-2 rounded-2xl border px-4 py-3",
                      active
                        ? "border-blue-400/50 bg-blue-500/20"
                        : "border-white/10 bg-white/5",
                    ].join(" ")}
                  >
                    <Text className="text-white font-extrabold">
                      {String(it)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

export function ActionBtn({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={[
        "mt-2 rounded-2xl border border-blue-400/35 bg-white/5 px-4 py-3 items-center",
        disabled ? "opacity-60" : "opacity-100",
      ].join(" ")}
    >
      <Text className="text-white font-extrabold">{label}</Text>
    </Pressable>
  );
}

/* ================= FILE URI FIX (NO TS ERROR) ================= */

/**
 * ✅ Fix for black screen:
 * RN <Image> can fail with content:// or ph:// sometimes.
 * We copy to app dir and preview using file://.
 *
 * ✅ Also fixes your TS error:
 * some expo-file-system typings in your project don't expose cacheDirectory/documentDirectory,
 * so we access via (FileSystem as any).
 */
export async function ensureFileUri(inputUri: string): Promise<string> {
  const uri = String(inputUri || "");
  if (!uri) return uri;

  if (uri.startsWith("file://") || uri.startsWith("file:")) return uri;

  const fsAny = FileSystem as any;
  const baseDir: string | null =
    (typeof fsAny.cacheDirectory === "string" && fsAny.cacheDirectory) ||
    (typeof fsAny.documentDirectory === "string" && fsAny.documentDirectory) ||
    null;

  if (!baseDir) return uri;

  const dir = `${baseDir}qc_preview/`;
  try {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  } catch {
    // ignore
  }

  const extMatch = uri.match(/\.(jpg|jpeg|png|webp|heic|heif)\b/i);
  const ext = (extMatch?.[1] || "jpg").toLowerCase();

  const dest = `${dir}qc_${Date.now()}_${Math.random()
    .toString(16)
    .slice(2)}.${ext}`;

  try {
    await FileSystem.copyAsync({ from: uri, to: dest });
    return dest;
  } catch {
    return uri;
  }
}

/* ================= IMAGE LIST + PREVIEW ================= */

export function ImageList({
  uris,
  onRemove,
  disabled,
}: {
  uris: string[];
  onRemove: (uri: string) => void;
  disabled?: boolean;
}) {
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewErr, setPreviewErr] = useState<string | null>(null);

  // original -> safe file uri (for content:// / ph://)
  const [safeMap, setSafeMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!previewUri) {
      setPreviewErr(null);
      setPreviewLoading(false);
    }
  }, [previewUri]);

  if (!uris?.length) return null;

  const setSafe = (orig: string, safe: string) => {
    setSafeMap((m) => (m[orig] ? m : { ...m, [orig]: safe }));
  };

  return (
    <>
      <View className="mt-3 gap-3">
        {uris.map((uri) => {
          const showUri = safeMap[uri] || uri;

          return (
            <View
              key={uri}
              className="overflow-hidden rounded-2xl border border-white/10 bg-white/5"
            >
              {/* ✅ thumbnail */}
              <Pressable
                onPress={async () => {
                  setPreviewErr(null);
                  setPreviewLoading(true);

                  const safe = safeMap[uri] || (await ensureFileUri(uri));
                  setSafe(uri, safe);

                  setPreviewUri(safe);
                }}
              >
                <Image
                  source={{ uri: showUri }}
                  className="w-full h-[150px]"
                  onError={async () => {
                    // if thumb fails (content://), try converting once
                    if (!safeMap[uri]) {
                      const safe = await ensureFileUri(uri);
                      setSafe(uri, safe);
                    }
                  }}
                />
              </Pressable>

              <Pressable
                onPress={() => onRemove(uri)}
                disabled={disabled}
                className={[
                  "items-center py-3 border-t border-rose-400/25 bg-rose-400/15",
                  disabled ? "opacity-50" : "opacity-100",
                ].join(" ")}
              >
                <Text className="text-white font-extrabold">Remove</Text>
              </Pressable>
            </View>
          );
        })}
      </View>

      {/* ✅ Preview modal (NO black screen) */}
      <Modal
        visible={!!previewUri}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setPreviewUri(null)}
      >
        <View className="flex-1 bg-[#0b1630]">
          {/* top bar */}
          <View className="pt-12 px-4 flex-row items-center justify-between">
            <Text className="text-white/85 font-extrabold">Preview</Text>

            <Pressable
              onPress={() => setPreviewUri(null)}
              className="w-11 h-11 rounded-full bg-white/10 items-center justify-center"
            >
              <Text className="text-white font-extrabold text-[18px]">✕</Text>
            </Pressable>
          </View>

          {/* image area */}
          <View className="flex-1 p-4">
            <View className="flex-1 rounded-2xl overflow-hidden bg-black/20">
              {!!previewUri && (
                <Image
                  source={{ uri: previewUri }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="contain"
                  onLoadStart={() => {
                    setPreviewLoading(true);
                    setPreviewErr(null);
                  }}
                  onLoadEnd={() => setPreviewLoading(false)}
                  onError={() => {
                    setPreviewLoading(false);
                    setPreviewErr("Image failed to load");
                  }}
                />
              )}

              {previewLoading && (
                <View
                  style={{
                    position: "absolute",
                    inset: 0 as any,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: "rgba(255,255,255,0.85)", fontWeight: "900" }}>
                    Loading…
                  </Text>
                </View>
              )}

              {!!previewErr && (
                <View
                  style={{
                    position: "absolute",
                    inset: 0 as any,
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 16,
                  }}
                >
                  <Text
                    style={{
                      color: "rgba(255,80,80,0.95)",
                      fontWeight: "900",
                      textAlign: "center",
                    }}
                  >
                    {previewErr}
                  </Text>
                  <Text
                    style={{
                      color: "rgba(255,255,255,0.7)",
                      marginTop: 8,
                      textAlign: "center",
                    }}
                  >
                    If Android returns a content:// URI, preview can fail.
                    This screen tries to copy it to file://. If it still fails,
                    capture again or pick again.
                  </Text>
                </View>
              )}
            </View>

            <Pressable onPress={() => setPreviewUri(null)} style={{ paddingVertical: 14 }}>
              <Text
                style={{
                  color: "rgba(255,255,255,0.7)",
                  textAlign: "center",
                  fontWeight: "900",
                }}
              >
                Tap to close
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}
