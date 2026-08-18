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
  ScrollView,
  Text,
  View,
} from "react-native";

import DateTimePicker from "@react-native-community/datetimepicker";

import {
  router,
} from "expo-router";

import {
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";

import {
  useDispatch,
  useSelector,
} from "react-redux";

import Screen from "../../src/components/centre/Screen";

// ============================================================
// EXISTING WILD TRANSPORT
// ============================================================

import {
  fetchTransportDashboard,
  selectAssignedCrates,
  selectInTransitCrates,
  selectTransportSelectedDate,
  selectTransportStats,
  setSelectedTransportDate,
} from "../../src/services/transport/transportSlice";

// ============================================================
// LOGGED-IN USER
// GET /api/auth/me
// ============================================================

import {
  getCurrentTransportOperator,
  type CurrentTransportOperator,
} from "../../src/services/transport/currentTransportOperator.service";

// ============================================================
// AUTH
// ============================================================

import {
  logoutSession,
} from "../../src/store/auth/authSession.slice";

import {
  clearMe,
} from "../../src/store/auth/me.slice";

// ============================================================
// HELPERS
// ============================================================

function pad(
  n: number
) {
  return String(n).padStart(
    2,
    "0"
  );
}

function formatDateKey(
  date: Date
) {
  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1
  )}-${pad(
    date.getDate()
  )}`;
}

function parseDateKey(
  dateKey?: string
) {
  if (!dateKey) {
    return new Date();
  }

  const [
    year,
    month,
    day,
  ] = String(
    dateKey
  )
    .split("-")
    .map(Number);

  if (
    !year ||
    !month ||
    !day
  ) {
    return new Date();
  }

  return new Date(
    year,
    month - 1,
    day
  );
}

function isToday(
  dateKey?: string
) {
  if (!dateKey) {
    return false;
  }

  return (
    formatDateKey(
      new Date()
    ) === dateKey
  );
}

function formatDisplayDate(
  dateKey: string
) {
  const date =
    parseDateKey(
      dateKey
    );

  return date.toLocaleDateString(
    "en-US",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

function firstText(
  ...values: any[]
) {
  for (const value of values) {
    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {
      return String(
        value
      ).trim();
    }
  }

  return "";
}

function display(
  value: any
) {
  return (
    firstText(value) ||
    "-"
  );
}

// ============================================================
// SCREEN
// ============================================================

export default function TransportDashboard() {
  const dispatch =
    useDispatch<any>();

  // ==========================================================
  // UI STATE
  // ==========================================================

  const [
    logoutLoading,
    setLogoutLoading,
  ] =
    useState(false);

  const [
    showDatePicker,
    setShowDatePicker,
  ] =
    useState(false);

  // ==========================================================
  // LOGGED-IN TRANSPORT OPERATOR
  // /api/auth/me
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
  // EXISTING WILD REDUX
  // ==========================================================

  const selectedDate =
    useSelector(
      selectTransportSelectedDate
    );

  const assignedCrates =
    useSelector(
      selectAssignedCrates
    );

  const inTransitCrates =
    useSelector(
      selectInTransitCrates
    );

  const stats =
    useSelector(
      selectTransportStats
    );

  // ==========================================================
  // LOAD LOGGED-IN USER
  //
  // GET /api/auth/me
  // ==========================================================

  const loadLoggedInOperator =
    useCallback(
      async () => {
        try {
          setOperatorLoading(
            true
          );

          setOperatorError(
            ""
          );

          const response =
            await getCurrentTransportOperator();

          console.log(
            "WILD TRANSPORT AUTH ME RESULT:",
            JSON.stringify(
              response,
              null,
              2
            )
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

          setOperator(
            response.data
          );
        } catch (
          error: any
        ) {
          console.log(
            "WILD TRANSPORT AUTH ME ERROR:",
            error
          );

          setOperatorError(
            error?.message ||
              "Unable to load Transport Operator."
          );

          setOperator(
            null
          );
        } finally {
          setOperatorLoading(
            false
          );
        }
      },
      []
    );

  useEffect(() => {
    loadLoggedInOperator();
  }, [
    loadLoggedInOperator,
  ]);

  // ==========================================================
  // DATE / WILD DASHBOARD
  // ==========================================================

  useEffect(() => {
    if (!selectedDate) {
      dispatch(
        setSelectedTransportDate(
          formatDateKey(
            new Date()
          )
        )
      );

      return;
    }

    dispatch(
      fetchTransportDashboard({
        date:
          selectedDate,
      })
    );
  }, [
    dispatch,
    selectedDate,
  ]);

  // ==========================================================
  // DATE VALUES
  // ==========================================================

  const activeDate =
    selectedDate ||
    formatDateKey(
      new Date()
    );

  const activeDateObj =
    useMemo(
      () =>
        parseDateKey(
          activeDate
        ),
      [activeDate]
    );

  const selectedIsToday =
    isToday(
      activeDate
    );

  // ==========================================================
  // LOGIN USER DETAILS
  //
  // ONLY FROM /api/auth/me
  // ==========================================================

  const transportName =
    firstText(
      operator?.full_name
    ) ||
    "Transport User";

  const operatorId =
    display(
      operator?.operator_rv_id ||
        operator?.user_id
    );

  const vehicleNo =
    display(
      operator?.vehicle_no ||
        operator?.vehicle_number ||
        operator?.vehicleNo
    );

  const routeName =
    display(
      operator?.route_name ||
        operator?.routeName
    );

  const mobile =
    display(
      operator?.mobile
    );

  const traderId =
    display(
      operator?.trader_id ??
        operator?.traderId
    );

  // ==========================================================
  // LOG DEBUG
  // ==========================================================

  useEffect(() => {
    if (
      operatorLoading
    ) {
      return;
    }

    console.log(
      "WILD TRANSPORT LOGIN DETAILS:",
      {
        name:
          transportName,

        operatorId,

        vehicleNo,

        routeName,

        mobile,

        traderId,
      }
    );
  }, [
    operatorLoading,
    transportName,
    operatorId,
    vehicleNo,
    routeName,
    mobile,
    traderId,
  ]);

  // ==========================================================
  // LOGOUT
  // ==========================================================

  const handleLogout =
    () => {
      Alert.alert(
        "Logout",
        "Are you sure you want to logout?",
        [
          {
            text:
              "Cancel",

            style:
              "cancel",
          },

          {
            text:
              "Logout",

            style:
              "destructive",

            onPress:
              async () => {
                try {
                  setLogoutLoading(
                    true
                  );

                  await dispatch(
                    logoutSession()
                  ).unwrap();

                  dispatch(
                    clearMe()
                  );

                  router.replace(
                    "/(auth)/login"
                  );
                } catch (
                  error
                ) {
                  console.log(
                    "TRANSPORT LOGOUT ERROR:",
                    error
                  );
                } finally {
                  setLogoutLoading(
                    false
                  );
                }
              },
          },
        ]
      );
    };

  // ==========================================================
  // DATE CHANGE
  // ==========================================================

  const handleDateChange =
    (
      _: any,
      date?: Date
    ) => {
      setShowDatePicker(
        false
      );

      if (!date) {
        return;
      }

      const nextDate =
        formatDateKey(
          date
        );

      dispatch(
        setSelectedTransportDate(
          nextDate
        )
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
          contentContainerStyle={{
            paddingBottom: 32,
          }}
        >
          {/* ================================================= */}
          {/* HEADER */}
          {/* ================================================= */}

          <View className="bg-[#071a35] px-5 pb-6 pt-4">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 flex-row items-center pr-3">
                <View className="h-16 w-16 items-center justify-center rounded-2xl border border-[#1e90ff] bg-[#0d274a]">
                  <MaterialCommunityIcons
                    name="truck-fast-outline"
                    size={30}
                    color="#ffffff"
                  />
                </View>

                <View className="ml-3 flex-1">
                  <Text className="text-[24px] font-extrabold text-white">
                    Transport
                    Dashboard
                  </Text>

                  <Text className="mt-1 text-[15px] font-semibold text-slate-400">
                    Pickup &
                    Transit
                    Control
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={
                  handleLogout
                }
                disabled={
                  logoutLoading
                }
                className="rounded-[16px] border border-red-400 bg-red-500/15 px-4 py-3"
              >
                {logoutLoading ? (
                  <ActivityIndicator
                    size="small"
                    color="#fca5a5"
                  />
                ) : (
                  <Text className="text-[13px] font-extrabold text-red-300">
                    Logout
                  </Text>
                )}
              </Pressable>
            </View>
          </View>

          {/* ================================================= */}
          {/* LOGGED-IN OPERATOR */}
          {/* ================================================= */}

          <View className="bg-[#16b8b2] px-5 py-6">
            {operatorLoading ? (
              <View className="items-center py-8">
                <ActivityIndicator
                  size="large"
                  color="#ffffff"
                />

                <Text className="mt-3 text-[14px] font-bold text-white">
                  Loading
                  Transport
                  Operator...
                </Text>
              </View>
            ) : (
              <>
                <Text className="text-[28px] font-extrabold text-white">
                  {
                    transportName
                  }
                </Text>

                {/* ----------------------------------------- */}
                {/* LOGIN DETAILS */}
                {/* /api/auth/me */}
                {/* ----------------------------------------- */}

                <View className="mt-4 rounded-[22px] bg-black/10 px-4 py-4">
                  <OperatorRow
                    label="Mobile"
                    value={
                      mobile
                    }
                  />

                  <OperatorRow
                    label="Vehicle"
                    value={
                      vehicleNo
                    }
                  />

                  <OperatorRow
                    label="ID"
                    value={
                      operatorId
                    }
                  />

                  <OperatorRow
                    label="Trader ID"
                    value={
                      traderId
                    }
                  />

                  <OperatorRow
                    label="Route"
                    value={
                      routeName
                    }
                    last
                  />
                </View>

                {operatorError ? (
                  <View className="mt-4 rounded-[18px] bg-amber-950/30 px-4 py-3">
                    <Text className="text-[12px] font-semibold leading-5 text-amber-100">
                      {
                        operatorError
                      }
                    </Text>
                  </View>
                ) : null}
              </>
            )}

            {/* ================================================= */}
            {/* STATS - EXISTING WILD API */}
            {/* ================================================= */}

            <View className="mt-5 flex-row gap-4">
              <StatCard
                label="My Total"
                value={
                  stats?.totalMyCrates ||
                  0
                }
                bgClass="bg-[#2d8cff]"
              />

              <StatCard
                label="Assigned"
                value={
                  stats?.assigned ||
                  0
                }
                bgClass="bg-[#12c48b]"
              />

              <StatCard
                label="Transit"
                value={
                  stats?.inTransit ||
                  0
                }
                bgClass="bg-[#f1ab19]"
              />
            </View>
          </View>

          {/* ================================================= */}
          {/* DATE */}
          {/* ================================================= */}

          <View className="bg-[#06152b] px-5 pb-4 pt-5">
            <Text className="mb-4 text-[18px] font-extrabold text-white">
              Select Date
            </Text>

            <Pressable
              onPress={() =>
                setShowDatePicker(
                  true
                )
              }
              className="rounded-[28px] border border-slate-800 bg-[#0b172b] px-5 py-5"
            >
              <View className="flex-row items-center">
                <View className="h-16 w-16 items-center justify-center rounded-2xl bg-[#14325a]">
                  <Ionicons
                    name="calendar-outline"
                    size={28}
                    color="#60a5fa"
                  />
                </View>

                <View className="ml-4 flex-1">
                  <Text className="text-[13px] font-bold text-slate-400">
                    Selected
                    Date
                  </Text>

                  <Text className="mt-1 text-[22px] font-extrabold text-white">
                    {formatDisplayDate(
                      activeDate
                    )}
                  </Text>

                  <Text className="mt-1 text-[13px] text-slate-400">
                    Tap to
                    change day,
                    month, and
                    year
                  </Text>
                </View>

                <View className="h-14 w-14 items-center justify-center rounded-full bg-[#14325a]">
                  <Ionicons
                    name="chevron-down"
                    size={24}
                    color="#bfdbfe"
                  />
                </View>
              </View>
            </Pressable>

            {/* DATE STATUS */}

            <View className="mt-4 rounded-[24px] border border-slate-800 bg-[#0b172b] px-5 py-4">
              <Text
                className={`text-[15px] font-extrabold ${
                  selectedIsToday
                    ? "text-[#22c55e]"
                    : "text-[#93c5fd]"
                }`}
              >
                {selectedIsToday
                  ? "Today selected. Scan, verify, and transit actions are enabled."
                  : `Showing transport data for ${formatDisplayDate(
                      activeDate
                    )}.`}
              </Text>
            </View>
          </View>

          {/* ================================================= */}
          {/* QUICK ACTIONS */}
          {/* ================================================= */}

          <View className="px-5 pt-6">
            <View className="gap-3">
              <QuickActionCard
                title="Assigned Crates"
                subtitle="View crates assigned to this transport"
                icon="clipboard-outline"
                onPress={() =>
                  router.push(
                    "/(transport)/assigned"
                  )
                }
              />

              <QuickActionCard
                title="Scan QR"
                subtitle="Verify crate belongs to you and move to transit"
                icon="scan-outline"
                onPress={() =>
                  router.push(
                    "/(transport)/scan"
                  )
                }
              />

              <QuickActionCard
                title="In Transit"
                subtitle="View crates already picked"
                icon="car-outline"
                onPress={() =>
                  router.push(
                    "/(transport)/in-transit"
                  )
                }
              />
            </View>

            {/* ================================================= */}
            {/* TODAY PREVIEW */}
            {/* ================================================= */}

            <Text className="mb-4 mt-8 text-[20px] font-extrabold text-white">
              Today Preview
            </Text>

            <View className="rounded-[24px] border border-slate-800 bg-[#0b172b] p-4">
              {/* ASSIGNED */}

              <Text className="text-[16px] font-bold text-white">
                Assigned Now:{" "}
                {assignedCrates?.length ||
                  0}
              </Text>

              <Text className="mt-2 text-[13px] text-slate-400">
                {assignedCrates?.length >
                0
                  ? assignedCrates
                      .map(
                        (
                          item: any
                        ) =>
                          item?.crateQr ||
                          item?.code ||
                          item?.crateId ||
                          item?.id
                      )
                      .join(", ")
                  : "No assigned crates for this date."}
              </Text>

              {/* IN TRANSIT */}

              <Text className="mt-5 text-[16px] font-bold text-white">
                In Transit
                Now:{" "}
                {inTransitCrates?.length ||
                  0}
              </Text>

              <Text className="mt-2 text-[13px] text-slate-400">
                {inTransitCrates?.length >
                0
                  ? inTransitCrates
                      .map(
                        (
                          item: any
                        ) =>
                          item?.crateQr ||
                          item?.code ||
                          item?.crateId ||
                          item?.id
                      )
                      .join(", ")
                  : "No crates in transit for this date."}
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* ================================================= */}
        {/* DATE PICKER */}
        {/* ================================================= */}

        {showDatePicker && (
          <Modal
            transparent
            animationType="fade"
            visible={
              showDatePicker
            }
            onRequestClose={() =>
              setShowDatePicker(
                false
              )
            }
          >
            <View className="flex-1 items-center justify-end bg-black/50 px-4 pb-6">
              <View className="w-full rounded-[28px] border border-slate-700 bg-[#0b172b] p-4">
                <View className="mb-3 flex-row items-center justify-between">
                  <Text className="text-[18px] font-extrabold text-white">
                    Select Date
                  </Text>

                  <Pressable
                    onPress={() =>
                      setShowDatePicker(
                        false
                      )
                    }
                  >
                    <Ionicons
                      name="close"
                      size={24}
                      color="#ffffff"
                    />
                  </Pressable>
                </View>

                <View className="rounded-[20px] bg-white">
                  <DateTimePicker
                    value={
                      activeDateObj
                    }
                    mode="date"
                    display="spinner"
                    onChange={
                      handleDateChange
                    }
                    maximumDate={
                      new Date(
                        2100,
                        11,
                        31
                      )
                    }
                    minimumDate={
                      new Date(
                        2024,
                        0,
                        1
                      )
                    }
                  />
                </View>

                <Pressable
                  onPress={() =>
                    setShowDatePicker(
                      false
                    )
                  }
                  className="mt-4 items-center rounded-[18px] bg-[#204a8f] py-3"
                >
                  <Text className="text-[15px] font-extrabold text-white">
                    Done
                  </Text>
                </Pressable>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </Screen>
  );
}

// ============================================================
// OPERATOR ROW
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

// ============================================================
// STAT CARD
// ============================================================

function StatCard({
  label,
  value,
  bgClass,
}: {
  label: string;

  value: number;

  bgClass: string;
}) {
  return (
    <View
      className={`min-h-[90px] flex-1 items-center justify-center rounded-[24px] ${bgClass}`}
    >
      <Text className="text-[24px] font-extrabold text-white">
        {value}
      </Text>

      <Text className="mt-1 text-[11px] font-bold text-white">
        {label}
      </Text>
    </View>
  );
}

// ============================================================
// QUICK ACTION CARD
// ============================================================

function QuickActionCard({
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
      className="flex-row items-center rounded-[22px] border border-slate-800 bg-[#0b172b] px-4 py-4"
    >
      <View className="h-14 w-14 items-center justify-center rounded-2xl bg-[#14325a]">
        <Ionicons
          name={icon}
          size={22}
          color="#60a5fa"
        />
      </View>

      <View className="ml-3 flex-1">
        <Text className="text-[17px] font-extrabold text-white">
          {title}
        </Text>

        <Text className="mt-1 text-[13px] text-slate-400">
          {subtitle}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={20}
        color="#94a3b8"
      />
    </Pressable>
  );
}