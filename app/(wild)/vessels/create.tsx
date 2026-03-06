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
  KeyboardAvoidingView,
  Modal,
  Platform,
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
type Lang = "ta" | "en";

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

/** ---------------- i18n ---------------- */
const i18n = {
  en: {
    screenTitle: "Vessel Registration",
    online: "Online",
    offline: "Offline",
    pending: "Pending",
    loading: "Loading...",
    step: "Step",

    back: "Back",
    next: "Next",
    save: "Save",
    saving: "Saving…",

    cancel: "Cancel",
    discardTitle: "Cancel",
    discardMsg: "Discard changes?",
    yes: "Yes",
    no: "No",

    validationTitle: "Validation",

    ownerNotLoaded: "Owner ID not loaded yet. Please wait / check login.",
    internetNeeded:
      "Internet needed to load Country/State/District/Port lists.",

    savedOfflineTitle: "Saved Offline",
    savedOfflineMsg:
      "No internet. Vessel saved locally and will sync when online.",
    networkSavedOfflineMsg:
      "Network issue. Saved locally and will sync when online.",

    successTitle: "Success",
    successMsg:
      "Vessel registered successfully. OneBlue team will contact you soon.",
    errorTitle: "Error",

    // Steps
    step1Title: "Basic Details",
    step1Sub: "Local ID, Vessel name, Govt reg no",
    step2Title: "Vessel Type",
    step2Sub: "Select type (or Other)",
    step3Title: "Home Port",
    step3Sub: "Country → State → District → Port",
    step4Title: "More Info (Optional)",
    step4Sub: "License, capacities, fuel type",
    step5Title: "Review & Save",
    step5Sub: "Check and press Save",

    // Fields / Labels
    enterBasicTitle: "Enter the basic details",
    enterBasicSub: "Fill these 3 boxes",
    localId: "Local Identifier",
    vesselName: "Vessel Name",
    govtReg: "Govt Registration No.",
    vesselType: "Vessel Type",
    other: "Other",
    typeOther: "Type (Other)",
    country: "Country",
    state: "State",
    district: "District",
    port: "Home Port (Port/Location)",
    license: "Fishing License No.",
    crewCap: "Crew Capacity (Max)",
    storageKg: "Storage Capacity (kg)",
    engineHp: "Engine Power (HP)",
    fuelType: "Fuel Type",
    optional: "(optional)",

    // Placeholders / actions
    tapChooseType: "Tap to choose vessel type",
    tapChooseCountry: "Tap to choose country",
    tapChooseState: "Tap to choose state",
    tapChooseDistrict: "Tap to choose district",
    tapChoosePort: "Tap to choose port/location",
    select: "Select",
    search: "Search...",

    // Helpers
    chooseOneOrOther: "Choose one option. If Other → type manually",
    otherExample: "Example: Fiber boat / Catamaran / etc",
    selectedPort: "Selected Port",
    missingRequired:
      "Missing required fields. Go back and fill all required items.",

    // Validation errors
    errLocalId: "Enter Local Identifier",
    errVesselName: "Enter Vessel Name",
    errGovtReg: "Enter Govt Registration No.",
    errVesselType: "Select Vessel Type",
    errOtherType: "Enter Vessel Type (Other)",
    errCountry: "Select Country",
    errState: "Select State",
    errDistrict: "Select District",
    errPort: "Select Port/Location",
    errCrewCap: "Crew Capacity must be a valid number",
    errStorage: "Storage Capacity must be a valid number",
    errEngine: "Engine Power must be a valid number",

    // Alerts / dependency messages
    selectCountryFirst: "Select Country first",
    selectStateFirst: "Select State first",
    selectDistrictFirst: "Select District first",

    // Picker titles
    pickerVesselType: "Vessel Type",
    pickerCountry: "Country",
    pickerState: "State",
    pickerDistrict: "District",
    pickerPort: "Home Port (Port/Location)",

    // Fuel modal
    fuelModalTitle: "Fuel Type",

    // Loading helpers
    loadingCountries: "Loading countries...",
    loadingStates: "Loading states...",
    loadingDistricts: "Loading districts...",
    loadingPorts: "Loading ports...",
  },
  ta: {
    screenTitle: "வள்ளம் பதிவு",
    online: "இணையத்தில்",
    offline: "இணையமில்லை",
    pending: "மீதம்",
    loading: "Loading...",
    step: "படி",

    back: "பின்",
    next: "அடுத்து",
    save: "சேமி",
    saving: "சேமிக்கிறது…",

    cancel: "ரத்து",
    discardTitle: "ரத்து",
    discardMsg: "மாற்றங்களை கைவிடவா?",
    yes: "ஆம்",
    no: "இல்லை",

    validationTitle: "சரிபார்ப்பு",

    ownerNotLoaded:
      "Owner ID இன்னும் வரலை. கொஞ்சம் காத்திருக்கவும் / login பார்க்கவும்.",
    internetNeeded:
      "Country/State/District/Port பட்டியலுக்கு இணையம் வேண்டும்.",

    savedOfflineTitle: "Offline-ல் சேமிக்கப்பட்டது",
    savedOfflineMsg:
      "இணையம் இல்லை. Local-ல் சேமித்து வைத்தோம். Net வந்ததும் auto sync ஆகும்.",
    networkSavedOfflineMsg:
      "Network பிரச்சனை. Local-ல் சேமித்து வைத்தோம். Net வந்ததும் auto sync ஆகும்.",

    successTitle: "வெற்றி",
    successMsg:
      "வள்ளம் பதிவு முடிந்தது. OneBlue குழு விரைவில் தொடர்பு கொள்வார்கள்.",
    errorTitle: "பிழை",

    // Steps
    step1Title: "அடிப்படை விவரம்",
    step1Sub: "Local ID, பெயர், அரசு பதிவு எண்",
    step2Title: "வள்ளம் வகை",
    step2Sub: "வகை தேர்வு (அல்லது மற்றது)",
    step3Title: "முகப்பு துறைமுகம்",
    step3Sub: "நாடு → மாநிலம் → மாவட்டம் → Port",
    step4Title: "கூடுதல் விவரம் (விருப்பம்)",
    step4Sub: "லைசன்ஸ், capacity, எரிபொருள்",
    step5Title: "சரிபார்த்து சேமி",
    step5Sub: "ஒருமுறை பார்த்து Save பண்ணுங்க",

    // Fields / Labels
    enterBasicTitle: "அடிப்படை விவரங்களை உள்ளிடவும்",
    enterBasicSub: "இந்த 3 பெட்டிகளை நிரப்பவும்",
    localId: "Local Identifier",
    vesselName: "வள்ளம் பெயர்",
    govtReg: "அரசு பதிவு எண்",
    vesselType: "வள்ளம் வகை",
    other: "மற்றது",
    typeOther: "வகை (மற்றது)",
    country: "நாடு",
    state: "மாநிலம்",
    district: "மாவட்டம்",
    port: "முகப்பு துறைமுகம் (Location)",
    license: "மீன்பிடி லைசன்ஸ் எண்",
    crewCap: "குழு எண்ணிக்கை (Max)",
    storageKg: "சேமிப்பு (kg)",
    engineHp: "என்ஜின் (HP)",
    fuelType: "எரிபொருள்",
    optional: "(விருப்பம்)",

    // Placeholders / actions
    tapChooseType: "வள்ளம் வகையை தேர்வு செய்ய தட்டவும்",
    tapChooseCountry: "நாடு தேர்வு செய்ய தட்டவும்",
    tapChooseState: "மாநிலம் தேர்வு செய்ய தட்டவும்",
    tapChooseDistrict: "மாவட்டம் தேர்வு செய்ய தட்டவும்",
    tapChoosePort: "Port தேர்வு செய்ய தட்டவும்",
    select: "தேர்வு",
    search: "தேடு...",

    // Helpers
    chooseOneOrOther: "ஒரு option தேர்வு பண்ணுங்க. Other என்றால் எழுதவும்",
    otherExample: "உதா: Fiber boat / Catamaran / etc",
    selectedPort: "தேர்வு செய்த Port",
    missingRequired: "தேவையான தகவல்கள் இல்லை. பின்சென்று நிரப்பவும்.",

    // Validation errors
    errLocalId: "Local Identifier உள்ளிடவும்",
    errVesselName: "வள்ளம் பெயர் உள்ளிடவும்",
    errGovtReg: "அரசு பதிவு எண் உள்ளிடவும்",
    errVesselType: "வள்ளம் வகை தேர்வு செய்யவும்",
    errOtherType: "வகை (Other) எழுதவும்",
    errCountry: "நாடு தேர்வு செய்யவும்",
    errState: "மாநிலம் தேர்வு செய்யவும்",
    errDistrict: "மாவட்டம் தேர்வு செய்யவும்",
    errPort: "Port/Location தேர்வு செய்யவும்",
    errCrewCap: "Crew Capacity சரியான எண்ணாக இருக்க வேண்டும்",
    errStorage: "Storage Capacity சரியான எண்ணாக இருக்க வேண்டும்",
    errEngine: "Engine Power சரியான எண்ணாக இருக்க வேண்டும்",

    // Alerts / dependency messages
    selectCountryFirst: "முதலில் நாடு தேர்வு செய்யவும்",
    selectStateFirst: "முதலில் மாநிலம் தேர்வு செய்யவும்",
    selectDistrictFirst: "முதலில் மாவட்டம் தேர்வு செய்யவும்",

    // Picker titles
    pickerVesselType: "வள்ளம் வகை",
    pickerCountry: "நாடு",
    pickerState: "மாநிலம்",
    pickerDistrict: "மாவட்டம்",
    pickerPort: "முகப்பு துறைமுகம் (Location)",

    // Fuel modal
    fuelModalTitle: "எரிபொருள்",

    // Loading helpers
    loadingCountries: "நாடுகள் load ஆகுது...",
    loadingStates: "மாநிலங்கள் load ஆகுது...",
    loadingDistricts: "மாவட்டங்கள் load ஆகுது...",
    loadingPorts: "Ports load ஆகுது...",
  },
} as const;

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
    <Text
      className="text-xs font-semibold"
      style={{ color: UI.muted, lineHeight: 20, flexShrink: 1 }}
    >
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
  onFocus,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: any;
  maxLength?: number;
  editable?: boolean;
  onFocus?: () => void;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      onFocus={onFocus}
      placeholder={placeholder}
      placeholderTextColor="#94a3b8"
      keyboardType={keyboardType}
      maxLength={maxLength}
      editable={editable}
      multiline={false}
      className="mt-2 rounded-xl border px-3 py-3 text-base"
      style={{
        borderColor: UI.border,
        color: UI.text,
        backgroundColor: editable ? "#ffffff" : "#f1f5f9",
        minHeight: 56,
        lineHeight: 24,
        textAlignVertical: "center",
        paddingTop: 14,
        paddingBottom: 14,
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
  confirmLabel,
  searchPlaceholder,
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
  confirmLabel: string;
  searchPlaceholder: string;
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
              minWidth: 0,
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
          <Text
            style={{ color: "rgba(255,255,255,0.70)", fontWeight: "900" }}
          >
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
              lineHeight: 22,
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
              <Text
                style={{ color: "rgba(255,255,255,0.70)", fontWeight: "800" }}
              >
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
              keyboardShouldPersistTaps="handled"
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
                            lineHeight: 22,
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
                              lineHeight: 18,
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
              backgroundColor: selectedItem
                ? "#93c5fd"
                : "rgba(255,255,255,0.20)",
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
  const v1 = await AsyncStorage.getItem(LAST_OWNER_ID_KEY);
  const n1 = v1 ? Number(String(v1).trim()) : NaN;
  if (Number.isFinite(n1) && n1 > 0) return n1;

  const raw = await AsyncStorage.getItem(ME_CACHE_KEY);
  if (raw) {
    try {
      const p = JSON.parse(raw);
      const n2 = Number(p?.ownerDbId || p?.owner_db_id || p?.owner_id || 0);
      if (Number.isFinite(n2) && n2 > 0) return n2;
    } catch {}
  }

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

  const meRes = await fetch(ME_API, {
    method: "GET",
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });

  if (meRes.status === 401) throw new Error("UNAUTHORIZED");
  const meJson = await safeJson(meRes);
  if (!meRes.ok)
    throw new Error(meJson?.message || meJson?.error || `ME API failed (${meRes.status})`);

  const me = meJson?.user ?? meJson?.data?.user ?? meJson?.data ?? meJson ?? {};
  const userId = Number(me?.id || 0);
  if (!Number.isFinite(userId) || userId <= 0) throw new Error("ME returned invalid id");

  const ownerRes = await fetch(`${OWNER_FETCH_API}/${encodeURIComponent(String(userId))}`, {
    method: "GET",
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });

  if (ownerRes.status === 401) throw new Error("UNAUTHORIZED");
  const ownerJson = await safeJson(ownerRes);
  if (!ownerRes.ok)
    throw new Error(
      ownerJson?.message || ownerJson?.error || `Owner fetch failed (${ownerRes.status})`,
    );

  const data: any = unwrapData<any>(ownerJson);
  const o = Array.isArray(data) ? data[0] : data;

  const ownerId = Number(o?.id || o?.owner_id || o?.ownerId || 0);
  if (!Number.isFinite(ownerId) || ownerId <= 0)
    throw new Error("Owner fetch returned invalid owner id");

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

/** ---------------- WIZARD UI HELPERS (UI ONLY) ---------------- */
function IconBubble({
  name,
  bg,
  color,
}: {
  name: any;
  bg: string;
  color: string;
}) {
  return (
    <View
      style={{
        width: 44,
        height: 44,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: bg,
        borderWidth: 1,
        borderColor: UI.border,
      }}
    >
      <Ionicons name={name} size={22} color={color} />
    </View>
  );
}

function StepHeader({
  step,
  total,
  title,
  sub,
  icon,
  online,
  statusText,
  stepLabel,
}: {
  step: number;
  total: number;
  title: string;
  sub: string;
  icon: any;
  online: boolean;
  statusText: string;
  stepLabel: string;
}) {
  return (
    <Card>
      <View style={{ padding: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          <IconBubble
            name={icon}
            bg={online ? UI.greenSoft : UI.redSoft}
            color={online ? UI.green : UI.red}
          />

          <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
            <Text style={{ fontSize: 12, fontWeight: "900", color: UI.muted, lineHeight: 18 }}>
              {stepLabel} {step} / {total}
            </Text>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "900",
                color: UI.text,
                marginTop: 2,
                lineHeight: 28,
                flexShrink: 1,
              }}
            >
              {title}
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: UI.muted,
                marginTop: 4,
                lineHeight: 18,
                flexShrink: 1,
              }}
            >
              {sub}
            </Text>
          </View>

          <View style={{ alignItems: "flex-end", marginLeft: 10, maxWidth: 120 }}>
            <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  backgroundColor: online ? UI.green : UI.red,
                  marginRight: 8,
                  marginTop: 3,
                }}
              />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "900",
                  color: online ? UI.green : UI.red,
                  lineHeight: 18,
                  flexShrink: 1,
                }}
              >
                {statusText}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Card>
  );
}

function BigRow({
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
        borderColor: UI.border,
        backgroundColor: UI.card,
        padding: 14,
        marginTop: 12,
        ...(CARD_SHADOW as any),
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <IconBubble name={icon} bg={UI.blueSoft} color={UI.blue} />

        <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
          <Text style={{ fontSize: 12, fontWeight: "900", color: UI.muted, lineHeight: 18 }}>
            {title}
          </Text>
          <Text
            style={{
              marginTop: 4,
              fontSize: 18,
              fontWeight: "900",
              color: hasValue ? UI.text : "#94a3b8",
              lineHeight: 28,
              flexShrink: 1,
            }}
            numberOfLines={2}
          >
            {hasValue ? value : placeholder}
          </Text>
          {!!helper ? (
            <Text
              style={{ marginTop: 6, fontSize: 12, color: UI.muted, lineHeight: 18 }}
              numberOfLines={2}
            >
              {helper}
            </Text>
          ) : null}
        </View>

        <Ionicons name="chevron-forward" size={18} color={UI.muted} />
      </View>
    </Pressable>
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
      <IconBubble name={icon} bg="#f1f5f9" color={UI.muted} />
      <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
        <Text style={{ fontSize: 12, fontWeight: "900", color: UI.muted, lineHeight: 18 }}>
          {label}
        </Text>
        <Text
          style={{
            fontSize: 16,
            fontWeight: "900",
            color: UI.text,
            marginTop: 3,
            lineHeight: 24,
            flexShrink: 1,
          }}
        >
          {value || "—"}
        </Text>
      </View>
    </View>
  );
}

/** ---------------- SCREEN ---------------- */
export default function VesselCreateScreen() {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();

  const scrollRef = useRef<ScrollView>(null);
  const fieldYRef = useRef<Record<string, number>>({});

  const [lang, setLang] = useState<Lang>("ta");
  const t = i18n[lang];

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

  const [pendingCount, setPendingCount] = useState(0);
  const syncingRef = useRef(false);

  const [countries, setCountries] = useState<CountryItem[]>([]);
  const [states, setStates] = useState<StateItem[]>([]);
  const [districts, setDistricts] = useState<DistrictItem[]>([]);
  const [ports, setPorts] = useState<LocationItem[]>([]);

  const [countriesLoading, setCountriesLoading] = useState(false);
  const [statesLoading, setStatesLoading] = useState(false);
  const [districtsLoading, setDistrictsLoading] = useState(false);
  const [portsLoading, setPortsLoading] = useState(false);

  const [typeOpen, setTypeOpen] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);
  const [stateOpen, setStateOpen] = useState(false);
  const [districtOpen, setDistrictOpen] = useState(false);
  const [portOpen, setPortOpen] = useState(false);

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

  const scrollToField = (key: string) => {
    const y = fieldYRef.current[key];
    if (typeof y !== "number") return;
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, y - 110),
        animated: true,
      });
    }, 120);
  };

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
    if (!ownerDbId) return t.ownerNotLoaded;
    if (!form.localIdentifier.trim()) return t.errLocalId;
    if (!form.vesselName.trim()) return t.errVesselName;
    if (!form.govtRegNo.trim()) return t.errGovtReg;

    if (!resolvedVesselType.trim()) return t.errVesselType;
    if (form.vesselTypePreset === "Other" && !form.vesselTypeOtherText.trim())
      return t.errOtherType;

    if (!form.countrySel?.id) return t.errCountry;
    if (!form.stateSel?.id) return t.errState;
    if (!form.districtSel?.id) return t.errDistrict;
    if (!form.portSel?.id) return t.errPort;

    if (String(form.crewCapacityMax).trim() && !toIntOrNull(form.crewCapacityMax))
      return t.errCrewCap;

    if (String(form.storageCapacityKg).trim() && !toIntOrNull(form.storageCapacityKg))
      return t.errStorage;

    if (String(form.enginePowerHp).trim() && !toIntOrNull(form.enginePowerHp))
      return t.errEngine;

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

  useEffect(() => {
    (async () => {
      const cid = form.countrySel?.id;

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

  const onCancel = () => {
    Alert.alert(t.discardTitle, t.discardMsg, [
      { text: t.no, style: "cancel" },
      { text: t.yes, style: "destructive", onPress: () => router.back() },
    ]);
  };

  const onSave = async () => {
    const err = validate();
    if (err) return Alert.alert(t.validationTitle, err);

    const payload = buildPayload();

    setSaving(true);
    try {
      const onNow = await isOnlineNow();
      setOnline(onNow);

      if (!onNow) {
        await enqueueOfflineVessel(payload);
        await refreshPending();
        Alert.alert(t.savedOfflineTitle, t.savedOfflineMsg);
        router.back();
        return;
      }

      await dispatch(createVessel(payload as any)).unwrap();
      Alert.alert(t.successTitle, t.successMsg);
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
        Alert.alert(t.savedOfflineTitle, t.networkSavedOfflineMsg);
        router.back();
        return;
      }

      Alert.alert(t.errorTitle, msg || "Failed to save vessel");
    } finally {
      setSaving(false);
    }
  };

  const FuelOption = ({ v }: { v: FuelType }) => (
    <Pressable
      onPress={() => {
        setField("fuelType", v);
        setFuelOpen(false);
      }}
      className="px-4 py-4 border-b"
      style={{ borderColor: UI.border }}
    >
      <Text
        className="text-base font-semibold"
        style={{ color: UI.text, lineHeight: 24 }}
      >
        {v}
      </Text>
    </Pressable>
  );

  const NEXT_LABEL = t.next;

  const typeItems: FullPickItem[] = useMemo(
    () => typePresets.map((x) => ({ key: x.name, label: x.name })),
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

  const TOTAL_STEPS = 5;
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  const stepMeta = useMemo(() => {
    return {
      1: { icon: "document-text", title: t.step1Title, sub: t.step1Sub },
      2: { icon: "boat", title: t.step2Title, sub: t.step2Sub },
      3: { icon: "location", title: t.step3Title, sub: t.step3Sub },
      4: { icon: "options", title: t.step4Title, sub: t.step4Sub },
      5: { icon: "checkmark-circle", title: t.step5Title, sub: t.step5Sub },
    } as const;
  }, [t]);

  const guardStep = (s: number) => {
    if (!ownerDbId) {
      Alert.alert(t.screenTitle, t.ownerNotLoaded);
      return false;
    }

    if (s === 1) {
      if (!form.localIdentifier.trim())
        return Alert.alert(t.screenTitle, t.errLocalId), false;
      if (!form.vesselName.trim())
        return Alert.alert(t.screenTitle, t.errVesselName), false;
      if (!form.govtRegNo.trim())
        return Alert.alert(t.screenTitle, t.errGovtReg), false;
      return true;
    }

    if (s === 2) {
      if (!form.vesselTypePreset.trim())
        return Alert.alert(t.screenTitle, t.errVesselType), false;
      if (form.vesselTypePreset === "Other" && !form.vesselTypeOtherText.trim())
        return Alert.alert(t.screenTitle, t.errOtherType), false;
      return true;
    }

    if (s === 3) {
      if (!online)
        return Alert.alert(t.screenTitle, t.internetNeeded), false;

      if (!form.countrySel?.id)
        return Alert.alert(t.screenTitle, t.errCountry), false;
      if (!form.stateSel?.id)
        return Alert.alert(t.screenTitle, t.errState), false;
      if (!form.districtSel?.id)
        return Alert.alert(t.screenTitle, t.errDistrict), false;
      if (!form.portSel?.id)
        return Alert.alert(t.screenTitle, t.errPort), false;

      return true;
    }

    return true;
  };

  const goNext = () => {
    if (!guardStep(step)) return;
    setStep((p) => (p < TOTAL_STEPS ? ((p + 1) as any) : p));
  };

  const goBackStep = () => {
    if (step === 1) return onCancel();
    setStep((p) => (p > 1 ? ((p - 1) as any) : p));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: UI.bg }} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 18}
      >
        {/* ✅ FULL SCREEN PICKERS */}
        <FullScreenPickerModal
          visible={typeOpen}
          title={t.pickerVesselType}
          items={typeItems}
          selectedKey={form.vesselTypePreset || ""}
          loading={false}
          emptyText="No types"
          confirmLabel={NEXT_LABEL}
          searchPlaceholder={t.search}
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
          title={t.pickerCountry}
          items={countryItems}
          selectedKey={form.countrySel?.id ? String(form.countrySel.id) : ""}
          loading={countriesLoading}
          emptyText="No countries"
          confirmLabel={NEXT_LABEL}
          searchPlaceholder={t.search}
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
          title={t.pickerState}
          items={stateItems}
          selectedKey={form.stateSel?.id ? String(form.stateSel.id) : ""}
          loading={statesLoading}
          emptyText="No states"
          confirmLabel={NEXT_LABEL}
          searchPlaceholder={t.search}
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
          title={t.pickerDistrict}
          items={districtItems}
          selectedKey={form.districtSel?.id ? String(form.districtSel.id) : ""}
          loading={districtsLoading}
          emptyText="No districts"
          confirmLabel={NEXT_LABEL}
          searchPlaceholder={t.search}
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
          title={t.pickerPort}
          items={portItems}
          selectedKey={form.portSel?.id ? String(form.portSel.id) : ""}
          loading={portsLoading}
          emptyText="No ports"
          confirmLabel={NEXT_LABEL}
          searchPlaceholder={t.search}
          insetsBottom={insets.bottom}
          onClose={() => setPortOpen(false)}
          onConfirm={(item) => {
            const p = ports.find((x) => String(x.id) === String(item.key)) || null;
            setField("portSel", p);
            setPortOpen(false);
          }}
        />

        {/* Header */}
        <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10 }}>
          <View
            style={{
              backgroundColor: UI.card,
              borderColor: UI.border,
              borderWidth: 1,
              borderRadius: 24,
              paddingHorizontal: 14,
              paddingVertical: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1, minWidth: 0 }}>
              <Pressable
                onPress={goBackStep}
                style={{ padding: 10, borderRadius: 18, backgroundColor: UI.blueSoft }}
                hitSlop={8}
              >
                <Ionicons name="arrow-back" size={20} color={UI.blue} />
              </Pressable>

              <View style={{ marginLeft: 12, flex: 1, minWidth: 0 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "900",
                    color: UI.text,
                    lineHeight: 26,
                    flexShrink: 1,
                  }}
                  numberOfLines={2}
                >
                  {t.screenTitle}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: UI.muted,
                    marginTop: 2,
                    lineHeight: 18,
                    flexShrink: 1,
                  }}
                  numberOfLines={2}
                >
                  {online ? t.online : t.offline} · Owner ID: {ownerDbId ? String(ownerDbId) : "—"}
                  {pendingCount > 0 ? ` · ${t.pending}: ${pendingCount}` : ""}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", marginLeft: 10 }}>
              <Pressable
                onPress={() => setLang((x) => (x === "ta" ? "en" : "ta"))}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: UI.border,
                  backgroundColor: "white",
                  marginRight: 10,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "900", color: UI.text, lineHeight: 18 }}>
                  {lang === "ta" ? "English" : "தமிழ்"}
                </Text>
              </Pressable>

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

        {/* Step header */}
        <View style={{ paddingHorizontal: 16 }}>
          <StepHeader
            step={step}
            total={TOTAL_STEPS}
            title={stepMeta[step].title}
            sub={stepMeta[step].sub}
            icon={stepMeta[step].icon}
            online={online}
            statusText={online ? t.online : t.offline}
            stepLabel={t.step}
          />
        </View>

        {/* Content */}
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 130 + insets.bottom,
          }}
        >
          {!online && step === 3 ? (
            <View
              style={{
                marginTop: 12,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: "#fecaca",
                backgroundColor: UI.redSoft,
                padding: 12,
              }}
            >
              <Text style={{ color: UI.red, fontWeight: "900", lineHeight: 22 }}>
                {t.internetNeeded}
              </Text>
            </View>
          ) : null}

          {/* ===== STEP 1: BASIC DETAILS ===== */}
          {step === 1 ? (
            <Card className="mt-3">
              <View className="p-4">
                <View className="flex-row items-center">
                  <IconBubble name="document-text" bg={UI.blueSoft} color={UI.blue} />
                  <View className="ml-3 flex-1 min-w-0">
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "900",
                        color: UI.text,
                        lineHeight: 22,
                        flexShrink: 1,
                      }}
                    >
                      {t.enterBasicTitle}
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: UI.muted,
                        marginTop: 2,
                        lineHeight: 18,
                        flexShrink: 1,
                      }}
                    >
                      {t.enterBasicSub}
                    </Text>
                  </View>
                </View>

                <View
                  className="mt-4"
                  onLayout={(e) => {
                    fieldYRef.current.localIdentifier = e.nativeEvent.layout.y;
                  }}
                >
                  <Label>{t.localId} *</Label>
                  <Input
                    value={form.localIdentifier}
                    onChangeText={(v) => setField("localIdentifier", v)}
                    onFocus={() => scrollToField("localIdentifier")}
                    placeholder="LOCAL-07"
                    maxLength={40}
                  />
                </View>

                <View
                  className="mt-4"
                  onLayout={(e) => {
                    fieldYRef.current.vesselName = e.nativeEvent.layout.y;
                  }}
                >
                  <Label>{t.vesselName} *</Label>
                  <Input
                    value={form.vesselName}
                    onChangeText={(v) => setField("vesselName", v)}
                    onFocus={() => scrollToField("vesselName")}
                    placeholder="Blue Pearl"
                    maxLength={80}
                  />
                </View>

                <View
                  className="mt-4"
                  onLayout={(e) => {
                    fieldYRef.current.govtRegNo = e.nativeEvent.layout.y;
                  }}
                >
                  <Label>{t.govtReg} *</Label>
                  <Input
                    value={form.govtRegNo}
                    onChangeText={(v) => setField("govtRegNo", v)}
                    onFocus={() => scrollToField("govtRegNo")}
                    placeholder="TN-REG-2026-0"
                    maxLength={50}
                  />
                </View>

                {!ownerDbId ? (
                  <View
                    style={{
                      marginTop: 14,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: "#fecaca",
                      backgroundColor: UI.redSoft,
                      padding: 12,
                    }}
                  >
                    <Text style={{ color: UI.red, fontWeight: "900", lineHeight: 22 }}>
                      {t.ownerNotLoaded}
                    </Text>
                  </View>
                ) : null}
              </View>
            </Card>
          ) : null}

          {/* ===== STEP 2: VESSEL TYPE ===== */}
          {step === 2 ? (
            <View style={{ marginTop: 6 }}>
              <BigRow
                icon="boat-outline"
                title={`${t.vesselType} *`}
                value={form.vesselTypePreset || ""}
                placeholder={t.tapChooseType}
                onPress={() => setTypeOpen(true)}
                helper={t.chooseOneOrOther}
              />

              {form.vesselTypePreset === "Other" ? (
                <Card className="mt-3">
                  <View className="p-4">
                    <View className="flex-row items-center">
                      <IconBubble name="create-outline" bg={UI.blueSoft} color={UI.blue} />
                      <View className="ml-3 flex-1 min-w-0">
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "900",
                            color: UI.text,
                            lineHeight: 22,
                            flexShrink: 1,
                          }}
                        >
                          {t.typeOther}
                        </Text>
                        <Text
                          style={{
                            fontSize: 12,
                            color: UI.muted,
                            marginTop: 2,
                            lineHeight: 18,
                            flexShrink: 1,
                          }}
                        >
                          {t.otherExample}
                        </Text>
                      </View>
                    </View>

                    <View
                      className="mt-4"
                      onLayout={(e) => {
                        fieldYRef.current.vesselTypeOtherText = e.nativeEvent.layout.y;
                      }}
                    >
                      <Label>{t.typeOther} *</Label>
                      <Input
                        value={form.vesselTypeOtherText}
                        onChangeText={(v) => setField("vesselTypeOtherText", v)}
                        onFocus={() => scrollToField("vesselTypeOtherText")}
                        placeholder={t.typeOther}
                        maxLength={60}
                      />
                    </View>
                  </View>
                </Card>
              ) : null}
            </View>
          ) : null}

          {/* ===== STEP 3: HOME PORT ===== */}
          {step === 3 ? (
            <View style={{ marginTop: 6 }}>
              <BigRow
                icon="flag-outline"
                title={`${t.country} *`}
                value={form.countrySel?.name || ""}
                placeholder={t.tapChooseCountry}
                onPress={() => {
                  if (!online) return Alert.alert(t.screenTitle, t.internetNeeded);
                  setCountryOpen(true);
                }}
                disabled={!online}
                helper={countriesLoading ? t.loadingCountries : ""}
              />

              <BigRow
                icon="map-outline"
                title={`${t.state} *`}
                value={form.stateSel?.name || ""}
                placeholder={t.tapChooseState}
                onPress={() => {
                  if (!form.countrySel?.id) return Alert.alert(t.screenTitle, t.selectCountryFirst);
                  setStateOpen(true);
                }}
                disabled={!form.countrySel?.id}
                helper={statesLoading ? t.loadingStates : ""}
              />

              <BigRow
                icon="business-outline"
                title={`${t.district} *`}
                value={form.districtSel?.name || ""}
                placeholder={t.tapChooseDistrict}
                onPress={() => {
                  if (!form.stateSel?.id) return Alert.alert(t.screenTitle, t.selectStateFirst);
                  setDistrictOpen(true);
                }}
                disabled={!form.stateSel?.id}
                helper={districtsLoading ? t.loadingDistricts : ""}
              />

              <BigRow
                icon="location-outline"
                title={`${t.port} *`}
                value={form.portSel?.name || ""}
                placeholder={t.tapChoosePort}
                onPress={() => {
                  if (!form.districtSel?.id) return Alert.alert(t.screenTitle, t.selectDistrictFirst);
                  setPortOpen(true);
                }}
                disabled={!form.districtSel?.id}
                helper={portsLoading ? t.loadingPorts : ""}
              />

              {form.portSel ? (
                <View
                  style={{
                    marginTop: 12,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: UI.border,
                    backgroundColor: UI.card,
                    padding: 12,
                    ...(CARD_SHADOW as any),
                  }}
                >
                  <Text style={{ fontSize: 12, color: UI.muted, lineHeight: 18 }}>
                    {t.selectedPort}:{" "}
                    <Text style={{ fontWeight: "900", color: UI.text }}>
                      {form.portSel.name}
                    </Text>
                  </Text>

                  <Text
                    style={{
                      fontSize: 12,
                      color: UI.muted,
                      marginTop: 6,
                      lineHeight: 18,
                    }}
                  >
                    home_port: {form.portSel.name} · location_id: {form.portSel.id}
                    {INCLUDE_STATE_DISTRICT_IN_PAYLOAD
                      ? ` · state_id: ${form.portSel.state_id} · district_id: ${form.portSel.district_id}`
                      : ""}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* ===== STEP 4: OPTIONAL DETAILS ===== */}
          {step === 4 ? (
            <Card className="mt-3">
              <View className="p-4">
                <View className="flex-row items-center">
                  <IconBubble name="options-outline" bg={UI.blueSoft} color={UI.blue} />
                  <View className="ml-3 flex-1 min-w-0">
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "900",
                        color: UI.text,
                        lineHeight: 22,
                        flexShrink: 1,
                      }}
                    >
                      {t.step4Title}
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: UI.muted,
                        marginTop: 2,
                        lineHeight: 18,
                        flexShrink: 1,
                      }}
                    >
                      {t.step4Sub}
                    </Text>
                  </View>
                </View>

                <View
                  className="mt-4"
                  onLayout={(e) => {
                    fieldYRef.current.fishingLicenseNo = e.nativeEvent.layout.y;
                  }}
                >
                  <Label>
                    {t.license} {t.optional}
                  </Label>
                  <Input
                    value={form.fishingLicenseNo}
                    onChangeText={(v) => setField("fishingLicenseNo", v)}
                    onFocus={() => scrollToField("fishingLicenseNo")}
                    placeholder={t.optional}
                    maxLength={40}
                  />
                </View>

                <View
                  className="mt-4"
                  onLayout={(e) => {
                    fieldYRef.current.crewCapacityMax = e.nativeEvent.layout.y;
                  }}
                >
                  <Label>{t.crewCap}</Label>
                  <Input
                    value={form.crewCapacityMax}
                    onChangeText={(v) => setField("crewCapacityMax", v.replace(/[^\d]/g, ""))}
                    onFocus={() => scrollToField("crewCapacityMax")}
                    placeholder="6"
                    keyboardType="numeric"
                    maxLength={5}
                  />
                </View>

                <View
                  className="mt-4"
                  onLayout={(e) => {
                    fieldYRef.current.storageCapacityKg = e.nativeEvent.layout.y;
                  }}
                >
                  <Label>{t.storageKg}</Label>
                  <Input
                    value={form.storageCapacityKg}
                    onChangeText={(v) => setField("storageCapacityKg", v.replace(/[^\d]/g, ""))}
                    onFocus={() => scrollToField("storageCapacityKg")}
                    placeholder="1500"
                    keyboardType="numeric"
                    maxLength={7}
                  />
                </View>

                <View
                  className="mt-4"
                  onLayout={(e) => {
                    fieldYRef.current.enginePowerHp = e.nativeEvent.layout.y;
                  }}
                >
                  <Label>{t.engineHp}</Label>
                  <Input
                    value={form.enginePowerHp}
                    onChangeText={(v) => setField("enginePowerHp", v.replace(/[^\d]/g, ""))}
                    onFocus={() => scrollToField("enginePowerHp")}
                    placeholder="15"
                    keyboardType="numeric"
                    maxLength={6}
                  />
                </View>

                <View className="mt-4">
                  <Label>{t.fuelType}</Label>
                  <Pressable
                    onPress={() => setFuelOpen(true)}
                    className="mt-2 rounded-xl border px-3 py-3 flex-row items-center justify-between active:opacity-80"
                    style={{ borderColor: UI.border, backgroundColor: UI.card }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", flex: 1, minWidth: 0 }}>
                      <Ionicons name="flame-outline" size={18} color={UI.muted} />
                      <Text
                        style={{
                          color: UI.text,
                          marginLeft: 8,
                          fontSize: 16,
                          fontWeight: "700",
                          lineHeight: 24,
                          flexShrink: 1,
                        }}
                      >
                        {form.fuelType}
                      </Text>
                    </View>
                    <Ionicons name="chevron-down" size={18} color={UI.muted} />
                  </Pressable>
                </View>
              </View>
            </Card>
          ) : null}

          {/* ===== STEP 5: REVIEW ===== */}
          {step === 5 ? (
            <Card className="mt-3">
              <View className="p-4">
                <View className="flex-row items-center">
                  <IconBubble name="checkmark-done-outline" bg={UI.greenSoft} color={UI.green} />
                  <View className="ml-3 flex-1 min-w-0">
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "900",
                        color: UI.text,
                        lineHeight: 22,
                        flexShrink: 1,
                      }}
                    >
                      {t.step5Title}
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: UI.muted,
                        marginTop: 2,
                        lineHeight: 18,
                        flexShrink: 1,
                      }}
                    >
                      {t.step5Sub}
                    </Text>
                  </View>
                </View>

                <ReviewRow icon="pricetag-outline" label={t.localId} value={form.localIdentifier.trim()} />
                <ReviewRow icon="boat-outline" label={t.vesselName} value={form.vesselName.trim()} />
                <ReviewRow icon="id-card-outline" label={t.govtReg} value={form.govtRegNo.trim()} />
                <ReviewRow icon="construct-outline" label={t.vesselType} value={resolvedVesselType.trim()} />

                <ReviewRow icon="flag-outline" label={t.country} value={form.countrySel?.name || ""} />
                <ReviewRow icon="map-outline" label={t.state} value={form.stateSel?.name || ""} />
                <ReviewRow icon="business-outline" label={t.district} value={form.districtSel?.name || ""} />
                <ReviewRow icon="location-outline" label={t.port} value={form.portSel?.name || ""} />

                <ReviewRow icon="document-text-outline" label={t.license} value={form.fishingLicenseNo.trim()} />
                <ReviewRow icon="people-outline" label={t.crewCap} value={form.crewCapacityMax.trim()} />
                <ReviewRow icon="cube-outline" label={t.storageKg} value={form.storageCapacityKg.trim()} />
                <ReviewRow icon="speedometer-outline" label={t.engineHp} value={form.enginePowerHp.trim()} />
                <ReviewRow icon="flame-outline" label={t.fuelType} value={String(form.fuelType || "")} />

                {!canSave ? (
                  <View
                    style={{
                      marginTop: 14,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: "#fecaca",
                      backgroundColor: UI.redSoft,
                      padding: 12,
                    }}
                  >
                    <Text style={{ color: UI.red, fontWeight: "900", lineHeight: 22 }}>
                      {t.missingRequired}
                    </Text>
                  </View>
                ) : null}
              </View>
            </Card>
          ) : null}

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
                  <Text
                    className="text-base font-extrabold"
                    style={{ color: UI.text, lineHeight: 24, flexShrink: 1 }}
                  >
                    {t.fuelModalTitle}
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

        {/* ===== Bottom Wizard Bar (UI only) ===== */}
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            paddingHorizontal: 16,
            paddingTop: 10,
            paddingBottom: 12 + insets.bottom,
            backgroundColor: "rgba(244,247,255,0.96)",
            borderTopWidth: 1,
            borderTopColor: UI.border,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Pressable
              onPress={goBackStep}
              disabled={saving}
              style={{
                flex: 1,
                height: 56,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: UI.border,
                backgroundColor: UI.card,
                alignItems: "center",
                justifyContent: "center",
                opacity: saving ? 0.6 : 1,
                flexDirection: "row",
              }}
            >
              <Ionicons name="arrow-back" size={20} color={UI.text} />
              <View style={{ width: 8 }} />
              <Text style={{ fontSize: 16, fontWeight: "900", color: UI.text, lineHeight: 24 }}>
                {t.back}
              </Text>
            </Pressable>

            <View style={{ width: 12 }} />

            {step < TOTAL_STEPS ? (
              <Pressable
                onPress={goNext}
                disabled={saving}
                style={{
                  flex: 1,
                  height: 56,
                  borderRadius: 18,
                  backgroundColor: UI.blue,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: saving ? 0.6 : 1,
                  flexDirection: "row",
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: "900", color: "white", lineHeight: 24 }}>
                  {t.next}
                </Text>
                <View style={{ width: 8 }} />
                <Ionicons name="arrow-forward" size={20} color="white" />
              </Pressable>
            ) : (
              <Pressable
                onPress={onSave}
                disabled={saving || !canSave}
                style={{
                  flex: 1,
                  height: 56,
                  borderRadius: 18,
                  backgroundColor: saving ? "#94a3b8" : canSave ? UI.green : "#94a3b8",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: saving ? 0.8 : 1,
                  flexDirection: "row",
                }}
              >
                {saving ? (
                  <>
                    <ActivityIndicator color="#fff" />
                    <View style={{ width: 10 }} />
                    <Text style={{ fontSize: 16, fontWeight: "900", color: "white", lineHeight: 24 }}>
                      {t.saving}
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="save-outline" size={20} color="white" />
                    <View style={{ width: 8 }} />
                    <Text style={{ fontSize: 16, fontWeight: "900", color: "white", lineHeight: 24 }}>
                      {t.save}
                    </Text>
                  </>
                )}
              </Pressable>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}