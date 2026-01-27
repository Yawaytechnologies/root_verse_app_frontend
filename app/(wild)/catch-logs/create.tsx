// app/(wild)/catch-logs/create.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  AppState,
} from "react-native";

import * as ImagePicker from "expo-image-picker";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import NetInfo from "@react-native-community/netinfo";

import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useAppDispatch, useAppSelector } from "../../../src/store/hooks";
import { submitCatchLog } from "../../../src/services/wild/catchLog.slice";

import {
  enqueueCatchLog,
  flushQueue,
  getQueueCount,
  type CatchLogPayload,
} from "../../../src/utils/offlineQueue";

/* ---------------- CONFIG ---------------- */
const API_BASE = "https://rootverse-backend-5qoo.onrender.com";

/* ---------------- TYPES ---------------- */
type Lang = "ta" | "en";

type FishType = {
  id: number;
  fish_name: string;
};

type PickerItem = { key: string; label: string };

type LiveLocation = {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  capturedAt: string;
};

type QrKind = "CRATE" | "VESSEL" | "UNKNOWN";
type ScannedQr = { id: string; kind: QrKind };

/** Backend expects numeric owner db id */
type LocalCatchLogPayload = Omit<CatchLogPayload, "ownerId"> & {
  ownerId?: number;
  fishName?: string;
  rvVesselCode?: string;
  qrKind?: QrKind;
};

/** Vessel/Trip returned from API can be anything, we normalize */
type Vessel = any;
type Trip = any;

/* ---------------- CACHE KEYS ---------------- */
const FISH_CACHE_KEY = "rv_fish_types_cache_v1";

// ✅ owner cache per-login user
const OWNER_DBID_CACHE_PREFIX = "rv_owner_db_id_cache_user_"; // + userId
const OWNER_CODE_CACHE_PREFIX = "rv_owner_code_cache_user_"; // + userId

const CAMERA_SESSION_KEY = "rv_camera_session_v1";
const TOKEN_KEY = "auth_token";

// ✅ offline cache like fish-types
const VESSEL_CACHE_PREFIX = "rv_vessels_cache_owner_"; // + ownerDbId
const TRIP_CACHE_PREFIX = "rv_approved_trips_cache_owner_"; // + ownerCode

/* ---------------- UI / i18n ---------------- */
const i18n = {
  ta: {
    title: "பிடிப்பு பதிவு",
    sub: "Vessel + Approved Trip + Fish → பல QR ஸ்கேன் → Auto Date/Time → Photo → Save ✅",
    step: (n: number) => `படி ${n}/4`,
    next: "அடுத்து",
    back: "மீண்டும்",
    save: "சேமி",
    required: "அவசியம்",
    clearAll: "அனைத்தும் நீக்கு",
    remove: "நீக்கு",
    langBtn: "English",

    vessel: "Vessel",
    chooseVessel: "Vessel தேர்வு செய்",

    trip: "Approved Trip",
    chooseTrip: "Approved Trip தேர்வு செய்",

    species: "மீன் வகை",
    chooseSpecies: "மீன் வகை தேர்வு செய்",

    scanTitle: "QR ஸ்கேன்",
    scanHint: "Vessel + Trip + Fish தேர்வு செய்த பிறகு QR ஸ்கேன் செய்யலாம்",
    scanReady: "கேமரா திறந்து பல QR ஸ்கேன் செய்யுங்கள்",
    scannedList: "Scanned QRs",
    scanCount: (n: number) => `மொத்தம்: ${n}`,
    errVessel: "Vessel தேர்வு செய்யவும்",
    errTrip: "Approved Trip தேர்வு செய்யவும்",
    errSpecies: "மீன் வகையை தேர்வு செய்யவும்",
    errQr: "குறைந்தது 1 QR ஸ்கேன் செய்யவும்",

    camDenied: "Camera permission அனுமதி இல்லை",
    grantCam: "Camera அனுமதி கொடு",

    addPhoto: "📸 படம் எடு",

    dateTime: "Date & Time (Auto)",
    date: "தேதி",
    time: "நேரம்",
    autoHint: "Save அழுத்தும் நேரத்தில் Date/Time auto ஆக capture ஆகும்.",

    saved: "சேமிக்கப்பட்டது ✅",
    offlineSaved:
      "இணையம் இல்லை. Local-ல் save பண்ணிட்டோம். Net வந்தவுடன் auto sync ஆகும்.",
    syncing: "Syncing pending...",
    pending: "Pending sync",

    loadingOwner: "Owner loading...",
    loadingVessel: "Vessels loading...",
    loadingTrips: "Approved trips loading...",
    loadingFish: "Fish types loading...",

    noVessels: "இந்த owner-க்கு vessels இல்லை (backend check பண்ணு)",
    noTrips: " இந்த owner-க்கு APPROVED trips இல்லை",
  },
  en: {
    title: "Catch Log",
    sub: "Vessel + Approved Trip + Fish → Scan multiple QRs → Auto Date/Time → Photo → Save ✅",
    step: (n: number) => `Step ${n}/4`,
    next: "Next",
    back: "Back",
    save: "Save",
    required: "Required",
    clearAll: "Clear all",
    remove: "Remove",
    langBtn: "தமிழ்",

    vessel: "Vessel",
    chooseVessel: "Choose vessel",

    trip: "Approved Trip",
    chooseTrip: "Choose approved trip",

    species: "Species",
    chooseSpecies: "Choose species",

    scanTitle: "Scan QR",
    scanHint: "Scan QR after selecting Vessel + Trip + Fish",
    scanReady: "Open camera and scan multiple QRs",
    scannedList: "Scanned QRs",
    scanCount: (n: number) => `Total: ${n}`,
    errVessel: "Please choose vessel",
    errTrip: "Please choose approved trip",
    errSpecies: "Please choose species",
    errQr: "Please scan at least 1 QR",

    camDenied: "Camera permission denied",
    grantCam: "Grant camera access",

    addPhoto: "📸 Capture Photo",

    dateTime: "Date & Time (Auto)",
    date: "Date",
    time: "Time",
    autoHint: "Date/Time will be captured automatically when you press Save.",

    saved: "Saved ✅",
    offlineSaved: "No internet. Saved locally. Will auto-sync when network returns.",
    syncing: "Syncing pending...",
    pending: "Pending sync",

    loadingOwner: "Loading owner...",
    loadingVessel: "Loading vessels...",
    loadingTrips: "Loading approved trips...",
    loadingFish: "Loading fish types...",

    noVessels: "No vessels for this owner (check backend)",
    noTrips: "No APPROVED trips for this owner",
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

        <View
          className={`mt-3 rounded-2xl border ${UI.border} bg-[#fbf6f1] px-3 py-2`}
        >
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
                  active
                    ? `bg-[#fff3e7] border-[#ffd9b6]`
                    : `${UI.border} bg-white`
                }`}
              >
                <Text className={`text-sm font-semibold ${UI.text}`}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

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

function classifyQr(id: string): QrKind {
  const v = String(id || "").trim().toUpperCase();
  if (!v) return "UNKNOWN";
  if (v.startsWith("RV-VESSEL-") || v.startsWith("RV-VES-")) return "VESSEL";
  if (
    v.startsWith("RV-CRATE-") ||
    v.startsWith("CRATE-") ||
    v.startsWith("RV-BOX-")
  )
    return "CRATE";
  return "UNKNOWN";
}

function normalizeList(json: any): any[] {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json?.rows)) return json.rows;
  return [];
}

function normalizeOwnerCode(code: string) {
  const c = String(code || "").trim().toUpperCase();

  if (/^OWN-\d{4}$/.test(c)) return c;

  const m1 = c.match(/^OWN-?0*(\d+)$/);
  if (m1?.[1]) return `OWN-${String(m1[1]).padStart(4, "0")}`;

  const m2 = c.match(/^OWN\D*0*(\d+)$/);
  if (m2?.[1]) return `OWN-${String(m2[1]).padStart(4, "0")}`;

  return c;
}

function padOwnFromDbId(ownerDbId: number) {
  // Fallback (works only if your system uses db id numbering for OWN code)
  // Example: id=51 -> OWN-0051
  if (!ownerDbId || ownerDbId <= 0) return "";
  return `OWN-${String(ownerDbId).padStart(4, "0")}`;
}

function deepFindOwnCode(obj: any): string {
  // Find any string that looks like OWN-xxxx inside nested response
  try {
    const seen = new WeakSet<object>();
    const q: any[] = [obj];

    while (q.length) {
      const cur = q.shift();

      if (!cur) continue;

      if (typeof cur === "string") {
        const s = cur.trim();
        if (/^OWN/i.test(s)) return s;
        continue;
      }

      if (typeof cur !== "object") continue;

      if (seen.has(cur)) continue;
      seen.add(cur);

      for (const [k, v] of Object.entries(cur)) {
        if (typeof v === "string") {
          const vs = v.trim();
          const kl = String(k).toLowerCase();
          if (
            (kl.includes("owner") && kl.includes("code") && vs) ||
            /^OWN/i.test(vs)
          ) {
            return vs;
          }
        } else if (v && typeof v === "object") {
          q.push(v);
        }
      }
    }
  } catch {}
  return "";
}

async function authHeaders() {
  const a = await AsyncStorage.getItem("auth_token");
  const b = await AsyncStorage.getItem("token");
  const c = await AsyncStorage.getItem("access_token");

  console.log("[TOKEN]", {
    auth_token: a?.length ?? 0,
    token: b?.length ?? 0,
    access_token: c?.length ?? 0,
  });

  const token = a || b || c || "";

  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/* ---- VESSEL FIELD MAPPING ---- */
function vesselDbId(v: Vessel): number | null {
  const n =
    Number(v?.id) ||
    Number(v?.rv_vessel_id) ||
    Number(v?.rvVesselId) ||
    Number(v?.vessel_id) ||
    Number(v?.vesselId) ||
    Number(v?.linked_vessel_id) ||
    Number(v?.linkedVesselId) ||
    0;
  return n > 0 ? n : null;
}
function vesselCode(v: Vessel): string {
  return String(
    v?.rv_vessel_id ||
      v?.rvVesselId ||
      v?.vessel_code ||
      v?.rv_vessel_code ||
      v?.rvVesselCode ||
      ""
  ).trim();
}
function vesselLabel(v: Vessel): string {
  return vesselCode(v);
}

/* ---- TRIP FIELD MAPPING ---- */
function tripKey(tr: any): string {
  const key = String(
    tr?.trip_id || tr?.tripId || tr?.trip_code || tr?.id || ""
  ).trim();
  return key;
}

function tripLabel(tr: Trip): string {
  const code = String(
    tr?.trip_id || tr?.tripId || tr?.trip_code || tr?.tripCode || tr?.id || ""
  ).trim();
  const port = String(
    tr?.near_station || tr?.port || tr?.landing_port || tr?.landingPort || ""
  ).trim();
  const date =
    String(tr?.planned_at || tr?.trip_date || tr?.tripDate || tr?.created_at || "")
      .trim() || "";
  return `${code}${port ? ` • ${port}` : ""}${
    date ? ` • ${date.substring(0, 10)}` : ""
  }`;
}

/* ---------------- OWNER CACHE (PER LOGIN USER) ---------------- */
function ownerDbIdCacheKey(userId: number) {
  return `${OWNER_DBID_CACHE_PREFIX}${userId}`;
}
function ownerCodeCacheKey(userId: number) {
  return `${OWNER_CODE_CACHE_PREFIX}${userId}`;
}

async function readOwnerCacheByUser(userId: number): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(ownerDbIdCacheKey(userId));
    const v = String(raw || "").trim();
    if (!v) return null;
    if (!/^\d+$/.test(v)) return null;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}
async function writeOwnerCacheByUser(userId: number, ownerDbId: number) {
  try {
    await AsyncStorage.setItem(ownerDbIdCacheKey(userId), String(ownerDbId));
  } catch {}
}
async function readOwnerCodeCacheByUser(userId: number): Promise<string> {
  try {
    return String((await AsyncStorage.getItem(ownerCodeCacheKey(userId))) || "").trim();
  } catch {
    return "";
  }
}
async function writeOwnerCodeCacheByUser(userId: number, code: string) {
  try {
    const v = normalizeOwnerCode(code);
    if (v) await AsyncStorage.setItem(ownerCodeCacheKey(userId), v);
  } catch {}
}

/* ---------------- FISH CACHE ---------------- */
const fishNameOf = (f: FishType) => String(f?.fish_name || "").trim();

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
  const res = await fetch(`${API_BASE}/api/fish-types`);
  if (!res.ok) return [];
  const json = await res.json();
  const list: FishType[] = normalizeList(json) as any;
  return list
    .filter((f) => typeof f?.id === "number" && fishNameOf(f))
    .map((f) => ({ id: f.id, fish_name: fishNameOf(f) }));
}

/* ---------------- VESSEL CACHE ---------------- */
function vesselCacheKey(ownerDbId: number) {
  return `${VESSEL_CACHE_PREFIX}${ownerDbId}`;
}
async function readVesselCache(ownerDbId: number): Promise<Vessel[]> {
  try {
    const raw = await AsyncStorage.getItem(vesselCacheKey(ownerDbId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
async function writeVesselCache(ownerDbId: number, list: Vessel[]) {
  try {
    await AsyncStorage.setItem(
      vesselCacheKey(ownerDbId),
      JSON.stringify(list || [])
    );
  } catch {}
}

/* ---------------- TRIP CACHE ---------------- */
function tripCacheKey(ownerCode: string) {
  return `${TRIP_CACHE_PREFIX}${normalizeOwnerCode(String(ownerCode || ""))}`;
}
async function readTripCache(ownerCode: string): Promise<Trip[]> {
  try {
    const k = tripCacheKey(ownerCode);
    const raw = await AsyncStorage.getItem(k);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
async function writeTripCache(ownerCode: string, list: Trip[]) {
  try {
    const k = tripCacheKey(ownerCode);
    await AsyncStorage.setItem(k, JSON.stringify(list || []));
  } catch {}
}

/* ---------------- MAIN SCREEN ---------------- */
export default function CreateCatchLog() {
  const params = useLocalSearchParams<{ crateId?: string }>();
  const initialQr = String(params?.crateId || "").trim();

  const dispatch = useAppDispatch();
  const posting = !!useAppSelector((s: any) => s.catchLog?.loading);

  const meState = useAppSelector((s: any) => s.me);
  const meUser = meState?.user || meState?.data || meState?.me || meState || null;

  const [lang, setLang] = useState<Lang>("ta");
  const t = i18n[lang];

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Owner DB id + code
  const [ownerId, setOwnerId] = useState<number | null>(null);
  const [ownerCode, setOwnerCode] = useState<string>("");
  const [ownerLoading, setOwnerLoading] = useState(false);

  // Vessels
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [vesselLoading, setVesselLoading] = useState(false);
  const [selectedVesselDbId, setSelectedVesselDbId] = useState<number | null>(null);
  const [selectedVesselLabel, setSelectedVesselLabel] = useState<string>("");
  const [selectedVesselCode, setSelectedVesselCode] = useState<string>("");

  // Trips (approved)
  const [trips, setTrips] = useState<Trip[]>([]);
  const [tripLoading, setTripLoading] = useState(false);
  const [tripId, setTripId] = useState<string>("");
  const [tripLabelText, setTripLabelText] = useState<string>("");

  // Fish
  const [fishTypes, setFishTypes] = useState<FishType[]>([]);
  const [fishLoading, setFishLoading] = useState(false);
  const [fishId, setFishId] = useState<number | null>(null);
  const [fishName, setFishName] = useState("");

  // Scan any QR
  const [scanned, setScanned] = useState<ScannedQr[]>(() => {
    if (!initialQr) return [];
    return [{ id: initialQr, kind: classifyQr(initialQr) }];
  });
  const qrCount = scanned.length;

  // Photos
  const [images, setImages] = useState<string[]>([]);

  // Network + queue
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const flushingRef = useRef(false);

  // Camera
  const [cameraPerm, requestCameraPerm] = useCameraPermissions();
  const [canScan, setCanScan] = useState(true);

  // Location
  const [liveLoc, setLiveLoc] = useState<LiveLocation | null>(null);
  const locSubRef = useRef<Location.LocationSubscription | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);

  // sheets
  const vesselRef = useRef<BottomSheetModal>(null);
  const tripRef = useRef<BottomSheetModal>(null);
  const fishRef = useRef<BottomSheetModal>(null);

  useEffect(() => {
    if (initialQr) setStep(3);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // camera session token touch
  useEffect(() => {
    const sub = AppState.addEventListener("change", async (state) => {
      if (state === "active") {
        try {
          await AsyncStorage.removeItem(CAMERA_SESSION_KEY);
          const token = (await AsyncStorage.getItem(TOKEN_KEY)) || "";
          if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
        } catch {}
      }
    });
    return () => {
      try {
        sub.remove();
      } catch {}
    };
  }, []);

  /* ---------------- load owner db id + owner code ---------------- */
  const loadOwnerFromLogin = async (): Promise<{ id: number; code: string } | null> => {
    try {
      setOwnerLoading(true);

      const userId = Number(meUser?.id);
      if (!userId || Number.isNaN(userId)) return null;

      const headers = await authHeaders();
      const url = `${API_BASE}/api/owner/fetch/${userId}`;

      const res = await fetch(url, { method: "GET", headers });

      const text = await res.text();
      let json: any = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        // backend returned html/plain text
      }

      if (!res.ok) {
        console.log("[OWNER FETCH FAIL]", res.status, url, text);
        return null;
      }

      // support: {data:{...}} OR {data:[{...}]} OR {...}
      let src: any = json?.data ?? json;
      if (Array.isArray(src)) src = src[0];

      if (!src || typeof src !== "object") {
        console.log("[OWNER FETCH BAD DATA]", json);
        return null;
      }

      const ownerDbId = Number(src?.id);
      if (!ownerDbId || Number.isNaN(ownerDbId)) {
        console.log("[OWNER FETCH NO ID]", src);
        return null;
      }

      // ✅ robust owner code extraction (fix for your oc: '')
      const ocDirect =
        src?.owner_code ??
        src?.ownerCode ??
        src?.owner_code_text ??
        src?.ownerCodeText ??
        src?.owner_id_code ??
        src?.ownerIdCode ??
        src?.ownerid_code ??
        src?.ownerid ??
        src?.owner_code_id ??
        src?.owner_registration_code ??
        src?.code ??
        src?.owner?.owner_code ??
        src?.owner?.ownerCode ??
        src?.owner_registration?.owner_code ??
        src?.owner_registration?.ownerCode ??
        "";

      const ocDeep = deepFindOwnCode(src);
      const ocFallback = padOwnFromDbId(ownerDbId);

      const oc = normalizeOwnerCode(String(ocDirect || ocDeep || ocFallback || ""));

      setOwnerId(ownerDbId);
      setOwnerCode(oc);

      await writeOwnerCacheByUser(userId, ownerDbId);
      if (oc) await writeOwnerCodeCacheByUser(userId, oc);

      console.log("[OWNER OK]", { ownerDbId, oc, hasOwnerCode: !!oc });
      if (!oc) console.log("[OWNER RAW SRC KEYS]", Object.keys(src || {}));

      return { id: ownerDbId, code: oc };
    } catch (e: any) {
      console.log("[OWNER EX]", String(e?.message || e));
      return null;
    } finally {
      setOwnerLoading(false);
    }
  };

  const ensureOwnerId = async (): Promise<number | null> => {
    const userId = Number(meUser?.id);
    if (!userId || Number.isNaN(userId)) return null;

    if (ownerId && ownerId > 0) return ownerId;

    const cached = await readOwnerCacheByUser(userId);
    if (cached) {
      setOwnerId(cached);
      return cached;
    }

    if (!isOnline) return null;
    const r = await loadOwnerFromLogin();
    return r?.id ?? null;
  };

  const ensureOwnerCode = async (): Promise<string> => {
    const userId = Number(meUser?.id);
    if (!userId || Number.isNaN(userId)) return "";

    if (ownerCode) return normalizeOwnerCode(ownerCode);

    const cached = await readOwnerCodeCacheByUser(userId);
    if (cached) {
      const norm = normalizeOwnerCode(cached);
      setOwnerCode(norm);
      return norm;
    }

    if (!isOnline) return "";

    const r = await loadOwnerFromLogin();
    const norm = normalizeOwnerCode(String(r?.code || ""));
    if (norm) setOwnerCode(norm);
    return norm;
  };

  /* ---------------- fetch vessels for owner ---------------- */
  const fetchOwnerVessels = async (ownerDbId: number) => {
    setVesselLoading(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_BASE}/api/vessels/owner/${ownerDbId}`, {
        method: "GET",
        headers,
      });

      const text = await res.text();
      let json: any = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {}

      if (!res.ok) {
        console.log("[VESSEL FETCH FAIL]", res.status, text);
        setVessels([]);
        return;
      }

      const list = normalizeList(json);
      setVessels(list);

      // cache for offline
      await writeVesselCache(ownerDbId, list);
    } finally {
      setVesselLoading(false);
    }
  };

  /* ---------------- fetch approved trips for owner (robust status) ---------------- */
  const fetchTripsByStatus = async (owner_code: string, status: string) => {
    const headers = await authHeaders();
    const url = `${API_BASE}/api/trip/owner/${encodeURIComponent(
      owner_code
    )}/status/${encodeURIComponent(status)}`;

    const res = await fetch(url, { method: "GET", headers });

    const text = await res.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {}

    if (!res.ok) {
      console.log("[TRIP FETCH FAIL]", res.status, url, text);
      return { ok: false, list: [] as any[] };
    }

    const list = Array.isArray(json?.data) ? json.data : normalizeList(json);
    return { ok: true, list: Array.isArray(list) ? list : [] };
  };

  const fetchApprovedTrips = async (oc: string) => {
    setTripLoading(true);
    try {
      const owner_code = normalizeOwnerCode(String(oc || ""));
      if (!owner_code) {
        console.log("[TRIP] owner_code empty -> cannot fetch trips");
        setTrips([]);
        return;
      }

      // Some backends store status as APPROVED / Approved / approved.
      const candidates = ["approved", "APPROVED", "Approved"];

      let final: any[] = [];
      for (const st of candidates) {
        const r = await fetchTripsByStatus(owner_code, st);
        if (!r.ok) continue;

        // Filter approved if backend returns mixed
        const approvedOnly = r.list.filter((x: any) => {
          const s = String(x?.approval_status ?? x?.approvalStatus ?? "").toLowerCase();
          return !s ? true : s === "approved";
        });

        if (approvedOnly.length > 0) {
          final = approvedOnly;
          console.log("[TRIP OK]", { owner_code, statusUsed: st, count: final.length });
          break;
        }

        // If ok but empty, keep checking other status candidates
        console.log("[TRIP OK BUT EMPTY]", { owner_code, statusTried: st });
        final = approvedOnly;
      }

      setTrips(final);
      await writeTripCache(owner_code, final);
    } finally {
      setTripLoading(false);
    }
  };

  /* ---------------- fish load (cache + api) ---------------- */
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
        if (alive) setFishLoading(false);
        return;
      }

      try {
        const fresh = await fetchFishTypesFromApi();
        if (!alive) return;
        if (fresh.length > 0) {
          setFishTypes(fresh);
          await writeFishCache(fresh);
        }
      } finally {
        if (alive) setFishLoading(false);
      }
    };

    loadFish();
    return () => {
      alive = false;
    };
  }, []);

  /* ---------------- online / auto flush queue ---------------- */
  useEffect(() => {
    let alive = true;

    const refreshCount = async () => {
      const c = await getQueueCount();
      if (alive) setPendingCount(c);
    };

    const doFlush = async () => {
      if (flushingRef.current) return;
      flushingRef.current = true;
      setSyncing(true);

      try {
        await refreshCount();

        const ensuredOwner = await ensureOwnerId();
        if (!ensuredOwner) return;

        await flushQueue(async (payload: any) => {
          const patched: any = { ...(payload || {}) };
          if (!patched.ownerId) patched.ownerId = ensuredOwner;
          await dispatch(submitCatchLog(patched as any)).unwrap();
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

  /* ---------------- initial: owner -> vessels (ONLINE + OFFLINE CACHE) ---------------- */
  useEffect(() => {
    (async () => {
      if (!meUser?.id) return;

      const net = await NetInfo.fetch();
      const online = !!net.isConnected && (net.isInternetReachable ?? true);
      setIsOnline(online);

      const userId = Number(meUser?.id);

      const oid = online ? await ensureOwnerId() : await readOwnerCacheByUser(userId);
      if (!oid) return;

      // OFFLINE: cached vessels
      const cachedV = await readVesselCache(oid);
      if (cachedV.length > 0) setVessels(cachedV);

      // ONLINE: refresh
      if (online) await fetchOwnerVessels(oid);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meUser?.id]);

  /* ---------------- ownerCode -> trips (ONLINE + OFFLINE CACHE) ---------------- */
  useEffect(() => {
    (async () => {
      setTripId("");
      setTripLabelText("");

      const userId = Number(meUser?.id);
      if (!userId) {
        setTrips([]);
        return;
      }

      // 1) prefer state ownerCode
      let oc = normalizeOwnerCode(ownerCode);

      // 2) else cache
      if (!oc) {
        const cached = await readOwnerCodeCacheByUser(userId);
        oc = normalizeOwnerCode(cached);
        if (oc) setOwnerCode(oc);
      }

      // 3) else online fetch owner (to get owner_code)
      if (!oc && isOnline) {
        const loaded = await loadOwnerFromLogin();
        oc = normalizeOwnerCode(String(loaded?.code || ""));
        if (oc) setOwnerCode(oc);
      }

      if (!oc) {
        setTrips([]);
        return;
      }

      // OFFLINE: cached trips
      const cachedTrips = await readTripCache(oc);
      if (cachedTrips.length > 0) setTrips(cachedTrips);

      // ONLINE: refresh from API
      if (isOnline) await fetchApprovedTrips(oc);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, meUser?.id, ownerCode]);

  /* ---------------- scan enable: must have vessel+trip+fish ---------------- */
  const scanEnabled = !!selectedVesselDbId && !!tripId && !!fishId;

  /* ---------------- pickers options ---------------- */
  const vesselOptions = useMemo(() => {
    return vessels
      .map((v) => {
        const code = vesselCode(v);
        const db = vesselDbId(v);
        if (!code) return null;
        if (!db) return null;
        return { key: String(db), label: code, _raw: v } as any;
      })
      .filter(Boolean) as Array<PickerItem & { _raw: Vessel }>;
  }, [vessels]);

  const filteredTrips = useMemo(() => trips, [trips]);

  const tripOptions = useMemo(() => {
    return filteredTrips
      .map((tr) => {
        const key = tripKey(tr);
        if (!key) return null;
        return { key, label: tripLabel(tr), _raw: tr } as any;
      })
      .filter(Boolean) as Array<PickerItem & { _raw: Trip }>;
  }, [filteredTrips]);

  const fishOptions = useMemo(() => {
    return fishTypes
      .filter((f) => typeof f?.id === "number" && fishNameOf(f))
      .map((f) => ({ key: String(f.id), label: fishNameOf(f), id: f.id }));
  }, [fishTypes]);

  /* ---------------- when vessel changes -> reset trip selection ---------------- */
  useEffect(() => {
    setTripId("");
    setTripLabelText("");
  }, [selectedVesselDbId, selectedVesselCode]);

  /* ---------------- QR scan handlers ---------------- */
  const addQr = (id: string) => {
    const value = String(id || "").trim();
    if (!value) return;
    setScanned((prev) =>
      prev.some((x) => x.id === value)
        ? prev
        : [...prev, { id: value, kind: classifyQr(value) }]
    );
  };
  const removeQr = (id: string) => setScanned((prev) => prev.filter((x) => x.id !== id));
  const clearQrs = () => setScanned([]);

  const onBarcodeScanned = (data: string) => {
    if (!scanEnabled) return;
    const value = String(data || "").trim();
    if (!value) return;
    if (!canScan) return;

    setCanScan(false);
    addQr(value);
    setTimeout(() => setCanScan(true), 350);
  };

  /* ---------------- photos ---------------- */
  const captureImageOnly = async () => {
    try {
      await AsyncStorage.setItem(CAMERA_SESSION_KEY, "1");

      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        await AsyncStorage.removeItem(CAMERA_SESSION_KEY);
        return Alert.alert("Permission", "Allow camera access to capture photos.");
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: false,
        cameraType: ImagePicker.CameraType.back,
      });

      await AsyncStorage.removeItem(CAMERA_SESSION_KEY);

      if (result.canceled) return;
      const uri = result.assets?.[0]?.uri;
      if (!uri) return;

      setImages((prev) => [...prev, uri].slice(0, 10));
    } catch (e: any) {
      await AsyncStorage.removeItem(CAMERA_SESSION_KEY);
      Alert.alert("Camera error", String(e?.message || e));
    }
  };

  const removeImage = (uri: string) => setImages((prev) => prev.filter((u) => u !== uri));

  /* ---------------- location (step 2) ---------------- */
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
      if (fg.status !== "granted") {
        setLiveLoc(null);
        setLocError("Location permission denied");
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
  }, [step]);

  /* ---------------- validate + navigation ---------------- */
  const validateStep1 = () => {
    if (!selectedVesselDbId) return Alert.alert(t.required, t.errVessel), false;
    if (!tripId) return Alert.alert(t.required, t.errTrip), false;
    if (!fishId) return Alert.alert(t.required, t.errSpecies), false;
    return true;
  };

  const nowPreview = useMemo(
    () => new Date(),
    [step, qrCount, tripId, fishId, selectedVesselDbId]
  );

  /* ---------------- save ---------------- */
  const save = async () => {
    if (!validateStep1()) return;
    if (scanned.length === 0) return Alert.alert(t.required, t.errQr);

    const now = new Date();

    const userId = Number(meUser?.id);
    let ownerFinal: number | null =
      ownerId || (userId ? await readOwnerCacheByUser(userId) : null);

    if (isOnline && !ownerFinal) {
      const loaded = await loadOwnerFromLogin();
      ownerFinal = loaded?.id ?? null;
    }

    if (isOnline && !ownerFinal)
      return Alert.alert("Owner", "owner_id (numeric) not loaded");

    const base: any = {
      tripId,
      fishId: fishId!,
      fishName: fishName || undefined,

      // IMPORTANT: send vessel CODE in rvVesselId (catchLog.api.ts updated)
      rvVesselId: selectedVesselCode,
      ownerId: isOnline ? ownerFinal! : ownerFinal || 0,

      weightKg: 0,

      catchDate: fmtDate(now),
      catchTime: fmtTime(now),

      images,
      ...(liveLoc ? { latitude: liveLoc.latitude, longitude: liveLoc.longitude } : {}),
    };

    const payloads: any[] = scanned.map((x) => ({
      ...base,
      linkedCrateId: x.id,
      qrKind: x.kind,
    }));

    // OFFLINE queue all
    if (!isOnline) {
      for (const p of payloads) await enqueueCatchLog(p as any);
      const c = await getQueueCount();
      setPendingCount(c);

      Alert.alert(t.saved, t.offlineSaved);
      router.replace({
        pathname: "/catch-logs/details",
        params: { crateId: scanned[0].id },
      });
      return;
    }

    // ONLINE: network fallback -> queue remaining
    let ok = 0;
    let queued = 0;

    for (let i = 0; i < payloads.length; i++) {
      const p = payloads[i];

      try {
        await dispatch(submitCatchLog(p as any)).unwrap();
        ok++;
      } catch (e: any) {
        const msg = String(e?.message || e);
        const m = msg.toLowerCase();

        const networkish =
          m.includes("network") ||
          m.includes("failed to fetch") ||
          m.includes("timeout") ||
          m.includes("socket") ||
          m.includes("econn") ||
          m.includes("offline");

        if (networkish) {
          const remaining = payloads.slice(i);
          for (const rp of remaining) await enqueueCatchLog(rp as any);
          queued += remaining.length;

          const c = await getQueueCount();
          setPendingCount(c);

          Alert.alert(
            t.saved,
            `${t.offlineSaved}\n\nUploaded: ${ok}\nQueued (offline): ${queued}`
          );

          router.replace({
            pathname: "/catch-logs/details",
            params: { crateId: scanned[0].id },
          });
          return;
        }

        Alert.alert("submitCatchLog failed", msg);
        return;
      }
    }

    const c = await getQueueCount();
    setPendingCount(c);

    Alert.alert(ok > 0 ? t.saved : "Done", `Uploaded: ${ok}\nQueued (offline): ${queued}`);

    router.replace({
      pathname: "/catch-logs/details",
      params: { crateId: scanned[0].id },
    });
  };

  /* ---------------- UI ---------------- */
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
              {qrCount ? t.scanCount(qrCount) : "—"}
            </Text>
          </View>

          <View className={`mt-3 rounded-xl border ${UI.chipBorder} ${UI.chipBg} px-3 py-2`}>
            <Text className={`text-xs font-semibold ${UI.text}`}>{t.step(step)}</Text>
          </View>

          <View className="mt-3">
            <Text className={`text-[11px] ${UI.muted}`}>
              Owner(DB id):{" "}
              <Text className="font-bold" style={{ color: ownerId ? "#1f7a3f" : "#b45309" }}>
                {ownerId ? String(ownerId) : ownerLoading ? t.loadingOwner : "not loaded"}
              </Text>
            </Text>

            <Text className={`text-[11px] ${UI.muted}`}>
              Owner Code:{" "}
              <Text className="font-bold" style={{ color: ownerCode ? "#1f7a3f" : "#b45309" }}>
                {ownerCode ? ownerCode : ownerLoading ? t.loadingOwner : "not loaded"}
              </Text>
            </Text>

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
        </Card>

        {/* Vessel picker */}
        <PickerSheetObj
          title={t.chooseVessel}
          valueKey={selectedVesselDbId ? String(selectedVesselDbId) : ""}
          options={vesselOptions}
          onSelect={(item: any) => {
            const raw = item._raw as Vessel;
            const db = vesselDbId(raw);
            if (!db) return;
            setSelectedVesselDbId(db);
            setSelectedVesselLabel(vesselLabel(raw));
            setSelectedVesselCode(vesselCode(raw));
          }}
          sheetRef={vesselRef}
          searchPlaceholder="Search vessel..."
        />

        {/* Trip picker */}
        <PickerSheetObj
          title={t.chooseTrip}
          valueKey={tripId || ""}
          options={tripOptions}
          onSelect={(item: any) => {
            const raw = item._raw as Trip;
            const key = tripKey(raw);
            setTripId(key);
            setTripLabelText(tripLabel(raw));
          }}
          sheetRef={tripRef}
          searchPlaceholder="Search trip..."
        />

        {/* Fish picker */}
        <PickerSheetObj
          title={t.chooseSpecies}
          valueKey={fishId ? String(fishId) : ""}
          options={fishOptions.map((f) => ({ key: String(f.id), label: f.label }))}
          onSelect={(item: any) => {
            const id = Number(item.key);
            const label = String(item.label || "");
            setFishId(id);
            setFishName(label);
          }}
          sheetRef={fishRef}
          searchPlaceholder="Search fish..."
        />

        {/* STEP 1 */}
        {step === 1 ? (
          <View className="mt-4 gap-3">
            <FieldCard>
              <SelectField
                label={`${t.vessel} (${t.required})`}
                value={selectedVesselLabel}
                placeholder={t.chooseVessel}
                hint={vesselLoading ? t.loadingVessel : `Tap ▾ (${vesselOptions.length})`}
                onPress={() => vesselRef.current?.present()}
              />
              {!vesselLoading && vesselOptions.length === 0 ? (
                <Text className="mt-2 text-[11px] text-rose-600">{t.noVessels}</Text>
              ) : null}
            </FieldCard>

            <FieldCard>
              <SelectField
                label={`${t.trip} (${t.required})`}
                value={tripLabelText}
                placeholder={t.chooseTrip}
                hint={tripLoading ? t.loadingTrips : `Tap ▾ (${tripOptions.length})`}
                onPress={() => tripRef.current?.present()}
              />
              {!tripLoading && tripOptions.length === 0 ? (
                <Text className="mt-2 text-[11px] text-rose-600">{t.noTrips}</Text>
              ) : null}
              {selectedVesselDbId ? (
                <Text className="mt-2 text-[11px] text-[#7a6f66]">
                  Trips are shown from approved trips of this owner.
                </Text>
              ) : null}
            </FieldCard>

            <FieldCard>
              <SelectField
                label={`${t.species} (${t.required})`}
                value={fishName}
                placeholder={t.chooseSpecies}
                hint={fishLoading ? t.loadingFish : `Tap ▾ (${fishOptions.length})`}
                onPress={() => {
                  if (!fishLoading) fishRef.current?.present();
                }}
              />
            </FieldCard>

            <Pressable
              onPress={() => {
                if (!validateStep1()) return;
                setStep(2);
              }}
              className="mt-2 rounded-2xl px-4 py-4 active:opacity-90"
              style={{
                backgroundColor: UI.accent,
                opacity: vesselLoading || tripLoading || fishLoading ? 0.7 : 1,
              }}
              disabled={vesselLoading || tripLoading || fishLoading}
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
            <Card className="p-4">
              <View className="flex-row items-center gap-2">
                <Ionicons name="qr-code-outline" size={20} color={UI.accent} />
                <Text className={`text-sm font-extrabold ${UI.text}`}>
                  {t.scanTitle}
                </Text>
              </View>

              <Text className={`mt-1 text-[11px] ${UI.muted}`}>
                {scanEnabled ? t.scanReady : t.scanHint}
              </Text>

              <View className="mt-3 overflow-hidden rounded-2xl border border-[#ead7c8] bg-black">
                {!cameraPerm?.granted ? (
                  <View className="p-4">
                    <Text className="text-white text-sm font-semibold">
                      {t.camDenied}
                    </Text>
                    <Pressable
                      onPress={requestCameraPerm}
                      className="mt-3 rounded-2xl px-4 py-3 active:opacity-80"
                      style={{ backgroundColor: UI.accent }}
                    >
                      <Text className="text-center text-white font-extrabold">
                        {t.grantCam}
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={{ height: 320 }}>
                    <CameraView
                      style={{ flex: 1 }}
                      facing="back"
                      barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                      onBarcodeScanned={(e) =>
                        onBarcodeScanned(String((e as any)?.data || ""))
                      }
                    />
                  </View>
                )}
              </View>

              <View className="mt-3">
                <View className="flex-row items-center justify-between">
                  <Text className={`text-sm font-extrabold ${UI.text}`}>
                    {t.scannedList} • {t.scanCount(qrCount)}
                  </Text>

                  {qrCount > 0 ? (
                    <Pressable
                      onPress={clearQrs}
                      className="rounded-full border border-[#ead7c8] bg-white px-3 py-2 active:opacity-80"
                    >
                      <Text className={`text-xs font-semibold ${UI.text}`}>
                        {t.clearAll}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>

                {qrCount === 0 ? (
                  <View className={`mt-2 rounded-xl border ${UI.border} bg-[#fbf6f1] px-3 py-2`}>
                    <Text className={`text-xs ${UI.muted}`}>{t.errQr}</Text>
                  </View>
                ) : (
                  <View className="mt-2 gap-2">
                    {scanned.map((x) => (
                      <View
                        key={x.id}
                        className={`flex-row items-center justify-between rounded-xl border ${UI.border} bg-[#fbf6f1] px-3 py-2`}
                      >
                        <View className="flex-1">
                          <Text className={`text-xs font-semibold ${UI.text}`} numberOfLines={1}>
                            {x.id}
                          </Text>
                          <Text className={`mt-1 text-[11px] ${UI.muted}`}>Type: {x.kind}</Text>
                        </View>
                        <Pressable
                          onPress={() => removeQr(x.id)}
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

            {/* Location status */}
            <Card className="p-4">
              <View className="flex-row items-center gap-2">
                <Ionicons name="navigate-outline" size={20} color={UI.accent} />
                <Text className={`text-sm font-extrabold ${UI.text}`}>Live Location</Text>
              </View>
              <Text className={`mt-1 text-[11px] ${UI.muted}`}>
                {locLoading
                  ? "Getting location..."
                  : locError
                  ? locError
                  : liveLoc
                  ? `${liveLoc.latitude}, ${liveLoc.longitude}`
                  : "—"}
              </Text>
            </Card>

            <View className="mt-2 flex-row gap-3">
              <Pressable
                className={`flex-1 rounded-2xl border ${UI.border} bg-white px-4 py-4 active:opacity-80`}
                onPress={() => setStep(1)}
              >
                <Text className={`text-center ${UI.text} text-base font-extrabold`}>{t.back}</Text>
              </Pressable>

              <Pressable
                className="flex-1 rounded-2xl px-4 py-4 active:opacity-90"
                style={{ backgroundColor: UI.accent, opacity: qrCount > 0 ? 1 : 0.6 }}
                onPress={() => setStep(3)}
                disabled={qrCount === 0}
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
                onPress={() => setStep(2)}
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
                onPress={() => setStep(3)}
                disabled={posting || ownerLoading || vesselLoading || tripLoading}
              >
                <Text className={`text-center ${UI.text} text-base font-extrabold`}>{t.back}</Text>
              </Pressable>

              <Pressable
                className="flex-1 rounded-2xl px-4 py-4 active:opacity-90"
                style={{ backgroundColor: UI.accent, opacity: posting || ownerLoading ? 0.7 : 1 }}
                onPress={save}
                disabled={posting || ownerLoading || qrCount === 0}
              >
                <Text className="text-center text-white text-base font-extrabold">
                  {posting ? (lang === "ta" ? "சேமிக்கிறது..." : "Saving...") : `${t.save} (${qrCount})`}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
