// app/(wild)/catch-logs/create.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";

// ✅ FIX: use expo-camera instead of expo-barcode-scanner
import { CameraView, useCameraPermissions } from "expo-camera";

import { useTrace } from "../../../src/data/wild/trace.store";

// ✅ Dummy catchlog single-file store (you already asked for this)
import { createCatchLog } from "../../../src/data/wild/catchLog.dummy";

type TripItem = { tripId: string; port: string; vesselId: string };
type Lang = "ta" | "en";

/** -------------------- API base + endpoints -------------------- */
const rawBase =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  "https://rootverse-backend.onrender.com";

const API_BASE = rawBase.endsWith("/") ? rawBase.slice(0, -1) : rawBase;

// 🔧 Change these paths to match your backend
const ENDPOINTS = {
  trips: `${API_BASE}/api/wild/trips`,
  species: `${API_BASE}/api/wild/species`,
  postCatchLog: `${API_BASE}/api/wild/catch-logs`,
};

/** -------------------- Dummy fallback lists -------------------- */
const DUMMY_SPECIES = [
  "Yellowfin Tuna",
  "Red Snapper",
  "Squid",
  "White Pomfret",
  "Seer Fish",
];

const DUMMY_TRIPS: TripItem[] = [
  { tripId: "T250057", port: "Nagapattinam", vesselId: "RV-VES-NA026829" },
  { tripId: "T250043", port: "Chennai", vesselId: "RV-VES-NA026829" },
  { tripId: "T250021", port: "Thoothukudi", vesselId: "RV-VES-NA026829" },
];

/** -------------------- i18n -------------------- */
const i18n = {
  ta: {
    title: "பிடிப்பு பதிவு",
    sub: "3 படிகளில் முடிக்கலாம் ✅",
    step: (n: number) => `படி ${n}/3`,
    next: "அடுத்து",
    back: "மீண்டும்",
    save: "சேமி",
    required: "அவசியம்",
    optional: "விருப்பம்",
    addPhoto: "📷 படம் சேர்க்க",
    remove: "நீக்கு",
    more: "மேலும் (விருப்பம்)",
    less: "குறைவு",
    langBtn: "English",

    scanTitle: "📷 பொருள் ஸ்கேன் (Physical Tag)",
    scanSub: "ஸ்டிக்கர் / பெட்டி QR ஸ்கேன் செய்யவும் (விருப்பம்).",
    scanBtn: "ஸ்கேன் தொடங்கு",
    stopScanBtn: "ஸ்கேன் நிறுத்து",
    clearBtn: "அகற்று",
    linked: "இணைக்கப்பட்டது",
    camDenied:
      "கேமரா அனுமதி இல்லை. Settings இல் camera permission enable செய்யுங்கள்.",

    trip: "பயணம் (Trip)",
    chooseTrip: "பயணத்தை தேர்வு செய்",
    species: "மீன் வகை",
    chooseSpecies: "மீன் வகை தேர்வு செய்",
    weight: "எடை (kg)",
    weightPH: "உதா: 120",
    date: "தேதி",
    time: "நேரம்",
    pickDate: "தேதி தேர்வு செய்ய தட்டுங்கள் 📅",
    pickTime: "நேரம் தேர்வு செய்ய தட்டுங்கள் ⏱️",

    notes: "குறிப்பு (விருப்பம்)",
    notesPH: "எதாவது சொல்ல வேண்டுமா?",
    lat: "Latitude",
    lon: "Longitude",

    errTrip: "பயணத்தை தேர்வு செய்யவும்",
    errSpecies: "மீன் வகையை தேர்வு செய்யவும்",
    errWeight: "எடை போடவும்",
    errDate: "தேதி தேர்வு செய்யவும்",
    saved: "சேமிக்கப்பட்டது ✅",

    posting: "பதிவேற்றுகிறது...",
    apiFailFallback: "API இல்லை/தோல்வி. Dummy fallback சேமிக்கப்பட்டது.",
    offlineUsingDummy: "Offline mode: dummy data",
  },
  en: {
    title: "Catch Log",
    sub: "Finish in 3 steps ✅",
    step: (n: number) => `Step ${n}/3`,
    next: "Next",
    back: "Back",
    save: "Save",
    required: "Required",
    optional: "Optional",
    addPhoto: "📷 Add Photos",
    remove: "Remove",
    more: "More (Optional)",
    less: "Less",
    langBtn: "தமிழ்",

    scanTitle: "📷 Physical Tag Scan",
    scanSub: "Scan sticker / crate QR (optional).",
    scanBtn: "Start Scan",
    stopScanBtn: "Stop Scan",
    clearBtn: "Clear",
    linked: "Linked",
    camDenied:
      "Camera permission denied. Enable camera permission in Settings.",

    trip: "Trip",
    chooseTrip: "Choose trip",
    species: "Species",
    chooseSpecies: "Choose species",
    weight: "Weight (kg)",
    weightPH: "ex: 120",
    date: "Date",
    time: "Time",
    pickDate: "Tap to pick date 📅",
    pickTime: "Tap to pick time ⏱️",

    notes: "Notes (Optional)",
    notesPH: "Any notes?",
    lat: "Latitude",
    lon: "Longitude",

    errTrip: "Please choose trip",
    errSpecies: "Please choose species",
    errWeight: "Please enter weight",
    errDate: "Please choose date",
    saved: "Saved ✅",

    posting: "Posting...",
    apiFailFallback: "API unavailable/failed. Saved in dummy fallback.",
    offlineUsingDummy: "Offline mode: dummy data",
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
  dangerBg: "#fee2e2",
  dangerText: "#991b1b",
};

/** -------------------- helpers -------------------- */
const genCatchId = () => {
  const yy = String(new Date().getFullYear()).slice(-2);
  const rnd = Math.floor(10000 + Math.random() * 90000);
  return `C${yy}${rnd}`;
};

const toNum = (v: string) => {
  const n = Number(String(v).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const fmtDate = (d?: Date | null) => {
  if (!d) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const fmtTime = (d?: Date | null) => {
  if (!d) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

async function safeFetchJson<T>(
  url: string,
  opts?: RequestInit,
  timeoutMs = 8000
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { ...(opts || {}), signal: controller.signal });
    const text = await res.text();

    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!res.ok) {
      const msg =
        (data && (data.message || data.error)) ||
        `Request failed (${res.status})`;
      throw new Error(msg);
    }

    return data as T;
  } finally {
    clearTimeout(timer);
  }
}

/** -------------------- UI small components -------------------- */
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

function DateField({
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

function PickerModal({
  open,
  title,
  value,
  mode,
  onClose,
  onPick,
}: {
  open: boolean;
  title: string;
  value: Date;
  mode: "date" | "time";
  onClose: () => void;
  onPick: (d: Date) => void;
}) {
  if (!open) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 bg-black/50 justify-end">
        <Pressable onPress={() => {}} className="rounded-t-3xl bg-white p-4">
          <View className="flex-row items-center justify-between">
            <Text className={`text-base font-bold ${UI.text}`}>{title}</Text>
            <Pressable onPress={onClose} className="px-3 py-2 active:opacity-70">
              <Text style={{ color: UI.accent }} className="text-sm font-semibold">
                Done
              </Text>
            </Pressable>
          </View>

          <View className="mt-3">
            <DateTimePicker
              value={value}
              mode={mode}
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={(event, date) => {
                if (Platform.OS !== "ios") {
                  if ((event as any).type === "dismissed") return onClose();
                  if (date) onPick(date);
                  return onClose();
                }
                if (date) onPick(date);
              }}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function PickerSheet({
  title,
  value,
  options,
  onSelect,
  sheetRef,
  renderOption,
}: {
  title: string;
  value: string;
  options: string[];
  onSelect: (v: string) => void;
  sheetRef: React.RefObject<BottomSheetModal>;
  renderOption?: (item: string) => { title: string; sub?: string };
}) {
  const snapPoints = useMemo(() => ["45%", "75%"], []);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return options;
    return options.filter((x) => x.toLowerCase().includes(t));
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

        <View
          className={`mt-3 rounded-2xl border ${UI.border} bg-[#fbf6f1] px-3 py-2`}
        >
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search..."
            className={`text-base ${UI.text}`}
          />
        </View>

        <ScrollView className="mt-3" keyboardShouldPersistTaps="handled">
          {filtered.map((item) => {
            const active = item === value;
            const display = renderOption ? renderOption(item) : { title: item };

            return (
              <Pressable
                key={item}
                onPress={() => {
                  onSelect(item);
                  sheetRef.current?.dismiss();
                }}
                className={`mb-2 rounded-2xl border px-4 py-3 active:opacity-80 ${
                  active
                    ? `bg-[#fff3e7] border-[#ffd9b6]`
                    : `${UI.border} bg-white`
                }`}
              >
                <Text className={`text-sm font-semibold ${UI.text}`}>
                  {display.title}
                </Text>
                {display.sub ? (
                  <Text className={`mt-0.5 text-xs ${UI.muted}`}>
                    {display.sub}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

/** -------------------- MAIN SCREEN -------------------- */
export default function CreateCatchLog() {
  const { crateId } = useLocalSearchParams<{ crateId?: string }>();
  const trace = useTrace();

  const [lang, setLang] = useState<Lang>("ta");
  const t = i18n[lang];

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [showMore, setShowMore] = useState(false);

  const [catchId] = useState(genCatchId());

  // Catalog options (API-first, dummy fallback)
  const [tripOptions, setTripOptions] = useState<TripItem[]>(DUMMY_TRIPS);
  const [speciesOptions, setSpeciesOptions] = useState<string[]>(DUMMY_SPECIES);
  const [offlineMode, setOfflineMode] = useState(false);

  // Required fields
  const [tripId, setTripId] = useState("");
  const [species, setSpecies] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [catchDate, setCatchDate] = useState<Date | null>(null);
  const [catchTime, setCatchTime] = useState<Date | null>(new Date());

  // Optional fields
  const [notes, setNotes] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  // Picker overlays
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);

  // Images
  const [images, setImages] = useState<string[]>([]);

  // Bottom sheets
  const tripRef = useRef<BottomSheetModal>(null);
  const speciesRef = useRef<BottomSheetModal>(null);

  // ✅ Scanner (expo-camera)
  const [permission, requestPermission] = useCameraPermissions();
  const [scanMode, setScanMode] = useState(false);
  const [scannedCrateId, setScannedCrateId] = useState("");
  const didScanRef = useRef(false);

  // Posting
  const [posting, setPosting] = useState(false);

  // Prefer scanned crate id > url param
  const finalCrateId = scannedCrateId || (crateId ? String(crateId) : "");

  const shownDate = fmtDate(catchDate);
  const shownTime = fmtTime(catchTime);

  /** Load trips/species from API; fallback to dummy if not available */
  useEffect(() => {
    let alive = true;

    const loadCatalog = async () => {
      try {
        setOfflineMode(false);

        const [tripsRes, speciesRes] = await Promise.all([
          safeFetchJson<any>(ENDPOINTS.trips, { method: "GET" }),
          safeFetchJson<any>(ENDPOINTS.species, { method: "GET" }),
        ]);

        const trips: TripItem[] = Array.isArray(tripsRes)
          ? tripsRes
          : tripsRes?.items || tripsRes?.data || [];

        const species: string[] = Array.isArray(speciesRes)
          ? speciesRes
          : speciesRes?.items || speciesRes?.data || [];

        if (!alive) return;

        setTripOptions(trips.length ? trips : DUMMY_TRIPS);
        setSpeciesOptions(species.length ? species : DUMMY_SPECIES);
        setOfflineMode(!(trips.length && species.length));
      } catch {
        if (!alive) return;
        setTripOptions(DUMMY_TRIPS);
        setSpeciesOptions(DUMMY_SPECIES);
        setOfflineMode(true);
      }
    };

    loadCatalog();
    return () => {
      alive = false;
    };
  }, []);

  const requestCamera = async () => {
    didScanRef.current = false;

    // If already granted -> start
    if (permission?.granted) {
      setScanMode(true);
      return;
    }

    // Otherwise request
    const res = await requestPermission();
    if (res?.granted) {
      setScanMode(true);
    } else {
      setScanMode(false);
    }
  };

  const stopScan = () => {
    setScanMode(false);
    didScanRef.current = false;
  };

  const onScanned = ({ data }: { data: string }) => {
    if (didScanRef.current) return;
    didScanRef.current = true;

    const raw = String(data || "").trim();
    let id = raw;

    // QR can be just crateId or a URL like .../trace/RV-CRATE-000123
    const match = raw.match(/trace\/([A-Za-z0-9-_.]+)/);
    if (match?.[1]) id = match[1];

    setScannedCrateId(id);
    setScanMode(false);
    Alert.alert("Scanned", `Tag: ${id}`);
  };

  const pickImages = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      return Alert.alert("Permission", "Allow photo access to upload images.");
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      selectionLimit: 6,
    });

    if (result.canceled) return;

    const uris = result.assets.map((a) => a.uri);
    setImages((prev) => [...prev, ...uris].slice(0, 10));
  };

  const removeImage = (uri: string) =>
    setImages((prev) => prev.filter((u) => u !== uri));

  const validateStep = () => {
    if (step === 1) {
      if (!tripId) return Alert.alert(t.required, t.errTrip), false;
      if (!species) return Alert.alert(t.required, t.errSpecies), false;
      return true;
    }
    if (step === 2) {
      if (!weightKg.trim()) return Alert.alert(t.required, t.errWeight), false;
      if (!catchDate) return Alert.alert(t.required, t.errDate), false;
      return true;
    }
    return true;
  };

  const next = () => {
    if (!validateStep()) return;
    setStep((s) => (s === 1 ? 2 : 3));
  };

  const back = () => setStep((s) => (s === 3 ? 2 : 1));

  /** POST catch log to API; if fails -> dummy fallback + trace event */
  const save = async () => {
    if (!tripId) return Alert.alert(t.required, t.errTrip);
    if (!species) return Alert.alert(t.required, t.errSpecies);
    if (!weightKg.trim()) return Alert.alert(t.required, t.errWeight);
    if (!catchDate) return Alert.alert(t.required, t.errDate);

    const payload = {
      catchId,
      tripId,
      species,
      weightKg: toNum(weightKg),
      catchDate: fmtDate(catchDate),
      catchTime: fmtTime(catchTime),
      notes: notes || "—",
      latitude: latitude || "—",
      longitude: longitude || "—",
      images,
      linkedCrateId: finalCrateId || null,
    };

    // Always store locally too
    createCatchLog(payload);

    // If QR present, also add local trace event
    if (finalCrateId) {
      trace.addEvent({
        crateId: finalCrateId,
        stage: "CATCH",
        data: payload,
        createdBy: "Owner",
      });
    }

    try {
      setPosting(true);
      Alert.alert(t.posting, finalCrateId ? `Crate: ${finalCrateId}` : catchId);

      await safeFetchJson<any>(ENDPOINTS.postCatchLog, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      Alert.alert(t.saved, `Catch ID: ${catchId}`);

      if (finalCrateId) {
        router.replace({
          pathname: "/trace/[crateId]",
          params: { crateId: finalCrateId },
        });
      } else {
        router.back();
      }
    } catch (e: any) {
      Alert.alert(t.apiFailFallback, String(e?.message || e));

      if (finalCrateId) {
        router.replace({
          pathname: "/trace/[crateId]",
          params: { crateId: finalCrateId },
        });
      } else {
        router.back();
      }
    } finally {
      setPosting(false);
    }
  };

  const cameraDenied = permission && !permission.granted;

  return (
    <View className={`flex-1 ${UI.bg}`}>
      {/* Native pickers */}
      <PickerModal
        open={showDate && Platform.OS !== "web"}
        title={t.date}
        value={catchDate ?? new Date()}
        mode="date"
        onClose={() => setShowDate(false)}
        onPick={(d) => setCatchDate(d)}
      />
      <PickerModal
        open={showTime && Platform.OS !== "web"}
        title={t.time}
        value={catchTime ?? new Date()}
        mode="time"
        onClose={() => setShowTime(false)}
        onPick={(d) => setCatchTime(d)}
      />

      {/* Bottom sheets */}
      <PickerSheet
        title={t.chooseTrip}
        value={tripId}
        options={tripOptions.map((x) => x.tripId)}
        onSelect={setTripId}
        sheetRef={tripRef}
        renderOption={(id) => {
          const x = tripOptions.find((k) => k.tripId === id);
          return { title: id, sub: x ? `${x.port} · ${x.vesselId}` : "" };
        }}
      />
      <PickerSheet
        title={t.chooseSpecies}
        value={species}
        options={speciesOptions}
        onSelect={setSpecies}
        sheetRef={speciesRef}
      />

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
              <Text className={`text-xs font-semibold ${UI.text}`}>
                {t.langBtn}
              </Text>
            </Pressable>
          </View>

          <View className="mt-3">
            <Text className={`text-xs ${UI.muted}`}>Catch ID</Text>
            <Text className={`mt-1 text-base font-bold ${UI.text}`}>{catchId}</Text>
          </View>

          <View
            className={`mt-3 rounded-xl border ${UI.chipBorder} ${UI.chipBg} px-3 py-2`}
          >
            <Text className={`text-xs font-semibold ${UI.text}`}>{t.step(step)}</Text>
          </View>

          {offlineMode ? (
            <View className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
              <Text className="text-xs font-semibold text-amber-800">
                {t.offlineUsingDummy}
              </Text>
            </View>
          ) : null}
        </Card>

        {/* STEP 1 */}
        {step === 1 ? (
          <View className="mt-4 gap-3">
            {/* Inline scanner */}
            <Card className="p-4">
              <View className="flex-row items-center gap-2">
                <Ionicons name="qr-code-outline" size={20} color={UI.accent} />
                <Text className={`text-sm font-extrabold ${UI.text}`}>
                  {t.scanTitle}
                </Text>
              </View>

              <Text className={`mt-1 text-xs ${UI.muted}`}>{t.scanSub}</Text>

              {!!finalCrateId && (
                <View
                  className={`mt-3 rounded-xl border ${UI.chipBorder} ${UI.chipBg} px-3 py-2`}
                >
                  <Text className={`text-xs font-semibold ${UI.text}`}>
                    {t.linked}:{" "}
                    <Text className="font-extrabold">{finalCrateId}</Text>
                  </Text>
                </View>
              )}

              {scanMode ? (
                <View className="mt-3 overflow-hidden rounded-2xl border border-[#ead7c8] bg-black">
                  <View style={{ height: 230 }}>
                    <CameraView
                      style={{ flex: 1 }}
                      barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                      onBarcodeScanned={(result) =>
                        onScanned({ data: result.data })
                      }
                    />
                    <View className="absolute inset-0 items-center justify-center pointer-events-none">
                      <View className="h-44 w-44 rounded-2xl border-2 border-white/80" />
                      <Text className="mt-3 text-white/80 text-[11px]">
                        Align QR inside the box
                      </Text>
                    </View>
                  </View>
                </View>
              ) : null}

              {cameraDenied ? (
                <View
                  className="mt-3 rounded-xl border px-3 py-2"
                  style={{ backgroundColor: UI.dangerBg, borderColor: "#fecaca" }}
                >
                  <Text
                    style={{ color: UI.dangerText }}
                    className="text-xs font-semibold"
                  >
                    {t.camDenied}
                  </Text>
                </View>
              ) : null}

              <View className="mt-3 flex-row gap-3">
                {!scanMode ? (
                  <Pressable
                    onPress={requestCamera}
                    className="flex-1 rounded-2xl px-4 py-3 active:opacity-90"
                    style={{ backgroundColor: UI.accent }}
                  >
                    <Text className="text-center text-white font-semibold">
                      {t.scanBtn}
                    </Text>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={stopScan}
                    className="flex-1 rounded-2xl px-4 py-3 active:opacity-90"
                    style={{ backgroundColor: "#111827" }}
                  >
                    <Text className="text-center text-white font-semibold">
                      {t.stopScanBtn}
                    </Text>
                  </Pressable>
                )}

                <Pressable
                  onPress={() => {
                    setScannedCrateId("");
                    stopScan();
                  }}
                  className={`flex-1 rounded-2xl border ${UI.border} bg-white px-4 py-3 active:opacity-80`}
                >
                  <Text className={`text-center font-semibold ${UI.text}`}>
                    {t.clearBtn}
                  </Text>
                </Pressable>
              </View>
            </Card>

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
                value={species}
                placeholder={t.chooseSpecies}
                hint="Tap ▾"
                onPress={() => speciesRef.current?.present()}
              />
            </FieldCard>

            <Pressable
              onPress={next}
              className="mt-2 rounded-2xl px-4 py-4 active:opacity-90"
              style={{ backgroundColor: UI.accent }}
            >
              <Text className="text-center text-white text-base font-extrabold">
                {t.next}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* STEP 2 */}
        {step === 2 ? (
          <View className="mt-4 gap-3">
            <FieldCard>
              <Text className={`text-xs ${UI.muted}`}>
                {`✅ ${t.weight} (${t.required})`}
              </Text>
              <TextInput
                value={weightKg}
                onChangeText={setWeightKg}
                keyboardType="numeric"
                placeholder={t.weightPH}
                className={`mt-1 text-base ${UI.text}`}
              />
            </FieldCard>

            <FieldCard>
              <DateField
                label={`✅ ${t.date} (${t.required})`}
                value={shownDate}
                placeholder="YYYY-MM-DD"
                hint={t.pickDate}
                onPress={() => setShowDate(true)}
              />
            </FieldCard>

            <FieldCard>
              <DateField
                label={`${t.time} (${t.optional})`}
                value={shownTime}
                placeholder="HH:MM"
                hint={t.pickTime}
                onPress={() => setShowTime(true)}
              />
            </FieldCard>

            <View className="mt-2 flex-row gap-3">
              <Pressable
                className={`flex-1 rounded-2xl border ${UI.border} bg-white px-4 py-4 active:opacity-80`}
                onPress={back}
              >
                <Text className={`text-center ${UI.text} text-base font-extrabold`}>
                  {t.back}
                </Text>
              </Pressable>

              <Pressable
                className="flex-1 rounded-2xl px-4 py-4 active:opacity-90"
                style={{ backgroundColor: UI.accent }}
                onPress={next}
              >
                <Text className="text-center text-white text-base font-extrabold">
                  {t.next}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* STEP 3 */}
        {step === 3 ? (
          <View className="mt-4">
            <Card className="p-4">
              <View className="flex-row items-center gap-2">
                <Ionicons name="camera-outline" size={20} color={UI.accent} />
                <Text className={`text-sm font-extrabold ${UI.text}`}>
                  {t.addPhoto}
                </Text>
              </View>

              <Text className={`mt-1 text-xs ${UI.muted}`}>
                {lang === "ta"
                  ? "விருப்பம். இருந்தால் சேர்க்கவும்."
                  : "Optional. Add if you have."}
              </Text>

              <Pressable
                onPress={pickImages}
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
                        <Text className="text-xs font-semibold text-rose-700">
                          {t.remove}
                        </Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : null}
            </Card>

            <Pressable
              onPress={() => setShowMore((s) => !s)}
              className={`mt-3 rounded-2xl border ${UI.border} bg-white px-4 py-3 active:opacity-80`}
            >
              <Text className={`text-center text-sm font-semibold ${UI.text}`}>
                {showMore ? t.less : t.more}
              </Text>
            </Pressable>

            {showMore ? (
              <View className="mt-3 gap-3">
                <FieldCard>
                  <Text className={`text-xs ${UI.muted}`}>{t.notes}</Text>
                  <TextInput
                    value={notes}
                    onChangeText={setNotes}
                    placeholder={t.notesPH}
                    multiline
                    className={`mt-1 text-base ${UI.text}`}
                    style={{ minHeight: 84, textAlignVertical: "top" }}
                  />
                </FieldCard>

                <View className="flex-row gap-3">
                  <View
                    className={`flex-1 rounded-2xl border ${UI.border} bg-white px-4 py-3`}
                  >
                    <Text className={`text-xs ${UI.muted}`}>{t.lat}</Text>
                    <TextInput
                      value={latitude}
                      onChangeText={setLatitude}
                      placeholder="10.7654"
                      className={`mt-1 text-base ${UI.text}`}
                    />
                  </View>
                  <View
                    className={`flex-1 rounded-2xl border ${UI.border} bg-white px-4 py-3`}
                  >
                    <Text className={`text-xs ${UI.muted}`}>{t.lon}</Text>
                    <TextInput
                      value={longitude}
                      onChangeText={setLongitude}
                      placeholder="79.8432"
                      className={`mt-1 text-base ${UI.text}`}
                    />
                  </View>
                </View>
              </View>
            ) : null}

            <View className="mt-5 flex-row gap-3">
              <Pressable
                className={`flex-1 rounded-2xl border ${UI.border} bg-white px-4 py-4 active:opacity-80`}
                onPress={back}
                disabled={posting}
              >
                <Text className={`text-center ${UI.text} text-base font-extrabold`}>
                  {t.back}
                </Text>
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
