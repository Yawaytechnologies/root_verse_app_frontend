import React, { useEffect, useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";

import Screen from "../../src/components/centre/Screen";
import {
  fetchTransportDashboard,
  selectAssignedCrates,
  selectCurrentTransport,
  selectCurrentTransportOperator,
  selectInTransitCrates,
  selectTransportSelectedDate,
  selectTransportStats,
  fetchLoggedInTransportOperatorThunk,
  setSelectedTransportDate,
} from "../../src/services/transport/transportSlice";

import { logoutSession } from "../../src/store/auth/authSession.slice";
import { clearMe } from "../../src/store/auth/me.slice";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDateKey(dateKey?: string) {
  if (!dateKey) return new Date();
  const [y, m, d] = String(dateKey).split("-").map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

function isToday(dateKey?: string) {
  if (!dateKey) return false;
  return formatDateKey(new Date()) === dateKey;
}

function formatDisplayDate(dateKey: string) {
  const d = parseDateKey(dateKey);
  return d.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function firstText(...values: any[]) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value);
    }
  }
  return "";
}

export default function TransportDashboard() {
  const dispatch = useDispatch<any>();
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const currentTransport = useSelector(selectCurrentTransport);
  const currentTransportOperator = useSelector(selectCurrentTransportOperator);
  const selectedDate = useSelector(selectTransportSelectedDate);
  const assignedCrates = useSelector(selectAssignedCrates);
  const inTransitCrates = useSelector(selectInTransitCrates);
  const stats = useSelector(selectTransportStats);

  const meProfile = useSelector((state: any) => state?.me?.me || {});
  const authUser = useSelector((state: any) => state?.auth?.user || {});
  const loginUser = useSelector((state: any) => state?.login || {});

  useEffect(() => {
    if (!selectedDate) {
      dispatch(setSelectedTransportDate(formatDateKey(new Date())));
      return;
    }

    dispatch(fetchTransportDashboard({ date: selectedDate }));
  }, [dispatch, selectedDate]);

  useEffect(() => {
    dispatch(fetchLoggedInTransportOperatorThunk());
  }, [dispatch]);

  const activeDate = selectedDate || formatDateKey(new Date());
  const activeDateObj = useMemo(() => parseDateKey(activeDate), [activeDate]);
  const selectedIsToday = isToday(activeDate);

  const transportName =
    firstText(
      currentTransportOperator?.full_name,
      currentTransport?.name,
      currentTransport?.full_name,
      meProfile?.full_name,
      meProfile?.name,
      meProfile?.username,
      authUser?.full_name,
      authUser?.name,
      loginUser?.full_name,
      loginUser?.name
    ) || "Transport User";

  const transportCode =
    firstText(
      currentTransportOperator?.transport_id,
      currentTransportOperator?.user_id,
      currentTransport?.transport_id,
      currentTransport?.transportId,
      currentTransport?.id,
      meProfile?.transport_id,
      meProfile?.id,
      authUser?.transport_id,
      authUser?.id
    ) || "-";

  const vehicleNo =
    firstText(
      currentTransport?.vehicleNo,
      currentTransport?.vehicle_no,
      currentTransportOperator?.vehicleNo,
      currentTransportOperator?.vehicle_no,
      meProfile?.vehicleNo,
      meProfile?.vehicle_no,
      authUser?.vehicleNo,
      authUser?.vehicle_no
    ) || "-";

  const routeName =
    firstText(
      currentTransport?.route,
      currentTransport?.routeName,
      currentTransport?.route_name,
      currentTransportOperator?.route_name,
      currentTransportOperator?.routeName,
      meProfile?.route,
      meProfile?.routeName,
      meProfile?.route_name
    ) || "-";

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            setLogoutLoading(true);
            await dispatch(logoutSession()).unwrap();
            dispatch(clearMe());
            router.replace("/(auth)/login");
          } finally {
            setLogoutLoading(false);
          }
        },
      },
    ]);
  };

  const handleDateChange = (_: any, date?: Date) => {
    setShowDatePicker(false);
    if (!date) return;

    const nextDate = formatDateKey(date);
    dispatch(setSelectedTransportDate(nextDate));
  };

  return (
    <Screen>
      <View className="flex-1 bg-[#031225]">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
        >
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
                    Transport Dashboard
                  </Text>
                  <Text className="mt-1 text-[15px] font-semibold text-slate-400">
                    Pickup & Transit Control
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={handleLogout}
                disabled={logoutLoading}
                className="rounded-[16px] border border-red-400 bg-red-500/15 px-4 py-3"
              >
                <Text className="text-[13px] font-extrabold text-red-300">
                  {logoutLoading ? "Logging out..." : "Logout"}
                </Text>
              </Pressable>
            </View>
          </View>

          <View className="bg-[#16b8b2] px-5 py-6">
            <Text className="text-[28px] font-extrabold text-white">
              {transportName}
            </Text>
            <Text className="mt-2 text-[15px] font-bold text-white/90">
              Vehicle: {vehicleNo}
            </Text>
            <Text className="mt-1 text-[15px] font-bold text-white/90">
              ID: {transportCode}
            </Text>
            <Text className="mt-1 text-[14px] font-semibold text-white/90">
              Route: {routeName}
            </Text>

            <View className="mt-5 flex-row gap-4">
              <StatCard
                label="My Total"
                value={stats?.totalMyCrates || 0}
                bgClass="bg-[#2d8cff]"
              />
              <StatCard
                label="Assigned"
                value={stats?.assigned || 0}
                bgClass="bg-[#12c48b]"
              />
              <StatCard
                label="Transit"
                value={stats?.inTransit || 0}
                bgClass="bg-[#f1ab19]"
              />
            </View>
          </View>

          <View className="bg-[#06152b] px-5 pb-4 pt-5">
            <Text className="mb-4 text-[18px] font-extrabold text-white">
              Select Date
            </Text>

            <Pressable
              onPress={() => setShowDatePicker(true)}
              className="rounded-[28px] border border-slate-800 bg-[#0b172b] px-5 py-5"
            >
              <View className="flex-row items-center">
                <View className="h-16 w-16 items-center justify-center rounded-2xl bg-[#14325a]">
                  <Ionicons name="calendar-outline" size={28} color="#60a5fa" />
                </View>

                <View className="ml-4 flex-1">
                  <Text className="text-[13px] font-bold text-slate-400">
                    Selected Date
                  </Text>
                  <Text className="mt-1 text-[22px] font-extrabold text-white">
                    {formatDisplayDate(activeDate)}
                  </Text>
                  <Text className="mt-1 text-[13px] text-slate-400">
                    Tap to change day, month, and year
                  </Text>
                </View>

                <View className="h-14 w-14 items-center justify-center rounded-full bg-[#14325a]">
                  <Ionicons name="chevron-down" size={24} color="#bfdbfe" />
                </View>
              </View>
            </Pressable>

            <View className="mt-4 rounded-[24px] border border-slate-800 bg-[#0b172b] px-5 py-4">
              <Text
                className={`text-[15px] font-extrabold ${
                  selectedIsToday ? "text-[#22c55e]" : "text-[#93c5fd]"
                }`}
              >
                {selectedIsToday
                  ? "Today selected. Scan, verify, and transit actions are enabled."
                  : `Showing transport data for ${formatDisplayDate(activeDate)}.`}
              </Text>
            </View>
          </View>

          <View className="px-5 pt-6">
            <View className="gap-3">
              <QuickActionCard
                title="Assigned Crates"
                subtitle="View crates assigned to this transport"
                icon="clipboard-outline"
                onPress={() => router.push("/(transport)/assigned")}
              />
              <QuickActionCard
                title="Scan QR"
                subtitle="Verify crate belongs to you and move to transit"
                icon="scan-outline"
                onPress={() => router.push("/(transport)/scan")}
              />
              <QuickActionCard
                title="In Transit"
                subtitle="View crates already picked"
                icon="car-outline"
                onPress={() => router.push("/(transport)/in-transit")}
              />
            </View>

            <Text className="mb-4 mt-8 text-[20px] font-extrabold text-white">
              Today Preview
            </Text>

            <View className="rounded-[24px] border border-slate-800 bg-[#0b172b] p-4">
              <Text className="text-[16px] font-bold text-white">
                Assigned Now: {assignedCrates?.length || 0}
              </Text>
              <Text className="mt-2 text-[13px] text-slate-400">
                {assignedCrates?.length > 0
                  ? assignedCrates
                      .map(
                        (item: any) =>
                          item?.crateQr ||
                          item?.code ||
                          item?.crateId ||
                          item?.id
                      )
                      .join(", ")
                  : "No assigned crates for this date."}
              </Text>

              <Text className="mt-5 text-[16px] font-bold text-white">
                In Transit Now: {inTransitCrates?.length || 0}
              </Text>
              <Text className="mt-2 text-[13px] text-slate-400">
                {inTransitCrates?.length > 0
                  ? inTransitCrates
                      .map(
                        (item: any) =>
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

        {showDatePicker && (
          <Modal transparent animationType="fade" visible={showDatePicker}>
            <View className="flex-1 items-center justify-end bg-black/50 px-4 pb-6">
              <View className="w-full rounded-[28px] border border-slate-700 bg-[#0b172b] p-4">
                <View className="mb-3 flex-row items-center justify-between">
                  <Text className="text-[18px] font-extrabold text-white">
                    Select Date
                  </Text>

                  <Pressable onPress={() => setShowDatePicker(false)}>
                    <Ionicons name="close" size={24} color="#fff" />
                  </Pressable>
                </View>

                <View className="rounded-[20px] bg-white">
                  <DateTimePicker
                    value={activeDateObj}
                    mode="date"
                    display="spinner"
                    onChange={handleDateChange}
                    maximumDate={new Date(2100, 11, 31)}
                    minimumDate={new Date(2024, 0, 1)}
                  />
                </View>

                <Pressable
                  onPress={() => setShowDatePicker(false)}
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
      <Text className="text-[24px] font-extrabold text-white">{value}</Text>
      <Text className="mt-1 text-[11px] font-bold text-white">{label}</Text>
    </View>
  );
}

function QuickActionCard({
  title,
  subtitle,
  icon,
  onPress,
}: {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center rounded-[22px] border border-slate-800 bg-[#0b172b] px-4 py-4"
    >
      <View className="h-14 w-14 items-center justify-center rounded-2xl bg-[#14325a]">
        <Ionicons name={icon} size={22} color="#60a5fa" />
      </View>

      <View className="ml-3 flex-1">
        <Text className="text-[17px] font-extrabold text-white">{title}</Text>
        <Text className="mt-1 text-[13px] text-slate-400">{subtitle}</Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
    </Pressable>
  );
}