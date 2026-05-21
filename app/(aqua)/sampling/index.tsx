import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";

import { API_BASE } from "../../../src/config/env";
import type { RootState } from "../../../src/store/auth/store";
import {
  extractSamplingArray,
  getSamplingRecords,
  type SamplingRecord,
} from "../../../src/services/aqua/sampling.service";

const TOKEN_KEY = "auth_token";

type AnyItem = Record<string, any>;

function apiUrl(path: string) {
  const base = String(API_BASE || "").replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

async function getJson(path: string) {
  const token = await AsyncStorage.getItem(TOKEN_KEY);

  const response = await fetch(apiUrl(path), {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  let data: any = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.message || data?.detail || "Request failed");
  }

  return data;
}

function extractArray<T = any>(data: any): T[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.farms)) return data.farms;
  if (Array.isArray(data?.ponds)) return data.ponds;
  if (Array.isArray(data?.culture_cycles)) return data.culture_cycles;
  if (Array.isArray(data?.cultureCycles)) return data.cultureCycles;
  return [];
}

function sameId(a: any, b: any) {
  if (a === undefined || a === null || b === undefined || b === null) return false;
  return String(a).trim() === String(b).trim();
}

function pickId(...values: any[]) {
  const found = values.find((value) => {
    if (value === undefined || value === null) return false;
    const text = String(value).trim();
    return text && text !== "0" && text !== "undefined" && text !== "null";
  });

  return found ? String(found).trim() : "";
}

function pickName(...values: any[]) {
  const found = values.find((value) => {
    if (value === undefined || value === null) return false;
    return String(value).trim() !== "";
  });

  return found ? String(found).trim() : "";
}

function toNumericUserId(value: any) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (/^\d+$/.test(raw)) return String(Number(raw));
  const digits = raw.replace(/\D/g, "");
  return digits ? String(Number(digits)) : "";
}

function getFarmName(farms: AnyItem[], farmId: any) {
  const farm = farms.find((item) =>
    [item?.id, item?.farm_id, item?.farm_code, item?.farm_uid].some((value) =>
      sameId(value, farmId),
    ),
  );

  return pickName(farm?.farm_name, farm?.name, farm?.farmName, farmId, "-");
}

function getPondName(ponds: AnyItem[], pondId: any) {
  const pond = ponds.find((item) =>
    [item?.id, item?.pond_id, item?.pond_code, item?.pond_uid].some((value) =>
      sameId(value, pondId),
    ),
  );

  return pickName(pond?.pond_name, pond?.name, pond?.pondName, pondId, "-");
}

function fmt(value: any, fallback = "-") {
  const text = String(value ?? "").trim();
  return text ? text : fallback;
}

function dateText(value: any) {
  const text = String(value ?? "").trim();
  if (!text) return "-";
  if (text.includes("T")) return text.split("T")[0];
  return text;
}

function getSamplingId(record: SamplingRecord, index: number) {
  return pickId(record?.sampling_id, record?.id, `sampling-${index}`);
}

function getRecordFarmId(record: SamplingRecord) {
  return pickId(record?.farm_id, record?.farm?.id, record?.farm_code, record?.farm_uid);
}

function getRecordPondId(record: SamplingRecord) {
  return pickId(record?.pond_id, record?.pond?.id, record?.pond_code, record?.pond_uid);
}

export default function SamplingListScreen() {
  const insets = useSafeAreaInsets();
  const me = useSelector((state: RootState) => state.me?.me);
  const themeMode = useSelector((state: RootState) => state.theme.mode);
  const dark = themeMode === "DARK";

  const C = dark
    ? {
        screenBg: "#050B16",
        cardBg: "#0B1220",
        cardBorder: "rgba(255,255,255,0.08)",
        text: "#FFFFFF",
        subText: "rgba(255,255,255,0.58)",
        iconBg: "rgba(255,255,255,0.08)",
        iconColor: "#60A5FA",
        primary: "#2563EB",
      }
    : {
        screenBg: "#E8EEF6",
        cardBg: "#EEF3FF",
        cardBorder: "#C0CEEA",
        text: "#0F172A",
        subText: "#5A6E8F",
        iconBg: "#D2E3F8",
        iconColor: "#1D4ED8",
        primary: "#1D4ED8",
      };

  const numericOwnerId = toNumericUserId(
    pickId(
      (me as any)?.user_id,
      (me as any)?.id,
      (me as any)?.owner_id,
      (me as any)?.owner_code,
    ),
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [records, setRecords] = useState<SamplingRecord[]>([]);
  const [farms, setFarms] = useState<AnyItem[]>([]);
  const [ponds, setPonds] = useState<AnyItem[]>([]);

  const loadData = useCallback(async () => {
    setError("");

    try {
      const [samplingRes, farmsRes, pondsRes] = await Promise.all([
        getSamplingRecords(),
        getJson("/api/farms"),
        getJson("/api/ponds"),
      ]);

      const allRecords = extractSamplingArray<SamplingRecord>(samplingRes);
      const allFarms = extractArray<AnyItem>(farmsRes);
      const allPonds = extractArray<AnyItem>(pondsRes);

      const ownFarms = numericOwnerId
        ? allFarms.filter((farm) => {
            const farmUserId = toNumericUserId(pickId(farm?.user_id, farm?.owner_id));
            return !!farmUserId && sameId(farmUserId, numericOwnerId);
          })
        : allFarms;

      const ownFarmValues = new Set<string>();
      ownFarms.forEach((farm) => {
        [farm?.id, farm?.farm_id, farm?.farm_code, farm?.farm_uid].forEach((value) => {
          const id = pickId(value);
          if (id) ownFarmValues.add(id);
        });
      });

      const ownPonds = numericOwnerId
        ? allPonds.filter((pond) => {
            const pondUserId = toNumericUserId(pickId(pond?.user_id, pond?.owner_id));
            if (pondUserId && sameId(pondUserId, numericOwnerId)) return true;
            const pondFarmId = pickId(pond?.farm_id, pond?.farm?.id, pond?.farm_code);
            return !!pondFarmId && ownFarmValues.has(pondFarmId);
          })
        : allPonds;

      const ownPondValues = new Set<string>();
      ownPonds.forEach((pond) => {
        [pond?.id, pond?.pond_id, pond?.pond_code, pond?.pond_uid].forEach((value) => {
          const id = pickId(value);
          if (id) ownPondValues.add(id);
        });
      });

      const ownRecords = numericOwnerId
        ? allRecords.filter((record) => {
            const recordUserId = toNumericUserId(
              pickId(record?.user_id, record?.farmer_id, record?.owner_id),
            );
            if (recordUserId && sameId(recordUserId, numericOwnerId)) return true;

            const recordFarmId = getRecordFarmId(record);
            if (recordFarmId && ownFarmValues.has(recordFarmId)) return true;

            const recordPondId = getRecordPondId(record);
            if (recordPondId && ownPondValues.has(recordPondId)) return true;

            return false;
          })
        : allRecords;

      setRecords(ownRecords);
      setFarms(ownFarms);
      setPonds(ownPonds);
    } catch (err: any) {
      setError(err?.message || "Unable to load sampling records");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [numericOwnerId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => {
      const ad = new Date(String(a?.sampling_date || a?.created_at || 0)).getTime();
      const bd = new Date(String(b?.sampling_date || b?.created_at || 0)).getTime();
      return bd - ad;
    });
  }, [records]);

  return (
    <View style={{ flex: 1, backgroundColor: C.screenBg }}>
      <View
        style={{
          paddingTop: insets.top + 10,
          paddingHorizontal: 16,
          paddingBottom: 12,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{
            height: 42,
            width: 42,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: C.cardBg,
            borderWidth: 1,
            borderColor: C.cardBorder,
          }}
        >
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={{ color: C.text, fontSize: 22, fontWeight: "900" }}>Sampling Submitted</Text>
          <Text style={{ color: C.subText, fontSize: 12, marginTop: 2 }}>
            {sortedRecords.length} record{sortedRecords.length === 1 ? "" : "s"} submitted
          </Text>
        </View>

        <Pressable
          onPress={() =>
            router.push({
              pathname: "/(aqua)/tabs/qr-scanner",
              params: {
                purpose: "SAMPLING_ENTRY",
                returnTo: "/(aqua)/sampling/add",
              },
            } as any)
          }
          style={{
            height: 42,
            width: 42,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: C.primary,
          }}
        >
          <Ionicons name="add" size={23} color="#FFFFFF" />
        </Pressable>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 36 }}
      >
        {loading ? (
          <View
            style={{
              marginTop: 16,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: C.cardBorder,
              backgroundColor: C.cardBg,
              padding: 18,
              alignItems: "center",
            }}
          >
            <ActivityIndicator color={C.primary} />
            <Text style={{ color: C.subText, fontSize: 13, marginTop: 10 }}>Loading sampling records...</Text>
          </View>
        ) : null}

        {!loading && error ? (
          <View
            style={{
              marginTop: 16,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: C.cardBorder,
              backgroundColor: C.cardBg,
              padding: 16,
            }}
          >
            <Text style={{ color: C.text, fontSize: 15, fontWeight: "900" }}>Failed to load</Text>
            <Text style={{ color: C.subText, fontSize: 13, marginTop: 6, lineHeight: 20 }}>{error}</Text>
            <Pressable
              onPress={loadData}
              style={{
                marginTop: 12,
                borderRadius: 12,
                backgroundColor: C.primary,
                paddingVertical: 11,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "900" }}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        {!loading && !error && sortedRecords.length === 0 ? (
          <View
            style={{
              marginTop: 16,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: C.cardBorder,
              backgroundColor: C.cardBg,
              padding: 18,
              alignItems: "center",
            }}
          >
            <View
              style={{
                height: 48,
                width: 48,
                borderRadius: 16,
                backgroundColor: C.iconBg,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="clipboard-outline" size={24} color={C.iconColor} />
            </View>
            <Text style={{ color: C.text, fontSize: 16, fontWeight: "900", marginTop: 12 }}>
              No sampling submitted
            </Text>
            <Text style={{ color: C.subText, fontSize: 13, lineHeight: 20, marginTop: 6, textAlign: "center" }}>
              Scan Pond QR and submit sampling data. Submitted records will show here.
            </Text>
          </View>
        ) : null}

        {!loading && !error && sortedRecords.length > 0 ? (
          <View style={{ marginTop: 14, gap: 12 }}>
            {sortedRecords.map((record, index) => {
              const farmId = getRecordFarmId(record);
              const pondId = getRecordPondId(record);

              return (
                <View
                  key={getSamplingId(record, index)}
                  style={{
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: C.cardBorder,
                    backgroundColor: C.cardBg,
                    padding: 15,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                    <View
                      style={{
                        height: 42,
                        width: 42,
                        borderRadius: 14,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: C.iconBg,
                      }}
                    >
                      <Ionicons name="analytics-outline" size={21} color={C.iconColor} />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={{ color: C.text, fontSize: 15, fontWeight: "900" }} numberOfLines={1}>
                        Sampling ID: {fmt(record?.sampling_id || record?.id)}
                      </Text>
                      <Text style={{ color: C.subText, fontSize: 12, marginTop: 4 }} numberOfLines={1}>
                        Date: {dateText(record?.sampling_date)} | DOC: {fmt(record?.doc)}
                      </Text>
                      <Text style={{ color: C.subText, fontSize: 12, marginTop: 4 }} numberOfLines={1}>
                        Farm: {getFarmName(farms, farmId)} | Pond: {getPondName(ponds, pondId)}
                      </Text>
                    </View>
                  </View>

                  <View style={{ marginTop: 13, gap: 8 }}>
                    <MetricRow label="Sample Count" value={fmt(record?.sample_count)} C={C} />
                    <MetricRow label="Sample Weight (g)" value={fmt(record?.sample_weight)} C={C} />
                    <MetricRow label="ABW (g)" value={fmt(record?.abw)} C={C} />
                    <MetricRow label="Size (Count/kg)" value={fmt(record?.size_count_per_kg)} C={C} />
                    <MetricRow label="Expected Biomass (kg)" value={fmt(record?.expected_biomass)} C={C} />
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function MetricRow({ label, value, C }: { label: string; value: string; C: any }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
      <Text style={{ color: C.subText, fontSize: 12, fontWeight: "700", flex: 1 }}>{label}</Text>
      <Text style={{ color: C.text, fontSize: 13, fontWeight: "900" }}>{value}</Text>
    </View>
  );
}
