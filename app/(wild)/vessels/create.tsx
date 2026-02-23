// app/(wild)/vessels/create.tsx
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppDispatch } from "../../../src/store/hooks";
import { createVessel } from "../../../src/services/wild/vessels/vessel.slice";
import type {
  FuelType,
  VesselCreatePayload,
} from "../../../src/services/wild/vessels/vesselApi";

/**
 * ✅ What this file does
 * 1) Gets owner_id after login (from cache, else /api/me + /api/owner/fetch/:userId)
 * 2) Sends owner_id in POST payload
 * 3) Offline queue + auto-sync when internet returns
 * 4) Vessel type dropdown + "Other" => manual input
 * 5) Home Port selection: Country -> State -> District -> Port(Location)
 */

/** ---------------- CONFIG ---------------- */
const API_BASE = "https://rootverse-backend-5qoo.onrender.com";
const ME_API = `${API_BASE}/api/me`;
const OWNER_FETCH_API = `${API_BASE}/api/owner/fetch`; // GET /:userId

const AUTH_LOGIN_ROUTE = "/(auth)/login" as const;

// if your backend expects state_id/district_id/location_id as well, flip this ON
const INCLUDE_STATE_DISTRICT_IN_PAYLOAD = false;

const TOKEN_KEYS = ["auth_token", "access_token", "token"] as const;
const LAST_OWNER_ID_KEY = "rv_last_owner_id"; // same as dashboard
const ME_CACHE_KEY = "RV_ME_CACHE_V1"; // used in your trip create snippet

// offline queue key (same style as dashboard)
const VESSEL_QUEUE_KEY = "rv_vessel_registry_queue_v1";

/** ---------------- TYPES ---------------- */
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
};

type VesselTypePreset = { id: string; name: string };

type VesselForm = {
  localIdentifier: string; // local_identifier
  vesselName: string; // vessel_name
  govtRegNo: string; // govt_registration_number

  // type selection
  vesselTypePreset: string; // preset name OR "Other"
  vesselTypeOtherText: string; // manual input when Other

  // home port selection
  countrySel: CountryItem | null;
  stateSel: StateItem | null;
  districtSel: DistrictItem | null;
  portSel: LocationItem | null; // port location

  fishingLicenseNo: string;
  crewCapacityMax: string;
  storageCapacityKg: string;
  enginePowerHp: string;
  fuelType: FuelType;
};

/** ---------------- UI ---------------- */
const UI = {
  bg: "#f4f7ff",
  card: "#ffffff",
  border: "#d9e2ef",
  text: "#0f172a",
  muted: "#64748b",
  blue: "#2f6fed",
  blueSoft: "#eaf1ff",
  green: "#16a34a",
  greenSoft: "#eafaf0",
  red: "#dc2626",
  redSoft: "#fee2e2",
  shadow: "rgba(2, 6, 23, 0.08)",
};

const CARD_SHADOW = {
  shadowColor: UI.shadow,
  shadowOpacity: 1,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 10 },
  elevation: 4,
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
      className={`rounded-2xl border ${className}`}
      style={[{ backgroundColor: UI.card, borderColor: UI.border }, CARD_SHADOW]}
    >
      {children}
    </View>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <Text className="text-xs font-semibold" style={{ color: UI.muted }}>
      {children}
    </Text>
  );
}

function Input({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  maxLength,
  editable = true,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: any;
  maxLength?: number;
  editable?: boolean;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#94a3b8"
      keyboardType={keyboardType}
      maxLength={maxLength}
      editable={editable}
      className="mt-2 rounded-xl border px-3 py-3 text-base"
      style={{
        borderColor: UI.border,
        color: UI.text,
        backgroundColor: editable ? "#ffffff" : "#f1f5f9",
      }}
    />
  );
}

/** ---------------- FULL SCREEN PICKER (LIKE CATCHLOG) ---------------- */
type FullPickItem = {
  key: string;
  label: string;
  subtitle?: string;
};

function FullScreenPickerModal({
  visible,
  title,
  items,
  selectedKey,
  loading,
  emptyText,
  onClose,
  onConfirm,
  confirmLabel = "Next",
  searchPlaceholder = "Search...",
  insetsBottom,
}: {
  visible: boolean;
  title: string;
  items: FullPickItem[];
  selectedKey: string;
  loading?: boolean;
  emptyText?: string;
  onClose: () => void;
  onConfirm: (item: FullPickItem) => void;
  confirmLabel?: string;
  searchPlaceholder?: string;
  insetsBottom: number;
}) {
  const [q, setQ] = useState("");
  const [tempKey, setTempKey] = useState("");

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

  const BG = "#0b0f17";
  const CARD_BG = "rgba(255,255,255,0.06)";
  const BORDER = "rgba(255,255,255,0.10)";
  const ACCENT = "#93c5fd";

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 14,
            paddingTop: 6,
          }}
        >
          <Pressable
            onPress={onClose}
            style={{
              padding: 10,
              borderRadius: 999,
              backgroundColor: "rgba(255,255,255,0.08)",
            }}
          >
            <Text style={{ color: "white", fontWeight: "900", fontSize: 16 }}>
              ←
            </Text>
          </Pressable>

          <Text
            style={{
              color: "white",
              fontWeight: "900",
              fontSize: 18,
              marginLeft: 12,
              flex: 1,
            }}
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
          <Text style={{ color: "rgba(255,255,255,0.70)", fontWeight: "900" }}>
            🔎
          </Text>
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
              <Text
                style={{ color: "rgba(255,255,255,0.60)", fontWeight: "900" }}
              >
                ✕
              </Text>
            </Pressable>
          ) : null}
        </View>

        {/* List */}
        <View style={{ flex: 1, paddingTop: 14 }}>
          {loading ? (
            <View
              style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
            >
              <ActivityIndicator />
              <Text
                style={{
                  color: "rgba(255,255,255,0.70)",
                  marginTop: 10,
                  fontWeight: "700",
                }}
              >
                Loading...
              </Text>
            </View>
          ) : filtered.length === 0 ? (
            <View
              style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ color: "rgba(255,255,255,0.70)", fontWeight: "800" }}>
                {emptyText || "No data"}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(it) => it.key}
              contentContainerStyle={{
                paddingHorizontal: 14,
                paddingBottom: 120 + insetsBottom,
              }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const active = item.key === tempKey;
                return (
                  <Pressable
                    onPress={() => setTempKey(item.key)}
                    style={{
                      marginBottom: 10,
                      borderRadius: 18,
                      borderWidth: 1,
                      borderColor: active ? ACCENT : BORDER,
                      backgroundColor: active
                        ? "rgba(147,197,253,0.10)"
                        : CARD_BG,
                      paddingVertical: 14,
                      paddingHorizontal: 14,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text
                          style={{
                            color: "white",
                            fontWeight: "900",
                            fontSize: 15,
                          }}
                          numberOfLines={2}
                        >
                          {item.label}
                        </Text>
                        {!!item.subtitle ? (
                          <Text
                            style={{
                              color: "rgba(255,255,255,0.70)",
                              fontSize: 12,
                              marginTop: 4,
                            }}
                            numberOfLines={1}
                          >
                            {item.subtitle}
                          </Text>
                        ) : null}
                      </View>

                      <View style={{ marginLeft: 12 }}>
                        <Text
                          style={{
                            color: active
                              ? ACCENT
                              : "rgba(255,255,255,0.60)",
                            fontWeight: "900",
                          }}
                        >
                          {active ? "✓" : "›"}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              }}
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

/** ---------------- HELPERS ---------------- */
async function readTokenFromStorage(): Promise<string | null> {
  for (const k of TOKEN_KEYS) {
    const v = await AsyncStorage.getItem(k);
    const token = (v || "").trim();
    if (token) return token;
  }
  return null;
}

async function isOnlineNow(): Promise<boolean> {
  const s = await NetInfo.fetch();
  const connected = !!s.isConnected;
  const reachable = s.isInternetReachable;
  return reachable === null ? connected : connected && reachable;
}

function toIntOrNull(s: string): number | null {
  const n = Number(String(s || "").trim());
  if (!Number.isFinite(n)) return null;
  const i = Math.floor(n);
  if (i <= 0) return null;
  return i;
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
  const token = await readTokenFromStorage();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function geoGet<T>(path: string): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: { Accept: "application/json", ...(headers as Record<string, string>) },
  });

  if (res.status === 401) throw new Error("UNAUTHORIZED");

  const json = await safeJson(res);
  if (!res.ok)
    throw new Error(json?.message || json?.error || `GET ${path} failed (${res.status})`);
  return unwrapData<T>(json);
}

/** ---------------- OWNER ID (like dashboard) ---------------- */
async function readCachedOwnerDbId(): Promise<number | null> {
  // 1) dashboard key
  const v1 = await AsyncStorage.getItem(LAST_OWNER_ID_KEY);
  const n1 = v1 ? Number(String(v1).trim()) : NaN;
  if (Number.isFinite(n1) && n1 > 0) return n1;

  // 2) trip create cache
  const raw = await AsyncStorage.getItem(ME_CACHE_KEY);
  if (raw) {
    try {
      const p = JSON.parse(raw);
      const n2 = Number(p?.ownerDbId || p?.owner_db_id || p?.owner_id || 0);
      if (Number.isFinite(n2) && n2 > 0) return n2;
    } catch {}
  }

  // 3) sometimes stored directly
  const v3 = await AsyncStorage.getItem("owner_id");
  const n3 = v3 ? Number(String(v3).trim()) : NaN;
  if (Number.isFinite(n3) && n3 > 0) return n3;

  return null;
}

async function writeCachedOwnerDbId(ownerId: number) {
  if (!ownerId || ownerId <= 0) return;
  await AsyncStorage.setItem(LAST_OWNER_ID_KEY, String(ownerId));
  await AsyncStorage.setItem("owner_id", String(ownerId)).catch(() => {});
}

async function fetchOwnerDbIdOnline(): Promise<number> {
  const token = await readTokenFromStorage();
  if (!token) throw new Error("NO_TOKEN");

  // /api/me -> get user id
  const meRes = await fetch(ME_API, {
    method: "GET",
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });

  if (meRes.status === 401) throw new Error("UNAUTHORIZED");
  const meJson = await safeJson(meRes);
  if (!meRes.ok) throw new Error(meJson?.message || meJson?.error || `ME API failed (${meRes.status})`);

  const me = meJson?.user ?? meJson?.data?.user ?? meJson?.data ?? meJson ?? {};
  const userId = Number(me?.id || 0);
  if (!Number.isFinite(userId) || userId <= 0) throw new Error("ME returned invalid id");

  // /api/owner/fetch/:userId -> get owner db id
  const ownerRes = await fetch(`${OWNER_FETCH_API}/${encodeURIComponent(String(userId))}`, {
    method: "GET",
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });

  if (ownerRes.status === 401) throw new Error("UNAUTHORIZED");
  const ownerJson = await safeJson(ownerRes);
  if (!ownerRes.ok)
    throw new Error(ownerJson?.message || ownerJson?.error || `Owner fetch failed (${ownerRes.status})`);

  const data: any = unwrapData<any>(ownerJson);
  const o = Array.isArray(data) ? data[0] : data;

  const ownerId = Number(o?.id || o?.owner_id || o?.ownerId || 0);
  if (!Number.isFinite(ownerId) || ownerId <= 0) throw new Error("Owner fetch returned invalid owner id");

  await writeCachedOwnerDbId(ownerId);
  return ownerId;
}

/** ---------------- OFFLINE QUEUE (vessel) ---------------- */
async function enqueueOfflineVessel(payload: VesselCreatePayload) {
  const raw = await AsyncStorage.getItem(VESSEL_QUEUE_KEY);
  let arr: any[] = [];
  if (raw) {
    try {
      arr = JSON.parse(raw);
      if (!Array.isArray(arr)) arr = [];
    } catch {
      arr = [];
    }
  }
  arr.push({ ...payload, _queuedAt: Date.now() });
  await AsyncStorage.setItem(VESSEL_QUEUE_KEY, JSON.stringify(arr));
}

async function getVesselQueueCount(): Promise<number> {
  const raw = await AsyncStorage.getItem(VESSEL_QUEUE_KEY);
  if (!raw) return 0;
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.length : 0;
  } catch {
    return 0;
  }
}

async function flushOfflineVesselQueue(sendFn: (p: VesselCreatePayload) => Promise<void>) {
  const raw = await AsyncStorage.getItem(VESSEL_QUEUE_KEY);
  if (!raw) return { sent: 0, left: 0 };

  let arr: any[] = [];
  try {
    arr = JSON.parse(raw);
    if (!Array.isArray(arr) || arr.length === 0) return { sent: 0, left: 0 };
  } catch {
    return { sent: 0, left: 0 };
  }

  const keep: any[] = [];
  let sent = 0;

  for (const item of arr) {
    try {
      const { _queuedAt, ...rest } = item || {};
      await sendFn(rest as VesselCreatePayload);
      sent++;
    } catch {
      keep.push(item);
    }
  }

  if (keep.length === 0) {
    await AsyncStorage.removeItem(VESSEL_QUEUE_KEY);
  } else {
    await AsyncStorage.setItem(VESSEL_QUEUE_KEY, JSON.stringify(keep));
  }

  return { sent, left: keep.length };
}

/** ---------------- SCREEN ---------------- */
export default function VesselCreateScreen() {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();

  const typePresets: VesselTypePreset[] = useMemo(
    () => [
      { id: "FRP", name: "FRP Boat" },
      { id: "WOOD", name: "Wooden Boat" },
      { id: "STEEL", name: "Steel Boat" },
      { id: "MECH", name: "Mechanized" },
      { id: "TRAD", name: "Traditional" },
      { id: "OTHER", name: "Other" },
    ],
    [],
  );

  const [online, setOnline] = useState(true);
  const [saving, setSaving] = useState(false);

  const [ownerDbId, setOwnerDbId] = useState<number | null>(null);

  // pending offline vessels (for small chip)
  const [pendingCount, setPendingCount] = useState(0);
  const syncingRef = useRef(false);

  // geo data for home port
  const [countries, setCountries] = useState<CountryItem[]>([]);
  const [states, setStates] = useState<StateItem[]>([]);
  const [districts, setDistricts] = useState<DistrictItem[]>([]);
  const [ports, setPorts] = useState<LocationItem[]>([]);

  const [countriesLoading, setCountriesLoading] = useState(false);
  const [statesLoading, setStatesLoading] = useState(false);
  const [districtsLoading, setDistrictsLoading] = useState(false);
  const [portsLoading, setPortsLoading] = useState(false);

  // ✅ Full screen pickers
  const [typeOpen, setTypeOpen] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);
  const [stateOpen, setStateOpen] = useState(false);
  const [districtOpen, setDistrictOpen] = useState(false);
  const [portOpen, setPortOpen] = useState(false);

  // modals
  const [fuelOpen, setFuelOpen] = useState(false);

  const [form, setForm] = useState<VesselForm>({
    localIdentifier: "",
    vesselName: "",
    govtRegNo: "",

    vesselTypePreset: "FRP Boat",
    vesselTypeOtherText: "",

    countrySel: null,
    stateSel: null,
    districtSel: null,
    portSel: null,

    fishingLicenseNo: "",
    crewCapacityMax: "",
    storageCapacityKg: "",
    enginePowerHp: "",
    fuelType: "Diesel",
  });

  const setField = (k: keyof VesselForm, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const resolvedVesselType = useMemo(() => {
    if (form.vesselTypePreset === "Other") return (form.vesselTypeOtherText || "").trim();
    return (form.vesselTypePreset || "").trim();
  }, [form.vesselTypePreset, form.vesselTypeOtherText]);

  const homePortName = useMemo(() => {
    return form.portSel?.name ? String(form.portSel.name) : "";
  }, [form.portSel]);

  const canSave = useMemo(() => {
    return (
      !!ownerDbId &&
      form.localIdentifier.trim() &&
      form.vesselName.trim() &&
      form.govtRegNo.trim() &&
      resolvedVesselType.trim() &&
      !!form.portSel?.id
    );
  }, [form, ownerDbId, resolvedVesselType]);

  const validate = (): string | null => {
    if (!ownerDbId) return "Owner not loaded yet. Please wait / check login.";
    if (!form.localIdentifier.trim()) return "Local Identifier is required";
    if (!form.vesselName.trim()) return "Vessel Name is required";
    if (!form.govtRegNo.trim()) return "Govt Registration No. is required";

    if (!resolvedVesselType.trim()) return "Vessel Type is required";
    if (form.vesselTypePreset === "Other" && !form.vesselTypeOtherText.trim())
      return "Enter Vessel Type (Other)";

    if (!form.countrySel?.id) return "Select Country";
    if (!form.stateSel?.id) return "Select State";
    if (!form.districtSel?.id) return "Select District";
    if (!form.portSel?.id) return "Select Home Port (Port/Location)";

    if (String(form.crewCapacityMax).trim() && !toIntOrNull(form.crewCapacityMax))
      return "Crew Capacity must be a valid number";

    if (String(form.storageCapacityKg).trim() && !toIntOrNull(form.storageCapacityKg))
      return "Storage Capacity must be a valid number";

    if (String(form.enginePowerHp).trim() && !toIntOrNull(form.enginePowerHp))
      return "Engine Power must be a valid number";

    return null;
  };

  const buildPayload = (): VesselCreatePayload & any => {
    const payload: any = {
      owner_id: Number(ownerDbId),

      govt_registration_number: form.govtRegNo.trim(),
      local_identifier: form.localIdentifier.trim(),
      vessel_name: form.vesselName.trim(),

      vessel_type: resolvedVesselType.trim(),
      home_port: String(homePortName || "").trim(),

      fishing_license_no: form.fishingLicenseNo.trim() || null,
      crew_capacity_max: toIntOrNull(form.crewCapacityMax),
      storage_capacity_kg: toIntOrNull(form.storageCapacityKg),
      engine_power_hp: toIntOrNull(form.enginePowerHp),
      fuel_type: form.fuelType ?? null,
    };

    if (INCLUDE_STATE_DISTRICT_IN_PAYLOAD) {
      payload.state_id = Number(form.portSel?.state_id || form.stateSel?.id || 0);
      payload.district_id = Number(form.portSel?.district_id || form.districtSel?.id || 0);
      payload.location_id = Number(form.portSel?.id || 0);
      // country is only UI-driven currently; keeping payload unchanged unless you switch this ON
      // payload.country_id = Number(form.countrySel?.id || 0);
    }

    return payload;
  };

  /** -------- owner id load -------- */
  const loadOwnerId = async () => {
    const cached = await readCachedOwnerDbId();
    if (cached) setOwnerDbId(cached);

    const onNow = await isOnlineNow();
    setOnline(onNow);
    if (!onNow) return;

    try {
      const fresh = await fetchOwnerDbIdOnline();
      setOwnerDbId(fresh);
    } catch (e: any) {
      const msg = String(e?.message || "");
      if (msg === "UNAUTHORIZED") router.replace(AUTH_LOGIN_ROUTE);
    }
  };

  /** -------- countries/states/districts/ports load -------- */
  const loadCountries = async () => {
    if (!online) return;
    setCountriesLoading(true);
    try {
      const data = await geoGet<any>("/api/country");
      const arr = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
      const list: CountryItem[] = arr
        .map((x: any) => ({
          id: Number(x?.id),
          name: String(x?.name || "").trim(),
          code: x?.code ?? null,
        }))
        .filter((x) => x.id && x.name);

      setCountries(list);

      // ✅ Keep previous flow smooth: auto-pick first country if not selected yet
      if (list.length > 0) {
        setForm((p) => (p.countrySel ? p : { ...p, countrySel: list[0] }));
      }
    } finally {
      setCountriesLoading(false);
    }
  };

  const loadStatesByCountry = async (countryId: number) => {
    if (!online) return;
    setStatesLoading(true);
    try {
      const data = await geoGet<any>(`/api/states/country/${encodeURIComponent(String(countryId))}`);
      const arr = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
      const list: StateItem[] = arr
        .map((x: any) => ({
          id: Number(x?.id),
          name: String(x?.name || "").trim(),
          state_code: x?.state_code ?? null,
          country_id: Number(x?.country_id || countryId),
          country_name: x?.country_name ?? null,
          country_code: x?.country_code ?? null,
        }))
        .filter((x) => x.id && x.name);
      setStates(list);
    } finally {
      setStatesLoading(false);
    }
  };

  const loadDistricts = async (stateId: number) => {
    if (!online) return;
    setDistrictsLoading(true);
    try {
      const data = await geoGet<any>(`/api/states/${encodeURIComponent(String(stateId))}/districts`);
      const arr = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
      const list: DistrictItem[] = arr
        .map((x: any) => ({
          id: Number(x?.id),
          name: String(x?.name || "").trim(),
          district_code: x?.district_code ?? null,
          state_id: Number(x?.state_id || stateId),
        }))
        .filter((x) => x.id && x.name);
      setDistricts(list);
    } finally {
      setDistrictsLoading(false);
    }
  };

  const loadPorts = async (districtId: number) => {
    if (!online) return;
    setPortsLoading(true);
    try {
      const data = await geoGet<any>(`/api/locations/district/${encodeURIComponent(String(districtId))}`);
      const arr = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
      const list: LocationItem[] = arr
        .map((x: any) => ({
          id: Number(x?.id),
          name: String(x?.name || "").trim(),
          location_code: x?.location_code ?? null,
          district_id: Number(x?.district_id || districtId),
          state_id: Number(x?.state_id || 0),
        }))
        .filter((x) => x.id && x.name);
      setPorts(list);
    } finally {
      setPortsLoading(false);
    }
  };

  /** -------- offline auto sync -------- */
  const refreshPending = async () => {
    const c = await getVesselQueueCount();
    setPendingCount(c);
    return c;
  };

  const doFlushQueue = async () => {
    if (!online) return;
    if (syncingRef.current) return;

    const before = await refreshPending();
    if (before <= 0) return;

    syncingRef.current = true;
    try {
      let oid = ownerDbId;
      if (!oid) {
        oid = await readCachedOwnerDbId();
        if (!oid && online) {
          try {
            oid = await fetchOwnerDbIdOnline();
            setOwnerDbId(oid);
          } catch {}
        }
      }

      await flushOfflineVesselQueue(async (p) => {
        const patched: any = { ...(p || {}) };
        if (!patched.owner_id && oid) patched.owner_id = Number(oid);
        await dispatch(createVessel(patched as any)).unwrap();
      });

      await refreshPending();
    } finally {
      syncingRef.current = false;
    }
  };

  /** -------- lifecycle -------- */
  useEffect(() => {
    let alive = true;

    const boot = async () => {
      const onNow = await isOnlineNow();
      if (!alive) return;
      setOnline(onNow);

      await refreshPending();
      await loadOwnerId();

      if (onNow) {
        await loadCountries();
        // states load is driven by country selection effect (and also on reconnect handler below)
        await doFlushQueue();
      }
    };

    boot();

    const sub = NetInfo.addEventListener(async (s) => {
      const connected = !!s.isConnected;
      const reachable = s.isInternetReachable;
      const on = reachable === null ? connected : connected && reachable;

      if (!alive) return;
      setOnline(on);

      if (on) {
        await loadOwnerId();
        await loadCountries();

        // ✅ important: when coming back online, if country already selected, load states for it
        if (form.countrySel?.id) {
          await loadStatesByCountry(form.countrySel.id);
        }

        await doFlushQueue();
      }

      await refreshPending();
    });

    return () => {
      alive = false;
      sub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // country -> states (and reset below)
  useEffect(() => {
    (async () => {
      const cid = form.countrySel?.id;

      // reset below
      setField("stateSel", null);
      setField("districtSel", null);
      setField("portSel", null);
      setStates([]);
      setDistricts([]);
      setPorts([]);

      if (!cid) return;
      await loadStatesByCountry(cid);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.countrySel?.id]);

  // state -> districts
  useEffect(() => {
    (async () => {
      const sid = form.stateSel?.id;
      setField("districtSel", null);
      setField("portSel", null);
      setDistricts([]);
      setPorts([]);
      if (!sid) return;
      await loadDistricts(sid);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.stateSel?.id]);

  // district -> ports
  useEffect(() => {
    (async () => {
      const did = form.districtSel?.id;
      setField("portSel", null);
      setPorts([]);
      if (!did) return;
      await loadPorts(did);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.districtSel?.id]);

  /** -------- actions -------- */
  const onCancel = () => {
    Alert.alert("Cancel", "Discard changes?", [
      { text: "No", style: "cancel" },
      { text: "Yes", style: "destructive", onPress: () => router.back() },
    ]);
  };

  const onSave = async () => {
    const err = validate();
    if (err) return Alert.alert("Validation", err);

    const payload = buildPayload();

    setSaving(true);
    try {
      const onNow = await isOnlineNow();
      setOnline(onNow);

      if (!onNow) {
        await enqueueOfflineVessel(payload);
        await refreshPending();
        Alert.alert("Saved Offline", "No internet. Vessel saved locally and will sync when online.");
        router.back();
        return;
      }

      await dispatch(createVessel(payload as any)).unwrap();
      Alert.alert("Success", "Vessel registered successfully. OneBlue team will contact you soon.");
      router.back();
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (msg.includes("UNAUTHORIZED") || e?.status === 401) {
        router.replace(AUTH_LOGIN_ROUTE);
        return;
      }

      const m = msg.toLowerCase();
      const networkish =
        m.includes("network") ||
        m.includes("failed to fetch") ||
        m.includes("timeout") ||
        m.includes("socket");

      if (networkish) {
        await enqueueOfflineVessel(payload);
        await refreshPending();
        Alert.alert("Saved Offline", "Network issue. Saved locally and will sync when online.");
        router.back();
        return;
      }

      Alert.alert("Error", msg || "Failed to save vessel");
    } finally {
      setSaving(false);
    }
  };

  /** -------- fuel modal option -------- */
  const FuelOption = ({ v }: { v: FuelType }) => (
    <Pressable
      onPress={() => {
        setField("fuelType", v);
        setFuelOpen(false);
      }}
      className="px-4 py-4 border-b"
      style={{ borderColor: UI.border }}
    >
      <Text className="text-base font-semibold" style={{ color: UI.text }}>
        {v}
      </Text>
    </Pressable>
  );

  /** -------- picker items (full screen) -------- */
  const NEXT_LABEL = "Next";

  const typeItems: FullPickItem[] = useMemo(
    () =>
      typePresets.map((x) => ({
        key: x.name,
        label: x.name,
      })),
    [typePresets],
  );

  const countryItems: FullPickItem[] = useMemo(
    () =>
      countries.map((c) => ({
        key: String(c.id),
        label: c.name,
        subtitle: c.code ? `Code: ${c.code}` : "",
      })),
    [countries],
  );

  const stateItems: FullPickItem[] = useMemo(
    () =>
      states.map((s) => ({
        key: String(s.id),
        label: s.name,
        subtitle: s.state_code ? `Code: ${s.state_code}` : "",
      })),
    [states],
  );

  const districtItems: FullPickItem[] = useMemo(
    () =>
      districts.map((d) => ({
        key: String(d.id),
        label: d.name,
        subtitle: d.district_code ? `Code: ${d.district_code}` : "",
      })),
    [districts],
  );

  const portItems: FullPickItem[] = useMemo(
    () =>
      ports.map((p) => ({
        key: String(p.id),
        label: p.name,
        subtitle: p.location_code ? `Code: ${p.location_code}` : "",
      })),
    [ports],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: UI.bg }} edges={["top", "left", "right"]}>
      {/* ✅ FULL SCREEN PICKERS */}
      <FullScreenPickerModal
        visible={typeOpen}
        title="Vessel Type"
        items={typeItems}
        selectedKey={form.vesselTypePreset || ""}
        loading={false}
        emptyText="No types"
        confirmLabel={NEXT_LABEL}
        searchPlaceholder="Search vessel type..."
        insetsBottom={insets.bottom}
        onClose={() => setTypeOpen(false)}
        onConfirm={(item) => {
          setField("vesselTypePreset", String(item.key));
          if (String(item.key) !== "Other") setField("vesselTypeOtherText", "");
          setTypeOpen(false);
        }}
      />

      <FullScreenPickerModal
        visible={countryOpen}
        title="Country"
        items={countryItems}
        selectedKey={form.countrySel?.id ? String(form.countrySel.id) : ""}
        loading={countriesLoading}
        emptyText="No countries"
        confirmLabel={NEXT_LABEL}
        searchPlaceholder="Search country..."
        insetsBottom={insets.bottom}
        onClose={() => setCountryOpen(false)}
        onConfirm={(item) => {
          const c = countries.find((x) => String(x.id) === String(item.key)) || null;
          setField("countrySel", c);
          setCountryOpen(false);
        }}
      />

      <FullScreenPickerModal
        visible={stateOpen}
        title="State"
        items={stateItems}
        selectedKey={form.stateSel?.id ? String(form.stateSel.id) : ""}
        loading={statesLoading}
        emptyText="No states"
        confirmLabel={NEXT_LABEL}
        searchPlaceholder="Search state..."
        insetsBottom={insets.bottom}
        onClose={() => setStateOpen(false)}
        onConfirm={(item) => {
          const st = states.find((s) => String(s.id) === String(item.key)) || null;
          setField("stateSel", st);
          setStateOpen(false);
        }}
      />

      <FullScreenPickerModal
        visible={districtOpen}
        title="District"
        items={districtItems}
        selectedKey={form.districtSel?.id ? String(form.districtSel.id) : ""}
        loading={districtsLoading}
        emptyText="No districts"
        confirmLabel={NEXT_LABEL}
        searchPlaceholder="Search district..."
        insetsBottom={insets.bottom}
        onClose={() => setDistrictOpen(false)}
        onConfirm={(item) => {
          const d = districts.find((x) => String(x.id) === String(item.key)) || null;
          setField("districtSel", d);
          setDistrictOpen(false);
        }}
      />

      <FullScreenPickerModal
        visible={portOpen}
        title="Home Port (Port/Location)"
        items={portItems}
        selectedKey={form.portSel?.id ? String(form.portSel.id) : ""}
        loading={portsLoading}
        emptyText="No ports"
        confirmLabel={NEXT_LABEL}
        searchPlaceholder="Search port/location..."
        insetsBottom={insets.bottom}
        onClose={() => setPortOpen(false)}
        onConfirm={(item) => {
          const p = ports.find((x) => String(x.id) === String(item.key)) || null;
          setField("portSel", p);
          setPortOpen(false);
        }}
      />

      {/* Header */}
      <View className="px-4" style={{ paddingTop: 10, paddingBottom: 10 }}>
        <View
          className="rounded-3xl border px-4 py-3 flex-row items-center justify-between"
          style={{ backgroundColor: UI.card, borderColor: UI.border }}
        >
          <View className="flex-row items-center">
            <Pressable
              onPress={() => router.back()}
              className="rounded-2xl p-2 active:opacity-70"
              style={{ backgroundColor: UI.blueSoft }}
              hitSlop={8}
            >
              <Ionicons name="arrow-back" size={20} color={UI.blue} />
            </Pressable>

            <View className="ml-3">
              <Text className="text-base font-extrabold" style={{ color: UI.text }}>
                Vessel Registration
              </Text>
              <Text className="text-xs" style={{ color: UI.muted }}>
                {online ? "Online" : "Offline"} · Owner ID: {ownerDbId ? String(ownerDbId) : "—"}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center">
            {pendingCount > 0 ? (
              <View
                className="mr-2 rounded-full px-2 py-1 border"
                style={{ borderColor: UI.border, backgroundColor: UI.redSoft }}
              >
                <Text className="text-[11px] font-bold" style={{ color: UI.red }}>
                  Pending: {pendingCount}
                </Text>
              </View>
            ) : null}

            {saving ? (
              <ActivityIndicator />
            ) : (
              <Ionicons name={online ? "wifi" : "wifi-outline"} size={18} color={online ? UI.green : UI.red} />
            )}
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 18 }}
        contentContainerClassName="px-4 pb-6"
      >
        {/* Form Card */}
        <Card>
          <View className="p-4">
            <View className="flex-row items-center">
              <View
                className="h-10 w-10 rounded-2xl items-center justify-center"
                style={{ backgroundColor: UI.blueSoft }}
              >
                <Ionicons name="boat-outline" size={22} color={UI.blue} />
              </View>
              <View className="ml-3">
                <Text className="text-sm font-extrabold" style={{ color: UI.text }}>
                  Vessel Details
                </Text>
                <Text className="mt-0.5 text-xs" style={{ color: UI.muted }}>
                  Required: Govt Reg No, Local ID, Name, Type, Country, State, District, Port
                </Text>
              </View>
            </View>

            <View className="mt-4 gap-4">
              <View>
                <Label>Local Identifier *</Label>
                <Input
                  value={form.localIdentifier}
                  onChangeText={(v) => setField("localIdentifier", v)}
                  placeholder="LOCAL-07"
                  maxLength={40}
                />
              </View>

              <View>
                <Label>Vessel Name *</Label>
                <Input
                  value={form.vesselName}
                  onChangeText={(v) => setField("vesselName", v)}
                  placeholder="Blue Pearl"
                  maxLength={80}
                />
              </View>

              <View>
                <Label>Govt Registration No. *</Label>
                <Input
                  value={form.govtRegNo}
                  onChangeText={(v) => setField("govtRegNo", v)}
                  placeholder="TN-REG-2026-0"
                  maxLength={50}
                />
              </View>

              {/* Vessel Type full screen */}
              <View>
                <Label>Vessel Type *</Label>
                <Pressable
                  onPress={() => setTypeOpen(true)}
                  className="mt-2 rounded-xl border px-3 py-3 flex-row items-center justify-between active:opacity-80"
                  style={{ borderColor: UI.border, backgroundColor: UI.card }}
                >
                  <Text className="text-base font-semibold" style={{ color: UI.text }}>
                    {form.vesselTypePreset || "Select"}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color={UI.muted} />
                </Pressable>

                {form.vesselTypePreset === "Other" ? (
                  <View className="mt-2">
                    <Input
                      value={form.vesselTypeOtherText}
                      onChangeText={(v) => setField("vesselTypeOtherText", v)}
                      placeholder="Enter vessel type (manual)"
                      maxLength={60}
                    />
                  </View>
                ) : null}
              </View>

              {/* Home Port selection full screen: Country -> State -> District -> Port */}
              <View>
                <Label>Country *</Label>
                <Pressable
                  onPress={() => setCountryOpen(true)}
                  className="mt-2 rounded-xl border px-3 py-3 flex-row items-center justify-between active:opacity-80"
                  style={{ borderColor: UI.border, backgroundColor: UI.card }}
                >
                  <Text
                    className="text-base font-semibold"
                    style={{ color: form.countrySel ? UI.text : "#94a3b8" }}
                  >
                    {form.countrySel?.name || "Select"}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color={UI.muted} />
                </Pressable>
              </View>

              <View>
                <Label>State *</Label>
                <Pressable
                  onPress={() => {
                    if (!form.countrySel?.id) return Alert.alert("Vessel Registration", "Select Country first");
                    setStateOpen(true);
                  }}
                  className="mt-2 rounded-xl border px-3 py-3 flex-row items-center justify-between active:opacity-80"
                  style={{ borderColor: UI.border, backgroundColor: UI.card }}
                >
                  <Text
                    className="text-base font-semibold"
                    style={{ color: form.stateSel ? UI.text : "#94a3b8" }}
                  >
                    {form.stateSel?.name || "Select"}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color={UI.muted} />
                </Pressable>
              </View>

              <View>
                <Label>District *</Label>
                <Pressable
                  onPress={() => {
                    if (!form.stateSel?.id) return Alert.alert("Vessel Registration", "Select State first");
                    setDistrictOpen(true);
                  }}
                  className="mt-2 rounded-xl border px-3 py-3 flex-row items-center justify-between active:opacity-80"
                  style={{ borderColor: UI.border, backgroundColor: UI.card }}
                >
                  <Text
                    className="text-base font-semibold"
                    style={{ color: form.districtSel ? UI.text : "#94a3b8" }}
                  >
                    {form.districtSel?.name || "Select"}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color={UI.muted} />
                </Pressable>
              </View>

              <View>
                <Label>Home Port (Port/Location) *</Label>
                <Pressable
                  onPress={() => {
                    if (!form.districtSel?.id) return Alert.alert("Vessel Registration", "Select District first");
                    setPortOpen(true);
                  }}
                  className="mt-2 rounded-xl border px-3 py-3 flex-row items-center justify-between active:opacity-80"
                  style={{ borderColor: UI.border, backgroundColor: UI.card }}
                >
                  <Text
                    className="text-base font-semibold"
                    style={{ color: form.portSel ? UI.text : "#94a3b8" }}
                  >
                    {form.portSel?.name || "Select"}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color={UI.muted} />
                </Pressable>

                {form.portSel ? (
                  <Text className="mt-2 text-[11px]" style={{ color: UI.muted }}>
                    Payload home_port: {form.portSel.name} · location_id: {form.portSel.id}
                    {INCLUDE_STATE_DISTRICT_IN_PAYLOAD
                      ? ` · state_id: ${form.portSel.state_id} · district_id: ${form.portSel.district_id}`
                      : ""}
                  </Text>
                ) : null}
              </View>

              <View>
                <Label>Fishing License No. (optional)</Label>
                <Input
                  value={form.fishingLicenseNo}
                  onChangeText={(v) => setField("fishingLicenseNo", v)}
                  placeholder="(optional)"
                  maxLength={40}
                />
              </View>

              <View>
                <Label>Crew Capacity (Max)</Label>
                <Input
                  value={form.crewCapacityMax}
                  onChangeText={(v) => setField("crewCapacityMax", v.replace(/[^\d]/g, ""))}
                  placeholder="6"
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>

              <View>
                <Label>Storage Capacity (kg)</Label>
                <Input
                  value={form.storageCapacityKg}
                  onChangeText={(v) => setField("storageCapacityKg", v.replace(/[^\d]/g, ""))}
                  placeholder="1500"
                  keyboardType="numeric"
                  maxLength={7}
                />
              </View>

              <View>
                <Label>Engine Power (HP)</Label>
                <Input
                  value={form.enginePowerHp}
                  onChangeText={(v) => setField("enginePowerHp", v.replace(/[^\d]/g, ""))}
                  placeholder="15"
                  keyboardType="numeric"
                  maxLength={6}
                />
              </View>

              <View>
                <Label>Fuel Type</Label>
                <Pressable
                  onPress={() => setFuelOpen(true)}
                  className="mt-2 rounded-xl border px-3 py-3 flex-row items-center justify-between active:opacity-80"
                  style={{ borderColor: UI.border, backgroundColor: UI.card }}
                >
                  <Text className="text-base font-semibold" style={{ color: UI.text }}>
                    {form.fuelType}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={UI.muted} />
                </Pressable>
              </View>

              {!ownerDbId ? (
                <View className="rounded-xl border px-3 py-3" style={{ borderColor: "#fecaca", backgroundColor: UI.redSoft }}>
                  <Text className="text-sm font-semibold" style={{ color: UI.red }}>
                    Owner ID not loaded yet. If login token expired, you’ll be redirected to login.
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </Card>

        {/* Buttons */}
        <View className="mt-4 flex-row gap-3">
          <Pressable
            onPress={onCancel}
            className="flex-1 rounded-2xl px-4 py-4 border active:opacity-90"
            style={{ backgroundColor: UI.card, borderColor: UI.border }}
            disabled={saving}
          >
            <Text className="text-center font-semibold text-base" style={{ color: UI.text }}>
              Cancel
            </Text>
          </Pressable>

          <Pressable
            onPress={onSave}
            className="flex-1 rounded-2xl px-4 py-4 active:opacity-90"
            style={{ backgroundColor: canSave ? UI.blue : "#94a3b8" }}
            disabled={saving || !canSave}
          >
            {saving ? (
              <View className="flex-row items-center justify-center">
                <ActivityIndicator color="#fff" />
                <Text className="ml-2 text-white font-semibold text-base">Saving…</Text>
              </View>
            ) : (
              <Text className="text-center text-white font-semibold text-base">Save</Text>
            )}
          </Pressable>
        </View>

        {/* Fuel Modal */}
        <Modal transparent visible={fuelOpen} animationType="fade">
          <Pressable onPress={() => setFuelOpen(false)} className="flex-1 bg-black/40 items-center justify-center px-6">
            <Pressable
              onPress={() => {}}
              className="w-full rounded-2xl border overflow-hidden"
              style={{ backgroundColor: UI.card, borderColor: UI.border }}
            >
              <View className="px-4 py-3 flex-row items-center justify-between">
                <Text className="text-base font-extrabold" style={{ color: UI.text }}>
                  Fuel Type
                </Text>
                <Pressable onPress={() => setFuelOpen(false)} className="rounded-full p-2 active:opacity-70">
                  <Ionicons name="close" size={20} color={UI.text} />
                </Pressable>
              </View>

              <FuelOption v="Diesel" />
              <FuelOption v="Petrol" />
              <FuelOption v="Electric" />
              <FuelOption v="Other" />
            </Pressable>
          </Pressable>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}