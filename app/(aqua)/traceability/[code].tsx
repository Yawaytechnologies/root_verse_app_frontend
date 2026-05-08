import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { API_BASE } from "../../../src/config/env";

type QrRecord = {
  id?: number | string;
  code?: string;
  qr_code?: string;
  qr_value?: string;
  type?: string;
  qr_type?: string;
  status?: string;
  is_active?: boolean;
  is_activated?: boolean;
  farm_id?: number | string;
  pond_id?: number | string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
};

type FarmRecord = {
  id?: number | string;
  farm_id?: string;
  farm_qr_id?: string;
  farm_name?: string;
  name?: string;
  address?: string;
  user_id?: number | string;
  owner_id?: number | string;
  status?: string;
  verification_status?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
};

type PondRecord = {
  id?: number | string;
  farm_id?: number | string;
  pond_id?: string;
  pond_qr_id?: string;
  pond_name?: string;
  name?: string;
  pond_type?: string;
  pond_status?: string;
  verification_status?: string;
  user_id?: number | string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
};

type CultureCycleRecord = {
  id?: number | string;
  user_id?: number | string;
  farm_id?: number | string;
  pond_id?: number | string;
  verification_status?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
};

type TimelineItem = {
  title: string;
  description: string;
  time: string;
  status: "DONE" | "PENDING" | "FAILED";
};

const TOKEN_KEY = "auth_token";

const getParamValue = (value: string | string[] | undefined, fallback = "") =>
  Array.isArray(value) ? String(value[0] ?? fallback) : String(value ?? fallback);

function apiUrl(path: string) {
  const base = String(API_BASE || "").replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

function extractArray<T = any>(data: any): T[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.farms)) return data.farms;
  if (Array.isArray(data?.ponds)) return data.ponds;
  if (Array.isArray(data?.images)) return data.images;
  return [];
}

function extractObject<T = any>(data: any): T {
  if (data?.data && typeof data.data === "object") return data.data;
  if (data?.result && typeof data.result === "object") return data.result;
  if (data?.qr && typeof data.qr === "object") return data.qr;
  if (data?.farm && typeof data.farm === "object") return data.farm;
  if (data?.pond && typeof data.pond === "object") return data.pond;
  if (data?.culture_cycle && typeof data.culture_cycle === "object") {
    return data.culture_cycle;
  }
  if (data?.cultureCycle && typeof data.cultureCycle === "object") {
    return data.cultureCycle;
  }
  return data;
}

function sameId(a: any, b: any) {
  if (a === undefined || a === null || b === undefined || b === null) {
    return false;
  }

  return String(a) === String(b);
}

function getQrCode(qr: QrRecord | null, fallback = "") {
  return qr?.code || qr?.qr_code || qr?.qr_value || fallback || "";
}

function getQrType(qr: QrRecord | null) {
  return String(qr?.qr_type || qr?.type || "").toUpperCase();
}

function isActivated(qr: QrRecord | null) {
  if (!qr) return false;

  const status = String(qr.status || "").toUpperCase();

  return (
    qr.is_active === true ||
    qr.is_activated === true ||
    status === "ACTIVE" ||
    status === "ACTIVATED"
  );
}

function formatTime(value?: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
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
    throw new Error(
      data?.message ||
        data?.detail ||
        data?.error ||
        `Request failed: ${response.status}`,
    );
  }

  return data;
}

export default function TraceabilityCodeScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const scannedCode =
    getParamValue(params.code) ||
    getParamValue(params.qrValue) ||
    getParamValue(params.scannedValue) ||
    getParamValue(params.qrCode) ||
    getParamValue(params.value);

  const paramCultureCycleId = getParamValue(params.cultureCycleId);
  const paramUserId = getParamValue(params.userId);

  const paramFarmDbId =
    getParamValue(params.farmDbId) || getParamValue(params.farmId);

  const paramPondDbId =
    getParamValue(params.pondDbId) || getParamValue(params.pondId);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [qr, setQr] = useState<QrRecord | null>(null);
  const [farm, setFarm] = useState<FarmRecord | null>(null);
  const [pond, setPond] = useState<PondRecord | null>(null);
  const [cultureCycle, setCultureCycle] =
    useState<CultureCycleRecord | null>(null);
  const [images, setImages] = useState<any[]>([]);
  const [error, setError] = useState("");

  const qrCode = getQrCode(qr, scannedCode);
  const qrType = getQrType(qr) || "UNKNOWN";
  const activated = isActivated(qr);

  const safeBack = () => {
    const canGoBack =
      typeof (router as any).canGoBack === "function" &&
      (router as any).canGoBack();

    if (canGoBack) {
      router.back();
      return;
    }

    router.replace("/(aqua)/tabs/dashboard");
  };

  const openScanner = () => {
    router.push({
      pathname: "/(aqua)/tabs/qr-scanner",
      params: {
        purpose: "TRACEABILITY",
      },
    } as any);
  };

  const fetchTraceability = useCallback(async () => {
    if (!scannedCode && !paramCultureCycleId) {
      setError("Scan a Farm QR or Pond QR to view traceability.");
      setQr(null);
      setFarm(null);
      setPond(null);
      setCultureCycle(null);
      setImages([]);
      return;
    }

    setError("");

    try {
      setLoading(true);

      let qrData: QrRecord | null = null;

      if (scannedCode) {
        const qrRes = await getJson(
          `/api/aquaculture/qrs/code/${encodeURIComponent(scannedCode)}`,
        );

        qrData = extractObject<QrRecord>(qrRes);
        setQr(qrData);
      }

      const [farmsRes, pondsRes] = await Promise.all([
        getJson("/api/farms"),
        getJson("/api/ponds"),
      ]);

      const farms = extractArray<FarmRecord>(farmsRes);
      const ponds = extractArray<PondRecord>(pondsRes);

      let linkedFarm: FarmRecord | null = null;
      let linkedPond: PondRecord | null = null;

      if (paramFarmDbId) {
        linkedFarm =
          farms.find((item) => sameId(item.id, paramFarmDbId)) || null;
      }

      if (paramPondDbId) {
        linkedPond =
          ponds.find((item) => sameId(item.id, paramPondDbId)) || null;
      }

      if (qrData) {
        const currentQrCode = getQrCode(qrData, scannedCode);
        const currentQrType = getQrType(qrData);

        if (!linkedFarm && currentQrType === "FARM") {
          linkedFarm =
            farms.find(
              (item) =>
                sameId(item.id, qrData?.farm_id) ||
                item.farm_id === currentQrCode ||
                item.farm_qr_id === currentQrCode,
            ) || null;
        }

        if (!linkedPond && currentQrType === "POND") {
          linkedPond =
            ponds.find(
              (item) =>
                sameId(item.id, qrData?.pond_id) ||
                item.pond_id === currentQrCode ||
                item.pond_qr_id === currentQrCode,
            ) || null;
        }

        if (!linkedFarm && qrData?.farm_id) {
          linkedFarm =
            farms.find((item) => sameId(item.id, qrData?.farm_id)) || null;
        }

        if (!linkedPond && qrData?.pond_id) {
          linkedPond =
            ponds.find((item) => sameId(item.id, qrData?.pond_id)) || null;
        }
      }

      if (!linkedFarm && linkedPond?.farm_id) {
        linkedFarm =
          farms.find((item) => sameId(item.id, linkedPond?.farm_id)) || null;
      }

      setFarm(linkedFarm);
      setPond(linkedPond);

      let linkedCultureCycle: CultureCycleRecord | null = null;

      if (paramCultureCycleId) {
        const cycleRes = await getJson(
          `/api/aquaculture/culture-cycles/${paramCultureCycleId}`,
        );

        linkedCultureCycle = extractObject<CultureCycleRecord>(cycleRes);
      } else {
        const userId =
          paramUserId ||
          String(
            linkedPond?.user_id ||
              linkedFarm?.user_id ||
              linkedFarm?.owner_id ||
              "",
          );

        if (userId) {
          const cyclesRes = await getJson(
            `/api/aquaculture/culture-cycles/user/${userId}`,
          );

          const cycles = extractArray<CultureCycleRecord>(cyclesRes);

          linkedCultureCycle =
            cycles.find((cycle) => {
              if (linkedPond?.id && sameId(cycle.pond_id, linkedPond.id)) {
                return true;
              }

              if (linkedFarm?.id && sameId(cycle.farm_id, linkedFarm.id)) {
                return true;
              }

              return false;
            }) || null;
        }
      }

      setCultureCycle(linkedCultureCycle);

      if (linkedCultureCycle?.id) {
        const imagesRes = await getJson(
          `/api/aquaculture/imageUpload/${linkedCultureCycle.id}/images`,
        );

        setImages(extractArray(imagesRes));
      } else {
        setImages([]);
      }
    } catch (err: any) {
      const message = err?.message || "Failed to load traceability data";

      setError(message);
      Alert.alert("Traceability Error", message);
    } finally {
      setLoading(false);
    }
  }, [
    scannedCode,
    paramCultureCycleId,
    paramUserId,
    paramFarmDbId,
    paramPondDbId,
  ]);

  useEffect(() => {
    fetchTraceability();
  }, [fetchTraceability]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTraceability();
    setRefreshing(false);
  };

  const timeline: TimelineItem[] = useMemo(() => {
    const items: TimelineItem[] = [];

    if (qr) {
      items.push({
        title: "QR Registered",
        description: "Pre-printed QR exists in aquaculture QR registry",
        time: formatTime(qr.created_at),
        status: "DONE",
      });

      items.push({
        title: activated ? "QR Activated" : "QR Activation Pending",
        description: activated
          ? "QR is linked and active for traceability"
          : "Field verification and QR activation are still pending",
        time: formatTime(qr.updated_at),
        status: activated ? "DONE" : "PENDING",
      });
    }

    if (farm) {
      items.push({
        title: "Farm Linked",
        description: farm.farm_name || farm.name || "Farm record linked",
        time: formatTime(farm.created_at),
        status: "DONE",
      });
    }

    if (pond) {
      items.push({
        title: "Pond Linked",
        description: pond.pond_name || pond.name || "Pond record linked",
        time: formatTime(pond.created_at),
        status: "DONE",
      });
    }

    if (cultureCycle) {
      items.push({
        title: "Culture Cycle",
        description: `Status: ${
          cultureCycle.verification_status || cultureCycle.status || "Available"
        }`,
        time: formatTime(cultureCycle.created_at),
        status: "DONE",
      });
    }

    if (images.length > 0) {
      items.push({
        title: "Images Uploaded",
        description: `${images.length} aquaculture image(s) found`,
        time: "-",
        status: "DONE",
      });
    }

    return items;
  }, [qr, activated, farm, pond, cultureCycle, images.length]);

  return (
    <View className="flex-1 bg-[#F5F7FB] dark:bg-[#050B16]">
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 28,
        }}
      >
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={safeBack}
            className="h-11 w-11 items-center justify-center rounded-2xl bg-white dark:bg-[#0B1220]"
          >
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </Pressable>

          <View className="flex-1">
            <Text className="text-2xl font-bold text-slate-900 dark:text-white">
              Traceability
            </Text>

            <Text className="mt-1 text-sm text-slate-500 dark:text-white/60">
              Live backend traceability data
            </Text>
          </View>

          <Pressable
            onPress={openScanner}
            className="h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 dark:bg-white"
          >
            <Ionicons name="qr-code-outline" size={22} color="#60A5FA" />
          </Pressable>
        </View>

        {loading ? (
          <View className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 dark:border-white/10 dark:bg-[#0B1220]">
            <ActivityIndicator size="large" color="#60A5FA" />

            <Text className="mt-4 text-center text-sm text-slate-600 dark:text-white/70">
              Loading traceability from backend...
            </Text>
          </View>
        ) : null}

        {!loading && error ? (
          <View className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-500/20 dark:bg-amber-500/10">
            <View className="items-center">
              <Ionicons name="qr-code-outline" size={36} color="#D97706" />

              <Text className="mt-3 text-center text-lg font-bold text-amber-800 dark:text-amber-300">
                QR Scan Required
              </Text>

              <Text className="mt-2 text-center text-sm leading-6 text-amber-700 dark:text-amber-200/80">
                {error}
              </Text>

              <Pressable
                onPress={openScanner}
                className="mt-5 w-full rounded-2xl bg-slate-900 px-4 py-4 dark:bg-white"
              >
                <Text className="text-center font-semibold text-white dark:text-slate-900">
                  Scan QR
                </Text>
              </Pressable>

              <Pressable
                onPress={() => router.replace("/(aqua)/tabs/dashboard")}
                className="mt-3 w-full rounded-2xl border border-amber-200 px-4 py-4 dark:border-amber-500/20"
              >
                <Text className="text-center font-semibold text-amber-800 dark:text-amber-300">
                  Back to Dashboard
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {!loading && !error ? (
          <>
            <View className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0B1220]">
              <Text className="text-[12px] font-bold uppercase tracking-wide text-slate-500 dark:text-white/50">
                Traceability QR
              </Text>

              <Text className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
                {qrCode || "-"}
              </Text>

              <View className="mt-4 flex-row flex-wrap gap-2">
                <StatusChip label={`Type: ${qrType}`} />

                <StatusChip
                  label={activated ? "Activated" : "Pending Activation"}
                  tone={activated ? "emerald" : "amber"}
                />
              </View>
            </View>

            <View className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0B1220]">
              <Text className="mb-3 text-lg font-bold text-slate-900 dark:text-white">
                Linked Records
              </Text>

              <InfoRow
                label="Farm"
                value={farm?.farm_name || farm?.name || "Not linked"}
              />

              <Divider />

              <InfoRow
                label="Pond"
                value={pond?.pond_name || pond?.name || "Not linked"}
              />

              <Divider />

              <InfoRow
                label="Culture Cycle"
                value={cultureCycle?.id ? String(cultureCycle.id) : "Not found"}
              />

              <Divider />

              <InfoRow label="Images" value={String(images.length)} />
            </View>

            <View className="mt-6">
              <Text className="text-xl font-bold text-slate-900 dark:text-white">
                Timeline
              </Text>

              <Text className="mt-1 text-sm text-slate-500 dark:text-white/60">
                Data fetched from backend. No demo timeline used.
              </Text>
            </View>

            <View className="mt-4 gap-3">
              {timeline.length > 0 ? (
                timeline.map((item, index) => (
                  <TimelineCard key={`${item.title}-${index}`} item={item} />
                ))
              ) : (
                <View className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0B1220]">
                  <Text className="text-center text-sm text-slate-600 dark:text-white/70">
                    No linked traceability events found for this QR.
                  </Text>
                </View>
              )}
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function StatusChip({
  label,
  tone = "blue",
}: {
  label: string;
  tone?: "blue" | "amber" | "emerald";
}) {
  const cls =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10"
        : "border-sky-200 bg-sky-50 dark:border-sky-500/20 dark:bg-sky-500/10";

  const textCls =
    tone === "emerald"
      ? "text-emerald-700 dark:text-emerald-300"
      : tone === "amber"
        ? "text-amber-700 dark:text-amber-300"
        : "text-sky-700 dark:text-sky-300";

  return (
    <View className={`rounded-full border px-3 py-1.5 ${cls}`}>
      <Text className={`text-xs font-bold uppercase ${textCls}`}>{label}</Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-start justify-between gap-4 py-2">
      <Text className="flex-1 text-sm text-slate-500 dark:text-white/60">
        {label}
      </Text>

      <Text
        className="flex-1 text-right text-sm font-bold text-slate-900 dark:text-white"
        numberOfLines={2}
      >
        {value || "-"}
      </Text>
    </View>
  );
}

function Divider() {
  return <View className="h-px bg-slate-100 dark:bg-white/5" />;
}

function TimelineCard({ item }: { item: TimelineItem }) {
  const isDone = item.status === "DONE";
  const isFailed = item.status === "FAILED";

  const icon = isDone
    ? "checkmark-circle-outline"
    : isFailed
      ? "close-circle-outline"
      : "time-outline";

  const color = isDone ? "#059669" : isFailed ? "#E11D48" : "#D97706";

  return (
    <View className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0B1220]">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-row flex-1 items-start gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/10">
            <Ionicons name={icon as any} size={22} color={color} />
          </View>

          <View className="flex-1">
            <Text className="text-base font-bold text-slate-900 dark:text-white">
              {item.title}
            </Text>

            <Text className="mt-1 text-sm leading-5 text-slate-500 dark:text-white/60">
              {item.description}
            </Text>
          </View>
        </View>

        <View className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 dark:border-white/10 dark:bg-white/5">
          <Text className="text-xs font-bold text-sky-700 dark:text-sky-300">
            {item.time}
          </Text>
        </View>
      </View>
    </View>
  );
}