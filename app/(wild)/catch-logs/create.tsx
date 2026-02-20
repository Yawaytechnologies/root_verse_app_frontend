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

  // ✅ FIX: backend wants snake_case numeric id
  vessel_id?: number;
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
    errGroupQrMissing: "ஒவ்வொரு group-க்கும் குறைந்தது 1 QR ஸ்கேன் செய்ய வேண்டும்",

    scanTitle: "QR ஸ்கேன்",
    scanHint: "Vessel + Trip தேர்வு செய்த பிறகு Fish group-க்கு QR scan செய்யலாம்",
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
    scanDisabledMsg: "முதலில் அனைத்து Offline data-வும் Sync ஆகணும் (Fully Synced).",
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

    // ✅ NEW UI strings
    lockedTitle: "Trip தேர்வு செய்யப்பட்டு வந்தது",
    lockedSub: "Trip List-ல இருந்து வந்ததால் Vessel/Trip மீண்டும் தேர்வு தேவையில்லை.",
    lockedChange: "Change",
    lockedLoading: "Trip/Vessel loading...",
    lockedMissing:
      "Trip details கிடைக்கல. (Offline cache இல்லை). Change அழுத்தி manual select பண்ணலாம்.",
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

    step1Hint: "Select Vessel + Approved Trip first. Then proceed to QR scanning.",
    step2Hint:
      "For each group: select Fish → scan QR → (optional photos) → DONE.",
    step3Hint: "Review and Save.",

    skipPhotos: "Skip photos and finish",
    optional: "Optional",

    // ✅ NEW UI strings
    lockedTitle: "Trip selected from My Trips",
    lockedSub:
      "Because you came from Trip List, you don't need to select Vessel/Trip again.",
    lockedChange: "Change",
    lockedLoading: "Loading Trip/Vessel...",
    lockedMissing:
      "Trip details not found (no offline cache). Tap Change to select manually.",
  },
};

/* ---------------- UI THEME (UPDATED) ---------------- */
const UI = {
  bg: "bg-[#f6f7fb]",
  card: "bg-white",
  border: "border-[#e6e8ef]",
  muted: "text-[#6b7280]",
  text: "text-[#111827]",
  subtext: "text-[#374151]",
  accent: "#0ea5e9", // primary
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
        shadowOpacity: 0.06,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 2,
      }}
    >
      {children}
    </View>
  );
}

function SectionTitle({
  title,
  right,
}: {
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className={`text-base font-extrabold ${UI.text}`} numberOfLines={1}>
        {title}
      </Text>
      {right ? <View>{right}</View> : null}
    </View>
  );
}

function Pill({
  icon,
  text,
  color,
  bg,
}: {
  icon?: any;
  text: string;
  color: string;
  bg: string;
}) {
  return (
    <View
      className="flex-row items-center rounded-full px-3 py-2"
      style={{ backgroundColor: bg }}
    >
      {icon ? <Ionicons name={icon} size={16} color={color} /> : null}
      <Text className="ml-2 text-xs font-extrabold" style={{ color }}>
        {text}
      </Text>
    </View>
  );
}

function BigSelect({
  label,
  value,
  placeholder,
  hint,
  onPress,
  disabled,
}: {
  label: string;
  value: string;
  placeholder: string;
  hint: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`rounded-2xl border ${UI.border} px-4 py-4 active:opacity-90`}
      style={{ backgroundColor: disabled ? "#f3f4f6" : "white" }}
    >
      <View className="flex-row items-center justify-between">
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text className={`text-xs font-bold ${UI.muted}`} numberOfLines={1}>
            {label}
          </Text>
          <Text
            className={`mt-2 text-lg font-extrabold ${
              value ? UI.text : "text-[#9ca3af]"
            }`}
            numberOfLines={2}
          >
            {value || placeholder}
          </Text>
          <Text className={`mt-2 text-xs ${UI.muted}`} numberOfLines={2}>
            {hint}
          </Text>
        </View>

        <View style={{ width: 12 }} />

        <Ionicons
          name="chevron-forward"
          size={22}
          color={disabled ? "#9ca3af" : "#111827"}
        />
      </View>
    </Pressable>
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
      style={{ backgroundColor: bg, opacity: disabled ? 0.8 : 1 }}
    >
      <View className="flex-row items-center justify-center">
        {icon ? <Ionicons name={icon} size={18} color="white" /> : null}
        <Text
          className={`text-center text-base font-extrabold text-white ${
            icon ? "ml-2" : ""
          }`}
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
        {icon ? <Ionicons name={icon} size={18} color="#111827" /> : null}
        <Text
          className={`text-center text-base font-extrabold ${UI.text} ${
            icon ? "ml-2" : ""
          }`}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

function StepDots({ step }: { step: number }) {
  return (
    <View className="flex-row items-center">
      {[1, 2, 3, 4].map((n) => {
        const active = n <= step;
        return (
          <View
            key={n}
            style={{
              width: n === step ? 24 : 10,
              height: 10,
              borderRadius: 999,
              marginRight: n === 4 ? 0 : 8,
              backgroundColor: active ? UI.accent : "#e5e7eb",
            }}
          />
        );
      })}
    </View>
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
  if (v.startsWith("RV-CRATE-") || v.startsWith("CRATE-") || v.startsWith("RV-BOX-"))
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
          if ((kl.includes("owner") && kl.includes("code") && vs) || /^OWN/i.test(vs)) {
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

/* ---- VESSEL FIELD MAPPING (UPDATED) ---- */
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

// still useful sometimes (trip prefill fallback etc.)
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

// ✅ UI shows GovtRegNo + Name (NOT rv_vessel_id)
function vesselLabel(v: Vessel): string {
  const reg = vesselGovtRegNo(v);
  const name = vesselName(v);
  const id = vesselDbId(v); // numeric db id

  const base = reg && name ? `${reg} • ${name}` : reg ? reg : name ? name : vesselCode(v);

  // ✅ show id also
  return id ? `${base}  (ID: ${id})` : base;
}

/* ---- TRIP FIELD MAPPING ---- */
function tripKey(tr: any): string {
  const key = String(tr?.trip_id || tr?.tripId || tr?.trip_code || tr?.id || "").trim();
  return key;
}
function tripLabel(tr: Trip): string {
  const code = String(tr?.trip_id || tr?.tripId || tr?.trip_code || tr?.tripCode || tr?.id || "").trim();
  const port = String(tr?.near_station || tr?.port || tr?.landing_port || tr?.landingPort || "").trim();
  const date =
    String(tr?.planned_at || tr?.trip_date || tr?.tripDate || tr?.created_at || "").trim() || "";
  return `${code}${port ? ` • ${port}` : ""}${date ? ` • ${date.substring(0, 10)}` : ""}`;
}

// ✅ trip -> vessel FK extractor (for route prefill)
function tripVesselDbId(tr: any): number | null {
  const n = Number(tr?.vessel_id ?? tr?.vesselId ?? tr?.vessel_fk ?? tr?.vesselFk ?? 0);
  return n > 0 ? n : null;
}
// ✅ some backends may include vessel code on trip
function tripVesselCode(tr: any): string {
  return String(
    tr?.rv_vessel_id ??
      tr?.rvVesselId ??
      tr?.vessel_code ??
      tr?.rv_vessel_code ??
      tr?.rvVesselCode ??
      "",
  ).trim();
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
    console.log("[FISH TYPES] JSON parse failed:", text?.slice(0, 250));
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
  const snapPoints = useMemo(() => ["50%", "85%"], []);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return options;
    return options.filter((x) => String(x.label || "").toLowerCase().includes(t));
  }, [q, options]);

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      backgroundStyle={{ borderRadius: 28 }}
      handleIndicatorStyle={{ opacity: 0.35 }}
    >
      <BottomSheetView style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
        <View className="flex-row items-center justify-between">
          <Text
            className={`text-lg font-extrabold ${UI.text}`}
            numberOfLines={1}
            style={{ flex: 1 }}
          >
            {title}
          </Text>
          <Pressable
            onPress={() => sheetRef.current?.dismiss()}
            className="rounded-full px-3 py-2 active:opacity-80"
          >
            <Text style={{ color: UI.accent }} className="text-base font-extrabold">
              Done
            </Text>
          </Pressable>
        </View>

        <View className={`mt-3 rounded-2xl border ${UI.border} bg-[#f3f4f6] px-3 py-2`}>
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
            const uri = showImage ? sanitizeImageUrl((item as any)?.imageUri) : "";

            return (
              <Pressable
                key={item.key}
                onPress={() => {
                  onSelect(item);
                  sheetRef.current?.dismiss();
                }}
                className={`mb-2 rounded-2xl border px-4 py-4 active:opacity-80 ${
                  active ? "border-[#bae6fd] bg-[#e0f2fe]" : `${UI.border} bg-white`
                }`}
              >
                <View className="flex-row items-center">
                  {showImage ? (
                    <>
                      {uri ? (
                        <Image
                          source={{ uri }}
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 16,
                            backgroundColor: "#111",
                            borderWidth: 1,
                            borderColor: "rgba(0,0,0,0.06)",
                          }}
                          resizeMode="cover"
                        />
                      ) : (
                        <View
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 16,
                            backgroundColor: "#f3f4f6",
                            borderWidth: 1,
                            borderColor: "#e5e7eb",
                          }}
                        />
                      )}
                      <View style={{ width: 12 }} />
                    </>
                  ) : null}

                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text className={`text-base font-extrabold ${UI.text}`} numberOfLines={2}>
                      {item.label}
                    </Text>
                    {showImage ? (
                      <Text className={`mt-1 text-xs ${UI.muted}`} numberOfLines={1}>
                        {uri ? "Image available" : "No image"}
                      </Text>
                    ) : null}
                  </View>

                  <Ionicons name="chevron-forward" size={22} color="#111827" />
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
  // ✅ accept params from Trip List (NOW supports tripJson/vesselLabel too)
  const params = useLocalSearchParams<{
    crateId?: string;
    tripId?: string; // trip_id / trip_code string
    tripDbId?: string; // numeric id (optional)
    vesselId?: string; // numeric vessel FK (optional)

    // ✅ BEST: pass the trip itself (stringified + encoded) from trips/index.tsx
    tripJson?: string;

    // optional helpers
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

  // ✅ route-prefill inputs (can come from params OR tripJson)
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

  // ✅ if came from trip list -> start directly at step 2
  const [step, setStep] = useState<1 | 2 | 3 | 4>(() => (hasRouteTrip ? 2 : 1));

  // ✅ lock selection if came from trip list (user no need to select again)
  const [lockTripSelection, setLockTripSelection] = useState<boolean>(() => hasRouteTrip);
  const [prefillLoading, setPrefillLoading] = useState<boolean>(() => hasRouteTrip);

  // ✅ NEW: resolved userId fallback (works after refresh offline)
  const [resolvedUserId, setResolvedUserId] = useState<number | null>(null);

  // Owner DB id + code
  const [ownerId, setOwnerId] = useState<number | null>(null);
  const [ownerCode, setOwnerCode] = useState<string>(() => normalizeOwnerCode(pOwnerCode) || "");
  const [ownerLoading, setOwnerLoading] = useState(false);

  // Vessels
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [vesselLoading, setVesselLoading] = useState(false);

  // ✅ selected numeric vessel id (payload uses this)
  const [selectedVesselDbId, setSelectedVesselDbId] = useState<number | null>(() =>
    routeVesselDbId > 0 ? routeVesselDbId : null,
  );

  // ✅ UI shows GovtRegNo + Name (from vesselLabel)
  const [selectedVesselLabel, setSelectedVesselLabel] = useState<string>(() =>
    hasRouteTrip ? initialVesselLabelPrefill : "",
  );

  // kept only as fallback (trip prefill can bring a code)
  const [selectedVesselCode, setSelectedVesselCode] = useState<string>(() =>
    hasRouteTrip ? initialVesselCodePrefill : "",
  );

  // Trips (approved)
  const [trips, setTrips] = useState<Trip[]>([]);
  const [tripLoading, setTripLoading] = useState(false);

  // ✅ if trip list passed tripId, set it immediately (no manual select)
  const [tripId, setTripId] = useState<string>(() => {
    if (!hasRouteTrip) return "";
    if (routeTripParam) return routeTripParam;
    if (routeTripDbId > 0) return String(routeTripDbId);
    return "";
  });

  const [tripLabelText, setTripLabelText] = useState<string>(() =>
    hasRouteTrip ? initialTripLabelPrefill : "",
  );

  // Fish types list (for picker)
  const [fishTypes, setFishTypes] = useState<FishType[]>([]);
  const [fishLoading, setFishLoading] = useState(false);

  // ✅ Fish groups
  const initGroupRef = useRef<FishGroup | null>(null);
  if (!initGroupRef.current) initGroupRef.current = createFishGroup(initialQr);

  const [groups, setGroups] = useState<FishGroup[]>(() => [initGroupRef.current!]);
  const [activeGroupId, setActiveGroupId] = useState<string>(() => initGroupRef.current!.id);

  // Network + queue
  const globalNetworkState = useAppSelector((s: any) => s.network?.isOnline ?? true);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const flushingRef = useRef(false);

  // Camera permissions
  const [cameraPerm, requestCameraPerm] = useCameraPermissions();

  // Torch (QR scan)
  const [torchWanted, setTorchWanted] = useState(true);
  const [torchArmed, setTorchArmed] = useState(false);

  // Torch (Photo camera)
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

  // ✅ Photo preview modal
  const [imgPreviewUri, setImgPreviewUri] = useState<string | null>(null);

  // ✅ Watermark compositor (offscreen)
  const wmViewRef = useRef<View | null>(null);
  const wmResolveRef = useRef<((uri: string) => void) | null>(null);
  const wmRejectRef = useRef<((e: any) => void) | null>(null);
  const [wmJob, setWmJob] = useState<WatermarkJob | null>(null);
  const [wmImgLoaded, setWmImgLoaded] = useState(false);

  // ✅ prevent “vessel change reset” when we set vessel programmatically from route-trip
  const skipVesselResetRef = useRef(false);

  const watermarkAsync = (srcUri: string, w: number, h: number, line1: string, line2: string) => {
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

  // Torch workaround (Photo)
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

      const oc = normalizeOwnerCode(String(ocDirect || ocDeep || ocFallback || ""));

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
    const url = `${API_BASE}/api/trip/owner/${encodeURIComponent(owner_code)}/status/${encodeURIComponent(status)}`;

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
          const s = String(x?.approval_status ?? x?.approvalStatus ?? "").toLowerCase();
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
      // NOTE: keep reset behavior as-is for normal flow
      // In route-locked flow, we prefill below.
      if (!lockTripSelection) {
        setTripId("");
        setTripLabelText("");
      }

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
  }, [isOnline, resolvedUserId, ownerCode, lockTripSelection]);

  /* ---------------- ✅ Route Prefill: set Trip + Vessel automatically ---------------- */
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
      if (!lockTripSelection) {
        if (alive) setPrefillLoading(false);
        return;
      }

      // already ready? (only needs trip + vesselId now)
      if (tripId && selectedVesselDbId) {
        if (alive) setPrefillLoading(false);
        return;
      }

      if (alive) setPrefillLoading(true);

      // Always set trip fields immediately (from param/tripJson)
      if (!tripId) {
        if (routeTripParam) setTripId(routeTripParam);
        else if (routeTripDbId > 0) setTripId(String(routeTripDbId));
      }
      if (!tripLabelText) setTripLabelText(initialTripLabelPrefill || routeTripParam || "");

      // 0) if tripJson passed -> use it directly (THIS FIXES "not approved" trips too)
      let tr: any | null = tripObjFromParam || null;

      // 1) try from current trips list
      if (!tr) tr = pickTripFrom(trips);

      // 2) try from cache (owner code)
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

      // 3) online fallback: if numeric id known, fetch /api/trip/:id
      if (!tr && globalNetworkState) {
        const numericId =
          routeTripDbId > 0
            ? routeTripDbId
            : /^\d+$/.test(String(routeTripParam || "").trim())
              ? Number(String(routeTripParam || "").trim())
              : 0;

        if (numericId > 0) {
          try {
            const headers = await authHeaders();
            const res = await fetch(`${API_BASE}/api/trip/${encodeURIComponent(String(numericId))}`, {
              method: "GET",
              headers,
            });
            const text = await res.text();
            let json: any = null;
            try {
              json = text ? JSON.parse(text) : null;
            } catch {}
            if (res.ok) {
              let src: any = json?.data ?? json;
              if (Array.isArray(src)) src = src[0];
              if (src && typeof src === "object") tr = src;
            }
          } catch {}
        }
      }

      if (!alive) return;

      // Apply trip fields
      if (tr) {
        const k = tripKey(tr);
        if (k) setTripId(k);
        setTripLabelText(tripLabel(tr));
      } else {
        // no trip found -> keep param label/id
        setTripLabelText(initialTripLabelPrefill || routeTripParam || "");
      }

      // Decide vessel id/code
      const vDb =
        (routeVesselDbId > 0 ? routeVesselDbId : null) ?? (tr ? tripVesselDbId(tr) : null);

      const vCodeFromTrip = tr ? tripVesselCode(tr) : initialVesselCodePrefill;

      if (vDb && vDb > 0) {
        const foundV = vessels.find((v: any) => vesselDbId(v) === vDb) || null;

        skipVesselResetRef.current = true;
        setSelectedVesselDbId(vDb);

        if (foundV) {
          setSelectedVesselCode(vesselCode(foundV));
          setSelectedVesselLabel(vesselLabel(foundV)); // ✅ reg+name
        } else {
          // fallback until vessels load
          setSelectedVesselCode(vCodeFromTrip || "");
          setSelectedVesselLabel(initialVesselLabelPrefill || vCodeFromTrip || `Vessel (ID: ${vDb})`);
        }
      } else if (!selectedVesselDbId) {
        // no vessel id => just show label/code from params/tripJson (but scanning will require id)
        if (initialVesselLabelPrefill) setSelectedVesselLabel(initialVesselLabelPrefill);
        if (vCodeFromTrip && !selectedVesselCode) setSelectedVesselCode(vCodeFromTrip);
      }

      if (alive) setPrefillLoading(false);
    };

    run();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    lockTripSelection,
    routeTripParam,
    routeTripDbId,
    routeVesselDbId,
    trips,
    vessels,
    globalNetworkState,
    resolvedUserId,
    ownerCode,
    tripId,
    tripLabelText,
    selectedVesselDbId,
    selectedVesselCode,
  ]);

  // ✅ when vessels arrive, always refresh label to GovtRegNo + Name
  useEffect(() => {
    if (!selectedVesselDbId) return;
    if (!vessels?.length) return;

    const foundV = vessels.find((v: any) => vesselDbId(v) === selectedVesselDbId) || null;
    if (!foundV) return;

    setSelectedVesselCode(vesselCode(foundV));
    setSelectedVesselLabel(vesselLabel(foundV)); // ✅ reg+name
  }, [selectedVesselDbId, vessels]);

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

  /* ---------------- pickers options ---------------- */
  const vesselOptions = useMemo(() => {
    return vessels
      .map((v) => {
        const db = vesselDbId(v);
        if (!db) return null;
        return { key: String(db), label: vesselLabel(v), _raw: v } as any; // ✅ label reg+name
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
    // ✅ IMPORTANT: do NOT reset trip/group when vessel is set programmatically from trip-route
    if (skipVesselResetRef.current) {
      skipVesselResetRef.current = false;
      return;
    }
    // ✅ in locked mode, user is not selecting vessel manually -> don't reset trip
    if (lockTripSelection) return;

    setTripId("");
    setTripLabelText("");

    const fresh = createFishGroup(initialQr);
    initGroupRef.current = fresh;
    setGroups([fresh]);
    setActiveGroupId(fresh.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVesselDbId, lockTripSelection]);

  /* ---------------- Group derived helpers ---------------- */
  const activeGroup = useMemo(() => groups.find((g) => g.id === activeGroupId) || null, [
    groups,
    activeGroupId,
  ]);

  const totalQrCount = useMemo(() => groups.reduce((sum, g) => sum + (g.scanned?.length || 0), 0), [
    groups,
  ]);

  // ✅ images NOT mandatory now
  const allGroupsDone = useMemo(() => {
    if (!groups || groups.length === 0) return false;
    return groups.every((g) => g.phase === "DONE" && !!g.fishId && (g.scanned?.length || 0) > 0);
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
    setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, scanned: [], phase: "SCAN" } : g)));
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

  const validateStep2 = () => {
    if (!validateStep1()) return false;
    if (!groups || groups.length === 0) return (Alert.alert(t.required, t.errNeedFishGroup), false);

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

  const nowPreview = useMemo(() => new Date(), [step, totalQrCount, tripId, selectedVesselDbId]);

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

      // ✅ Build watermark text
      const line1 = `Date/Time: ${fmtDateTime(now)}`;
      const line2 = locText(liveLoc);

      // ✅ Decide output size
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

    // ✅ payload needs numeric vessel_id
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

      // ✅ FIX: send snake_case numeric id (NOT string, NOT vesselId)
      vesselId: selectedVesselDbId,
      vessel_id: selectedVesselDbId,

      // ✅ optional but safe (if backend still accepts code)
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
      for (const q of g.scanned) {
        payloads.push({
          ...baseCommon,
          fishId: g.fishId!,
          fishName: g.fishName || undefined,
          linkedCrateId: q.id,
          qrKind: q.kind,
          images: g.images || [],
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

          Alert.alert(t.saved, `${t.offlineSaved}\n\nUploaded: ${ok}\nQueued (offline): ${queued}`);

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

    // ✅ if trip came from list, DO NOT reset vessel/trip; fisherman should continue directly
    if (lockTripSelection) {
      setStep(2);
      return;
    }

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

    // ✅ if locked trip and user presses back from step 2 -> go back to trips list
    if (step === 2 && lockTripSelection) {
      router.back();
      return;
    }

    setStep((s) => (s === 2 ? 1 : s === 3 ? 2 : 3));
  };

  const phaseLabel = (p: GroupPhase) => (p === "SCAN" ? t.phaseScan : p === "PHOTO" ? t.phasePhoto : t.phaseDone);

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
        <View className="flex-1 bg-black/90 justify-center px-3">
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
                className="rounded-full px-4 py-2 active:opacity-80"
                style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
              >
                <Text className="text-white font-extrabold">{t.close}</Text>
              </Pressable>
            </View>

            <View style={{ height: 520, backgroundColor: "black" }}>
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
                className={`rounded-full border ${UI.border} bg-[#f3f4f6] px-4 py-2 active:opacity-80`}
              >
                <Text className={`text-sm font-extrabold ${UI.text}`} numberOfLines={1}>
                  {t.close}
                </Text>
              </Pressable>
            </View>

            <View className={`mt-3 overflow-hidden rounded-2xl border ${UI.border} bg-black`}>
              {!cameraPerm?.granted ? (
                <View className="p-4">
                  <Text className="text-white text-base font-semibold">{t.camDenied}</Text>
                  <PrimaryBtn label={t.grantCam} onPress={requestCameraPerm} />
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

            <Text className={`mt-3 text-xs ${UI.muted}`} style={{ flexShrink: 1 }}>
              Scan is enabled only after Fully Synced (read-only dynamic data view).
            </Text>
          </View>
        </View>
      </Modal>

      {/* ✅ Photo Camera Modal (GROUP photos) */}
      <Modal visible={photoCamOpen} transparent animationType="fade" onRequestClose={closePhotoCamera}>
        <View className="flex-1 bg-black/70 justify-center px-3">
          <View className="bg-white rounded-3xl p-4">
            <View className="flex-row items-center justify-between">
              <Text
                className={`text-lg font-extrabold ${UI.text}`}
                numberOfLines={1}
                style={{ flex: 1 }}
              >
                {t.photoCamTitle}
              </Text>

              <Pressable
                onPress={() => setPhotoTorchWanted((p) => !p)}
                className={`mr-2 rounded-full border ${UI.border} bg-[#f3f4f6] px-3 py-2 active:opacity-80`}
              >
                <Text className={`text-xs font-extrabold ${UI.text}`}>
                  {t.torch}: {photoTorchWanted ? t.torchOn : t.torchOff}
                </Text>
              </Pressable>

              <Pressable
                onPress={closePhotoCamera}
                className={`rounded-full border ${UI.border} bg-[#f3f4f6] px-3 py-2 active:opacity-80`}
              >
                <Text className={`text-sm font-extrabold ${UI.text}`} numberOfLines={1}>
                  {t.cancel}
                </Text>
              </Pressable>
            </View>

            <View className={`mt-3 overflow-hidden rounded-2xl border ${UI.border} bg-black`}>
              {!cameraPerm?.granted ? (
                <View className="p-4">
                  <Text className="text-white text-base font-semibold">{t.camDenied}</Text>
                  <PrimaryBtn label={t.grantCam} onPress={requestCameraPerm} />
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
              />
              <Text className={`mt-2 text-xs ${UI.muted}`}>{t.max2}</Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* ---------------- HEADER (UPDATED) ---------------- */}
      <View className="px-4 pt-2 pb-3">
        <Card className="px-4 py-4">
          <View className="flex-row items-start justify-between">
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text className={`text-xl font-extrabold ${UI.text}`} numberOfLines={1}>
                {t.title}
              </Text>

              <View className="mt-2 flex-row items-center justify-between">
                <StepDots step={step} />

                <View className="flex-row items-center">
                  <Pill
                    icon={syncIcon as any}
                    text={syncText}
                    color={syncColor}
                    bg={syncState === "SYNCED" ? "#ecfdf5" : syncState === "SYNCING" ? "#e0f2fe" : "#fffbeb"}
                  />
                  <View style={{ width: 10 }} />
                  <Pill
                    icon={isOnline ? "wifi-outline" : "cloud-offline-outline"}
                    text={isOnline ? "Online" : "Offline"}
                    color={isOnline ? UI.success : UI.warn}
                    bg={isOnline ? "#ecfdf5" : "#fffbeb"}
                  />
                </View>
              </View>

              <Text className={`mt-2 text-xs ${UI.muted}`} numberOfLines={1}>
                {t.pending}: {pendingCount}
              </Text>
            </View>

            <View style={{ width: 12 }} />

            <Pressable
              onPress={() => setLang((p) => (p === "ta" ? "en" : "ta"))}
              className={`rounded-full border ${UI.border} bg-white px-4 py-2 active:opacity-80`}
            >
              <Text className={`text-sm font-extrabold ${UI.text}`}>{t.langBtn}</Text>
            </Pressable>
          </View>

          <View className="mt-3 flex-row items-center justify-between">
            <Pressable
              onPress={() => setTorchWanted((p) => !p)}
              className={`rounded-full border ${UI.border} bg-white px-4 py-2 active:opacity-80`}
            >
              <View className="flex-row items-center">
                <Ionicons name="flashlight-outline" size={16} color="#111827" />
                <Text className={`ml-2 text-xs font-extrabold ${UI.text}`}>
                  {t.torch}: {torchWanted ? t.torchOn : t.torchOff}
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={openFishScan}
              className="rounded-full px-5 py-2 active:opacity-80"
              style={{ backgroundColor: scanFishEnabled ? UI.accent : "#cbd5e1" }}
            >
              <Text className="text-white font-extrabold text-sm">{t.scanBtn}</Text>
            </Pressable>

            <Pressable
              onPress={clearAll}
              className={`rounded-full border ${UI.border} bg-white px-4 py-2 active:opacity-80`}
            >
              <View className="flex-row items-center">
                <Ionicons name="refresh-outline" size={16} color="#111827" />
                <Text className={`ml-2 text-xs font-extrabold ${UI.text}`}>{t.clearAll}</Text>
              </View>
            </Pressable>
          </View>
        </Card>
      </View>

      {/* ---------------- CONTENT (UPDATED) ---------------- */}
      <ScrollView
        className="px-4"
        contentContainerStyle={{ paddingBottom: 18 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* STEP 1 */}
        {step === 1 ? (
          <View>
            <Card className="p-4">
              <Text className={`text-sm ${UI.muted}`}>{t.step1Hint}</Text>

              <View className="mt-4">
                <BigSelect
                  label={t.vessel}
                  value={selectedVesselLabel}
                  placeholder={t.chooseVessel}
                  hint={
                    vesselLoading ? t.loadingVessel : vessels.length ? `${vessels.length} vessels` : t.noVessels
                  }
                  onPress={() => vesselRef.current?.present()}
                />

                <View style={{ height: 12 }} />

                <BigSelect
                  label={t.trip}
                  value={tripLabelText}
                  placeholder={t.chooseTrip}
                  hint={tripLoading ? t.loadingTrips : trips.length ? `${trips.length} trips` : t.noTrips}
                  onPress={() => tripRef.current?.present()}
                  disabled={!selectedVesselDbId && !lockTripSelection}
                />

                <View className="mt-4 rounded-2xl border border-[#e5e7eb] bg-[#f9fafb] px-4 py-3">
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
            {/* ✅ Locked Trip/Vessel summary */}
            {lockTripSelection ? (
              <Card className="p-4 mb-3">
                <View className="flex-row items-center justify-between">
                  <Text className={`text-sm font-extrabold ${UI.text}`} numberOfLines={1} style={{ flex: 1 }}>
                    {t.lockedTitle}
                  </Text>

                  <Pressable
                    onPress={() => {
                      setLockTripSelection(false);
                      setStep(1);
                    }}
                    className="rounded-full px-4 py-2 active:opacity-80"
                    style={{ backgroundColor: "#e0f2fe" }}
                  >
                    <Text className="text-xs font-extrabold" style={{ color: "#075985" }}>
                      {t.lockedChange}
                    </Text>
                  </Pressable>
                </View>

                <Text className={`mt-2 text-xs ${UI.muted}`}>{t.lockedSub}</Text>

                <View className="mt-4 rounded-2xl border border-[#e5e7eb] bg-[#f9fafb] px-4 py-3">
                  <View className="flex-row items-center">
                    <Ionicons name="boat-outline" size={16} color="#111827" />
                    <Text className={`ml-2 text-xs font-bold ${UI.muted}`}>Vessel</Text>
                  </View>
                  <Text className={`mt-1 text-base font-extrabold ${UI.text}`} numberOfLines={2}>
                    {selectedVesselLabel || (prefillLoading ? t.lockedLoading : "—")}
                  </Text>

                  <View style={{ height: 10 }} />

                  <View className="flex-row items-center">
                    <Ionicons name="document-text-outline" size={16} color="#111827" />
                    <Text className={`ml-2 text-xs font-bold ${UI.muted}`}>Trip</Text>
                  </View>
                  <Text className={`mt-1 text-base font-extrabold ${UI.text}`} numberOfLines={2}>
                    {tripLabelText || routeTripParam || (prefillLoading ? t.lockedLoading : "—")}
                  </Text>

                  {!selectedVesselDbId || !tripId ? (
                    <Text className="mt-3 text-xs font-extrabold" style={{ color: UI.warn }}>
                      {prefillLoading ? t.lockedLoading : t.lockedMissing}
                    </Text>
                  ) : null}
                </View>
              </Card>
            ) : null}

            <Card className="p-4">
              <SectionTitle
                title={t.fishGroupsTitle}
                right={
                  <Pressable
                    onPress={addGroup}
                    className="rounded-full px-4 py-2 active:opacity-80"
                    style={{ backgroundColor: UI.accent }}
                  >
                    <Text className="text-white font-extrabold">{t.addFish}</Text>
                  </Pressable>
                }
              />

              <Text className={`mt-2 text-xs ${UI.muted}`}>{t.step2Hint}</Text>

              {/* Groups list (vertical - easier) */}
              <View className="mt-3">
                {groups.map((g, idx) => {
                  const active = g.id === activeGroupId;
                  const fish = g.fishName || `${t.group} ${idx + 1}`;
                  const qrN = g.scanned?.length || 0;
                  const imgN = g.images?.length || 0;
                  const phase = phaseLabel(g.phase);

                  return (
                    <Pressable
                      key={g.id}
                      onPress={() => setActiveGroupId(g.id)}
                      className={`mb-2 rounded-2xl border px-4 py-4 active:opacity-90 ${
                        active ? "border-[#bae6fd] bg-[#e0f2fe]" : `${UI.border} bg-white`
                      }`}
                    >
                      <View className="flex-row items-center justify-between">
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text className={`text-base font-extrabold ${UI.text}`} numberOfLines={1}>
                            {idx + 1}. {fish}
                          </Text>
                          <Text className={`mt-1 text-xs ${UI.muted}`} numberOfLines={1}>
                            {t.groupQrCount(qrN)} • {phase} • Img: {imgN} ({t.optional})
                          </Text>
                        </View>

                        <View className="flex-row items-center">
                          {active ? (
                            <View
                              className="rounded-full px-3 py-2"
                              style={{
                                backgroundColor:
                                  g.phase === "DONE" ? "#ecfdf5" : g.phase === "PHOTO" ? "#e0f2fe" : "#fffbeb",
                              }}
                            >
                              <Text
                                className="text-xs font-extrabold"
                                style={{
                                  color: g.phase === "DONE" ? UI.success : g.phase === "PHOTO" ? UI.accent : UI.warn,
                                }}
                              >
                                {phase}
                              </Text>
                            </View>
                          ) : (
                            <Ionicons name="chevron-forward" size={22} color="#111827" />
                          )}
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              <View className="mt-2 flex-row items-center justify-between">
                <Text className={`text-xs ${UI.muted}`}>{t.totalQr(totalQrCount)}</Text>
                <Pill
                  icon="location-outline"
                  text={locLoading ? "Location: loading..." : locError ? "Location: error" : "Location: ok"}
                  color={locError ? UI.warn : UI.success}
                  bg={locError ? "#fffbeb" : "#ecfdf5"}
                />
              </View>

              {/* Active group */}
              {!activeGroup ? (
                <Text className={`mt-3 text-sm ${UI.muted}`}>{t.selectGroupToScan}</Text>
              ) : (
                <View className="mt-4">
                  {/* Active group header actions */}
                  <View className="flex-row items-center justify-between">
                    <Pressable
                      onPress={() => openFishPickerForGroup(activeGroup.id)}
                      className={`flex-1 rounded-2xl border ${UI.border} bg-[#f9fafb] px-4 py-4 active:opacity-90`}
                    >
                      <Text className={`text-xs font-bold ${UI.muted}`}>{t.selectFish}</Text>
                      <Text className={`mt-2 text-base font-extrabold ${UI.text}`} numberOfLines={1}>
                        {activeGroup.fishName || t.chooseSpecies}
                      </Text>
                    </Pressable>

                    <View style={{ width: 10 }} />

                    <Pressable
                      onPress={() => removeGroup(activeGroup.id)}
                      className="rounded-2xl px-4 py-4 active:opacity-80"
                      style={{ backgroundColor: "#fee2e2" }}
                    >
                      <Ionicons name="trash-outline" size={20} color="#991b1b" />
                    </Pressable>
                  </View>

                  {/* SCAN stage */}
                  {activeGroup.phase === "SCAN" ? (
                    <View className="mt-4">
                      <Text className={`text-xs ${UI.muted}`}>{t.scanHint}</Text>

                      <View className={`mt-3 overflow-hidden rounded-2xl border ${UI.border} bg-black`}>
                        {!cameraPerm?.granted ? (
                          <View className="p-4">
                            <Text className="text-white text-base font-semibold">{t.camDenied}</Text>
                            <View className="mt-3">
                              <PrimaryBtn label={t.grantCam} onPress={requestCameraPerm} />
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

                      <View className="mt-3 flex-row items-center">
                        <GhostBtn label={t.clearAll} onPress={() => clearGroupQrs(activeGroup.id)} icon="trash-outline" />
                        <View style={{ width: 10 }} />
                        <View style={{ flex: 1 }}>
                          <PrimaryBtn
                            label={t.doneScanning}
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
                            icon="checkmark-circle-outline"
                          />
                        </View>
                      </View>

                      {/* scanned list */}
                      <View className="mt-4">
                        <Text className={`text-sm font-extrabold ${UI.text}`}>
                          {t.scannedList} • {t.scanCount(activeGroup.scanned?.length || 0)}
                        </Text>

                        {(activeGroup.scanned || []).map((q) => (
                          <View key={q.id} className={`mt-2 rounded-2xl border ${UI.border} bg-white px-4 py-3`}>
                            <View className="flex-row items-center justify-between">
                              <View style={{ flex: 1, minWidth: 0 }}>
                                <Text className={`text-sm font-extrabold ${UI.text}`} numberOfLines={1}>
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
                                <Ionicons name="close-circle-outline" size={22} color="#9a3412" />
                              </Pressable>
                            </View>
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : null}

                  {/* PHOTO stage */}
                  {activeGroup.phase === "PHOTO" ? (
                    <View className="mt-4">
                      <Text className={`text-sm font-extrabold ${UI.text}`}>{t.photosStageTitle}</Text>
                      <Text className={`mt-1 text-xs ${UI.muted}`}>{t.autoHint}</Text>

                      <View className="mt-3 flex-row items-center">
                        <GhostBtn label={t.scanMore} onPress={() => backToScanStage(activeGroup.id)} icon="arrow-back-outline" />
                        <View style={{ width: 10 }} />
                        <View style={{ flex: 1 }}>
                          <PrimaryBtn label={t.capturePhoto} onPress={() => openPhotoCamera(activeGroup.id)} icon="camera-outline" />
                        </View>
                      </View>

                      <View className="mt-3">
                        {(activeGroup.images?.length || 0) > 0 ? (
                          <View className="flex-row">
                            {(activeGroup.images || []).map((u) => (
                              <View key={u} style={{ flex: 1 }}>
                                <View className={`mr-2 overflow-hidden rounded-2xl border ${UI.border} bg-white`}>
                                  <Pressable onPress={() => setImgPreviewUri(u)} className="active:opacity-95">
                                    <Image source={{ uri: u }} style={{ width: "100%", height: 160 }} resizeMode="cover" />
                                  </Pressable>
                                  <Pressable
                                    onPress={() => removeImageFromGroup(activeGroup.id, u)}
                                    className="px-3 py-3 active:opacity-80"
                                    style={{ backgroundColor: "#fff1f2" }}
                                  >
                                    <Text className="text-center text-xs font-extrabold" style={{ color: "#be123c" }}>
                                      {t.remove}
                                    </Text>
                                  </Pressable>
                                </View>
                              </View>
                            ))}
                            {(activeGroup.images?.length || 0) === 1 ? <View style={{ flex: 1 }} /> : null}
                          </View>
                        ) : (
                          <View className="mt-2 rounded-2xl border border-[#e5e7eb] bg-[#f9fafb] px-4 py-4">
                            <Text className={`text-xs ${UI.muted}`}>
                              {lang === "ta" ? "Photo optional. இல்லாமல் கூட DONE செய்யலாம்." : "Photo optional. You can finish without photos."}
                            </Text>
                          </View>
                        )}
                      </View>

                      <View className="mt-4">
                        <PrimaryBtn
                          label={(activeGroup.images?.length || 0) > 0 ? t.finishFish : t.skipPhotos}
                          onPress={() => finishFishGroup(activeGroup.id)}
                          icon="checkmark-outline"
                          color={UI.success}
                        />
                      </View>
                    </View>
                  ) : null}

                  {/* DONE stage */}
                  {activeGroup.phase === "DONE" ? (
                    <View className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                      <Text className="text-emerald-900 font-extrabold text-base">
                        {lang === "ta" ? "இந்த Fish முடிந்தது ✅" : "This fish is done ✅"}
                      </Text>
                      <Text className="mt-1 text-xs text-emerald-800">
                        {lang === "ta"
                          ? "மேலே உள்ள group list-ல அடுத்ததை தேர்வு செய்யுங்கள் அல்லது Add Fish பண்ணுங்கள்."
                          : "Select next group above or tap Add Fish."}
                      </Text>
                    </View>
                  ) : null}
                </View>
              )}
            </Card>

            {/* Date/Time + Location card */}
            <View className="mt-3">
              <Card className="p-4">
                <SectionTitle title={t.dateTime} />
                <Text className={`mt-1 text-xs ${UI.muted}`}>{t.autoHint}</Text>

                <View className="mt-3 flex-row items-center justify-between">
                  <Pill icon="calendar-outline" text={`${t.date}: ${fmtDate(nowPreview)}`} color="#111827" bg="#f3f4f6" />
                  <Pill icon="time-outline" text={`${t.time}: ${fmtTime(nowPreview)}`} color="#111827" bg="#f3f4f6" />
                </View>

                <View className="mt-3 rounded-2xl border border-[#e5e7eb] bg-[#f9fafb] px-4 py-3">
                  <Text className={`text-xs ${UI.muted}`}>
                    {locLoading ? "Location: loading..." : locError ? locError : locText(liveLoc)}
                  </Text>
                </View>
              </Card>
            </View>
          </View>
        ) : null}

        {/* STEP 3 */}
        {step === 3 ? (
          <View>
            <Card className="p-4">
              <Text className={`text-sm ${UI.muted}`}>{t.step3Hint}</Text>

              <View className="mt-4 rounded-2xl border border-[#e5e7eb] bg-[#f9fafb] px-4 py-4">
                <View className="flex-row items-center">
                  <Ionicons name="boat-outline" size={16} color="#111827" />
                  <Text className={`ml-2 text-xs font-bold ${UI.muted}`}>{t.vessel}</Text>
                </View>
                <Text className={`mt-1 text-base font-extrabold ${UI.text}`} numberOfLines={2}>
                  {selectedVesselLabel || "—"}
                </Text>

                <View style={{ height: 10 }} />

                <View className="flex-row items-center">
                  <Ionicons name="document-text-outline" size={16} color="#111827" />
                  <Text className={`ml-2 text-xs font-bold ${UI.muted}`}>{t.trip}</Text>
                </View>
                <Text className={`mt-1 text-base font-extrabold ${UI.text}`} numberOfLines={2}>
                  {tripLabelText || "—"}
                </Text>

                <View style={{ height: 10 }} />

                <View className="flex-row items-center">
                  <Ionicons name="qr-code-outline" size={16} color="#111827" />
                  <Text className={`ml-2 text-xs font-bold ${UI.muted}`}>{t.totalQr(totalQrCount)}</Text>
                </View>
              </View>

              <View className="mt-4">
                {groups.map((g, idx) => (
                  <View key={g.id} className={`mb-2 rounded-2xl border ${UI.border} bg-white px-4 py-4`}>
                    <Text className={`text-sm font-extrabold ${UI.text}`} numberOfLines={1}>
                      {idx + 1}. {g.fishName || "—"}
                    </Text>
                    <Text className={`mt-1 text-xs ${UI.muted}`}>
                      QR: {g.scanned?.length || 0} • Photos: {g.images?.length || 0} ({t.optional}) • {phaseLabel(g.phase)}
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

              <View className="mt-4">
                <PrimaryBtn
                  label={posting ? (lang === "ta" ? "சேமிக்கிறது..." : "Saving...") : t.save}
                  onPress={save}
                  disabled={posting}
                  icon="cloud-upload-outline"
                />
              </View>
            </Card>
          </View>
        ) : null}
      </ScrollView>

      {/* ---------------- FOOTER NAV (UPDATED) ---------------- */}
      <View className="px-4 pb-4">
        <Card className="p-3">
          <View className="flex-row items-center">
            <View style={{ flex: 1 }}>
              <GhostBtn label={t.back} onPress={goBack} disabled={step === 1} icon="arrow-back-outline" />
            </View>

            <View style={{ width: 10 }} />

            {step < 4 ? (
              <View style={{ flex: 1.4 }}>
                <PrimaryBtn
                  label={t.next}
                  onPress={goNext}
                  disabled={step === 2 && !allGroupsDone}
                  icon="arrow-forward-outline"
                  color={step === 2 ? (allGroupsDone ? UI.accent : "#cbd5e1") : UI.accent}
                />
              </View>
            ) : null}
          </View>
        </Card>
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

          setSelectedVesselDbId(db || null);
          setSelectedVesselLabel(vesselLabel(raw)); // ✅ reg+name
          setSelectedVesselCode(vesselCode(raw)); // optional fallback
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
        valueKey={fishPickGroupId ? String(groups.find((g) => g.id === fishPickGroupId)?.fishId || "") : ""}
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

      {/* ✅ OFFSCREEN WATERMARK VIEW */}
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
