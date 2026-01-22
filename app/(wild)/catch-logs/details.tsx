// app/(wild)/catch/catchDetails.tsx  (adjust path if different)
import React, { useEffect, useState } from "react";
import { Stack, router, useLocalSearchParams } from "expo-router";
import {
  Alert,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";

// ✅ Global wild language store
import { useLanguage } from "../../../src/data/wild/lang.store";

// ✅ Redux
import { useAppDispatch, useAppSelector } from "../../../src/store/hooks";
import { fetchFilledByCode } from "../../../src/services/wild/filledQr.slice";

/** -------------------- THEME -------------------- */
const UI = {
  bg: "#fbf6f1",
  card: "#ffffff",
  border: "#ead7c8",
  muted: "#7a6f66",
  faint: "#b1a59a",
  text: "#2b2b2b",
  chipBg: "#fff3e7",
  chipBorder: "#ffd9b6",
  accent: "#a06b2a",
};

type Lang = "ta" | "en";

const i18n: Record<Lang, any> = {
  ta: {
    title: "ஸ்கேன் & விவரங்கள் பார்க்க",
    qrId: "QR ஐடி",
    qrPh: "ஸ்கேன் அல்லது பதிவு செய்க (உதா: RV-VESSEL-000633)",
    noQrTitle: "QR ஐடி இல்லை",
    noQrSub: "QR ஐடியை பதிவு செய்யவும் அல்லது கீழே ஸ்கேன் செய்யவும்.",
    loading: "தேடுகிறது...",
    noDataTitle: "தரவு இல்லை",
    catchTitle: "பிடிப்பு பதிவு விவரங்கள்",
    fish: "மீன்",
    weight: "எடை",
    kg: "கி.கி",
    swipeHint: "படங்களை பார்க்க இடம்/வலம் ஸ்வைப் செய்யவும்",
    date: "தேதி",
    time: "நேரம்",
    search: "தேடு",
    camPermissionTitle: "Camera permission",
    camPermissionMsg: "Camera permission is required to scan QR.",
    scanHint: "QR ஐ ஸ்க்வேர்க்குள் காட்டவும்",
  },
  en: {
    title: "Scan & View Details",
    qrId: "QR ID",
    qrPh: "Scan or type (ex: RV-vessel-000633)",
    noQrTitle: "No QR selected",
    noQrSub: "Type a QR ID or scan below.",
    loading: "Loading...",
    noDataTitle: "No data found",
    catchTitle: "Catch Log Details",
    fish: "Fish",
    weight: "Weight",
    kg: "kg",
    swipeHint: "Swipe left/right to view images",
    date: "Date",
    time: "Time",
    search: "Search",
    camPermissionTitle: "Camera permission",
    camPermissionMsg: "Camera permission is required to scan QR.",
    scanHint: "Point the QR inside the square",
  },
};

function normalizeCode(raw: string) {
  return String(raw || "").trim();
}

// ✅ QR sometimes contains full url → extract last segment
function extractCode(value: string) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    const last = raw.split("/").filter(Boolean).pop() || "";
    return last.trim();
  }
  return raw;
}

/** -------------------- small components -------------------- */
function Card({ children }: { children: React.ReactNode }) {
  return (
    <View
      className="rounded-2xl border bg-white"
      style={{ borderColor: UI.border, backgroundColor: UI.card }}
    >
      {children}
    </View>
  );
}

function SectionTitle({
  icon,
  title,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
}) {
  return (
    <View className="flex-row items-center gap-2">
      <View
        className="h-9 w-9 rounded-xl items-center justify-center border"
        style={{ backgroundColor: UI.chipBg, borderColor: UI.chipBorder }}
      >
        <Ionicons name={icon} size={18} color={UI.accent} />
      </View>
      <Text className="text-[15px] font-extrabold" style={{ color: UI.text }}>
        {title}
      </Text>
    </View>
  );
}

function InfoRow({ k, v, last }: { k: string; v: string; last?: boolean }) {
  return (
    <View className={`py-2 ${last ? "" : "border-b"}`} style={{ borderColor: "#f0e3d8" }}>
      <Text className="text-[11px] font-semibold" style={{ color: UI.muted }}>
        {k}
      </Text>
      <Text className="mt-0.5 text-[14px] font-extrabold" style={{ color: UI.text }}>
        {v || "—"}
      </Text>
    </View>
  );
}

function SquareImageCarousel({ images, hint }: { images: string[]; hint: string }) {
  const W = Dimensions.get("window").width;
  const TILE = Math.min(230, W - 16 * 2 - 24);
  const GAP = 10;
  const [idx, setIdx] = useState(0);

  if (!images?.length) return null;

  return (
    <View className="mt-3">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={TILE + GAP}
        decelerationRate="fast"
        contentContainerStyle={{ paddingRight: 6 }}
        onScroll={(e) => {
          const x = e.nativeEvent.contentOffset.x;
          const next = Math.round(x / (TILE + GAP));
          if (next !== idx) setIdx(next);
        }}
        scrollEventThrottle={16}
      >
        {images.map((uri, i) => (
          <View
            key={`${uri}-${i}`}
            className="rounded-2xl overflow-hidden border"
            style={{
              width: TILE,
              height: TILE,
              marginRight: i === images.length - 1 ? 0 : GAP,
              borderColor: UI.border,
              backgroundColor: UI.chipBg,
            }}
          >
            <Image source={{ uri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
          </View>
        ))}
      </ScrollView>

      {images.length > 1 ? (
        <>
          <View className="flex-row items-center justify-center gap-2 mt-2">
            {images.map((_, i) => (
              <View
                key={i}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 99,
                  backgroundColor: i === idx ? UI.accent : "#e1d3c6",
                }}
              />
            ))}
          </View>
          <Text className="mt-2 text-[11px] font-semibold text-center" style={{ color: UI.muted }}>
            {hint}
          </Text>
        </>
      ) : null}
    </View>
  );
}

/** -------------------- MAIN SCREEN -------------------- */
export default function CatchDetails() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ code?: string; crateId?: string; qrId?: string }>();

  const initial = normalizeCode(params.code || params.qrId || params.crateId || "");

  const { lang } = useLanguage();
  const t = i18n[(lang as Lang) || "ta"];

  const dispatch = useAppDispatch();
  const filledState = useAppSelector((s: any) => s.filledQr);
  const loading = !!filledState?.loading;
  const apiData = filledState?.data;
  const apiError = filledState?.error as string | null;

  const [permission, requestPermission] = useCameraPermissions();

  const [qrId, setQrId] = useState(initial);
  const [scannedOnce, setScannedOnce] = useState(false);

  const qr = apiData?.qr || null;

  // ✅ After data loads, show only catch (hide search + scanner)
  const hideSearchAndScanner = !!qr;

  const ensureCamera = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert(t.camPermissionTitle, t.camPermissionMsg);
        return false;
      }
    }
    return true;
  };

  const runFetch = async (code: string) => {
    const clean = normalizeCode(code);
    if (!clean) return;
    await dispatch(fetchFilledByCode(clean));
  };

  const onScanned = (data: string) => {
    if (scannedOnce) return;
    setScannedOnce(true);

    const code = extractCode(data);
    setQrId(code);
    runFetch(code);

    setTimeout(() => setScannedOnce(false), 1200);
  };

  useEffect(() => {
    (async () => {
      if (!hideSearchAndScanner) await ensureCamera();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (initial) runFetch(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: UI.bg }} edges={["left", "right"]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header: ONLY back button */}
      <View
        style={{
          backgroundColor: "#fff",
          borderBottomWidth: 1,
          borderBottomColor: UI.border,
          paddingTop: insets.top,
          paddingBottom: 10,
          paddingHorizontal: 16,
        }}
      >
        <View className="flex-row items-center">
          <Pressable onPress={() => router.back()} className="p-2 mr-2 active:opacity-80" hitSlop={10}>
            <Ionicons name="arrow-back" size={20} color={UI.text} />
          </Pressable>

          <Text className="text-[16px] font-extrabold" style={{ color: UI.text }}>
            {t.title}
          </Text>
        </View>
      </View>

      {/* Search bar (NO scan button) */}
      {!hideSearchAndScanner ? (
        <View className="px-4 mt-4">
          <View className="rounded-2xl border bg-white px-3 py-2" style={{ borderColor: UI.border }}>
            <Text className="text-[11px] font-semibold" style={{ color: UI.muted }}>
              {t.qrId}
            </Text>

            <View className="mt-2 flex-row items-center gap-2">
              <Ionicons name="qr-code-outline" size={16} color={UI.faint} />

              <TextInput
                value={qrId}
                onChangeText={setQrId}
                placeholder={t.qrPh}
                placeholderTextColor={UI.faint}
                className="flex-1 text-[14px] font-extrabold"
                style={{ color: UI.text }}
                autoCapitalize="characters"
                autoCorrect={false}
                onSubmitEditing={() => runFetch(qrId)}
                returnKeyType="search"
                blurOnSubmit
              />

              <Pressable
                onPress={() => runFetch(qrId)}
                className="rounded-xl border px-3 py-2 active:opacity-80"
                style={{ borderColor: UI.border, backgroundColor: UI.chipBg }}
              >
                <Text className="text-[12px] font-extrabold" style={{ color: UI.accent }}>
                  {t.search}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}

      {/* Content */}
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 26, paddingTop: 14 }}>
        {/* Status card */}
        {!qrId ? (
          <Card>
            <View className="p-4">
              <Text className="text-[15px] font-extrabold" style={{ color: UI.text }}>
                {t.noQrTitle}
              </Text>
              <Text className="text-[12px] font-semibold mt-1" style={{ color: UI.muted }}>
                {t.noQrSub}
              </Text>
            </View>
          </Card>
        ) : loading ? (
          <Card>
            <View className="p-4">
              <Text className="text-[15px] font-extrabold" style={{ color: UI.text }}>
                {t.loading}
              </Text>
              <Text className="text-[12px] font-semibold mt-1" style={{ color: UI.muted }}>
                {qrId}
              </Text>
            </View>
          </Card>
        ) : apiError || !qr ? (
          // ✅ IMPORTANT: DO NOT show apiError text in UI
          <Card>
            <View className="p-4">
              <Text className="text-[15px] font-extrabold" style={{ color: UI.text }}>
                {t.noDataTitle}
              </Text>
            </View>
          </Card>
        ) : null}

        {/* Square Scanner below the status card */}
        {!hideSearchAndScanner ? (
          <View className="mt-4 items-center">
            <View
              className="rounded-3xl overflow-hidden border bg-white"
              style={{
                borderColor: UI.border,
                width: Math.min(320, Dimensions.get("window").width - 32),
                height: Math.min(320, Dimensions.get("window").width - 32),
              }}
            >
              <CameraView
                style={{ flex: 1 }}
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                onBarcodeScanned={(r) => onScanned(r.data)}
              />
            </View>

            <Text className="mt-2 text-[11px] font-semibold text-center" style={{ color: UI.muted }}>
              {t.scanHint}
            </Text>
          </View>
        ) : null}

        {/* Catch details ONLY */}
        {qr ? (
          <View className="gap-4 mt-4">
            <Card>
              <View className="p-4">
                <SectionTitle icon="fish-outline" title={t.catchTitle} />

                <View
                  className="mt-3 rounded-2xl border p-3"
                  style={{ borderColor: UI.border, backgroundColor: UI.chipBg }}
                >
                  <InfoRow k={t.fish} v={qr.fish_name || qr.fish?.fish_name || ""} />
                  <InfoRow k={t.weight} v={`${qr.weight || ""} ${t.kg}`} />
                  <InfoRow k={t.date} v={String(qr.date || "")} />
                  <InfoRow k={t.time} v={String(qr.time || "")} last />

                  <SquareImageCarousel
                    images={qr.image_url ? [String(qr.image_url).replace(/%22/g, "")] : []}
                    hint={t.swipeHint}
                  />
                </View>
              </View>
            </Card>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
