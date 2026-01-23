// app/(wild)/catch-logs/create.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import * as ImagePicker from "expo-image-picker";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import NetInfo from "@react-native-community/netinfo";

// ✅ live location
import * as Location from "expo-location";

// ✅ token storage (kept, even if owner endpoint doesn't require it)
import AsyncStorage from "@react-native-async-storage/async-storage";

// ✅ Redux
import { useAppDispatch, useAppSelector } from "../../../src/store/hooks";
import { submitCatchLog } from "../../../src/services/wild/catchLog.slice";

// ✅ get logged-in user id
import { fetchMe } from "../../../src/store/auth/me.slice";

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

type LiveLocation = {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  capturedAt: string; // ISO
};

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
    fishFailed: "மீன் வகைகள் பெற முடியவில்லை",

    errTrip: "பயணத்தை தேர்வு செய்யவும்",
    errSpecies: "மீன் வகையை தேர்வு செய்யவும்",
    errQr: "குறைந்தது 1 QR ஸ்கேன் செய்யவும்",

    batchResult: (ok: number, fail: number) => `Uploaded: ${ok}\nQueued/Failed: ${fail}`,
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
    fishFailed: "Failed to load fish types",

    errTrip: "Please choose trip",
    errSpecies: "Please choose species",
    errQr: "Please scan at least 1 QR",

    batchResult: (ok: number, fail: number) => `Uploaded: ${ok}\nQueued/Failed: ${fail}`,
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

  // ✅ logged in user from me.slice
  const meState = useAppSelector((s: any) => s.me);
  const meUser = meState?.user || meState?.data || meState?.me || meState || null;

  const [lang, setLang] = useState<Lang>("ta");
  const t = i18n[lang];

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  const [tripOptions] = useState<TripItem[]>(DUMMY_TRIPS);

  const [fishTypes, setFishTypes] = useState<FishType[]>([]);
  const [fishLoading, setFishLoading] = useState(false);
  const [fishError, setFishError] = useState<string | null>(null);

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

  // ✅ OWNER BUSINESS CODE (owner_id like "OWN-0001")
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [ownerLoading, setOwnerLoading] = useState(false);

  // ✅ Location
  const [locPermGranted, setLocPermGranted] = useState<boolean>(false);
  const [locLoading, setLocLoading] = useState<boolean>(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [liveLoc, setLiveLoc] = useState<LiveLocation | null>(null);
  const locSubRef = useRef<Location.LocationSubscription | null>(null);

  const tripRef = useRef<BottomSheetModal>(null);
  const fishRef = useRef<BottomSheetModal>(null);

  useEffect(() => {
    if (initialCrateId) setStep(3);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ load me on mount
  useEffect(() => {
    dispatch(fetchMe());
  }, [dispatch]);

  // ✅ AUTO SYNC
  useEffect(() => {
    let alive = true;

    const refreshCount = async () => {
      const c = await getQueueCount();
      if (alive) setPendingCount(c);
    };

    const doFlush = async () => {
      setSyncing(true);
      try {
        await flushQueue(async (payload: CatchLogPayload) => {
          await dispatch(submitCatchLog(payload as any)).unwrap();
        });
      } finally {
        await refreshCount();
        if (alive) setSyncing(false);
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
  }, [dispatch]);

  // ✅ Fetch owner business code: owner_id ("OWN-0001") using login user id
  const loadOwnerFromLogin = async (): Promise<string | null> => {
    try {
      setOwnerLoading(true);

      const userId = Number(meUser?.id);
      if (!userId || Number.isNaN(userId)) {
        Alert.alert("Owner", "Login user id not available (me.id missing)");
        return null;
      }

      const token = await AsyncStorage.getItem("auth_token"); // optional header if backend needs

      const url = `https://rootverse-backend-5qoo.onrender.com/api/owner/fetch/${userId}`;
      const res = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        Alert.alert("OWNER FETCH FAILED", `${res.status} ${txt || "Owner fetch failed"}`);
        return null;
      }

      const json = await res.json();

      // ✅ YOU NEED THIS (owner_id)
      const ownerCode = json?.owner_id ? String(json.owner_id) : "";

      if (!ownerCode) {
        Alert.alert("OWNER ERROR", "owner_id missing in response");
        return null;
      }

      setOwnerId(ownerCode);
      return ownerCode;
    } catch (e: any) {
      Alert.alert("OWNER ERROR", String(e?.message || e));
      return null;
    } finally {
      setOwnerLoading(false);
    }
  };

  // Fetch owner when meUser.id is ready
  useEffect(() => {
    if (!meUser?.id) return;
    loadOwnerFromLogin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meUser?.id]);

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
        const list: FishType[] = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];

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
      .map((f) => ({ key: String(f.id), label: fishNameOf(f), id: f.id }));
  }, [fishTypes]);

  const scanEnabled = !!tripId && !!fishId;

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

    setCrateIds((prev) => {
      if (prev.includes(value)) return prev;
      return [...prev, value];
    });
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

  // Auto preview (readonly UI only)
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
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 2000,
          distanceInterval: 2,
        },
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

  // Start location ONLY when step 2 is active
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

  /* ---------------- SAVE BATCH ---------------- */
  const save = async () => {
    if (!tripId) return Alert.alert(t.required, t.errTrip);
    if (!fishId) return Alert.alert(t.required, t.errSpecies);
    if (crateIds.length === 0) return Alert.alert(t.required, t.errQr);

    // ✅ GUARANTEE owner business code "OWN-0001"
    let ownerFinal = ownerId;
    if (!ownerFinal) ownerFinal = await loadOwnerFromLogin();
    if (!ownerFinal) return Alert.alert("Owner", "owner_id not loaded from login");

    const now = new Date();
    const base = {
      tripId,
      fishId,
      rvVesselId: 2, // TODO: replace with real
      ownerId: ownerFinal, // ✅ THIS IS owner_id string
      catchDate: fmtDate(now),
      catchTime: fmtTime(now),
      images,
      ...(liveLoc ? { latitude: liveLoc.latitude, longitude: liveLoc.longitude } : {}),
    };

    const payloads: CatchLogPayload[] = crateIds.map((cid) => ({
      ...(base as any),
      linkedCrateId: cid,
    }));

    if (!isOnline) {
      for (const p of payloads) await enqueueCatchLog(p);
      const c = await getQueueCount();
      setPendingCount(c);

      Alert.alert(t.saved, t.offlineSaved);
      router.replace({ pathname: "/catch-logs/details", params: { crateId: crateIds[0] } });
      return;
    }

    let ok = 0;
    let fail = 0;

    for (let i = 0; i < payloads.length; i++) {
      const p = payloads[i];

      try {
        await dispatch(submitCatchLog(p as any)).unwrap();
        ok++;
      } catch (e: any) {
        const msg = String(e?.message || e);
        if (isNetworkishError(msg)) {
          const remaining = payloads.slice(i);
          for (const rp of remaining) await enqueueCatchLog(rp);
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

          {/* ✅ Owner status (owner_id code) */}
          <View className="mt-3">
            <Text className={`text-[11px] ${UI.muted}`}>
              Owner:{" "}
              <Text className="font-bold" style={{ color: ownerId ? "#1f7a3f" : "#b45309" }}>
                {ownerId ? ownerId : ownerLoading ? "loading..." : "not loaded"}
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

        {/* STEP 2 */}
        {step === 2 ? (
          <View className="mt-4 gap-3">
            <Card className="p-4">
              <View className="flex-row items-center gap-2">
                <Ionicons name="qr-code-outline" size={20} color={UI.accent} />
                <Text className={`text-sm font-extrabold ${UI.text}`}>{t.scanTitle}</Text>
              </View>

              <Text className={`mt-1 text-[11px] ${UI.muted}`}>{scanEnabled ? t.scanReady : t.scanHint}</Text>

              {/* Location */}
              <View className={`mt-3 rounded-2xl border ${UI.border} bg-[#fbf6f1] px-3 py-3`}>
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="location-outline" size={18} color={UI.accent} />
                    <Text className={`text-sm font-extrabold ${UI.text}`}>{t.locTitle}</Text>
                  </View>

                  <Pressable
                    onPress={startLocation}
                    className="rounded-full border border-[#ead7c8] bg-white px-3 py-2 active:opacity-80"
                  >
                    <Text className={`text-xs font-semibold ${UI.text}`}>{locLoading ? "..." : t.locRetry}</Text>
                  </Pressable>
                </View>

                {!locPermGranted && locError ? (
                  <View className="mt-2">
                    <Text className="text-xs font-semibold text-rose-700">{locError}</Text>
                    <Pressable
                      onPress={startLocation}
                      className="mt-2 rounded-2xl px-4 py-3 active:opacity-80"
                      style={{ backgroundColor: UI.accent }}
                    >
                      <Text className="text-center text-white font-extrabold">{t.locGrant}</Text>
                    </Pressable>
                  </View>
                ) : locLoading && !liveLoc ? (
                  <Text className={`mt-2 text-xs ${UI.muted}`}>{t.locGetting}</Text>
                ) : liveLoc ? (
                  <View className="mt-2">
                    <Text className={`text-xs ${UI.muted}`}>Lat / Lng</Text>
                    <Text className={`mt-1 text-sm font-extrabold ${UI.text}`}>
                      {liveLoc.latitude.toFixed(6)}, {liveLoc.longitude.toFixed(6)}
                    </Text>

                    <View className="mt-2 flex-row flex-wrap gap-2">
                      <View className="rounded-full border border-[#ead7c8] bg-white px-3 py-1">
                        <Text className={`text-[11px] ${UI.text}`}>
                          acc: {liveLoc.accuracy ? `${Math.round(liveLoc.accuracy)}m` : "—"}
                        </Text>
                      </View>
                      <View className="rounded-full border border-[#ead7c8] bg-white px-3 py-1">
                        <Text className={`text-[11px] ${UI.text}`}>
                          speed: {liveLoc.speed != null ? `${liveLoc.speed.toFixed(1)} m/s` : "—"}
                        </Text>
                      </View>
                      <View className="rounded-full border border-[#ead7c8] bg-white px-3 py-1">
                        <Text className={`text-[11px] ${UI.text}`}>
                          time: {new Date(liveLoc.capturedAt).toLocaleTimeString()}
                        </Text>
                      </View>
                    </View>
                  </View>
                ) : locError ? (
                  <Text className="mt-2 text-xs font-semibold text-rose-700">{locError}</Text>
                ) : (
                  <Text className={`mt-2 text-xs ${UI.muted}`}>{t.locGetting}</Text>
                )}
              </View>

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
                    <View className="absolute bottom-0 left-0 right-0 p-3 bg-black/60">
                      <Text className="text-white text-xs">
                        Trip: <Text className="font-bold">{tripId || "—"}</Text> | Fish:{" "}
                        <Text className="font-bold">{fishName || "—"}</Text>
                      </Text>
                      <Text className="text-white text-[11px] mt-1">
                        {scanEnabled
                          ? "Scan QRs one by one. They will be added to the list."
                          : "Select Trip + Fish first (Back)."}
                      </Text>
                    </View>
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
              <Pressable className={`flex-1 rounded-2xl border ${UI.border} bg-white px-4 py-4 active:opacity-80`} onPress={back}>
                <Text className={`text-center ${UI.text} text-base font-extrabold`}>{t.back}</Text>
              </Pressable>

              <Pressable
                className="flex-1 rounded-2xl px-4 py-4 active:opacity-90"
                style={{ backgroundColor: UI.accent, opacity: crateCount > 0 ? 1 : 0.6 }}
                onPress={next}
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

                <View className={`mt-3 rounded-xl border ${UI.border} bg-white px-3 py-2`}>
                  <Text className={`text-xs ${UI.muted}`}>{t.scannedList}</Text>
                  <Text className={`mt-1 text-sm font-extrabold ${UI.text}`}>{t.scanCount(crateCount)}</Text>
                </View>
              </View>
            </Card>

            <View className="mt-2 flex-row gap-3">
              <Pressable className={`flex-1 rounded-2xl border ${UI.border} bg-white px-4 py-4 active:opacity-80`} onPress={back}>
                <Text className={`text-center ${UI.text} text-base font-extrabold`}>{t.back}</Text>
              </Pressable>

              <Pressable className="flex-1 rounded-2xl px-4 py-4 active:opacity-90" style={{ backgroundColor: UI.accent }} onPress={next}>
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

              <View className={`mt-2 rounded-xl border ${UI.border} bg-[#fbf6f1] px-3 py-2`}>
                <Text className={`text-xs ${UI.muted}`}>{t.scannedList}</Text>
                <Text className={`mt-1 text-base font-extrabold ${UI.text}`}>{t.scanCount(crateCount)}</Text>
                <Text className={`mt-1 text-[11px] ${UI.muted}`}>
                  (This will create {crateCount} catch log(s) using same Trip + Fish + Photos)
                </Text>
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
