// src/components/crate_packer/CratePackerDashboard.tsx
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  InteractionManager,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import type { DivisionKey, PackedCrateItem } from "../../utils/cratePackerStorage";
import {
  getPackedList,
  upsertFishIndexFromPackedRecord,
} from "../../utils/cratePackerStorage";

import { fmtDMY, isSameYMD } from "./helpers/date";

import CratePackerTabs, { type CrateTabKey } from "./CratePackerTabs";
import CrateScannerScreen from "./CrateScannerScreen";
import PackedCratesScreen from "./PackedCratesScreen";
import CratePackModal from "./modals/CratePackModal";
import AquaCratePackerDashboard from "./aqua/AquaCratePackerDashboard";

// Redux
import { useAppDispatch } from "../../store/hooks";
import { logout as logoutThunk } from "../../store/auth/login.slice";

// REAL submit service (PUT /api/crate/:id)
import { apiPackCrate } from "../../services/cratePacker/cratePackerApi";

// locations API
import {
  fetchAllLocationsApi,
  type LocationFullItem,
} from "../../services/auth/location.api";

/** ---------------- UI constants ---------------- */
const BG = "#030712";
const HEADER_BG = "#071228";
const BORDER_SOFT = "rgba(255,255,255,0.06)";
const BORDER = "rgba(255,255,255,0.10)";
const TOTAL_PACKED_BLUE = "#3E86E0";

const LOC_CACHE_KEY = "rv_locations_cache_v1";

const safeParse = (s: string | null) => {
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

const pickFirst = (...vals: any[]) =>
  vals.find((v) => v !== undefined && v !== null && String(v).trim() !== "");

const cleanText = (v: any) => {
  const t = String(v ?? "").trim();
  if (!t) return "";
  const low = t.toLowerCase();
  if (low === "undefined" || low === "null") return "";
  return t;
};

function safeDivision(v: any): DivisionKey {
  if (v === "wild" || v === "aqua" || v === "mariculture") return v;
  return "wild";
}

function divisionLabel(d: DivisionKey) {
  if (d === "wild") return "WILD";
  if (d === "aqua") return "AQUA";
  return "MARICULTURE";
}

function getTheme(division: DivisionKey) {
  if (division === "aqua") return { bannerFrom: "#1D4ED8", accent: "#3b82f6" };
  if (division === "mariculture") {
    return { bannerFrom: "#A855F7", accent: "#A855F7" };
  }
  return { bannerFrom: "#0EA5A4", accent: "#0EA5A4" };
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toYmdLocal(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function isoToYmd(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return toYmdLocal(Date.now());
  return toYmdLocal(d.getTime());
}

function normCode(raw: string) {
  return String(raw || "").trim().toUpperCase().replace(/\s+/g, "");
}

function normalizeFishItems(payload: any): string[] {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  return items
    .map((it: any) =>
      normCode(
        it?.fish_qr ??
          it?.fishQr ??
          it?.fish_code ??
          it?.fishCode ??
          it?.code ??
          ""
      )
    )
    .filter(Boolean);
}

function getFishCodesFromPackedRecord(row: PackedCrateItem): string[] {
  const payloadItems = Array.isArray(row?.payload?.items) ? row.payload.items : [];

  const payloadFish = payloadItems
    .map((it: any) =>
      normCode(
        it?.fish_qr ??
          it?.fishQr ??
          it?.fish_code ??
          it?.fishCode ??
          it?.code ??
          ""
      )
    )
    .filter(Boolean);

  const topLevelFish = Array.isArray((row as any)?.fish_qrs)
    ? (row as any).fish_qrs.map((x: any) => normCode(x)).filter(Boolean)
    : [];

  return Array.from(new Set([...payloadFish, ...topLevelFish]));
}

function StatBox({
  label,
  value,
  bg,
}: {
  label: string;
  value: number;
  bg: string;
}) {
  return (
    <View
      style={{
        borderRadius: 18,
        backgroundColor: bg,
        paddingVertical: 10,
        paddingHorizontal: 8,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOpacity: 0.28,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 6 },
        elevation: 8,
      }}
    >
      <Text style={{ color: "white", fontSize: 18, fontWeight: "900" }}>
        {value}
      </Text>
      <Text
        numberOfLines={1}
        ellipsizeMode="clip"
        style={{
          color: "rgba(255,255,255,0.92)",
          fontWeight: "900",
          fontSize: 9.5,
          lineHeight: 11,
          marginTop: 2,
          textAlign: "center",
          ...(Platform.OS === "android"
            ? ({ includeFontPadding: false } as any)
            : null),
        }}
      >
        {label}
      </Text>
    </View>
  );
}


function LegacyCratePackerDashboard({ meOverride }: { meOverride: any }) {
  const dispatch = useAppDispatch();
  const me = meOverride;

  const params = useLocalSearchParams();
  const division = safeDivision(params.division);
  const theme = useMemo(() => getTheme(division), [division]);
  const insets = useSafeAreaInsets();

  const [locById, setLocById] = useState<Record<number, LocationFullItem>>({});

  const locationId: number | null =
    typeof me?.location_id === "number"
      ? me.location_id
      : typeof me?.locationId === "number"
      ? me.locationId
      : null;

  useEffect(() => {
    let alive = true;

    (async () => {
      const cached = safeParse(
        await AsyncStorage.getItem(LOC_CACHE_KEY).catch(() => null)
      );
      const list: LocationFullItem[] = Array.isArray(cached) ? cached : [];
      const map: Record<number, LocationFullItem> = {};
      for (const it of list) map[it.id] = it;
      if (alive) setLocById(map);
    })();

    (async () => {
      try {
        const list = await fetchAllLocationsApi();
        await AsyncStorage.setItem(LOC_CACHE_KEY, JSON.stringify(list)).catch(
          () => {}
        );
        const map: Record<number, LocationFullItem> = {};
        for (const it of list) map[it.id] = it;
        if (alive) setLocById(map);
      } catch {}
    })();

    return () => {
      alive = false;
    };
  }, []);

  const locationText = useMemo(() => {
    if (!locationId) return "—";
    const loc = locById[locationId];
    if (!loc) return "—";
    const code = cleanText((loc as any).location_code);
    return code ? `${cleanText(loc.name)} (${code})` : cleanText(loc.name);
  }, [locationId, locById]);

  const PACKER_NAME = cleanText(
    pickFirst(
      me?.packer_name,
      me?.name,
      me?.username,
      me?.full_name,
      me?.display_name,
      "Crate Packer"
    )
  );
  const PACKER_CODE = cleanText(
    pickFirst(me?.code, me?.packer_code, me?.crate_packer_code, "—")
  );

  const PACKER_DB_ID = me?.id;
  const PACKER_PHONE = cleanText(pickFirst(me?.phone_no, me?.phone));

  const PACKER_USER_ID = useMemo(() => {
    const base = cleanText(
      pickFirst(PACKER_CODE, PACKER_DB_ID, PACKER_PHONE, "unknown")
    );
    return `crate_packer_${base || "unknown"}`;
  }, [PACKER_CODE, PACKER_DB_ID, PACKER_PHONE]);

  const [tab, setTab] = useState<CrateTabKey>("SCAN");
  const [selectedDateISO, setSelectedDateISO] = useState(
    () => new Date().toISOString()
  );

  const [manualCode, setManualCode] = useState("");
  const [packed, setPacked] = useState<PackedCrateItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [packModalOpen, setPackModalOpen] = useState(false);
  const [packCrateQr, setPackCrateQr] = useState("");
  const [packMode, setPackMode] = useState<"EDIT" | "VIEW">("EDIT");
  const [packInitialPayload, setPackInitialPayload] = useState<any | null>(null);

  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [crateCamEnabled, setCrateCamEnabled] = useState(true);

  const selectedYmd = useMemo(() => isoToYmd(selectedDateISO), [selectedDateISO]);
  const todayYmd = useMemo(() => toYmdLocal(Date.now()), []);
  const isPastSelectedDate = selectedYmd < todayYmd;

  const fishToCrateMap = useMemo(() => {
    const map: Record<string, string> = {};

    for (const row of packed) {
      const crateCode = normCode(row.code);
      const fishCodes = getFishCodesFromPackedRecord(row);

      for (const fish of fishCodes) {
        if (fish && !map[fish]) {
          map[fish] = crateCode || "-";
        }
      }
    }

    return map;
  }, [packed]);

  const resumeCrateCameraSafely = () => {
    setCrateCamEnabled(false);

    InteractionManager.runAfterInteractions(() => {
      setTimeout(() => {
        setCrateCamEnabled(true);
      }, 450);
    });
  };

  const reload = async () => {
    setLoading(true);
    try {
      const list = await getPackedList(PACKER_USER_ID, division);
      setPacked(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    setManualCode("");
    setTab("SCAN");

    setPackModalOpen(false);
    setPackCrateQr("");
    setPackMode("EDIT");
    setPackInitialPayload(null);

    setSubmitError(null);
    setSubmitLoading(false);

    setCrateCamEnabled(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [division, PACKER_USER_ID]);

  const packedForDay = useMemo(
    () => packed.filter((x) => isSameYMD(x.packed_at, selectedDateISO)),
    [packed, selectedDateISO]
  );
  const totalPacked = packedForDay.length;

  const openModalWithGate = () => {
    setCrateCamEnabled(false);
    requestAnimationFrame(() => setPackModalOpen(true));
  };

  const openPackModal = (codeRaw: string, meta?: { crate_id?: number | null }) => {
    const code = normCode(codeRaw);
    if (!code) return;

    const existing = packed.find((x) => normCode(x.code) === code);

    if (isPastSelectedDate) {
      if (existing) {
        setManualCode(code);
        setPackCrateQr(code);
        setSubmitError(null);

        setPackMode("VIEW");
        setPackInitialPayload(existing.payload || null);

        openModalWithGate();
        return;
      }

      Alert.alert(
        "Date Locked",
        `New crate packing is blocked for ${fmtDMY(
          new Date(selectedDateISO)
        )}. Only already submitted crates can be viewed in read-only mode.`
      );
      return;
    }

    if (existing) {
      setManualCode(code);
      setPackCrateQr(code);
      setSubmitError(null);

      setPackMode("VIEW");
      setPackInitialPayload(existing.payload || null);

      openModalWithGate();
      return;
    }

    setManualCode(code);
    setPackCrateQr(code);
    setSubmitError(null);

    setPackMode("EDIT");
    setPackInitialPayload(meta?.crate_id ? { crate_id: meta.crate_id } : null);

    openModalWithGate();
  };

  const closeModalAndResumeCrateCam = () => {
    setPackModalOpen(false);
    setPackCrateQr("");
    setPackMode("EDIT");
    setPackInitialPayload(null);

    setSubmitError(null);
    setSubmitLoading(false);

    resumeCrateCameraSafely();
  };

  const submitPack = async (payload: any) => {
    setSubmitLoading(true);
    setSubmitError(null);

    try {
      if (isPastSelectedDate) {
        throw new Error(
          `New crate packing is blocked for ${fmtDMY(
            new Date(selectedDateISO)
          )}. Select today to pack a new crate.`
        );
      }

      const crateCode = normCode(
        payload?.crate_qr || payload?.crateQr || packCrateQr
      );
      if (!crateCode) throw new Error("Crate QR missing");

      const exists = packed.find((x) => normCode(x.code) === crateCode);
      if (exists) throw new Error("Already packed");

      const crateId = payload?.crate_id ?? payload?.crateId ?? null;
      const grade = payload?.grade ?? payload?.crate_grade ?? "";
      const weight = payload?.weight ?? payload?.total_weight_kg ?? null;

      const fishQrs = normalizeFishItems(payload);

      const duplicateFish: Array<{ fish: string; crate: string }> = [];

      for (const fish of fishQrs) {
        const existingCrate = fishToCrateMap[fish];
        if (existingCrate && existingCrate !== crateCode) {
          duplicateFish.push({
            fish,
            crate: existingCrate,
          });
        }
      }

      if (duplicateFish.length > 0) {
        const msg = duplicateFish
          .slice(0, 5)
          .map((x) => `${x.fish} already packed in crate ${x.crate}`)
          .join("\n");

        throw new Error(
          duplicateFish.length > 5
            ? `${msg}\n+ ${duplicateFish.length - 5} more duplicate fish`
            : msg
        );
      }

      const res = await apiPackCrate({
        userId: PACKER_USER_ID,
        packerName: PACKER_NAME,
        division,
        code: crateCode,
        crateId,
        grade,
        weight,
        packerDbId: PACKER_DB_ID,
        payload: { ...payload, fish_qrs: fishQrs },
      });

      const latest = await getPackedList(PACKER_USER_ID, division);
      setPacked(latest);

      const stored = latest.find((x) => normCode(x.code) === crateCode);
      if (stored) {
        await upsertFishIndexFromPackedRecord(PACKER_USER_ID, division, stored);
      }

      if (res.mode === "SERVER_FAILED" && res.error) {
        setSubmitError(res.error);
      }

      setPackModalOpen(false);
      setPackCrateQr("");
      setPackMode("EDIT");
      setPackInitialPayload(null);

      setManualCode("");
      setTab("SCAN");

      resumeCrateCameraSafely();
    } catch (e: any) {
      setSubmitError(String(e?.message || e || "Submit failed"));
    } finally {
      setSubmitLoading(false);
    }
  };

  const logoutScale = useRef(new Animated.Value(1)).current;
  const pressIn = () => {
    Animated.spring(logoutScale, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 24,
      bounciness: 0,
    }).start();
  };
  const pressOut = () => {
    Animated.spring(logoutScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 24,
      bounciness: 0,
    }).start();
  };

  const onLogout = async () => {
    await dispatch(logoutThunk()).unwrap().catch(() => {});
    router.replace("/(auth)/login");
  };

  const bottomTabsH = 64;
  const bottomPad = bottomTabsH + Math.max(insets.bottom, 10) + 12;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={["top"]}>
      <View
        style={{
          paddingTop: Platform.OS === "android" ? Math.max(insets.top, 2) : 2,
          paddingHorizontal: 12,
          paddingBottom: 8,
          backgroundColor: HEADER_BG,
          borderBottomWidth: 1,
          borderBottomColor: BORDER_SOFT,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
          }}
        >
          <View
            style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}
          >
            <View
              style={{
                height: 42,
                width: 42,
                borderRadius: 16,
                backgroundColor: "rgba(14,165,233,0.18)",
                borderWidth: 1,
                borderColor: "#3b82f6",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="cube-outline" size={22} color="#fff" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ color: "white", fontSize: 18, fontWeight: "900" }}>
                Crate Packer
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.55)", marginTop: 4 }}>
                {divisionLabel(division)}
              </Text>
            </View>
          </View>

          <Animated.View style={{ transform: [{ scale: logoutScale }] }}>
            <Pressable
              onPress={onLogout}
              onPressIn={pressIn}
              onPressOut={pressOut}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 7,
                borderRadius: 12,
                backgroundColor: "rgba(255,255,255,0.06)",
                borderWidth: 1,
                borderColor: BORDER,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Ionicons
                name="log-out-outline"
                size={16}
                color="rgba(255,255,255,0.85)"
              />
              <Text
                style={{
                  color: "rgba(255,255,255,0.85)",
                  fontWeight: "900",
                  fontSize: 12,
                }}
              >
                Logout
              </Text>
            </Pressable>
          </Animated.View>
        </View>

      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad, flexGrow: 1 }}
      >
        <View
          style={{
            backgroundColor: theme.bannerFrom,
            borderBottomWidth: 1,
            borderBottomColor: "rgba(255,255,255,0.10)",
            paddingHorizontal: 14,
            paddingVertical: 12,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: "white",
                  fontSize: 28,
                  fontWeight: "900",
                  letterSpacing: -0.2,
                }}
              >
                {PACKER_NAME || "Crate Packer"}
              </Text>

              <Text
                style={{
                  color: "rgba(255,255,255,0.85)",
                  marginTop: 3,
                  fontSize: 12.5,
                }}
              >
                Code: {PACKER_CODE || "—"}
              </Text>

              <Text
                style={{
                  color: "rgba(255,255,255,0.85)",
                  marginTop: 3,
                  fontSize: 12.5,
                }}
              >
                Location: {locationText}
              </Text>

              <Text
                style={{
                  color: "rgba(255,255,255,0.85)",
                  marginTop: 3,
                  fontSize: 12.5,
                }}
              >
                Date: {fmtDMY(new Date(selectedDateISO))}
              </Text>

              {isPastSelectedDate ? (
                <Text
                  style={{
                    color: "rgba(251,191,36,0.95)",
                    marginTop: 6,
                    fontSize: 12.5,
                    fontWeight: "900",
                  }}
                >
                  Previous date selected: existing crates open in read-only mode, new crate packing is blocked
                </Text>
              ) : null}
            </View>

            <View style={{ width: 120 }}>
              <StatBox
                label="Total Packed"
                value={totalPacked}
                bg={TOTAL_PACKED_BLUE}
              />
            </View>
          </View>
        </View>

        <CratePackerTabs tab={tab} onChange={setTab} />

        <View style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
          {tab === "SCAN" ? (
            <CrateScannerScreen
              divisionLabel={divisionLabel(division)}
              manualCode={manualCode}
              setManualCode={setManualCode}
              onScannedCrateQr={(code, meta) => openPackModal(code, meta as any)}
              cameraEnabled={crateCamEnabled}
            />
          ) : (
            <PackedCratesScreen
              packed={packed}
              selectedDateISO={selectedDateISO}
              setSelectedDateISO={setSelectedDateISO}
            />
          )}
        </View>

        {loading ? (
          <View
            style={{
              marginHorizontal: 16,
              marginTop: 8,
              backgroundColor: "rgba(255,255,255,0.06)",
              borderWidth: 1,
              borderColor: BORDER,
              borderRadius: 14,
              padding: 10,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <ActivityIndicator />
            <Text style={{ color: "rgba(255,255,255,0.8)", fontWeight: "800" }}>
              Loading...
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <CratePackModal
        visible={packModalOpen}
        crateQr={packCrateQr}
        mode={packMode}
        initialPayload={packInitialPayload}
        submitLoading={submitLoading}
        submitError={submitError}
        onCancel={closeModalAndResumeCrateCam}
        onSubmit={submitPack}
        fishToCrateMap={fishToCrateMap}
      />
    </SafeAreaView>
  );
}

/**
 * Division router for the crate-packer module.
 * Aqua MUST use the aquaculture API flow; Wild/Mariculture keep the legacy flow.
 */
export default function CratePackerDashboard({ meOverride }: { meOverride: any }) {
  const params = useLocalSearchParams();
  const division = safeDivision(params.division);

  if (division === "aqua") {
    return <AquaCratePackerDashboard meOverride={meOverride} />;
  }

  return <LegacyCratePackerDashboard meOverride={meOverride} />;
}