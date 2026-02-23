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
  images: string[];
};

type WatermarkJob = {
  srcUri: string;
  outW: number;
  outH: number;
  lines: string[]; // ✅ brand + ownerId + vessel + datetime + location
};

/* ---------------- CACHE KEYS ---------------- */
const FISH_CACHE_KEY = "rv_fish_types_cache_v1";
const OWNER_DBID_CACHE_PREFIX = "rv_owner_db_id_cache_user_"; // + userId
const OWNER_CODE_CACHE_PREFIX = "rv_owner_code_cache_user_"; // + userId

const CAMERA_SESSION_KEY = "rv_camera_session_v1";
const TOKEN_KEY = "auth_token";

const VESSEL_CACHE_PREFIX = "rv_vessels_cache_owner_"; // + ownerDbId
const TRIP_CACHE_PREFIX = "rv_approved_trips_cache_owner_"; // + ownerCode

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

    scanBtn: "Fish Tag Scan",
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

    scanBtn: "Fish Tag Scan",
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

    lockedTitle: "Trip selected from My Trips",
    lockedSub:
      "Because you came from Trip List, you don't need to select Vessel/Trip again.",
    lockedChange: "Change",
    lockedLoading: "Loading Trip/Vessel...",
    lockedMissing:
      "Trip details not found (no offline cache). Tap Change to select manually.",
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
      <Text
        className="ml-2 text-xs font-extrabold"
        style={{ color }}
        numberOfLines={1}
      >
        {text}
      </Text>
    </View>
  );
}

function ActionTile({
  icon,
  title,
  subtitle,
  onPress,
  disabled,
  bg,
  fg,
  borderColor,
}: {
  icon: any;
  title: string;
  subtitle?: string;
  onPress: () => void;
  disabled?: boolean;
  bg: string;
  fg: string;
  borderColor: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className="rounded-2xl border px-4 py-4 active:opacity-90"
      style={{
        backgroundColor: bg,
        borderColor,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <View className="flex-row items-center">
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 16,
            backgroundColor: "rgba(255,255,255,0.25)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={icon} size={22} color={fg} />
        </View>
        <View style={{ flex: 1, minWidth: 0, marginLeft: 12 }}>
          <Text
            className="text-base font-extrabold"
            style={{ color: fg }}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              className="mt-1 text-xs font-bold"
              style={{ color: fg, opacity: 0.9 }}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
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
            adjustsFontSizeToFit
            minimumFontScale={0.85}
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
      style={{ backgroundColor: bg, opacity: disabled ? 0.85 : 1 }}
    >
      <View className="flex-row items-center justify-center">
        {icon ? <Ionicons name={icon} size={18} color="white" /> : null}
        <Text
          className={`text-center text-base font-extrabold text-white ${
            icon ? "ml-2" : ""
          }`}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
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
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
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
              width: n === step ? 28 : 10,
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
  return String(
    v?.vessel_name ?? v?.vesselName ?? v?.name ?? v?.boat_name ?? v?.boatName ?? "",
  ).trim();
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
  const date =
    String(tr?.planned_at || tr?.trip_date || tr?.tripDate || tr?.created_at || "").trim() || "";
  return `${code}${port ? ` • ${port}` : ""}${date ? ` • ${date.substring(0, 10)}` : ""}`;
}

function tripVesselDbId(tr: any): number | null {
  const n = Number(tr?.vessel_id ?? tr?.vesselId ?? tr?.vessel_fk ?? tr?.vesselFk ?? 0);
  return n > 0 ? n : null;
}
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

/* ---------------- FULL SCREEN PICKER (Vessel/Trip/Fish) ---------------- */
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
  leadingIcon?: any; // Ionicons name
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
        <View
          style={{
            height: 128,
            backgroundColor: "#e8f1ff",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {uri ? (
            <Image
              source={{ uri }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="contain"
            />
          ) : (
            <Ionicons name="image-outline" size={34} color="#64748b" />
          )}
        </View>

        <View
          style={{
            paddingVertical: 12,
            paddingHorizontal: 12,
            backgroundColor: "rgba(0,0,0,0.55)",
          }}
        >
          <Text
            style={{
              color: "white",
              fontWeight: "800",
              fontSize: 14,
            }}
            numberOfLines={2}
          >
            {item.label}
          </Text>

          {!!item.subtitle ? (
            <Text
              style={{ color: "rgba(255,255,255,0.75)", fontSize: 11, marginTop: 4 }}
              numberOfLines={1}
            >
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
          paddingVertical: 14,
          paddingHorizontal: 14,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              backgroundColor: "rgba(255,255,255,0.08)",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            }}
          >
            <Ionicons name={leadingIcon || "list-outline"} size={20} color="white" />
          </View>

          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: "white", fontWeight: "800", fontSize: 15 }} numberOfLines={2}>
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
            size={22}
            color={active ? ACCENT : "rgba(255,255,255,0.70)"}
          />
        </View>
      </Pressable>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingTop: 6 }}>
          <Pressable
            onPress={onClose}
            style={{ padding: 10, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.08)" }}
          >
            <Ionicons name="arrow-back" size={20} color="white" />
          </Pressable>

          <Text
            style={{ color: "white", fontWeight: "900", fontSize: 18, marginLeft: 12, flex: 1 }}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>

        {/* Search */}
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
            style={{
              color: "white",
              marginLeft: 10,
              fontSize: 16,
              flex: 1,
              paddingVertical: 2,
            }}
          />
          {q ? (
            <Pressable onPress={() => setQ("")} style={{ padding: 6 }}>
              <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.60)" />
            </Pressable>
          ) : null}
        </View>

        {/* List/Grid */}
        <View style={{ flex: 1, paddingTop: 14 }}>
          {mode === "grid" ? (
            <FlatList
              data={filtered}
              key={`grid_${numColumns}`}
              keyExtractor={(it) => it.key}
              numColumns={numColumns}
              contentContainerStyle={{
                paddingHorizontal: 6,
                paddingBottom: 120 + insetsBottom,
              }}
              renderItem={renderGrid}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <FlatList
              data={filtered}
              key="list"
              keyExtractor={(it) => it.key}
              contentContainerStyle={{
                paddingHorizontal: 14,
                paddingBottom: 120 + insetsBottom,
              }}
              renderItem={renderList}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>

        {/* Bottom fixed button */}
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
              height: 52,
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
  if (!initGroupRef.current) initGroupRef.current = createFishGroup(initialQr);

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

  // ✅ Full-screen pickers
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

  // ✅ Watermark compositor
  const wmViewRef = useRef<View | null>(null);
  const wmResolveRef = useRef<((uri: string) => void) | null>(null);
  const wmRejectRef = useRef<((e: any) => void) | null>(null);
  const [wmJob, setWmJob] = useState<WatermarkJob | null>(null);
  const [wmImgLoaded, setWmImgLoaded] = useState(false);
  const [wmLayoutReady, setWmLayoutReady] = useState(false); // ✅ IMPORTANT

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

  // ✅ capture watermark after BOTH image load + layout ready
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
          setWmLayoutReady(false);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [wmJob, wmImgLoaded, wmLayoutReady]);

  // ✅ resolve user id
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

  useEffect(() => {
    if (!torchWanted) {
      setTorchArmed(false);
      return;
    }
    setTorchArmed(false);
    const id = setTimeout(() => setTorchArmed(true), 180);
    return () => clearTimeout(id);
  }, [torchWanted, step, activeGroupId, fishScanOpen, photoCamOpen]);

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

      if (!src || typeof src !== "object") return null;

      const ownerDbId = Number(src?.id);
      if (!ownerDbId || Number.isNaN(ownerDbId)) return null;

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

      if (tripId && selectedVesselDbId) {
        if (alive) setPrefillLoading(false);
        return;
      }

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

      const vDb =
        (routeVesselDbId > 0 ? routeVesselDbId : null) ?? (tr ? tripVesselDbId(tr) : null);

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

  useEffect(() => {
    if (!selectedVesselDbId) return;
    if (!vessels?.length) return;

    const foundV = vessels.find((v: any) => vesselDbId(v) === selectedVesselDbId) || null;
    if (!foundV) return;

    setSelectedVesselCode(vesselCode(foundV));
    setSelectedVesselLabel(vesselLabel(foundV));
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

  /* ---------------- when vessel changes -> reset trip selection + reset groups ---------------- */
  useEffect(() => {
    if (skipVesselResetRef.current) {
      skipVesselResetRef.current = false;
      return;
    }
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

  const totalQrCount = useMemo(
    () => groups.reduce((sum, g) => sum + (g.scanned?.length || 0), 0),
    [groups],
  );

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

      // ✅ Build watermark lines (TOP-RIGHT): RootVerse + OwnerID + VesselName + DateTime + Location
      let ownerNumeric = Number(ownerId || 0);
      if (!ownerNumeric && resolvedUserId) {
        ownerNumeric = (await readOwnerCacheByUser(Number(resolvedUserId))) || 0;
      }

      const foundVesselForWm =
        selectedVesselDbId && vessels?.length
          ? vessels.find((v: any) => vesselDbId(v) === selectedVesselDbId)
          : null;

      const fromLabel = (() => {
        const parts = String(selectedVesselLabel || "").split("•");
        const maybe = (parts?.[1] || "").trim();
        return maybe.replace(/\(ID:\s*\d+\)\s*$/i, "").trim();
      })();

      const vName =
        (foundVesselForWm ? vesselName(foundVesselForWm) : "") ||
        fromLabel ||
        (selectedVesselDbId ? `ID ${selectedVesselDbId}` : "");

      const lines = [
        "RootVerse",
        ownerNumeric ? `Owner ID: ${ownerNumeric}` : "Owner ID: —",
        `Vessel: ${vName || "—"}`,
        `Date/Time: ${fmtDateTime(now)}`,
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

  const clearAll = () => {
    const fresh = createFishGroup(initialQr);
    initGroupRef.current = fresh;
    setGroups([fresh]);
    setActiveGroupId(fresh.id);

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

    if (step === 2 && lockTripSelection) {
      router.back();
      return;
    }

    setStep((s) => (s === 2 ? 1 : s === 3 ? 2 : 3));
  };

  const phaseLabel = (p: GroupPhase) =>
    p === "SCAN" ? t.phaseScan : p === "PHOTO" ? t.phasePhoto : t.phaseDone;

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
                  <View className="mt-3">
                    <PrimaryBtn label={t.grantCam} onPress={requestCameraPerm} />
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
          </View>
        </View>
      </Modal>

      {/* ✅ Photo Camera Modal */}
      <Modal
        visible={photoCamOpen}
        transparent
        animationType="fade"
        onRequestClose={closePhotoCamera}
      >
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
                  <View className="mt-3">
                    <PrimaryBtn label={t.grantCam} onPress={requestCameraPerm} />
                  </View>
                </View>
              ) : (
                <View style={{ height: 420 }}>
                  <CameraView
                    ref={photoCamRef}
                    style={{ flex: 1 }}
                    facing="back"
                    enableTorch={photoTorchEnabled}
                  />
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

      {/* ✅ SCROLL (Header + Content + Footer inside) */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingBottom: 18 + (insets.bottom || 0),
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* HEADER */}
        <View className="px-4 pt-2 pb-3">
          <Card className="px-4 py-4">
            <View className="flex-row items-start justify-between">
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text className={`text-xl font-extrabold ${UI.text}`} numberOfLines={1}>
                  {t.title}
                </Text>

                <View className="mt-2 flex-row items-center justify-between">
                  <StepDots step={step} />
                  <Text className={`text-xs font-bold ${UI.muted}`}>{t.step(step)}</Text>
                </View>

                <View className="mt-3 flex-row flex-wrap">
                  <View style={{ marginRight: 10, marginBottom: 10 }}>
                    <Pill
                      icon={syncIcon as any}
                      text={syncText}
                      color={syncColor}
                      bg={
                        syncState === "SYNCED"
                          ? "#ecfdf5"
                          : syncState === "SYNCING"
                            ? "#e0f2fe"
                            : "#fffbeb"
                      }
                    />
                  </View>

                  <View style={{ marginRight: 10, marginBottom: 10 }}>
                    <Pill
                      icon={isOnline ? "wifi-outline" : "cloud-offline-outline"}
                      text={isOnline ? "Online" : "Offline"}
                      color={isOnline ? UI.success : UI.warn}
                      bg={isOnline ? "#ecfdf5" : "#fffbeb"}
                    />
                  </View>

                  <View style={{ marginBottom: 10 }}>
                    <Pill
                      icon="layers-outline"
                      text={`${t.pending}: ${pendingCount}`}
                      color="#111827"
                      bg="#f3f4f6"
                    />
                  </View>
                </View>
              </View>

              <View style={{ width: 12 }} />

              <Pressable
                onPress={() => setLang((p) => (p === "ta" ? "en" : "ta"))}
                className={`rounded-full border ${UI.border} bg-white px-4 py-2 active:opacity-80`}
              >
                <Text className={`text-sm font-extrabold ${UI.text}`}>{t.langBtn}</Text>
              </Pressable>
            </View>

            <View className="mt-4">
              <View className="flex-row">
                <View style={{ flex: 1 }}>
                  <ActionTile
                    icon="flashlight-outline"
                    title={lang === "ta" ? "டார்ச்" : "Torch"}
                    subtitle={torchWanted ? t.torchOn : t.torchOff}
                    onPress={() => setTorchWanted((p) => !p)}
                    bg="#111827"
                    fg="#ffffff"
                    borderColor="#111827"
                  />
                </View>
                <View style={{ width: 10 }} />
                <View style={{ flex: 1 }}>
                  <ActionTile
                    icon="refresh-outline"
                    title={lang === "ta" ? "ரீசெட்" : "Reset"}
                    subtitle={lang === "ta" ? "அனைத்தும் நீக்கு" : "Clear all"}
                    onPress={clearAll}
                    bg="#f3f4f6"
                    fg="#111827"
                    borderColor="#e5e7eb"
                  />
                </View>
              </View>

              <View style={{ height: 10 }} />

              <PrimaryBtn
                label={t.scanBtn}
                onPress={openFishScan}
                disabled={!scanFishEnabled}
                icon="qr-code-outline"
                color={scanFishEnabled ? UI.accent : "#cbd5e1"}
              />
            </View>
          </Card>
        </View>

        {/* CONTENT */}
        <View className="px-4">
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
                      vesselLoading
                        ? t.loadingVessel
                        : vessels.length
                          ? `${vessels.length} vessels`
                          : t.noVessels
                    }
                    onPress={() => setVesselPickerOpen(true)}
                  />

                  <View style={{ height: 12 }} />

                  <BigSelect
                    label={t.trip}
                    value={tripLabelText}
                    placeholder={t.chooseTrip}
                    hint={tripLoading ? t.loadingTrips : trips.length ? `${trips.length} trips` : t.noTrips}
                    onPress={() => setTripPickerOpen(true)}
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
                                    g.phase === "DONE"
                                      ? "#ecfdf5"
                                      : g.phase === "PHOTO"
                                        ? "#e0f2fe"
                                        : "#fffbeb",
                                }}
                              >
                                <Text
                                  className="text-xs font-extrabold"
                                  style={{
                                    color:
                                      g.phase === "DONE" ? UI.success : g.phase === "PHOTO" ? UI.accent : UI.warn,
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

                {!activeGroup ? (
                  <Text className={`mt-3 text-sm ${UI.muted}`}>{t.selectGroupToScan}</Text>
                ) : (
                  <View className="mt-4">
                    <View className="flex-row items-center justify-between">
                      <Pressable
                        onPress={() => {
                          setFishPickGroupId(activeGroup.id);
                          setFishPickerOpen(true);
                        }}
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
                          <GhostBtn
                            label={t.clearAll}
                            onPress={() => clearGroupQrs(activeGroup.id)}
                            icon="trash-outline"
                          />
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

                    {activeGroup.phase === "PHOTO" ? (
                      <View className="mt-4">
                        <Text className={`text-sm font-extrabold ${UI.text}`}>{t.photosStageTitle}</Text>
                        <Text className={`mt-1 text-xs ${UI.muted}`}>{t.autoHint}</Text>

                        <View className="mt-3 flex-row items-center">
                          <GhostBtn
                            label={t.scanMore}
                            onPress={() => backToScanStage(activeGroup.id)}
                            icon="arrow-back-outline"
                          />
                          <View style={{ width: 10 }} />
                          <View style={{ flex: 1 }}>
                            <PrimaryBtn
                              label={t.capturePhoto}
                              onPress={() => openPhotoCamera(activeGroup.id)}
                              icon="camera-outline"
                            />
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
                                {lang === "ta"
                                  ? "Photo optional. இல்லாமல் கூட DONE செய்யலாம்."
                                  : "Photo optional. You can finish without photos."}
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

          {/* FOOTER NAV */}
          <View className="mt-4">
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
        </View>
      </ScrollView>

      {/* ✅ FULL SCREEN PICKERS */}
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
        searchPlaceholder="Search product (e.g. tuna)"
        confirmLabel="Next"
        insetsBottom={insets.bottom}
        onClose={() => {
          setFishPickerOpen(false);
          setFishPickGroupId(null);
        }}
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

      {/* ✅ OFFSCREEN WATERMARK VIEW (TOP-RIGHT) */}
      {wmJob ? (
        <View style={{ position: "absolute", left: -10000, top: -10000 }}>
          <View
            ref={(r) => (wmViewRef.current = r)}
            collapsable={false}
            onLayout={() => setWmLayoutReady(true)} // ✅ IMPORTANT
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
                top: 14,
                right: 14,
                maxWidth: wmJob.outW * 0.78,
                paddingHorizontal: 12,
                paddingVertical: 10,
                backgroundColor: "rgba(0,0,0,0.55)",
                borderRadius: 14,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.12)",
              }}
            >
              {(wmJob.lines || []).map((ln, idx) => (
                <Text
                  key={`${idx}_${ln}`}
                  style={{
                    color: "white",
                    fontWeight: idx === 0 ? "900" : idx === 1 ? "800" : "700",
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