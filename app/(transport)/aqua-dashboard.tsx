import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";

import DateTimePicker from "@react-native-community/datetimepicker";

import {
  router,
  useFocusEffect,
} from "expo-router";

import {
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";

import { useDispatch } from "react-redux";

import Screen from "../../src/components/centre/Screen";

import {
  getCurrentTransportOperator,
  type CurrentTransportOperator,
} from "../../src/services/transport/currentTransportOperator.service";

import {
  getAquaLoadingHistoryByDate,
  type AquaLoadingHistoryItem,
} from "../../src/services/transport/aquaTransportLoading.service";

import {
  logoutSession,
} from "../../src/store/auth/authSession.slice";

import {
  clearMe,
} from "../../src/store/auth/me.slice";

// ============================================================
// HELPERS
// ============================================================

function firstText(...values: any[]) {
  for (const value of values) {
    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {
      return String(value).trim();
    }
  }

  return "";
}

function display(value: any) {
  return firstText(value) || "-";
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1
  )}-${pad(date.getDate())}`;
}

function parseDateKey(value?: string) {
  if (!value) {
    return new Date();
  }

  const [year, month, day] =
    String(value)
      .split("-")
      .map(Number);

  if (!year || !month || !day) {
    return new Date();
  }

  return new Date(
    year,
    month - 1,
    day
  );
}

function formatDisplayDate(value: string) {
  return parseDateKey(
    value
  ).toLocaleDateString(
    "en-US",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

function formatDateTime(value?: string) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(
    "en-US",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function formatStatus(value?: string) {
  if (!value) {
    return "-";
  }

  return String(value)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );
}

// ============================================================
// SCREEN
// ============================================================

export default function AquaTransportDashboard() {
  const dispatch =
    useDispatch<any>();

  // ==========================================================
  // OPERATOR
  // ==========================================================

  const [
    operator,
    setOperator,
  ] =
    useState<CurrentTransportOperator | null>(
      null
    );

  const [
    operatorLoading,
    setOperatorLoading,
  ] =
    useState(true);

  const [
    operatorError,
    setOperatorError,
  ] =
    useState("");

  // ==========================================================
  // DATE
  // ==========================================================

  const [
    selectedDate,
    setSelectedDate,
  ] =
    useState(
      formatDateKey(new Date())
    );

  const [
    showDatePicker,
    setShowDatePicker,
  ] =
    useState(false);

  // ==========================================================
  // HISTORY
  // ==========================================================

  const [
    loadedCrates,
    setLoadedCrates,
  ] =
    useState<
      AquaLoadingHistoryItem[]
    >([]);

  const [
    historyLoading,
    setHistoryLoading,
  ] =
    useState(false);

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);

  const [
    logoutLoading,
    setLogoutLoading,
  ] =
    useState(false);

  // ==========================================================
  // LOAD /api/auth/me
  // ==========================================================

  const loadOperator =
    useCallback(async () => {
      try {
        setOperatorLoading(true);

        setOperatorError("");

        const response =
          await getCurrentTransportOperator();

        console.log(
          "AQUA DASHBOARD AUTH ME RESULT:",
          JSON.stringify(response, null, 2)
        );

        if (
          !response.ok ||
          !response.data
        ) {
          throw new Error(
            response.message ||
              "Unable to load Transport Operator."
          );
        }

        setOperator(response.data);
      } catch (error: any) {
        console.log(
          "AQUA DASHBOARD OPERATOR ERROR:",
          error
        );

        setOperatorError(
          error?.message ||
            "Unable to load Transport Operator."
        );
      } finally {
        setOperatorLoading(false);
      }
    }, []);

  useEffect(() => {
    loadOperator();
  }, [loadOperator]);

  // ==========================================================
  // HISTORY
  // ==========================================================

  const loadHistory =
    useCallback(
      async (
        showLoader = true
      ) => {
        try {
          if (showLoader) {
            setHistoryLoading(true);
          }

          const result =
            await getAquaLoadingHistoryByDate(
              selectedDate
            );

          setLoadedCrates(result);
        } catch (error) {
          console.log(
            "AQUA HISTORY ERROR:",
            error
          );

          setLoadedCrates([]);
        } finally {
          setHistoryLoading(false);
        }
      },
      [selectedDate]
    );

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useFocusEffect(
    useCallback(() => {
      loadHistory(false);
    }, [loadHistory])
  );

  // ==========================================================
  // VALUES
  // ==========================================================

  const operatorName =
    display(operator?.full_name);

  const mobile =
    display(operator?.mobile);

  const vehicleNumber =
    display(
      operator?.vehicle_no ||
        operator?.vehicle_number ||
        operator?.vehicleNo
    );

  const operatorId =
    display(
      operator?.operator_rv_id ||
        operator?.user_id
    );

  

  const traderId =
    display(
      operator?.trader_id ??
        operator?.traderId
    );

  // ==========================================================
  // STATS
  // ==========================================================

  const totalLoaded =
    loadedCrates.length;

  const totalWeight =
    useMemo(
      () =>
        loadedCrates.reduce(
          (total, item) =>
            total +
            Number(
              item?.weight_kg || 0
            ),
          0
        ),
      [loadedCrates]
    );

  const harvestCount =
    useMemo(
      () =>
        new Set(
          loadedCrates
            .map(
              (item) =>
                item?.harvest_id
            )
            .filter(
              (value) =>
                value !== undefined &&
                value !== null
            )
        ).size,
      [loadedCrates]
    );

  // ==========================================================
  // REFRESH
  // ==========================================================

  const onRefresh =
    async () => {
      try {
        setRefreshing(true);

        await Promise.all([
          loadOperator(),
          loadHistory(false),
        ]);
      } finally {
        setRefreshing(false);
      }
    };

  // ==========================================================
  // SCAN
  // ==========================================================

  const openScan = () => {
    const vehicle =
      firstText(
        operator?.vehicle_no,
        operator?.vehicle_number,
        operator?.vehicleNo
      );

    if (!vehicle) {
      Alert.alert(
        "Vehicle Not Available",
        "Vehicle number was not returned by /api/auth/me for this Transport Operator."
      );

      return;
    }

    router.push(
      "/(transport)/aqua-scan"
    );
  };

  // ==========================================================
  // LOGOUT
  // ==========================================================

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },

        {
          text: "Logout",
          style: "destructive",

          onPress:
            async () => {
              try {
                setLogoutLoading(true);

                await dispatch(
                  logoutSession()
                ).unwrap();

                dispatch(
                  clearMe()
                );

                router.replace(
                  "/(auth)/login"
                );
              } catch (error) {
                console.log(
                  "LOGOUT ERROR:",
                  error
                );
              } finally {
                setLogoutLoading(false);
              }
            },
        },
      ]
    );
  };

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <Screen>
      <View className="flex-1 bg-[#031225]">
        <ScrollView
          showsVerticalScrollIndicator={
            false
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#ffffff"
            />
          }
          contentContainerStyle={{
            paddingBottom: 50,
          }}
        >
          {/* HEADER */}

          <View className="bg-[#071a35] px-5 pb-6 pt-5">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 flex-row items-center pr-3">
                <View className="h-16 w-16 items-center justify-center rounded-[20px] border border-blue-500 bg-[#0d274a]">
                  <MaterialCommunityIcons
                    name="truck-fast-outline"
                    size={30}
                    color="#ffffff"
                  />
                </View>

                <View className="ml-3 flex-1">
                  <Text className="text-[24px] font-extrabold text-white">
                    Aqua Transport
                  </Text>

                  <Text className="mt-1 text-[14px] font-semibold text-slate-400">
                    Loading & Custody Control
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={handleLogout}
                disabled={logoutLoading}
                className="rounded-[16px] border border-red-400 bg-red-500/10 px-4 py-3"
              >
                {logoutLoading ? (
                  <ActivityIndicator
                    size="small"
                    color="#fca5a5"
                  />
                ) : (
                  <Text className="font-extrabold text-red-300">
                    Logout
                  </Text>
                )}
              </Pressable>
            </View>
          </View>

          {/* OPERATOR */}

          <View className="bg-[#16b8b2] px-5 py-6">
            {operatorLoading ? (
              <View className="items-center py-7">
                <ActivityIndicator
                  size="large"
                  color="#ffffff"
                />

                <Text className="mt-3 font-bold text-white">
                  Loading Transport Operator...
                </Text>
              </View>
            ) : (
              <>
                <Text className="text-[29px] font-extrabold text-white">
                  {operatorName}
                </Text>

                <View className="mt-4 rounded-[22px] bg-black/10 p-4">
                  <OperatorRow
                    label="Mobile"
                    value={mobile}
                  />

                  <OperatorRow
                    label="Vehicle No"
                    value={vehicleNumber}
                  />

                  <OperatorRow
                    label="ID"
                    value={operatorId}
                  />

                 

                  <OperatorRow
                    label="Trader ID"
                    value={traderId}
                    last
                  />
                </View>

                {operatorError ? (
                  <View className="mt-4 rounded-[18px] bg-amber-950/40 p-4">
                    <Text className="text-[12px] font-semibold leading-5 text-amber-100">
                      {operatorError}
                    </Text>
                  </View>
                ) : null}
              </>
            )}

            {/* STATS */}

            <View className="mt-5 flex-row gap-3">
              <StatCard
                label="Loaded"
                value={String(
                  totalLoaded
                )}
                bgClass="bg-[#2d8cff]"
              />

              <StatCard
                label="Harvests"
                value={String(
                  harvestCount
                )}
                bgClass="bg-[#12c48b]"
              />

              <StatCard
                label="Weight"
                value={totalWeight.toFixed(
                  1
                )}
                suffix="kg"
                bgClass="bg-[#f1ab19]"
              />
            </View>
          </View>

          {/* DATE */}

          <View className="px-5 pt-6">
            <Text className="mb-4 text-[20px] font-extrabold text-white">
              Select Date
            </Text>

            <Pressable
              onPress={() =>
                setShowDatePicker(true)
              }
              className="rounded-[26px] border border-slate-800 bg-[#0b172b] p-5"
            >
              <View className="flex-row items-center">
                <View className="h-14 w-14 items-center justify-center rounded-[18px] bg-[#14325a]">
                  <Ionicons
                    name="calendar-outline"
                    size={27}
                    color="#60a5fa"
                  />
                </View>

                <View className="ml-4 flex-1">
                  <Text className="text-[12px] font-bold text-slate-400">
                    Selected Date
                  </Text>

                  <Text className="mt-1 text-[21px] font-extrabold text-white">
                    {formatDisplayDate(
                      selectedDate
                    )}
                  </Text>

                  <Text className="mt-1 text-[12px] text-slate-400">
                    Tap to change date
                  </Text>
                </View>

                <Ionicons
                  name="chevron-down"
                  size={23}
                  color="#94a3b8"
                />
              </View>
            </Pressable>
          </View>

          {/* ACTIONS */}

          <View className="px-5 pt-6">
            <Text className="mb-4 text-[20px] font-extrabold text-white">
              Transport Loading
            </Text>

            <ActionCard
              title="Scan Crate QR"
              subtitle={
                vehicleNumber !== "-"
                  ? `Vehicle: ${vehicleNumber}`
                  : "Vehicle information unavailable"
              }
              icon="scan-outline"
              onPress={openScan}
            />

            <ActionCard
              title="Harvest Loading Progress"
              subtitle="View packed, loaded and remaining crates"
              icon="stats-chart-outline"
              onPress={() =>
                router.push(
                  "/(transport)/aqua-progress"
                )
              }
            />

            <ActionCard
              title="Choose Division"
              subtitle="Return to transport division selection"
              icon="grid-outline"
              onPress={() =>
                router.replace(
                  "/(transport)/division"
                )
              }
            />

            {/* HISTORY */}

            <View className="mb-4 mt-7 flex-row items-center justify-between">
              <View>
                <Text className="text-[20px] font-extrabold text-white">
                  Loaded Crates
                </Text>

                <Text className="mt-1 text-[12px] text-slate-400">
                  {formatDisplayDate(
                    selectedDate
                  )}
                </Text>
              </View>

              <View className="rounded-full bg-[#102544] px-4 py-2">
                <Text className="font-bold text-white">
                  {loadedCrates.length}
                </Text>
              </View>
            </View>

            {historyLoading ? (
              <View className="items-center py-10">
                <ActivityIndicator
                  color="#3b82f6"
                />
              </View>
            ) : loadedCrates.length === 0 ? (
              <View className="items-center rounded-[24px] border border-slate-800 bg-[#0b172b] py-9">
                <Ionicons
                  name="cube-outline"
                  size={38}
                  color="#64748b"
                />

                <Text className="mt-3 font-bold text-slate-400">
                  No crates loaded
                </Text>
              </View>
            ) : (
              <View className="gap-3">
                {loadedCrates.map(
                  (item, index) => (
                    <LoadedCrateCard
                      key={
                        item.id ||
                        `${item.crate_code}-${index}`
                      }
                      item={item}
                    />
                  )
                )}
              </View>
            )}
          </View>
        </ScrollView>

        {/* DATE PICKER */}

        {showDatePicker ? (
          <Modal
            transparent
            visible
            animationType="fade"
            onRequestClose={() =>
              setShowDatePicker(false)
            }
          >
            <View className="flex-1 justify-end bg-black/60 px-4 pb-6">
              <View className="rounded-[28px] bg-[#0b172b] p-4">
                <Text className="mb-3 text-[18px] font-extrabold text-white">
                  Select Date
                </Text>

                <View className="overflow-hidden rounded-[20px] bg-white">
                  <DateTimePicker
                    value={parseDateKey(
                      selectedDate
                    )}
                    mode="date"
                    display="spinner"
                    maximumDate={
                      new Date()
                    }
                    onChange={(
                      _,
                      date
                    ) => {
                      if (date) {
                        setSelectedDate(
                          formatDateKey(
                            date
                          )
                        );
                      }
                    }}
                  />
                </View>

                <Pressable
                  onPress={() =>
                    setShowDatePicker(false)
                  }
                  className="mt-4 items-center rounded-[18px] bg-blue-600 py-4"
                >
                  <Text className="font-extrabold text-white">
                    Done
                  </Text>
                </Pressable>
              </View>
            </View>
          </Modal>
        ) : null}
      </View>
    </Screen>
  );
}

// ============================================================
// COMPONENTS
// ============================================================

function OperatorRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View
      className={`flex-row py-2 ${
        last
          ? ""
          : "border-b border-white/10"
      }`}
    >
      <Text className="w-[105px] text-[13px] font-semibold text-white/80">
        {label}:
      </Text>

      <Text className="flex-1 text-[13px] font-extrabold text-white">
        {value}
      </Text>
    </View>
  );
}

function StatCard({
  label,
  value,
  suffix,
  bgClass,
}: {
  label: string;
  value: string;
  suffix?: string;
  bgClass: string;
}) {
  return (
    <View
      className={`min-h-[100px] flex-1 items-center justify-center rounded-[24px] ${bgClass}`}
    >
      <Text className="text-[22px] font-extrabold text-white">
        {value}
        {suffix
          ? ` ${suffix}`
          : ""}
      </Text>

      <Text className="mt-2 text-[11px] font-bold text-white">
        {label}
      </Text>
    </View>
  );
}

function ActionCard({
  title,
  subtitle,
  icon,
  onPress,
}: {
  title: string;
  subtitle: string;
  icon:
    keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="mb-4 flex-row items-center rounded-[24px] border border-slate-800 bg-[#0b172b] p-4"
    >
      <View className="h-14 w-14 items-center justify-center rounded-[18px] bg-[#14325a]">
        <Ionicons
          name={icon}
          size={24}
          color="#60a5fa"
        />
      </View>

      <View className="ml-4 flex-1">
        <Text className="text-[17px] font-extrabold text-white">
          {title}
        </Text>

        <Text className="mt-1 text-[13px] leading-5 text-slate-400">
          {subtitle}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={21}
        color="#94a3b8"
      />
    </Pressable>
  );
}

function LoadedCrateCard({
  item,
}: {
  item: AquaLoadingHistoryItem;
}) {
  return (
    <View className="rounded-[22px] border border-slate-800 bg-[#0b172b] p-4">
      <Text className="text-[17px] font-extrabold text-white">
        {display(item.crate_code)}
      </Text>

      <MiniRow
        label="Harvest"
        value={display(
          item.harvest_id
        )}
      />

      <MiniRow
        label="Vehicle"
        value={display(
          item.vehicle_number
        )}
      />

      <MiniRow
        label="Weight"
        value={
          item.weight_kg !==
          undefined
            ? `${item.weight_kg} kg`
            : "-"
        }
      />

      <MiniRow
        label="Status"
        value={formatStatus(
          item.chain_of_custody_status
        )}
      />

      <MiniRow
        label="Loaded"
        value={formatDateTime(
          item.loaded_at
        )}
      />
    </View>
  );
}

function MiniRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View className="mt-3 flex-row">
      <Text className="w-[80px] text-[12px] text-slate-400">
        {label}
      </Text>

      <Text className="flex-1 text-right text-[12px] font-bold text-white">
        {value}
      </Text>
    </View>
  );
}