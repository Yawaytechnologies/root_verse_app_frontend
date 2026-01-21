import React, { useEffect, useMemo, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import * as ImagePicker from "expo-image-picker";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import NetInfo from "@react-native-community/netinfo";

// ✅ Redux
import { useAppDispatch, useAppSelector } from "../../../src/store/hooks";
import { submitCatchLog } from "../../../src/services/wild/catchLog.slice";

// ✅ Offline queue
import {
  enqueueCatchLog,
  flushQueue,
  getQueueCount,
  type CatchLogPayload,
} from "../../../src/utils/offlineQueue";

/* ---------------- TYPES ---------------- */
type TripItem = { tripId: string; port: string; vesselId: string };
type Lang = "ta" | "en";

type FishType = {
  id: number;
  fish_name: string;
  created_at?: string;
  updated_at?: string;
};

type PickerItem = { key: string; label: string };
type FishOption = { key: string; label: string; id: number };

/* ---------------- DUMMY TRIPS ---------------- */
const DUMMY_TRIPS: TripItem[] = [
  { tripId: "T250057", port: "Nagapattinam", vesselId: "RV-VES-NA026829" },
  { tripId: "T250043", port: "Chennai", vesselId: "RV-VES-NA026829" },
  { tripId: "T250021", port: "Thoothukudi", vesselId: "RV-VES-NA026829" },
];

/* ---------------- i18n ---------------- */
const i18n = {
  ta: {
    title: "பிடிப்பு பதிவு",
    sub: "Trip + Fish தேர்வு → QR ஸ்கேன் → Auto Date/Time → Photo → Save ✅",
    step: (n: number) => `படி ${n}/4`,
    next: "அடுத்து",
    back: "மீண்டும்",
    save: "சேமி",
    required: "அவசியம்",
    addPhoto: "📸 படம் எடு",
    remove: "நீக்கு",
    langBtn: "English",

    trip: "பயணம் (Trip)",
    chooseTrip: "பயணத்தை தேர்வு செய்",
    species: "மீன் வகை",
    chooseSpecies: "மீன் வகை தேர்வு செய்",

    scanTitle: "QR ஸ்கேன்",
    scanHint: "Trip + Fish தேர்வு செய்த பிறகு QR ஸ்கேன் செய்யலாம்",
    scanReady: "கேமரா திறந்து QR ஸ்கேன் செய்யுங்கள்",
    camDenied: "Camera permission அனுமதி இல்லை",
    grantCam: "Camera அனுமதி கொடு",

    dateTime: "Date & Time (Auto)",
    date: "தேதி",
    time: "நேரம்",
    autoHint: "Save அழுத்தும் நேரத்தில் Date/Time auto ஆக capture ஆகும்.",

    saved: "சேமிக்கப்பட்டது ✅",
    offlineSaved: "இணையம் இல்லை. Local-ல் save பண்ணிட்டோம். Net வந்தவுடன் auto sync ஆகும்.",
    syncing: "Syncing pending...",
    pending: "Pending sync",

    fishLoading: "மீன் வகைகள் ஏற்றுகிறது...",
    fishFailed: "மீன் வகைகள் பெற முடியவில்லை",

    errTrip: "பயணத்தை தேர்வு செய்யவும்",
    errSpecies: "மீன் வகையை தேர்வு செய்யவும்",
    errQr: "QR ஸ்கேன் செய்யவும்",
  },
  en: {
    title: "Catch Log",
    sub: "Select Trip + Fish → Scan QR → Auto Date/Time → Photo → Save ✅",
    step: (n: number) => `Step ${n}/4`,
    next: "Next",
    back: "Back",
    save: "Save",
    required: "Required",
    addPhoto: "📸 Capture Photo",
    remove: "Remove",
    langBtn: "தமிழ்",

    trip: "Trip",
    chooseTrip: "Choose trip",
    species: "Species",
    chooseSpecies: "Choose species",

    scanTitle: "Scan QR",
    scanHint: "Scan QR after selecting Trip + Fish",
    scanReady: "Open camera and scan the QR",
    camDenied: "Camera permission denied",
    grantCam: "Grant camera access",

    dateTime: "Date & Time (Auto)",
    date: "Date",
    time: "Time",
    autoHint: "Date/Time will be captured automatically when you press Save.",

    saved: "Saved ✅",
    offlineSaved: "No internet. Saved locally. Will auto-sync when network returns.",
    syncing: "Syncing pending...",
    pending: "Pending sync",

    fishLoading: "Loading fish types...",
    fishFailed: "Failed to load fish types",

    errTrip: "Please choose trip",
    errSpecies: "Please choose species",
    errQr: "Please scan QR",
  },
};

const UI = {
  bg: "bg-[#fbf6f1]",
  border: "border-[#ead7c8]",
  muted: "text-[#7a6f66]",
  text: "text-[#2b2b2b]",
  chipBg: "bg-[#fff3e7]",
  chipBorder: "border-[#ffd9b6]",
  accent: "#a06b2a",
};

/* ---------------- HELPERS ---------------- */
const fmtDate = (d: Date) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const fmtTime = (d: Date) => {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}:00`;
};

const fishNameOf = (f: FishType) => String(f.fish_name || "").trim();

/* ---------------- UI COMPONENTS ---------------- */
function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <View className={`rounded-2xl border ${UI.border} bg-white ${className}`}>
      {children}
    </View>
  );
}

function FieldCard({ children }: { children: React.ReactNode }) {
  return (
    <View className={`rounded-2xl border ${UI.border} bg-white px-4 py-3`}>
      {children}
    </View>
  );
}

function SelectField({
  label,
  value,
  placeholder,
  hint,
  onPress,
}: {
  label: string;
  value: string;
  placeholder: string;
  hint: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="active:opacity-80">
      <Text className={`text-xs ${UI.muted}`}>{label}</Text>
      <Text className={`mt-1 text-base ${value ? UI.text : "text-[#b1a59a]"}`}>
        {value || placeholder}
      </Text>
      <Text className="mt-1 text-[11px] text-[#b1a59a]">{hint}</Text>
    </Pressable>
  );
}

function PickerSheetObj<T extends PickerItem>({
  title,
  valueKey,
  options,
  onSelect,
  sheetRef,
  searchPlaceholder = "Search...",
}: {
  title: string;
  valueKey: string;
  options: T[];
  onSelect: (item: T) => void;
  sheetRef: React.RefObject<BottomSheetModal | null>;
  searchPlaceholder?: string;
}) {
  const snapPoints = useMemo(() => ["45%", "75%"], []);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return options;
    return options.filter((x) => x.label.toLowerCase().includes(t));
  }, [q, options]);

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      backgroundStyle={{ borderRadius: 24 }}
      handleIndicatorStyle={{ opacity: 0.35 }}
    >
      <BottomSheetView style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
        <View className="flex-row items-center justify-between">
          <Text className={`text-base font-bold ${UI.text}`}>{title}</Text>
          <Pressable
            onPress={() => sheetRef.current?.dismiss()}
            className="rounded-full px-3 py-2 active:opacity-80"
          >
            <Text style={{ color: UI.accent }} className="text-sm font-semibold">
              Done
            </Text>
          </Pressable>
        </View>

        <View className={`mt-3 rounded-2xl border ${UI.border} bg-[#fbf6f1] px-3 py-2`}>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={searchPlaceholder}
            className={`text-base ${UI.text}`}
          />
        </View>

        <ScrollView className="mt-3" keyboardShouldPersistTaps="handled">
          {filtered.map((item) => {
            const active = item.key === valueKey;
            return (
              <Pressable
                key={item.key}
                onPress={() => {
                  onSelect(item);
                  sheetRef.current?.dismiss();
                }}
                className={`mb-2 rounded-2xl border px-4 py-3 active:opacity-80 ${
                  active ? `bg-[#fff3e7] border-[#ffd9b6]` : `${UI.border} bg-white`
                }`}
              >
                <Text className={`text-sm font-semibold ${UI.text}`}>{item.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

/* ---------------- MAIN SCREEN ---------------- */
export default function CreateCatchLog() {
  const params = useLocalSearchParams<{ crateId?: string }>();
  const initialCrateId = String(params?.crateId || "").trim();

  const dispatch = useAppDispatch();
  const catchState = useAppSelector((s: any) => s.catchLog);
  const posting = !!catchState?.loading;

  const [lang, setLang] = useState<Lang>("ta");
  const t = i18n[lang];

  // ✅ steps: 1 Trip+Fish, 2 Scan, 3 Auto Date/Time, 4 Photos+Save
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Trips
  const [tripOptions] = useState<TripItem[]>(DUMMY_TRIPS);

  // Fish types
  const [fishTypes, setFishTypes] = useState<FishType[]>([]);
  const [fishLoading, setFishLoading] = useState(false);
  const [fishError, setFishError] = useState<string | null>(null);

  // Required
  const [tripId, setTripId] = useState("");
  const [fishId, setFishId] = useState<number | null>(null);
  const [fishName, setFishName] = useState("");

  // crateId from scan
  const [crateId, setCrateId] = useState(initialCrateId);

  // Photos
  const [images, setImages] = useState<string[]>([]);

  // Network + pending
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  // Camera permission + scan lock
  const [cameraPerm, requestCameraPerm] = useCameraPermissions();
  const [canScan, setCanScan] = useState(true);

  const tripRef = useRef<BottomSheetModal>(null);
  const fishRef = useRef<BottomSheetModal>(null);

  // If crateId came from params, skip scan step
  useEffect(() => {
    if (initialCrateId) {
      setCrateId(initialCrateId);
      setStep(3);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load queue count + network listener + auto flush when online
  useEffect(() => {
    let alive = true;

    (async () => {
      const c = await getQueueCount();
      if (alive) setPendingCount(c);
    })();

    const unsub = NetInfo.addEventListener(async (state) => {
      const online = !!state.isConnected && !!state.isInternetReachable;
      setIsOnline(online);

      if (online) {
        setSyncing(true);
        try {
          await flushQueue(async (payload: CatchLogPayload) => {
            await dispatch(submitCatchLog(payload as any)).unwrap();
          });
        } finally {
          const c = await getQueueCount();
          setPendingCount(c);
          setSyncing(false);
        }
      }
    });

    return () => {
      alive = false;
      unsub();
    };
  }, [dispatch]);

  // Fetch fish types
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setFishLoading(true);
        setFishError(null);

        const res = await fetch("https://rootverse-backend-5qoo.onrender.com/api/fish-types");
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`${res.status} ${txt || "Fish types request failed"}`);
        }

        const json = await res.json();
        const list: FishType[] = Array.isArray(json)
          ? json
          : Array.isArray(json?.data)
          ? json.data
          : [];

        if (alive) setFishTypes(list);
      } catch (e: any) {
        if (alive) setFishError(e?.message || t.fishFailed);
      } finally {
        if (alive) setFishLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [t.fishFailed]);

  const fishPickerOptions: FishOption[] = useMemo(() => {
    return fishTypes
      .filter((f) => f?.id && fishNameOf(f))
      .map((f) => ({
        key: String(f.id),
        label: fishNameOf(f),
        id: f.id,
      }));
  }, [fishTypes]);

  const scanEnabled = !!tripId && !!fishId;

  const validateStep = () => {
    if (step === 1) {
      if (!tripId) return Alert.alert(t.required, t.errTrip), false;
      if (!fishId) return Alert.alert(t.required, t.errSpecies), false;
      return true;
    }
    if (step === 2) {
      if (!crateId) return Alert.alert(t.required, t.errQr), false;
      return true;
    }
    return true;
  };

  const next = () => {
    if (!validateStep()) return;
    setStep((s) => (s === 1 ? 2 : s === 2 ? 3 : 4));
  };

  const back = () => setStep((s) => (s === 4 ? 3 : s === 3 ? 2 : 1));

  // QR Scan handler (expects QR content = crateId)
  const onBarcodeScanned = (data: string) => {
    const value = String(data || "").trim();
    if (!value) return;

    if (!canScan) return;
    setCanScan(false);

    setCrateId(value);

    setTimeout(() => {
      setStep(3);
      setCanScan(true);
    }, 350);
  };

  // Camera only
  const captureImageOnly = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      return Alert.alert("Permission", "Allow camera access to capture photos.");
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
      cameraType: ImagePicker.CameraType.back,
    });

    if (result.canceled) return;

    const uri = result.assets?.[0]?.uri;
    if (!uri) return;

    setImages((prev) => [...prev, uri].slice(0, 10));
  };

  const removeImage = (uri: string) => setImages((prev) => prev.filter((u) => u !== uri));

  // Auto preview (readonly UI only)
  const nowPreview = useMemo(() => new Date(), [step, crateId, tripId, fishId]);

  // SAVE with offline queue
  const save = async () => {
    if (!crateId) return Alert.alert("Missing QR", "Please scan QR first.");
    if (!tripId) return Alert.alert(t.required, t.errTrip);
    if (!fishId) return Alert.alert(t.required, t.errSpecies);

    const now = new Date();

    const payload: CatchLogPayload = {
      linkedCrateId: crateId,
      tripId,
      fishId: fishId,
      rvVesselId: 2, // TODO: replace with real
      ownerId: 9, // TODO: replace with real
      catchDate: fmtDate(now),
      catchTime: fmtTime(now),
      images,
    };

    // If offline -> queue it
    if (!isOnline) {
      await enqueueCatchLog(payload);
      const c = await getQueueCount();
      setPendingCount(c);

      Alert.alert("Saved Offline", t.offlineSaved);
      router.replace({ pathname: "/catch-logs/details", params: { crateId } });
      return;
    }

    // Online -> try API, if network error -> queue
    try {
      const result = await dispatch(submitCatchLog(payload as any)).unwrap();
      Alert.alert(t.saved, `Catch ID: ${result?.id || result?.catchId || "Success"}`);
      router.replace({ pathname: "/catch-logs/details", params: { crateId } });
    } catch (e: any) {
      const msg = String(e?.message || e);
      const m = msg.toLowerCase();
      const networkish =
        m.includes("network") || m.includes("failed to fetch") || m.includes("timeout");

      if (networkish) {
        await enqueueCatchLog(payload);
        const c = await getQueueCount();
        setPendingCount(c);

        Alert.alert("Saved Offline", t.offlineSaved);
        router.replace({ pathname: "/catch-logs/details", params: { crateId } });
        return;
      }

      Alert.alert("Error", msg);
    }
  };

  return (
    <View className={`flex-1 ${UI.bg}`}>
      <ScrollView contentContainerClassName="p-4 pb-10">
        {/* Header */}
        <Card className="p-4">
          <View className="flex-row items-start justify-between">
            <View>
              <Text className={`text-lg font-bold ${UI.text}`}>{t.title}</Text>
              <Text className={`mt-1 text-sm ${UI.muted}`}>{t.sub}</Text>
            </View>

            <Pressable
              onPress={() => setLang((x) => (x === "ta" ? "en" : "ta"))}
              className={`rounded-full border ${UI.border} bg-[#fbf6f1] px-3 py-2 active:opacity-80`}
            >
              <Text className={`text-xs font-semibold ${UI.text}`}>{t.langBtn}</Text>
            </Pressable>
          </View>

          <View className="mt-3">
            <Text className={`text-xs ${UI.muted}`}>QR Code</Text>
            <Text className={`mt-1 text-base font-extrabold ${UI.text}`}>{crateId || "—"}</Text>
          </View>

          <View className={`mt-3 rounded-xl border ${UI.chipBorder} ${UI.chipBg} px-3 py-2`}>
            <Text className={`text-xs font-semibold ${UI.text}`}>{t.step(step)}</Text>
          </View>

          {/* Network / Pending */}
          <View className="mt-3">
            <Text className={`text-[11px] ${UI.muted}`}>
              Network:{" "}
              <Text className="font-bold" style={{ color: isOnline ? "#1f7a3f" : "#b45309" }}>
                {isOnline ? "ONLINE" : "OFFLINE"}
              </Text>
              {syncing ? `  •  ${t.syncing}` : ""}
            </Text>

            {pendingCount > 0 ? (
              <View className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                <Text className="text-xs font-semibold text-amber-800">
                  {t.pending}: {pendingCount} {isOnline ? "" : "(offline)"}
                </Text>
              </View>
            ) : null}
          </View>

          {fishLoading ? (
            <View className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2">
              <Text className="text-xs font-semibold text-blue-800">{t.fishLoading}</Text>
            </View>
          ) : fishError ? (
            <View className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
              <Text className="text-xs font-semibold text-rose-800">
                {t.fishFailed}: {fishError}
              </Text>
            </View>
          ) : null}
        </Card>

        {/* Trip sheet */}
        <BottomSheetModal
          ref={tripRef}
          snapPoints={["45%", "75%"]}
          enablePanDownToClose
          backgroundStyle={{ borderRadius: 24 }}
          handleIndicatorStyle={{ opacity: 0.35 }}
        >
          <BottomSheetView style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
            <View className="flex-row items-center justify-between">
              <Text className={`text-base font-bold ${UI.text}`}>{t.chooseTrip}</Text>
              <Pressable
                onPress={() => tripRef.current?.dismiss()}
                className="rounded-full px-3 py-2 active:opacity-80"
              >
                <Text style={{ color: UI.accent }} className="text-sm font-semibold">
                  Done
                </Text>
              </Pressable>
            </View>

            <ScrollView className="mt-3" keyboardShouldPersistTaps="handled">
              {tripOptions.map((x) => {
                const active = x.tripId === tripId;
                return (
                  <Pressable
                    key={x.tripId}
                    onPress={() => {
                      setTripId(x.tripId);
                      tripRef.current?.dismiss();
                    }}
                    className={`mb-2 rounded-2xl border px-4 py-3 active:opacity-80 ${
                      active ? `bg-[#fff3e7] border-[#ffd9b6]` : `${UI.border} bg-white`
                    }`}
                  >
                    <Text className={`text-sm font-semibold ${UI.text}`}>{x.tripId}</Text>
                    <Text className={`mt-1 text-xs ${UI.muted}`}>{x.port}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </BottomSheetView>
        </BottomSheetModal>

        {/* Fish picker */}
        <PickerSheetObj<FishOption>
          title={t.chooseSpecies}
          valueKey={fishId ? String(fishId) : ""}
          options={fishPickerOptions}
          onSelect={(item) => {
            setFishId(item.id);
            setFishName(item.label);
          }}
          sheetRef={fishRef}
          searchPlaceholder="Search fish..."
        />

        {/* STEP 1: Trip + Fish */}
        {step === 1 ? (
          <View className="mt-4 gap-3">
            <FieldCard>
              <SelectField
                label={`✅ ${t.trip} (${t.required})`}
                value={tripId}
                placeholder={t.chooseTrip}
                hint="Tap ▾"
                onPress={() => tripRef.current?.present()}
              />
            </FieldCard>

            <FieldCard>
              <SelectField
                label={`✅ ${t.species} (${t.required})`}
                value={fishName}
                placeholder={t.chooseSpecies}
                hint={fishLoading ? t.fishLoading : "Tap ▾"}
                onPress={() => {
                  if (!fishLoading) fishRef.current?.present();
                }}
              />
            </FieldCard>

            <Pressable
              onPress={next}
              className="mt-2 rounded-2xl px-4 py-4 active:opacity-90"
              style={{ backgroundColor: UI.accent, opacity: fishLoading ? 0.7 : 1 }}
              disabled={fishLoading}
            >
              <Text className="text-center text-white text-base font-extrabold">{t.next}</Text>
            </Pressable>
          </View>
        ) : null}

        {/* STEP 2: Scan QR */}
        {step === 2 ? (
          <View className="mt-4 gap-3">
            <Card className="p-4">
              <View className="flex-row items-center gap-2">
                <Ionicons name="qr-code-outline" size={20} color={UI.accent} />
                <Text className={`text-sm font-extrabold ${UI.text}`}>{t.scanTitle}</Text>
              </View>

              <Text className={`mt-1 text-[11px] ${UI.muted}`}>
                {scanEnabled ? t.scanReady : t.scanHint}
              </Text>

              <View className="mt-3 overflow-hidden rounded-2xl border border-[#ead7c8] bg-black">
                {!cameraPerm?.granted ? (
                  <View className="p-4">
                    <Text className="text-white text-sm font-semibold">{t.camDenied}</Text>
                    <Pressable
                      onPress={requestCameraPerm}
                      className="mt-3 rounded-2xl px-4 py-3 active:opacity-80"
                      style={{ backgroundColor: UI.accent }}
                    >
                      <Text className="text-center text-white font-extrabold">{t.grantCam}</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={{ height: 320 }}>
                    <CameraView
                      style={{ flex: 1 }}
                      facing="back"
                      barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                      onBarcodeScanned={(e) => {
                        if (!scanEnabled) return;
                        onBarcodeScanned(String((e as any)?.data || ""));
                      }}
                    />
                    <View className="absolute bottom-0 left-0 right-0 p-3 bg-black/60">
                      <Text className="text-white text-xs">
                        Trip: <Text className="font-bold">{tripId || "—"}</Text> | Fish:{" "}
                        <Text className="font-bold">{fishName || "—"}</Text>
                      </Text>
                      <Text className="text-white text-[11px] mt-1">
                        {scanEnabled ? "Scan the QR now." : "Select Trip + Fish first (Back)."}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {crateId ? (
                <View className={`mt-3 rounded-xl border ${UI.border} bg-[#fbf6f1] px-3 py-2`}>
                  <Text className={`text-xs font-semibold ${UI.text}`}>Scanned: {crateId}</Text>
                </View>
              ) : null}
            </Card>

            <View className="mt-2 flex-row gap-3">
              <Pressable
                className={`flex-1 rounded-2xl border ${UI.border} bg-white px-4 py-4 active:opacity-80`}
                onPress={back}
              >
                <Text className={`text-center ${UI.text} text-base font-extrabold`}>{t.back}</Text>
              </Pressable>

              <Pressable
                className="flex-1 rounded-2xl px-4 py-4 active:opacity-90"
                style={{ backgroundColor: UI.accent, opacity: crateId ? 1 : 0.6 }}
                onPress={next}
                disabled={!crateId}
              >
                <Text className="text-center text-white text-base font-extrabold">{t.next}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* STEP 3: Auto Date/Time (read only) */}
        {step === 3 ? (
          <View className="mt-4 gap-3">
            <Card className="p-4">
              <View className="flex-row items-center gap-2">
                <Ionicons name="time-outline" size={20} color={UI.accent} />
                <Text className={`text-sm font-extrabold ${UI.text}`}>{t.dateTime}</Text>
              </View>

              <View className={`mt-3 rounded-xl border ${UI.border} bg-[#fbf6f1] px-3 py-3`}>
                <Text className={`text-xs ${UI.muted}`}>{t.date}</Text>
                <Text className={`mt-1 text-base font-extrabold ${UI.text}`}>
                  {fmtDate(nowPreview)}
                </Text>

                <View className="mt-3 h-[1px] bg-[#ead7c8]" />

                <Text className={`mt-3 text-xs ${UI.muted}`}>{t.time}</Text>
                <Text className={`mt-1 text-base font-extrabold ${UI.text}`}>
                  {fmtTime(nowPreview)}
                </Text>

                <Text className={`mt-2 text-[11px] ${UI.muted}`}>{t.autoHint}</Text>
              </View>
            </Card>

            <View className="mt-2 flex-row gap-3">
              <Pressable
                className={`flex-1 rounded-2xl border ${UI.border} bg-white px-4 py-4 active:opacity-80`}
                onPress={back}
              >
                <Text className={`text-center ${UI.text} text-base font-extrabold`}>{t.back}</Text>
              </Pressable>

              <Pressable
                className="flex-1 rounded-2xl px-4 py-4 active:opacity-90"
                style={{ backgroundColor: UI.accent }}
                onPress={next}
              >
                <Text className="text-center text-white text-base font-extrabold">{t.next}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* STEP 4: Photos + Save */}
        {step === 4 ? (
          <View className="mt-4">
            <Card className="p-4">
              <View className="flex-row items-center gap-2">
                <Ionicons name="camera-outline" size={20} color={UI.accent} />
                <Text className={`text-sm font-extrabold ${UI.text}`}>{t.addPhoto}</Text>
              </View>

              <Pressable
                onPress={captureImageOnly}
                className="mt-3 rounded-2xl border px-4 py-3 active:opacity-90"
                style={{ borderColor: UI.accent, backgroundColor: "#fff3e7" }}
              >
                <Text className="text-center font-semibold" style={{ color: UI.accent }}>
                  {t.addPhoto}
                </Text>
              </Pressable>

              {images.length > 0 ? (
                <View className="mt-3 gap-2">
                  {images.map((uri, idx) => (
                    <View
                      key={uri}
                      className={`flex-row items-center justify-between rounded-xl border ${UI.border} bg-[#fbf6f1] px-3 py-2`}
                    >
                      <Text className={`flex-1 text-xs ${UI.text}`} numberOfLines={1}>
                        Photo {idx + 1}
                      </Text>
                      <Pressable
                        onPress={() => removeImage(uri)}
                        className="ml-3 rounded-full bg-rose-100 px-3 py-1 active:opacity-80"
                      >
                        <Text className="text-xs font-semibold text-rose-700">{t.remove}</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : null}
            </Card>

            <View className="mt-5 flex-row gap-3">
              <Pressable
                className={`flex-1 rounded-2xl border ${UI.border} bg-white px-4 py-4 active:opacity-80`}
                onPress={back}
                disabled={posting}
              >
                <Text className={`text-center ${UI.text} text-base font-extrabold`}>{t.back}</Text>
              </Pressable>

              <Pressable
                className="flex-1 rounded-2xl px-4 py-4 active:opacity-90"
                style={{ backgroundColor: UI.accent, opacity: posting ? 0.7 : 1 }}
                onPress={save}
                disabled={posting}
              >
                <Text className="text-center text-white text-base font-extrabold">
                  {posting ? (lang === "ta" ? "சேமிக்கிறது..." : "Saving...") : t.save}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
