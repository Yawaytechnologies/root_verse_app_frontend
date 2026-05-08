import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";

type FeedLog = {
  id: string;
  farmQrId: string;
  pondQrId: string;
  pondName: string;
  cultureCycleId: string;
  qtyKg: number;
  feedType: string;
  time: string;
  qrVerified: boolean;
};

export default function FeedLogList() {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const isDark = useColorScheme() === "dark";

  const bg = isDark ? "#050B16" : "#F5F7FB";

  /**
   * Replace this mock list with API response later.
   * Important: Feed logs must be linked to QR-based Pond ID, Farm ID and Culture Cycle.
   */
  const logs: FeedLog[] = [
    {
      id: "FL-001",
      farmQrId: "IN-TN-NA-260001",
      pondQrId: "IN-TN-NA-P-2600001",
      pondName: "Pond 1",
      cultureCycleId: "CC-2026-001",
      qtyKg: 12,
      feedType: "CP 35% pellet",
      time: "Today 09:12",
      qrVerified: true,
    },
    {
      id: "FL-002",
      farmQrId: "IN-TN-NA-260001",
      pondQrId: "IN-TN-NA-P-2600002",
      pondName: "Pond 2",
      cultureCycleId: "CC-2026-001",
      qtyKg: 10,
      feedType: "Floating pellet",
      time: "Today 16:10",
      qrVerified: true,
    },
  ];

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();

    if (!s) return logs;

    return logs.filter(
      (log) =>
        log.id.toLowerCase().includes(s) ||
        log.farmQrId.toLowerCase().includes(s) ||
        log.pondQrId.toLowerCase().includes(s) ||
        log.pondName.toLowerCase().includes(s) ||
        log.feedType.toLowerCase().includes(s) ||
        log.time.toLowerCase().includes(s) ||
        log.cultureCycleId.toLowerCase().includes(s),
    );
  }, [q]);

  const openQrScannerForFeedLog = () => {
    router.push({
      pathname: "/(aqua)/tabs/qr-scanner",
      params: {
        purpose: "FEED_LOG",
        returnTo: "/(aqua)/feed-log/add",
      },
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 130 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-xl font-bold text-slate-900 dark:text-white">
              {t("feedLog.title", "Feed Logs")}
            </Text>

            <Text className="mt-1 text-sm leading-5 text-slate-600 dark:text-white/70">
              {t(
                "feedLog.subtitle",
                "Pond-wise feed entries linked through activated Pond QR.",
              )}
            </Text>
          </View>

          <Pressable
            onPress={openQrScannerForFeedLog}
            className="rounded-2xl border border-sky-500/25 bg-sky-500/15 px-4 py-3"
          >
            <View className="flex-row items-center gap-2">
              <Ionicons name="qr-code-outline" size={16} color="#60A5FA" />
              <Text className="font-semibold text-sky-300">
                {t("feedLog.scanQr", "Scan QR")}
              </Text>
            </View>
          </Pressable>
        </View>

        {/* QR rule banner */}
        <View className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
          <View className="flex-row items-start gap-3">
            <View className="h-9 w-9 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-500/20">
              <Ionicons name="shield-checkmark-outline" size={18} color="#D97706" />
            </View>

            <View className="flex-1">
              <Text className="text-sm font-bold text-amber-800 dark:text-amber-300">
                QR-based feed log only
              </Text>

              <Text className="mt-1 text-xs leading-5 text-amber-700 dark:text-amber-200/80">
                Feed log entry is enabled only after scanning an activated Pond QR.
                Manual pond selection is disabled to maintain traceability.
              </Text>
            </View>
          </View>
        </View>

        {/* Search */}
        <View className="mt-4 flex-row items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#0B1220]">
          <Ionicons name="search" size={18} color="#94A3B8" />

          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={t(
              "feedLog.searchPlaceholder",
              "Search by Feed ID, Farm QR, Pond QR, feed type...",
            )}
            placeholderTextColor="#94A3B8"
            className="flex-1 text-[14px] text-slate-900 dark:text-white"
          />
        </View>

        {/* Logs */}
        <View className="mt-4 gap-3">
          {filtered.map((log) => (
            <View
              key={log.id}
              className="rounded-3xl border border-slate-200 bg-white px-4 py-4 dark:border-white/10 dark:bg-[#0B1220]"
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-row flex-1 items-start gap-3 pr-3">
                  <View className="h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/10">
                    <Ionicons name="cube-outline" size={21} color="#60A5FA" />
                  </View>

                  <View className="flex-1">
                    <Text
                      className="text-[15px] font-bold text-slate-900 dark:text-white"
                      numberOfLines={1}
                    >
                      {log.pondName} • {log.qtyKg} kg
                    </Text>

                    <Text
                      className="mt-1 text-[12px] text-slate-600 dark:text-white/70"
                      numberOfLines={1}
                    >
                      {log.feedType} • {log.id}
                    </Text>
                  </View>
                </View>

                <View className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1">
                  <Text className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300">
                    QR Verified
                  </Text>
                </View>
              </View>

              <View className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3 dark:border-white/5 dark:bg-white/5">
                <InfoRow label="Farm QR ID" value={log.farmQrId} />
                <View className="my-2 h-px bg-slate-200 dark:bg-white/10" />
                <InfoRow label="Pond QR ID" value={log.pondQrId} />
                <View className="my-2 h-px bg-slate-200 dark:bg-white/10" />
                <InfoRow label="Culture Cycle" value={log.cultureCycleId} />
              </View>

              <View className="mt-3 flex-row items-center justify-between">
                <View className="flex-row items-center rounded-full bg-slate-100 px-2.5 py-1 dark:bg-white/10">
                  <Ionicons name="time-outline" size={14} color="#60A5FA" />
                  <Text className="ml-1 text-[12px] text-slate-600 dark:text-white/70">
                    {log.time}
                  </Text>
                </View>

                <View className="flex-row items-center gap-1">
                  <Ionicons name="qr-code-outline" size={15} color="#94A3B8" />
                  <Text className="text-[12px] font-semibold text-slate-500 dark:text-white/50">
                    Pond QR based
                  </Text>
                </View>
              </View>
            </View>
          ))}

          {filtered.length === 0 && (
            <View className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0B1220]">
              <Text className="font-semibold text-slate-900 dark:text-white">
                {t("feedLog.emptyTitle", "No feed logs found")}
              </Text>

              <Text className="mt-1 text-sm leading-5 text-slate-600 dark:text-white/70">
                {t(
                  "feedLog.emptySub",
                  "Scan an activated Pond QR to create a new feed log.",
                )}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating QR button */}
      <Pressable
        onPress={openQrScannerForFeedLog}
        className="absolute bottom-6 right-5 h-14 w-14 items-center justify-center rounded-2xl border border-sky-500/25 bg-sky-500/20"
        style={{ elevation: 8 }}
      >
        <Ionicons name="qr-code-outline" size={25} color="#60A5FA" />
      </Pressable>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-white/40">
        {label}
      </Text>

      <Text
        className="flex-1 text-right text-[12px] font-semibold text-slate-700 dark:text-white/80"
        numberOfLines={1}
      >
        {value || "-"}
      </Text>
    </View>
  );
}