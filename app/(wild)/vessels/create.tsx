// app/(wild)/vessels/create.tsx
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import type { FuelType, VesselCreatePayload } from "../../../src/services/wild/vessels/vesselApi";

/**
 * ✅ What this file does (as you asked)
 * 1) Gets owner_id after login (from cache, else /api/me + /api/owner/fetch/:userId)
 * 2) Sends owner_id in POST payload
 * 3) Offline queue + auto-sync when internet returns
 * 4) Vessel type dropdown + "Other" => manual input
 * 5) Home Port selection: State -> District -> Port(Location) like trip create
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
type StateItem = { id: number; name: string; state_code?: string | null };
type DistrictItem = { id: number; name: string; district_code?: string | null; state_id: number };
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

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
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
  if (payload?.success === false) throw new Error(payload?.message || payload?.error || "Request failed");
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
  if (!res.ok) throw new Error(json?.message || json?.error || `GET ${path} failed (${res.status})`);
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
  // optional mirror
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

  const ownerId =
    Number(o?.id || o?.owner_id || o?.ownerId || 0);

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

/** ---------------- BottomSheet picker ---------------- */
type PickerBase = { id: any; name: string; code?: string | null; subName?: string };

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
    return options.filter((x) => {
      const a = String(x.name || "").toLowerCase();
      const b = String((x as any).subName || "").toLowerCase();
      const c = String(x.code || "").toLowerCase();
      return a.includes(t) || b.includes(t) || c.includes(t);
    });
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
          <Text className="text-base font-bold" style={{ color: UI.text }}>
            {title}
          </Text>
          <Pressable
            onPress={() => sheetRef.current?.dismiss()}
            className="rounded-full px-3 py-2 active:opacity-80"
          >
            <Text className="text-sm font-semibold" style={{ color: UI.blue }}>
              Done
            </Text>
          </Pressable>
        </View>

        <View
          className="mt-3 rounded-xl border px-3 py-2"
          style={{ borderColor: UI.border, backgroundColor: "#f8fafc" }}
        >
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search..."
            placeholderTextColor="#94a3b8"
            className="text-base"
            style={{ color: UI.text }}
          />
        </View>

        <ScrollView className="mt-3" keyboardShouldPersistTaps="handled">
          {loading ? (
            <View className="py-6 items-center">
              <Text className="text-sm" style={{ color: UI.muted }}>
                Loading...
              </Text>
            </View>
          ) : filtered.length === 0 ? (
            <View className="py-6 items-center">
              <Text className="text-sm" style={{ color: UI.muted }}>
                {emptyText || "No data"}
              </Text>
            </View>
          ) : (
            filtered.map((item) => {
              const active = String(item.id) === String(value?.id);
              return (
                <Pressable
                  key={String(item.id)}
                  onPress={() => {
                    onSelect(item);
                    sheetRef.current?.dismiss();
                  }}
                  className="mb-2 rounded-xl border px-4 py-3 active:opacity-80"
                  style={{
                    borderColor: active ? UI.blue : UI.border,
                    backgroundColor: active ? UI.blueSoft : UI.card,
                  }}
                >
                  <Text className="text-sm font-semibold" style={{ color: UI.text }}>
                    {item.name}
                  </Text>

                  {(item as any).subName ? (
                    <Text className="mt-1 text-[11px]" style={{ color: UI.muted }}>
                      {(item as any).subName}
                    </Text>
                  ) : null}

                  {item.code ? (
                    <Text className="mt-1 text-[11px]" style={{ color: UI.muted }}>
                      Code: {item.code}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </BottomSheetView>
    </BottomSheetModal>
  );
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
  const [states, setStates] = useState<StateItem[]>([]);
  const [districts, setDistricts] = useState<DistrictItem[]>([]);
  const [ports, setPorts] = useState<LocationItem[]>([]);

  const [statesLoading, setStatesLoading] = useState(false);
  const [districtsLoading, setDistrictsLoading] = useState(false);
  const [portsLoading, setPortsLoading] = useState(false);

  // bottom sheets
  const typeRef = useRef<BottomSheetModal>(null);
  const stateRef = useRef<BottomSheetModal>(null);
  const districtRef = useRef<BottomSheetModal>(null);
  const portRef = useRef<BottomSheetModal>(null);

  // modals
  const [fuelOpen, setFuelOpen] = useState(false);

  const [form, setForm] = useState<VesselForm>({
    localIdentifier: "",
    vesselName: "",
    govtRegNo: "",

    vesselTypePreset: "FRP Boat",
    vesselTypeOtherText: "",

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
    if (form.vesselTypePreset === "Other") {
      return (form.vesselTypeOtherText || "").trim();
    }
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
      !!form.portSel?.id // must select port
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
    }

    return payload;
  };

  /** -------- owner id load -------- */
  const loadOwnerId = async () => {
    // cached first (instant)
    const cached = await readCachedOwnerDbId();
    if (cached) setOwnerDbId(cached);

    // if online, refresh from API (authoritative)
    const onNow = await isOnlineNow();
    setOnline(onNow);
    if (!onNow) return;

    try {
      const fresh = await fetchOwnerDbIdOnline();
      setOwnerDbId(fresh);
    } catch (e: any) {
      const msg = String(e?.message || "");
      if (msg === "UNAUTHORIZED") router.replace(AUTH_LOGIN_ROUTE);
      // if cached exists, continue; else show error later on save
    }
  };

  /** -------- states/districts/ports load (like trip create) -------- */
  const loadStates = async () => {
    if (!online) return;
    setStatesLoading(true);
    try {
      const data = await geoGet<any>("/api/states");
      const arr = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
      const list: StateItem[] = arr
        .map((x: any) => ({
          id: Number(x?.id),
          name: String(x?.name || "").trim(),
          state_code: x?.state_code ?? null,
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

  /** -------- offline auto sync (like dashboard) -------- */
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
      // make sure owner is available; if not, try to load it
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

        // dispatch redux thunk (POST /api/vessels)
        const res: any = await dispatch(createVessel(patched as any)).unwrap();

        // if your backend returns {success,data} inside thunk, unwrap still ok
        return res;
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
        await loadStates();
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
        await loadStates();
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

  // when state changes -> reset district/port and load districts
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

  // when district changes -> reset port and load ports
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

      // online -> send
      await dispatch(createVessel(payload as any)).unwrap();
      Alert.alert("Success", "Vessel registered successfully.");
      router.back();
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (msg.includes("UNAUTHORIZED") || e?.status === 401) {
        router.replace(AUTH_LOGIN_ROUTE);
        return;
      }

      // if it's a network-ish failure, store offline and move on
      const m = msg.toLowerCase();
      const networkish =
        m.includes("network") || m.includes("failed to fetch") || m.includes("timeout") || m.includes("socket");

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

  /** -------- picker options -------- */
  const typeOptions = useMemo(
    () =>
      typePresets.map((x) => ({
        id: x.id,
        name: x.name,
      })),
    [typePresets],
  );

  const stateOptions = useMemo(
    () => states.map((s) => ({ id: s.id, name: s.name, code: s.state_code ?? null })),
    [states],
  );

  const districtOptions = useMemo(
    () => districts.map((d) => ({ id: d.id, name: d.name, code: d.district_code ?? null })),
    [districts],
  );

  const portOptions = useMemo(
    () => ports.map((p) => ({ id: p.id, name: p.name, code: p.location_code ?? null })),
    [ports],
  );

  const selectedTypeObj = useMemo(
    () => ({ id: form.vesselTypePreset, name: form.vesselTypePreset }),
    [form.vesselTypePreset],
  );

  const selectedStateObj = useMemo(
    () => (form.stateSel ? { id: form.stateSel.id, name: form.stateSel.name } : null),
    [form.stateSel],
  );

  const selectedDistrictObj = useMemo(
    () => (form.districtSel ? { id: form.districtSel.id, name: form.districtSel.name } : null),
    [form.districtSel],
  );

  const selectedPortObj = useMemo(
    () => (form.portSel ? { id: form.portSel.id, name: form.portSel.name } : null),
    [form.portSel],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: UI.bg }} edges={["top", "left", "right"]}>
      {/* BottomSheets */}
      <EntityPickerSheet
        title="Vessel Type"
        value={selectedTypeObj as any}
        options={typeOptions as any}
        loading={false}
        onSelect={(v: any) => {
          setField("vesselTypePreset", String(v.name));
          if (String(v.name) !== "Other") setField("vesselTypeOtherText", "");
        }}
        sheetRef={typeRef}
        emptyText="No types"
      />

      <EntityPickerSheet
        title="State"
        value={selectedStateObj as any}
        options={stateOptions as any}
        loading={statesLoading}
        onSelect={(v: any) => {
          const st = states.find((s) => String(s.id) === String(v.id)) || null;
          setField("stateSel", st);
        }}
        sheetRef={stateRef}
        emptyText="No states"
      />

      <EntityPickerSheet
        title="District"
        value={selectedDistrictObj as any}
        options={districtOptions as any}
        loading={districtsLoading}
        onSelect={(v: any) => {
          const d = districts.find((x) => String(x.id) === String(v.id)) || null;
          setField("districtSel", d);
        }}
        sheetRef={districtRef}
        emptyText="No districts"
      />

      <EntityPickerSheet
        title="Home Port (Port/Location)"
        value={selectedPortObj as any}
        options={portOptions as any}
        loading={portsLoading}
        onSelect={(v: any) => {
          const p = ports.find((x) => String(x.id) === String(v.id)) || null;
          setField("portSel", p);
        }}
        sheetRef={portRef}
        emptyText="No ports"
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
              <Ionicons
                name={online ? "wifi" : "wifi-outline"}
                size={18}
                color={online ? UI.green : UI.red}
              />
            )}
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 18 }} contentContainerClassName="px-4 pb-6">
        {/* Form Card */}
        <Card>
          <View className="p-4">
            <View className="flex-row items-center">
              <View className="h-10 w-10 rounded-2xl items-center justify-center" style={{ backgroundColor: UI.blueSoft }}>
                <Ionicons name="boat-outline" size={22} color={UI.blue} />
              </View>
              <View className="ml-3">
                <Text className="text-sm font-extrabold" style={{ color: UI.text }}>
                  Vessel Details
                </Text>
                <Text className="mt-0.5 text-xs" style={{ color: UI.muted }}>
                  Required: Govt Reg No, Local ID, Name, Type, State, District, Port
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

              {/* Vessel Type dropdown + Other manual */}
              <View>
                <Label>Vessel Type *</Label>
                <Pressable
                  onPress={() => typeRef.current?.present()}
                  className="mt-2 rounded-xl border px-3 py-3 flex-row items-center justify-between active:opacity-80"
                  style={{ borderColor: UI.border, backgroundColor: UI.card }}
                >
                  <Text className="text-base font-semibold" style={{ color: UI.text }}>
                    {form.vesselTypePreset || "Select"}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={UI.muted} />
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

              {/* Home Port selection: State -> District -> Port */}
              <View>
                <Label>State *</Label>
                <Pressable
                  onPress={() => stateRef.current?.present()}
                  className="mt-2 rounded-xl border px-3 py-3 flex-row items-center justify-between active:opacity-80"
                  style={{ borderColor: UI.border, backgroundColor: UI.card }}
                >
                  <Text className="text-base font-semibold" style={{ color: form.stateSel ? UI.text : "#94a3b8" }}>
                    {form.stateSel?.name || "Select"}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={UI.muted} />
                </Pressable>
              </View>

              <View>
                <Label>District *</Label>
                <Pressable
                  onPress={() => {
                    if (!form.stateSel?.id) return Alert.alert("Vessel Registration", "Select State first");
                    districtRef.current?.present();
                  }}
                  className="mt-2 rounded-xl border px-3 py-3 flex-row items-center justify-between active:opacity-80"
                  style={{ borderColor: UI.border, backgroundColor: UI.card }}
                >
                  <Text className="text-base font-semibold" style={{ color: form.districtSel ? UI.text : "#94a3b8" }}>
                    {form.districtSel?.name || "Select"}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={UI.muted} />
                </Pressable>
              </View>

              <View>
                <Label>Home Port (Port/Location) *</Label>
                <Pressable
                  onPress={() => {
                    if (!form.districtSel?.id) return Alert.alert("Vessel Registration", "Select District first");
                    portRef.current?.present();
                  }}
                  className="mt-2 rounded-xl border px-3 py-3 flex-row items-center justify-between active:opacity-80"
                  style={{ borderColor: UI.border, backgroundColor: UI.card }}
                >
                  <Text className="text-base font-semibold" style={{ color: form.portSel ? UI.text : "#94a3b8" }}>
                    {form.portSel?.name || "Select"}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={UI.muted} />
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

              {/* owner warning */}
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
          <Pressable
            onPress={() => setFuelOpen(false)}
            className="flex-1 bg-black/40 items-center justify-center px-6"
          >
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

        {/* Footer note */}
        <View className="mt-4 px-2">
          <Text className="text-xs" style={{ color: UI.muted }}>
            Payload includes{" "}
            <Text style={{ fontWeight: "900", color: UI.text }}>owner_id</Text>{" "}
            and home_port from selected Port. Offline saves to queue and auto-syncs when online.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
