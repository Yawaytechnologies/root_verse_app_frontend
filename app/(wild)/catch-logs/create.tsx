// app/(wild)/catch-logs/create.tsx
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  AppState,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  Vibration,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { Ionicons } from "@expo/vector-icons";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import NetInfo from "@react-native-community/netinfo";
import { CameraView, useCameraPermissions } from "expo-camera";

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";

// ✅ Watermark capture
import { captureRef } from "react-native-view-shot";

import { submitCatchLog } from "../../../src/services/wild/catchLog.slice";
import { useAppDispatch, useAppSelector } from "../../../src/store/hooks";

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
  fish_code?: string | null;
  fish_type_url?: string | null;
  fish_type_key?: string | null;
};

type PickerItem = { key: string; label: string; imageUri?: string | null };

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
type SyncState = "NOT_SYNCED" | "SYNCING" | "SYNCED";

/** Backend expects numeric owner db id */
type LocalCatchLogPayload = Omit<CatchLogPayload, "ownerId"> & {
  ownerId?: number;
  fishName?: string;
  rvVesselCode?: string;
  qrKind?: QrKind;
};

type Vessel = any;
type Trip = any;

type GroupPhase = "SCAN" | "PHOTO" | "DONE";

type FishGroup = {
  id: string;
  fishId: number | null;
  fishName: string;
  scanned: ScannedQr[];
  phase: GroupPhase;

  /** photos are per fish(group) */
  images: string[]; // optional now
};

type WatermarkJob = {
  srcUri: string;
  outW: number;
  outH: number;
  line1: string;
  line2: string;
};

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

// ✅ NEW: persist last known logged-in user id (for offline refresh)
const LAST_USER_ID_KEY = "rv_last_user_id_v1";

/* ---------------- UI / i18n ---------------- */
const i18n = {
  ta: {
    title: "பிடிப்பு பதிவு",
    sub: "",

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

    fishGroupsTitle: "Fish + QR குழுக்கள்",
    addFish: "+ Add Fish",
    selectFish: "Fish தேர்வு",
    chooseSpecies: "மீன் வகை தேர்வு செய்யவும்",
    fishSelected: "Selected Fish",
    group: "Group",
    selectGroupToScan: "Scan செய்ய ஒரு Fish Group-ஐ தேர்வு செய்யுங்கள்.",
    groupNeedsFish: "இந்த group-க்கு முதலில் Fish தேர்வு செய்ய வேண்டும்.",
    groupQrCount: (n: number) => `QR: ${n}`,
    totalQr: (n: number) => `மொத்த QR: ${n}`,
    errNeedFishGroup: "குறைந்தது 1 Fish group உருவாக்குங்கள்",
    errGroupFishMissing: "ஒவ்வொரு group-க்கும் Fish தேர்வு செய்ய வேண்டும்",
    errGroupQrMissing:
      "ஒவ்வொரு group-க்கும் குறைந்தது 1 QR ஸ்கேன் செய்ய வேண்டும்",

    scanTitle: "QR ஸ்கேன்",
    scanHint:
      "Vessel + Trip தேர்வு செய்த பிறகு Fish group-க்கு QR scan செய்யலாம்",
    scannedList: "Scanned QRs",
    scanCount: (n: number) => `மொத்தம்: ${n}`,

    phaseScan: "SCAN",
    phasePhoto: "PHOTOS",
    phaseDone: "DONE",
    doneScanning: "QR scan முடிந்தது → Next",
    scanMore: "மீண்டும் QR scan",
    photosStageTitle: "Fish Reference Photos (optional 1-2)",
    capturePhoto: "Photo எடு",
    finishFish: "இந்த Fish முடிந்தது",
    photo: "Photo",

    camDenied: "Camera permission அனுமதி இல்லை",
    grantCam: "Camera அனுமதி கொடு",

    torch: "Torch",
    torchOn: "ON",
    torchOff: "OFF",

    dateTime: "Date & Time (Auto)",
    date: "தேதி",
    time: "நேரம்",
    autoHint: "Save அழுத்தும் நேரத்தில் Date/Time auto ஆக capture ஆகும்.",

    saved: "சேமிக்கப்பட்டது ",
    offlineSaved:
      "இணையம் இல்லை. Local-ல் save பண்ணிட்டோம். Net வந்தவுடன் auto sync ஆகும்.",
    syncing: "Syncing pending...",
    pending: "Pending sync",

    loadingOwner: "Owner loading...",
    loadingVessel: "Vessels loading...",
    loadingTrips: "Approved trips loading...",
    loadingFish: "Fish types loading...",

    noVessels: "இந்த owner-க்கு vessels இல்லை (backend check பண்ணு)",
    noTrips: "இந்த owner-க்கு APPROVED trips இல்லை",

    syncLabel: "Sync",
    syncNotSynced: "Not Synced",
    syncSyncing: "Syncing",
    syncSynced: "Fully Synced",

    scanBtn: "Scan Fish Tag",
    scanDisabledMsg:
      "முதலில் அனைத்து Offline data-வும் Sync ஆகணும் (Fully Synced).",
    scanModalTitle: "Fish Tag Scan (Read Only)",
    close: "Close",

    photoCamTitle: "Photo Capture",
    takePhoto: "Take Photo",
    cancel: "Cancel",

    max2: "2 photos போதும் (max 2).",

    imgPreviewTitle: "Photo Preview",

    done: "Done",
    deleteGroup: "இந்த group-ஐ நீக்கு?",
    yes: "ஆம்",
    no: "இல்லை",

    step1Hint:
      "முதலில் Vessel + Approved Trip தேர்வு செய்யுங்கள். பின்னர் QR scan screen செல்லலாம்.",
    step2Hint:
      "ஒவ்வொரு Fish Group-க்கும்: Fish தேர்வு → QR scan → (optional photos) → DONE.",
    step3Hint: "Review செய்து Save செய்யுங்கள்.",

    skipPhotos: "Photos skip செய்து முடிக்கவும்",
    optional: "Optional",
  },
  en: {
    title: "Catch Log",
    sub: "",

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

    fishGroupsTitle: "Fish + QR Groups",
    addFish: "+ Add Fish",
    selectFish: "Select Fish",
    chooseSpecies: "Choose species",
    fishSelected: "Selected Fish",
    group: "Group",
    selectGroupToScan: "Select a Fish Group to scan QRs.",
    groupNeedsFish: "Select fish for this group first.",
    groupQrCount: (n: number) => `QR: ${n}`,
    totalQr: (n: number) => `Total QR: ${n}`,
    errNeedFishGroup: "Create at least 1 fish group",
    errGroupFishMissing: "Each group must have a selected fish",
    errGroupQrMissing: "Each group must have at least 1 scanned QR",

    scanTitle: "Scan QR",
    scanHint: "Scan QRs inside a Fish Group after selecting Vessel + Trip",
    scannedList: "Scanned QRs",
    scanCount: (n: number) => `Total: ${n}`,

    phaseScan: "SCAN",
    phasePhoto: "PHOTOS",
    phaseDone: "DONE",
    doneScanning: "Done scanning → Next",
    scanMore: "Scan more QRs",
    photosStageTitle: "Fish Reference Photos (optional 1-2)",
    capturePhoto: "Capture Photo",
    finishFish: "Finish this fish",
    photo: "Photo",

    camDenied: "Camera permission denied",
    grantCam: "Grant camera access",

    torch: "Torch",
    torchOn: "ON",
    torchOff: "OFF",

    dateTime: "Date & Time (Auto)",
    date: "Date",
    time: "Time",
    autoHint: "Date/Time will be captured automatically when you press Save.",

    saved: "Saved ",
    offlineSaved:
      "No internet. Saved locally. Will auto-sync when network returns.",
    syncing: "Syncing pending...",
    pending: "Pending sync",

    loadingOwner: "Loading owner...",
    loadingVessel: "Loading vessels...",
    loadingTrips: "Loading approved trips...",
    loadingFish: "Loading fish types...",

    noVessels: "No vessels for this owner (check backend)",
    noTrips: "No APPROVED trips for this owner",

    syncLabel: "Sync",
    syncNotSynced: "Not Synced",
    syncSyncing: "Syncing",
    syncSynced: "Fully Synced",

    scanBtn: "Scan Fish Tag",
    scanDisabledMsg: "All offline data must be synced first (Fully Synced).",
    scanModalTitle: "Fish Tag Scan (Read Only)",
    close: "Close",

    photoCamTitle: "Photo Capture",
    takePhoto: "Take Photo",
    cancel: "Cancel",

    max2: "Max 2 photos.",

    imgPreviewTitle: "Photo Preview",

    done: "Done",
    deleteGroup: "Remove this group?",
    yes: "Yes",
    no: "No",

    step1Hint:
      "Select Vessel + Approved Trip first. Then proceed to QR scanning.",
    step2Hint: "For each group: select Fish → scan QR → (optional photos) → DONE.",
    step3Hint: "Review and Save.",

    skipPhotos: "Skip photos and finish",
    optional: "Optional",
  },
};

const UI = {
  bg: "bg-[#fbf6f1]",
  border: "border-[#ead7c8]",
  muted: "text-[#7a6f66]",
  text: "text-[#2b2b2b]",
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
      <Text className={`text-sm ${UI.muted}`} numberOfLines={1}>
        {label}
      </Text>
      <Text
        className={`mt-1 text-lg ${value ? UI.text : "text-[#b1a59a]"}`}
        style={{ flexShrink: 1 }}
      >
        {value || placeholder}
      </Text>
      <Text className="mt-1 text-xs text-[#b1a59a]" style={{ flexShrink: 1 }}>
        {hint}
      </Text>
    </Pressable>
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
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
};
const fmtDateTime = (d: Date) => `${fmtDate(d)} ${fmtTime(d)}`;

function classifyQr(id: string): QrKind {
  const v = String(id || "")
    .trim()
    .toUpperCase();
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
  const c = String(code || "")
    .trim()
    .toUpperCase();
  if (/^OWN-\d{4}$/.test(c)) return c;

  const m1 = c.match(/^OWN-?0*(\d+)$/);
  if (m1?.[1]) return `OWN-${String(m1[1]).padStart(4, "0")}`;

  const m2 = c.match(/^OWN\D*0*(\d+)$/);
  if (m2?.[1]) return `OWN-${String(m2[1]).padStart(4, "0")}`;

  return c;
}

function padOwnFromDbId(ownerDbId: number) {
  if (!ownerDbId || ownerDbId <= 0) return "";
  return `OWN-${String(ownerDbId).padStart(4, "0")}`;
}

function deepFindOwnCode(obj: any): string {
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
      "",
  ).trim();
}
function vesselLabel(v: Vessel): string {
  return vesselCode(v);
}

/* ---- TRIP FIELD MAPPING ---- */
function tripKey(tr: any): string {
  const key = String(
    tr?.trip_id || tr?.tripId || tr?.trip_code || tr?.id || "",
  ).trim();
  return key;
}
function tripLabel(tr: Trip): string {
  const code = String(
    tr?.trip_id || tr?.tripId || tr?.trip_code || tr?.tripCode || tr?.id || "",
  ).trim();
  const port = String(
    tr?.near_station || tr?.port || tr?.landing_port || tr?.landingPort || "",
  ).trim();
  const date =
    String(
      tr?.planned_at || tr?.trip_date || tr?.tripDate || tr?.created_at || "",
    ).trim() || "";
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
    const perUser = String(
      (await AsyncStorage.getItem(ownerDbIdCacheKey(userId))) || "",
    ).trim();
    if (perUser && /^\d+$/.test(perUser)) {
      const n = Number(perUser);
      return Number.isFinite(n) && n > 0 ? n : null;
    }

    const generic = String((await AsyncStorage.getItem("owner_id")) || "").trim();
    if (generic && /^\d+$/.test(generic)) {
      const n = Number(generic);
      return Number.isFinite(n) && n > 0 ? n : null;
    }

    return null;
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
    const perUser = String(
      (await AsyncStorage.getItem(ownerCodeCacheKey(userId))) || "",
    ).trim();
    if (perUser) return perUser;

    const generic = String(
      (await AsyncStorage.getItem("owner_code")) || "",
    ).trim();
    return generic;
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

/* ---------------- FISH URL CLEANUP ---------------- */
function sanitizeImageUrl(u: any): string {
  let s = String(u ?? "").trim();
  if (!s) return "";

  s = s.replace(/^"+|"+$/g, "");
  s = s.replace(/%22/gi, "");
  s = s.replace(/"/g, "");
  s = s.replace(/,+$/g, "");
  s = s.trim();

  try {
    s = encodeURI(s);
  } catch {}

  return s;
}

const fishNameOf = (f: FishType) => String(f?.fish_name || "").trim();

const fishImageOf = (f: FishType) => {
  const raw =
    f?.fish_type_url ??
    (f as any)?.fishTypeUrl ??
    (f as any)?.image_url ??
    (f as any)?.imageUrl ??
    null;

  const cleaned = sanitizeImageUrl(raw);
  return cleaned || null;
};

/* ---------------- FISH CACHE ---------------- */
async function readFishCache(): Promise<FishType[]> {
  try {
    const raw = await AsyncStorage.getItem(FISH_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((f) => typeof f?.id === "number" && fishNameOf(f))
      .map((f) => ({
        id: Number(f.id),
        fish_name: fishNameOf(f),
        fish_code: (f?.fish_code ?? null) as any,
        fish_type_url: fishImageOf(f) ?? null,
        fish_type_key: (f?.fish_type_key ?? null) as any,
      }));
  } catch {
    return [];
  }
}

async function writeFishCache(list: FishType[]) {
  try {
    const safe = (list || [])
      .filter((f) => typeof f?.id === "number" && fishNameOf(f))
      .map((f) => ({
        id: f.id,
        fish_name: fishNameOf(f),
        fish_code: f.fish_code ?? null,
        fish_type_url: fishImageOf(f) ?? null,
        fish_type_key: f.fish_type_key ?? null,
      }));

    await AsyncStorage.setItem(FISH_CACHE_KEY, JSON.stringify(safe));
  } catch {}
}

async function fetchFishTypesFromApi(): Promise<FishType[]> {
  const res = await fetch(`${API_BASE}/api/fish-types`);
  if (!res.ok) return [];

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    console.log("[FISH TYPES] JSON parse failed:", text?.slice(0, 250));
    return [];
  }

  const list = normalizeList(json) as any[];

  return (Array.isArray(list) ? list : [])
    .filter(
      (f) => typeof f?.id === "number" && String(f?.fish_name || "").trim(),
    )
    .map((f) => ({
      id: Number(f.id),
      fish_name: String(f.fish_name || "").trim(),
      fish_code: (f?.fish_code ?? null) as any,
      fish_type_url:
        sanitizeImageUrl(f?.fish_type_url ?? f?.fishTypeUrl ?? "") || null,
      fish_type_key: (f?.fish_type_key ?? null) as any,
    }));
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
      JSON.stringify(list || []),
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

/* ---------------- Fish Group Helpers ---------------- */
function makeId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function createFishGroup(initialQr?: string): FishGroup {
  const id = makeId();
  const qr = String(initialQr || "").trim();
  const scanned: ScannedQr[] = qr ? [{ id: qr, kind: classifyQr(qr) }] : [];
  return {
    id,
    fishId: null,
    fishName: "",
    scanned,
    phase: "SCAN",
    images: [],
  };
}

function locText(loc: LiveLocation | null) {
  if (!loc) return "Location: —";
  const lat = Number(loc.latitude);
  const lng = Number(loc.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "Location: —";
  return `Location: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

/* ---------------- PICKER SHEET ---------------- */
function PickerSheetObj<T extends PickerItem>({
  title,
  valueKey,
  options,
  onSelect,
  sheetRef,
  searchPlaceholder = "Search...",
  showImage = false,
}: {
  title: string;
  valueKey: string;
  options: T[];
  onSelect: (item: T) => void;
  sheetRef: React.RefObject<BottomSheetModal | null>;
  searchPlaceholder?: string;
  showImage?: boolean;
}) {
  const snapPoints = useMemo(() => ["45%", "75%"], []);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return options;
    return options.filter((x) =>
      String(x.label || "")
        .toLowerCase()
        .includes(t),
    );
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
          <Text
            className={`text-lg font-bold ${UI.text}`}
            numberOfLines={1}
            style={{ flex: 1 }}
          >
            {title}
          </Text>
          <Pressable
            onPress={() => sheetRef.current?.dismiss()}
            className="rounded-full px-3 py-2 active:opacity-80"
          >
            <Text style={{ color: UI.accent }} className="text-base font-semibold">
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
            className={`text-lg ${UI.text}`}
          />
        </View>

        <ScrollView className="mt-3" keyboardShouldPersistTaps="handled">
          {filtered.map((item) => {
            const active = item.key === valueKey;
            const uri = showImage
              ? sanitizeImageUrl((item as any)?.imageUri)
              : "";

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
                <View className="flex-row items-center">
                  {showImage ? (
                    <>
                      {uri ? (
                        <Image
                          source={{ uri }}
                          style={{
                            width: 42,
                            height: 42,
                            borderRadius: 14,
                            backgroundColor: "#111",
                            borderWidth: 1,
                            borderColor: "rgba(0,0,0,0.06)",
                          }}
                          resizeMode="cover"
                        />
                      ) : (
                        <View
                          style={{
                            width: 42,
                            height: 42,
                            borderRadius: 14,
                            backgroundColor: "#f3f4f6",
                            borderWidth: 1,
                            borderColor: "#ead7c8",
                          }}
                        />
                      )}
                      <View style={{ width: 12 }} />
                    </>
                  ) : null}

                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text className={`text-base font-semibold ${UI.text}`} numberOfLines={2}>
                      {item.label}
                    </Text>
                    {showImage ? (
                      <Text className={`mt-1 text-xs ${UI.muted}`} numberOfLines={1}>
                        {uri ? "Image available" : "No image"}
                      </Text>
                    ) : null}
                  </View>
                </View>
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
  const initialQr = String(params?.crateId || "").trim();

  const dispatch = useAppDispatch();
  const posting = !!useAppSelector((s: any) => s.catchLog?.loading);

  const meState = useAppSelector((s: any) => s.me);
  const meUser =
    meState?.user || meState?.data || meState?.me || meState || null;

  const [lang, setLang] = useState<Lang>("ta");
  const t = i18n[lang];

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // ✅ NEW: resolved userId fallback (works after refresh offline)
  const [resolvedUserId, setResolvedUserId] = useState<number | null>(null);

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

  // Fish types list (for picker)
  const [fishTypes, setFishTypes] = useState<FishType[]>([]);
  const [fishLoading, setFishLoading] = useState(false);

  // ✅ Fish groups
  const initGroupRef = useRef<FishGroup | null>(null);
  if (!initGroupRef.current) initGroupRef.current = createFishGroup(initialQr);

  const [groups, setGroups] = useState<FishGroup[]>(() => [initGroupRef.current!]);
  const [activeGroupId, setActiveGroupId] = useState<string>(() => initGroupRef.current!.id);

  // Network + queue
  const globalNetworkState = useAppSelector(
    (s: any) => s.network?.isOnline ?? true,
  );
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const flushingRef = useRef(false);

  // Camera permissions
  const [cameraPerm, requestCameraPerm] = useCameraPermissions();

  // Torch (QR scan)
  const [torchWanted, setTorchWanted] = useState(true);
  const [torchArmed, setTorchArmed] = useState(false);

  // Torch (Photo camera) ✅ separate toggle (so “photo flashlight” is available)
  const [photoTorchWanted, setPhotoTorchWanted] = useState(true);
  const [photoTorchArmed, setPhotoTorchArmed] = useState(false);

  // Barcode throttle
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
  const [fishPickGroupId, setFishPickGroupId] = useState<string | null>(null);

  // Fish tag scan modal
  const [fishScanOpen, setFishScanOpen] = useState(false);
  const [fishScanCanScan, setFishScanCanScan] = useState(true);

  // Photo camera modal (group photos)
  const [photoCamOpen, setPhotoCamOpen] = useState(false);
  const [photoTargetGroupId, setPhotoTargetGroupId] = useState<string | null>(null);
  const photoCamRef = useRef<any>(null);
  const [takingPhoto, setTakingPhoto] = useState(false);

  // ✅ Photo preview modal (view captured image)
  const [imgPreviewUri, setImgPreviewUri] = useState<string | null>(null);

  // ✅ Watermark compositor (offscreen)
  const wmViewRef = useRef<View | null>(null);
  const wmResolveRef = useRef<((uri: string) => void) | null>(null);
  const wmRejectRef = useRef<((e: any) => void) | null>(null);
  const [wmJob, setWmJob] = useState<WatermarkJob | null>(null);
  const [wmImgLoaded, setWmImgLoaded] = useState(false);

  const watermarkAsync = (
    srcUri: string,
    w: number,
    h: number,
    line1: string,
    line2: string,
  ) => {
    return new Promise<string>((resolve, reject) => {
      wmResolveRef.current = resolve;
      wmRejectRef.current = reject;
      setWmImgLoaded(false);
      setWmJob({
        srcUri,
        outW: w,
        outH: h,
        line1,
        line2,
      });
    });
  };

  useEffect(() => {
    if (!wmJob) return;
    if (!wmImgLoaded) return;

    let alive = true;

    (async () => {
      try {
        const view = wmViewRef.current;
        if (!view) throw new Error("Watermark view not ready");

        const outUri = await captureRef(view, {
          format: "jpg",
          quality: 0.9,
          result: "tmpfile",
        });

        if (!alive) return;
        wmResolveRef.current?.(String(outUri));
      } catch (e: any) {
        if (!alive) return;
        wmRejectRef.current?.(e);
      } finally {
        wmResolveRef.current = null;
        wmRejectRef.current = null;
        if (alive) {
          setWmJob(null);
          setWmImgLoaded(false);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [wmJob, wmImgLoaded]);

  // ✅ resolve user id (meUser.id OR last saved id) and persist it
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const meId = Number(meUser?.id);
        if (meId && !Number.isNaN(meId) && meId > 0) {
          if (!alive) return;
          setResolvedUserId(meId);
          await AsyncStorage.setItem(LAST_USER_ID_KEY, String(meId));
          return;
        }

        const raw = await AsyncStorage.getItem(LAST_USER_ID_KEY);
        const lastId = Number(String(raw || "").trim());
        if (lastId && !Number.isNaN(lastId) && lastId > 0) {
          if (!alive) return;
          setResolvedUserId(lastId);
        }
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, [meUser?.id]);

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

  // Torch workaround (QR)
  useEffect(() => {
    if (!torchWanted) {
      setTorchArmed(false);
      return;
    }
    setTorchArmed(false);
    const id = setTimeout(() => setTorchArmed(true), 180);
    return () => clearTimeout(id);
  }, [torchWanted, step, activeGroupId, fishScanOpen, photoCamOpen]);

  // Torch workaround (Photo) ✅
  useEffect(() => {
    if (!photoTorchWanted) {
      setPhotoTorchArmed(false);
      return;
    }
    setPhotoTorchArmed(false);
    const id = setTimeout(() => setPhotoTorchArmed(true), 180);
    return () => clearTimeout(id);
  }, [photoTorchWanted, photoCamOpen]);

  /* ---------------- load owner db id + owner code ---------------- */
  const loadOwnerFromLogin = async (): Promise<{
    id: number;
    code: string;
  } | null> => {
    try {
      setOwnerLoading(true);

      const userId = Number(resolvedUserId);
      if (!userId || Number.isNaN(userId)) return null;

      const headers = await authHeaders();
      const url = `${API_BASE}/api/owner/fetch/${userId}`;

      const res = await fetch(url, { method: "GET", headers });

      const text = await res.text();
      let json: any = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {}

      if (!res.ok) {
        console.log("[OWNER FETCH FAIL]", res.status, url, text);
        return null;
      }

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

      const oc = normalizeOwnerCode(
        String(ocDirect || ocDeep || ocFallback || ""),
      );

      setOwnerId(ownerDbId);
      setOwnerCode(oc);

      await writeOwnerCacheByUser(userId, ownerDbId);
      if (oc) await writeOwnerCodeCacheByUser(userId, oc);

      return { id: ownerDbId, code: oc };
    } catch (e: any) {
      console.log("[OWNER EX]", String(e?.message || e));
      return null;
    } finally {
      setOwnerLoading(false);
    }
  };

  const ensureOwnerId = async (): Promise<number | null> => {
    const userId = Number(resolvedUserId);
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

      await writeVesselCache(ownerDbId, list);
    } finally {
      setVesselLoading(false);
    }
  };

  /* ---------------- fetch approved trips for owner ---------------- */
  const fetchTripsByStatus = async (owner_code: string, status: string) => {
    const headers = await authHeaders();
    const url = `${API_BASE}/api/trip/owner/${encodeURIComponent(
      owner_code,
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
        setTrips([]);
        return;
      }

      const candidates = ["approved", "APPROVED", "Approved"];

      let final: any[] = [];
      for (const st of candidates) {
        const r = await fetchTripsByStatus(owner_code, st);
        if (!r.ok) continue;

        const approvedOnly = r.list.filter((x: any) => {
          const s = String(
            x?.approval_status ?? x?.approvalStatus ?? "",
          ).toLowerCase();
          return !s ? true : s === "approved";
        });

        if (approvedOnly.length > 0) {
          final = approvedOnly;
          break;
        }
        final = approvedOnly;
      }

      setTrips(final);
      await writeTripCache(owner_code, final);
    } finally {
      setTripLoading(false);
    }
  };

  /* ---------------- sync global network state locally + retrigger loads when online ---------------- */
  useEffect(() => {
    setIsOnline(globalNetworkState);
  }, [globalNetworkState]);

  // when network comes back online, retrigger initial owner/vessels/trips loads
  useEffect(() => {
    if (!globalNetworkState || !meUser?.id) return;

    (async () => {
      const oid = await ensureOwnerId();
      if (oid) await fetchOwnerVessels(oid);

      const oc = normalizeOwnerCode(ownerCode);
      if (oc) await fetchApprovedTrips(oc);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalNetworkState, meUser?.id]);

  /* ---------------- fish load ---------------- */
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
    if (globalNetworkState) doFlush();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, resolvedUserId]);

  /* ---------------- initial: owner -> vessels ---------------- */
  useEffect(() => {
    (async () => {
      if (!resolvedUserId) return;

      const net = await NetInfo.fetch();
      const online = !!net.isConnected && (net.isInternetReachable ?? true);
      setIsOnline(online);

      const userId = Number(resolvedUserId);

      const oid = globalNetworkState
        ? await ensureOwnerId()
        : await readOwnerCacheByUser(userId);
      if (!oid) return;

      const cachedV = await readVesselCache(oid);
      if (cachedV.length > 0) setVessels(cachedV);

      if (globalNetworkState) await fetchOwnerVessels(oid);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedUserId]);

  /* ---------------- ownerCode -> trips ---------------- */
  useEffect(() => {
    (async () => {
      setTripId("");
      setTripLabelText("");

      const userId = Number(resolvedUserId);
      if (!userId) {
        setTrips([]);
        return;
      }

      let oc = normalizeOwnerCode(ownerCode);

      if (!oc) {
        const cached = await readOwnerCodeCacheByUser(userId);
        oc = normalizeOwnerCode(cached);
        if (oc) setOwnerCode(oc);
      }

      if (!oc && globalNetworkState) {
        const loaded = await loadOwnerFromLogin();
        oc = normalizeOwnerCode(String(loaded?.code || ""));
        if (oc) setOwnerCode(oc);
      }

      if (!oc) {
        setTrips([]);
        return;
      }

      const cachedTrips = await readTripCache(oc);
      if (cachedTrips.length > 0) setTrips(cachedTrips);

      if (globalNetworkState) await fetchApprovedTrips(oc);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, resolvedUserId, ownerCode]);

  /* ---------------- ✅ Sync status ---------------- */
  const syncState: SyncState = useMemo(() => {
    if (syncing) return "SYNCING";
    if (isOnline && pendingCount === 0) return "SYNCED";
    return "NOT_SYNCED";
  }, [syncing, isOnline, pendingCount]);

  const syncIcon = useMemo(() => {
    if (syncState === "SYNCED") return "cloud-done-outline";
    if (syncState === "SYNCING") return "sync-outline";
    return isOnline ? "cloud-upload-outline" : "cloud-offline-outline";
  }, [syncState, isOnline]);

  const syncColor = useMemo(() => {
    if (syncState === "SYNCED") return "#1f7a3f";
    if (syncState === "SYNCING") return "#2563eb";
    return "#b45309";
  }, [syncState]);

  const syncText = useMemo(() => {
    if (syncState === "SYNCED") return t.syncSynced;
    if (syncState === "SYNCING") return t.syncSyncing;
    return t.syncNotSynced;
  }, [syncState, t]);

  const scanFishEnabled = syncState === "SYNCED";

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

  const tripOptions = useMemo(() => {
    return trips
      .map((tr) => {
        const key = tripKey(tr);
        if (!key) return null;
        return { key, label: tripLabel(tr), _raw: tr } as any;
      })
      .filter(Boolean) as Array<PickerItem & { _raw: Trip }>;
  }, [trips]);

  const fishOptions = useMemo(() => {
    return fishTypes
      .filter((f) => typeof f?.id === "number" && fishNameOf(f))
      .map((f) => ({
        key: String(f.id),
        label: fishNameOf(f),
        imageUri: fishImageOf(f),
      }));
  }, [fishTypes]);

  /* ---------------- when vessel changes -> reset trip selection + reset groups ---------------- */
  useEffect(() => {
    setTripId("");
    setTripLabelText("");

    const fresh = createFishGroup(initialQr);
    initGroupRef.current = fresh;
    setGroups([fresh]);
    setActiveGroupId(fresh.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVesselDbId, selectedVesselCode]);

  /* ---------------- Group derived helpers ---------------- */
  const activeGroup = useMemo(
    () => groups.find((g) => g.id === activeGroupId) || null,
    [groups, activeGroupId],
  );

  const totalQrCount = useMemo(
    () => groups.reduce((sum, g) => sum + (g.scanned?.length || 0), 0),
    [groups],
  );

  // ✅ images NOT mandatory now -> removed from done condition
  const allGroupsDone = useMemo(() => {
    if (!groups || groups.length === 0) return false;
    return groups.every(
      (g) =>
        g.phase === "DONE" &&
        !!g.fishId &&
        (g.scanned?.length || 0) > 0,
    );
  }, [groups]);

  /* ---------------- Group actions ---------------- */
  const addGroup = () => {
    const last = groups[groups.length - 1];
    if (last && last.phase !== "DONE") {
      Alert.alert(
        t.required,
        lang === "ta" ? "முதலில் தற்போதைய Fish-ஐ முடிக்கவும்." : "Finish current fish first.",
      );
      return;
    }

    const g = createFishGroup("");
    setGroups((prev) => [...prev, g]);
    setActiveGroupId(g.id);
  };

  const removeGroup = (groupId: string) => {
    Alert.alert(t.required, t.deleteGroup, [
      { text: t.no, style: "cancel" as const },
      {
        text: t.yes,
        style: "destructive" as const,
        onPress: () => {
          setGroups((prev) => {
            const next = prev.filter((g) => g.id !== groupId);
            if (next.length === 0) {
              const fresh = createFishGroup(initialQr);
              initGroupRef.current = fresh;
              setActiveGroupId(fresh.id);
              return [fresh];
            }
            if (activeGroupId === groupId) setActiveGroupId(next[0].id);
            return next;
          });
        },
      },
    ]);
  };

  const setGroupFish = (groupId: string, fishId: number, fishName: string) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, fishId, fishName } : g)),
    );
  };

  const addQrToGroup = (groupId: string, qr: string) => {
    const value = String(qr || "").trim();
    if (!value) return false;

    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        if (g.phase !== "SCAN") return g;
        if (g.scanned.some((x) => x.id === value)) return g;
        return {
          ...g,
          scanned: [...g.scanned, { id: value, kind: classifyQr(value) }],
        };
      }),
    );

    return true;
  };

  const removeQrFromGroup = (groupId: string, qrId: string) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        const next = g.scanned.filter((x) => x.id !== qrId);
        return { ...g, scanned: next };
      }),
    );
  };

  const clearGroupQrs = (groupId: string) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, scanned: [], phase: "SCAN" } : g)),
    );
  };

  const startPhotoStage = (groupId: string) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        if (g.phase !== "SCAN") return g;
        if (!g.fishId) return g;
        if ((g.scanned?.length || 0) === 0) return g;
        return { ...g, phase: "PHOTO" };
      }),
    );
  };

  const backToScanStage = (groupId: string) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, phase: "SCAN" } : g)),
    );
  };

  // ✅ finish allowed even with 0 images (optional)
  const finishFishGroup = (groupId: string) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        if (g.phase !== "PHOTO") return g;
        return { ...g, phase: "DONE" };
      }),
    );
  };

  const addImageToGroup = (groupId: string, uri: string) => {
    if (!uri) return;
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        const next = [...(g.images || []), uri].slice(0, 2);
        return { ...g, images: next };
      }),
    );
  };

  const removeImageFromGroup = (groupId: string, uri: string) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        return { ...g, images: (g.images || []).filter((u) => u !== uri) };
      }),
    );
  };

  /* ---------------- Fish Tag Scan modal ---------------- */
  const openFishScan = () => {
    if (!scanFishEnabled) {
      Alert.alert("Sync Required", t.scanDisabledMsg);
      return;
    }
    setFishScanOpen(true);
  };

  const onFishTagScanned = (value: string) => {
    const v = String(value || "").trim();
    if (!v) return;
    if (!fishScanCanScan) return;

    Vibration.vibrate(40);

    setFishScanCanScan(false);
    setFishScanOpen(false);

    router.push({
      pathname: "/catch-logs/details",
      params: { crateId: v },
    });

    setTimeout(() => setFishScanCanScan(true), 500);
  };

  /* ---------------- scan rules (SCAN stage only) ---------------- */
  const scanEnabledBase = !!selectedVesselDbId && !!tripId;
  const activeGroupCanScan =
    !!activeGroup &&
    activeGroup.phase === "SCAN" &&
    !!activeGroup.fishId &&
    scanEnabledBase &&
    step === 2;

  const onBarcodeScanned = (data: string) => {
    if (!activeGroupCanScan) return;
    if (!activeGroup) return;

    const value = String(data || "").trim();
    if (!value) return;
    if (!canScan) return;

    setCanScan(false);
    addQrToGroup(activeGroup.id, value);

    Vibration.vibrate(40);

    setTimeout(() => setCanScan(true), 350);
  };

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
        },
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
    if (!selectedVesselDbId) return Alert.alert(t.required, t.chooseVessel), false;
    if (!tripId) return Alert.alert(t.required, t.chooseTrip), false;
    return true;
  };

  // ✅ removed "photos mandatory" validation
  const validateStep2 = () => {
    if (!validateStep1()) return false;
    if (!groups || groups.length === 0)
      return (Alert.alert(t.required, t.errNeedFishGroup), false);

    const fishMissing = groups.some((g) => !g.fishId);
    if (fishMissing) return Alert.alert(t.required, t.errGroupFishMissing), false;

    const qrMissing = groups.some((g) => (g.scanned?.length || 0) === 0);
    if (qrMissing) return Alert.alert(t.required, t.errGroupQrMissing), false;

    const notDone = groups.some((g) => g.phase !== "DONE");
    if (notDone) {
      Alert.alert(
        t.required,
        lang === "ta"
          ? "ஒவ்வொரு Fish-உம் முடிக்க வேண்டும் (SCAN → (optional PHOTOS) → DONE)."
          : "Finish each fish (SCAN → (optional PHOTOS) → DONE).",
      );
      return false;
    }

    return true;
  };

  const nowPreview = useMemo(
    () => new Date(),
    [step, totalQrCount, tripId, selectedVesselDbId],
  );

  /* ---------------- photo camera modal actions (group photos) ---------------- */
  const openPhotoCamera = async (groupId: string) => {
    try {
      if (!cameraPerm?.granted) {
        const res = await requestCameraPerm();
        if (!res?.granted) {
          Alert.alert("Permission", "Allow camera access to capture photos.");
          return;
        }
      }

      await AsyncStorage.setItem(CAMERA_SESSION_KEY, "1");
      setPhotoTargetGroupId(groupId);
      setPhotoCamOpen(true);
    } catch (e: any) {
      Alert.alert("Camera error", String(e?.message || e));
    }
  };

  const closePhotoCamera = async () => {
    setPhotoCamOpen(false);
    setPhotoTargetGroupId(null);
    setTakingPhoto(false);
    try {
      await AsyncStorage.removeItem(CAMERA_SESSION_KEY);
    } catch {}
  };

  const takePhotoNow = async () => {
    if (!photoTargetGroupId) return;
    if (takingPhoto) return;

    const g = groups.find((x) => x.id === photoTargetGroupId);
    if ((g?.images?.length || 0) >= 2) {
      Alert.alert("Max", t.max2);
      return;
    }

    setTakingPhoto(true);
    try {
      const ref = photoCamRef.current;
      if (!ref?.takePictureAsync) throw new Error("Camera not ready");

      const now = new Date();

      const pic = await ref.takePictureAsync({
        quality: 0.85,
        skipProcessing: true,
      });

      const rawUri = String(pic?.uri || "");
      if (!rawUri) throw new Error("No photo uri");

      // ✅ Build watermark text (Date+Time + Location lat/lng)
      const line1 = `Date/Time: ${fmtDateTime(now)}`;
      const line2 = locText(liveLoc);

      // ✅ Decide output size (cap max side to avoid memory crash)
      let w = Number((pic as any)?.width || 0);
      let h = Number((pic as any)?.height || 0);
      if (!w || !h) {
        w = 1080;
        h = 1920;
      }
      const MAX_SIDE = 1280;
      const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
      const outW = Math.max(480, Math.round(w * scale));
      const outH = Math.max(480, Math.round(h * scale));

      let finalUri = rawUri;

      try {
        // ✅ Create watermarked file using offscreen view-shot
        finalUri = await watermarkAsync(rawUri, outW, outH, line1, line2);
      } catch (e: any) {
        console.log("[WATERMARK FAIL]", String(e?.message || e));
        finalUri = rawUri;
      }

      addImageToGroup(photoTargetGroupId, finalUri);
      await closePhotoCamera();
    } catch (e: any) {
      Alert.alert("Photo error", String(e?.message || e));
    } finally {
      setTakingPhoto(false);
    }
  };

  /* ---------------- save ---------------- */
  const save = async () => {
    if (!validateStep2()) return;

    const now = new Date();

    const userId = Number(resolvedUserId);
    let ownerFinal: number | null =
      ownerId || (userId ? await readOwnerCacheByUser(userId) : null);

    if (isOnline && !ownerFinal) {
      const loaded = await loadOwnerFromLogin();
      ownerFinal = loaded?.id ?? null;
    }

    if (isOnline && !ownerFinal)
      return Alert.alert("Owner", "owner_id (numeric) not loaded");

    const baseCommon: any = {
      tripId,
      rvVesselId: selectedVesselCode,
      ownerId: isOnline ? ownerFinal! : ownerFinal || 0,
      weightKg: 0,
      catchDate: fmtDate(now),
      catchTime: fmtTime(now),
      ...(liveLoc
        ? { latitude: liveLoc.latitude, longitude: liveLoc.longitude }
        : {}),
    };

    const payloads: any[] = [];
    for (const g of groups) {
      for (const q of g.scanned) {
        payloads.push({
          ...baseCommon,
          fishId: g.fishId!,
          fishName: g.fishName || undefined,
          linkedCrateId: q.id,
          qrKind: q.kind,
          images: g.images || [], // can be empty now
        });
      }
    }

    if (!isOnline) {
      for (const p of payloads) await enqueueCatchLog(p as any);
      const c = await getQueueCount();
      setPendingCount(c);

      Alert.alert(t.saved, t.offlineSaved);
      router.replace({
        pathname: "/catch-logs/details",
        params: { crateId: payloads[0]?.linkedCrateId || "" },
      });
      return;
    }

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
            `${t.offlineSaved}\n\nUploaded: ${ok}\nQueued (offline): ${queued}`,
          );

          router.replace({
            pathname: "/catch-logs/details",
            params: { crateId: payloads[0]?.linkedCrateId || "" },
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
      params: { crateId: payloads[0]?.linkedCrateId || "" },
    });
  };

  /* ---------------- UI helpers ---------------- */
  const groupChip = (g: FishGroup, idx: number) => {
    const active = g.id === activeGroupId;
    const label = g.fishName ? g.fishName : `${t.group} ${idx + 1}`;
    const count = g.scanned?.length || 0;

    const phaseText =
      g.phase === "SCAN" ? t.phaseScan : g.phase === "PHOTO" ? t.phasePhoto : t.phaseDone;

    return (
      <Pressable
        key={g.id}
        onPress={() => setActiveGroupId(g.id)}
        className={`mr-2 rounded-full border px-3 py-2 active:opacity-80 ${
          active ? "bg-[#fff3e7] border-[#ffd9b6]" : `bg-white ${UI.border}`
        }`}
        style={{ maxWidth: 240 }}
      >
        <Text className={`text-sm font-extrabold ${UI.text}`} numberOfLines={1}>
          {label}
        </Text>
        <Text className={`text-[11px] ${UI.muted}`} numberOfLines={1}>
          {t.groupQrCount(count)} • {phaseText} • img {g.images?.length || 0} ({t.optional})
        </Text>
      </Pressable>
    );
  };

  const phaseBadge = (g: FishGroup | null) => {
    if (!g) return null;
    const label = g.phase === "SCAN" ? t.phaseScan : g.phase === "PHOTO" ? t.phasePhoto : t.phaseDone;
    const bg =
      g.phase === "DONE"
        ? "bg-emerald-50 border-emerald-200"
        : g.phase === "PHOTO"
          ? "bg-blue-50 border-blue-200"
          : "bg-amber-50 border-amber-200";
    const txt =
      g.phase === "DONE"
        ? "text-emerald-800"
        : g.phase === "PHOTO"
          ? "text-blue-800"
          : "text-amber-800";

    return (
      <View className={`rounded-full border px-3 py-1 ${bg}`} style={{ flexShrink: 0 }}>
        <Text className={`text-xs font-extrabold ${txt}`} numberOfLines={1}>
          {label}
        </Text>
      </View>
    );
  };

  const scanTorchEnabled = torchWanted && torchArmed;
  const photoTorchEnabled = photoTorchWanted && photoTorchArmed;

  const openFishPickerForGroup = (groupId: string) => {
    setFishPickGroupId(groupId);
    fishRef.current?.present();
  };

  const clearAll = () => {
    const fresh = createFishGroup(initialQr);
    initGroupRef.current = fresh;
    setGroups([fresh]);
    setActiveGroupId(fresh.id);
    setStep(1);
    setSelectedVesselDbId(null);
    setSelectedVesselLabel("");
    setSelectedVesselCode("");
    setTripId("");
    setTripLabelText("");
  };

  const goNext = () => {
    if (step === 1) {
      if (!validateStep1()) return;
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!validateStep2()) return;
      setStep(3);
      return;
    }
    if (step === 3) {
      setStep(4);
      return;
    }
  };

  const goBack = () => {
    if (step === 1) return;
    setStep((s) => (s === 2 ? 1 : s === 3 ? 2 : 3));
  };

  /* ---------------- UI ---------------- */
  return (
    <SafeAreaView className={`flex-1 ${UI.bg}`}>
      {/* ✅ Photo Preview Modal */}
      <Modal
        visible={!!imgPreviewUri}
        transparent
        animationType="fade"
        onRequestClose={() => setImgPreviewUri(null)}
      >
        <View className="flex-1 bg-black/90 justify-center px-4">
          <View className="rounded-3xl overflow-hidden bg-black border border-white/10">
            <View className="flex-row items-center justify-between px-4 py-3 bg-black/60">
              <Text
                className="text-white font-extrabold text-base"
                numberOfLines={1}
                style={{ flex: 1 }}
              >
                {t.imgPreviewTitle}
              </Text>
              <Pressable
                onPress={() => setImgPreviewUri(null)}
                className="rounded-full px-3 py-2 active:opacity-80"
                style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
              >
                <Text className="text-white font-semibold">{t.close}</Text>
              </Pressable>
            </View>

            <View style={{ height: 420, backgroundColor: "black" }}>
              {imgPreviewUri ? (
                <Image
                  source={{ uri: imgPreviewUri }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="contain"
                />
              ) : null}
            </View>
          </View>
        </View>
      </Modal>

      {/* ✅ Fish Tag Scan Modal */}
      <Modal
        visible={fishScanOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setFishScanOpen(false)}
      >
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white rounded-t-3xl p-4">
            <View className="flex-row items-center justify-between">
              <Text
                className={`text-lg font-extrabold ${UI.text}`}
                numberOfLines={1}
                style={{ flex: 1 }}
              >
                {t.scanModalTitle}
              </Text>
              <Pressable
                onPress={() => setFishScanOpen(false)}
                className={`rounded-full border ${UI.border} bg-[#fbf6f1] px-3 py-2 active:opacity-80`}
              >
                <Text className={`text-sm font-semibold ${UI.text}`} numberOfLines={1}>
                  {t.close}
                </Text>
              </Pressable>
            </View>

            <View className="mt-3 overflow-hidden rounded-2xl border border-[#ead7c8] bg-black">
              {!cameraPerm?.granted ? (
                <View className="p-4">
                  <Text className="text-white text-base font-semibold">{t.camDenied}</Text>
                  <Pressable
                    onPress={requestCameraPerm}
                    className="mt-3 rounded-2xl px-4 py-3 active:opacity-80"
                    style={{ backgroundColor: UI.accent }}
                  >
                    <Text className="text-center text-white font-extrabold text-base">
                      {t.grantCam}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <View style={{ height: 320 }}>
                  <CameraView
                    style={{ flex: 1 }}
                    facing="back"
                    enableTorch={scanTorchEnabled}
                    barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                    onBarcodeScanned={(e) => onFishTagScanned(String((e as any)?.data || ""))}
                  />
                </View>
              )}
            </View>

            <Text className={`mt-3 text-xs ${UI.muted}`} style={{ flexShrink: 1 }}>
              Scan is enabled only after Fully Synced (read-only dynamic data view).
            </Text>
          </View>
        </View>
      </Modal>

      {/* ✅ Photo Camera Modal (GROUP photos) */}
      <Modal
        visible={photoCamOpen}
        transparent
        animationType="fade"
        onRequestClose={closePhotoCamera}
      >
        <View className="flex-1 bg-black/70 justify-center px-4">
          <View className="bg-white rounded-3xl p-4">
            <View className="flex-row items-center justify-between">
              <Text
                className={`text-lg font-extrabold ${UI.text}`}
                numberOfLines={1}
                style={{ flex: 1 }}
              >
                {t.photoCamTitle}
              </Text>

              {/* ✅ Photo flashlight toggle (inside photo modal) */}
              <Pressable
                onPress={() => setPhotoTorchWanted((p) => !p)}
                className={`mr-2 rounded-full border ${UI.border} bg-[#fbf6f1] px-3 py-2 active:opacity-80`}
              >
                <Text className={`text-xs font-extrabold ${UI.text}`}>
                  {t.torch}: {photoTorchWanted ? t.torchOn : t.torchOff}
                </Text>
              </Pressable>

              <Pressable
                onPress={closePhotoCamera}
                className={`rounded-full border ${UI.border} bg-[#fbf6f1] px-3 py-2 active:opacity-80`}
              >
                <Text className={`text-sm font-semibold ${UI.text}`} numberOfLines={1}>
                  {t.cancel}
                </Text>
              </Pressable>
            </View>

            <View className="mt-3 overflow-hidden rounded-2xl border border-[#ead7c8] bg-black">
              {!cameraPerm?.granted ? (
                <View className="p-4">
                  <Text className="text-white text-base font-semibold">{t.camDenied}</Text>
                  <Pressable
                    onPress={requestCameraPerm}
                    className="mt-3 rounded-2xl px-4 py-3 active:opacity-80"
                    style={{ backgroundColor: UI.accent }}
                  >
                    <Text className="text-center text-white font-extrabold text-base">
                      {t.grantCam}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <View style={{ height: 380 }}>
                  <CameraView
                    ref={photoCamRef}
                    style={{ flex: 1 }}
                    facing="back"
                    enableTorch={photoTorchEnabled}
                  />
                </View>
              )}
            </View>

            <Pressable
              onPress={takePhotoNow}
              className="mt-3 rounded-2xl px-4 py-4 active:opacity-90"
              style={{ backgroundColor: UI.accent, opacity: takingPhoto ? 0.7 : 1 }}
              disabled={takingPhoto}
            >
              <Text className="text-center text-white text-lg font-extrabold" numberOfLines={1}>
                {takingPhoto ? (lang === "ta" ? "எடுக்கிறது..." : "Capturing...") : t.takePhoto}
              </Text>
            </Pressable>

            <Text className={`mt-2 text-xs ${UI.muted}`}>{t.max2}</Text>
          </View>
        </View>
      </Modal>

      {/* ---------------- HEADER ---------------- */}
      <View className="px-4 pt-2 pb-3">
        <View className="flex-row items-center justify-between">
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text className={`text-xl font-extrabold ${UI.text}`} numberOfLines={1}>
              {t.title}
            </Text>
            <Text className={`text-xs ${UI.muted}`} numberOfLines={1}>
              {t.step(step)} • {isOnline ? "Online" : "Offline"} • {t.pending}: {pendingCount}
            </Text>
          </View>

          <Pressable
            onPress={() => setLang((p) => (p === "ta" ? "en" : "ta"))}
            className={`rounded-full border ${UI.border} bg-white px-3 py-2 active:opacity-80`}
          >
            <Text className={`text-sm font-extrabold ${UI.text}`}>{t.langBtn}</Text>
          </Pressable>

          <View style={{ width: 10 }} />

          <View className="flex-row items-center">
            <Ionicons name={syncIcon as any} size={18} color={syncColor} />
            <Text className="ml-2 text-xs font-bold" style={{ color: syncColor }}>
              {syncText}
            </Text>
          </View>
        </View>

        <View className="mt-3 flex-row items-center justify-between">
          <Pressable
            onPress={() => setTorchWanted((p) => !p)}
            className={`rounded-full border ${UI.border} bg-white px-3 py-2 active:opacity-80`}
          >
            <Text className={`text-xs font-extrabold ${UI.text}`}>
              {t.torch}: {torchWanted ? t.torchOn : t.torchOff}
            </Text>
          </Pressable>

          <Pressable
            onPress={openFishScan}
            className="rounded-full px-4 py-2 active:opacity-80"
            style={{ backgroundColor: scanFishEnabled ? UI.accent : "#c9b8a7" }}
          >
            <Text className="text-white font-extrabold text-sm">{t.scanBtn}</Text>
          </Pressable>

          <Pressable
            onPress={clearAll}
            className={`rounded-full border ${UI.border} bg-white px-3 py-2 active:opacity-80`}
          >
            <Text className={`text-xs font-extrabold ${UI.text}`}>{t.clearAll}</Text>
          </Pressable>
        </View>
      </View>

      {/* ---------------- CONTENT ---------------- */}
      <ScrollView className="px-4" contentContainerStyle={{ paddingBottom: 18 }}>
        {/* STEP 1 */}
        {step === 1 ? (
          <View>
            <Card className="p-4">
              <Text className={`text-sm ${UI.muted}`}>{t.step1Hint}</Text>

              <View className="mt-3">
                <FieldCard>
                  <SelectField
                    label={t.vessel}
                    value={selectedVesselLabel}
                    placeholder={t.chooseVessel}
                    hint={
                      vesselLoading
                        ? t.loadingVessel
                        : vessels.length
                          ? `${vessels.length} vessels`
                          : t.noVessels
                    }
                    onPress={() => vesselRef.current?.present()}
                  />
                </FieldCard>

                <View style={{ height: 12 }} />

                <FieldCard>
                  <SelectField
                    label={t.trip}
                    value={tripLabelText}
                    placeholder={t.chooseTrip}
                    hint={
                      tripLoading
                        ? t.loadingTrips
                        : trips.length
                          ? `${trips.length} trips`
                          : t.noTrips
                    }
                    onPress={() => tripRef.current?.present()}
                  />
                </FieldCard>

                <View className="mt-3">
                  <Text className={`text-xs ${UI.muted}`}>
                    {ownerLoading ? t.loadingOwner : `Owner: ${ownerCode || "—"} (${ownerId || "—"})`}
                  </Text>
                  <Text className={`mt-1 text-xs ${UI.muted}`}>
                    {fishLoading ? t.loadingFish : `Fish types: ${fishTypes.length}`}
                  </Text>
                </View>
              </View>
            </Card>
          </View>
        ) : null}

        {/* STEP 2 */}
        {step === 2 ? (
          <View>
            <Card className="p-4">
              <View className="flex-row items-center justify-between">
                <Text className={`text-base font-extrabold ${UI.text}`}>
                  {t.fishGroupsTitle}
                </Text>
                <Pressable
                  onPress={addGroup}
                  className="rounded-full px-3 py-2 active:opacity-80"
                  style={{ backgroundColor: UI.accent }}
                >
                  <Text className="text-white font-extrabold">{t.addFish}</Text>
                </Pressable>
              </View>

              <Text className={`mt-2 text-xs ${UI.muted}`}>{t.step2Hint}</Text>

              <ScrollView horizontal className="mt-3" showsHorizontalScrollIndicator={false}>
                {groups.map((g, idx) => groupChip(g, idx))}
              </ScrollView>

              <View className="mt-3 flex-row items-center justify-between">
                <Text className={`text-xs ${UI.muted}`}>{t.totalQr(totalQrCount)}</Text>
                {phaseBadge(activeGroup)}
              </View>

              {!activeGroup ? (
                <Text className={`mt-3 text-sm ${UI.muted}`}>{t.selectGroupToScan}</Text>
              ) : (
                <View className="mt-3">
                  {/* group header */}
                  <View className="flex-row items-center justify-between">
                    <Pressable
                      onPress={() => openFishPickerForGroup(activeGroup.id)}
                      className={`rounded-2xl border ${UI.border} bg-[#fbf6f1] px-4 py-3 active:opacity-80`}
                      style={{ flex: 1 }}
                    >
                      <Text className={`text-xs ${UI.muted}`}>{t.selectFish}</Text>
                      <Text className={`mt-1 text-base font-extrabold ${UI.text}`} numberOfLines={1}>
                        {activeGroup.fishName || t.chooseSpecies}
                      </Text>
                    </Pressable>

                    <View style={{ width: 10 }} />

                    <Pressable
                      onPress={() => removeGroup(activeGroup.id)}
                      className="rounded-2xl border border-red-200 bg-red-50 px-3 py-3 active:opacity-80"
                    >
                      <Ionicons name="trash-outline" size={18} color="#b91c1c" />
                    </Pressable>
                  </View>

                  {/* SCAN stage */}
                  {activeGroup.phase === "SCAN" ? (
                    <View className="mt-3">
                      <Text className={`text-xs ${UI.muted}`}>{t.scanHint}</Text>

                      <View className="mt-2 overflow-hidden rounded-2xl border border-[#ead7c8] bg-black">
                        {!cameraPerm?.granted ? (
                          <View className="p-4">
                            <Text className="text-white text-base font-semibold">{t.camDenied}</Text>
                            <Pressable
                              onPress={requestCameraPerm}
                              className="mt-3 rounded-2xl px-4 py-3 active:opacity-80"
                              style={{ backgroundColor: UI.accent }}
                            >
                              <Text className="text-center text-white font-extrabold text-base">
                                {t.grantCam}
                              </Text>
                            </Pressable>
                          </View>
                        ) : (
                          <View style={{ height: 300 }}>
                            <CameraView
                              style={{ flex: 1 }}
                              facing="back"
                              enableTorch={scanTorchEnabled}
                              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                              onBarcodeScanned={(e) =>
                                onBarcodeScanned(String((e as any)?.data || ""))
                              }
                            />
                          </View>
                        )}
                      </View>

                      <View className="mt-3 flex-row items-center justify-between">
                        <Pressable
                          onPress={() => clearGroupQrs(activeGroup.id)}
                          className={`rounded-full border ${UI.border} bg-white px-4 py-2 active:opacity-80`}
                        >
                          <Text className={`text-xs font-extrabold ${UI.text}`}>{t.clearAll}</Text>
                        </Pressable>

                        <Pressable
                          onPress={() => {
                            if (!activeGroup.fishId) {
                              Alert.alert(t.required, t.groupNeedsFish);
                              return;
                            }
                            if ((activeGroup.scanned?.length || 0) === 0) {
                              Alert.alert(t.required, t.errGroupQrMissing);
                              return;
                            }
                            startPhotoStage(activeGroup.id);
                          }}
                          className="rounded-full px-5 py-2 active:opacity-80"
                          style={{ backgroundColor: UI.accent }}
                        >
                          <Text className="text-white font-extrabold">{t.doneScanning}</Text>
                        </Pressable>
                      </View>

                      {/* scanned list */}
                      <View className="mt-3">
                        <Text className={`text-sm font-extrabold ${UI.text}`}>
                          {t.scannedList} • {t.scanCount(activeGroup.scanned?.length || 0)}
                        </Text>

                        {(activeGroup.scanned || []).map((q) => (
                          <View
                            key={q.id}
                            className={`mt-2 rounded-2xl border ${UI.border} bg-white px-3 py-2`}
                          >
                            <View className="flex-row items-center justify-between">
                              <View style={{ flex: 1, minWidth: 0 }}>
                                <Text className={`text-sm font-bold ${UI.text}`} numberOfLines={1}>
                                  {q.id}
                                </Text>
                                <Text className={`text-xs ${UI.muted}`} numberOfLines={1}>
                                  {q.kind}
                                </Text>
                              </View>
                              <Pressable
                                onPress={() => removeQrFromGroup(activeGroup.id, q.id)}
                                className="rounded-full px-2 py-2 active:opacity-80"
                              >
                                <Ionicons name="close-circle-outline" size={20} color="#9a3412" />
                              </Pressable>
                            </View>
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : null}

                  {/* PHOTO stage */}
                  {activeGroup.phase === "PHOTO" ? (
                    <View className="mt-3">
                      <Text className={`text-sm font-extrabold ${UI.text}`}>
                        {t.photosStageTitle}
                      </Text>
                      <Text className={`mt-1 text-xs ${UI.muted}`}>
                        {t.autoHint}
                      </Text>

                      <View className="mt-3 flex-row items-center">
                        <Pressable
                          onPress={() => backToScanStage(activeGroup.id)}
                          className={`rounded-full border ${UI.border} bg-white px-4 py-2 active:opacity-80`}
                        >
                          <Text className={`text-xs font-extrabold ${UI.text}`}>{t.scanMore}</Text>
                        </Pressable>

                        <View style={{ width: 10 }} />

                        <Pressable
                          onPress={() => openPhotoCamera(activeGroup.id)}
                          className="rounded-full px-4 py-2 active:opacity-80"
                          style={{ backgroundColor: UI.accent }}
                        >
                          <Text className="text-white font-extrabold">{t.capturePhoto}</Text>
                        </Pressable>

                        <View style={{ flex: 1 }} />

                        <Pressable
                          onPress={() => finishFishGroup(activeGroup.id)}
                          className="rounded-full px-4 py-2 active:opacity-80"
                          style={{ backgroundColor: "#1f7a3f" }}
                        >
                          <Text className="text-white font-extrabold">
                            {(activeGroup.images?.length || 0) > 0 ? t.finishFish : t.skipPhotos}
                          </Text>
                        </Pressable>
                      </View>

                      <View className="mt-3">
                        {(activeGroup.images || []).map((u) => (
                          <View
                            key={u}
                            className={`mt-2 overflow-hidden rounded-2xl border ${UI.border} bg-white`}
                          >
                            <Pressable onPress={() => setImgPreviewUri(u)} className="active:opacity-95">
                              <Image source={{ uri: u }} style={{ width: "100%", height: 210 }} resizeMode="cover" />
                            </Pressable>

                            <View className="flex-row items-center justify-between px-3 py-2">
                              <Text className={`text-xs ${UI.muted}`} numberOfLines={1}>
                                {t.photo}
                              </Text>
                              <Pressable
                                onPress={() => removeImageFromGroup(activeGroup.id, u)}
                                className="rounded-full px-3 py-2 active:opacity-80"
                              >
                                <Text className="text-xs font-extrabold" style={{ color: "#b91c1c" }}>
                                  {t.remove}
                                </Text>
                              </Pressable>
                            </View>
                          </View>
                        ))}

                        {(activeGroup.images?.length || 0) === 0 ? (
                          <Text className={`mt-2 text-xs ${UI.muted}`}>
                            {lang === "ta"
                              ? "Photo optional. இல்லாமல் கூட DONE செய்யலாம்."
                              : "Photo optional. You can finish without photos."}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  ) : null}

                  {/* DONE stage */}
                  {activeGroup.phase === "DONE" ? (
                    <View className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                      <Text className="text-emerald-900 font-extrabold">
                        {lang === "ta" ? "இந்த Fish முடிந்தது ✅" : "This fish is done ✅"}
                      </Text>
                      <Text className="mt-1 text-xs text-emerald-800">
                        {lang === "ta"
                          ? "அடுத்த fish group-ஐ தேர்வு செய்து தொடருங்கள்."
                          : "Select another group or add a new one."}
                      </Text>
                    </View>
                  ) : null}
                </View>
              )}
            </Card>

            <View className="mt-3">
              <FieldCard>
                <Text className={`text-sm font-extrabold ${UI.text}`}>{t.dateTime}</Text>
                <Text className={`mt-1 text-xs ${UI.muted}`}>{t.autoHint}</Text>
                <View className="mt-2 flex-row items-center justify-between">
                  <Text className={`text-xs ${UI.muted}`}>{t.date}: {fmtDate(nowPreview)}</Text>
                  <Text className={`text-xs ${UI.muted}`}>{t.time}: {fmtTime(nowPreview)}</Text>
                </View>
                <View className="mt-2">
                  <Text className={`text-xs ${UI.muted}`}>
                    {locLoading ? "Location: loading..." : locError ? locError : locText(liveLoc)}
                  </Text>
                </View>
              </FieldCard>
            </View>
          </View>
        ) : null}

        {/* STEP 3 */}
        {step === 3 ? (
          <View>
            <Card className="p-4">
              <Text className={`text-sm ${UI.muted}`}>{t.step3Hint}</Text>

              <View className="mt-3 rounded-2xl border border-[#ead7c8] bg-white px-4 py-3">
                <Text className={`text-xs ${UI.muted}`}>{t.vessel}</Text>
                <Text className={`mt-1 text-base font-extrabold ${UI.text}`}>
                  {selectedVesselLabel || "—"}
                </Text>

                <View style={{ height: 10 }} />

                <Text className={`text-xs ${UI.muted}`}>{t.trip}</Text>
                <Text className={`mt-1 text-base font-extrabold ${UI.text}`}>
                  {tripLabelText || "—"}
                </Text>

                <View style={{ height: 10 }} />

                <Text className={`text-xs ${UI.muted}`}>{t.totalQr(totalQrCount)}</Text>
              </View>

              <View className="mt-3">
                {groups.map((g, idx) => (
                  <View
                    key={g.id}
                    className={`mb-2 rounded-2xl border ${UI.border} bg-white px-4 py-3`}
                  >
                    <Text className={`text-sm font-extrabold ${UI.text}`} numberOfLines={1}>
                      {idx + 1}. {g.fishName || "—"}
                    </Text>
                    <Text className={`mt-1 text-xs ${UI.muted}`}>
                      QR: {g.scanned?.length || 0} • Photos: {g.images?.length || 0} (optional) • {g.phase}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>
          </View>
        ) : null}

        {/* STEP 4 */}
        {step === 4 ? (
          <View>
            <Card className="p-4">
              <Text className={`text-base font-extrabold ${UI.text}`}>
                {lang === "ta" ? "சேமிக்க தயாராக உள்ளது" : "Ready to Save"}
              </Text>
              <Text className={`mt-2 text-xs ${UI.muted}`}>
                {lang === "ta"
                  ? "Save அழுத்தினால் payload உருவாக்கி online হলে upload, இல்லையெனில் queue-ல் save."
                  : "Press Save to upload (online) or queue locally (offline)."}
              </Text>

              <Pressable
                onPress={save}
                disabled={posting}
                className="mt-4 rounded-2xl px-4 py-4 active:opacity-90"
                style={{ backgroundColor: posting ? "#c9b8a7" : UI.accent }}
              >
                <Text className="text-center text-white text-lg font-extrabold">
                  {posting ? (lang === "ta" ? "சேமிக்கிறது..." : "Saving...") : t.save}
                </Text>
              </Pressable>
            </Card>
          </View>
        ) : null}
      </ScrollView>

      {/* ---------------- FOOTER NAV ---------------- */}
      <View className="px-4 pb-4">
        <View className="flex-row items-center">
          <Pressable
            onPress={goBack}
            className={`rounded-2xl border ${UI.border} bg-white px-5 py-3 active:opacity-80`}
            style={{ opacity: step === 1 ? 0.5 : 1 }}
            disabled={step === 1}
          >
            <Text className={`text-base font-extrabold ${UI.text}`}>{t.back}</Text>
          </Pressable>

          <View style={{ width: 10 }} />

          {step < 4 ? (
            <Pressable
              onPress={goNext}
              className="flex-1 rounded-2xl px-5 py-3 active:opacity-80"
              style={{
                backgroundColor:
                  step === 2 ? (allGroupsDone ? UI.accent : "#c9b8a7") : UI.accent,
                opacity: step === 2 ? (allGroupsDone ? 1 : 0.7) : 1,
              }}
              disabled={step === 2 && !allGroupsDone}
            >
              <Text className="text-center text-white text-base font-extrabold">
                {t.next}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* ---------------- PICKERS ---------------- */}
      <PickerSheetObj
        title={t.chooseVessel}
        valueKey={selectedVesselDbId ? String(selectedVesselDbId) : ""}
        options={vesselOptions as any}
        sheetRef={vesselRef as any}
        onSelect={(item: any) => {
          const raw = item?._raw;
          const db = Number(item?.key || 0);
          const code = vesselCode(raw);
          setSelectedVesselDbId(db || null);
          setSelectedVesselCode(code);
          setSelectedVesselLabel(vesselLabel(raw));
        }}
      />

      <PickerSheetObj
        title={t.chooseTrip}
        valueKey={tripId}
        options={tripOptions as any}
        sheetRef={tripRef as any}
        onSelect={(item: any) => {
          const raw = item?._raw;
          const key = String(item?.key || "");
          setTripId(key);
          setTripLabelText(tripLabel(raw));
        }}
      />

      <PickerSheetObj
        title={t.chooseSpecies}
        valueKey={
          fishPickGroupId
            ? String(groups.find((g) => g.id === fishPickGroupId)?.fishId || "")
            : ""
        }
        options={fishOptions as any}
        sheetRef={fishRef as any}
        showImage
        onSelect={(item: any) => {
          const gid = fishPickGroupId;
          if (!gid) return;
          const fid = Number(item?.key || 0);
          const name = String(item?.label || "");
          if (!fid || !name) return;
          setGroupFish(gid, fid, name);
          setFishPickGroupId(null);
        }}
      />

      {/* ✅ OFFSCREEN WATERMARK VIEW (used only while watermarking) */}
      {wmJob ? (
        <View style={{ position: "absolute", left: -10000, top: -10000 }}>
          <View
            ref={(r) => (wmViewRef.current = r)}
            collapsable={false}
            style={{
              width: wmJob.outW,
              height: wmJob.outH,
              backgroundColor: "black",
            }}
          >
            <Image
              source={{ uri: wmJob.srcUri }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
              onLoad={() => setWmImgLoaded(true)}
              onError={() => setWmImgLoaded(true)}
            />

            <View
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                paddingHorizontal: 18,
                paddingVertical: 14,
                backgroundColor: "rgba(0,0,0,0.55)",
              }}
            >
              <Text
                style={{
                  color: "white",
                  fontWeight: "800",
                  fontSize: Math.max(18, Math.round(wmJob.outW * 0.018)),
                }}
                numberOfLines={1}
              >
                {wmJob.line1}
              </Text>
              <Text
                style={{
                  marginTop: 6,
                  color: "white",
                  fontWeight: "700",
                  fontSize: Math.max(16, Math.round(wmJob.outW * 0.016)),
                }}
                numberOfLines={1}
              >
                {wmJob.line2}
              </Text>
            </View>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
