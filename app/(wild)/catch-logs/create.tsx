// app/(wild)/catch-logs/create.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import * as ImagePicker from "expo-image-picker";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import NetInfo from "@react-native-community/netinfo";

import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useAppDispatch, useAppSelector } from "../../../src/store/hooks";
import { submitCatchLog } from "../../../src/services/wild/catchLog.slice";
import { fetchMe } from "../../../src/store/auth/me.slice";

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

type LiveLocation = {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  capturedAt: string; // ISO
};

/**
 * Local payload: ownerId is OPTIONAL for offline queue.
 * (Your backend/DB expects numeric owner db id)
 */
type LocalCatchLogPayload = Omit<CatchLogPayload, "ownerId"> & {
  ownerId?: number;
  fishName?: string;
};

/* ---------------- DUMMY TRIPS ---------------- */
const DUMMY_TRIPS: TripItem[] = [
  { tripId: "T250057", port: "Nagapattinam", vesselId: "RV-VES-NA026829" },
  { tripId: "T250043", port: "Chennai", vesselId: "RV-VES-NA026829" },
  { tripId: "T250021", port: "Thoothukudi", vesselId: "RV-VES-NA026829" },
];

/* ---------------- CACHE KEYS ---------------- */
const FISH_CACHE_KEY = "rv_fish_types_cache_v1";
/**
 * IMPORTANT:
 * This must be numeric owner DB id (example: 14),
 * NOT the owner code "OWN-0001"
 */
const OWNER_CACHE_KEY = "rv_owner_db_id_cache_v2";

/* ---------------- FALLBACK FISH (only if no cache yet) ---------------- */
const FALLBACK_FISH_TYPES: FishType[] = [
  { id: -1, fish_name: "Sardine" },
  { id: -2, fish_name: "Mackerel" },
  { id: -3, fish_name: "Tuna" },
  { id: -4, fish_name: "Anchovy" },
];

const fishNameOf = (f: FishType) => String(f?.fish_name || "").trim();

/* ---------------- FISH CACHE HELPERS ---------------- */
async function readFishCache(): Promise<FishType[]> {
  try {
    const raw = await AsyncStorage.getItem(FISH_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((f) => typeof f?.id === "number" && fishNameOf(f))
      .map((f) => ({ id: f.id, fish_name: fishNameOf(f) }));
  } catch {
    return [];
  }
}

async function writeFishCache(list: FishType[]) {
  try {
    await AsyncStorage.setItem(FISH_CACHE_KEY, JSON.stringify(list));
  } catch {}
}

async function fetchFishTypesFromApi(): Promise<FishType[]> {
  const res = await fetch("https://rootverse-backend-5qoo.onrender.com/api/fish-types");
  if (!res.ok) return [];
  const json = await res.json();
  const list: FishType[] = Array.isArray(json)
    ? json
    : Array.isArray(json?.data)
    ? json.data
    : [];
  return list
    .filter((f) => typeof f?.id === "number" && fishNameOf(f))
    .map((f) => ({ id: f.id, fish_name: fishNameOf(f) }));
}

/* ---------------- OWNER CACHE HELPERS (numeric db id) ---------------- */
async function readOwnerCache(): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(OWNER_CACHE_KEY);
    const v = String(raw || "").trim();
    if (!v) return null;
    // accept only digits
    if (!/^\d+$/.test(v)) return null;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

async function writeOwnerCache(ownerDbId: number) {
  try {
    await AsyncStorage.setItem(OWNER_CACHE_KEY, String(ownerDbId));
  } catch {}
}

/* ---------------- i18n ---------------- */
const i18n = {
  ta: {
    title: "பிடிப்பு பதிவு",
    sub: "Trip + Fish தேர்வு → பல QR ஸ்கேன் → Auto Date/Time → Photo → Save ✅",
    step: (n: number) => `படி ${n}/4`,
    next: "அடுத்து",
    back: "மீண்டும்",
    save: "சேமி",
    required: "அவசியம்",
    addPhoto: "📸 படம் எடு",
    remove: "நீக்கு",
    clearAll: "அனைத்தும் நீக்கு",
    langBtn: "English",

    trip: "பயணம் (Trip)",
    chooseTrip: "பயணத்தை தேர்வு செய்",
    species: "மீன் வகை",
    chooseSpecies: "மீன் வகை தேர்வு செய்",

    scanTitle: "QR ஸ்கேன்",
    scanHint: "Trip + Fish தேர்வு செய்த பிறகு QR ஸ்கேன் செய்யலாம்",
    scanReady: "கேமரா திறந்து பல QR ஸ்கேன் செய்யுங்கள்",
    scannedList: "Scanned QRs",
    scanCount: (n: number) => `மொத்தம்: ${n}`,
    camDenied: "Camera permission அனுமதி இல்லை",
    grantCam: "Camera அனுமதி கொடு",

    locTitle: "Live Location",
    locGetting: "Location எடுக்கிறது...",
    locDenied: "Location permission இல்லை",
    locGrant: "Location அனுமதி கொடு",
    locRetry: "Retry location",

    dateTime: "Date & Time (Auto)",
    date: "தேதி",
    time: "நேரம்",
    autoHint: "Save அழுத்தும் நேரத்தில் Date/Time auto ஆக capture ஆகும்.",

    saved: "சேமிக்கப்பட்டது ✅",
    offlineSaved: "இணையம் இல்லை. Local-ல் save பண்ணிட்டோம். Net வந்தவுடன் auto sync ஆகும்.",
    syncing: "Syncing pending...",
    pending: "Pending sync",

    fishLoading: "மீன் வகைகள் ஏற்றுகிறது...",

    errTrip: "பயணத்தை தேர்வு செய்யவும்",
    errSpecies: "மீன் வகையை தேர்வு செய்யவும்",
    errQr: "குறைந்தது 1 QR ஸ்கேன் செய்யவும்",

    batchResult: (ok: number, fail: number) => `Uploaded: ${ok}\nQueued/Failed: ${fail}`,
    offlineFish: "Offline: cached fish list காட்டுகிறது",
    offlineFishFallback: "Offline: dummy fish list காட்டுகிறது",
  },
  en: {
    title: "Catch Log",
    sub: "Select Trip + Fish → Scan multiple QRs → Auto Date/Time → Photo → Save ✅",
    step: (n: number) => `Step ${n}/4`,
    next: "Next",
    back: "Back",
    save: "Save",
    required: "Required",
    addPhoto: "📸 Capture Photo",
    remove: "Remove",
    clearAll: "Clear all",
    langBtn: "தமிழ்",

    trip: "Trip",
    chooseTrip: "Choose trip",
    species: "Species",
    chooseSpecies: "Choose species",

    scanTitle: "Scan QR",
    scanHint: "Scan QR after selecting Trip + Fish",
    scanReady: "Open camera and scan multiple QRs",
    scannedList: "Scanned QRs",
    scanCount: (n: number) => `Total: ${n}`,
    camDenied: "Camera permission denied",
    grantCam: "Grant camera access",

    locTitle: "Live Location",
    locGetting: "Getting location...",
    locDenied: "Location permission denied",
    locGrant: "Grant location access",
    locRetry: "Retry location",

    dateTime: "Date & Time (Auto)",
    date: "Date",
    time: "Time",
    autoHint: "Date/Time will be captured automatically when you press Save.",

    saved: "Saved ✅",
    offlineSaved: "No internet. Saved locally. Will auto-sync when network returns.",
    syncing: "Syncing pending...",
    pending: "Pending sync",

    fishLoading: "Loading fish types...",

    errTrip: "Please choose trip",
    errSpecies: "Please choose species",
    errQr: "Please scan at least 1 QR",

    batchResult: (ok: number, fail: number) => `Uploaded: ${ok}\nQueued/Failed: ${fail}`,
    offlineFish: "Offline: showing cached fish list",
    offlineFishFallback: "Offline: showing dummy fish list",
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

function isNetworkishError(msg: string) {
  const m = (msg || "").toLowerCase();
  return (
    m.includes("network") ||
    m.includes("failed to fetch") ||
    m.includes("timeout") ||
    m.includes("socket") ||
    m.includes("econn") ||
    m.includes("offline")
  );
}

/** ✅ Convert local payload to backend-safe payload (snake_case + camelCase both) */
function toBackendPayload(p: LocalCatchLogPayload) {
  return {
    ...p,

    // duplicates for backend safety
    linked_crate_id: (p as any).linkedCrateId,
    trip_id: (p as any).tripId,
    fish_id: (p as any).fishId,
    rv_vessel_id: (p as any).rvVesselId,
    owner_id: (p as any).ownerId,
    catch_date: (p as any).catchDate,
    catch_time: (p as any).catchTime,
  };
}

/* ---------------- UI COMPONENTS ---------------- */
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <View className={`rounded-2xl border ${UI.border} bg-white ${className}`}>{children}</View>;
}
function FieldCard({ children }: { children: React.ReactNode }) {
  return <View className={`rounded-2xl border ${UI.border} bg-white px-4 py-3`}>{children}</View>;
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
      <Text className={`mt-1 text-base ${value ? UI.text : "text-[#b1a59a]"}`}>{value || placeholder}</Text>
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
          <Pressable onPress={() => sheetRef.current?.dismiss()} className="rounded-full px-3 py-2 active:opacity-80">
            <Text style={{ color: UI.accent }} className="text-sm font-semibold">
              Done
            </Text>
          </Pressable>
        </View>

        <View className={`mt-3 rounded-2xl border ${UI.border} bg-[#fbf6f1] px-3 py-2`}>
          <TextInput value={q} onChangeText={setQ} placeholder={searchPlaceholder} className={`text-base ${UI.text}`} />
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

  const meState = useAppSelector((s: any) => s.me);
  const meUser = meState?.user || meState?.data || meState?.me || meState || null;

  const [lang, setLang] = useState<Lang>("ta");
  const t = i18n[lang];

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [tripOptions] = useState<TripItem[]>(DUMMY_TRIPS);

  const [fishTypes, setFishTypes] = useState<FishType[]>([]);
  const [fishLoading, setFishLoading] = useState(false);

  const [tripId, setTripId] = useState("");
  const [fishId, setFishId] = useState<number | null>(null);
  const [fishName, setFishName] = useState("");

  const [crateIds, setCrateIds] = useState<string[]>(() => (initialCrateId ? [initialCrateId] : []));
  const crateCount = crateIds.length;

  const [images, setImages] = useState<string[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const [cameraPerm, requestCameraPerm] = useCameraPermissions();
  const [canScan, setCanScan] = useState(true);

  // ✅ numeric owner db id (example: 14)
  const [ownerId, setOwnerId] = useState<number | null>(null);
  const [ownerLoading, setOwnerLoading] = useState(false);

  // Location
  const [locPermGranted, setLocPermGranted] = useState<boolean>(false);
  const [locLoading, setLocLoading] = useState<boolean>(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [liveLoc, setLiveLoc] = useState<LiveLocation | null>(null);
  const locSubRef = useRef<Location.LocationSubscription | null>(null);

  const tripRef = useRef<BottomSheetModal>(null);
  const fishRef = useRef<BottomSheetModal>(null);

  const flushingRef = useRef(false);

  useEffect(() => {
    if (initialCrateId) setStep(3);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    dispatch(fetchMe());
  }, [dispatch]);

  /* ---------- OWNER FETCH (USE json.id = numeric DB id) ---------- */
  const loadOwnerFromLogin = async (): Promise<number | null> => {
    try {
      setOwnerLoading(true);

      const userId = Number(meUser?.id);
      if (!userId || Number.isNaN(userId)) return null;

      const token = await AsyncStorage.getItem("auth_token"); // optional

      const url = `https://rootverse-backend-5qoo.onrender.com/api/owner/fetch/${userId}`;
      const res = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) return null;
      const json = await res.json();

      // ✅ THIS is what your qrs.owner_id expects (FK / numeric)
      const ownerDbId = Number(json?.id);
      if (!ownerDbId || Number.isNaN(ownerDbId)) return null;

      setOwnerId(ownerDbId);
      await writeOwnerCache(ownerDbId);
      return ownerDbId;
    } catch {
      return null;
    } finally {
      setOwnerLoading(false);
    }
  };

  /** ✅ HARD guarantee: owner id from state -> cache -> API (only online) */
  const ensureOwnerId = async (): Promise<number | null> => {
    if (ownerId && ownerId > 0) return ownerId;

    const cached = await readOwnerCache();
    if (cached) {
      setOwnerId(cached);
      return cached;
    }

    if (!isOnline) return null;
    return await loadOwnerFromLogin();
  };

  /* ---------- FISH TYPES (cache first, offline safe) ---------- */
  useEffect(() => {
    let alive = true;

    const loadFish = async () => {
      setFishLoading(true);

      const cached = await readFishCache();
      if (!alive) return;

      if (cached.length > 0) setFishTypes(cached);

      const net = await NetInfo.fetch();
      const online = !!net.isConnected && (net.isInternetReachable ?? true);

      if (!online) {
        if (cached.length === 0) setFishTypes(FALLBACK_FISH_TYPES);
        if (alive) setFishLoading(false);
        return;
      }

      try {
        const fresh = await fetchFishTypesFromApi();
        if (!alive) return;

        if (fresh.length > 0) {
          setFishTypes(fresh);
          await writeFishCache(fresh);
        } else if (cached.length === 0) {
          setFishTypes(FALLBACK_FISH_TYPES);
        }
      } finally {
        if (alive) setFishLoading(false);
      }
    };

    loadFish();

    const unsub = NetInfo.addEventListener((state) => {
      const online = !!state.isConnected && (state.isInternetReachable ?? true);
      if (online) loadFish();
    });

    return () => {
      alive = false;
      unsub();
    };
  }, []);

  const fishPickerOptions: FishOption[] = useMemo(() => {
    return fishTypes
      .filter((f) => typeof f?.id === "number" && fishNameOf(f))
      .map((f) => ({ key: String(f.id), label: fishNameOf(f), id: f.id }));
  }, [fishTypes]);

  const scanEnabled = !!tripId && !!fishId;

  /* ---------- AUTO SYNC QUEUE (BLOCK until owner_id exists, then PATCH + SYNC) ---------- */
  useEffect(() => {
    let alive = true;

    const refreshCount = async () => {
      const c = await getQueueCount();
      if (alive) setPendingCount(c);
    };

    const mapFishId = async (payload: any): Promise<number | null> => {
      if (payload?.fishId && payload.fishId > 0) return payload.fishId;

      const name = String(payload?.fishName || "").trim().toLowerCase();
      if (!name) return null;

      const found = fishTypes.find((f) => fishNameOf(f).toLowerCase() === name);
      if (found?.id && found.id > 0) return found.id;

      const cached = await readFishCache();
      const found2 = cached.find((f) => fishNameOf(f).toLowerCase() === name);
      if (found2?.id && found2.id > 0) return found2.id;

      return null;
    };

    const doFlush = async () => {
      if (flushingRef.current) return;
      flushingRef.current = true;

      setSyncing(true);

      try {
        await refreshCount();

        // optional refresh fish cache
        try {
          const fresh = await fetchFishTypesFromApi();
          if (fresh.length > 0) {
            setFishTypes(fresh);
            await writeFishCache(fresh);
          }
        } catch {}

        // ✅ HARD BLOCK until owner id exists
        const ensuredOwner = await ensureOwnerId();
        if (!ensuredOwner) return;

        await flushQueue(async (payload: any) => {
          const patched: any = { ...(payload || {}) };

          // ✅ patch ownerId ALWAYS before posting
          if (!patched.ownerId) patched.ownerId = ensuredOwner;

          // patch fishId if missing/dummy
          const mapped = await mapFishId(patched);
          if (!mapped || mapped <= 0) throw new Error("fishId mapping failed");
          patched.fishId = mapped;

          await dispatch(submitCatchLog(toBackendPayload(patched) as any)).unwrap();
        });
      } finally {
        await refreshCount();
        if (alive) setSyncing(false);
        flushingRef.current = false;
      }
    };

    refreshCount();

    NetInfo.fetch().then((s) => {
      const online = !!s.isConnected && (s.isInternetReachable ?? true);
      if (!alive) return;
      setIsOnline(online);
      if (online) doFlush();
    });

    const unsub = NetInfo.addEventListener((state) => {
      const online = !!state.isConnected && (state.isInternetReachable ?? true);
      if (!alive) return;
      setIsOnline(online);
      if (online) doFlush();
    });

    return () => {
      alive = false;
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, meUser?.id]);

  useEffect(() => {
    if (!meUser?.id) return;
    if (!isOnline) return;
    loadOwnerFromLogin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meUser?.id, isOnline]);

  /* ---------------- Steps ---------------- */
  const validateStep = () => {
    if (step === 1) {
      if (!tripId) return Alert.alert(t.required, t.errTrip), false;
      if (!fishId) return Alert.alert(t.required, t.errSpecies), false;
      return true;
    }
    if (step === 2) {
      if (crateIds.length === 0) return Alert.alert(t.required, t.errQr), false;
      return true;
    }
    return true;
  };

  const next = () => {
    if (!validateStep()) return;
    setStep((s) => (s === 1 ? 2 : s === 2 ? 3 : 4));
  };
  const back = () => setStep((s) => (s === 4 ? 3 : s === 3 ? 2 : 1));

  /* ---------------- MULTI QR SCAN ---------------- */
  const addCrateId = (id: string) => {
    const value = String(id || "").trim();
    if (!value) return;
    setCrateIds((prev) => (prev.includes(value) ? prev : [...prev, value]));
  };
  const removeCrateId = (id: string) => setCrateIds((prev) => prev.filter((x) => x !== id));
  const clearCrates = () => setCrateIds([]);

  const onBarcodeScanned = (data: string) => {
    if (!scanEnabled) return;
    const value = String(data || "").trim();
    if (!value) return;
    if (!canScan) return;

    setCanScan(false);
    addCrateId(value);
    setTimeout(() => setCanScan(true), 350);
  };

  /* ---------------- Photos ---------------- */
  const captureImageOnly = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return Alert.alert("Permission", "Allow camera access to capture photos.");

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

  const nowPreview = useMemo(() => new Date(), [step, crateCount, tripId, fishId]);

  /* ---------------- LIVE LOCATION (Step 2) ---------------- */
  const stopLocation = () => {
    try {
      locSubRef.current?.remove();
    } catch {}
    locSubRef.current = null;
  };

  const startLocation = async () => {
    setLocError(null);
    setLocLoading(true);

    try {
      const fg = await Location.requestForegroundPermissionsAsync();
      const granted = fg.status === "granted";
      setLocPermGranted(granted);

      if (!granted) {
        setLiveLoc(null);
        setLocError(t.locDenied);
        return;
      }

      const last = await Location.getLastKnownPositionAsync({});
      if (last?.coords) {
        setLiveLoc({
          latitude: last.coords.latitude,
          longitude: last.coords.longitude,
          accuracy: last.coords.accuracy ?? null,
          heading: last.coords.heading ?? null,
          speed: last.coords.speed ?? null,
          capturedAt: new Date(last.timestamp).toISOString(),
        });
      }

      stopLocation();
      locSubRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 2000, distanceInterval: 2 },
        (pos) => {
          const c = pos.coords;
          setLiveLoc({
            latitude: c.latitude,
            longitude: c.longitude,
            accuracy: c.accuracy ?? null,
            heading: c.heading ?? null,
            speed: c.speed ?? null,
            capturedAt: new Date(pos.timestamp).toISOString(),
          });
        }
      );
    } catch (e: any) {
      setLiveLoc(null);
      setLocError(String(e?.message || e));
    } finally {
      setLocLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      if (step !== 2) {
        stopLocation();
        return;
      }
      await startLocation();
      if (!alive) stopLocation();
    })();

    return () => {
      alive = false;
      if (step === 2) stopLocation();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, lang]);

  /* ---------------- SAVE (offline allowed without ownerId) ---------------- */
  const save = async () => {
    if (!tripId) return Alert.alert(t.required, t.errTrip);
    if (!fishId) return Alert.alert(t.required, t.errSpecies);
    if (crateIds.length === 0) return Alert.alert(t.required, t.errQr);

    const now = new Date();

    // ONLINE: must have numeric owner id for immediate post
    // OFFLINE: allowed (queue without ownerId)
    let ownerFinal: number | null = ownerId || (await readOwnerCache());
    if (isOnline && !ownerFinal) ownerFinal = await loadOwnerFromLogin();
    if (isOnline && !ownerFinal) return Alert.alert("Owner", "owner_id (numeric) not loaded");

    const base: LocalCatchLogPayload = {
      tripId,
      fishId,
      fishName: fishName || undefined,
      rvVesselId: 2, // TODO replace real
      ownerId: isOnline ? ownerFinal! : ownerFinal || undefined, // ✅ never null
      catchDate: fmtDate(now),
      catchTime: fmtTime(now),
      images,
      ...(liveLoc ? { latitude: liveLoc.latitude, longitude: liveLoc.longitude } : {}),
    } as any;

    const payloads: LocalCatchLogPayload[] = crateIds.map(
      (cid) => ({ ...base, linkedCrateId: cid } as any)
    );

    // OFFLINE: queue
    if (!isOnline) {
      for (const p of payloads) await enqueueCatchLog(p as any);
      const c = await getQueueCount();
      setPendingCount(c);

      Alert.alert(t.saved, t.offlineSaved);
      router.replace({ pathname: "/catch-logs/details", params: { crateId: crateIds[0] } });
      return;
    }

    // ONLINE: send, if network fails -> queue remaining
    let ok = 0;
    let fail = 0;

    for (let i = 0; i < payloads.length; i++) {
      const p = payloads[i];
      try {
        await dispatch(submitCatchLog(toBackendPayload(p) as any)).unwrap();
        ok++;
      } catch (e: any) {
        const msg = String(e?.message || e);
        if (isNetworkishError(msg)) {
          const remaining = payloads.slice(i);
          for (const rp of remaining) await enqueueCatchLog(rp as any);
          fail += remaining.length;

          const c = await getQueueCount();
          setPendingCount(c);

          Alert.alert(t.saved, `${t.offlineSaved}\n\n${t.batchResult(ok, fail)}`);
          router.replace({ pathname: "/catch-logs/details", params: { crateId: crateIds[0] } });
          return;
        }
        fail++;
      }
    }

    const c = await getQueueCount();
    setPendingCount(c);

    if (fail === 0) Alert.alert(t.saved, `✅ ${t.scanCount(ok)}`);
    else Alert.alert("Partial", t.batchResult(ok, fail));

    router.replace({ pathname: "/catch-logs/details", params: { crateId: crateIds[0] } });
  };

  const fishCacheStatusText = useMemo(() => {
    if (isOnline) return null;
    const hasRealCache = fishTypes.some((f) => f.id > 0);
    return hasRealCache ? t.offlineFish : t.offlineFishFallback;
  }, [isOnline, fishTypes, t.offlineFish, t.offlineFishFallback]);

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
            <Text className={`text-xs ${UI.muted}`}>{t.scannedList}</Text>
            <Text className={`mt-1 text-base font-extrabold ${UI.text}`}>
              {crateCount ? t.scanCount(crateCount) : "—"}
            </Text>
          </View>

          <View className={`mt-3 rounded-xl border ${UI.chipBorder} ${UI.chipBg} px-3 py-2`}>
            <Text className={`text-xs font-semibold ${UI.text}`}>{t.step(step)}</Text>
          </View>

          {/* Owner status */}
          <View className="mt-3">
            <Text className={`text-[11px] ${UI.muted}`}>
              Owner(DB id):{" "}
              <Text className="font-bold" style={{ color: ownerId ? "#1f7a3f" : "#b45309" }}>
                {ownerId ? String(ownerId) : ownerLoading ? "loading..." : "not loaded"}
              </Text>
            </Text>
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

            {fishCacheStatusText ? (
              <View className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                <Text className="text-xs font-semibold text-amber-800">{fishCacheStatusText}</Text>
              </View>
            ) : null}

            {fishLoading ? (
              <View className="mt-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2">
                <Text className="text-xs font-semibold text-blue-800">{t.fishLoading}</Text>
              </View>
            ) : null}
          </View>
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
              <Pressable onPress={() => tripRef.current?.dismiss()} className="rounded-full px-3 py-2 active:opacity-80">
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

        {/* STEP 1 */}
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
                hint={fishLoading ? t.fishLoading : `Tap ▾ (${fishPickerOptions.length})`}
                onPress={() => {
                  if (!fishLoading) fishRef.current?.present();
                }}
              />
            </FieldCard>

            <Pressable
              onPress={() => {
                if (!tripId) return Alert.alert(t.required, t.errTrip);
                if (!fishId) return Alert.alert(t.required, t.errSpecies);
                setStep(2);
              }}
              className="mt-2 rounded-2xl px-4 py-4 active:opacity-90"
              style={{ backgroundColor: UI.accent, opacity: fishLoading ? 0.7 : 1 }}
              disabled={fishLoading}
            >
              <Text className="text-center text-white text-base font-extrabold">{t.next}</Text>
            </Pressable>
          </View>
        ) : null}

        {/* STEP 2 */}
        {step === 2 ? (
          <View className="mt-4 gap-3">
            <Card className="p-4">
              <View className="flex-row items-center gap-2">
                <Ionicons name="qr-code-outline" size={20} color={UI.accent} />
                <Text className={`text-sm font-extrabold ${UI.text}`}>{t.scanTitle}</Text>
              </View>

              <Text className={`mt-1 text-[11px] ${UI.muted}`}>{scanEnabled ? t.scanReady : t.scanHint}</Text>

              {/* Camera */}
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
                  </View>
                )}
              </View>

              {/* Scanned list */}
              <View className="mt-3">
                <View className="flex-row items-center justify-between">
                  <Text className={`text-sm font-extrabold ${UI.text}`}>
                    {t.scannedList} • {t.scanCount(crateCount)}
                  </Text>

                  {crateCount > 0 ? (
                    <Pressable
                      onPress={clearCrates}
                      className="rounded-full border border-[#ead7c8] bg-white px-3 py-2 active:opacity-80"
                    >
                      <Text className={`text-xs font-semibold ${UI.text}`}>{t.clearAll}</Text>
                    </Pressable>
                  ) : null}
                </View>

                {crateCount === 0 ? (
                  <View className={`mt-2 rounded-xl border ${UI.border} bg-[#fbf6f1] px-3 py-2`}>
                    <Text className={`text-xs ${UI.muted}`}>{t.errQr}</Text>
                  </View>
                ) : (
                  <View className="mt-2 gap-2">
                    {crateIds.map((cid) => (
                      <View
                        key={cid}
                        className={`flex-row items-center justify-between rounded-xl border ${UI.border} bg-[#fbf6f1] px-3 py-2`}
                      >
                        <Text className={`flex-1 text-xs font-semibold ${UI.text}`} numberOfLines={1}>
                          {cid}
                        </Text>
                        <Pressable
                          onPress={() => removeCrateId(cid)}
                          className="ml-3 rounded-full bg-rose-100 px-3 py-1 active:opacity-80"
                        >
                          <Text className="text-xs font-semibold text-rose-700">{t.remove}</Text>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}
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
                style={{ backgroundColor: UI.accent, opacity: crateCount > 0 ? 1 : 0.6 }}
                onPress={() => setStep(3)}
                disabled={crateCount === 0}
              >
                <Text className="text-center text-white text-base font-extrabold">{t.next}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* STEP 3 */}
        {step === 3 ? (
          <View className="mt-4 gap-3">
            <Card className="p-4">
              <View className="flex-row items-center gap-2">
                <Ionicons name="time-outline" size={20} color={UI.accent} />
                <Text className={`text-sm font-extrabold ${UI.text}`}>{t.dateTime}</Text>
              </View>

              <View className={`mt-3 rounded-xl border ${UI.border} bg-[#fbf6f1] px-3 py-3`}>
                <Text className={`text-xs ${UI.muted}`}>{t.date}</Text>
                <Text className={`mt-1 text-base font-extrabold ${UI.text}`}>{fmtDate(nowPreview)}</Text>

                <View className="mt-3 h-[1px] bg-[#ead7c8]" />

                <Text className={`mt-3 text-xs ${UI.muted}`}>{t.time}</Text>
                <Text className={`mt-1 text-base font-extrabold ${UI.text}`}>{fmtTime(nowPreview)}</Text>

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
                onPress={() => setStep(4)}
              >
                <Text className="text-center text-white text-base font-extrabold">{t.next}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* STEP 4 */}
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
                disabled={posting || ownerLoading}
              >
                <Text className={`text-center ${UI.text} text-base font-extrabold`}>{t.back}</Text>
              </Pressable>

              <Pressable
                className="flex-1 rounded-2xl px-4 py-4 active:opacity-90"
                style={{ backgroundColor: UI.accent, opacity: posting || ownerLoading ? 0.7 : 1 }}
                onPress={save}
                disabled={posting || ownerLoading || crateCount === 0}
              >
                <Text className="text-center text-white text-base font-extrabold">
                  {ownerLoading
                    ? "Loading owner..."
                    : posting
                    ? lang === "ta"
                      ? "சேமிக்கிறது..."
                      : "Saving..."
                    : `${t.save} (${crateCount})`}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
