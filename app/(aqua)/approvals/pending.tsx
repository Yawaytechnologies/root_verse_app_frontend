import React, { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";

import type { AppDispatch } from "../../../src/store/auth/store";
import { fetchAquaApprovals } from "../../../src/features/aqua/approvals/approvals.slice";
import {
  selectAquaApprovalsLoading,
  selectAquaApprovalsError,
  selectPendingFarms,
  selectPendingPonds,
  selectAllFarms,
} from "../../../src/features/aqua/approvals/approvals.selectors";

export default function AquaPendingApprovalScreen() {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation();

  const me = useSelector((state: any) => state.me?.me);
  const numericOwnerId = me?.owner_id
    ? String(me.owner_id).replace(/\D/g, "").replace(/^0+/, "")
    : "";

  const loading = useSelector(selectAquaApprovalsLoading);
  const error = useSelector(selectAquaApprovalsError);
  const pendingFarms = useSelector(selectPendingFarms);
  const pendingPonds = useSelector(selectPendingPonds);
  const allFarms = useSelector(selectAllFarms);

  const load = useCallback(() => {
    dispatch(fetchAquaApprovals(numericOwnerId));
  }, [dispatch, numericOwnerId]);

  useEffect(() => {
    load();
  }, [load]);

  const getFarmName = (farmId: number) =>
    allFarms.find((f) => f.id === farmId)?.name ?? `Farm #${farmId}`;

  const formatDate = (iso: string) => {
    if (!iso) return "-";
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const isEmpty = !loading && pendingFarms.length === 0 && pendingPonds.length === 0;

  return (
    <ScrollView
      className="flex-1 bg-[#F5F7FB] dark:bg-[#050B16]"
      contentContainerStyle={{
        padding: 16,
        paddingTop: insets.top + 8,
        paddingBottom: 32,
      }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={load} />
      }
    >
      {/* Header */}
      <View className="rounded-2xl border border-slate-900 bg-slate-900 p-5 dark:border-white/10 dark:bg-[#0B1220]">
        <View className="flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
            <Ionicons name="time-outline" size={20} color="#FBBF24" />
          </View>
          <View className="flex-1">
            <Text className="text-[11px] uppercase tracking-wide text-white opacity-80">
              {t("registration.approvalsLabel")}
            </Text>
            <Text className="mt-1 text-lg font-bold text-white">
              {t("registration.pendingTitle")}
            </Text>
          </View>
          <Pressable
            onPress={load}
            className="h-9 w-9 items-center justify-center rounded-xl bg-white/10"
          >
            <Ionicons name="refresh-outline" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      {loading ? (
        <View className="mt-12 items-center gap-3">
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text className="text-sm text-slate-500 dark:text-white/50">
            {t("registration.loadingPending")}
          </Text>
        </View>
      ) : error ? (
        <View className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-500/20 dark:bg-rose-500/10">
          <Text className="text-sm font-semibold text-rose-700 dark:text-rose-300">
            {error}
          </Text>
          <Pressable onPress={load} className="mt-3">
            <Text className="text-sm font-semibold text-rose-600 dark:text-rose-400">
              {t("registration.tapToRetry")}
            </Text>
          </Pressable>
        </View>
      ) : isEmpty ? (
        <View className="mt-5 items-center rounded-2xl border border-slate-200 bg-white p-8 dark:border-white/10 dark:bg-[#0B1220]">
          <Ionicons name="checkmark-done-circle-outline" size={40} color="#10B981" />
          <Text className="mt-3 text-base font-semibold text-slate-900 dark:text-white">
            {t("registration.noPendingTitle")}
          </Text>
          <Text className="mt-1 text-center text-sm text-slate-500 dark:text-white/50">
            {t("registration.noPendingDesc")}
          </Text>
        </View>
      ) : (
        <>
          {/* Pending Farms */}
          {pendingFarms.length > 0 && (
            <View className="mt-5">
              <Text className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/50">
                {t("registration.pendingFarms")} ({pendingFarms.length})
              </Text>
              <View className="gap-3">
                {pendingFarms.map((farm) => (
                  <View
                    key={farm.id}
                    className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10"
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <Text className="text-base font-semibold text-slate-900 dark:text-white">
                          {farm.name}
                        </Text>
                        {farm.farm_code ? (
                          <Text className="mt-0.5 text-xs text-slate-500 dark:text-white/50">
                            Code: {farm.farm_code}
                          </Text>
                        ) : null}
                      </View>
                      <View className="rounded-full border border-amber-300 bg-white px-3 py-1 dark:border-amber-500/30 dark:bg-amber-500/20">
                        <Text className="text-[11px] font-semibold uppercase text-amber-700 dark:text-amber-300">
                          {t("registration.pendingStatus")}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Pending Ponds */}
          {pendingPonds.length > 0 && (
            <View className="mt-5">
              <Text className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/50">
                {t("registration.pendingPonds")} ({pendingPonds.length})
              </Text>
              <View className="gap-3">
                {pendingPonds.map((pond) => (
                  <View
                    key={pond.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0B1220]"
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <Text className="text-base font-semibold text-slate-900 dark:text-white">
                          {pond.name}
                        </Text>
                        <Text className="mt-0.5 text-xs text-slate-500 dark:text-white/50">
                          {t("registration.farmLabel")}: {getFarmName(pond.farm_id)}
                        </Text>
                      </View>
                      <View className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 dark:border-amber-500/30 dark:bg-amber-500/10">
                        <Text className="text-[11px] font-semibold uppercase text-amber-700 dark:text-amber-300">
                          {t("registration.pendingStatus")}
                        </Text>
                      </View>
                    </View>

                    <View className="mt-3 flex-row gap-3">
                      <View className="flex-1 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 dark:border-white/5 dark:bg-white/5">
                        <Text className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-white/40">
                          {t("registration.areaLabel")}
                        </Text>
                        <Text className="mt-0.5 text-sm font-semibold text-slate-700 dark:text-white/80">
                          {pond.area} ha
                        </Text>
                      </View>
                      <View className="flex-1 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 dark:border-white/5 dark:bg-white/5">
                        <Text className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-white/40">
                          {t("registration.submittedOn")}
                        </Text>
                        <Text className="mt-0.5 text-sm font-semibold text-slate-700 dark:text-white/80">
                          {formatDate(pond.created_at)}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
            <Text className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              {t("registration.whatNext")}
            </Text>
            <Text className="mt-2 text-sm leading-6 text-amber-700 dark:text-amber-200/80">
              {t("registration.whatNextDesc")}
            </Text>
          </View>
        </>
      )}

      <Pressable
        onPress={() => router.replace("/(aqua)/tabs/dashboard")}
        className="mt-6 w-full rounded-2xl bg-slate-900 px-4 py-4 dark:bg-white"
      >
        <Text className="text-center font-semibold text-white dark:text-slate-900">
          {t("registration.backToDashboard")}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
