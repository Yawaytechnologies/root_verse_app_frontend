// app/(wild)/trips/create.tsx
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

import { createTrip as createTripDummy } from "../../../src/data/wild/trips.dummy";
import { createTrip as createTripThunk } from "../../../src/features/trip/tripSlice";
import type { TripCreatePayload } from "../../../src/services/wild/tripApi";
import { useAppDispatch, useAppSelector } from "../../../src/store/hooks";

type Lang = "ta" | "en";

// ✅ TOGGLE: if your backend expects state_id & district_id in request body, set true.
// If backend does NOT need them, keep false.
const INCLUDE_STATE_DISTRICT_IN_PAYLOAD = false;

const i18n = {
  en: {
    title: "New Trip Request",
    online: "Online",
    offline: "Offline",
    ownerName: "Owner Name",
    regNo: "Registration No",

    vessel: "Vessel",
    errVessel: "Select vessel",

    tripDetails: "Trip Details",
    tripName: "Trip Name",

    fishingMethod: "Fishing Method",
    errMethod: "Select fishing method",

    fishSpecies: "Fish Species",
    errFishSpecies: "Select fish species",

    country: "Country",
    errCountry: "Select country",

    state: "State",
    district: "District",
    nearStation: "Nearest Station (Location)",
    tapToSelect: "Tap to select",
    select: "Select",
    plannedTripDT: "Planned Trip Date & Time",
    crewDetails: "Crew Details",
    crewMembers: "Crew members",
    crewHelp: "Use + / − to adjust (min 0)",

    qrCount: "QR Count",
    qrCountPH: "e.g. 10",
    qrHelp: "How many QR codes needed for this trip",

    planning: "Planning",
    expectedReturn: "Arrival Date (optional)",
    suppliesCost: "Supplies Cost (Auto)",
    diesel: "Diesel",
    liters: "Liters",
    ratePerLiter: "₹ / Liter",
    dieselCost: "Diesel Cost",
    ice: "Ice",
    kg: "Kg",
    ratePerKg: "₹ / Kg",
    iceCost: "Ice Cost",
    totalCost: "Total",
    totalHelp: "Diesel + Ice (auto-calculated)",
    cancel: "Cancel",
    submit: "Submit",

    errState: "Select state",
    errDistrict: "Select district",
    errLocation: "Select nearest station (location)",
    errPlanned: "Select planned trip date & time",
    errOwner: "Owner not loaded yet. Please wait / check login.",
    sent: "Trip request sent ✅",
    status: "Status",

    savedOffline:
      "No internet. Saved locally. Will auto-sync when network returns.",
    syncing: "Syncing pending...",
    pending: "Pending sync",
    apiFailDummy: "API failed — saved locally (dummy).",
    meLoading: "Loading owner info...",
    meError: "Owner info fetch failed",

    loading: "Loading...",
    noData: "No data found",
  },
  ta: {
    title: "புதிய பயணம் கோரிக்கை",
    online: "இணையத்தில்",
    offline: "இணையமில்லை",
    ownerName: "உரிமையாளர் பெயர்",
    regNo: "பதிவு எண்",

    vessel: "வள்ளம் (Vessel)",
    errVessel: "வள்ளத்தை தேர்வு செய்யவும்",

    tripDetails: "பயண விவரங்கள்",
    tripName: "பயண பெயர்",

    fishingMethod: "மீன்பிடி முறை",
    errMethod: "மீன்பிடி முறையை தேர்வு செய்யவும்",

    fishSpecies: "மீன் வகை (Fish)",
    errFishSpecies: "மீன் வகையை தேர்வு செய்யவும்",

    country: "நாடு",
    errCountry: "நாடு தேர்வு செய்யவும்",

    state: "மாநிலம்",
    district: "மாவட்டம்",
    nearStation: "அருகிலுள்ள நிலையம் (இடம்)",
    tapToSelect: "தேர்வு செய்ய தட்டுங்கள்",
    select: "தேர்வு செய்",
    plannedTripDT: "திட்டமிட்ட பயண தேதி & நேரம்",
    crewDetails: "குழு விவரங்கள்",
    crewMembers: "குழு உறுப்பினர்கள்",
    crewHelp: "குறை / கூட்டு பட்டன்களை பயன்படுத்தவும் (குறைந்தபட்சம் 0)",

    qrCount: "QR எண்ணிக்கை",
    qrCountPH: "உதா: 10",
    qrHelp: "இந்த பயணத்திற்கு எத்தனை QR தேவை?",

    planning: "திட்டம்",
    expectedReturn: "வருகை தேதி (விருப்பம்)",
    suppliesCost: "செலவுகள் (தானாக கணக்கு)",
    diesel: "டீசல்",
    liters: "லிட்டர்",
    ratePerLiter: "₹ / லிட்டர்",
    dieselCost: "டீசல் செலவு",
    ice: "ஐஸ்",
    kg: "கிலோ",
    ratePerKg: "₹ / கிலோ",
    iceCost: "ஐஸ் செலவு",
    totalCost: "மொத்தம்",
    totalHelp: "டீசல் + ஐஸ் (தானாக கணக்கு)",
    cancel: "ரத்து",
    submit: "சமர்ப்பி",

    errState: "மாநிலம் தேர்வு செய்யவும்",
    errDistrict: "மாவட்டம் தேர்வு செய்யவும்",
    errLocation: "இடம் (Location) தேர்வு செய்யவும்",
    errPlanned: "பயண தேதி & நேரம் தேர்வு செய்யவும்",
    errOwner: "Owner load ஆகலை. கொஞ்சம் wait / login check பண்ணுங்க.",
    sent: "பயண கோரிக்கை அனுப்பப்பட்டது ✅",
    status: "நிலை",

    savedOffline:
      "இணையம் இல்லை. Local-ல் save பண்ணிட்டோம். Net வந்தவுடன் auto sync ஆகும்.",
    syncing: "Syncing pending...",
    pending: "Pending sync",
    apiFailDummy: "API தோல்வி — உள்ளூரில் சேமிக்கப்பட்டது (dummy).",
    meLoading: "Owner info load ஆகுது...",
    meError: "Owner info fetch fail",

    loading: "Loading...",
    noData: "Data இல்லை",
  },
};

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <View className={`rounded-2xl border border-[#ead7c8] bg-white ${className}`}>
      {children}
    </View>
  );
}
function Label({ children }: { children: React.ReactNode }) {
  return <Text className="text-xs text-[#7a6f66]">{children}</Text>;
}
function FieldBox({ children }: { children: React.ReactNode }) {
  return (
    <View className="mt-2 rounded-xl border border-[#e6d4c5] bg-white px-3 py-3">
      {children}
    </View>
  );
}

function toISO(dt: Date) {
  return dt.toISOString();
}
function toISOArrival(dateOnly: Date) {
  const d = new Date(dateOnly);
  d.setHours(18, 0, 0, 0);
  return d.toISOString();
}
function formatDateTime(dt: Date) {
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  let hr = dt.getHours();
  const min = String(dt.getMinutes()).padStart(2, "0");
  const ampm = hr >= 12 ? "PM" : "AM";
  hr = hr % 12;
  hr = hr === 0 ? 12 : hr;
  return `${yyyy}-${mm}-${dd} ${String(hr).padStart(2, "0")}:${min} ${ampm}`;
}
function onlyDecimal(v: string) {
  let s = (v || "").replace(/[^0-9.]/g, "");
  const firstDot = s.indexOf(".");
  if (firstDot !== -1)
    s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, "");
  return s;
}
function onlyInt(v: string) {
  return (v || "").replace(/[^0-9]/g, "");
}
function toNum(v: string) {
  const n = Number(String(v ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}
function money(n: number) {
  return `₹${n.toFixed(2)}`;
}

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

// ✅ keep your mapping helper (fallback)
function mapMethodToApi(label: string) {
  const l = (label || "").toLowerCase();
  if (l.includes("pole")) return "pole&line";
  if (l.includes("hook")) return "hook&line";
  if (l.includes("long")) return "longline";
  if (l.includes("gill")) return "gillnet";
  return "trawling";
}
function isNetworkishError(msg: string) {
  const m = (msg || "").toLowerCase();
  return (
    m.includes("network") ||
    m.includes("failed to fetch") ||
    m.includes("timeout") ||
    m.includes("socket") ||
    m.includes("econn")
  );
}

// ✅ robust number parsing
function isNumericString(v: any) {
  return typeof v === "string" && /^[0-9]+$/.test(v.trim());
}
function toIntSafe(v: any) {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  if (isNumericString(v)) return Number(v.trim());
  return 0;
}

// ✅ NEW: only allow APPROVED vessels
function isApprovedStatus(s: any) {
  return String(s ?? "").trim().toUpperCase() === "APPROVED";
}

/* ---------------- API ---------------- */
const API_BASE = "https://rootverse-backend-5qoo.onrender.com";
const ME_CACHE_KEY_PREFIX = "RV_ME_CACHE_V1";
const LAST_USER_ID_KEY_PREFIX = "RV_LAST_USER_ID_V1";

// ✅ cache is now scoped by current login user, so old user data won't leak
function scopedStorageKey(prefix: string, scope?: number | string | null) {
  const s = String(scope ?? "").trim();
  return `${prefix}:${s || "default"}`;
}

// ✅ caches for backend lists
const FISHING_METHODS_CACHE_KEY = "RV_FISHING_METHODS_CACHE_V1";
const FISH_TYPES_CACHE_KEY = "RV_FISH_TYPES_CACHE_V1";

type MeCache = {
  ownerName: string;
  registrationNo: string;
  ownerCode: string;
  ownerDbId: number;
};

async function readMeCache(scope?: number | string): Promise<MeCache | null> {
  try {
    const scopedKey = scopedStorageKey(ME_CACHE_KEY_PREFIX, scope);
    const raw = await AsyncStorage.getItem(scopedKey);

    if (!raw) {
      // ✅ legacy fallback ONLY when we don't know the current login user
      if (scope !== null && scope !== undefined && String(scope).trim()) {
        return null;
      }

      const ownerCode = String((await AsyncStorage.getItem("owner_code")) || "").trim();
      const ownerIdRaw = (await AsyncStorage.getItem("owner_id")) || "";
      const ownerDbId = toIntSafe(ownerIdRaw);

      if (ownerCode && ownerDbId) {
        return { ownerName: "", registrationNo: "", ownerCode, ownerDbId };
      }
      return null;
    }

    const p = JSON.parse(raw);
    if (!p || typeof p !== "object") return null;

    return {
      ownerName: String(p.ownerName || "").trim(),
      registrationNo: String(p.registrationNo || "").trim(),
      ownerCode: String(p.ownerCode || "").trim(),
      ownerDbId: toIntSafe(p.ownerDbId),
    };
  } catch {
    return null;
  }
}

async function writeMeCache(data: MeCache, scope?: number | string) {
  try {
    await AsyncStorage.setItem(
      scopedStorageKey(ME_CACHE_KEY_PREFIX, scope),
      JSON.stringify(data),
    );

    // ✅ keep legacy keys also fresh so other old screens don't stay stale
    if (String(data?.ownerCode || "").trim()) {
      await AsyncStorage.setItem("owner_code", String(data.ownerCode).trim());
    }
    if (toIntSafe(data?.ownerDbId)) {
      await AsyncStorage.setItem("owner_id", String(toIntSafe(data.ownerDbId)));
    }
  } catch {}
}

async function fetchMeFromApi(
  tokenOverride?: string,
  scope?: number | string,
): Promise<MeCache> {
  const storedToken = await AsyncStorage.getItem("auth_token");
  const token = String(tokenOverride || storedToken || "").trim();

  const res = await fetch(`${API_BASE}/api/me`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`ME API failed (${res.status}): ${text || res.statusText}`);
  }

  const json: any = await res.json();
  const u = json?.user ?? json?.data ?? json ?? {};

  const userId = toIntSafe(u?.id);
  if (userId) {
    try {
      await AsyncStorage.setItem(
        scopedStorageKey(LAST_USER_ID_KEY_PREFIX, scope || userId),
        String(userId),
      );
    } catch {}
  }

  const ownerName = String(u?.username ?? u?.owner_name ?? u?.name ?? "").trim();

  const registrationNo = String(
    u?.govt_id ??
      u?.registration_no ??
      u?.reg_no ??
      u?.registrationNo ??
      u?.vessel_reg_no ??
      "",
  ).trim();

  const ownerDbId =
    toIntSafe(u?.owner_db_id) ||
    toIntSafe(u?.ownerDbId) ||
    toIntSafe(u?.owner_dbid) ||
    toIntSafe(u?.owner_db) ||
    toIntSafe(u?.ownerId) ||
    (toIntSafe(u?.owner_id) ? toIntSafe(u?.owner_id) : 0) ||
    toIntSafe(u?.id);

  const ownerCode = String(
    u?.owner_code ?? u?.ownerCode ?? (isNumericString(u?.owner_id) ? "" : u?.owner_id) ?? "",
  ).trim();

  return { ownerName, ownerCode, registrationNo, ownerDbId };
}

function makeTripName(regNo: string) {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${regNo || "REG"}/${y}${m}${day}_${hh}${mi}`;
}

/* ---------------- GEO TYPES ---------------- */
type CountryItem = { id: number; name: string; code?: string | null };

type StateItem = {
  id: number;
  name: string;
  state_code?: string | null;

  country_id?: number | null;
  country_name?: string | null;
  country_code?: string | null;
};

type DistrictItem = {
  id: number;
  name: string;
  district_code?: string | null;
  state_id: number;
};
type LocationItem = {
  id: number;
  name: string;
  location_code?: string | null;

  district_id: number;
  state_id: number;

  district_name?: string;
  state_name?: string;
};

// ✅ Keep vessel id for payload, show govt_registration_number main and vessel_name small
type VesselItem = {
  id: number;
  name: string; // govt_registration_number
  subName?: string; // vessel_name
  code?: string | null;
  approval_status?: string | null; // ✅ NEW
};

// ✅ backend items w/ image
type FishingMethodItem = {
  id: number;
  name: string;
  code?: string | null;
  image_url?: string | null;
};

type FishTypeItem = {
  id: number;
  name: string;
  code?: string | null;
  image_url?: string | null;
};

const VESSEL_CACHE_PREFIX = "RV_VESSELS_CACHE_OWNER_V1_";

async function readVesselsCache(ownerDbId: number): Promise<VesselItem[] | null> {
  try {
    const raw = await AsyncStorage.getItem(`${VESSEL_CACHE_PREFIX}${ownerDbId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const arr = Array.isArray(parsed) ? (parsed as VesselItem[]) : null;
    if (!arr) return null;

    // ✅ only approved from cache too
    const approvedOnly = arr.filter((v) => isApprovedStatus(v?.approval_status));
    return approvedOnly;
  } catch {
    return null;
  }
}

async function writeVesselsCache(ownerDbId: number, items: VesselItem[]) {
  try {
    // ✅ store only approved
    const approvedOnly = (items || []).filter((v) => isApprovedStatus(v?.approval_status));
    await AsyncStorage.setItem(
      `${VESSEL_CACHE_PREFIX}${ownerDbId}`,
      JSON.stringify(approvedOnly),
    );
  } catch {}
}

async function safeJson(res: Response) {
  const text = await res.text().catch(() => "");
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}
function unwrapData<T>(payload: any): T {
  if (!payload) return payload as T;
  if (payload?.success === false)
    throw new Error(payload?.message || payload?.error || "Request failed");
  if (payload?.data != null) return payload.data as T;
  return payload as T;
}
async function getAuthHeaders(tokenOverride?: string) {
  const storedToken = await AsyncStorage.getItem("auth_token");
  const token = String(tokenOverride || storedToken || "").trim();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
async function geoGet<T>(path: string): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: { Accept: "application/json", ...(headers as Record<string, string>) },
  });
  const json = await safeJson(res);
  if (!res.ok)
    throw new Error(json?.message || json?.error || `GET ${path} failed (${res.status})`);
  return unwrapData<T>(json);
}

// ✅ NEW: owner db id fetch like catchlog (/api/owner/fetch/:userId)
async function getLastUserId(scope?: number | string): Promise<number> {
  const raw = await AsyncStorage.getItem(scopedStorageKey(LAST_USER_ID_KEY_PREFIX, scope));
  const n = toIntSafe(raw);
  return n > 0 ? n : 0;
}

async function fetchOwnerDbIdFromUserId(
  userId: number,
  tokenOverride?: string,
): Promise<number> {
  const headers = await getAuthHeaders(tokenOverride);
  const res = await fetch(`${API_BASE}/api/owner/fetch/${encodeURIComponent(String(userId))}`, {
    method: "GET",
    headers: { Accept: "application/json", ...headers },
  });

  const json = await safeJson(res);
  if (!res.ok) {
    throw new Error(
      json?.message || json?.error || `GET /api/owner/fetch/${userId} failed (${res.status})`,
    );
  }

  const data: any = unwrapData<any>(json);
  const o = Array.isArray(data) ? data[0] : data;

  const id = toIntSafe(o?.id) || toIntSafe(o?.owner_id) || toIntSafe(o?.ownerId) || 0;

  return id;
}

/* ---------------- simple list cache helpers ---------------- */
async function readListCache<T>(key: string): Promise<T[] | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : null;
  } catch {
    return null;
  }
}
async function writeListCache<T>(key: string, items: T[]) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(items));
  } catch {}
}

/* ---------------- FULL SCREEN PICKER (LIKE CATCHLOG) ---------------- */
type FullPickMode = "grid" | "list";

type FullPickItem = {
  key: string;
  label: string;
  subtitle?: string;
  imageUri?: string | null;
};

function FullScreenPickerModal({
  visible,
  title,
  items,
  selectedKey,
  onClose,
  onConfirm,
  confirmLabel,
  searchPlaceholder,
  mode,
  numColumns,
  showImages,
  insetsBottom,
}: {
  visible: boolean;
  title: string;
  items: FullPickItem[];
  selectedKey: string;
  onClose: () => void;
  onConfirm: (item: FullPickItem) => void;

  confirmLabel: string;
  searchPlaceholder: string;

  mode: FullPickMode;
  numColumns: number;
  showImages: boolean;
  insetsBottom: number;
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
    return items.filter((x) => {
      const a = String(x.label || "").toLowerCase();
      const b = String(x.subtitle || "").toLowerCase();
      return a.includes(t) || b.includes(t);
    });
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
            <View
              style={{
                width: "100%",
                height: "100%",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "#64748b", fontWeight: "800" }}>No Image</Text>
            </View>
          )}
        </View>

        <View
          style={{
            paddingVertical: 12,
            paddingHorizontal: 12,
            backgroundColor: "rgba(0,0,0,0.55)",
          }}
        >
          <Text style={{ color: "white", fontWeight: "800", fontSize: 14 }} numberOfLines={2}>
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
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: "white", fontWeight: "800", fontSize: 15 }} numberOfLines={2}>
              {item.label}
            </Text>
            {!!item.subtitle ? (
              <Text
                style={{ color: "rgba(255,255,255,0.70)", fontSize: 12, marginTop: 4 }}
                numberOfLines={1}
              >
                {item.subtitle}
              </Text>
            ) : null}
          </View>

          <View style={{ marginLeft: 12 }}>
            <Text style={{ color: active ? ACCENT : "rgba(255,255,255,0.60)", fontWeight: "900" }}>
              {active ? "✓" : "›"}
            </Text>
          </View>
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
            <Text style={{ color: "white", fontWeight: "900", fontSize: 16 }}>←</Text>
          </Pressable>

          <Text style={{ color: "white", fontWeight: "900", fontSize: 18, marginLeft: 12, flex: 1 }} numberOfLines={1}>
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
          <Text style={{ color: "rgba(255,255,255,0.70)", fontWeight: "900" }}>🔎</Text>
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
              <Text style={{ color: "rgba(255,255,255,0.60)", fontWeight: "900" }}>✕</Text>
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

/* ---------------- OFFLINE QUEUE ---------------- */
const TRIP_QUEUE_KEY = "RV_TRIP_QUEUE_V1";

type TripQueuedItem = {
  id: string;
  createdAt: string;
  payload: TripCreatePayload;
};

async function loadTripQueue(): Promise<TripQueuedItem[]> {
  const raw = await AsyncStorage.getItem(TRIP_QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as TripQueuedItem[]) : [];
  } catch {
    return [];
  }
}
async function saveTripQueue(items: TripQueuedItem[]) {
  await AsyncStorage.setItem(TRIP_QUEUE_KEY, JSON.stringify(items));
}
async function enqueueTrip(payload: TripCreatePayload) {
  const items = await loadTripQueue();
  items.push({
    id: `trip_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    createdAt: new Date().toISOString(),
    payload,
  });
  await saveTripQueue(items);
}
async function getTripQueueCount() {
  const items = await loadTripQueue();
  return items.length;
}
async function patchOwnerCodeInTripQueue(ownerCode: string) {
  const code = String(ownerCode || "").trim();
  if (!code) return 0;
  const items = await loadTripQueue();
  let patched = 0;
  const next = items.map((it) => {
    if (it.payload?.owner_code) return it;
    patched++;
    return { ...it, payload: { ...it.payload, owner_code: code } };
  });
  if (patched > 0) await saveTripQueue(next);
  return patched;
}
async function flushTripQueue(send: (payload: TripCreatePayload) => Promise<any>) {
  const items = await loadTripQueue();
  if (!items.length) return { sent: 0, left: 0 };

  let sent = 0;
  for (let i = 0; i < items.length; i++) {
    try {
      await send(items[i].payload);
      sent++;
    } catch (error) {
      const remaining = items.slice(i);
      await saveTripQueue(remaining);
      return { sent, left: remaining.length, error };
    }
  }

  await saveTripQueue([]);
  return { sent, left: 0 };
}

/* ---------------- UI HELPERS (Wizard UI only) ---------------- */
function IconBubble({
  name,
  bg = "#fff3e7",
  color = "#7a4a12",
}: {
  name: any;
  bg?: string;
  color?: string;
}) {
  return (
    <View
      style={{
        width: 42,
        height: 42,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: bg,
        borderWidth: 1,
        borderColor: "#ead7c8",
      }}
    >
      <Ionicons name={name} size={22} color={color} />
    </View>
  );
}

function BigPickRow({
  icon,
  title,
  value,
  placeholder,
  onPress,
  disabled,
  helper,
}: {
  icon: any;
  title: string;
  value?: string;
  placeholder: string;
  onPress: () => void;
  disabled?: boolean;
  helper?: string;
}) {
  const hasValue = !!(value && value.trim());
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        opacity: disabled ? 0.45 : 1,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "#e6d4c5",
        backgroundColor: "white",
        paddingVertical: 14,
        paddingHorizontal: 14,
        marginTop: 12,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <IconBubble name={icon} />
        <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
          <Text style={{ fontSize: 13, fontWeight: "800", color: "#2b2b2b" }}>
            {title}
          </Text>

          <Text
            style={{
              marginTop: 4,
              fontSize: 18,
              fontWeight: "900",
              color: hasValue ? "#111827" : "#9ca3af",
            }}
            numberOfLines={2}
          >
            {hasValue ? value : placeholder}
          </Text>

          {!!helper ? (
            <Text style={{ marginTop: 6, fontSize: 12, color: "#7a6f66" }} numberOfLines={2}>
              {helper}
            </Text>
          ) : null}
        </View>

        <Ionicons name="chevron-forward" size={20} color="#7a6f66" />
      </View>
    </Pressable>
  );
}

function StepHeader({
  step,
  total,
  title,
  sub,
  icon,
  isOnline,
  onlineText,
  offlineText,
}: {
  step: number;
  total: number;
  title: string;
  sub: string;
  icon: any;
  isOnline: boolean;
  onlineText: string;
  offlineText: string;
}) {
  return (
    <View
      style={{
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "#ead7c8",
        backgroundColor: "white",
        padding: 14,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <IconBubble
          name={icon}
          bg={isOnline ? "#ecfdf5" : "#fffbeb"}
          color={isOnline ? "#047857" : "#92400e"}
        />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ fontSize: 12, fontWeight: "900", color: "#7a6f66" }}>
            Step {step} / {total}
          </Text>
          <Text style={{ fontSize: 18, fontWeight: "900", color: "#111827", marginTop: 2 }}>
            {title}
          </Text>
          <Text style={{ fontSize: 12, color: "#7a6f66", marginTop: 4 }}>
            {sub}
          </Text>
        </View>

        <View style={{ alignItems: "flex-end" }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                backgroundColor: isOnline ? "#10b981" : "#f59e0b",
                marginRight: 8,
              }}
            />
            <Text style={{ fontSize: 12, fontWeight: "900", color: isOnline ? "#047857" : "#92400e" }}>
              {isOnline ? onlineText : offlineText}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function ReviewRow({
  icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", marginTop: 12 }}>
      <IconBubble name={icon} bg="#f8fafc" color="#334155" />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ fontSize: 12, fontWeight: "900", color: "#7a6f66" }}>{label}</Text>
        <Text style={{ fontSize: 16, fontWeight: "900", color: "#111827", marginTop: 3 }}>
          {value || "—"}
        </Text>
      </View>
    </View>
  );
}

/* ---------------- SCREEN ---------------- */
export default function NewTripRequest() {
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();

  // ✅ current login info first (prevents stale owner from previous login)
  const authTokenFromStore = useAppSelector((s: any) => {
    return s.login?.token ?? s.auth?.token ?? undefined;
  });

  const activeLoginUserId = useAppSelector((s: any) => {
    return (
      toIntSafe(
        s.login?.user?.id ??
          s.login?.user?.user_id ??
          s.auth?.me?.id ??
          s.auth?.me?.user_id ??
          s.me?.me?.id ??
          s.me?.me?.user_id,
      ) || 0
    );
  });

  const activeOwnerNameFromStore = useAppSelector((s: any) => {
    return String(
      s.login?.user?.owner_name ??
        s.login?.user?.ownerName ??
        s.login?.user?.username ??
        s.login?.user?.name ??
        s.auth?.me?.owner_name ??
        s.auth?.me?.ownerName ??
        s.auth?.me?.username ??
        s.auth?.me?.name ??
        s.me?.me?.owner_name ??
        s.me?.me?.ownerName ??
        s.me?.me?.username ??
        s.me?.me?.name ??
        "",
    ).trim();
  });

  const activeOwnerCodeFromStore = useAppSelector((s: any) => {
    return String(
      s.login?.user?.owner_code ??
        s.login?.user?.ownerCode ??
        s.auth?.me?.owner_code ??
        s.auth?.me?.ownerCode ??
        s.me?.me?.owner_code ??
        s.me?.me?.ownerCode ??
        "",
    ).trim();
  });

  const activeOwnerDbIdFromStore = useAppSelector((s: any) => {
    return (
      toIntSafe(
        s.login?.user?.owner_db_id ??
          s.login?.user?.ownerDbId ??
          s.auth?.me?.owner_db_id ??
          s.auth?.me?.ownerDbId ??
          s.me?.me?.owner_db_id ??
          s.me?.me?.ownerDbId,
      ) ||
      toIntSafe(
        s.login?.user?.owner_id ??
          s.auth?.me?.owner_id ??
          s.me?.me?.owner_id,
      ) ||
      0
    );
  });

  const activeRegistrationNoFromStore = useAppSelector((s: any) => {
    return String(
      s.login?.user?.govt_id ??
        s.login?.user?.registration_no ??
        s.login?.user?.reg_no ??
        s.login?.user?.registrationNo ??
        s.login?.user?.vessel_reg_no ??
        s.auth?.me?.govt_id ??
        s.auth?.me?.registration_no ??
        s.auth?.me?.reg_no ??
        s.auth?.me?.registrationNo ??
        s.auth?.me?.vessel_reg_no ??
        s.me?.me?.govt_id ??
        s.me?.me?.registration_no ??
        s.me?.me?.reg_no ??
        s.me?.me?.registrationNo ??
        s.me?.me?.vessel_reg_no ??
        "",
    ).trim();
  });

  const [lang, setLang] = useState<Lang>("ta");
  const t = i18n[lang];

  const NEXT_LABEL = lang === "ta" ? "அடுத்து" : "Next";

  const [ownerName, setOwnerName] = useState("");
  const [registrationNo, setRegistrationNo] = useState("");
  const [ownerCode, setOwnerCode] = useState("");
  const [ownerDbId, setOwnerDbId] = useState(0);

  const [meLoading, setMeLoading] = useState(false);
  const [meError, setMeError] = useState<string | null>(null);

  const [tripName, setTripName] = useState(() => makeTripName("REG"));
  useEffect(() => {
    if (!registrationNo) return;
    setTripName(makeTripName(registrationNo));
  }, [registrationNo]);

  // ✅ Fishing Method from backend
  const [methodOptions, setMethodOptions] = useState<FishingMethodItem[]>([]);
  const [methodLoading, setMethodLoading] = useState(false);
  const [methodSel, setMethodSel] = useState<FishingMethodItem | null>(null);

  // ✅ Fish species from backend
  const [fishOptions, setFishOptions] = useState<FishTypeItem[]>([]);
  const [fishLoading, setFishLoading] = useState(false);
  const [fishSel, setFishSel] = useState<FishTypeItem | null>(null);

  const [vessels, setVessels] = useState<VesselItem[]>([]);
  const [vesselSel, setVesselSel] = useState<VesselItem | null>(null);
  const [vesselsLoading, setVesselsLoading] = useState(false);

  // ✅ NEW: Country + country-based states
  const [countries, setCountries] = useState<CountryItem[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [countrySel, setCountrySel] = useState<CountryItem | null>(null);

  const [states, setStates] = useState<StateItem[]>([]);
  const [districts, setDistricts] = useState<DistrictItem[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);

  const [stateSel, setStateSel] = useState<StateItem | null>(null);
  const [districtSel, setDistrictSel] = useState<DistrictItem | null>(null);
  const [locationSel, setLocationSel] = useState<LocationItem | null>(null);

  const [statesLoading, setStatesLoading] = useState(false);
  const [districtsLoading, setDistrictsLoading] = useState(false);
  const [locationsLoading, setLocationsLoading] = useState(false);

  const [plannedDT, setPlannedDT] = useState<Date | null>(null);
  const [showPlannedDate, setShowPlannedDate] = useState(false);
  const [showPlannedTime, setShowPlannedTime] = useState(false);

  const [expectedReturn, setExpectedReturn] = useState<Date | null>(null);
  const [showReturnPicker, setShowReturnPicker] = useState(false);

  const [crewCount, setCrewCount] = useState(0);
  const [qrCount, setQrCount] = useState("");

  const [dieselLiters, setDieselLiters] = useState("");
  const [dieselRate, setDieselRate] = useState("95");
  const [iceKg, setIceKg] = useState("");
  const [iceRate, setIceRate] = useState("15");

  const dieselCost = useMemo(
    () => toNum(dieselLiters) * toNum(dieselRate),
    [dieselLiters, dieselRate],
  );
  const iceCost = useMemo(() => toNum(iceKg) * toNum(iceRate), [iceKg, iceRate]);
  const totalCost = useMemo(() => dieselCost + iceCost, [dieselCost, iceCost]);

  const plannedStr = plannedDT ? formatDateTime(plannedDT) : "";
  const returnStr = expectedReturn ? formatDateTime(expectedReturn).split(" ")[0] : "";

  const [posting, setPosting] = useState(false);

  const globalNetworkState = useAppSelector((s: any) => s.network?.isOnline ?? true);
  const [isOnline, setIsOnline] = useState<boolean>(() => globalNetworkState);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  // ✅ FULL SCREEN PICKERS
  const [methodPickerOpen, setMethodPickerOpen] = useState(false);
  const [fishPickerOpen, setFishPickerOpen] = useState(false);
  const [vesselPickerOpen, setVesselPickerOpen] = useState(false);

  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [statePickerOpen, setStatePickerOpen] = useState(false);

  const [districtPickerOpen, setDistrictPickerOpen] = useState(false);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);

  const flushingRef = useRef(false);

  /* ---------------- WIZARD STEP UI STATE (UI only) ---------------- */
  const TOTAL_STEPS = 5;
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  const stepMeta = useMemo(() => {
    return {
      1: {
        icon: "boat",
        title: lang === "ta" ? "வள்ளம் + முறை + மீன்" : "Vessel + Method + Fish",
        sub: lang === "ta" ? "இந்த 3-ஐ தேர்வு பண்ணுங்க" : "Pick these 3 items",
      },
      2: {
        icon: "location",
        title: lang === "ta" ? "இடம் தேர்வு" : "Pick Location",
        sub:
          lang === "ta"
            ? "நாடு → மாநிலம் → மாவட்டம் → நிலையம்"
            : "Country → State → District → Station",
      },
      3: {
        icon: "calendar",
        title: lang === "ta" ? "தேதி + QR" : "Date + QR",
        sub: lang === "ta" ? "பயண தேதி/நேரம் தேர்வு பண்ணுங்க" : "Pick planned date & time",
      },
      4: {
        icon: "wallet",
        title: lang === "ta" ? "குழு + செலவு" : "Crew + Cost",
        sub: lang === "ta" ? "குழு, டீசல், ஐஸ்" : "Crew, diesel, ice",
      },
      5: {
        icon: "checkmark-circle",
        title: lang === "ta" ? "சரிபார்ப்பு" : "Review",
        sub:
          lang === "ta"
            ? "சரி என்றால் Submit பண்ணுங்க"
            : "Confirm everything and submit",
      },
    } as const;
  }, [lang]);

  const guardStep = (s: number) => {
    if (s === 1) {
      if (!vesselSel?.id) return Alert.alert(t.title, t.errVessel), false;
      if (!methodSel?.id) return Alert.alert(t.title, t.errMethod), false;
      if (!fishSel?.id) return Alert.alert(t.title, t.errFishSpecies), false;
      return true;
    }
    if (s === 2) {
      if (!countrySel?.id) return Alert.alert(t.title, t.errCountry), false;
      if (!stateSel?.id) return Alert.alert(t.title, t.errState), false;
      if (!districtSel?.id) return Alert.alert(t.title, t.errDistrict), false;
      if (!locationSel?.id) return Alert.alert(t.title, t.errLocation), false;
      return true;
    }
    if (s === 3) {
      if (!plannedDT) return Alert.alert(t.title, t.errPlanned), false;
      return true;
    }
    return true;
  };

  const goNext = () => {
    if (!guardStep(step)) return;
    setStep((prev) => (prev < TOTAL_STEPS ? ((prev + 1) as any) : prev));
  };

  const goBackStep = () => {
    if (step === 1) return router.back();
    setStep((prev) => (prev > 1 ? ((prev - 1) as any) : prev));
  };

  /* ---------------- ME cache / network watchers ---------------- */

  // ✅ immediately sync current login store values into local state
  useEffect(() => {
    if (activeOwnerNameFromStore) setOwnerName(activeOwnerNameFromStore);
    if (activeRegistrationNoFromStore) setRegistrationNo(activeRegistrationNoFromStore);
    if (activeOwnerCodeFromStore) setOwnerCode(activeOwnerCodeFromStore);
    if (activeOwnerDbIdFromStore) setOwnerDbId(Number(activeOwnerDbIdFromStore));
  }, [
    activeOwnerNameFromStore,
    activeRegistrationNoFromStore,
    activeOwnerCodeFromStore,
    activeOwnerDbIdFromStore,
  ]);

  // ✅ read scoped cache per current logged-in user
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!alive) return;

        // clear stale user immediately when login changes
        setOwnerName("");
        setRegistrationNo("");
        setOwnerCode("");
        setOwnerDbId(0);
        setMeError(null);
        setMeLoading(false);

        const cached = await readMeCache(activeLoginUserId || undefined);
        if (!alive) return;

        if (cached) {
          if (cached.ownerName) setOwnerName(cached.ownerName);
          if (cached.registrationNo) setRegistrationNo(cached.registrationNo);
          if (cached.ownerCode) setOwnerCode(cached.ownerCode);
          if (cached.ownerDbId) setOwnerDbId(Number(cached.ownerDbId));
          setMeLoading(false);
          setMeError(null);
        } else {
          setMeLoading(false);
        }
      } catch (e: any) {
        if (!alive) return;
        setMeLoading(false);
        setMeError(String(e?.message || e));
      }
    })();
    return () => {
      alive = false;
    };
  }, [activeLoginUserId]);

  useEffect(() => {
    let alive = true;
    const refreshCount = async () => {
      const c = await getTripQueueCount();
      if (alive) setPendingCount(c);
    };

    refreshCount();
    setIsOnline(globalNetworkState);

    const unsub = NetInfo.addEventListener((state) => {
      const online = !!state.isConnected && (state.isInternetReachable ?? true);
      if (!alive) return;
      setIsOnline(online);
      refreshCount();
    });

    return () => {
      alive = false;
      unsub();
    };
  }, [globalNetworkState]);

  useEffect(() => {
    let alive = true;
    if (!isOnline) return;

    const hasFreshStoreOwner =
      !!String(activeOwnerCodeFromStore || "").trim() && !!Number(activeOwnerDbIdFromStore);

    const hasEnoughLocalOwner =
      !!String(ownerCode || "").trim() &&
      !!Number(ownerDbId) &&
      !!String(ownerName || "").trim();

    // ✅ if Redux already has current login owner, don't refetch
    // ✅ if scoped local data is already complete for known login user, don't refetch
    if (hasFreshStoreOwner || (activeLoginUserId > 0 && hasEnoughLocalOwner)) return;

    (async () => {
      setMeLoading(true);
      setMeError(null);
      try {
        const fresh = await fetchMeFromApi(authTokenFromStore, activeLoginUserId || undefined);
        if (!alive) return;

        setOwnerName(fresh.ownerName);
        setRegistrationNo(fresh.registrationNo);
        setOwnerCode(fresh.ownerCode);
        setOwnerDbId(Number(fresh.ownerDbId || 0));

        await writeMeCache(fresh, activeLoginUserId || undefined);

        if (fresh.ownerCode) {
          await patchOwnerCodeInTripQueue(fresh.ownerCode);
          const c = await getTripQueueCount();
          if (alive) setPendingCount(c);
        }
      } catch (e: any) {
        if (!alive) return;
        setMeError(String(e?.message || e));
      } finally {
        if (alive) setMeLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [
    isOnline,
    authTokenFromStore,
    activeLoginUserId,
    activeOwnerCodeFromStore,
    activeOwnerDbIdFromStore,
    ownerCode,
    ownerDbId,
    ownerName,
  ]);

  // ✅ fishing methods from backend (+ cache)
  useEffect(() => {
    let alive = true;

    (async () => {
      const cached = await readListCache<FishingMethodItem>(FISHING_METHODS_CACHE_KEY);
      if (!alive) return;
      if (cached?.length) setMethodOptions(cached);

      if (!isOnline) return;

      setMethodLoading(true);
      try {
        const data = await geoGet<any>("/api/fishing-methods");
        const arr = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];

        const list: FishingMethodItem[] = arr
          .map((x: any) => {
            const id = toIntSafe(x?.id) || toIntSafe(x?.method_id) || 0;
            const name = String(x?.method_name ?? x?.name ?? "").trim();
            const code = String(x?.code ?? x?.method_code ?? "").trim() || null;
            const image_url = String(x?.image_url ?? x?.imageUrl ?? "").trim() || null;
            return { id, name, code, image_url };
          })
          .filter((x) => x.id && x.name);

        if (!alive) return;

        if (!list.length && !cached?.length) {
          const fallback = [
            { id: 1, name: "Pole & Line", code: "pole&line", image_url: null },
            { id: 2, name: "Hook & Line", code: "hook&line", image_url: null },
            { id: 3, name: "Longline", code: "longline", image_url: null },
            { id: 4, name: "Gillnet", code: "gillnet", image_url: null },
            { id: 5, name: "Trawling", code: "trawling", image_url: null },
          ];
          setMethodOptions(fallback);
          await writeListCache(FISHING_METHODS_CACHE_KEY, fallback);
          return;
        }

        setMethodOptions(list);
        await writeListCache(FISHING_METHODS_CACHE_KEY, list);

        if (methodSel?.id) {
          const still = list.find((m) => m.id === methodSel.id) || null;
          if (still) setMethodSel(still);
        }
      } catch {
        const fallback = [
          { id: 1, name: "Pole & Line", code: "pole&line", image_url: null },
          { id: 2, name: "Hook & Line", code: "hook&line", image_url: null },
          { id: 3, name: "Longline", code: "longline", image_url: null },
          { id: 4, name: "Gillnet", code: "gillnet", image_url: null },
          { id: 5, name: "Trawling", code: "trawling", image_url: null },
        ];
        if (!alive) return;
        if (!cached?.length) setMethodOptions(fallback);
      } finally {
        if (alive) setMethodLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  // ✅ fish types from backend (+ cache)
  useEffect(() => {
    let alive = true;

    (async () => {
      const cached = await readListCache<FishTypeItem>(FISH_TYPES_CACHE_KEY);
      if (!alive) return;
      if (cached?.length) setFishOptions(cached);

      if (!isOnline) return;

      setFishLoading(true);
      try {
        const data = await geoGet<any>("/api/fish-types");
        const arr = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];

        const list: FishTypeItem[] = arr
          .map((x: any) => {
            const id = toIntSafe(x?.id) || toIntSafe(x?.fish_id) || toIntSafe(x?.fishTypeId) || 0;
            const name = String(x?.name ?? x?.fish_name ?? "").trim();
            const code = String(x?.code ?? x?.fish_code ?? "").trim() || null;
            const image_url = String(x?.image_url ?? x?.imageUrl ?? x?.fish_type_url ?? "").trim() || null;
            return { id, name, code, image_url };
          })
          .filter((x) => x.id && x.name);

        if (!alive) return;

        setFishOptions(list);
        await writeListCache(FISH_TYPES_CACHE_KEY, list);

        if (fishSel?.id) {
          const still = list.find((f) => f.id === fishSel.id) || null;
          if (still) setFishSel(still);
        }
      } catch {
        // keep cache
      } finally {
        if (alive) setFishLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  // ✅ ONLY OWNER VESSELS (LIKE CATCHLOG) + ✅ APPROVED ONLY
  useEffect(() => {
    let alive = true;

    (async () => {
      setVessels([]);
      setVesselSel(null);

      const ownerDbIdHint = activeOwnerDbIdFromStore || ownerDbId;

      if (!ownerDbIdHint && !isOnline) return;

      let resolvedOwnerDbId = ownerDbIdHint;

      if (isOnline) {
        try {
          const userId =
            activeLoginUserId || (await getLastUserId(activeLoginUserId || undefined));

          if (userId) {
            const realOwnerId = await fetchOwnerDbIdFromUserId(userId, authTokenFromStore);
            if (realOwnerId && realOwnerId !== resolvedOwnerDbId) {
              resolvedOwnerDbId = realOwnerId;
              setOwnerDbId(realOwnerId);
            }
          }
        } catch {}
      }

      if (!resolvedOwnerDbId) return;

      const cached = await readVesselsCache(resolvedOwnerDbId);
      if (!alive) return;

      if (cached?.length) {
        setVessels(cached);
        if (cached.length === 1) setVesselSel(cached[0]);
      }

      if (!isOnline) return;

      setVesselsLoading(true);

      try {
        const data = await geoGet<any>(
          `/api/vessels/owner/${encodeURIComponent(String(resolvedOwnerDbId))}`,
        );

        const arr = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];

        const ownerOnly = arr.filter((x: any) => {
          const vOwner =
            toIntSafe(x?.owner_id) ||
            toIntSafe(x?.ownerId) ||
            toIntSafe(x?.owner_db_id) ||
            toIntSafe(x?.ownerDbId) ||
            0;

          return vOwner === resolvedOwnerDbId;
        });

        // ✅ FILTER: keep only APPROVED from API
        const approvedOnly = ownerOnly.filter((x: any) =>
          isApprovedStatus(x?.approval_status ?? x?.approvalStatus),
        );

        const list: VesselItem[] = approvedOnly
          .map((x: any) => {
            const id =
              toIntSafe(x?.id) ||
              toIntSafe(x?.vessel_id) ||
              toIntSafe(x?.vesselId) ||
              toIntSafe(x?.rv_vessel_id) ||
              0;

            const vesselName = String(x?.vessel_name ?? x?.vesselName ?? x?.name ?? "").trim();

            const govtReg = String(
              x?.govt_registration_number ??
                x?.govtRegistrationNumber ??
                x?.registration_number ??
                x?.registrationNo ??
                "",
            ).trim();

            const name = govtReg || vesselName || `Vessel ${id}`;
            const subName = vesselName && govtReg ? vesselName : "";

            const approval_status = String(x?.approval_status ?? x?.approvalStatus ?? "")
              .trim()
              .toUpperCase();

            return { id, name, subName, code: null, approval_status: approval_status || null };
          })
          .filter((v) => v.id && v.name && isApprovedStatus(v?.approval_status));

        if (!alive) return;

        setVessels(list);
        await writeVesselsCache(resolvedOwnerDbId, list);

        if (list.length === 1) setVesselSel(list[0]);
      } catch (e: any) {
        console.warn("[VESSEL FETCH]", String(e?.message || e));
      } finally {
        if (alive) setVesselsLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [ownerDbId, activeOwnerDbIdFromStore, activeLoginUserId, authTokenFromStore, isOnline]);

  // ✅ Load countries
  useEffect(() => {
    let alive = true;
    if (!isOnline) return;

    (async () => {
      setCountriesLoading(true);
      try {
        const data = await geoGet<any>("/api/country");
        const arr = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
        const list: CountryItem[] = arr
          .map((x: any) => ({
            id: toIntSafe(x?.id),
            name: String(x?.name || "").trim(),
            code: (String(x?.code || "").trim() || null) as any,
          }))
          .filter((x) => x.id && x.name);

        if (!alive) return;

        setCountries(list);

        // auto select first country
        if (!countrySel && list.length > 0) {
          setCountrySel(list[0]);
        }
      } catch (e: any) {
        console.warn("[COUNTRY FETCH]", String(e?.message || e));
      } finally {
        if (alive) setCountriesLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  // ✅ country -> states
  useEffect(() => {
    let alive = true;

    (async () => {
      setStateSel(null);
      setDistrictSel(null);
      setLocationSel(null);

      setStates([]);
      setDistricts([]);
      setLocations([]);

      if (!countrySel?.id) return;
      if (!isOnline) return;

      setStatesLoading(true);
      try {
        const data = await geoGet<any>(
          `/api/states/country/${encodeURIComponent(String(countrySel.id))}`,
        );

        const arr = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];

        const list: StateItem[] = arr
          .map((x: any) => ({
            id: toIntSafe(x?.id),
            name: String(x?.name || "").trim(),
            state_code: (String(x?.state_code || "").trim() || null) as any,

            country_id: toIntSafe(x?.country_id) || countrySel.id,
            country_name: (String(x?.country_name || "").trim() || null) as any,
            country_code: (String(x?.country_code || "").trim() || null) as any,
          }))
          .filter((x) => x.id && x.name);

        if (!alive) return;
        setStates(list);
      } catch (e: any) {
        console.warn("[STATES BY COUNTRY FETCH]", String(e?.message || e));
      } finally {
        if (alive) setStatesLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [countrySel?.id, isOnline]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setDistrictSel(null);
      setLocationSel(null);
      setDistricts([]);
      setLocations([]);

      if (!stateSel?.id) return;
      if (!isOnline) return;

      setDistrictsLoading(true);
      try {
        const data = await geoGet<any>(
          `/api/states/${encodeURIComponent(String(stateSel.id))}/districts`,
        );
        const arr = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
        const list: DistrictItem[] = arr
          .map((x: any) => ({
            id: Number(x.id),
            name: String(x.name || ""),
            district_code: x.district_code ?? null,
            state_id: Number(x.state_id || stateSel.id),
          }))
          .filter((x: any) => x.id && x.name);

        if (!alive) return;
        setDistricts(list);
      } catch (e: any) {
        console.warn("[DISTRICTS FETCH]", String(e?.message || e));
      } finally {
        if (alive) setDistrictsLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [stateSel?.id, isOnline]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLocationSel(null);
      setLocations([]);

      if (!districtSel?.id) return;
      if (!isOnline) return;

      setLocationsLoading(true);
      try {
        const data = await geoGet<any>(
          `/api/locations/district/${encodeURIComponent(String(districtSel.id))}`,
        );
        const arr = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
        const list: LocationItem[] = arr
          .map((x: any) => ({
            id: Number(x.id),
            name: String(x.name || ""),
            location_code: x.location_code ?? null,
            district_id: Number(x.district_id || districtSel.id),
            state_id: Number(x.state_id || stateSel?.id || 0),
            district_name: x.district_name,
            state_name: x.state_name,
          }))
          .filter((x: any) => x.id && x.name);

        if (!alive) return;
        setLocations(list);
      } catch (e: any) {
        console.warn("[LOCATIONS FETCH]", String(e?.message || e));
      } finally {
        if (alive) setLocationsLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [districtSel?.id, isOnline]);

  // ✅ Auto flush queue when online
  useEffect(() => {
    let alive = true;

    const refreshCount = async () => {
      const c = await getTripQueueCount();
      if (alive) setPendingCount(c);
    };

    const doFlush = async () => {
      if (!isOnline) return;
      if (!ownerCode) return;
      if (flushingRef.current) return;

      flushingRef.current = true;
      setSyncing(true);
      try {
        await patchOwnerCodeInTripQueue(ownerCode);

        await flushTripQueue(async (payload) => {
          if (!payload.owner_code) throw new Error("owner_code missing (waiting for /me)");
          await dispatch(createTripThunk(payload as any)).unwrap();
        });

        await refreshCount();
      } finally {
        flushingRef.current = false;
        if (alive) setSyncing(false);
      }
    };

    doFlush();

    return () => {
      alive = false;
    };
  }, [dispatch, isOnline, ownerCode]);

  // ✅ picker items
  const methodPickItems: FullPickItem[] = useMemo(() => {
    return (methodOptions || []).map((m) => ({
      key: String(m.id),
      label: m.name,
      subtitle: m.code ? `Code: ${m.code}` : "",
      imageUri: m.image_url || null,
    }));
  }, [methodOptions]);

  const fishPickItems: FullPickItem[] = useMemo(() => {
    return (fishOptions || []).map((f) => ({
      key: String(f.id),
      label: f.name,
      subtitle: f.code ? `Code: ${f.code}` : "",
      imageUri: f.image_url || null,
    }));
  }, [fishOptions]);

  const vesselPickItems: FullPickItem[] = useMemo(() => {
    return (vessels || []).map((v) => ({
      key: String(v.id),
      label: v.name,
      subtitle: v.subName ? v.subName : "",
      imageUri: null,
    }));
  }, [vessels]);

  const countryPickItems: FullPickItem[] = useMemo(() => {
    return (countries || []).map((c) => ({
      key: String(c.id),
      label: c.name,
      subtitle: c.code ? `Code: ${c.code}` : "",
      imageUri: null,
    }));
  }, [countries]);

  const statePickItems: FullPickItem[] = useMemo(() => {
    return (states || []).map((s) => ({
      key: String(s.id),
      label: s.name,
      subtitle: s.state_code ? `Code: ${s.state_code}` : "",
      imageUri: null,
    }));
  }, [states]);

  const districtPickItems: FullPickItem[] = useMemo(() => {
    return (districts || []).map((d) => ({
      key: String(d.id),
      label: d.name,
      subtitle: d.district_code ? `Code: ${d.district_code}` : "",
      imageUri: null,
    }));
  }, [districts]);

  const locationPickItems: FullPickItem[] = useMemo(() => {
    return (locations || []).map((l) => ({
      key: String(l.id),
      label: l.name,
      subtitle: l.location_code ? `Code: ${l.location_code}` : "",
      imageUri: null,
    }));
  }, [locations]);

  /* ---------------- SUBMIT (unchanged logic) ---------------- */
  const submit = async () => {
    if (!methodSel?.id) return Alert.alert(t.title, t.errMethod);
    if (!fishSel?.id) return Alert.alert(t.title, t.errFishSpecies);
    if (!vesselSel?.id) return Alert.alert(t.title, t.errVessel);

    if (!countrySel?.id) return Alert.alert(t.title, t.errCountry);
    if (!stateSel?.id) return Alert.alert(t.title, t.errState);
    if (!districtSel?.id) return Alert.alert(t.title, t.errDistrict);
    if (!locationSel?.id) return Alert.alert(t.title, t.errLocation);
    if (!plannedDT) return Alert.alert(t.title, t.errPlanned);

    let ownerFinal = String(ownerCode || "").trim();
    if (isOnline && !ownerFinal) {
      try {
        const fresh = await fetchMeFromApi(authTokenFromStore, activeLoginUserId || undefined);
        ownerFinal = String(fresh.ownerCode || "").trim();
        setOwnerName(fresh.ownerName);
        setRegistrationNo(fresh.registrationNo);
        setOwnerCode(fresh.ownerCode);
        setOwnerDbId(Number(fresh.ownerDbId || 0));
        await writeMeCache(fresh, activeLoginUserId || undefined);
      } catch {}
    }

    const methodCode = (methodSel?.code || mapMethodToApi(methodSel?.name || "") || "").trim();

    const payload: TripCreatePayload = {
      fishing_method: methodCode || mapMethodToApi(methodSel?.name || ""),

      ...(methodSel?.id ? ({ fishing_method_id: Number(methodSel.id) } as any) : {}),
      ...(fishSel?.id ? ({ fish_species: Number(fishSel.id) } as any) : {}),

      vessel_id: Number(vesselSel.id),

      near_station: String(locationSel.name || "").trim(),
      location_id: Number(locationSel.id),

      planned_at: toISO(plannedDT),
      arrival_at: expectedReturn ? toISOArrival(expectedReturn) : null,

      diesel: Number(dieselCost.toFixed(2)),
      ice: Number(iceCost.toFixed(2)),
      total: Number(totalCost.toFixed(2)),

      qr_count: Number(qrCount || 0),
      owner_code: ownerFinal || "",
      count: crewCount,

      ...({ approval_status: "pending" } as any),

      ...(INCLUDE_STATE_DISTRICT_IN_PAYLOAD
        ? {
            state_id: Number(locationSel.state_id),
            district_id: Number(locationSel.district_id),
          }
        : {}),
    };

    if (!isOnline || !ownerFinal) {
      await enqueueTrip({ ...payload, owner_code: ownerFinal || "" } as any);
      setPendingCount(await getTripQueueCount());

      createTripDummy({
        tripId: tripName,
        tripName,
        ownerName: ownerName || "—",
        ownerCode: ownerFinal || "—",
        registrationNo: registrationNo || "—",
        method: methodSel?.name || "",
        landingCenter: locationSel.name,
        locationCode: locationSel.name,
        plannedTripDateTime: plannedStr,
        expectedReturnDate: returnStr || null,
        crewCount,
        qrCount: Number(qrCount || 0),
        dieselLiters: toNum(dieselLiters),
        dieselRate: toNum(dieselRate),
        dieselCost,
        iceKg: toNum(iceKg),
        iceRate: toNum(iceRate),
        iceCost,
        totalCost,
        status: "pending",
        count: crewCount,
        fishSpecies: fishSel?.name || "",
      } as any);

      router.replace("/(wild)/trips" as const);
      Alert.alert(t.title, !isOnline ? t.savedOffline : t.errOwner);
      return;
    }

    try {
      setPosting(true);

      const created = await dispatch(createTripThunk(payload as any)).unwrap();

      router.replace("/(wild)/trips" as const);
      Alert.alert(
        t.sent,
        `${t.status}: ${created?.approval_status ?? "PENDING"}\n${t.totalCost}: ${money(totalCost)}`,
      );
    } catch (e: any) {
      const msg = String(e?.message || e);

      if (isNetworkishError(msg)) {
        await enqueueTrip(payload);
        setPendingCount(await getTripQueueCount());

        router.replace("/(wild)/trips" as const);
        Alert.alert(t.title, t.savedOffline);
        return;
      }

      router.replace("/(wild)/trips" as const);
      Alert.alert(t.apiFailDummy, msg);
    } finally {
      setPosting(false);
    }
  };

  /* ---------------- UI (Wizard / Step-by-step) ---------------- */
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fbf6f1" }}>
      {/* ✅ FULL SCREEN PICKERS (unchanged behavior) */}
      <FullScreenPickerModal
        visible={methodPickerOpen}
        title={t.fishingMethod}
        items={methodPickItems}
        selectedKey={methodSel?.id ? String(methodSel.id) : ""}
        mode="grid"
        numColumns={2}
        showImages={true}
        confirmLabel={NEXT_LABEL}
        searchPlaceholder="Search method..."
        insetsBottom={insets.bottom}
        onClose={() => setMethodPickerOpen(false)}
        onConfirm={(item) => {
          const id = toIntSafe(item.key);
          const picked = methodOptions.find((m) => m.id === id) || null;
          setMethodSel(picked);
          setMethodPickerOpen(false);
        }}
      />

      <FullScreenPickerModal
        visible={fishPickerOpen}
        title={t.fishSpecies}
        items={fishPickItems}
        selectedKey={fishSel?.id ? String(fishSel.id) : ""}
        mode="grid"
        numColumns={2}
        showImages={true}
        confirmLabel={NEXT_LABEL}
        searchPlaceholder="Search fish (e.g. tuna)..."
        insetsBottom={insets.bottom}
        onClose={() => setFishPickerOpen(false)}
        onConfirm={(item) => {
          const id = toIntSafe(item.key);
          const picked = fishOptions.find((f) => f.id === id) || null;
          setFishSel(picked);
          setFishPickerOpen(false);
        }}
      />

      <FullScreenPickerModal
        visible={vesselPickerOpen}
        title={t.vessel}
        items={vesselPickItems}
        selectedKey={vesselSel?.id ? String(vesselSel.id) : ""}
        mode="list"
        numColumns={2}
        showImages={false}
        confirmLabel={NEXT_LABEL}
        searchPlaceholder="Search vessel..."
        insetsBottom={insets.bottom}
        onClose={() => setVesselPickerOpen(false)}
        onConfirm={(item) => {
          const id = toIntSafe(item.key);
          const picked = vessels.find((v) => v.id === id) || null;
          setVesselSel(picked);
          setVesselPickerOpen(false);
        }}
      />

      <FullScreenPickerModal
        visible={countryPickerOpen}
        title={t.country}
        items={countryPickItems}
        selectedKey={countrySel?.id ? String(countrySel.id) : ""}
        mode="list"
        numColumns={2}
        showImages={false}
        confirmLabel={NEXT_LABEL}
        searchPlaceholder="Search country..."
        insetsBottom={insets.bottom}
        onClose={() => setCountryPickerOpen(false)}
        onConfirm={(item) => {
          const id = toIntSafe(item.key);
          const picked = countries.find((c) => c.id === id) || null;
          setCountrySel(picked);
          setCountryPickerOpen(false);
        }}
      />

      <FullScreenPickerModal
        visible={statePickerOpen}
        title={t.state}
        items={statePickItems}
        selectedKey={stateSel?.id ? String(stateSel.id) : ""}
        mode="list"
        numColumns={2}
        showImages={false}
        confirmLabel={NEXT_LABEL}
        searchPlaceholder="Search state..."
        insetsBottom={insets.bottom}
        onClose={() => setStatePickerOpen(false)}
        onConfirm={(item) => {
          const id = toIntSafe(item.key);
          const picked = states.find((s) => s.id === id) || null;
          setStateSel(picked);
          setStatePickerOpen(false);
        }}
      />

      <FullScreenPickerModal
        visible={districtPickerOpen}
        title={t.district}
        items={districtPickItems}
        selectedKey={districtSel?.id ? String(districtSel.id) : ""}
        mode="list"
        numColumns={2}
        showImages={false}
        confirmLabel={NEXT_LABEL}
        searchPlaceholder="Search district..."
        insetsBottom={insets.bottom}
        onClose={() => setDistrictPickerOpen(false)}
        onConfirm={(item) => {
          const id = toIntSafe(item.key);
          const picked = districts.find((d) => d.id === id) || null;
          setDistrictSel(picked);
          setDistrictPickerOpen(false);
        }}
      />

      <FullScreenPickerModal
        visible={locationPickerOpen}
        title={t.nearStation}
        items={locationPickItems}
        selectedKey={locationSel?.id ? String(locationSel.id) : ""}
        mode="list"
        numColumns={2}
        showImages={false}
        confirmLabel={NEXT_LABEL}
        searchPlaceholder="Search station..."
        insetsBottom={insets.bottom}
        onClose={() => setLocationPickerOpen(false)}
        onConfirm={(item) => {
          const id = toIntSafe(item.key);
          const picked = locations.find((l) => l.id === id) || null;
          setLocationSel(picked);
          setLocationPickerOpen(false);
        }}
      />

      {/* ======= CONTENT ======= */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 140 + insets.bottom,
        }}
      >
        {/* Title row + language toggle */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={{ fontSize: 20, fontWeight: "900", color: "#111827" }}>{t.title}</Text>
            <Text style={{ marginTop: 2, fontSize: 12, color: "#7a6f66" }}>
              {pendingCount > 0 ? `${t.pending}: ${pendingCount}` : ""}
              {syncing ? ` • ${t.syncing}` : ""}
              {vesselsLoading || methodLoading || fishLoading || countriesLoading || statesLoading || districtsLoading || locationsLoading
                ? ` • ${t.loading}`
                : ""}
            </Text>
          </View>

          <Pressable
            onPress={() => setLang((x) => (x === "ta" ? "en" : "ta"))}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: "#ead7c8",
              backgroundColor: "white",
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: "900", color: "#111827" }}>
              {lang === "ta" ? "English" : "தமிழ்"}
            </Text>
          </Pressable>
        </View>

        {/* Step header */}
        <StepHeader
          step={step}
          total={TOTAL_STEPS}
          title={stepMeta[step].title}
          sub={stepMeta[step].sub}
          icon={stepMeta[step].icon}
          isOnline={isOnline}
          onlineText={t.online}
          offlineText={t.offline}
        />

        {/* Owner card (simple) */}
        <View style={{ marginTop: 12 }}>
          <Card className="p-4">
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={{ fontSize: 12, color: "#7a6f66", fontWeight: "900" }}>{t.ownerName}</Text>
                <Text style={{ marginTop: 4, fontSize: 16, fontWeight: "900", color: "#111827" }}>
                  {ownerName || "—"}
                </Text>
                <Text style={{ marginTop: 4, fontSize: 12, color: "#7a6f66" }} numberOfLines={1}>
                  {registrationNo ? `${t.regNo}: ${registrationNo}` : ""}
                </Text>
              </View>

              <View style={{ alignItems: "flex-end" }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="key" size={16} color="#7a6f66" />
                  <Text style={{ marginLeft: 6, fontSize: 12, color: "#7a6f66" }}>
                    {ownerCode || "—"}
                  </Text>
                </View>
                <Text style={{ marginTop: 6, fontSize: 12, color: "#7a6f66" }}>
                  DB: {ownerDbId ? String(ownerDbId) : "—"}
                </Text>
              </View>
            </View>

            {meLoading ? (
              <View style={{ marginTop: 10, borderRadius: 12, backgroundColor: "#eff6ff", padding: 10, borderWidth: 1, borderColor: "#bfdbfe" }}>
                <Text style={{ fontSize: 12, fontWeight: "900", color: "#1e40af" }}>{t.meLoading}</Text>
              </View>
            ) : null}

            {meError ? (
              <View style={{ marginTop: 10, borderRadius: 12, backgroundColor: "#fff1f2", padding: 10, borderWidth: 1, borderColor: "#fecdd3" }}>
                <Text style={{ fontSize: 12, fontWeight: "900", color: "#9f1239" }}>
                  {t.meError}: {meError}
                </Text>
              </View>
            ) : null}
          </Card>
        </View>

        {/* ===== STEP 1 ===== */}
        {step === 1 ? (
          <View style={{ marginTop: 14 }}>
            <Text style={{ fontSize: 14, fontWeight: "900", color: "#7a6f66" }}>
              {lang === "ta" ? "முதலில் இவை 3 தேர்வு பண்ணுங்க" : "First choose these 3"}
            </Text>

            <BigPickRow
              icon="boat"
              title={t.vessel}
              value={
                vesselSel?.name
                  ? `${vesselSel.name}${vesselSel.subName ? ` • ${vesselSel.subName}` : ""}`
                  : ""
              }
              placeholder={lang === "ta" ? "வள்ளத்தை தேர்வு செய்ய தட்டுங்கள்" : "Tap to choose vessel"}
              onPress={() => setVesselPickerOpen(true)}
              helper={lang === "ta" ? "Approved vessel மட்டும் வரும்" : "Only APPROVED vessels shown"}
            />

            <BigPickRow
              icon="fish"
              title={t.fishingMethod}
              value={methodSel?.name || ""}
              placeholder={lang === "ta" ? "மீன்பிடி முறையை தேர்வு செய்ய தட்டுங்கள்" : "Tap to choose method"}
              onPress={() => setMethodPickerOpen(true)}
              helper={lang === "ta" ? "படம் இருந்தா காட்டும்" : "Shows image if available"}
            />

            <BigPickRow
              icon="nutrition"
              title={t.fishSpecies}
              value={fishSel?.name || ""}
              placeholder={lang === "ta" ? "மீன் வகையை தேர்வு செய்ய தட்டுங்கள்" : "Tap to choose fish"}
              onPress={() => setFishPickerOpen(true)}
              helper={lang === "ta" ? "மீன் பெயரை தேடி தேர்வு செய்யலாம்" : "You can search fish name"}
            />
          </View>
        ) : null}

        {/* ===== STEP 2 ===== */}
        {step === 2 ? (
          <View style={{ marginTop: 14 }}>
            <Text style={{ fontSize: 14, fontWeight: "900", color: "#7a6f66" }}>
              {lang === "ta" ? "இடம் தேர்வு பண்ணுங்க" : "Choose location"}
            </Text>

            <BigPickRow
              icon="flag"
              title={t.country}
              value={countrySel?.name || ""}
              placeholder={lang === "ta" ? "நாடு தேர்வு" : "Select country"}
              onPress={() => {
                if (!isOnline) return Alert.alert(t.title, t.savedOffline);
                setCountryPickerOpen(true);
              }}
              disabled={!isOnline}
              helper={
                !isOnline
                  ? lang === "ta"
                    ? "Net இல்லாமல் பட்டியல் வராது"
                    : "Need internet for lists"
                  : ""
              }
            />

            <BigPickRow
              icon="map"
              title={t.state}
              value={stateSel?.name || ""}
              placeholder={lang === "ta" ? "மாநிலம் தேர்வு" : "Select state"}
              onPress={() => {
                if (!countrySel?.id) return Alert.alert(t.title, t.errCountry);
                setStatePickerOpen(true);
              }}
              disabled={!countrySel?.id}
            />

            <BigPickRow
              icon="business"
              title={t.district}
              value={districtSel?.name || ""}
              placeholder={lang === "ta" ? "மாவட்டம் தேர்வு" : "Select district"}
              onPress={() => {
                if (!stateSel?.id) return Alert.alert(t.title, t.errState);
                setDistrictPickerOpen(true);
              }}
              disabled={!stateSel?.id}
            />

            <BigPickRow
              icon="location"
              title={t.nearStation}
              value={locationSel?.name || ""}
              placeholder={lang === "ta" ? "நிலையம் தேர்வு" : "Select station"}
              onPress={() => {
                if (!districtSel?.id) return Alert.alert(t.title, t.errDistrict);
                setLocationPickerOpen(true);
              }}
              disabled={!districtSel?.id}
              helper={
                locationSel
                  ? lang === "ta"
                    ? "நீங்க தேர்வு பண்ணின இடம்"
                    : "Chosen station"
                  : ""
              }
            />
          </View>
        ) : null}

        {/* ===== STEP 3 ===== */}
        {step === 3 ? (
          <View style={{ marginTop: 14 }}>
            <Text style={{ fontSize: 14, fontWeight: "900", color: "#7a6f66" }}>
              {lang === "ta" ? "தேதி/நேரம் + QR" : "Date/time + QR"}
            </Text>

            {/* Planned DateTime */}
            <Pressable
              onPress={() => setShowPlannedDate(true)}
              style={{
                marginTop: 12,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: "#e6d4c5",
                backgroundColor: "white",
                padding: 14,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <IconBubble name="calendar" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ fontSize: 13, fontWeight: "900", color: "#2b2b2b" }}>
                    {t.plannedTripDT}
                  </Text>
                  <Text
                    style={{
                      marginTop: 4,
                      fontSize: 18,
                      fontWeight: "900",
                      color: plannedStr ? "#111827" : "#9ca3af",
                    }}
                  >
                    {plannedStr || (lang === "ta" ? "தேதி/நேரம் தேர்வு" : "Select date & time")}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#7a6f66" />
              </View>
            </Pressable>

            {showPlannedDate && Platform.OS !== "web" && (
              <DateTimePicker
                value={plannedDT ?? new Date()}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(e, date) => {
                  if ((e as any).type === "dismissed") return setShowPlannedDate(false);
                  setShowPlannedDate(false);
                  if (date) {
                    const base = plannedDT ?? new Date();
                    const merged = new Date(date);
                    merged.setHours(base.getHours(), base.getMinutes(), 0, 0);
                    setPlannedDT(merged);
                    setShowPlannedTime(true);
                  }
                }}
              />
            )}

            {showPlannedTime && Platform.OS !== "web" && (
              <DateTimePicker
                value={plannedDT ?? new Date()}
                mode="time"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(e, date) => {
                  if ((e as any).type === "dismissed") return setShowPlannedTime(false);
                  setShowPlannedTime(false);
                  if (date) {
                    const base = plannedDT ?? new Date();
                    const merged = new Date(base);
                    merged.setHours(date.getHours(), date.getMinutes(), 0, 0);
                    setPlannedDT(merged);
                  }
                }}
              />
            )}

            {/* Expected return */}
            <Pressable
              onPress={() => setShowReturnPicker(true)}
              style={{
                marginTop: 12,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: "#e6d4c5",
                backgroundColor: "white",
                padding: 14,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <IconBubble name="time" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ fontSize: 13, fontWeight: "900", color: "#2b2b2b" }}>
                    {t.expectedReturn}
                  </Text>
                  <Text
                    style={{
                      marginTop: 4,
                      fontSize: 18,
                      fontWeight: "900",
                      color: returnStr ? "#111827" : "#9ca3af",
                    }}
                  >
                    {returnStr || (lang === "ta" ? "விருப்பம் (optional)" : "Optional")}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#7a6f66" />
              </View>
            </Pressable>

            {showReturnPicker && Platform.OS !== "web" && (
              <DateTimePicker
                value={expectedReturn ?? new Date()}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(e, date) => {
                  if ((e as any).type === "dismissed") return setShowReturnPicker(false);
                  setShowReturnPicker(false);
                  if (date) setExpectedReturn(date);
                }}
              />
            )}

            {/* QR Count */}
            <View
              style={{
                marginTop: 12,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: "#e6d4c5",
                backgroundColor: "white",
                padding: 14,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <IconBubble name="qr-code" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ fontSize: 13, fontWeight: "900", color: "#2b2b2b" }}>
                    {t.qrCount}
                  </Text>
                  <Text style={{ marginTop: 4, fontSize: 12, color: "#7a6f66" }}>{t.qrHelp}</Text>
                  <TextInput
                    value={qrCount}
                    onChangeText={(v) => setQrCount(onlyInt(v))}
                    placeholder={t.qrCountPH}
                    keyboardType={Platform.OS === "ios" ? "number-pad" : "numeric"}
                    inputMode="numeric"
                    style={{
                      marginTop: 8,
                      fontSize: 18,
                      fontWeight: "900",
                      color: "#111827",
                      borderWidth: 1,
                      borderColor: "#ead7c8",
                      borderRadius: 14,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      backgroundColor: "#fffaf5",
                    }}
                  />
                </View>
              </View>
            </View>
          </View>
        ) : null}

        {/* ===== STEP 4 ===== */}
        {step === 4 ? (
          <View style={{ marginTop: 14 }}>
            <Text style={{ fontSize: 14, fontWeight: "900", color: "#7a6f66" }}>
              {lang === "ta" ? "குழு + செலவு" : "Crew + Cost"}
            </Text>

            {/* Crew */}
            <View style={{ marginTop: 12, borderRadius: 18, borderWidth: 1, borderColor: "#e6d4c5", backgroundColor: "white", padding: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <IconBubble name="people" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ fontSize: 13, fontWeight: "900", color: "#2b2b2b" }}>{t.crewMembers}</Text>
                  <Text style={{ marginTop: 4, fontSize: 26, fontWeight: "900", color: "#111827" }}>{crewCount}</Text>
                  <Text style={{ marginTop: 4, fontSize: 12, color: "#7a6f66" }}>{t.crewHelp}</Text>
                </View>

                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Pressable
                    onPress={() => setCrewCount((c) => Math.max(0, c - 1))}
                    disabled={crewCount === 0}
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: 999,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1,
                      borderColor: "#ead7c8",
                      backgroundColor: "white",
                      opacity: crewCount === 0 ? 0.45 : 1,
                    }}
                  >
                    <Ionicons name="remove" size={22} color="#111827" />
                  </Pressable>

                  <View style={{ width: 12 }} />

                  <Pressable
                    onPress={() => setCrewCount((c) => c + 1)}
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: 999,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1,
                      borderColor: "#a06b2a",
                      backgroundColor: "#fff3e7",
                    }}
                  >
                    <Ionicons name="add" size={22} color="#7a4a12" />
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Diesel */}
            <View style={{ marginTop: 12, borderRadius: 18, borderWidth: 1, borderColor: "#e6d4c5", backgroundColor: "white", padding: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <IconBubble name="flame" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ fontSize: 13, fontWeight: "900", color: "#2b2b2b" }}>{t.diesel}</Text>

                  <View style={{ flexDirection: "row", marginTop: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, color: "#7a6f66", fontWeight: "900" }}>{t.liters}</Text>
                      <TextInput
                        value={dieselLiters}
                        onChangeText={(v) => setDieselLiters(onlyDecimal(v))}
                        placeholder="e.g. 120"
                        keyboardType={Platform.OS === "ios" ? "decimal-pad" : "numeric"}
                        inputMode="decimal"
                        style={{
                          marginTop: 6,
                          fontSize: 18,
                          fontWeight: "900",
                          color: "#111827",
                          borderWidth: 1,
                          borderColor: "#ead7c8",
                          borderRadius: 14,
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          backgroundColor: "#fffaf5",
                        }}
                      />
                    </View>

                    <View style={{ width: 10 }} />

                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, color: "#7a6f66", fontWeight: "900" }}>{t.ratePerLiter}</Text>
                      <TextInput
                        value={dieselRate}
                        onChangeText={(v) => setDieselRate(onlyDecimal(v))}
                        placeholder="e.g. 95"
                        keyboardType={Platform.OS === "ios" ? "decimal-pad" : "numeric"}
                        inputMode="decimal"
                        style={{
                          marginTop: 6,
                          fontSize: 18,
                          fontWeight: "900",
                          color: "#111827",
                          borderWidth: 1,
                          borderColor: "#ead7c8",
                          borderRadius: 14,
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          backgroundColor: "#fffaf5",
                        }}
                      />
                    </View>
                  </View>

                  <View style={{ marginTop: 10, borderRadius: 14, backgroundColor: "#fff3e7", padding: 10, borderWidth: 1, borderColor: "#ffd9b6" }}>
                    <Text style={{ fontSize: 14, fontWeight: "900", color: "#7a4a12" }}>
                      {t.dieselCost}: {money(dieselCost)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Ice */}
            <View style={{ marginTop: 12, borderRadius: 18, borderWidth: 1, borderColor: "#e6d4c5", backgroundColor: "white", padding: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <IconBubble name="snow" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ fontSize: 13, fontWeight: "900", color: "#2b2b2b" }}>{t.ice}</Text>

                  <View style={{ flexDirection: "row", marginTop: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, color: "#7a6f66", fontWeight: "900" }}>{t.kg}</Text>
                      <TextInput
                        value={iceKg}
                        onChangeText={(v) => setIceKg(onlyDecimal(v))}
                        placeholder="e.g. 60"
                        keyboardType={Platform.OS === "ios" ? "decimal-pad" : "numeric"}
                        inputMode="decimal"
                        style={{
                          marginTop: 6,
                          fontSize: 18,
                          fontWeight: "900",
                          color: "#111827",
                          borderWidth: 1,
                          borderColor: "#ead7c8",
                          borderRadius: 14,
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          backgroundColor: "#fffaf5",
                        }}
                      />
                    </View>

                    <View style={{ width: 10 }} />

                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, color: "#7a6f66", fontWeight: "900" }}>{t.ratePerKg}</Text>
                      <TextInput
                        value={iceRate}
                        onChangeText={(v) => setIceRate(onlyDecimal(v))}
                        placeholder="e.g. 15"
                        keyboardType={Platform.OS === "ios" ? "decimal-pad" : "numeric"}
                        inputMode="decimal"
                        style={{
                          marginTop: 6,
                          fontSize: 18,
                          fontWeight: "900",
                          color: "#111827",
                          borderWidth: 1,
                          borderColor: "#ead7c8",
                          borderRadius: 14,
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          backgroundColor: "#fffaf5",
                        }}
                      />
                    </View>
                  </View>

                  <View style={{ marginTop: 10, borderRadius: 14, backgroundColor: "#fff3e7", padding: 10, borderWidth: 1, borderColor: "#ffd9b6" }}>
                    <Text style={{ fontSize: 14, fontWeight: "900", color: "#7a4a12" }}>
                      {t.iceCost}: {money(iceCost)}
                    </Text>
                  </View>

                  <View style={{ marginTop: 12, borderRadius: 18, backgroundColor: "#fff3e7", padding: 12, borderWidth: 1, borderColor: "#a06b2a" }}>
                    <Text style={{ fontSize: 12, color: "#7a4a12", fontWeight: "900" }}>{t.totalCost}</Text>
                    <Text style={{ marginTop: 4, fontSize: 22, fontWeight: "900", color: "#111827" }}>
                      {money(totalCost)}
                    </Text>
                    <Text style={{ marginTop: 4, fontSize: 12, color: "#7a6f66" }}>{t.totalHelp}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        ) : null}

        {/* ===== STEP 5 ===== */}
        {step === 5 ? (
          <View style={{ marginTop: 14 }}>
            <Text style={{ fontSize: 14, fontWeight: "900", color: "#7a6f66" }}>
              {lang === "ta" ? "சரிபார்த்து Submit பண்ணுங்க" : "Review and submit"}
            </Text>

            <View style={{ marginTop: 12, borderRadius: 18, borderWidth: 1, borderColor: "#e6d4c5", backgroundColor: "white", padding: 14 }}>
              <ReviewRow icon="receipt" label={t.tripName} value={tripName} />
              <ReviewRow
                icon="boat"
                label={t.vessel}
                value={
                  vesselSel?.name
                    ? `${vesselSel.name}${vesselSel.subName ? ` • ${vesselSel.subName}` : ""}`
                    : ""
                }
              />
              <ReviewRow icon="fish" label={t.fishingMethod} value={methodSel?.name || ""} />
              <ReviewRow icon="nutrition" label={t.fishSpecies} value={fishSel?.name || ""} />
              <ReviewRow icon="location" label={t.nearStation} value={locationSel?.name || ""} />
              <ReviewRow icon="calendar" label={t.plannedTripDT} value={plannedStr || ""} />
              <ReviewRow icon="time" label={t.expectedReturn} value={returnStr || (lang === "ta" ? "விருப்பம்" : "Optional")} />
              <ReviewRow icon="qr-code" label={t.qrCount} value={qrCount || "0"} />
              <ReviewRow icon="people" label={t.crewMembers} value={String(crewCount)} />
              <ReviewRow icon="cash" label={t.totalCost} value={money(totalCost)} />

              <View style={{ marginTop: 14, borderTopWidth: 1, borderTopColor: "#f1e5da", paddingTop: 12 }}>
                <Text style={{ fontSize: 12, color: "#7a6f66" }}>
                  {lang === "ta"
                    ? "Online இருந்தா serverக்கு போகும். Offline இருந்தா local-ல save ஆகும்."
                    : "If online it posts to server. If offline it saves locally."}
                </Text>
              </View>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* ======= BOTTOM ACTION BAR (big buttons) ======= */}
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: 16,
          paddingTop: 10,
          paddingBottom: 12 + insets.bottom,
          backgroundColor: "rgba(251,246,241,0.96)",
          borderTopWidth: 1,
          borderTopColor: "#ead7c8",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Pressable
            onPress={goBackStep}
            disabled={posting}
            style={{
              flex: 1,
              height: 56,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: "#ead7c8",
              backgroundColor: "white",
              alignItems: "center",
              justifyContent: "center",
              opacity: posting ? 0.6 : 1,
              flexDirection: "row",
            }}
          >
            <Ionicons name="arrow-back" size={20} color="#111827" />
            <View style={{ width: 8 }} />
            <Text style={{ fontSize: 16, fontWeight: "900", color: "#111827" }}>
              {lang === "ta" ? "பின்" : "Back"}
            </Text>
          </Pressable>

          <View style={{ width: 12 }} />

          {step < TOTAL_STEPS ? (
            <Pressable
              onPress={goNext}
              disabled={posting}
              style={{
                flex: 1,
                height: 56,
                borderRadius: 18,
                backgroundColor: "#a06b2a",
                alignItems: "center",
                justifyContent: "center",
                opacity: posting ? 0.6 : 1,
                flexDirection: "row",
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "900", color: "white" }}>
                {lang === "ta" ? "அடுத்து" : "Next"}
              </Text>
              <View style={{ width: 8 }} />
              <Ionicons name="arrow-forward" size={20} color="white" />
            </Pressable>
          ) : (
            <Pressable
              onPress={submit}
              disabled={posting}
              style={{
                flex: 1,
                height: 56,
                borderRadius: 18,
                backgroundColor: "#16a34a",
                alignItems: "center",
                justifyContent: "center",
                opacity: posting ? 0.6 : 1,
                flexDirection: "row",
              }}
            >
              <Ionicons name="checkmark-circle" size={22} color="white" />
              <View style={{ width: 8 }} />
              <Text style={{ fontSize: 16, fontWeight: "900", color: "white" }}>
                {posting ? "..." : t.submit}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}