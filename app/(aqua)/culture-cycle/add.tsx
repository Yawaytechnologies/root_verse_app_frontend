import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

import { API_BASE } from "../../../src/config/env";

type FarmRecord = {
  id: number | string;
  farm_id?: string;
  farm_code?: string;
  farm_qrs?: string;
  farm_qr_id?: string;
  farm_qr_code?: string;
  activated_qr_code?: string;
  qr_code?: string;
  qr_value?: string;
  farm_name?: string;
  name?: string;
  user_id?: number | string;
  owner_id?: number | string;
};

type PondRecord = {
  id: number | string;
  farm_id: number | string;
  pond_id?: string;
  pond_code?: string;
  qrs_code?: string;
  pond_qr_id?: string;
  pond_qr_code?: string;
  activated_qr_code?: string;
  qr_code?: string;
  qr_value?: string;
  pond_name?: string;
  name?: string;
  user_id?: number | string;
};

function apiUrl(path: string) {
  const base = String(API_BASE || "").replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

function extractArray<T = any>(data: any): T[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.farms)) return data.farms;
  if (Array.isArray(data?.ponds)) return data.ponds;
  return [];
}

function unwrapData<T = any>(data: any): T | null {
  if (!data) return null;
  if (data.data !== undefined) return data.data as T;
  if (data.result !== undefined) return data.result as T;
  return data as T;
}

function toNumericUserId(value: any) {
  const raw = String(value ?? "").trim();

  if (!raw) return "";

  if (/^\d+$/.test(raw)) {
    return String(Number(raw));
  }

  const digits = raw.replace(/\D/g, "");

  if (!digits) return "";

  return String(Number(digits));
}

function sameId(a: any, b: any) {
  if (a === undefined || a === null || b === undefined || b === null) {
    return false;
  }

  return String(a).trim() === String(b).trim();
}

function pickName(...values: any[]) {
  const found = values.find((value) => {
    const text = String(value ?? "").trim();
    return text && text !== "undefined" && text !== "null";
  });

  return found ? String(found) : "";
}

function farmQrIdOf(farm: FarmRecord) {
  return pickName(
    farm.farm_qrs,
    farm.farm_qr_id,
    farm.farm_qr_code,
    farm.activated_qr_code,
    farm.qr_code,
    farm.qr_value,
  );
}

function pondQrIdOf(pond: PondRecord) {
  return pickName(
    pond.qrs_code,
    pond.pond_qr_id,
    pond.pond_qr_code,
    pond.activated_qr_code,
    pond.qr_code,
    pond.qr_value,
  );
}

function todayDate() {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}`;
}

function plusMonths(months: number) {
  const date = new Date();
  date.setMonth(date.getMonth() + months);

  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}`;
}

export default function CultureCycleAddScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const me = useSelector((state: any) => state.me?.me);
  const loginUser = useSelector((state: any) => state.login?.user);
  const authUser = useSelector((state: any) => state.auth?.user);

  const numericUserId = toNumericUserId(
    me?.id ??
      me?.user_id ??
      me?.owner_id ??
      loginUser?.id ??
      loginUser?.user_id ??
      authUser?.id ??
      authUser?.user_id,
  );

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [farms, setFarms] = useState<FarmRecord[]>([]);
  const [ponds, setPonds] = useState<PondRecord[]>([]);

  const [selectedFarmId, setSelectedFarmId] = useState("");
  const [selectedPondId, setSelectedPondId] = useState("");

  const [startDate, setStartDate] = useState(todayDate());
  const [endDate, setEndDate] = useState(plusMonths(4));

  const selectedFarm = farms.find((farm) => sameId(farm.id, selectedFarmId));
  const selectedPond = ponds.find((pond) => sameId(pond.id, selectedPondId));

  const filteredPonds = useMemo(() => {
    if (!selectedFarmId) return ponds;

    return ponds.filter((pond) => sameId(pond.farm_id, selectedFarmId));
  }, [ponds, selectedFarmId]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const [farmsRes, pondsRes] = await Promise.all([
        fetch(apiUrl("/api/farms")),
        fetch(apiUrl("/api/ponds")),
      ]);

      const farmsJson = await farmsRes.json();
      const pondsJson = await pondsRes.json();

      const allFarms = extractArray<FarmRecord>(farmsJson);
      const allPonds = extractArray<PondRecord>(pondsJson);

      const userFarms = numericUserId
        ? allFarms.filter(
            (farm) =>
              sameId(farm.user_id, numericUserId) ||
              sameId(farm.owner_id, numericUserId),
          )
        : allFarms;

      const userFarmIds = userFarms.map((farm) => String(farm.id));

      const userPonds = numericUserId
        ? allPonds.filter(
            (pond) =>
              sameId(pond.user_id, numericUserId) ||
              userFarmIds.some((farmId) => sameId(farmId, pond.farm_id)),
          )
        : allPonds;

      setFarms(userFarms);
      setPonds(userPonds);

      // Keep the user's farm selection if it still exists. Otherwise choose
      // the first available farm. Never auto-change the selected pond.
      setSelectedFarmId((currentFarmId) => {
        const currentExists = userFarms.some((farm) =>
          sameId(farm.id, currentFarmId),
        );

        return currentExists
          ? currentFarmId
          : userFarms[0]?.id !== undefined
            ? String(userFarms[0].id)
            : "";
      });

      setSelectedPondId((currentPondId) => {
        const currentExists = userPonds.some((pond) =>
          sameId(pond.id, currentPondId),
        );

        return currentExists ? currentPondId : "";
      });
    } catch (error) {
      console.log("Culture cycle data fetch failed:", error);
      setFarms([]);
      setPonds([]);
    } finally {
      setLoading(false);
    }
  }, [numericUserId]);

  // useFocusEffect already runs on first screen focus and whenever returning
  // to this screen. Keeping only one data trigger avoids selection race/refetch.
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  useEffect(() => {
    if (!selectedFarmId) return;
    if (selectedFarm && farmQrIdOf(selectedFarm)) return;

    let cancelled = false;

    const fetchFarmDetail = async () => {
      try {
        const response = await fetch(apiUrl(`/api/farms/${selectedFarmId}`));
        const json = await response.json();
        const farmDetail = unwrapData<FarmRecord>(json);

        if (cancelled || !farmDetail) return;

        setFarms((current) =>
          current.map((farm) =>
            sameId(farm.id, selectedFarmId)
              ? { ...farm, ...farmDetail, id: farm.id }
              : farm,
          ),
        );
      } catch (error) {
        console.log("Farm detail fetch failed:", error);
      }
    };

    fetchFarmDetail();

    return () => {
      cancelled = true;
    };
  }, [selectedFarmId, selectedFarm]);

  useEffect(() => {
    if (!selectedPondId) return;
    if (selectedPond && pondQrIdOf(selectedPond)) return;

    let cancelled = false;

    const fetchPondDetail = async () => {
      try {
        const response = await fetch(apiUrl(`/api/ponds/${selectedPondId}`));
        const json = await response.json();
        const pondDetail = unwrapData<PondRecord>(json);

        if (cancelled || !pondDetail) return;

        setPonds((current) =>
          current.map((pond) =>
            sameId(pond.id, selectedPondId)
              ? { ...pond, ...pondDetail, id: pond.id }
              : pond,
          ),
        );
      } catch (error) {
        console.log("Pond detail fetch failed:", error);
      }
    };

    fetchPondDetail();

    return () => {
      cancelled = true;
    };
  }, [selectedPondId, selectedPond]);

 

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

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

  const validate = () => {
    if (!numericUserId) {
      Alert.alert(t("common.failed"), t("cultureCycle.validUserRequired"));
      return false;
    }

    if (!selectedFarmId) {
      Alert.alert(t("common.failed"), `${t("cultureCycle.farm")} required`);
      return false;
    }

    if (!selectedPondId || !selectedPond) {
      Alert.alert(t("common.failed"), `${t("cultureCycle.pond")} required`);
      return false;
    }

    if (!sameId(selectedPond.farm_id, selectedFarmId)) {
      Alert.alert(
        t("common.failed"),
        "Selected pond does not belong to the selected farm. Please select the pond again.",
      );
      return false;
    }

    if (!startDate.trim()) {
      Alert.alert(t("common.failed"), `${t("cultureCycle.startDate")} required`);
      return false;
    }

    if (!endDate.trim()) {
      Alert.alert(t("common.failed"), `${t("cultureCycle.endDate")} required`);
      return false;
    }

    return true;
  };

  const submitCultureCycle = async () => {
    if (!validate()) return;

    try {
      setSubmitting(true);

      const payload = {
        user_id: Number(numericUserId),
        farm_id: Number(selectedFarm?.id ?? selectedFarmId),
        pond_id: Number(selectedPond?.id ?? selectedPondId),
        start_date: startDate.trim(),
        end_date: endDate.trim(),
        verification_status: "PENDING",
        status: "PENDING",
      };

      const response = await fetch(apiUrl("/api/aquaculture/culture-cycles"), {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      let data: any = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok || data?.success === false) {
        throw new Error(
          data?.message || data?.detail || "Culture cycle creation failed",
        );
      }

      Alert.alert(t("common.success"), t("cultureCycle.createdSuccess"), [
        {
          text: "OK",
          onPress: () => router.replace("/(aqua)/tabs/dashboard"),
        },
      ]);
    } catch (error: any) {
      Alert.alert(t("common.failed"), error?.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-[#F5F7FB] dark:bg-[#050B16]">
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: insets.top + 14,
          paddingBottom: insets.bottom + 28,
        }}
      >
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={safeBack}
            className="h-12 w-12 items-center justify-center rounded-2xl bg-white dark:bg-[#0B1220]"
          >
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </Pressable>

          <View className="flex-1">
            <Text className="text-2xl font-black text-slate-900 dark:text-white">
              {t("cultureCycle.title")}
            </Text>

            <Text className="mt-1 text-sm text-slate-500 dark:text-white/60">
              {t("cultureCycle.subtitle")}
            </Text>
          </View>
        </View>

        <View className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
          <Text className="text-base font-black text-amber-800 dark:text-amber-300">
            {t("cultureCycle.qrActivationPendingTitle")}
          </Text>

          <Text className="mt-3 text-sm leading-6 text-amber-700 dark:text-amber-200/80">
            {t("cultureCycle.qrActivationPendingSub")}
          </Text>
        </View>

        {loading ? (
          <View className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-[#0B1220]">
            <ActivityIndicator size="small" color="#2563EB" />

            <Text className="mt-3 text-center text-sm text-slate-500 dark:text-white/60">
              {t("common.loading")}
            </Text>
          </View>
        ) : null}

        <Text className="mt-6 text-lg font-black text-slate-900 dark:text-white">
          {t("cultureCycle.selectFarm")}
        </Text>

        <View className="mt-3 gap-3">
          {farms.length > 0 ? (
            farms.map((farm) => {
              const active = sameId(farm.id, selectedFarmId);
              const farmQrId = farmQrIdOf(farm);

              return (
                <Pressable
                  key={String(farm.id)}
                  onPress={() => {
                    const nextFarmId = String(farm.id);
                    setSelectedFarmId(nextFarmId);
                    setSelectedPondId((currentPondId) => {
                      const currentPond = ponds.find((pond) =>
                        sameId(pond.id, currentPondId),
                      );

                      return currentPond &&
                        sameId(currentPond.farm_id, nextFarmId)
                        ? currentPondId
                        : "";
                    });
                  }}
                  className={`rounded-3xl border p-4 ${
                    active
                      ? "border-emerald-300 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10"
                      : "border-slate-200 bg-white dark:border-white/10 dark:bg-[#0B1220]"
                  }`}
                >
                  <View className="flex-row items-center gap-3">
                    <View className="flex-1">
                      <Text className="text-base font-black text-slate-900 dark:text-white">
                        {pickName(farm.farm_name, farm.name, t("cultureCycle.farm"))}
                      </Text>

                      <Text className="mt-1 text-sm text-slate-500 dark:text-white/60">
                        {farmQrId
                          ? `QR ID: ${farmQrId}`
                          : t("cultureCycle.farmQrPending")}
                      </Text>
                    </View>

                    <Ionicons
                      name={active ? "checkmark-circle" : "ellipse-outline"}
                      size={28}
                      color={active ? "#059669" : "#94A3B8"}
                    />
                  </View>
                </Pressable>
              );
            })
          ) : (
            <EmptyCard text={t("cultureCycle.noFarms")} />
          )}
        </View>

        <Text className="mt-6 text-lg font-black text-slate-900 dark:text-white">
          {t("cultureCycle.selectPond")}
        </Text>

        <View className="mt-3 gap-3">
          {filteredPonds.length > 0 ? (
            filteredPonds.map((pond) => {
              const active = sameId(pond.id, selectedPondId);
              const pondQrId = pondQrIdOf(pond);

              return (
                <Pressable
                  key={String(pond.id)}
                  onPress={() => {
                    const exactPondId = String(pond.id);
                    setSelectedPondId(exactPondId);
                  }}
                  className={`rounded-3xl border p-4 ${
                    active
                      ? "border-emerald-300 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10"
                      : "border-slate-200 bg-white dark:border-white/10 dark:bg-[#0B1220]"
                  }`}
                >
                  <View className="flex-row items-center gap-3">
                    <View className="flex-1">
                      <Text className="text-base font-black text-slate-900 dark:text-white">
                        {pickName(pond.pond_name, pond.name, t("cultureCycle.pond"))}
                      </Text>

                      <Text className="mt-1 text-sm text-slate-500 dark:text-white/60">
                        {pondQrId
                          ? `QR ID: ${pondQrId}`
                          : t("cultureCycle.pondQrPending")}
                      </Text>
                    </View>

                    <Ionicons
                      name={active ? "checkmark-circle" : "ellipse-outline"}
                      size={28}
                      color={active ? "#059669" : "#94A3B8"}
                    />
                  </View>
                </Pressable>
              );
            })
          ) : (
            <EmptyCard text={t("cultureCycle.noPonds")} />
          )}
        </View>

        <Text className="mt-6 text-lg font-black text-slate-900 dark:text-white">
          {t("cultureCycle.details")}
        </Text>

        <View className="mt-3 gap-4 rounded-3xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0B1220]">
          <Field
            label={t("cultureCycle.startDate")}
            placeholder="YYYY-MM-DD"
            value={startDate}
            onChangeText={setStartDate}
          />

          <Field
            label={t("cultureCycle.endDate")}
            placeholder="YYYY-MM-DD"
            value={endDate}
            onChangeText={setEndDate}
          />
        </View>


        <Pressable
          onPress={submitCultureCycle}
          disabled={submitting}
          className={`mt-6 rounded-3xl px-4 py-4 ${
            submitting ? "bg-slate-400" : "bg-slate-900 dark:bg-white"
          }`}
        >
          <Text className="text-center text-base font-black text-white dark:text-slate-900">
            {submitting ? t("common.loading") : t("cultureCycle.create")}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChangeText,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
}) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-bold text-slate-700 dark:text-white/70">
        {label}
      </Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-semibold text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
      />
    </View>
  );
}


function EmptyCard({ text }: { text: string }) {
  return (
    <View className="rounded-3xl border border-dashed border-slate-300 bg-white p-5 dark:border-white/10 dark:bg-[#0B1220]">
      <Text className="text-center text-sm text-slate-500 dark:text-white/60">
        {text}
      </Text>
    </View>
  );
}