import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

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

/* ---------------- API ---------------- */
const API_BASE = "https://rootverse-backend-5qoo.onrender.com";
const ME_CACHE_KEY = "RV_ME_CACHE_V1";
const LAST_USER_ID_KEY = "RV_LAST_USER_ID_V1";

// ✅ caches for backend lists
const FISHING_METHODS_CACHE_KEY = "RV_FISHING_METHODS_CACHE_V1";
const FISH_TYPES_CACHE_KEY = "RV_FISH_TYPES_CACHE_V1";

type MeCache = {
  ownerName: string;
  registrationNo: string;
  ownerCode: string;
  ownerDbId: number;
};

async function readMeCache(): Promise<MeCache | null> {
  try {
    const raw = await AsyncStorage.getItem(ME_CACHE_KEY);
    if (!raw) {
      // fallback keys
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
async function writeMeCache(data: MeCache) {
  try {
    await AsyncStorage.setItem(ME_CACHE_KEY, JSON.stringify(data));
  } catch {}
}

async function fetchMeFromApi(): Promise<MeCache> {
  const token = await AsyncStorage.getItem("auth_token");
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
      await AsyncStorage.setItem(LAST_USER_ID_KEY, String(userId));
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
type StateItem = { id: number; name: string; state_code?: string | null };
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
    return Array.isArray(parsed) ? (parsed as VesselItem[]) : null;
  } catch {
    return null;
  }
}

async function writeVesselsCache(ownerDbId: number, items: VesselItem[]) {
  try {
    await AsyncStorage.setItem(`${VESSEL_CACHE_PREFIX}${ownerDbId}`, JSON.stringify(items));
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
async function getAuthHeaders() {
  const token = await AsyncStorage.getItem("auth_token");
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
async function getLastUserId(): Promise<number> {
  const raw = await AsyncStorage.getItem(LAST_USER_ID_KEY);
  const n = toIntSafe(raw);
  return n > 0 ? n : 0;
}

async function fetchOwnerDbIdFromUserId(userId: number): Promise<number> {
  const headers = await getAuthHeaders();
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

/* ---------------- BottomSheet generic picker ---------------- */
type PickerBase = {
  id: number;
  name: string;
  code?: string | null;
  subName?: string; // vessel_name
  image_url?: string | null; // ✅ NEW (methods/fish types)
};

function EntityPickerSheet<T extends PickerBase>({
  title,
  value,
  options,
  loading,
  onSelect,
  sheetRef,
  emptyText,
}: {
  title: string;
  value: T | null;
  options: T[];
  loading?: boolean;
  onSelect: (v: T) => void;
  sheetRef: React.RefObject<BottomSheetModal>;
  emptyText?: string;
}) {
  const snapPoints = useMemo(() => ["45%", "75%"], []);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return options;
    return options.filter(
      (x) =>
        x.name.toLowerCase().includes(t) ||
        String(x.subName || "").toLowerCase().includes(t) ||
        String(x.code || "").toLowerCase().includes(t),
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
          <Text className="text-base font-bold text-[#2b2b2b]">{title}</Text>
          <Pressable
            onPress={() => sheetRef.current?.dismiss()}
            className="rounded-full px-3 py-2 active:opacity-80"
          >
            <Text className="text-sm font-semibold text-[#a06b2a]">Done</Text>
          </Pressable>
        </View>

        <View className="mt-3 rounded-xl border border-[#ead7c8] bg-[#fbf6f1] px-3 py-2">
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search..."
            className="text-base text-[#2b2b2b]"
          />
        </View>

        <ScrollView className="mt-3" keyboardShouldPersistTaps="handled">
          {loading ? (
            <View className="py-6 items-center">
              <Text className="text-sm text-[#7a6f66]">Loading...</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View className="py-6 items-center">
              <Text className="text-sm text-[#7a6f66]">{emptyText || "No data"}</Text>
            </View>
          ) : (
            filtered.map((item) => {
              const active = item.id === value?.id;
              return (
                <Pressable
                  key={String(item.id)}
                  onPress={() => {
                    onSelect(item);
                    sheetRef.current?.dismiss();
                  }}
                  className={`mb-2 rounded-xl border px-4 py-3 active:opacity-80 ${
                    active ? "border-[#a06b2a] bg-[#fff3e7]" : "border-[#ead7c8] bg-white"
                  }`}
                >
                  <View className="flex-row items-center">
                    {item.image_url ? (
                      <Image
                        source={{ uri: String(item.image_url) }}
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 10,
                          marginRight: 10,
                          backgroundColor: "#f2e8df",
                        }}
                        resizeMode="cover"
                      />
                    ) : null}

                    <View className="flex-1">
                      <Text
                        className={`text-sm font-semibold ${
                          active ? "text-[#7a4a12]" : "text-[#2b2b2b]"
                        }`}
                      >
                        {item.name}
                      </Text>

                      {item.subName ? (
                        <Text className="mt-1 text-[11px] text-[#7a6f66]">{item.subName}</Text>
                      ) : null}

                      {item.code ? (
                        <Text className="mt-1 text-[11px] text-[#7a6f66]">Code: {item.code}</Text>
                      ) : null}
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </BottomSheetView>
    </BottomSheetModal>
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

/* ---------------- SCREEN ---------------- */
export default function NewTripRequest() {
  const dispatch = useAppDispatch();

  const [lang, setLang] = useState<Lang>("ta");
  const t = i18n[lang];

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

  const dieselCost = useMemo(() => toNum(dieselLiters) * toNum(dieselRate), [dieselLiters, dieselRate]);
  const iceCost = useMemo(() => toNum(iceKg) * toNum(iceRate), [iceKg, iceRate]);
  const totalCost = useMemo(() => dieselCost + iceCost, [dieselCost, iceCost]);

  const plannedStr = plannedDT ? formatDateTime(plannedDT) : "";
  const returnStr = expectedReturn ? formatDateTime(expectedReturn).split(" ")[0] : "";

  const [posting, setPosting] = useState(false);

  const globalNetworkState = useAppSelector((s: any) => s.network?.isOnline ?? true);
  const [isOnline, setIsOnline] = useState<boolean>(() => globalNetworkState);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const methodRef = useRef<BottomSheetModal>(null) as React.RefObject<BottomSheetModal>;
  const fishRef = useRef<BottomSheetModal>(null) as React.RefObject<BottomSheetModal>;
  const vesselRef = useRef<BottomSheetModal>(null) as React.RefObject<BottomSheetModal>;
  const stateRef = useRef<BottomSheetModal>(null) as React.RefObject<BottomSheetModal>;
  const districtRef = useRef<BottomSheetModal>(null) as React.RefObject<BottomSheetModal>;
  const locationRef = useRef<BottomSheetModal>(null) as React.RefObject<BottomSheetModal>;

  const flushingRef = useRef(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const cached = await readMeCache();
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
  }, []);

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

    if (ownerCode && ownerDbId) return;

    (async () => {
      setMeLoading(true);
      setMeError(null);
      try {
        const fresh = await fetchMeFromApi();
        if (!alive) return;
        setOwnerName(fresh.ownerName);
        setRegistrationNo(fresh.registrationNo);
        setOwnerCode(fresh.ownerCode);
        setOwnerDbId(Number(fresh.ownerDbId || 0));
        await writeMeCache(fresh);

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
  }, [isOnline, ownerCode, ownerDbId]);

  // ✅ fishing methods from backend (+ cache)
  useEffect(() => {
    let alive = true;

    (async () => {
      // show cache instantly
      const cached = await readListCache<FishingMethodItem>(FISHING_METHODS_CACHE_KEY);
      if (!alive) return;
      if (cached?.length) {
        setMethodOptions(cached);
      }

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

        // fallback if backend returns empty
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

        // keep selection valid (if already selected)
        if (methodSel?.id) {
          const still = list.find((m) => m.id === methodSel.id) || null;
          if (still) setMethodSel(still);
        }
      } catch (e: any) {
        // hard fallback if no cache and request fails
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
      } catch (e: any) {
        // no fake fallback here; use cache only if exists
      } finally {
        if (alive) setFishLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  // ✅ ONLY OWNER VESSELS (LIKE CATCHLOG): userId -> ownerDbId -> vessels
  useEffect(() => {
    let alive = true;

    (async () => {
      setVessels([]);
      setVesselSel(null);

      if (!ownerDbId && !isOnline) return;

      let resolvedOwnerDbId = ownerDbId;

      if (isOnline) {
        try {
          const userId = await getLastUserId();
          if (userId) {
            const realOwnerId = await fetchOwnerDbIdFromUserId(userId);
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

        const list: VesselItem[] = ownerOnly
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

            return { id, name, subName, code: null };
          })
          .filter((v) => v.id && v.name);

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
  }, [ownerDbId, isOnline]);

  useEffect(() => {
    let alive = true;
    if (!isOnline) return;

    (async () => {
      setStatesLoading(true);
      try {
        const data = await geoGet<any>("/api/states");
        const arr = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
        const list: StateItem[] = arr
          .map((x: any) => ({
            id: Number(x.id),
            name: String(x.name || ""),
            state_code: x.state_code ?? null,
          }))
          .filter((x: any) => x.id && x.name);

        if (!alive) return;
        setStates(list);
      } catch (e: any) {
        console.warn("[STATES FETCH]", String(e?.message || e));
      } finally {
        if (alive) setStatesLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [isOnline]);

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

  const submit = async () => {
    if (!methodSel?.id) return Alert.alert(t.title, t.errMethod);
    if (!fishSel?.id) return Alert.alert(t.title, t.errFishSpecies);
    if (!vesselSel?.id) return Alert.alert(t.title, t.errVessel);

    if (!stateSel?.id) return Alert.alert(t.title, t.errState);
    if (!districtSel?.id) return Alert.alert(t.title, t.errDistrict);
    if (!locationSel?.id) return Alert.alert(t.title, t.errLocation);
    if (!plannedDT) return Alert.alert(t.title, t.errPlanned);

    let ownerFinal = String(ownerCode || "").trim();
    if (isOnline && !ownerFinal) {
      try {
        const fresh = await fetchMeFromApi();
        ownerFinal = String(fresh.ownerCode || "").trim();
        setOwnerName(fresh.ownerName);
        setRegistrationNo(fresh.registrationNo);
        setOwnerCode(fresh.ownerCode);
        setOwnerDbId(Number(fresh.ownerDbId || 0));
        await writeMeCache(fresh);
      } catch {}
    }

    const methodCode = (methodSel?.code || mapMethodToApi(methodSel?.name || "") || "").trim();

    const payload: TripCreatePayload = {
      // ✅ keep old field for compatibility
      fishing_method: methodCode || mapMethodToApi(methodSel?.name || ""),

      // ✅ new backend-required ids
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

      // ✅ keep approval_status (backend example)
      ...( { approval_status: "pending" } as any ),

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

  return (
    <View className="flex-1 bg-[#fbf6f1]">
      <EntityPickerSheet
        title={t.fishingMethod}
        value={methodSel as any}
        options={methodOptions as any}
        loading={methodLoading}
        onSelect={(v: any) => setMethodSel(v)}
        sheetRef={methodRef}
        emptyText={t.noData}
      />

      <EntityPickerSheet
        title={t.fishSpecies}
        value={fishSel as any}
        options={fishOptions as any}
        loading={fishLoading}
        onSelect={(v: any) => setFishSel(v)}
        sheetRef={fishRef}
        emptyText={t.noData}
      />

      <EntityPickerSheet
        title={t.vessel}
        value={vesselSel as any}
        options={vessels as any}
        loading={vesselsLoading}
        onSelect={(v: any) => setVesselSel(v)}
        sheetRef={vesselRef}
        emptyText={t.noData}
      />

      <EntityPickerSheet
        title={t.state}
        value={stateSel as any}
        options={states.map((s) => ({ ...s, code: s.state_code ?? null })) as any}
        loading={statesLoading}
        onSelect={(v: any) => setStateSel(v)}
        sheetRef={stateRef}
        emptyText={t.noData}
      />
      <EntityPickerSheet
        title={t.district}
        value={districtSel as any}
        options={districts.map((d) => ({ ...d, code: d.district_code ?? null })) as any}
        loading={districtsLoading}
        onSelect={(v: any) => setDistrictSel(v)}
        sheetRef={districtRef}
        emptyText={t.noData}
      />
      <EntityPickerSheet
        title={t.nearStation}
        value={locationSel as any}
        options={locations.map((l) => ({ ...l, code: l.location_code ?? null })) as any}
        loading={locationsLoading}
        onSelect={(v: any) => setLocationSel(v)}
        sheetRef={locationRef}
        emptyText={t.noData}
      />

      <ScrollView contentContainerClassName="p-4 pb-10">
        <View className="mb-3 flex-row items-center justify-between">
          <View>
            <Text className="text-lg font-bold text-[#2b2b2b]">{t.title}</Text>

            <View className="mt-1 flex-row items-center gap-2">
              <View
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: isOnline ? "#10b981" : "#f59e0b" }}
              />
              <Text
                className="text-xs font-semibold"
                style={{ color: isOnline ? "#047857" : "#92400e" }}
              >
                {isOnline ? t.online : t.offline}
              </Text>
              {syncing ? (
                <Text className="text-[11px] text-[#7a6f66]"> • {t.syncing}</Text>
              ) : null}
            </View>

            {meLoading ? (
              <View className="mt-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2">
                <Text className="text-xs font-semibold text-blue-800">{t.meLoading}</Text>
              </View>
            ) : null}

            {meError ? (
              <View className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
                <Text className="text-xs font-semibold text-rose-800">
                  {t.meError}: {meError}
                </Text>
              </View>
            ) : null}

            {pendingCount > 0 ? (
              <View className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                <Text className="text-xs font-semibold text-amber-800">
                  {t.pending}: {pendingCount} {isOnline ? "" : "(offline)"}
                </Text>
              </View>
            ) : null}
          </View>

          <Pressable
            onPress={() => setLang((x) => (x === "ta" ? "en" : "ta"))}
            className="rounded-full border border-[#ead7c8] bg-white px-3 py-2 active:opacity-80"
          >
            <Text className="text-xs font-semibold text-[#2b2b2b]">
              {lang === "ta" ? "English" : "தமிழ்"}
            </Text>
          </Pressable>
        </View>

        <Card className="p-4">
          <View className="flex-row justify-between">
            <View>
              <Label>{t.ownerName}:</Label>
              <Text className="mt-1 text-sm font-semibold text-[#2b2b2b]">{ownerName || "—"}</Text>
              <Text className="mt-1 text-[11px] text-[#7a6f66]">
                Owner Code: {ownerCode || "—"} | Owner DB ID: {ownerDbId ? String(ownerDbId) : "—"}
              </Text>
            </View>
            <View>
              <Label>{t.regNo}:</Label>
              <Text className="mt-1 text-sm font-semibold text-[#2b2b2b]">
                {registrationNo || "—"}
              </Text>
            </View>
          </View>
        </Card>

        <View className="mt-4">
          <Text className="text-base font-bold text-[#2b2b2b]">{t.tripDetails}</Text>

          <Card className="mt-3 p-4">
            <Label>{t.tripName}</Label>
            <FieldBox>
              <Text className="text-base text-[#2b2b2b]">{tripName}</Text>
            </FieldBox>

            <View className="mt-3">
              <FieldBox>
                <Pressable onPress={() => vesselRef.current?.present()} className="active:opacity-80">
                  <Label>{t.vessel}</Label>

                  <Text
                    className={`mt-1 text-base ${
                      vesselSel ? "text-[#2b2b2b]" : "text-[#b1a59a]"
                    }`}
                  >
                    {vesselSel?.name || t.select}
                  </Text>

                  {vesselSel?.subName ? (
                    <Text className="mt-1 text-[11px] text-[#7a6f66]">{vesselSel.subName}</Text>
                  ) : null}

                  <Text className="mt-1 text-[11px] text-[#b1a59a]">{t.tapToSelect}</Text>
                </Pressable>
              </FieldBox>
            </View>

            <View className="mt-3">
              <FieldBox>
                <Pressable onPress={() => methodRef.current?.present()} className="active:opacity-80">
                  <Label>{t.fishingMethod}</Label>

                  <View className="flex-row items-center mt-1">
                    {methodSel?.image_url ? (
                      <Image
                        source={{ uri: String(methodSel.image_url) }}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 10,
                          marginRight: 10,
                          backgroundColor: "#f2e8df",
                        }}
                        resizeMode="cover"
                      />
                    ) : null}
                    <Text
                      className={`text-base ${
                        methodSel ? "text-[#2b2b2b]" : "text-[#b1a59a]"
                      }`}
                    >
                      {methodSel?.name || t.select}
                    </Text>
                  </View>

                  <Text className="mt-1 text-[11px] text-[#b1a59a]">{t.tapToSelect}</Text>
                </Pressable>
              </FieldBox>
            </View>

            {/* ✅ NEW: Fish species picker */}
            <View className="mt-3">
              <FieldBox>
                <Pressable onPress={() => fishRef.current?.present()} className="active:opacity-80">
                  <Label>{t.fishSpecies}</Label>

                  <View className="flex-row items-center mt-1">
                    {fishSel?.image_url ? (
                      <Image
                        source={{ uri: String(fishSel.image_url) }}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 10,
                          marginRight: 10,
                          backgroundColor: "#f2e8df",
                        }}
                        resizeMode="cover"
                      />
                    ) : null}
                    <Text
                      className={`text-base ${
                        fishSel ? "text-[#2b2b2b]" : "text-[#b1a59a]"
                      }`}
                    >
                      {fishSel?.name || t.select}
                    </Text>
                  </View>

                  {fishSel?.code ? (
                    <Text className="mt-1 text-[11px] text-[#7a6f66]">Code: {fishSel.code}</Text>
                  ) : null}

                  <Text className="mt-1 text-[11px] text-[#b1a59a]">{t.tapToSelect}</Text>
                </Pressable>
              </FieldBox>
            </View>

            <View className="mt-3">
              <FieldBox>
                <Pressable onPress={() => stateRef.current?.present()} className="active:opacity-80">
                  <Label>{t.state}</Label>
                  <Text
                    className={`mt-1 text-base ${
                      stateSel ? "text-[#2b2b2b]" : "text-[#b1a59a]"
                    }`}
                  >
                    {stateSel?.name || t.select}
                  </Text>
                </Pressable>
              </FieldBox>
            </View>

            <View className="mt-3">
              <FieldBox>
                <Pressable
                  onPress={() => {
                    if (!stateSel?.id) return Alert.alert(t.title, t.errState);
                    districtRef.current?.present();
                  }}
                  className="active:opacity-80"
                >
                  <Label>{t.district}</Label>
                  <Text
                    className={`mt-1 text-base ${
                      districtSel ? "text-[#2b2b2b]" : "text-[#b1a59a]"
                    }`}
                  >
                    {districtSel?.name || t.select}
                  </Text>
                </Pressable>
              </FieldBox>
            </View>

            <View className="mt-3">
              <FieldBox>
                <Pressable
                  onPress={() => {
                    if (!districtSel?.id) return Alert.alert(t.title, t.errDistrict);
                    locationRef.current?.present();
                  }}
                  className="active:opacity-80"
                >
                  <Label>{t.nearStation}</Label>
                  <Text
                    className={`mt-1 text-base ${
                      locationSel ? "text-[#2b2b2b]" : "text-[#b1a59a]"
                    }`}
                  >
                    {locationSel?.name || t.select}
                  </Text>

                  {locationSel ? (
                    <Text className="mt-1 text-[11px] text-[#7a6f66]">
                      Payload near_station(name): {locationSel.name} | payload location_id:{" "}
                      {locationSel.id} | derived state_id: {locationSel.state_id} | derived
                      district_id: {locationSel.district_id}
                    </Text>
                  ) : (
                    <Text className="mt-1 text-[11px] text-[#b1a59a]">{t.tapToSelect}</Text>
                  )}
                </Pressable>
              </FieldBox>
            </View>

            <View className="mt-3">
              <FieldBox>
                <Pressable
                  onPress={() => setShowPlannedDate(true)}
                  className="active:opacity-80"
                >
                  <Label>{t.plannedTripDT}</Label>
                  <Text
                    className={`mt-1 text-base ${
                      plannedStr ? "text-[#2b2b2b]" : "text-[#b1a59a]"
                    }`}
                  >
                    {plannedStr || t.select}
                  </Text>
                </Pressable>
              </FieldBox>

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
            </View>
          </Card>
        </View>

        <View className="mt-4">
          <Text className="text-base font-bold text-[#2b2b2b]">{t.crewDetails}</Text>

          <Card className="mt-3 p-4">
            <View className="flex-row items-start">
              <View className="flex-1 pr-3">
                <Text className="text-sm font-semibold text-[#2b2b2b]" numberOfLines={1}>
                  {t.crewMembers}: {crewCount}
                </Text>
                <Text className="mt-1 text-[11px] text-[#7a6f66]" numberOfLines={2}>
                  {t.crewHelp}
                </Text>
              </View>

              <View className="flex-row items-center">
                <Pressable
                  onPress={() => setCrewCount((c) => Math.max(0, c - 1))}
                  disabled={crewCount === 0}
                  className="h-10 w-10 items-center justify-center rounded-full border border-[#ead7c8] bg-white active:opacity-80"
                  style={{ opacity: crewCount === 0 ? 0.45 : 1 }}
                >
                  <Text className="text-base font-extrabold text-[#2b2b2b]">−</Text>
                </Pressable>

                <View style={{ width: 10 }} />

                <Pressable
                  onPress={() => setCrewCount((c) => c + 1)}
                  className="h-10 w-10 items-center justify-center rounded-full border border-[#a06b2a] bg-[#fff3e7] active:opacity-80"
                >
                  <Text className="text-base font-extrabold text-[#7a4a12]">+</Text>
                </Pressable>
              </View>
            </View>
          </Card>
        </View>

        <View className="mt-4">
          <Text className="text-base font-bold text-[#2b2b2b]">{t.planning}</Text>

          <Card className="mt-3 p-4">
            <FieldBox>
              <Pressable onPress={() => setShowReturnPicker(true)} className="active:opacity-80">
                <Label>{t.expectedReturn}</Label>
                <Text
                  className={`mt-1 text-base ${
                    returnStr ? "text-[#2b2b2b]" : "text-[#b1a59a]"
                  }`}
                >
                  {returnStr || t.select}
                </Text>
              </Pressable>
            </FieldBox>

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

            <View className="mt-4">
              <Label>{t.qrCount}</Label>
              <FieldBox>
                <Text className="text-[11px] text-[#7a6f66]">{t.qrHelp}</Text>
                <TextInput
                  value={qrCount}
                  onChangeText={(v) => setQrCount(onlyInt(v))}
                  placeholder={t.qrCountPH}
                  keyboardType={Platform.OS === "ios" ? "number-pad" : "numeric"}
                  inputMode="numeric"
                  className="mt-1 text-base text-[#2b2b2b]"
                />
              </FieldBox>
            </View>

            <View className="mt-4">
              <Text className="text-sm font-bold text-[#2b2b2b]">{t.suppliesCost}</Text>

              <View className="mt-3">
                <Label>{t.diesel}</Label>
                <View className="mt-2 flex-row gap-3">
                  <View className="flex-1 rounded-xl border border-[#e6d4c5] bg-white px-3 py-3">
                    <Text className="text-[11px] text-[#7a6f66]">{t.liters}</Text>
                    <TextInput
                      value={dieselLiters}
                      onChangeText={(v) => setDieselLiters(onlyDecimal(v))}
                      placeholder="e.g. 120"
                      keyboardType={Platform.OS === "ios" ? "decimal-pad" : "numeric"}
                      inputMode="decimal"
                      className="mt-1 text-base text-[#2b2b2b]"
                    />
                  </View>
                  <View className="flex-1 rounded-xl border border-[#e6d4c5] bg-white px-3 py-3">
                    <Text className="text-[11px] text-[#7a6f66]">{t.ratePerLiter}</Text>
                    <TextInput
                      value={dieselRate}
                      onChangeText={(v) => setDieselRate(onlyDecimal(v))}
                      placeholder="e.g. 95"
                      keyboardType={Platform.OS === "ios" ? "decimal-pad" : "numeric"}
                      inputMode="decimal"
                      className="mt-1 text-base text-[#2b2b2b]"
                    />
                  </View>
                </View>

                <View className="mt-2 rounded-xl border border-[#ffd9b6] bg-[#fff3e7] px-3 py-2">
                  <Text className="text-xs font-semibold text-[#7a4a12]">
                    {t.dieselCost}: {money(dieselCost)}
                  </Text>
                </View>
              </View>

              <View className="mt-4">
                <Label>{t.ice}</Label>
                <View className="mt-2 flex-row gap-3">
                  <View className="flex-1 rounded-xl border border-[#e6d4c5] bg-white px-3 py-3">
                    <Text className="text-[11px] text-[#7a6f66]">{t.kg}</Text>
                    <TextInput
                      value={iceKg}
                      onChangeText={(v) => setIceKg(onlyDecimal(v))}
                      placeholder="e.g. 60"
                      keyboardType={Platform.OS === "ios" ? "decimal-pad" : "numeric"}
                      inputMode="decimal"
                      className="mt-1 text-base text-[#2b2b2b]"
                    />
                  </View>
                  <View className="flex-1 rounded-xl border border-[#e6d4c5] bg-white px-3 py-3">
                    <Text className="text-[11px] text-[#7a6f66]">{t.ratePerKg}</Text>
                    <TextInput
                      value={iceRate}
                      onChangeText={(v) => setIceRate(onlyDecimal(v))}
                      placeholder="e.g. 15"
                      keyboardType={Platform.OS === "ios" ? "decimal-pad" : "numeric"}
                      inputMode="decimal"
                      className="mt-1 text-base text-[#2b2b2b]"
                    />
                  </View>
                </View>

                <View className="mt-2 rounded-xl border border-[#ffd9b6] bg-[#fff3e7] px-3 py-2">
                  <Text className="text-xs font-semibold text-[#7a4a12]">
                    {t.iceCost}: {money(iceCost)}
                  </Text>
                </View>
              </View>

              <View className="mt-4 rounded-2xl border border-[#a06b2a] bg-[#fff3e7] px-4 py-3">
                <Text className="text-xs text-[#7a4a12]">{t.totalCost}</Text>
                <Text className="mt-1 text-lg font-extrabold text-[#2b2b2b]">{money(totalCost)}</Text>
                <Text className="mt-1 text-[11px] text-[#7a6f66]">{t.totalHelp}</Text>
              </View>
            </View>
          </Card>
        </View>

        <View className="mt-6 flex-row gap-3">
          <Pressable
            onPress={() => router.back()}
            disabled={posting}
            className="flex-1 rounded-2xl border border-[#ead7c8] bg-white p-4 active:opacity-80"
            style={{ opacity: posting ? 0.7 : 1 }}
          >
            <Text className="text-center text-[#2b2b2b] font-semibold">{t.cancel}</Text>
          </Pressable>

          <Pressable
            onPress={submit}
            disabled={posting}
            className="flex-1 rounded-2xl bg-[#a06b2a] p-4 active:opacity-90"
            style={{ opacity: posting ? 0.7 : 1 }}
          >
            <Text className="text-center text-white font-semibold">{posting ? "..." : t.submit}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
