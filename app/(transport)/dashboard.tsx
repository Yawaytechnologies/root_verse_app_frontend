import React, { useEffect } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";

import Screen from "../../src/components/centre/Screen";
import {
  formatDisplayDate,
  formatShortDay,
  getLastNDays,
} from "../../src/data/transport/dummyTransportData";
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

export default function TransportDashboard() {
  const dispatch = useDispatch<any>();
  const [logoutLoading, setLogoutLoading] = React.useState(false);

  const currentTransport = useSelector(selectCurrentTransport);
  const currentTransportOperator = useSelector(selectCurrentTransportOperator);
  const selectedDate = useSelector(selectTransportSelectedDate);
  const assignedCrates = useSelector(selectAssignedCrates);
  const inTransitCrates = useSelector(selectInTransitCrates);
  const stats = useSelector(selectTransportStats);
  useEffect(() => {
    if (!selectedDate) {
      const today = getLastNDays(1)[0];
      dispatch(setSelectedTransportDate(today));
      return;
    }

    dispatch(fetchTransportDashboard({ date: selectedDate }));
  }, [dispatch, selectedDate]);

  useEffect(() => {
    dispatch(fetchLoggedInTransportOperatorThunk());
  }, [dispatch]);

  const last4Days = getLastNDays(4);
  const activeDate = selectedDate || last4Days[0];

  const transportName =
    currentTransportOperator?.full_name ||
    currentTransport?.name ||
    "Transport User";

  const transportCode =
    currentTransportOperator?.user_id || currentTransport?.id || "-";

  const vehicleNo =
    currentTransport?.vehicleNo ||
    currentTransport?.vehicle_no ||
    currentTransportOperator?.vehicleNo ||
    currentTransportOperator?.vehicle_no ||
    "-";

  const routeName =
    currentTransport?.route ||
    currentTransport?.routeName ||
    currentTransport?.route_name ||
    currentTransportOperator?.route_name ||
    currentTransportOperator?.routeName ||
    "-";

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

  return (
    <Screen>
      <View className="flex-1 bg-[#031225]">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          <View className="bg-[#071a35] px-5 pt-4 pb-6">
            <View className="flex-row items-start justify-between">
              <View className="flex-row items-center flex-1 pr-3">
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

          <View className="bg-[#06152b] px-5 pt-5 pb-4">
            <Text className="mb-3 text-[18px] font-extrabold text-white">
              Select Date
            </Text>

            <View className="flex-row gap-3">
              {last4Days.map((dateKey) => {
                const active = dateKey === activeDate;
                return (
                  <Pressable
                    key={dateKey}
                    onPress={() => dispatch(setSelectedTransportDate(dateKey))}
                    className={`flex-1 rounded-[18px] border px-3 py-3 ${
                      active
                        ? "border-[#2d8cff] bg-[#14325a]"
                        : "border-slate-700 bg-[#0b172b]"
                    }`}
                  >
                    <Text
                      className={`text-center text-[11px] font-semibold ${
                        active ? "text-[#93c5fd]" : "text-slate-400"
                      }`}
                    >
                      {formatShortDay(dateKey)}
                    </Text>
                    <Text
                      className={`mt-1 text-center text-[14px] font-extrabold ${
                        active ? "text-white" : "text-slate-200"
                      }`}
                    >
                      {dateKey.split("-")[2]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text className="mt-3 text-[14px] font-bold text-slate-300">
              Selected: {formatDisplayDate(activeDate)}
            </Text>
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

            <Text className="mt-8 mb-4 text-[20px] font-extrabold text-white">
              Today Preview
            </Text>

            <View className="rounded-[24px] border border-slate-800 bg-[#0b172b] p-4">
              <Text className="text-[16px] font-bold text-white">
                Assigned Now: {assignedCrates?.length || 0}
              </Text>
              <Text className="mt-2 text-[13px] text-slate-400">
                {assignedCrates?.length > 0
                  ? assignedCrates.map((item: any) => item.id).join(", ")
                  : "No assigned crates for this date."}
              </Text>

              <Text className="mt-5 text-[16px] font-bold text-white">
                In Transit Now: {inTransitCrates?.length || 0}
              </Text>
              <Text className="mt-2 text-[13px] text-slate-400">
                {inTransitCrates?.length > 0
                  ? inTransitCrates.map((item: any) => item.id).join(", ")
                  : "No crates in transit for this date."}
              </Text>
            </View>
          </View>
        </ScrollView>
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
    <View className={`flex-1 min-h-[90px] items-center justify-center rounded-[24px] ${bgClass}`}>
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
