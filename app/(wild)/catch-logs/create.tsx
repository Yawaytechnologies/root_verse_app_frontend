// app/(wild)/catch-logs/create.tsx
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  AppState,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  Vibration,
  View,
} from "react-native";

import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { Ionicons } from "@expo/vector-icons";
import NetInfo from "@react-native-community/netinfo";
import { CameraView, useCameraPermissions } from "expo-camera";

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";

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

type QrKind = "FISH" | "CRATE" | "VESSEL" | "UNKNOWN";
type ScannedQr = { id: string; kind: QrKind };
type SyncState = "NOT_SYNCED" | "SYNCING" | "SYNCED";

type LocalCatchLogPayload = Omit<CatchLogPayload, "ownerId"> & {
  ownerId?: number;
  fishName?: string;
  rvVesselCode?: string;
  qrKind?: QrKind;
  vessel_id?: number;
};

type Vessel = any;
type Trip = any;

// IMAGE_PROOF = new first phase (photo first, QR optional later)
type GroupPhase = "IMAGE_PROOF" | "SCAN" | "PHOTO" | "DONE";

type FishGroup = {
  id: string;
  sessionId: string; // auto-generated e.g. "IN-TN-NA-BTR-260001-S1"
  fishId: number | null;
  fishName: string;
  scanned: ScannedQr[];
  phase: GroupPhase;
  images: string[];
};

type WatermarkJob = {
  srcUri: string;
  outW: number;
  outH: number;
  lines: string[];
};

/* ---------------- CACHE KEYS ---------------- */
const FISH_CACHE_KEY = "rv_fish_types_cache_v1";
const OWNER_DBID_CACHE_PREFIX = "rv_owner_db_id_cache_user_";
const OWNER_CODE_CACHE_PREFIX = "rv_owner_code_cache_user_";
const CAMERA_SESSION_KEY = "rv_camera_session_v1";
const TOKEN_KEY = "auth_token";
const VESSEL_CACHE_PREFIX = "rv_vessels_cache_owner_";
const TRIP_CACHE_PREFIX = "rv_approved_trips_cache_owner_";
const LAST_USER_ID_KEY = "rv_last_user_id_v1";

/* ---------------- PARAM HELPERS ---------------- */
const pickParam = (v: any): string => {
  if (Array.isArray(v)) return String(v?.[0] ?? "");
  return v == null ? "" : String(v);
};

const safeDecode = (s: string) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

const safeJsonParse = (s: string) => {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

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
    vessel: "படகு (Vessel)",
    chooseVessel: "படகு தேர்வு செய்",
    trip: "பயணம் (Trip)",
    chooseTrip: "Approved Trip தேர்வு செய்",
    fishGroupsTitle: "மீன் + QR குழுக்கள்",
    addFish: "+ மீன் சேர்க்க",
    selectFish: "மீன் தேர்வு",
    chooseSpecies: "மீன் வகை தேர்வு",
    fishSelected: "தேர்ந்த மீன்",
    group: "குழு",
    selectGroupToScan: "QR scan செய்ய ஒரு குழுவை தேர்வு செய்யுங்கள்.",
    groupNeedsFish: "இந்த குழுவில் முதலில் மீன் தேர்வு செய்ய வேண்டும்.",
    groupQrCount: (n: number) => `QR: ${n}`,
    totalQr: (n: number) => `மொத்த QR: ${n}`,
    errNeedFishGroup: "குறைந்தது 1 குழு உருவாக்க வேண்டும்",
    errGroupFishMissing: "ஒவ்வொரு குழுவுக்கும் மீன் தேர்வு செய்ய வேண்டும்",
    errGroupQrMissing: "ஒவ்வொரு குழுவுக்கும் குறைந்தது 1 QR அல்லது 1 Photo தேவை.",
    scanTitle: "QR ஸ்கேன்",
    scanHint: "மீன் தேர்வு செய்த பிறகு QR scan செய்யலாம்",
    scannedList: "ஸ்கேன் செய்த QR-கள்",
    scanCount: (n: number) => `மொத்தம்: ${n}`,
    phaseScan: "SCAN",
    phasePhoto: "PHOTOS",
    phaseDone: "DONE",
    doneScanning: "QR முடிந்தது → அடுத்து",
    scanMore: "மீண்டும் QR scan",
    photosStageTitle: "மீன் புகைப்படம் (விருப்பம் 1-2)",
    capturePhoto: "புகைப்படம் எடு",
    finishFish: "இந்த மீன் முடி",
    photo: "Photo",
    camDenied: "Camera அனுமதி இல்லை",
    grantCam: "Camera அனுமதி கொடு",
    torch: "டார்ச்",
    torchOn: "ON",
    torchOff: "OFF",
    dateTime: "தேதி & நேரம் (Auto)",
    date: "தேதி",
    time: "நேரம்",
    autoHint: "Save அழுத்தும் நேரத்தில் Date/Time auto ஆக capture ஆகும்.",
    saved: "சேமிக்கப்பட்டது",
    offlineSaved: "இணையம் இல்லை. Local-ல் save. Net வந்தவுடன் auto sync ஆகும்.",
    syncing: "Syncing...",
    pending: "Pending",
    loadingOwner: "Owner loading...",
    loadingVessel: "Vessels loading...",
    loadingTrips: "Trips loading...",
    loadingFish: "Fish types loading...",
    noVessels: "Vessel இல்லை",
    noTrips: "Approved trips இல்லை",
    syncLabel: "Sync",
    syncNotSynced: "Not Synced",
    syncSyncing: "Syncing",
    syncSynced: "Fully Synced",
    scanBtn: "Fish Tag Scan",
    scanDisabledMsg: "முதலில் Offline pending எல்லாம் Sync ஆகணும் (Fully Synced).",
    scanModalTitle: "Fish Tag Scan",
    close: "Close",
    photoCamTitle: "Photo Capture",
    takePhoto: "Take Photo",
    cancel: "Cancel",
    max2: "Max 2 photos.",
    imgPreviewTitle: "Photo Preview",
    done: "Done",
    deleteGroup: "இந்த group-ஐ நீக்கு?",
    yes: "ஆம்",
    no: "இல்லை",
    step1Hint: "1) படகு தேர்வு  2) Trip தேர்வு  3) அடுத்து",
    step2Hint: "மீன் தேர்வு → Photo எடு → (QR விருப்பம்) → DONE",
    step3Hint: "Review செய்து Save செய்யுங்கள்.",
    skipPhotos: "Photo இல்லாமலும் முடிக்கலாம்",
    optional: "Optional",
    lockedTitle: "Trip தேர்வு செய்யப்பட்டு வந்தது",
    lockedSub: "Trip List-ல இருந்து வந்ததால் Vessel/Trip மீண்டும் தேர்வு தேவையில்லை.",
    lockedChange: "Change",
    lockedLoading: "Loading...",
    lockedMissing: "Trip details கிடைக்கல (Offline cache இல்லை). Change அழுத்தி manual select பண்ணலாம்.",
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
    selectGroupToScan: "Select a group to scan QRs.",
    groupNeedsFish: "Select fish first.",
    groupQrCount: (n: number) => `QR: ${n}`,
    totalQr: (n: number) => `Total QR: ${n}`,
    errNeedFishGroup: "Create at least 1 group",
    errGroupFishMissing: "Each group must have a selected fish",
    errGroupQrMissing: "Each group needs at least 1 QR or 1 photo as proof.",
    scanTitle: "Scan QR",
    scanHint: "Select fish, then scan QRs",
    scannedList: "Scanned QRs",
    scanCount: (n: number) => `Total: ${n}`,
    phaseScan: "SCAN",
    phasePhoto: "PHOTOS",
    phaseDone: "DONE",
    doneScanning: "Done scanning → Next",
    scanMore: "Scan more",
    photosStageTitle: "Fish Photo (optional 1-2)",
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
    autoHint: "Date/Time captured automatically when you press Save.",
    saved: "Saved",
    offlineSaved: "No internet. Saved locally. Auto-sync when network returns.",
    syncing: "Syncing...",
    pending: "Pending",
    loadingOwner: "Loading owner...",
    loadingVessel: "Loading vessels...",
    loadingTrips: "Loading trips...",
    loadingFish: "Loading fish types...",
    noVessels: "No vessels",
    noTrips: "No approved trips",
    syncLabel: "Sync",
    syncNotSynced: "Not Synced",
    syncSyncing: "Syncing",
    syncSynced: "Fully Synced",
    scanBtn: "Fish Tag Scan",
    scanDisabledMsg: "All offline pending must be synced first (Fully Synced).",
    scanModalTitle: "Fish Tag Scan",
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
    step1Hint: "1) Choose Vessel  2) Choose Trip  3) Next",
    step2Hint: "Select Fish → Take Photo → (QR optional) → DONE",
    step3Hint: "Review and Save.",
    skipPhotos: "Finish without photos",
    optional: "Optional",
    lockedTitle: "Trip selected from My Trips",
    lockedSub: "You came from Trip List, so Vessel/Trip selection is locked.",
    lockedChange: "Change",
    lockedLoading: "Loading...",
    lockedMissing: "Trip details missing (no offline cache). Tap Change to select manually.",
  },
};

/* ---------------- UI THEME ---------------- */
const UI = {
  bg: "bg-[#f6f7fb]",
  card: "bg-white",
  border: "border-[#e6e8ef]",
  muted: "text-[#6b7280]",
  text: "text-[#111827]",
  subtext: "text-[#374151]",
  accent: "#0ea5e9",
  success: "#10b981",
  warn: "#f59e0b",
  danger: "#ef4444",
};

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <View
      className={`rounded-3xl border ${UI.border} ${UI.card} ${className}`}
      style={{
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
        elevation: 1,
      }}
    >
      {children}
    </View>
  );
}

function BigBadge({
  icon,
  label,
  value,
  color,
  bg,
}: {
  icon: any;
  label: string;
  value: string;
  color: string;
  bg: string;
}) {
  return (
    <View
      className="flex-row items-center rounded-2xl px-4 py-3"
      style={{ backgroundColor: bg }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 14,
          backgroundColor: "rgba(255,255,255,0.65)",
          alignItems: "center",
          justifyContent: "center",
          marginRight: 10,
        }}
      >
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text className="text-[11px] font-extrabold" style={{ color: "#111827", opacity: 0.8 }}>
          {label}
        </Text>
        <Text className="text-base font-extrabold" style={{ color }} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function PrimaryBtn({
  label,
  onPress,
  disabled,
  icon,
  color,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: any;
  color?: string;
}) {
  const bg = disabled ? "#cbd5e1" : color || UI.accent;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className="rounded-2xl px-5 py-4 active:opacity-90"
      style={{ backgroundColor: bg, opacity: disabled ? 0.85 : 1 }}
    >
      <View className="flex-row items-center justify-center">
        {icon ? <Ionicons name={icon} size={20} color="white" /> : null}
        <Text
          className={`text-center text-lg font-extrabold text-white ${icon ? "ml-2" : ""}`}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

function GhostBtn({
  label,
  onPress,
  disabled,
  icon,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: any;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`rounded-2xl border ${UI.border} bg-white px-5 py-4 active:opacity-80`}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <View className="flex-row items-center justify-center">
        {icon ? <Ionicons name={icon} size={20} color="#111827" /> : null}
        <Text
          className={`text-center text-lg font-extrabold ${UI.text} ${icon ? "ml-2" : ""}`}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
        >
          {label}
        </Text>
      </View>
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
  const v = String(id || "").trim().toUpperCase();
  if (!v) return "UNKNOWN";
  if (v.startsWith("RV-VESSEL-") || v.startsWith("RV-VES-")) return "VESSEL";
  if (v.startsWith("RV-CRATE-") || v.startsWith("CRATE-") || v.startsWith("RV-BOX-")) return "CRATE";
  if (/^[A-Z]{2}-[A-Z]{2}-[A-Z]{2}-[A-Z]{2}-\d{4,}$/.test(v)) return "FISH";
  if (/^[A-Z]{2}(?:-[A-Z0-9]{2}){3,}-\d{4,}$/.test(v)) return "FISH";
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
          if ((kl.includes("owner") && kl.includes("code") && vs) || /^OWN/i.test(vs)) return vs;
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
    v?.rv_vessel_id || v?.rvVesselId || v?.vessel_code || v?.rv_vessel_code || v?.rvVesselCode || "",
  ).trim();
}

function vesselGovtRegNo(v: Vessel): string {
  return String(
    v?.govt_register_no ??
      v?.govt_registration_no ??
      v?.govt_reg_no ??
      v?.government_registration_no ??
      v?.govtRegNo ??
      v?.registration_no ??
      v?.register_no ??
      v?.reg_no ??
      v?.regNo ??
      v?.license_no ??
      v?.licenseNo ??
      "",
  ).trim();
}

function vesselName(v: Vessel): string {
  return String(v?.vessel_name ?? v?.vesselName ?? v?.name ?? v?.boat_name ?? v?.boatName ?? "").trim();
}

function vesselLabel(v: Vessel): string {
  const reg = vesselGovtRegNo(v);
  const name = vesselName(v);
  const id = vesselDbId(v);
  const base = reg && name ? `${reg} • ${name}` : reg ? reg : name ? name : vesselCode(v);
  return id ? `${base}  (ID: ${id})` : base;
}

/* ---- TRIP FIELD MAPPING ---- */
function tripKey(tr: any): string {
  return String(tr?.trip_id || tr?.tripId || tr?.trip_code || tr?.id || "").trim();
}
function tripLabel(tr: Trip): string {
  const code = String(tr?.trip_id || tr?.tripId || tr?.trip_code || tr?.tripCode || tr?.id || "").trim();
  const port = String(tr?.near_station || tr?.port || tr?.landing_port || tr?.landingPort || "").trim();
  const date = String(tr?.planned_at || tr?.trip_date || tr?.tripDate || tr?.created_at || "").trim() || "";
  return `${code}${port ? ` • ${port}` : ""}${date ? ` • ${date.substring(0, 10)}` : ""}`;
}

function tripVesselDbId(tr: any): number | null {
  const n = Number(tr?.vessel_id ?? tr?.vesselId ?? tr?.vessel_fk ?? tr?.vesselFk ?? 0);
  return n > 0 ? n : null;
}
function tripVesselCode(tr: any): string {
  return String(
    tr?.rv_vessel_id ?? tr?.rvVesselId ?? tr?.vessel_code ?? tr?.rv_vessel_code ?? tr?.rvVesselCode ?? "",
  ).trim();
}

/* ---------------- SESSION ID GENERATOR ---------------- */
function generateSessionId(tripCode: string, groupIndex: number): string {
  const base = String(tripCode || "SESSION").trim().toUpperCase();
  return `${base}-S${groupIndex + 1}`;
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
    const perUser = String((await AsyncStorage.getItem(ownerDbIdCacheKey(userId))) || "").trim();
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
    const perUser = String((await AsyncStorage.getItem(ownerCodeCacheKey(userId))) || "").trim();
    if (perUser) return perUser;
    const generic = String((await AsyncStorage.getItem("owner_code")) || "").trim();
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
    return [];
  }
  const list = normalizeList(json) as any[];
  return (Array.isArray(list) ? list : [])
    .filter((f) => typeof f?.id === "number" && String(f?.fish_name || "").trim())
    .map((f) => ({
      id: Number(f.id),
      fish_name: String(f.fish_name || "").trim(),
      fish_code: (f?.fish_code ?? null) as any,
      fish_type_url: sanitizeImageUrl(f?.fish_type_url ?? f?.fishTypeUrl ?? "") || null,
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
    await AsyncStorage.setItem(vesselCacheKey(ownerDbId), JSON.stringify(list || []));
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

function createFishGroup(initialQr?: string, sessionId?: string): FishGroup {
  const id = makeId();
  const qr = String(initialQr || "").trim();
  const scanned: ScannedQr[] = qr ? [{ id: qr, kind: classifyQr(qr) }] : [];
  return {
    id,
    sessionId: sessionId || "",
    fishId: null,
    fishName: "",
    scanned,
    phase: "IMAGE_PROOF",
    images: [],
  };
}

function locText(loc: LiveLocation | null) {
  if (!loc) return "Location: —";
  const lat = Number(loc.latitude);
  const lng = Number(loc.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "Location: —";
  return `Lat: ${lat.toFixed(6)}, Lon: ${lng.toFixed(6)}`;
}

/* ---------------- FULL SCREEN PICKER ---------------- */
type FullPickMode = "grid" | "list";

type FullPickItem = {
  key: string;
  label: string;
  imageUri?: string | null;
  subtitle?: string;
  _raw?: any;
};

function FullScreenPickerModal({
  visible,
  title,
  items,
  selectedKey,
  onClose,
  onConfirm,
  confirmLabel = "Next",
  searchPlaceholder = "Search...",
  mode = "grid",
  numColumns = 2,
  showImages = true,
  leadingIcon,
  insetsBottom = 0,
}: {
  visible: boolean;
  title: string;
  items: FullPickItem[];
  selectedKey: string;
  onClose: () => void;
  onConfirm: (item: FullPickItem) => void;
  confirmLabel?: string;
  searchPlaceholder?: string;
  mode?: FullPickMode;
  numColumns?: number;
  showImages?: boolean;
  leadingIcon?: any;
  insetsBottom?: number;
}) {
  const [q, setQ] = useState("");
  const [tempKey, setTempKey] = useState<string>("");

  useEffect(() => {
    if (!visible) return;
    setQ("");
    setTempKey(selectedKey || "");
  }, [visible, selectedKey]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return items;
    return items.filter((x) => String(x.label || "").toLowerCase().includes(t));
  }, [q, items]);

  const selectedItem = useMemo(() => {
    return items.find((x) => x.key === tempKey) || null;
  }, [items, tempKey]);

  const ACCENT = "#93c5fd";
  const BG = "#0b0f17";
  const CARD_BG = "rgba(255,255,255,0.06)";
  const BORDER = "rgba(255,255,255,0.10)";

  const renderGrid = ({ item }: { item: FullPickItem }) => {
    const active = item.key === tempKey;
    const uri = showImages ? sanitizeImageUrl(item.imageUri) : "";
    return (
      <Pressable
        onPress={() => setTempKey(item.key)}
        style={{
          flex: 1,
          marginBottom: 14,
          marginHorizontal: 8,
          borderRadius: 18,
          borderWidth: 2,
          borderColor: active ? ACCENT : "transparent",
          backgroundColor: CARD_BG,
          overflow: "hidden",
        }}
      >
        <View style={{ height: 128, backgroundColor: "#e8f1ff", alignItems: "center", justifyContent: "center" }}>
          {uri ? (
            <Image source={{ uri }} style={{ width: "100%", height: "100%" }} resizeMode="contain" />
          ) : (
            <Ionicons name="image-outline" size={34} color="#64748b" />
          )}
        </View>
        <View style={{ paddingVertical: 12, paddingHorizontal: 12, backgroundColor: "rgba(0,0,0,0.55)" }}>
          <Text style={{ color: "white", fontWeight: "800", fontSize: 14 }} numberOfLines={2}>
            {item.label}
          </Text>
          {!!item.subtitle ? (
            <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 11, marginTop: 4 }} numberOfLines={1}>
              {item.subtitle}
            </Text>
          ) : null}
        </View>
      </Pressable>
    );
  };

  const renderList = ({ item }: { item: FullPickItem }) => {
    const active = item.key === tempKey;
    return (
      <Pressable
        onPress={() => setTempKey(item.key)}
        style={{
          marginBottom: 10,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: active ? ACCENT : BORDER,
          backgroundColor: active ? "rgba(147,197,253,0.10)" : CARD_BG,
          paddingVertical: 16,
          paddingHorizontal: 14,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 16,
              backgroundColor: "rgba(255,255,255,0.08)",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            }}
          >
            <Ionicons name={leadingIcon || "list-outline"} size={22} color="white" />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: "white", fontWeight: "900", fontSize: 16 }} numberOfLines={2}>
              {item.label}
            </Text>
            {!!item.subtitle ? (
              <Text style={{ color: "rgba(255,255,255,0.70)", fontSize: 12, marginTop: 4 }} numberOfLines={1}>
                {item.subtitle}
              </Text>
            ) : null}
          </View>
          <Ionicons
            name={active ? "checkmark-circle" : "chevron-forward"}
            size={24}
            color={active ? ACCENT : "rgba(255,255,255,0.70)"}
          />
        </View>
      </Pressable>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingTop: 6 }}>
          <Pressable
            onPress={onClose}
            style={{ padding: 10, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.08)" }}
          >
            <Ionicons name="arrow-back" size={20} color="white" />
          </Pressable>
          <Text style={{ color: "white", fontWeight: "900", fontSize: 18, marginLeft: 12, flex: 1 }} numberOfLines={1}>
            {title}
          </Text>
        </View>

        <View
          style={{
            marginTop: 14,
            marginHorizontal: 14,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.12)",
            backgroundColor: "rgba(255,255,255,0.06)",
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}
        >
          <Ionicons name="search-outline" size={18} color="rgba(255,255,255,0.70)" />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={searchPlaceholder}
            placeholderTextColor="rgba(255,255,255,0.55)"
            style={{ color: "white", marginLeft: 10, fontSize: 16, flex: 1, paddingVertical: 2 }}
          />
          {q ? (
            <Pressable onPress={() => setQ("")} style={{ padding: 6 }}>
              <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.60)" />
            </Pressable>
          ) : null}
        </View>

        <View style={{ flex: 1, paddingTop: 14 }}>
          {mode === "grid" ? (
            <FlatList
              data={filtered}
              key={`grid_${numColumns}`}
              keyExtractor={(it) => it.key}
              numColumns={numColumns}
              contentContainerStyle={{ paddingHorizontal: 6, paddingBottom: 120 + insetsBottom }}
              renderItem={renderGrid}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <FlatList
              data={filtered}
              key="list"
              keyExtractor={(it) => it.key}
              contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 120 + insetsBottom }}
              renderItem={renderList}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>

        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            paddingHorizontal: 14,
            paddingTop: 12,
            paddingBottom: 14 + insetsBottom,
            backgroundColor: "rgba(11,15,23,0.92)",
            borderTopWidth: 1,
            borderTopColor: "rgba(255,255,255,0.08)",
          }}
        >
          <Pressable
            disabled={!selectedItem}
            onPress={() => selectedItem && onConfirm(selectedItem)}
            style={{
              height: 54,
              borderRadius: 999,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: selectedItem ? "#93c5fd" : "rgba(255,255,255,0.20)",
            }}
          >
            <Text
              style={{
                fontWeight: "900",
                fontSize: 16,
                color: selectedItem ? "#0b0f17" : "rgba(255,255,255,0.70)",
              }}
            >
              {confirmLabel}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

/* ---------------- MAIN SCREEN ---------------- */
export default function CreateCatchLog() {
  const insets = useSafeAreaInsets();

  const params = useLocalSearchParams<{
    crateId?: string;
    tripId?: string;
    tripDbId?: string;
    vesselId?: string;
    tripJson?: string;
    vesselJson?: string;
    tripLabel?: string;
    vesselLabel?: string;
    ownerCode?: string;
  }>();

  const pCrateId = pickParam((params as any)?.crateId);
  const pTripId = pickParam((params as any)?.tripId);
  const pTripDbId = pickParam((params as any)?.tripDbId);
  const pVesselId = pickParam((params as any)?.vesselId);
  const pTripJson = pickParam((params as any)?.tripJson);
  const pVesselJson = pickParam((params as any)?.vesselJson);
  const pTripLabel = pickParam((params as any)?.tripLabel);
  const pVesselLabel = pickParam((params as any)?.vesselLabel);
  const pOwnerCode = pickParam((params as any)?.ownerCode);

  const tripObjFromParam: any | null = (() => {
    const raw = safeDecode(String(pTripJson || "").trim());
    if (!raw) return null;
    const parsed = safeJsonParse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  })();

  const vesselObjFromParam: any | null = (() => {
    const raw = safeDecode(String(pVesselJson || "").trim());
    if (!raw) return null;
    const parsed = safeJsonParse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  })();

  const initialQr = String(pCrateId || "").trim();

  const routeTripParam =
    String(pTripId || "").trim() || (tripObjFromParam ? tripKey(tripObjFromParam) : "");
  const routeTripDbId =
    Number(String(pTripDbId || "").trim() || 0) || Number(tripObjFromParam?.id || 0) || 0;

  const routeVesselDbId =
    Number(String(pVesselId || "").trim() || 0) ||
    (vesselObjFromParam ? vesselDbId(vesselObjFromParam) || 0 : 0) ||
    (tripObjFromParam ? tripVesselDbId(tripObjFromParam) || 0 : 0) ||
    0;

  const initialTripLabelPrefill =
    String(pTripLabel || "").trim() ||
    (tripObjFromParam ? tripLabel(tripObjFromParam) : "") ||
    routeTripParam ||
    (routeTripDbId > 0 ? String(routeTripDbId) : "");

  const initialVesselLabelPrefill =
    String(pVesselLabel || "").trim() ||
    (vesselObjFromParam ? vesselLabel(vesselObjFromParam) : "") ||
    (tripObjFromParam?.vessel ? vesselLabel(tripObjFromParam.vessel) : "") ||
    "";

  const initialVesselCodePrefill =
    (vesselObjFromParam ? vesselCode(vesselObjFromParam) : "") ||
    (tripObjFromParam ? tripVesselCode(tripObjFromParam) : "") ||
    "";

  const hasRouteTrip =
    !!routeTripParam || routeTripDbId > 0 || !!tripObjFromParam || routeVesselDbId > 0;

  const dispatch = useAppDispatch();
  const posting = !!useAppSelector((s: any) => s.catchLog?.loading);

  const meState = useAppSelector((s: any) => s.me);
  const meUser = meState?.user || meState?.data || meState?.me || meState || null;

  const [lang, setLang] = useState<Lang>("ta");
  const t = i18n[lang];

  const [step, setStep] = useState<1 | 2 | 3 | 4>(() => (hasRouteTrip ? 2 : 1));
  const [lockTripSelection, setLockTripSelection] = useState<boolean>(() => hasRouteTrip);
  const [prefillLoading, setPrefillLoading] = useState<boolean>(() => hasRouteTrip);

  const [resolvedUserId, setResolvedUserId] = useState<number | null>(null);

  const [ownerId, setOwnerId] = useState<number | null>(null);
  const [ownerCode, setOwnerCode] = useState<string>(() => normalizeOwnerCode(pOwnerCode) || "");
  const [ownerLoading, setOwnerLoading] = useState(false);

  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [vesselLoading, setVesselLoading] = useState(false);

  const [selectedVesselDbId, setSelectedVesselDbId] = useState<number | null>(() =>
    routeVesselDbId > 0 ? routeVesselDbId : null,
  );
  const [selectedVesselLabel, setSelectedVesselLabel] = useState<string>(() =>
    hasRouteTrip ? initialVesselLabelPrefill : "",
  );
  const [selectedVesselCode, setSelectedVesselCode] = useState<string>(() =>
    hasRouteTrip ? initialVesselCodePrefill : "",
  );

  const [trips, setTrips] = useState<Trip[]>([]);
  const [tripLoading, setTripLoading] = useState(false);

  const [tripId, setTripId] = useState<string>(() => {
    if (!hasRouteTrip) return "";
    if (routeTripParam) return routeTripParam;
    if (routeTripDbId > 0) return String(routeTripDbId);
    return "";
  });
  const [tripLabelText, setTripLabelText] = useState<string>(() =>
    hasRouteTrip ? initialTripLabelPrefill : "",
  );

  const [fishTypes, setFishTypes] = useState<FishType[]>([]);
  const [fishLoading, setFishLoading] = useState(false);

  const initGroupRef = useRef<FishGroup | null>(null);
  if (!initGroupRef.current) {
    const initSid = generateSessionId(routeTripParam || "SESSION", 0);
    initGroupRef.current = createFishGroup(initialQr, initSid);
  }

  const [groups, setGroups] = useState<FishGroup[]>(() => [initGroupRef.current!]);
  const [activeGroupId, setActiveGroupId] = useState<string>(() => initGroupRef.current!.id);

  const globalNetworkState = useAppSelector((s: any) => s.network?.isOnline ?? true);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const flushingRef = useRef(false);

  const [cameraPerm, requestCameraPerm] = useCameraPermissions();

  const [torchWanted, setTorchWanted] = useState(true);
  const [torchArmed, setTorchArmed] = useState(false);

  const [photoTorchWanted, setPhotoTorchWanted] = useState(true);
  const [photoTorchArmed, setPhotoTorchArmed] = useState(false);

  const [canScan, setCanScan] = useState(true);

  const [liveLoc, setLiveLoc] = useState<LiveLocation | null>(null);
  const locSubRef = useRef<Location.LocationSubscription | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);

  const [vesselPickerOpen, setVesselPickerOpen] = useState(false);
  const [tripPickerOpen, setTripPickerOpen] = useState(false);
  const [fishPickerOpen, setFishPickerOpen] = useState(false);
  const [fishPickGroupId, setFishPickGroupId] = useState<string | null>(null);

  const [fishScanOpen, setFishScanOpen] = useState(false);
  const [fishScanCanScan, setFishScanCanScan] = useState(true);

  const [photoCamOpen, setPhotoCamOpen] = useState(false);
  const [photoTargetGroupId, setPhotoTargetGroupId] = useState<string | null>(null);
  const photoCamRef = useRef<any>(null);
  const [takingPhoto, setTakingPhoto] = useState(false);

  const [imgPreviewUri, setImgPreviewUri] = useState<string | null>(null);

  const wmViewRef = useRef<View | null>(null);
  const wmResolveRef = useRef<((uri: string) => void) | null>(null);
  const wmRejectRef = useRef<((e: any) => void) | null>(null);
  const [wmJob, setWmJob] = useState<WatermarkJob | null>(null);
  const [wmImgLoaded, setWmImgLoaded] = useState(false);
  const [wmLayoutReady, setWmLayoutReady] = useState(false);

  const skipVesselResetRef = useRef(false);

  const watermarkAsync = (srcUri: string, w: number, h: number, lines: string[]) => {
    return new Promise<string>((resolve, reject) => {
      wmResolveRef.current = resolve;
      wmRejectRef.current = reject;
      setWmImgLoaded(false);
      setWmLayoutReady(false);
      const clean = (Array.isArray(lines) ? lines : []).filter(Boolean);
      setWmJob({
        srcUri,
        outW: w,
        outH: h,
        lines: clean.length ? clean : ["RootVerse"],
      });
    });
  };

  useEffect(() => {
    if (!wmJob) return;
    if (!wmImgLoaded) return;
    if (!wmLayoutReady) return;

    let alive = true;
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

    (async () => {
      try {
        const view = wmViewRef.current;
        if (!view) throw new Error("Watermark view not ready");
        await wait(60);
        const outUri = await captureRef(view, { format: "jpg", quality: 0.9, result: "tmpfile" });
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
          setWmLayoutReady(false);
        }
      }
    })();

    return () => { alive = false; };
  }, [wmJob, wmImgLoaded, wmLayoutReady]);

  // resolve user id
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
    return () => { alive = false; };
  }, [meUser?.id]);

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
    return () => { try { sub.remove(); } catch {} };
  }, []);

  useEffect(() => {
    if (!torchWanted) { setTorchArmed(false); return; }
    setTorchArmed(false);
    const id = setTimeout(() => setTorchArmed(true), 180);
    return () => clearTimeout(id);
  }, [torchWanted, step, activeGroupId, fishScanOpen, photoCamOpen]);

  useEffect(() => {
    if (!photoTorchWanted) { setPhotoTorchArmed(false); return; }
    setPhotoTorchArmed(false);
    const id = setTimeout(() => setPhotoTorchArmed(true), 180);
    return () => clearTimeout(id);
  }, [photoTorchWanted, photoCamOpen]);

  /* ---------------- load owner ---------------- */
  const loadOwnerFromLogin = async (): Promise<{ id: number; code: string } | null> => {
    try {
      setOwnerLoading(true);
      const userId = Number(resolvedUserId);
      if (!userId || Number.isNaN(userId)) return null;

      const headers = await authHeaders();
      const url = `${API_BASE}/api/owner/fetch/${userId}`;
      const res = await fetch(url, { method: "GET", headers });
      const text = await res.text();
      let json: any = null;
      try { json = text ? JSON.parse(text) : null; } catch {}
      if (!res.ok) return null;

      let src: any = json?.data ?? json;
      if (Array.isArray(src)) src = src[0];
      if (!src || typeof src !== "object") return null;

      const ownerDbId = Number(src?.id);
      if (!ownerDbId || Number.isNaN(ownerDbId)) return null;

      const ocDirect =
        src?.owner_code ?? src?.ownerCode ?? src?.owner_code_text ?? src?.ownerCodeText ??
        src?.owner_id_code ?? src?.ownerIdCode ?? src?.ownerid_code ?? src?.ownerid ??
        src?.owner_code_id ?? src?.owner_registration_code ?? src?.code ??
        src?.owner?.owner_code ?? src?.owner?.ownerCode ??
        src?.owner_registration?.owner_code ?? src?.owner_registration?.ownerCode ?? "";

      const ocDeep = deepFindOwnCode(src);
      const ocFallback = padOwnFromDbId(ownerDbId);
      const oc = normalizeOwnerCode(String(ocDirect || ocDeep || ocFallback || ""));

      setOwnerId(ownerDbId);
      setOwnerCode(oc);

      await writeOwnerCacheByUser(userId, ownerDbId);
      if (oc) await writeOwnerCodeCacheByUser(userId, oc);

      return { id: ownerDbId, code: oc };
    } catch {
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
    if (cached) { setOwnerId(cached); return cached; }
    if (!isOnline) return null;
    const r = await loadOwnerFromLogin();
    return r?.id ?? null;
  };

  /* ---------------- fetch vessels ---------------- */
  const fetchOwnerVessels = async (ownerDbId: number) => {
    setVesselLoading(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_BASE}/api/vessels/owner/${ownerDbId}`, { method: "GET", headers });
      const text = await res.text();
      let json: any = null;
      try { json = text ? JSON.parse(text) : null; } catch {}
      if (!res.ok) { setVessels([]); return; }
      const list = normalizeList(json);
      setVessels(list);
      await writeVesselCache(ownerDbId, list);
    } finally {
      setVesselLoading(false);
    }
  };

  /* ---------------- fetch trips ---------------- */
  const fetchTripsByStatus = async (owner_code: string, status: string) => {
    const headers = await authHeaders();
    const url = `${API_BASE}/api/trip/owner/${encodeURIComponent(owner_code)}/status/${encodeURIComponent(status)}`;
    const res = await fetch(url, { method: "GET", headers });
    const text = await res.text();
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch {}
    if (!res.ok) return { ok: false, list: [] as any[] };
    const list = Array.isArray(json?.data) ? json.data : normalizeList(json);
    return { ok: true, list: Array.isArray(list) ? list : [] };
  };

  const fetchApprovedTrips = async (oc: string) => {
    setTripLoading(true);
    try {
      const owner_code = normalizeOwnerCode(String(oc || ""));
      if (!owner_code) { setTrips([]); return; }
      const candidates = ["approved", "APPROVED", "Approved"];
      let final: any[] = [];
      for (const st of candidates) {
        const r = await fetchTripsByStatus(owner_code, st);
        if (!r.ok) continue;
        const approvedOnly = r.list.filter((x: any) => {
          const s = String(x?.approval_status ?? x?.approvalStatus ?? "").toLowerCase();
          return !s ? true : s === "approved";
        });
        if (approvedOnly.length > 0) { final = approvedOnly; break; }
        final = approvedOnly;
      }
      setTrips(final);
      await writeTripCache(owner_code, final);
    } finally {
      setTripLoading(false);
    }
  };

  useEffect(() => {
    setIsOnline(globalNetworkState);
  }, [globalNetworkState]);

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
      if (!online) { if (alive) setFishLoading(false); return; }
      try {
        const fresh = await fetchFishTypesFromApi();
        if (!alive) return;
        if (fresh.length > 0) { setFishTypes(fresh); await writeFishCache(fresh); }
      } finally {
        if (alive) setFishLoading(false);
      }
    };
    loadFish();
    return () => { alive = false; };
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
    return () => { alive = false; };
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
      const oid = globalNetworkState ? await ensureOwnerId() : await readOwnerCacheByUser(userId);
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
      if (!lockTripSelection) { setTripId(""); setTripLabelText(""); }
      const userId = Number(resolvedUserId);
      if (!userId) { setTrips([]); return; }
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
      if (!oc) { setTrips([]); return; }
      const cachedTrips = await readTripCache(oc);
      if (cachedTrips.length > 0) setTrips(cachedTrips);
      if (globalNetworkState) await fetchApprovedTrips(oc);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, resolvedUserId, ownerCode, lockTripSelection]);

  /* ---------------- Route Prefill ---------------- */
  useEffect(() => {
    let alive = true;
    const pickTripFrom = (list: any[]): any | null => {
      if (!Array.isArray(list) || list.length === 0) return null;
      if (routeTripDbId > 0) {
        const byDb = list.find((x: any) => Number(x?.id) === routeTripDbId);
        if (byDb) return byDb;
      }
      const wanted = String(routeTripParam || "").trim();
      if (wanted) {
        const byKey = list.find((x: any) => tripKey(x) === wanted);
        if (byKey) return byKey;
        const byTripId = list.find((x: any) =>
          String(x?.trip_id ?? x?.tripId ?? x?.trip_code ?? "").trim() === wanted,
        );
        if (byTripId) return byTripId;
      }
      return null;
    };

    const run = async () => {
      if (!lockTripSelection) { if (alive) setPrefillLoading(false); return; }
      if (tripId && selectedVesselDbId) { if (alive) setPrefillLoading(false); return; }
      if (alive) setPrefillLoading(true);

      if (!tripId) {
        if (routeTripParam) setTripId(routeTripParam);
        else if (routeTripDbId > 0) setTripId(String(routeTripDbId));
      }
      if (!tripLabelText) setTripLabelText(initialTripLabelPrefill || routeTripParam || "");

      let tr: any | null = tripObjFromParam || null;
      if (!tr) tr = pickTripFrom(trips);
      if (!tr) {
        const userId = Number(resolvedUserId);
        let oc = normalizeOwnerCode(ownerCode);
        if (!oc && userId) oc = normalizeOwnerCode(await readOwnerCodeCacheByUser(userId));
        if (oc) {
          const cached = await readTripCache(oc);
          tr = pickTripFrom(cached);
          if (tr && trips.length === 0 && alive) setTrips(cached);
        }
      }
      if (!alive) return;

      if (tr) {
        const k = tripKey(tr);
        if (k) setTripId(k);
        setTripLabelText(tripLabel(tr));
      } else {
        setTripLabelText(initialTripLabelPrefill || routeTripParam || "");
      }

      const vDb = (routeVesselDbId > 0 ? routeVesselDbId : null) ?? (tr ? tripVesselDbId(tr) : null);
      const vCodeFromTrip = tr ? tripVesselCode(tr) : initialVesselCodePrefill;

      if (vDb && vDb > 0) {
        const foundV = vessels.find((v: any) => vesselDbId(v) === vDb) || null;
        skipVesselResetRef.current = true;
        setSelectedVesselDbId(vDb);
        if (foundV) {
          setSelectedVesselCode(vesselCode(foundV));
          setSelectedVesselLabel(vesselLabel(foundV));
        } else {
          setSelectedVesselCode(vCodeFromTrip || "");
          setSelectedVesselLabel(initialVesselLabelPrefill || vCodeFromTrip || `Vessel (ID: ${vDb})`);
        }
      } else if (!selectedVesselDbId) {
        if (initialVesselLabelPrefill) setSelectedVesselLabel(initialVesselLabelPrefill);
        if (vCodeFromTrip && !selectedVesselCode) setSelectedVesselCode(vCodeFromTrip);
      }

      if (alive) setPrefillLoading(false);
    };

    run();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    lockTripSelection, routeTripParam, routeTripDbId, routeVesselDbId,
    trips, vessels, globalNetworkState, resolvedUserId, ownerCode,
    tripId, tripLabelText, selectedVesselDbId, selectedVesselCode,
  ]);

  useEffect(() => {
    if (!selectedVesselDbId) return;
    if (!vessels?.length) return;
    const foundV = vessels.find((v: any) => vesselDbId(v) === selectedVesselDbId) || null;
    if (!foundV) return;
    setSelectedVesselCode(vesselCode(foundV));
    setSelectedVesselLabel(vesselLabel(foundV));
  }, [selectedVesselDbId, vessels]);

  /* ---------------- Refresh session IDs when tripId changes ---------------- */
  useEffect(() => {
    if (!tripId) return;
    setGroups((prev) =>
      prev.map((g, idx) => ({
        ...g,
        sessionId: generateSessionId(tripId, idx),
      })),
    );
  }, [tripId]);

  /* ---------------- Sync status ---------------- */
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
    if (syncState === "SYNCED") return UI.success;
    if (syncState === "SYNCING") return UI.accent;
    return UI.warn;
  }, [syncState]);

  const syncText = useMemo(() => {
    if (syncState === "SYNCED") return t.syncSynced;
    if (syncState === "SYNCING") return t.syncSyncing;
    return t.syncNotSynced;
  }, [syncState, t]);

  const scanFishEnabled = syncState === "SYNCED";

  const vesselOptions = useMemo(() => {
    return vessels
      .map((v) => {
        const db = vesselDbId(v);
        if (!db) return null;
        return { key: String(db), label: vesselLabel(v), _raw: v } as any;
      })
      .filter(Boolean) as Array<FullPickItem & { _raw: Vessel }>;
  }, [vessels]);

  const tripOptions = useMemo(() => {
    return trips
      .map((tr) => {
        const key = tripKey(tr);
        if (!key) return null;
        return { key, label: tripLabel(tr), _raw: tr } as any;
      })
      .filter(Boolean) as Array<FullPickItem & { _raw: Trip }>;
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

  /* ---------------- vessel change -> reset trip + groups ---------------- */
  useEffect(() => {
    if (skipVesselResetRef.current) { skipVesselResetRef.current = false; return; }
    if (lockTripSelection) return;
    setTripId("");
    setTripLabelText("");
    const sid = generateSessionId("SESSION", 0);
    const fresh = createFishGroup(initialQr, sid);
    initGroupRef.current = fresh;
    setGroups([fresh]);
    setActiveGroupId(fresh.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVesselDbId, lockTripSelection]);

  /* ---------------- Group derived helpers ---------------- */
  const activeGroup = useMemo(() => groups.find((g) => g.id === activeGroupId) || null, [groups, activeGroupId]);

  const totalQrCount = useMemo(
    () => groups.reduce((sum, g) => sum + (g.scanned?.length || 0), 0),
    [groups],
  );

  const allGroupsDone = useMemo(() => {
    if (!groups || groups.length === 0) return false;
    return groups.every((g) => g.phase === "DONE");
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
    const newIndex = groups.length;
    const sid = generateSessionId(tripId || "SESSION", newIndex);
    const g = createFishGroup("", sid);
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
              const sid = generateSessionId(tripId || "SESSION", 0);
              const fresh = createFishGroup(initialQr, sid);
              initGroupRef.current = fresh;
              setActiveGroupId(fresh.id);
              return [fresh];
            }
            if (activeGroupId === groupId) setActiveGroupId(next[0].id);
            // Re-assign session IDs after removal
            return next.map((g, idx) => ({ ...g, sessionId: generateSessionId(tripId || "SESSION", idx) }));
          });
        },
      },
    ]);
  };

  const setGroupFish = (groupId: string, fishId: number, fishName: string) => {
    setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, fishId, fishName } : g)));
  };

  const addQrToGroup = (groupId: string, qr: string) => {
    const value = String(qr || "").trim();
    if (!value) return false;
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        if (g.phase !== "SCAN") return g;
        if (g.scanned.some((x) => x.id === value)) return g;
        return { ...g, scanned: [...g.scanned, { id: value, kind: classifyQr(value) }] };
      }),
    );
    return true;
  };

  const removeQrFromGroup = (groupId: string, qrId: string) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        return { ...g, scanned: g.scanned.filter((x) => x.id !== qrId) };
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
    setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, phase: "SCAN" } : g)));
  };

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
    if (!scanFishEnabled) { Alert.alert("Sync Required", t.scanDisabledMsg); return; }
    setFishScanOpen(true);
  };

  const onFishTagScanned = (value: string) => {
    const v = String(value || "").trim();
    if (!v) return;
    if (!fishScanCanScan) return;
    Vibration.vibrate(40);
    setFishScanCanScan(false);
    setFishScanOpen(false);
    router.push({ pathname: "/catch-logs/details", params: { crateId: v } });
    setTimeout(() => setFishScanCanScan(true), 500);
  };

  /* ---------------- scan rules (SCAN stage only) ---------------- */
  const scanEnabledBase = !!selectedVesselDbId && !!tripId;
  const activeGroupCanScan =
    !!activeGroup && activeGroup.phase === "SCAN" && !!activeGroup.fishId && scanEnabledBase && step === 2;

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
    try { locSubRef.current?.remove(); } catch {}
    locSubRef.current = null;
  };

  const startLocation = async () => {
    setLocError(null);
    setLocLoading(true);
    try {
      const fg = await Location.requestForegroundPermissionsAsync();
      if (fg.status !== "granted") { setLiveLoc(null); setLocError("Location permission denied"); return; }
      const last = await Location.getLastKnownPositionAsync({});
      if (last?.coords) {
        setLiveLoc({
          latitude: last.coords.latitude, longitude: last.coords.longitude,
          accuracy: last.coords.accuracy ?? null, heading: last.coords.heading ?? null,
          speed: last.coords.speed ?? null, capturedAt: new Date(last.timestamp).toISOString(),
        });
      }
      stopLocation();
      locSubRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 2000, distanceInterval: 2 },
        (pos) => {
          const c = pos.coords;
          setLiveLoc({
            latitude: c.latitude, longitude: c.longitude, accuracy: c.accuracy ?? null,
            heading: c.heading ?? null, speed: c.speed ?? null,
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
      if (step !== 2) { stopLocation(); return; }
      await startLocation();
      if (!alive) stopLocation();
    })();
    return () => { alive = false; if (step === 2) stopLocation(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ---------------- validate + navigation ---------------- */
  const validateStep1 = () => {
    if (!selectedVesselDbId) return Alert.alert(t.required, t.chooseVessel), false;
    if (!tripId) return Alert.alert(t.required, t.chooseTrip), false;
    return true;
  };

  const validateStep2 = () => {
    if (!validateStep1()) return false;
    if (!groups || groups.length === 0) return (Alert.alert(t.required, t.errNeedFishGroup), false);

    // Fish is required
    const fishMissing = groups.some((g) => !g.fishId);
    if (fishMissing) return Alert.alert(t.required, t.errGroupFishMissing), false;

    // Each group needs at least 1 QR OR 1 photo (not both required)
    const noEvidenceMissing = groups.some(
      (g) => (g.scanned?.length || 0) === 0 && (g.images?.length || 0) === 0,
    );
    if (noEvidenceMissing) {
      Alert.alert(t.required, t.errGroupQrMissing);
      return false;
    }

    const notDone = groups.some((g) => g.phase !== "DONE");
    if (notDone) {
      Alert.alert(
        t.required,
        lang === "ta"
          ? "ஒவ்வொரு Fish-உம் முடிக்க வேண்டும் (DONE அழுத்தவும்)."
          : "Finish each fish group (tap DONE).",
      );
      return false;
    }

    return true;
  };

  const nowPreview = useMemo(() => new Date(), [step, totalQrCount, tripId, selectedVesselDbId]);

  /* ---------------- photo camera ---------------- */
  const openPhotoCamera = async (groupId: string) => {
    try {
      if (!cameraPerm?.granted) {
        const res = await requestCameraPerm();
        if (!res?.granted) { Alert.alert("Permission", "Allow camera access to capture photos."); return; }
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
    try { await AsyncStorage.removeItem(CAMERA_SESSION_KEY); } catch {}
  };

  const takePhotoNow = async () => {
    if (!photoTargetGroupId) return;
    if (takingPhoto) return;
    const g = groups.find((x) => x.id === photoTargetGroupId);
    if ((g?.images?.length || 0) >= 2) { Alert.alert("Max", t.max2); return; }

    setTakingPhoto(true);
    try {
      const ref = photoCamRef.current;
      if (!ref?.takePictureAsync) throw new Error("Camera not ready");

      const now = new Date();
      const pic = await ref.takePictureAsync({ quality: 0.85, skipProcessing: true });
      const rawUri = String(pic?.uri || "");
      if (!rawUri) throw new Error("No photo uri");

      let w = Number((pic as any)?.width || 0);
      let h = Number((pic as any)?.height || 0);
      if (!w || !h) { w = 1080; h = 1920; }
      const MAX_SIDE = 1280;
      const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
      const outW = Math.max(480, Math.round(w * scale));
      const outH = Math.max(480, Math.round(h * scale));

      let ownerNumeric = Number(ownerId || 0);
      if (!ownerNumeric && resolvedUserId) {
        ownerNumeric = (await readOwnerCacheByUser(Number(resolvedUserId))) || 0;
      }

      const foundVesselForWm =
        selectedVesselDbId && vessels?.length
          ? vessels.find((v: any) => vesselDbId(v) === selectedVesselDbId)
          : null;

      const rvCode = String(selectedVesselCode || "").trim();

      const fromLabel = (() => {
        const parts = String(selectedVesselLabel || "").split("•");
        const maybe = (parts?.[1] || "").trim();
        return maybe.replace(/\(ID:\s*\d+\)\s*$/i, "").trim();
      })();

      const vName =
        (foundVesselForWm ? vesselName(foundVesselForWm) : "") ||
        fromLabel ||
        (selectedVesselDbId ? `ID ${selectedVesselDbId}` : "");

      // Find the group being photographed to get session ID
      const targetGroup = groups.find((grp) => grp.id === photoTargetGroupId);
      const sessionLabel = targetGroup?.sessionId || generateSessionId(tripId, 0);

      // Updated watermark: Vessel ID, Trip Code, Session ID, DateTime, GPS
      const lines = [
        "RootVerse",
        `Vessel: ${rvCode || vName || "—"}`,
        `Trip: ${tripId || "—"}`,
        `Session: ${sessionLabel}`,
        `Time: ${fmtDateTime(now)} UTC`,
        locText(liveLoc),
      ];

      let finalUri = rawUri;
      try {
        finalUri = await watermarkAsync(rawUri, outW, outH, lines);
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

    if (!selectedVesselDbId) {
      Alert.alert("Vessel", "Vessel not selected yet. Select vessel and try again.");
      return;
    }

    const now = new Date();
    const userId = Number(resolvedUserId);
    let ownerFinal: number | null = ownerId || (userId ? await readOwnerCacheByUser(userId) : null);

    if (isOnline && !ownerFinal) {
      const loaded = await loadOwnerFromLogin();
      ownerFinal = loaded?.id ?? null;
    }
    if (isOnline && !ownerFinal) return Alert.alert("Owner", "owner_id (numeric) not loaded");

    const foundVessel =
      selectedVesselDbId && vessels?.length
        ? vessels.find((v: any) => vesselDbId(v) === selectedVesselDbId)
        : null;

    const rvCode =
      String(selectedVesselCode || "").trim() ||
      (foundVessel ? String(vesselCode(foundVessel) || "").trim() : "") ||
      "";

    const baseCommon: any = {
      tripId,
      vesselId: selectedVesselDbId,
      vessel_id: selectedVesselDbId,
      rvVesselId: rvCode,
      rvVesselCode: rvCode,
      ownerId: isOnline ? ownerFinal! : ownerFinal || 0,
      weightKg: 0,
      catchDate: fmtDate(now),
      catchTime: fmtTime(now),
      ...(liveLoc ? { latitude: liveLoc.latitude, longitude: liveLoc.longitude } : {}),
    };

    const payloads: any[] = [];
    for (const g of groups) {
      const sessionId = g.sessionId || generateSessionId(tripId, groups.indexOf(g));

      if ((g.scanned?.length || 0) > 0) {
        // Normal path: one payload per QR
        for (const q of g.scanned) {
          payloads.push({
            ...baseCommon,
            catchSessionId: sessionId,
            fishId: g.fishId!,
            fishName: g.fishName || undefined,
            linkedCrateId: q.id,
            qrKind: q.kind,
            images: g.images || [],
          });
        }
      } else {
        // Image-proof only path: no QR, one payload per group
        payloads.push({
          ...baseCommon,
          catchSessionId: sessionId,
          fishId: g.fishId!,
          fishName: g.fishName || undefined,
          linkedCrateId: null,
          qrKind: null,
          images: g.images || [],
          imageProofOnly: true,
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
          m.includes("network") || m.includes("failed to fetch") || m.includes("timeout") ||
          m.includes("socket") || m.includes("econn") || m.includes("offline");

        if (networkish) {
          const remaining = payloads.slice(i);
          for (const rp of remaining) await enqueueCatchLog(rp as any);
          queued += remaining.length;
          const c = await getQueueCount();
          setPendingCount(c);
          Alert.alert(t.saved, `${t.offlineSaved}\n\nUploaded: ${ok}\nQueued (offline): ${queued}`);
          router.replace({ pathname: "/catch-logs/details", params: { crateId: payloads[0]?.linkedCrateId || "" } });
          return;
        }
        Alert.alert("submitCatchLog failed", msg);
        return;
      }
    }

    const c = await getQueueCount();
    setPendingCount(c);
    Alert.alert(ok > 0 ? t.saved : "Done", `Uploaded: ${ok}\nQueued (offline): ${queued}`);
    router.replace({ pathname: "/catch-logs/details", params: { crateId: payloads[0]?.linkedCrateId || "" } });
  };

  /* ---------------- UI helpers ---------------- */
  const scanTorchEnabled = torchWanted && torchArmed;
  const photoTorchEnabled = photoTorchWanted && photoTorchArmed;

  const clearAll = () => {
    const sid = generateSessionId(tripId || "SESSION", 0);
    const base = createFishGroup(initialQr, sid);
    initGroupRef.current = base;
    setGroups([base]);
    setActiveGroupId(base.id);

    if (lockTripSelection) { setStep(2); return; }

    setStep(1);
    setSelectedVesselDbId(null);
    setSelectedVesselLabel("");
    setSelectedVesselCode("");
    setTripId("");
    setTripLabelText("");
  };

  const goNext = () => {
    if (step === 1) { if (!validateStep1()) return; setStep(2); return; }
    if (step === 2) { if (!validateStep2()) return; setStep(3); return; }
    if (step === 3) { setStep(4); return; }
  };

  const goBack = () => {
    if (step === 1) return;
    if (step === 2 && lockTripSelection) { router.back(); return; }
    setStep((s) => (s === 2 ? 1 : s === 3 ? 2 : 3));
  };

  const phaseLabel = (p: GroupPhase) => {
    if (p === "IMAGE_PROOF") return lang === "ta" ? "📷 PHOTO" : "📷 PHOTO";
    if (p === "SCAN") return t.phaseScan;
    if (p === "PHOTO") return t.phasePhoto;
    return t.phaseDone;
  };

  /* ---------------- SUB COMPONENTS ---------------- */
  function IconPill({
    icon, color, bg, text,
  }: { icon: any; color: string; bg: string; text?: string }) {
    return (
      <View
        style={{
          flexDirection: "row", alignItems: "center", paddingHorizontal: 12,
          paddingVertical: 10, borderRadius: 999, backgroundColor: bg,
          borderWidth: 1, borderColor: "rgba(0,0,0,0.06)",
        }}
      >
        <Ionicons name={icon} size={18} color={color} />
        {text ? (
          <Text style={{ marginLeft: 8, fontWeight: "900", color: "#111827", fontSize: 12 }} numberOfLines={1}>
            {text}
          </Text>
        ) : null}
      </View>
    );
  }

  function StepDot({ active, done, icon }: { active: boolean; done: boolean; icon: any }) {
    const bg = done ? "#ecfdf5" : active ? "#e0f2fe" : "#f3f4f6";
    const b = done ? "#10b981" : active ? "#0ea5e9" : "#cbd5e1";
    const c = done ? "#065f46" : active ? "#075985" : "#64748b";
    return (
      <View
        style={{
          width: 46, height: 46, borderRadius: 18, backgroundColor: bg,
          borderWidth: 2, borderColor: b, alignItems: "center", justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={22} color={c} />
      </View>
    );
  }

  function BigTile({
    icon, title, subtitle, onPress, disabled, rightIcon, color, bg,
  }: {
    icon: any; title: string; subtitle?: string; onPress: () => void;
    disabled?: boolean; rightIcon?: any; color?: string; bg?: string;
  }) {
    const _bg = bg || (disabled ? "#f3f4f6" : "white");
    const _opacity = disabled ? 0.55 : 1;
    const _iconBg = disabled ? "#e5e7eb" : "rgba(14,165,233,0.12)";
    const _iconColor = color || (disabled ? "#94a3b8" : "#075985");

    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        className={`rounded-3xl border ${UI.border} px-4 py-4 active:opacity-90`}
        style={{ backgroundColor: _bg, opacity: _opacity }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View
            style={{
              width: 60, height: 60, borderRadius: 22, backgroundColor: _iconBg,
              alignItems: "center", justifyContent: "center", marginRight: 14,
            }}
          >
            <Ionicons name={icon} size={30} color={_iconColor} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text className={`text-[18px] font-extrabold ${UI.text}`} numberOfLines={1}>{title}</Text>
            {subtitle ? (
              <Text className={`mt-1 text-[12px] font-semibold ${UI.muted}`} numberOfLines={2}>{subtitle}</Text>
            ) : null}
          </View>
          <Ionicons name={rightIcon || "chevron-forward"} size={26} color="#111827" />
        </View>
      </Pressable>
    );
  }

  function QRChip({ id, kind, onRemove }: { id: string; kind: string; onRemove: () => void }) {
    const k = String(kind || "").toUpperCase();
    const badge =
      k === "FISH" ? "fish-outline" : k === "CRATE" ? "cube-outline" : k === "VESSEL" ? "boat-outline" : "help-circle-outline";

    return (
      <View
        style={{
          flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10,
          borderRadius: 18, borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "white", marginBottom: 10,
        }}
      >
        <View
          style={{
            width: 34, height: 34, borderRadius: 14, backgroundColor: "#f3f4f6",
            alignItems: "center", justifyContent: "center", marginRight: 10,
          }}
        >
          <Ionicons name={badge as any} size={18} color="#111827" />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text className={`text-[14px] font-extrabold ${UI.text}`} numberOfLines={1}>{id}</Text>
          <Text className={`text-[11px] font-semibold ${UI.muted}`} numberOfLines={1}>{k}</Text>
        </View>
        <Pressable onPress={onRemove} style={{ padding: 6 }} className="active:opacity-80">
          <Ionicons name="close-circle" size={26} color="#dc2626" />
        </Pressable>
      </View>
    );
  }

  const stepTitle = (n: 1 | 2 | 3 | 4) => {
    if (n === 1) return lang === "ta" ? "படகு + Trip" : "Vessel + Trip";
    if (n === 2) return lang === "ta" ? "மீன் + Photo + QR" : "Fish + Photo + QR";
    if (n === 3) return lang === "ta" ? "சரிபார்" : "Review";
    return lang === "ta" ? "சேமி" : "Save";
  };

  /* ================================================================
     RENDER
  ================================================================ */
  return (
    <SafeAreaView className={`flex-1 ${UI.bg}`}>

      {/* ── Photo Preview Modal ── */}
      <Modal
        visible={!!imgPreviewUri}
        transparent
        animationType="fade"
        onRequestClose={() => setImgPreviewUri(null)}
      >
        <View className="flex-1 bg-black/90 justify-center px-3">
          <View className="rounded-3xl overflow-hidden bg-black border border-white/10">
            <View className="flex-row items-center justify-between px-4 py-3 bg-black/60">
              <Text className="text-white font-extrabold text-base" numberOfLines={1} style={{ flex: 1 }}>
                {t.imgPreviewTitle}
              </Text>
              <Pressable
                onPress={() => setImgPreviewUri(null)}
                className="rounded-full px-4 py-2 active:opacity-80"
                style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
              >
                <Text className="text-white font-extrabold">{t.close}</Text>
              </Pressable>
            </View>
            <View style={{ height: 520, backgroundColor: "black" }}>
              {imgPreviewUri ? (
                <Image source={{ uri: imgPreviewUri }} style={{ width: "100%", height: "100%" }} resizeMode="contain" />
              ) : null}
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Fish Tag Scan Modal ── */}
      <Modal
        visible={fishScanOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setFishScanOpen(false)}
      >
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white rounded-t-3xl p-4">
            <View className="flex-row items-center justify-between">
              <View style={{ flexDirection: "row", alignItems: "center", flex: 1, minWidth: 0 }}>
                <Ionicons name="qr-code-outline" size={22} color="#111827" />
                <Text className={`ml-2 text-lg font-extrabold ${UI.text}`} numberOfLines={1}>
                  {t.scanModalTitle}
                </Text>
              </View>
              <Pressable
                onPress={() => setFishScanOpen(false)}
                className={`rounded-full border ${UI.border} bg-[#f3f4f6] px-4 py-2 active:opacity-80`}
              >
                <Ionicons name="close" size={18} color="#111827" />
              </Pressable>
            </View>
            <View className={`mt-3 overflow-hidden rounded-2xl border ${UI.border} bg-black`}>
              {!cameraPerm?.granted ? (
                <View className="p-4">
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons name="alert-circle-outline" size={20} color="white" />
                    <Text className="text-white text-base font-extrabold ml-2">{t.camDenied}</Text>
                  </View>
                  <View className="mt-3">
                    <PrimaryBtn label={t.grantCam} onPress={requestCameraPerm} icon="camera-outline" />
                  </View>
                </View>
              ) : (
                <View style={{ height: 340 }}>
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
            <View style={{ height: 10 }} />
            <Text className={`text-xs ${UI.muted}`}>
              {lang === "ta" ? "QR-ஐ காட்டுங்கள். Auto scan ஆகும்." : "Show QR. It scans automatically."}
            </Text>
          </View>
        </View>
      </Modal>

      {/* ── Photo Camera Modal ── */}
      <Modal visible={photoCamOpen} transparent animationType="fade" onRequestClose={closePhotoCamera}>
        <View className="flex-1 bg-black/70 justify-center px-3">
          <View className="bg-white rounded-3xl p-4">
            <View className="flex-row items-center justify-between">
              <View style={{ flexDirection: "row", alignItems: "center", flex: 1, minWidth: 0 }}>
                <Ionicons name="camera-outline" size={22} color="#111827" />
                <Text className={`ml-2 text-lg font-extrabold ${UI.text}`} numberOfLines={1}>
                  {t.photoCamTitle}
                </Text>
              </View>
              <Pressable
                onPress={() => setPhotoTorchWanted((p) => !p)}
                className={`mr-2 rounded-full border ${UI.border} bg-[#f3f4f6] px-3 py-2 active:opacity-80`}
              >
                <Ionicons name={photoTorchWanted ? "flashlight" : "flashlight-outline"} size={18} color="#111827" />
              </Pressable>
              <Pressable
                onPress={closePhotoCamera}
                className={`rounded-full border ${UI.border} bg-[#f3f4f6] px-3 py-2 active:opacity-80`}
              >
                <Ionicons name="close" size={18} color="#111827" />
              </Pressable>
            </View>
            <View className={`mt-3 overflow-hidden rounded-2xl border ${UI.border} bg-black`}>
              {!cameraPerm?.granted ? (
                <View className="p-4">
                  <Text className="text-white text-base font-semibold">{t.camDenied}</Text>
                  <View className="mt-3">
                    <PrimaryBtn label={t.grantCam} onPress={requestCameraPerm} />
                  </View>
                </View>
              ) : (
                <View style={{ height: 420 }}>
                  <CameraView ref={photoCamRef} style={{ flex: 1 }} facing="back" enableTorch={photoTorchEnabled} />
                </View>
              )}
            </View>
            <View className="mt-3">
              <PrimaryBtn
                label={takingPhoto ? (lang === "ta" ? "எடுக்கிறது..." : "Capturing...") : t.takePhoto}
                onPress={takePhotoNow}
                disabled={takingPhoto}
                icon="camera-outline"
                color={UI.accent}
              />
              <Text className={`mt-2 text-xs ${UI.muted}`}>{t.max2}</Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================================================================
          MAIN SCROLL CONTENT
      ================================================================ */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 18 + (insets.bottom || 0) + 110 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── TOP BAR ── */}
        <View className="px-4 pt-3">
          <Card className="p-4">
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text className={`text-2xl font-extrabold ${UI.text}`} numberOfLines={1}>{t.title}</Text>
                <Text className={`mt-1 text-sm font-semibold ${UI.muted}`} numberOfLines={1}>
                  {stepTitle(step)}
                </Text>
              </View>
              <Pressable
                onPress={() => setLang((p) => (p === "ta" ? "en" : "ta"))}
                className={`rounded-full border ${UI.border} bg-white px-3 py-2 active:opacity-80`}
              >
                <Ionicons name="language-outline" size={18} color="#111827" />
              </Pressable>
            </View>

            <View style={{ height: 14 }} />

            {/* Step dots */}
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <StepDot active={step === 1} done={step > 1} icon="boat-outline" />
              <View style={{ flex: 1, height: 2, backgroundColor: "#e5e7eb", alignSelf: "center", marginHorizontal: 8 }} />
              <StepDot active={step === 2} done={step > 2} icon="qr-code-outline" />
              <View style={{ flex: 1, height: 2, backgroundColor: "#e5e7eb", alignSelf: "center", marginHorizontal: 8 }} />
              <StepDot active={step === 3} done={step > 3} icon="list-outline" />
              <View style={{ flex: 1, height: 2, backgroundColor: "#e5e7eb", alignSelf: "center", marginHorizontal: 8 }} />
              <StepDot active={step === 4} done={false} icon="cloud-upload-outline" />
            </View>

            <View style={{ height: 14 }} />

            {/* Status pills */}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              <IconPill
                icon={isOnline ? "wifi-outline" : "cloud-offline-outline"}
                color={isOnline ? UI.success : UI.warn}
                bg={isOnline ? "#ecfdf5" : "#fffbeb"}
                text={isOnline ? "Online" : "Offline"}
              />
              <IconPill
                icon={syncIcon as any}
                color={syncColor}
                bg={syncState === "SYNCED" ? "#ecfdf5" : syncState === "SYNCING" ? "#e0f2fe" : "#fffbeb"}
                text={syncText}
              />
              <IconPill icon="layers-outline" color="#111827" bg="#f3f4f6" text={`${pendingCount}`} />
            </View>

            <View style={{ height: 12 }} />

            {/* Quick action buttons */}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Pressable
                  onPress={() => setTorchWanted((p) => !p)}
                  className="rounded-2xl px-4 py-4 active:opacity-90"
                  style={{ backgroundColor: "#111827" }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name={torchWanted ? "flashlight" : "flashlight-outline"} size={20} color="white" />
                    <Text className="ml-2 text-white font-extrabold">
                      {torchWanted ? t.torchOn : t.torchOff}
                    </Text>
                  </View>
                </Pressable>
              </View>
              <View style={{ flex: 1 }}>
                <Pressable
                  onPress={openFishScan}
                  disabled={!scanFishEnabled}
                  className="rounded-2xl px-4 py-4 active:opacity-90"
                  style={{ backgroundColor: scanFishEnabled ? UI.accent : "#cbd5e1", opacity: scanFishEnabled ? 1 : 0.8 }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="qr-code-outline" size={20} color="white" />
                    <Text className="ml-2 text-white font-extrabold" numberOfLines={1}>Scan</Text>
                  </View>
                </Pressable>
              </View>
            </View>

            <View style={{ height: 10 }} />
            <GhostBtn label={t.clearAll} onPress={clearAll} icon="refresh-outline" />
          </Card>
        </View>

        {/* ================================================================
            STEP 1 — Vessel + Trip
        ================================================================ */}
        {step === 1 ? (
          <View className="px-4 mt-4">
            <Card className="p-4">
              <Text className={`text-base font-extrabold ${UI.text}`} numberOfLines={1}>
                {lang === "ta" ? "முதலில் இதை தேர்வு செய்யுங்கள்" : "First select these"}
              </Text>
              <Text className={`mt-1 text-xs ${UI.muted}`}>
                {lang === "ta" ? "படகு → Trip → Next" : "Vessel → Trip → Next"}
              </Text>

              <View style={{ height: 12 }} />

              <BigTile
                icon="boat-outline"
                title={selectedVesselLabel || (lang === "ta" ? "படகு" : "Vessel")}
                subtitle={vesselLoading ? t.loadingVessel : vessels.length ? `${vessels.length}` : t.noVessels}
                onPress={() => setVesselPickerOpen(true)}
              />

              <View style={{ height: 12 }} />

              <BigTile
                icon="document-text-outline"
                title={tripLabelText || (lang === "ta" ? "Trip" : "Trip")}
                subtitle={tripLoading ? t.loadingTrips : trips.length ? `${trips.length}` : t.noTrips}
                disabled={!selectedVesselDbId && !lockTripSelection}
                onPress={() => setTripPickerOpen(true)}
              />

              <View style={{ height: 12 }} />

              <View className="rounded-2xl border border-[#e5e7eb] bg-[#f9fafb] px-4 py-3">
                <Text className={`text-xs ${UI.muted}`}>
                  {ownerLoading ? t.loadingOwner : `Owner: ${ownerCode || "—"} (${ownerId || "—"})`}
                </Text>
                <Text className={`mt-1 text-xs ${UI.muted}`}>
                  {fishLoading ? t.loadingFish : `Fish: ${fishTypes.length}`}
                </Text>
              </View>
            </Card>
          </View>
        ) : null}

        {/* ================================================================
            STEP 2 — Fish + Photo + QR
        ================================================================ */}
        {step === 2 ? (
          <View className="px-4 mt-4">

            {/* Locked Trip info */}
            {lockTripSelection ? (
              <Card className="p-4">
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", flex: 1, minWidth: 0 }}>
                    <Ionicons name="lock-closed-outline" size={20} color="#111827" />
                    <Text className={`ml-2 text-base font-extrabold ${UI.text}`} numberOfLines={1}>
                      {lang === "ta" ? "Trip lock" : "Trip locked"}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => { setLockTripSelection(false); setStep(1); }}
                    className="rounded-full px-4 py-2 active:opacity-80"
                    style={{ backgroundColor: "#fee2e2" }}
                  >
                    <Ionicons name="create-outline" size={16} color="#991b1b" />
                  </Pressable>
                </View>

                <View style={{ height: 12 }} />

                <View className="rounded-2xl border border-[#e5e7eb] bg-[#f9fafb] px-4 py-3">
                  <Text className={`text-xs font-extrabold ${UI.muted}`}>
                    {lang === "ta" ? "Vessel" : "Vessel"}
                  </Text>
                  <Text className={`mt-1 text-base font-extrabold ${UI.text}`} numberOfLines={2}>
                    {selectedVesselLabel || (prefillLoading ? t.lockedLoading : "—")}
                  </Text>
                  <View style={{ height: 10 }} />
                  <Text className={`text-xs font-extrabold ${UI.muted}`}>
                    {lang === "ta" ? "Trip" : "Trip"}
                  </Text>
                  <Text className={`mt-1 text-base font-extrabold ${UI.text}`} numberOfLines={2}>
                    {tripLabelText || routeTripParam || (prefillLoading ? t.lockedLoading : "—")}
                  </Text>
                  {!selectedVesselDbId || !tripId ? (
                    <Text className="mt-3 text-sm font-extrabold" style={{ color: UI.warn }}>
                      {prefillLoading ? t.lockedLoading : t.lockedMissing}
                    </Text>
                  ) : null}
                </View>
              </Card>
            ) : (
              <Card className="p-4">
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <GhostBtn label={lang === "ta" ? "Vessel" : "Vessel"} onPress={() => setVesselPickerOpen(true)} icon="boat-outline" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <GhostBtn
                      label={lang === "ta" ? "Trip" : "Trip"}
                      onPress={() => setTripPickerOpen(true)}
                      icon="document-text-outline"
                      disabled={!selectedVesselDbId && !lockTripSelection}
                    />
                  </View>
                </View>
                <View style={{ height: 10 }} />
                <Text className={`text-xs ${UI.muted}`} numberOfLines={2}>
                  {selectedVesselLabel ? `🛥 ${selectedVesselLabel}` : "🛥 —"}{"\n"}
                  {tripLabelText ? `📄 ${tripLabelText}` : "📄 —"}
                </Text>
              </Card>
            )}

            <View style={{ height: 12 }} />

            {/* Groups panel */}
            <Card className="p-4">
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="layers-outline" size={20} color="#111827" />
                  <Text className={`ml-2 text-lg font-extrabold ${UI.text}`} numberOfLines={1}>
                    {lang === "ta" ? "குழுக்கள்" : "Groups"}
                  </Text>
                </View>
                <Pressable
                  onPress={addGroup}
                  className="rounded-full px-4 py-2 active:opacity-80"
                  style={{ backgroundColor: UI.accent }}
                >
                  <Ionicons name="add" size={18} color="white" />
                </Pressable>
              </View>

              <View style={{ height: 10 }} />

              {/* Group tab selector */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: "row", gap: 10, paddingVertical: 4 }}>
                  {groups.map((g, idx) => {
                    const active = g.id === activeGroupId;
                    const bg = active ? "#e0f2fe" : "white";
                    const br = active ? "#93c5fd" : "#e5e7eb";
                    const phaseColor =
                      g.phase === "DONE"
                        ? UI.success
                        : g.phase === "PHOTO" || g.phase === "IMAGE_PROOF"
                        ? UI.accent
                        : UI.warn;
                    return (
                      <Pressable
                        key={g.id}
                        onPress={() => setActiveGroupId(g.id)}
                        style={{
                          paddingHorizontal: 14, paddingVertical: 12, borderRadius: 16,
                          borderWidth: 2, borderColor: br, backgroundColor: bg, minWidth: 120,
                        }}
                        className="active:opacity-90"
                      >
                        <Text className={`text-sm font-extrabold ${UI.text}`} numberOfLines={1}>
                          {lang === "ta" ? `மீன் ${idx + 1}` : `Fish ${idx + 1}`}
                        </Text>
                        <Text className={`mt-1 text-[11px] font-semibold ${UI.muted}`} numberOfLines={1}>
                          QR {g.scanned?.length || 0} • 📷 {g.images?.length || 0}
                        </Text>
                        <Text className="mt-1 text-[11px] font-extrabold" style={{ color: phaseColor }}>
                          {phaseLabel(g.phase)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>

              <View style={{ height: 12 }} />

              {/* Active group content */}
              {activeGroup ? (
                <View>
                  {/* Pick Fish (always visible) */}
                  <BigTile
                    icon="fish-outline"
                    title={activeGroup.fishName || (lang === "ta" ? "மீன் தேர்வு" : "Pick Fish")}
                    subtitle={lang === "ta" ? "மீன் படத்தை தேர்வு செய்யுங்கள்" : "Choose fish species"}
                    onPress={() => {
                      setFishPickGroupId(activeGroup.id);
                      setFishPickerOpen(true);
                    }}
                  />

                  <View style={{ height: 12 }} />

                  {/* ═══ IMAGE_PROOF phase ═══ */}
                  {activeGroup.phase === "IMAGE_PROOF" ? (
                    <Card className="p-4">
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                          <Ionicons name="camera-outline" size={20} color="#111827" />
                          <Text className={`ml-2 text-base font-extrabold ${UI.text}`}>
                            {lang === "ta" ? "புகைப்படம் எடு" : "Capture Photo Proof"}
                          </Text>
                        </View>
                        <IconPill
                          icon="camera-outline"
                          color="#111827"
                          bg="#f3f4f6"
                          text={`${activeGroup.images?.length || 0}/2`}
                        />
                      </View>

                      {/* Session ID badge */}
                      <View style={{ marginTop: 10, backgroundColor: "#eff6ff", borderRadius: 12, padding: 10 }}>
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                          <Ionicons name="id-card-outline" size={16} color="#1d4ed8" />
                          <Text style={{ marginLeft: 8, fontSize: 12, fontWeight: "800", color: "#1d4ed8" }}>
                            {lang === "ta" ? "Session ID:" : "Session ID:"}
                          </Text>
                          <Text
                            style={{ marginLeft: 6, fontSize: 12, fontWeight: "700", color: "#1e40af", flex: 1 }}
                            numberOfLines={1}
                          >
                            {activeGroup.sessionId || "—"}
                          </Text>
                        </View>
                      </View>

                      <Text className={`mt-2 text-xs ${UI.muted}`}>
                        {lang === "ta"
                          ? "கடலில் QR இல்லாவிட்டாலும் Photo எடுக்கலாம். QR பிறகு சேர்க்கலாம்."
                          : "Photo alone is valid proof. QR can be scanned later on shore."}
                      </Text>

                      <View style={{ height: 12 }} />

                      <PrimaryBtn
                        label={lang === "ta" ? "📷 Photo எடு" : "📷 Take Photo"}
                        onPress={() => openPhotoCamera(activeGroup.id)}
                        icon="camera-outline"
                        color={UI.accent}
                      />

                      {/* Captured images */}
                      {(activeGroup.images?.length || 0) > 0 ? (
                        <View style={{ marginTop: 12 }}>
                          <View style={{ flexDirection: "row", gap: 10 }}>
                            {(activeGroup.images || []).map((u) => (
                              <View key={u} style={{ flex: 1 }}>
                                <View className={`overflow-hidden rounded-2xl border ${UI.border} bg-white`}>
                                  <Pressable onPress={() => setImgPreviewUri(u)} className="active:opacity-95">
                                    <Image source={{ uri: u }} style={{ width: "100%", height: 150 }} resizeMode="cover" />
                                  </Pressable>
                                  <Pressable
                                    onPress={() => removeImageFromGroup(activeGroup.id, u)}
                                    className="px-3 py-2 active:opacity-80"
                                    style={{ backgroundColor: "#fff1f2" }}
                                  >
                                    <Text className="text-center text-sm font-extrabold" style={{ color: "#be123c" }}>
                                      {lang === "ta" ? "நீக்கு" : "Remove"}
                                    </Text>
                                  </Pressable>
                                </View>
                              </View>
                            ))}
                            {(activeGroup.images?.length || 0) === 1 ? <View style={{ flex: 1 }} /> : null}
                          </View>
                        </View>
                      ) : null}

                      <View style={{ height: 14 }} />

                      <View style={{ flexDirection: "row", gap: 10 }}>
                        {/* Optional: go to QR scan */}
                        <View style={{ flex: 1 }}>
                          <GhostBtn
                            label={lang === "ta" ? "QR Scan →" : "Scan QR →"}
                            onPress={() => {
                              setGroups((prev) =>
                                prev.map((g) => (g.id === activeGroup.id ? { ...g, phase: "SCAN" } : g)),
                              );
                            }}
                            icon="qr-code-outline"
                          />
                        </View>
                        {/* Finish with photo proof only */}
                        <View style={{ flex: 1 }}>
                          <PrimaryBtn
                            label="DONE"
                            disabled={(activeGroup.images?.length || 0) === 0 || !activeGroup.fishId}
                            onPress={() => {
                              if (!activeGroup.fishId) {
                                Alert.alert(t.required, t.groupNeedsFish);
                                return;
                              }
                              if ((activeGroup.images?.length || 0) === 0) {
                                Alert.alert(
                                  t.required,
                                  lang === "ta"
                                    ? "குறைந்தது 1 photo தேவை."
                                    : "At least 1 photo is required.",
                                );
                                return;
                              }
                              setGroups((prev) =>
                                prev.map((g) =>
                                  g.id === activeGroup.id ? { ...g, phase: "DONE" } : g,
                                ),
                              );
                            }}
                            icon="checkmark-circle-outline"
                            color={UI.success}
                          />
                        </View>
                      </View>

                      <View style={{ height: 12 }} />

                      <Pressable
                        onPress={() => removeGroup(activeGroup.id)}
                        className="rounded-2xl px-4 py-4 active:opacity-80"
                        style={{ backgroundColor: "#fee2e2" }}
                      >
                        <View className="flex-row items-center justify-center">
                          <Ionicons name="trash-outline" size={20} color="#991b1b" />
                          <Text className="ml-2 text-base font-extrabold" style={{ color: "#991b1b" }}>
                            {lang === "ta" ? "Group Delete" : "Delete Group"}
                          </Text>
                        </View>
                      </Pressable>
                    </Card>
                  ) : null}

                  {/* ═══ SCAN phase ═══ */}
                  {activeGroup.phase === "SCAN" ? (
                    <View>
                      <Card className="p-4">
                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                          <View style={{ flexDirection: "row", alignItems: "center" }}>
                            <Ionicons name="qr-code-outline" size={20} color="#111827" />
                            <Text className={`ml-2 text-base font-extrabold ${UI.text}`}>QR Scan</Text>
                          </View>
                          <IconPill
                            icon={activeGroupCanScan ? "checkmark-circle-outline" : "alert-circle-outline"}
                            color={activeGroupCanScan ? UI.success : UI.warn}
                            bg={activeGroupCanScan ? "#ecfdf5" : "#fffbeb"}
                            text={activeGroupCanScan
                              ? (lang === "ta" ? "Ready" : "Ready")
                              : (lang === "ta" ? "Not ready" : "Not ready")}
                          />
                        </View>

                        {/* Session ID badge */}
                        <View style={{ marginTop: 10, backgroundColor: "#eff6ff", borderRadius: 12, padding: 10 }}>
                          <View style={{ flexDirection: "row", alignItems: "center" }}>
                            <Ionicons name="id-card-outline" size={16} color="#1d4ed8" />
                            <Text style={{ marginLeft: 8, fontSize: 12, fontWeight: "800", color: "#1d4ed8" }}>
                              Session ID:
                            </Text>
                            <Text
                              style={{ marginLeft: 6, fontSize: 12, fontWeight: "700", color: "#1e40af", flex: 1 }}
                              numberOfLines={1}
                            >
                              {activeGroup.sessionId || "—"}
                            </Text>
                          </View>
                        </View>

                        <Text className={`mt-2 text-xs ${UI.muted}`}>
                          {activeGroupCanScan
                            ? (lang === "ta" ? "QR-ஐ காட்டுங்கள். Scan ஆகும்." : "Show QR. It will scan.")
                            : (lang === "ta" ? "மீன் + Vessel/Trip தேவை." : "Need Fish + Vessel/Trip.")}
                        </Text>

                        <View className={`mt-3 overflow-hidden rounded-2xl border ${UI.border} bg-black`}>
                          {!cameraPerm?.granted ? (
                            <View className="p-4">
                              <Text className="text-white text-base font-semibold">{t.camDenied}</Text>
                              <View className="mt-3">
                                <PrimaryBtn label={t.grantCam} onPress={requestCameraPerm} icon="camera-outline" />
                              </View>
                            </View>
                          ) : (
                            <View style={{ height: 360 }}>
                              <CameraView
                                style={{ flex: 1 }}
                                facing="back"
                                enableTorch={scanTorchEnabled}
                                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                                onBarcodeScanned={(e) => onBarcodeScanned(String((e as any)?.data || ""))}
                              />
                            </View>
                          )}
                        </View>

                        <View style={{ height: 12 }} />

                        <View style={{ flexDirection: "row", gap: 10 }}>
                          <View style={{ flex: 1 }}>
                            <GhostBtn
                              label={lang === "ta" ? "← Photo" : "← Photo"}
                              onPress={() => {
                                setGroups((prev) =>
                                  prev.map((g) =>
                                    g.id === activeGroup.id ? { ...g, phase: "IMAGE_PROOF" } : g,
                                  ),
                                );
                              }}
                              icon="camera-outline"
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <GhostBtn
                              label={lang === "ta" ? "Clear" : "Clear"}
                              onPress={() => clearGroupQrs(activeGroup.id)}
                              icon="trash-outline"
                            />
                          </View>
                          <View style={{ flex: 1.2 }}>
                            <PrimaryBtn
                              label="DONE"
                              onPress={() => {
                                if (!activeGroup.fishId) { Alert.alert(t.required, t.groupNeedsFish); return; }
                                if ((activeGroup.scanned?.length || 0) === 0) {
                                  Alert.alert(t.required, t.errGroupQrMissing); return;
                                }
                                startPhotoStage(activeGroup.id);
                              }}
                              icon="checkmark-circle-outline"
                              color={UI.success}
                            />
                          </View>
                        </View>
                      </Card>

                      <View style={{ height: 12 }} />

                      {/* Scanned QRs */}
                      <Card className="p-4">
                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                          <View style={{ flexDirection: "row", alignItems: "center" }}>
                            <Ionicons name="list-outline" size={20} color="#111827" />
                            <Text className={`ml-2 text-base font-extrabold ${UI.text}`}>
                              {lang === "ta" ? "ஸ்கேன் பட்டியல்" : "Scanned List"}
                            </Text>
                          </View>
                          <IconPill icon="layers-outline" color="#111827" bg="#f3f4f6" text={`${activeGroup.scanned?.length || 0}`} />
                        </View>

                        <View style={{ height: 12 }} />

                        {(activeGroup.scanned || []).length === 0 ? (
                          <View className="rounded-2xl border border-[#e5e7eb] bg-[#f9fafb] px-4 py-4">
                            <View style={{ flexDirection: "row", alignItems: "center" }}>
                              <Ionicons name="information-circle-outline" size={18} color="#64748b" />
                              <Text className={`ml-2 text-sm ${UI.muted}`}>
                                {lang === "ta" ? "QR இல்லை" : "No QR yet"}
                              </Text>
                            </View>
                          </View>
                        ) : (
                          (activeGroup.scanned || []).map((q) => (
                            <QRChip
                              key={q.id}
                              id={q.id}
                              kind={q.kind}
                              onRemove={() => removeQrFromGroup(activeGroup.id, q.id)}
                            />
                          ))
                        )}

                        <View style={{ height: 10 }} />

                        <Pressable
                          onPress={() => removeGroup(activeGroup.id)}
                          className="rounded-2xl px-4 py-4 active:opacity-80"
                          style={{ backgroundColor: "#fee2e2" }}
                        >
                          <View className="flex-row items-center justify-center">
                            <Ionicons name="trash-outline" size={20} color="#991b1b" />
                            <Text className="ml-2 text-base font-extrabold" style={{ color: "#991b1b" }}>
                              {lang === "ta" ? "Group Delete" : "Delete Group"}
                            </Text>
                          </View>
                        </Pressable>
                      </Card>
                    </View>
                  ) : null}

                  {/* ═══ PHOTO phase ═══ */}
                  {activeGroup.phase === "PHOTO" ? (
                    <Card className="p-4">
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                          <Ionicons name="camera-outline" size={20} color="#111827" />
                          <Text className={`ml-2 text-base font-extrabold ${UI.text}`}>
                            {lang === "ta" ? "Photo (Optional)" : "Photo (Optional)"}
                          </Text>
                        </View>
                        <IconPill icon="camera-outline" color="#111827" bg="#f3f4f6" text={`${activeGroup.images?.length || 0}/2`} />
                      </View>

                      <Text className={`mt-2 text-xs ${UI.muted}`}>
                        {lang === "ta" ? "புகைப்படம் வேண்டாம் என்றால் DONE அழுத்தலாம்" : "You can finish without photos"}
                      </Text>

                      <View style={{ height: 12 }} />

                      <View style={{ flexDirection: "row", gap: 10 }}>
                        <View style={{ flex: 1 }}>
                          <GhostBtn label={lang === "ta" ? "Back" : "Back"} onPress={() => backToScanStage(activeGroup.id)} icon="arrow-back-outline" />
                        </View>
                        <View style={{ flex: 1.2 }}>
                          <PrimaryBtn label={lang === "ta" ? "Camera" : "Camera"} onPress={() => openPhotoCamera(activeGroup.id)} icon="camera-outline" />
                        </View>
                      </View>

                      <View style={{ height: 12 }} />

                      {(activeGroup.images?.length || 0) > 0 ? (
                        <View style={{ flexDirection: "row", gap: 10 }}>
                          {(activeGroup.images || []).map((u) => (
                            <View key={u} style={{ flex: 1 }}>
                              <View className={`overflow-hidden rounded-2xl border ${UI.border} bg-white`}>
                                <Pressable onPress={() => setImgPreviewUri(u)} className="active:opacity-95">
                                  <Image source={{ uri: u }} style={{ width: "100%", height: 170 }} resizeMode="cover" />
                                </Pressable>
                                <Pressable
                                  onPress={() => removeImageFromGroup(activeGroup.id, u)}
                                  className="px-3 py-3 active:opacity-80"
                                  style={{ backgroundColor: "#fff1f2" }}
                                >
                                  <Text className="text-center text-sm font-extrabold" style={{ color: "#be123c" }}>
                                    {lang === "ta" ? "Remove" : "Remove"}
                                  </Text>
                                </Pressable>
                              </View>
                            </View>
                          ))}
                          {(activeGroup.images?.length || 0) === 1 ? <View style={{ flex: 1 }} /> : null}
                        </View>
                      ) : (
                        <View className="rounded-2xl border border-[#e5e7eb] bg-[#f9fafb] px-4 py-4">
                          <View style={{ flexDirection: "row", alignItems: "center" }}>
                            <Ionicons name="information-circle-outline" size={18} color="#64748b" />
                            <Text className={`ml-2 text-sm ${UI.muted}`}>
                              {lang === "ta" ? "Photo இல்லை" : "No photo yet"}
                            </Text>
                          </View>
                        </View>
                      )}

                      <View style={{ height: 12 }} />

                      <PrimaryBtn
                        label="DONE"
                        onPress={() => finishFishGroup(activeGroup.id)}
                        icon="checkmark-outline"
                        color={UI.success}
                      />
                    </Card>
                  ) : null}

                  {/* ═══ DONE state ═══ */}
                  {activeGroup.phase === "DONE" ? (
                    <View className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Ionicons name="checkmark-circle" size={20} color="#065f46" />
                        <Text className="ml-2 text-emerald-900 font-extrabold text-lg">
                          {lang === "ta" ? "முடிந்தது" : "Done"}
                        </Text>
                      </View>
                      <Text className="mt-1 text-sm text-emerald-800">
                        {lang === "ta"
                          ? "+ அழுத்தி அடுத்த மீன் சேர்க்கலாம்"
                          : "Tap + to add the next fish group"}
                      </Text>
                      {/* Show session id in done state */}
                      <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center" }}>
                        <Ionicons name="id-card-outline" size={14} color="#065f46" />
                        <Text className="ml-2 text-emerald-800 text-xs font-bold" numberOfLines={1}>
                          {activeGroup.sessionId || "—"}
                        </Text>
                      </View>
                    </View>
                  ) : null}

                  <View style={{ height: 12 }} />

                  {/* Auto Date/Time + Location */}
                  <Card className="p-4">
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Ionicons name="time-outline" size={20} color="#111827" />
                      <Text className={`ml-2 text-base font-extrabold ${UI.text}`}>
                        {lang === "ta" ? "நேரம் / இடம்" : "Time / Location"}
                      </Text>
                    </View>

                    <View style={{ height: 10 }} />

                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <View style={{ flex: 1, backgroundColor: "#f3f4f6", borderRadius: 16, padding: 12 }}>
                        <Text className={`text-xs font-extrabold ${UI.muted}`}>{t.date}</Text>
                        <Text className={`mt-1 text-base font-extrabold ${UI.text}`}>{fmtDate(nowPreview)}</Text>
                      </View>
                      <View style={{ flex: 1, backgroundColor: "#f3f4f6", borderRadius: 16, padding: 12 }}>
                        <Text className={`text-xs font-extrabold ${UI.muted}`}>{t.time}</Text>
                        <Text className={`mt-1 text-base font-extrabold ${UI.text}`}>{fmtTime(nowPreview)}</Text>
                      </View>
                    </View>

                    <View style={{ height: 10 }} />

                    <View className="rounded-2xl border border-[#e5e7eb] bg-[#f9fafb] px-4 py-3">
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Ionicons name="location-outline" size={18} color="#111827" />
                        <Text className={`ml-2 text-xs ${UI.muted}`} numberOfLines={2}>
                          {locLoading ? "Loading..." : locError ? locError : locText(liveLoc)}
                        </Text>
                      </View>
                    </View>
                  </Card>
                </View>
              ) : null}
            </Card>
          </View>
        ) : null}

        {/* ================================================================
            STEP 3 — Review
        ================================================================ */}
        {step === 3 ? (
          <View className="px-4 mt-4">
            <Card className="p-4">
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="list-outline" size={20} color="#111827" />
                <Text className={`ml-2 text-lg font-extrabold ${UI.text}`}>
                  {lang === "ta" ? "சரிபார்" : "Review"}
                </Text>
              </View>

              <View style={{ height: 12 }} />

              <View className="rounded-2xl border border-[#e5e7eb] bg-[#f9fafb] px-4 py-4">
                <Text className={`text-xs font-extrabold ${UI.muted}`}>{t.vessel}</Text>
                <Text className={`mt-1 text-base font-extrabold ${UI.text}`} numberOfLines={2}>
                  {selectedVesselLabel || "—"}
                </Text>

                <View style={{ height: 10 }} />

                <Text className={`text-xs font-extrabold ${UI.muted}`}>{t.trip}</Text>
                <Text className={`mt-1 text-base font-extrabold ${UI.text}`} numberOfLines={2}>
                  {tripLabelText || "—"}
                </Text>

                <View style={{ height: 10 }} />

                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="qr-code-outline" size={18} color="#111827" />
                  <Text className={`ml-2 text-base font-extrabold ${UI.text}`}>{totalQrCount} QR</Text>
                </View>
              </View>

              <View style={{ height: 12 }} />

              {groups.map((g, idx) => (
                <View key={g.id} className={`mb-2 rounded-2xl border ${UI.border} bg-white px-4 py-4`}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons name="fish-outline" size={18} color="#111827" />
                    <Text className={`ml-2 text-base font-extrabold ${UI.text}`} numberOfLines={1}>
                      {idx + 1}. {g.fishName || "—"}
                    </Text>
                  </View>
                  <Text className={`mt-1 text-sm ${UI.muted}`}>
                    QR: {g.scanned?.length || 0} • 📷 {g.images?.length || 0} • {phaseLabel(g.phase)}
                  </Text>
                  <Text className={`mt-1 text-xs ${UI.muted}`} numberOfLines={1}>
                    {g.sessionId || "—"}
                  </Text>
                  {/* Image proof only badge */}
                  {(g.scanned?.length || 0) === 0 && (g.images?.length || 0) > 0 ? (
                    <View style={{ marginTop: 6, flexDirection: "row", alignItems: "center" }}>
                      <View
                        style={{
                          backgroundColor: "#eff6ff", borderRadius: 8, paddingHorizontal: 8,
                          paddingVertical: 3, flexDirection: "row", alignItems: "center",
                        }}
                      >
                        <Ionicons name="camera-outline" size={12} color="#1d4ed8" />
                        <Text style={{ marginLeft: 4, fontSize: 11, fontWeight: "800", color: "#1d4ed8" }}>
                          {lang === "ta" ? "Photo Proof Only" : "Photo Proof Only"}
                        </Text>
                      </View>
                    </View>
                  ) : null}
                </View>
              ))}
            </Card>
          </View>
        ) : null}

        {/* ================================================================
            STEP 4 — Save
        ================================================================ */}
        {step === 4 ? (
          <View className="px-4 mt-4">
            <Card className="p-4">
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="cloud-upload-outline" size={20} color="#111827" />
                <Text className={`ml-2 text-lg font-extrabold ${UI.text}`}>
                  {lang === "ta" ? "சேமி" : "Save"}
                </Text>
              </View>

              <View style={{ height: 12 }} />

              <PrimaryBtn
                label={posting ? (lang === "ta" ? "சேமிக்கிறது..." : "Saving...") : t.save}
                onPress={save}
                disabled={posting}
                icon="cloud-upload-outline"
                color={UI.accent}
              />

              <Text className={`mt-3 text-xs ${UI.muted}`}>
                {lang === "ta"
                  ? "Net இல்லையெனில் Local-ல் save ஆகும். Net வந்ததும் auto sync ஆகும்."
                  : "If offline, saved locally and auto-sync later."}
              </Text>
            </Card>
          </View>
        ) : null}
      </ScrollView>

      {/* ── Bottom navigation bar ── */}
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: 14,
          paddingTop: 12,
          paddingBottom: 14 + (insets.bottom || 0),
          backgroundColor: "rgba(246,247,251,0.98)",
          borderTopWidth: 1,
          borderTopColor: "#e5e7eb",
        }}
      >
        <View className="flex-row" style={{ gap: 10 }}>
          <View style={{ flex: 1 }}>
            <GhostBtn label={t.back} onPress={goBack} disabled={step === 1} icon="arrow-back-outline" />
          </View>
          {step < 4 ? (
            <View style={{ flex: 1.3 }}>
              <PrimaryBtn
                label={t.next}
                onPress={goNext}
                disabled={step === 2 && !allGroupsDone}
                icon="arrow-forward-outline"
                color={step === 2 ? (allGroupsDone ? UI.accent : "#cbd5e1") : UI.accent}
              />
            </View>
          ) : (
            <View style={{ flex: 1.3 }}>
              <PrimaryBtn
                label={posting ? (lang === "ta" ? "சேமிக்கிறது..." : "Saving...") : t.save}
                onPress={save}
                disabled={posting}
                icon="cloud-upload-outline"
                color={UI.accent}
              />
            </View>
          )}
        </View>
      </View>

      {/* ── Full Screen Pickers ── */}
      <FullScreenPickerModal
        visible={vesselPickerOpen}
        title={t.chooseVessel}
        items={vesselOptions as any}
        selectedKey={selectedVesselDbId ? String(selectedVesselDbId) : ""}
        mode="list"
        leadingIcon="boat-outline"
        showImages={false}
        searchPlaceholder="Search vessel..."
        confirmLabel="Next"
        insetsBottom={insets.bottom}
        onClose={() => setVesselPickerOpen(false)}
        onConfirm={(item) => {
          const raw = (item as any)?._raw;
          const db = Number(item.key || 0);
          setSelectedVesselDbId(db || null);
          setSelectedVesselLabel(vesselLabel(raw));
          setSelectedVesselCode(vesselCode(raw));
          setVesselPickerOpen(false);
        }}
      />

      <FullScreenPickerModal
        visible={tripPickerOpen}
        title={t.chooseTrip}
        items={tripOptions as any}
        selectedKey={tripId}
        mode="list"
        leadingIcon="document-text-outline"
        showImages={false}
        searchPlaceholder="Search trip..."
        confirmLabel="Next"
        insetsBottom={insets.bottom}
        onClose={() => setTripPickerOpen(false)}
        onConfirm={(item) => {
          const raw = (item as any)?._raw;
          const key = String(item.key || "");
          setTripId(key);
          setTripLabelText(tripLabel(raw));
          setTripPickerOpen(false);
        }}
      />

      <FullScreenPickerModal
        visible={fishPickerOpen}
        title={t.chooseSpecies}
        items={fishOptions as any}
        selectedKey={
          fishPickGroupId ? String(groups.find((g) => g.id === fishPickGroupId)?.fishId || "") : ""
        }
        mode="grid"
        numColumns={2}
        showImages={true}
        searchPlaceholder="Search fish (e.g. tuna)"
        confirmLabel="Next"
        insetsBottom={insets.bottom}
        onClose={() => { setFishPickerOpen(false); setFishPickGroupId(null); }}
        onConfirm={(item) => {
          const gid = fishPickGroupId;
          if (!gid) return;
          const fid = Number(item.key || 0);
          const name = String(item.label || "");
          if (!fid || !name) return;
          setGroupFish(gid, fid, name);
          setFishPickerOpen(false);
          setFishPickGroupId(null);
        }}
      />

      {/* ── Offscreen Watermark Compositor ── */}
      {wmJob ? (
        <View style={{ position: "absolute", left: -10000, top: -10000 }}>
          <View
            ref={(r) => (wmViewRef.current = r)}
            collapsable={false}
            onLayout={() => setWmLayoutReady(true)}
            style={{ width: wmJob.outW, height: wmJob.outH, backgroundColor: "black" }}
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
                top: 14,
                right: 14,
                maxWidth: wmJob.outW * 0.78,
                paddingHorizontal: 12,
                paddingVertical: 10,
                backgroundColor: "rgba(0,0,0,0.60)",
                borderRadius: 14,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.15)",
              }}
            >
              {(wmJob.lines || []).map((ln, idx) => (
                <Text
                  key={`${idx}_${ln}`}
                  style={{
                    color: "white",
                    fontWeight: idx === 0 ? "900" : idx <= 2 ? "800" : "700",
                    fontSize:
                      idx === 0
                        ? Math.max(18, Math.round(wmJob.outW * 0.018))
                        : Math.max(14, Math.round(wmJob.outW * 0.014)),
                    textAlign: "right",
                  }}
                  numberOfLines={1}
                >
                  {ln}
                </Text>
              ))}
            </View>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
