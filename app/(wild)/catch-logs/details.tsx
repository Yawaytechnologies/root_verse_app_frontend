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

/** -------------------- THEME (same as CreateCatchLog) -------------------- */
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
    back: "மீண்டும்",
    scan: "ஸ்கேன்",
    qrId: "QR ஐடி",
    qrPh: "ஸ்கேன் அல்லது பதிவு செய்க (உதா: RV-CRATE-000633)",
    noQrTitle: "QR ஐடி இல்லை",
    noQrSub: "“ஸ்கேன்” செய்யவும் அல்லது QR ஐடி பதிவிடவும்.",
    loading: "தேடுகிறது...",
    noDataTitle: "தரவு இல்லை",
    ownerTitle: "உரிமையாளர் விவரங்கள்",
    name: "பெயர்",
    phone: "தொலைபேசி",
    address: "முகவரி",
    vesselTitle: "படகு விவரங்கள்",
    vesselName: "படகு பெயர்",
    homePort: "துறைமுகம்",
    fishingMethod: "மீன்பிடி முறை",
    tripTitle: "பயண விவரங்கள்",
    plannedAt: "புறப்படும் நேரம்",
    arrivalAt: "அடைவு நேரம்",
    catchTitle: "பிடிப்பு பதிவு விவரங்கள்",
    fish: "மீன்",
    weight: "எடை",
    kg: "கி.கி",
    swipeHint: "படங்களை பார்க்க இடம்/வலம் ஸ்வைப் செய்யவும்",
  },
  en: {
    title: "Scan & View Details",
    back: "Back",
    scan: "Scan",
    qrId: "QR ID",
    qrPh: "Scan or type (ex: RV-CRATE-000633)",
    noQrTitle: "No QR selected",
    noQrSub: "Tap “Scan” or type a QR ID.",
    loading: "Loading...",
    noDataTitle: "No data found",
    ownerTitle: "Owner Details",
    name: "Name",
    phone: "Phone",
    address: "Address",
    vesselTitle: "Vessel Details",
    vesselName: "Vessel Name",
    homePort: "Home Port",
    fishingMethod: "Fishing Method",
    tripTitle: "Trip Details",
    plannedAt: "Planned At",
    arrivalAt: "Arrival At",
    catchTitle: "Catch Log Details",
    fish: "Fish",
    weight: "Weight",
    kg: "kg",
    swipeHint: "Swipe left/right to view images",
  },
};

function normalizeCode(raw: string) {
  return String(raw || "").trim();
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

  // ✅ accept any param name (older links)
  const initial = normalizeCode(params.code || params.qrId || params.crateId || "");

  // ✅ GLOBAL language
  const { lang } = useLanguage();
  const t = i18n[(lang as Lang) || "ta"];

  // ✅ Redux
  const dispatch = useAppDispatch();
  const filledState = useAppSelector((s: any) => s.filledQr);
  const loading = !!filledState?.loading;
  const apiData = filledState?.data; // { success, qr }
  const apiError = filledState?.error as string | null;

  const [permission, requestPermission] = useCameraPermissions();
  const [scannerOn, setScannerOn] = useState(false);

  // ✅ input holds QR code
  const [qrId, setQrId] = useState(initial);
  const [scannedOnce, setScannedOnce] = useState(false);

  // data mapping (from your API response)
  const qr = apiData?.qr || null;

  const ensureCamera = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert("Camera permission", "Camera permission is required to scan QR.");
        return false;
      }
    }
    return true;
  };

  const openScanner = async () => {
    const ok = await ensureCamera();
    if (!ok) return;
    setScannedOnce(false);
    setScannerOn(true);
  };

  const runFetch = async (code: string) => {
    const clean = normalizeCode(code);
    if (!clean) return;
    await dispatch(fetchFilledByCode(clean));
  };

  const onScanned = (data: string) => {
    if (scannedOnce) return;
    setScannedOnce(true);

    const code = normalizeCode(data);
    setQrId(code);
    setScannerOn(false);

    runFetch(code);
  };

  // ✅ initial load if param exists
  useEffect(() => {
    if (initial) runFetch(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  return (
    // ✅ FIX: SafeAreaView should NOT add top padding here (header will handle it)
    <SafeAreaView style={{ flex: 1, backgroundColor: UI.bg }} edges={["left", "right"]}>
      {/* ✅ Hide expo-router header so route text doesn't show */}
      <Stack.Screen options={{ headerShown: false }} />

      {/* ✅ Header: now fills the top inset area with WHITE (no gap) */}
      <View
        style={{
          backgroundColor: "#fff",
          borderBottomWidth: 1,
          borderBottomColor: UI.border,
          paddingTop: insets.top, // ✅ moved here
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

      {/* ✅ QR Input + Scan button */}
      <View className="px-4 mt-4">
        <View className="rounded-2xl border bg-white px-3 py-2" style={{ borderColor: UI.border }}>
          <View className="flex-row items-center justify-between">
            <Text className="text-[11px] font-semibold" style={{ color: UI.muted }}>
              {t.qrId}
            </Text>

            <Pressable
              onPress={openScanner}
              className="flex-row items-center gap-2 rounded-xl border px-3 py-2 active:opacity-80"
              style={{ borderColor: UI.border, backgroundColor: UI.chipBg }}
            >
              <Ionicons name="qr-code-outline" size={16} color={UI.accent} />
              <Text className="text-[12px] font-extrabold" style={{ color: UI.accent }}>
                {t.scan}
              </Text>
            </Pressable>
          </View>

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
          </View>
        </View>
      </View>

      {/* Scanner */}
      {scannerOn ? (
        <View className="px-4 pb-2 mt-4">
          <View className="rounded-3xl overflow-hidden border bg-white" style={{ borderColor: UI.border }}>
            <View style={{ height: 330 }}>
              <CameraView
                style={{ flex: 1 }}
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                onBarcodeScanned={(r) => onScanned(r.data)}
              />
            </View>
          </View>
        </View>
      ) : null}

      {/* Details */}
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 26, paddingTop: 14 }}>
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
        ) : apiError ? (
          <Card>
            <View className="p-4">
              <Text className="text-[15px] font-extrabold" style={{ color: UI.text }}>
                {t.noDataTitle}
              </Text>
              <Text className="text-[12px] font-semibold mt-1" style={{ color: UI.muted }}>
                {apiError}
              </Text>
            </View>
          </Card>
        ) : !qr ? (
          <Card>
            <View className="p-4">
              <Text className="text-[15px] font-extrabold" style={{ color: UI.text }}>
                {t.noDataTitle}
              </Text>
              <Text className="text-[12px] font-semibold mt-1" style={{ color: UI.muted }}>
                {qrId}
              </Text>
            </View>
          </Card>
        ) : (
          <View className="gap-4">
            {/* Owner */}
            <Card>
              <View className="p-4">
                <SectionTitle icon="person-outline" title={t.ownerTitle} />
                <View className="mt-3">
                  <InfoRow k={t.name} v={qr.owner_name || qr.owner?.username || ""} />
                  <InfoRow k={t.phone} v={qr.owner?.phone_no || ""} />
                  <InfoRow k={t.address} v={qr.owner?.address || ""} last />
                </View>
              </View>
            </Card>

            {/* Vessel */}
            <Card>
              <View className="p-4">
                <SectionTitle icon="boat-outline" title={t.vesselTitle} />
                <View className="mt-3">
                  <InfoRow k={t.vesselName} v={qr.vessel_name || qr.vessel?.vessel_name || ""} />
                  <InfoRow k={t.homePort} v={qr.vessel?.home_port || ""} />
                  <InfoRow
                    k={t.fishingMethod}
                    v={qr.vessel?.allowed_fishing_methods || qr.trip?.fishing_method || ""}
                    last
                  />
                </View>
              </View>
            </Card>

            {/* Trip */}
            {qr.trip ? (
              <Card>
                <View className="p-4">
                  <SectionTitle icon="navigate-outline" title={t.tripTitle} />
                  <View className="mt-3">
                    <InfoRow k={t.plannedAt} v={String(qr.trip?.planned_at || "")} />
                    <InfoRow k={t.arrivalAt} v={String(qr.trip?.arrival_at || "")} last />
                  </View>
                </View>
              </Card>
            ) : null}

            {/* Catch */}
            <Card>
              <View className="p-4">
                <SectionTitle icon="fish-outline" title={t.catchTitle} />
                <View
                  className="mt-3 rounded-2xl border p-3"
                  style={{ borderColor: UI.border, backgroundColor: UI.chipBg }}
                >
                  <InfoRow k={t.fish} v={qr.fish_name || qr.fish?.fish_name || ""} />
                  <InfoRow k={t.weight} v={`${qr.weight || ""} ${t.kg}`} />
                  <InfoRow k={"Date"} v={String(qr.date || "")} />
                  <InfoRow k={"Time"} v={String(qr.time || "")} last />

                  <SquareImageCarousel
                    images={qr.image_url ? [String(qr.image_url).replace(/%22/g, "")] : []}
                    hint={t.swipeHint}
                  />
                </View>
              </View>
            </Card>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
