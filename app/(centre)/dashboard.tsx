import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import {
  Feather,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";

import Screen from "../../src/components/centre/Screen";
import { useAppDispatch, useAppSelector } from "../../src/store/hooks";
import {
  fetchCentreDashboardThunk,
  fetchCentreCratesThunk,
  fetchLoggedInCollectionOperatorThunk,
  getCrateByIdThunk,
  selectCentreCrateError,
  selectCentreCrates,
  selectCentreCrateStatus,
  selectCentreDashboard,
  selectCurrentCollectionOperator,
} from "../../src/services/centre/centreCrate.slice";
import { ApiCrate } from "../../src/services/centre/centreCrate.service";
import { logoutSession } from "../../src/store/auth/authSession.slice";
import { clearMe } from "../../src/store/auth/me.slice";

type CentreTabKey = "scan" | "received" | "assign";
type RecordStatus = "received" | "assigned" | "pending";

type CalendarDay = {
  key: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isFuture: boolean;
};

type CrateRecord = {
  id: string;
  crateId: string | number;
  source: string;
  status: RecordStatus;
  date: string;
  rawStatus?: string;
  custody?: string;
  assignedTo?: string;
  assignedLabel?: string;
  driverName?: string;
  vehicleNo?: string;
  transportOperatorId?: string;
  transportId?: string;
  notes?: string;
  assignedAt?: string;
  temperature?: string;
  raw?: ApiCrate;
};

export default function CentreDashboard() {
  const dispatch = useAppDispatch();

  const status = useAppSelector(selectCentreCrateStatus);
  const error = useAppSelector(selectCentreCrateError);
  const dashboard = useAppSelector(selectCentreDashboard);
  const crates = useAppSelector(selectCentreCrates);
  const currentCollectionOperator = useAppSelector(
    selectCurrentCollectionOperator
  );

  const [activeTab, setActiveTab] = useState<CentreTabKey>("scan");
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [recordLoading, setRecordLoading] = useState(false);

  const today = useMemo(() => formatDateKey(new Date()), []);
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const [selectedRecord, setSelectedRecord] = useState<ApiCrate | CrateRecord | null>(
    null
  );
  const [recordViewOpen, setRecordViewOpen] = useState(false);

  const initialMonth = useMemo(() => {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth(),
    };
  }, []);

  const [calendarMonth, setCalendarMonth] = useState(initialMonth);

  useEffect(() => {
    dispatch(fetchLoggedInCollectionOperatorThunk());
    dispatch(fetchCentreDashboardThunk());
    dispatch(fetchCentreCratesThunk());
  }, [dispatch]);

  const handleRefresh = async () => {
    await Promise.all([
      dispatch(fetchLoggedInCollectionOperatorThunk()),
      dispatch(fetchCentreDashboardThunk()),
      dispatch(fetchCentreCratesThunk()),
    ]);
  };

  const handleLogout = () => {
    if (logoutLoading) return;

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

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 5;

    return Array.from(
      { length: currentYear - startYear + 1 },
      (_, index) => currentYear - index
    );
  }, []);

  const mappedCrates = useMemo<CrateRecord[]>(() => {
    return (crates || []).map((item: any, index: number) => {
      const normalizedStatus = mapStatus(item);

      const createdAt =
        pickBestDate(item, normalizedStatus) ||
        item?.scheduled_time_utc ||
        item?.dispatchScheduledAt ||
        item?.dispatch_scheduled_at ||
        item?.assignedAt ||
        item?.assigned_at ||
        item?.receivedAt ||
        item?.received_at ||
        item?.updatedAt ||
        item?.updated_at ||
        item?.createdAt ||
        item?.created_at;

      const date = normalizeToDateKey(createdAt) || today;

      const rawStatus = String(
        item?.status || item?.crate_status || item?.dispatch_status || ""
      ).toUpperCase();

      const temperature =
        item?.latestTemperature ??
        item?.temperature_value ??
        item?.temperature ??
        item?.temperature_c ??
        item?.temperature_logs?.[item?.temperature_logs?.length - 1]
          ?.temperature_value ??
        item?.temperatureLogs?.[item?.temperatureLogs?.length - 1]
          ?.temperature_value ??
        "-";

      return {
        id: String(
          item?.crateCode ||
            item?.crate_code ||
            item?.code ||
            item?.id ||
            item?.crateId ||
            item?.crate_id ||
            `CRATE-${index + 1}`
        ),
        crateId:
          item?.crateId ?? item?.crate_id ?? item?.id ?? `CRATE-${index + 1}`,
        source: buildSourceLabel(item, normalizedStatus),
        status: normalizedStatus,
        date,
        rawStatus,
        custody: item?.custody ?? item?.custody_status,
        assignedTo:
          item?.assignedTo ||
          item?.assigned_to ||
          item?.destinationName ||
          item?.destination_name ||
          item?.assigned_to_label ||
          item?.assignedToLabel ||
          (item?.destinationId || item?.destination_id
            ? `Destination ${item?.destinationId || item?.destination_id}`
            : undefined),
        assignedLabel: item?.assigned_to_label || item?.assignedToLabel,
        driverName: item?.driverName || item?.driver_name,
        vehicleNo: item?.vehicleNo || item?.vehicle_no,
        transportOperatorId: String(
          item?.assignedTransportOperatorId ||
            item?.assigned_transport_operator_id ||
            item?.transport_operator_id ||
            "-"
        ),
        transportId: String(item?.transportId || item?.transport_id || "-"),
        notes: item?.notes || item?.remark || item?.remarks,
        assignedAt:
          item?.scheduled_time_utc ||
          item?.assignedAt ||
          item?.assigned_at ||
          item?.dispatchScheduledAt ||
          item?.dispatch_scheduled_at ||
          item?.updatedAt ||
          item?.updated_at,
        temperature: String(temperature ?? "-"),
        raw: item,
      };
    });
  }, [crates, today]);

  const selectedRecords = useMemo(() => {
    return mappedCrates.filter((item) => item.date === selectedDate);
  }, [mappedCrates, selectedDate]);

  const receivedList = useMemo(() => {
    return selectedRecords.filter((item) => item.status === "received");
  }, [selectedRecords]);

  const assignedList = useMemo(() => {
    return selectedRecords.filter((item) => item.status === "assigned");
  }, [selectedRecords]);

  const pendingList = useMemo(() => {
    return selectedRecords.filter((item) => item.status === "pending");
  }, [selectedRecords]);

  const apiStats = useMemo(() => {
    const raw = dashboard || {};

    return {
      total:
        numberOrNull(
          raw?.totalCrates ??
            raw?.total_crates ??
            raw?.total ??
            raw?.crateCount ??
            raw?.crate_count
        ) ?? null,
      received:
        numberOrNull(
          raw?.receivedCrates ??
            raw?.received_crates ??
            raw?.received ??
            raw?.receivedCount ??
            raw?.received_count
        ) ?? null,
      assigned:
        numberOrNull(
          raw?.assignedCrates ??
            raw?.assigned_crates ??
            raw?.assigned ??
            raw?.assignedCount ??
            raw?.assigned_count ??
            raw?.scheduledCount ??
            raw?.scheduled_count
        ) ?? null,
      pending:
        numberOrNull(
          raw?.pendingCrates ??
            raw?.pending_crates ??
            raw?.pending ??
            raw?.pendingCount ??
            raw?.pending_count
        ) ?? null,
    };
  }, [dashboard]);

  const stats = useMemo(() => {
    const local = {
      total: selectedRecords.length,
      received: receivedList.length,
      assigned: assignedList.length,
      pending: pendingList.length,
    };

    if (selectedDate === today) {
      return {
        total: apiStats.total ?? local.total,
        received: apiStats.received ?? local.received,
        assigned: apiStats.assigned ?? local.assigned,
        pending: apiStats.pending ?? local.pending,
      };
    }

    return local;
  }, [
    apiStats,
    assignedList.length,
    pendingList.length,
    receivedList.length,
    selectedDate,
    selectedRecords.length,
    today,
  ]);

  const isTodaySelected = selectedDate === today;

  const calendarDays = useMemo(() => {
    return getCalendarDays(calendarMonth.year, calendarMonth.month, today);
  }, [calendarMonth, today]);

  const canGoNextMonth = useMemo(() => {
    const now = new Date();
    return !(
      calendarMonth.year === now.getFullYear() &&
      calendarMonth.month === now.getMonth()
    );
  }, [calendarMonth]);

  const loading = status === "loading";

  const openCalendar = () => {
    const [y, m] = selectedDate.split("-").map(Number);
    setCalendarMonth({ year: y, month: m - 1 });
    setCalendarOpen(true);
  };

  const goPrevMonth = () => {
    setCalendarMonth((prev) => {
      if (prev.month === 0) {
        return { year: prev.year - 1, month: 11 };
      }
      return { year: prev.year, month: prev.month - 1 };
    });
  };

  const goNextMonth = () => {
    if (!canGoNextMonth) return;

    setCalendarMonth((prev) => {
      if (prev.month === 11) {
        return { year: prev.year + 1, month: 0 };
      }
      return { year: prev.year, month: prev.month + 1 };
    });
  };

  const handleSelectYear = (year: number) => {
    const now = new Date();

    setCalendarMonth((prev) => {
      const nextMonth =
        year === now.getFullYear() && prev.month > now.getMonth()
          ? now.getMonth()
          : prev.month;

      return {
        year,
        month: nextMonth,
      };
    });
  };

  const handleSelectDate = (dateKey: string, isFuture: boolean) => {
    if (isFuture) return;
    setSelectedDate(dateKey);
    setCalendarOpen(false);
  };

  const handleOpenRecordView = async (record: CrateRecord) => {
    try {
      setRecordLoading(true);

      const fresh = await dispatch(getCrateByIdThunk(record.crateId)).unwrap();

      setSelectedRecord({
        ...record,
        ...fresh,
      });
      setRecordViewOpen(true);
    } catch {
      setSelectedRecord(record);
      setRecordViewOpen(true);
    } finally {
      setRecordLoading(false);
    }
  };

  const handleCloseRecordView = () => {
    setRecordViewOpen(false);
    setSelectedRecord(null);
  };

  const centreName =
    dashboard?.centreName ||
    dashboard?.centre_name ||
    dashboard?.name ||
    "Collection Centre";

  const operatorName =
    currentCollectionOperator?.full_name ||
    dashboard?.operatorName ||
    dashboard?.operator_name ||
    dashboard?.userName ||
    dashboard?.user_name ||
    dashboard?.name ||
    "Operator";

  const operatorRole =
    currentCollectionOperator?.designation ||
    currentCollectionOperator?.role ||
    dashboard?.role ||
    dashboard?.designation ||
    "Centre Operator";

  const operatorLocation =
    dashboard?.location ||
    dashboard?.centreLocation ||
    dashboard?.centre_location ||
    "Location unavailable";

  const operatorCode =
    currentCollectionOperator?.user_id ||
    dashboard?.operatorCode ||
    dashboard?.operator_code ||
    dashboard?.centreCode ||
    dashboard?.centre_code ||
    "-";

  return (
    <Screen>
      <View className="flex-1 bg-[#031225]">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={handleRefresh} />
          }
        >
          <View className="bg-[#071a35] px-5 pt-4 pb-6">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 flex-row items-center pr-3">
                <View className="h-16 w-16 items-center justify-center rounded-2xl border border-[#1e90ff] bg-[#0d274a]">
                  <MaterialCommunityIcons
                    name="warehouse"
                    size={30}
                    color="#ffffff"
                  />
                </View>

                <View className="ml-3 flex-1">
                  <Text className="text-[24px] font-extrabold text-white">
                    {centreName}
                  </Text>
                  <Text className="mt-1 text-[15px] font-semibold text-slate-400">
                    Operator Dashboard
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={handleLogout}
                disabled={logoutLoading}
                className="flex-row items-center rounded-2xl border border-slate-700 bg-[#102544] px-4 py-3"
              >
                <Feather name="log-out" size={18} color="#fff" />
                <Text className="ml-2 text-[15px] font-bold text-white">
                  {logoutLoading ? "Logging out..." : "Logout"}
                </Text>
              </Pressable>
            </View>
          </View>

          <View className="flex-row bg-[#16b8b2] px-5 py-6">
            <View className="flex-1 pr-4">
              <Text className="text-[30px] font-extrabold text-white">
                {operatorName}
              </Text>

              <Text className="mt-3 text-[15px] font-bold leading-7 text-white/90">
                {operatorRole}
                {"\n"}• {operatorLocation}
              </Text>

              <Text className="mt-3 text-[16px] font-extrabold text-white/95">
                ID: {operatorCode}
              </Text>

              <View className="mt-4 flex-row items-center">
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color="#ffffff"
                />
                <Text className="ml-2 text-[15px] font-bold text-white/95">
                  {formatDisplayDate(selectedDate)}
                </Text>
              </View>
            </View>

            <View className="w-[160px] gap-4">
              <View className="flex-row gap-4">
                <StatCard
                  label="Total"
                  value={stats.total}
                  bgClass="bg-[#2d8cff]"
                />
                <StatCard
                  label="Received"
                  value={stats.received}
                  bgClass="bg-[#12c48b]"
                />
              </View>

              <View className="flex-row gap-4">
                <StatCard
                  label="Assign"
                  value={stats.assigned}
                  bgClass="bg-[#f1ab19]"
                />
                <StatCard
                  label="Pending"
                  value={stats.pending}
                  bgClass="bg-[#ef5a67]"
                />
              </View>
            </View>
          </View>

          <View className="bg-[#06152b] px-5 pt-5 pb-3">
            <Text className="mb-3 text-[18px] font-extrabold text-white">
              Select Date
            </Text>

            <Pressable
              onPress={openCalendar}
              className="flex-row items-center rounded-[22px] border border-slate-700 bg-[#0b172b] px-4 py-4"
            >
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-[#14325a]">
                <Ionicons name="calendar-outline" size={22} color="#60a5fa" />
              </View>

              <View className="ml-3 flex-1">
                <Text className="text-[12px] font-semibold text-slate-400">
                  Selected Date
                </Text>
                <Text className="mt-1 text-[18px] font-extrabold text-white">
                  {formatDisplayDate(selectedDate)}
                </Text>
                <Text className="mt-1 text-[12px] text-slate-500">
                  Tap to change day, month, and year
                </Text>
              </View>

              <View className="h-10 w-10 items-center justify-center rounded-full bg-[#102544]">
                <Ionicons name="chevron-down" size={20} color="#cbd5e1" />
              </View>
            </Pressable>

            <View className="mt-3 rounded-2xl border border-slate-800 bg-[#0b172b] px-4 py-3">
              {isTodaySelected ? (
                <Text className="text-[14px] font-bold text-[#12c48b]">
                  Today selected. Receive, log temp, and assign are enabled.
                </Text>
              ) : (
                <Text className="text-[14px] font-bold text-[#f1ab19]">
                  Past date selected. View only mode.
                </Text>
              )}
            </View>

            {!!error && (
              <View className="mt-3 rounded-2xl border border-red-800 bg-red-950/30 px-4 py-3">
                <Text className="text-[14px] font-bold text-red-300">
                  {error}
                </Text>
              </View>
            )}
          </View>

          <View className="border-t border-slate-800 bg-[#06152b]">
            <View className="flex-row items-center px-2">
              <TabButton
                label="Scan"
                icon={
                  <Ionicons
                    name="scan-outline"
                    size={20}
                    color={activeTab === "scan" ? "#2d8cff" : "#94a3b8"}
                  />
                }
                active={activeTab === "scan"}
                onPress={() => setActiveTab("scan")}
              />

              <TabButton
                label="Received"
                icon={
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={20}
                    color={activeTab === "received" ? "#2d8cff" : "#94a3b8"}
                  />
                }
                active={activeTab === "received"}
                onPress={() => setActiveTab("received")}
              />

              <TabButton
                label="Assign"
                icon={
                  <MaterialCommunityIcons
                    name="truck-delivery-outline"
                    size={20}
                    color={activeTab === "assign" ? "#2d8cff" : "#94a3b8"}
                  />
                }
                active={activeTab === "assign"}
                onPress={() => setActiveTab("assign")}
              />
            </View>
          </View>

          <View className="px-5 pt-6">
            {loading && mappedCrates.length === 0 ? (
              <View className="items-center justify-center rounded-[24px] border border-slate-800 bg-[#0b172b] py-10">
                <ActivityIndicator size="large" color="#2d8cff" />
                <Text className="mt-4 text-[14px] font-semibold text-slate-400">
                  Loading collection centre dashboard...
                </Text>
              </View>
            ) : null}

            {recordLoading && (
              <View className="mb-4 items-center justify-center rounded-[22px] border border-slate-800 bg-[#0b172b] px-4 py-4">
                <ActivityIndicator size="small" color="#2d8cff" />
                <Text className="mt-2 text-[13px] font-semibold text-slate-400">
                  Loading crate details...
                </Text>
              </View>
            )}

            {activeTab === "scan" && (
              <View>
                <Text className="mb-5 text-[22px] font-extrabold text-white">
                  Centre Operations
                </Text>

                <View className="rounded-[28px] border border-slate-800 bg-[#0b172b] p-4">
                  <Text className="mb-2 text-[17px] font-bold text-slate-200">
                    {isTodaySelected
                      ? "Run crate receive flow"
                      : "Past date records cannot be changed"}
                  </Text>

                  <Text className="mb-5 text-[14px] text-slate-400">
                    {isTodaySelected
                      ? "Step 1 Receive → Step 2 Temperature → Step 3 Assign transport"
                      : `Showing view-only records for ${formatDisplayDate(
                          selectedDate
                        )}.`}
                  </Text>

                  <View className="gap-3">
                    <ActionButton
                      title="Receive Crate"
                      icon="download-outline"
                      disabled={!isTodaySelected}
                      onPress={() => router.push("/(centre)/receive")}
                    />
                    <ActionButton
                      title="Log Temperature"
                      icon="thermometer-outline"
                      disabled={!isTodaySelected}
                      onPress={() => router.push("/(centre)/temp-log")}
                    />
                    <ActionButton
                      title="Assign Dispatch"
                      icon="car-outline"
                      disabled={!isTodaySelected}
                      onPress={() => router.push("/(centre)/assign")}
                    />
                  </View>
                </View>
              </View>
            )}

            {activeTab === "received" && (
              <View>
                <Text className="mb-5 text-[22px] font-extrabold text-white">
                  Received Crates - {formatDisplayDate(selectedDate)}
                </Text>

                {receivedList.length === 0 ? (
                  <EmptyState text="No received crates for this date." />
                ) : (
                  <View className="gap-3">
                    {receivedList.map((item) => (
                      <ListCard
                        key={`${item.crateId}-${item.id}`}
                        title={item.id}
                        subtitle={`${item.source}${
                          item.temperature && item.temperature !== "-"
                            ? ` • Temp ${item.temperature}°C`
                            : ""
                        }`}
                        rightText="View"
                        rightColor="#12c48b"
                        onPress={() => handleOpenRecordView(item)}
                      />
                    ))}
                  </View>
                )}
              </View>
            )}

            {activeTab === "assign" && (
              <View>
                <Text className="mb-5 text-[22px] font-extrabold text-white">
                  Assigned Dispatch - {formatDisplayDate(selectedDate)}
                </Text>

                {assignedList.length === 0 ? (
                  <EmptyState text="No assigned crates for this date." />
                ) : (
                  <View className="gap-3">
                    {assignedList.map((item) => (
                      <ListCard
                        key={`${item.crateId}-${item.id}`}
                        title={item.id}
                        subtitle={
                          item.assignedTo
                            ? `Assigned to ${item.assignedTo}`
                            : item.source
                        }
                        rightText="View"
                        rightColor="#2d8cff"
                        onPress={() => handleOpenRecordView(item)}
                      />
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        </ScrollView>

        <CalendarModal
          visible={calendarOpen}
          onClose={() => setCalendarOpen(false)}
          month={calendarMonth.month}
          year={calendarMonth.year}
          yearOptions={yearOptions}
          days={calendarDays}
          selectedDate={selectedDate}
          onPrevMonth={goPrevMonth}
          onNextMonth={goNextMonth}
          canGoNextMonth={canGoNextMonth}
          onSelectYear={handleSelectYear}
          onSelectDate={handleSelectDate}
        />

        <RecordViewModal
          visible={recordViewOpen}
          onClose={handleCloseRecordView}
          record={selectedRecord}
        />
      </View>
    </Screen>
  );
}

function CalendarModal({
  visible,
  onClose,
  month,
  year,
  yearOptions,
  days,
  selectedDate,
  onPrevMonth,
  onNextMonth,
  canGoNextMonth,
  onSelectYear,
  onSelectDate,
}: {
  visible: boolean;
  onClose: () => void;
  month: number;
  year: number;
  yearOptions: number[];
  days: CalendarDay[];
  selectedDate: string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  canGoNextMonth: boolean;
  onSelectYear: (year: number) => void;
  onSelectDate: (dateKey: string, isFuture: boolean) => void;
}) {
  const weekLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/60">
        <View className="min-h-[560px] rounded-t-[30px] bg-[#071a35] px-5 pt-5 pb-8">
          <View className="mb-5 flex-row items-center justify-between">
            <Text className="text-[20px] font-extrabold text-white">
              Select Date
            </Text>

            <Pressable
              onPress={onClose}
              className="h-10 w-10 items-center justify-center rounded-full bg-[#102544]"
            >
              <Ionicons name="close" size={20} color="#fff" />
            </Pressable>
          </View>

          <View className="rounded-[24px] border border-slate-700 bg-[#0b172b] p-4">
            <Text className="mb-3 text-[13px] font-semibold text-slate-300">
              Select Year
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 6 }}
              className="mb-5"
            >
              <View className="flex-row gap-2">
                {yearOptions.map((itemYear) => {
                  const isSelectedYear = itemYear === year;

                  return (
                    <Pressable
                      key={itemYear}
                      onPress={() => onSelectYear(itemYear)}
                      className={`rounded-2xl border px-4 py-2 ${
                        isSelectedYear
                          ? "border-[#2d8cff] bg-[#2d8cff]"
                          : "border-slate-700 bg-[#102544]"
                      }`}
                    >
                      <Text
                        className={`font-extrabold ${
                          isSelectedYear ? "text-white" : "text-slate-300"
                        }`}
                      >
                        {itemYear}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            <View className="mb-5 flex-row items-center justify-between">
              <Pressable
                onPress={onPrevMonth}
                className="h-11 w-11 items-center justify-center rounded-2xl bg-[#102544]"
              >
                <Ionicons name="chevron-back" size={20} color="#fff" />
              </Pressable>

              <Text className="text-[18px] font-extrabold text-white">
                {getMonthLabel(year, month)}
              </Text>

              <Pressable
                onPress={onNextMonth}
                disabled={!canGoNextMonth}
                className={`h-11 w-11 items-center justify-center rounded-2xl ${
                  canGoNextMonth ? "bg-[#102544]" : "bg-slate-800"
                }`}
              >
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={canGoNextMonth ? "#fff" : "#64748b"}
                />
              </Pressable>
            </View>

            <View className="mb-3 flex-row justify-between">
              {weekLabels.map((label) => (
                <View key={label} className="w-[13.5%] items-center">
                  <Text className="text-[12px] font-bold text-slate-400">
                    {label}
                  </Text>
                </View>
              ))}
            </View>

            <View className="flex-row flex-wrap justify-between">
              {days.map((day, index) => {
                const isSelected = day.key === selectedDate;
                const isBlank = !day.isCurrentMonth;
                const disabled = isBlank || day.isFuture;

                return (
                  <Pressable
                    key={`${day.key}-${index}`}
                    onPress={() =>
                      onSelectDate(day.key, day.isFuture || !day.isCurrentMonth)
                    }
                    disabled={disabled}
                    className={`mb-3 aspect-square w-[13.5%] items-center justify-center rounded-2xl ${
                      isSelected
                        ? "bg-[#2d8cff]"
                        : isBlank
                        ? "bg-transparent"
                        : disabled
                        ? "bg-[#0f1d33]"
                        : "bg-[#102544]"
                    }`}
                  >
                    <Text
                      className={`text-[14px] font-extrabold ${
                        isSelected
                          ? "text-white"
                          : isBlank
                          ? "text-transparent"
                          : day.isFuture
                          ? "text-slate-600"
                          : "text-white"
                      }`}
                    >
                      {isBlank ? "" : day.dayNumber}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function RecordViewModal({
  visible,
  onClose,
  record,
}: {
  visible: boolean;
  onClose: () => void;
  record: any;
}) {
  if (!record) return null;

  const status = mapStatus(record);

  const statusColor =
    status === "received"
      ? "#12c48b"
      : status === "assigned"
      ? "#2d8cff"
      : "#ef5a67";

  const statusText =
    status === "received"
      ? "Received"
      : status === "assigned"
      ? "Assigned"
      : "Pending";

  const displayDate =
    normalizeToDateKey(
      record?.assignedAt ||
        record?.assigned_at ||
        record?.scheduled_time_utc ||
        record?.receivedAt ||
        record?.received_at ||
        record?.updatedAt ||
        record?.updated_at ||
        record?.createdAt ||
        record?.created_at
    ) || record?.date;

  const temperature =
    record?.latestTemperature ??
    record?.temperature_value ??
    record?.temperature ??
    record?.temperature_c ??
    "-";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/60">
        <View className="rounded-t-[30px] bg-[#071a35] px-5 pt-5 pb-8">
          <View className="mb-5 flex-row items-center justify-between">
            <Text className="text-[20px] font-extrabold text-white">
              Crate Details
            </Text>

            <Pressable
              onPress={onClose}
              className="h-10 w-10 items-center justify-center rounded-full bg-[#102544]"
            >
              <Ionicons name="close" size={20} color="#fff" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="rounded-[24px] border border-slate-700 bg-[#0b172b] p-4">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-[20px] font-extrabold text-white">
                    {String(
                      record?.crateCode ||
                        record?.crate_code ||
                        record?.code ||
                        record?.id ||
                        "-"
                    )}
                  </Text>
                  <Text className="mt-2 text-[13px] text-slate-400">
                    {record?.source ||
                      record?.destination_name ||
                      record?.destinationName ||
                      "Crate detail view"}
                  </Text>
                </View>

                <View
                  style={{ backgroundColor: statusColor }}
                  className="rounded-full px-4 py-2"
                >
                  <Text className="text-[12px] font-extrabold text-white">
                    {statusText}
                  </Text>
                </View>
              </View>

              <View className="mt-5 gap-3">
                <DetailRow
                  label="Date"
                  value={displayDate ? formatDisplayDate(displayDate) : "-"}
                />
                <DetailRow label="Status" value={statusText} />
                <DetailRow
                  label="Backend Status"
                  value={String(
                    record?.status ||
                      record?.crate_status ||
                      record?.dispatch_status ||
                      "-"
                  )}
                />
                <DetailRow
                  label="Custody"
                  value={String(
                    record?.custody ||
                      record?.custody_status ||
                      record?.current_custodian_role ||
                      "-"
                  )}
                />
                <DetailRow
                  label="Assigned To"
                  value={String(
                    record?.destination_name ||
                      record?.destinationName ||
                      record?.assigned_to_label ||
                      record?.assignedToLabel ||
                      "-"
                  )}
                />
                <DetailRow
                  label="Assigned Label"
                  value={String(
                    record?.assigned_to_label ||
                      record?.assignedToLabel ||
                      "-"
                  )}
                />
                <DetailRow
                  label="Transport Operator ID"
                  value={String(
                    record?.transport_operator_id ||
                      record?.assigned_transport_operator_id ||
                      record?.assignedTransportOperatorId ||
                      "-"
                  )}
                />
                <DetailRow
                  label="Transport ID"
                  value={String(record?.transport_id || record?.transportId || "-")}
                />
                <DetailRow
                  label="Driver Name"
                  value={String(record?.driver_name || record?.driverName || "-")}
                />
                <DetailRow
                  label="Vehicle Number"
                  value={String(record?.vehicle_no || record?.vehicleNo || "-")}
                />
                <DetailRow
                  label="Assigned At"
                  value={String(
                    record?.scheduled_time_utc ||
                      record?.assignedAt ||
                      record?.assigned_at ||
                      record?.dispatchScheduledAt ||
                      record?.dispatch_scheduled_at ||
                      "-"
                  )}
                />
                <DetailRow label="Temperature" value={String(temperature)} />
                <DetailRow
                  label="Notes"
                  value={String(record?.notes || record?.remark || record?.remarks || "-")}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View className="rounded-2xl bg-[#102544] px-4 py-3">
      <Text className="text-[12px] font-semibold text-slate-400">{label}</Text>
      <Text className="mt-1 text-[15px] font-bold text-white">{value}</Text>
    </View>
  );
}

function TabButton({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 items-center justify-center py-4"
    >
      <View className="flex-row items-center gap-2">
        {icon}
        <Text
          className={`text-[15px] font-extrabold ${
            active ? "text-[#2d8cff]" : "text-slate-400"
          }`}
        >
          {label}
        </Text>
      </View>

      <View
        className={`mt-3 h-[3px] w-full rounded-full ${
          active ? "bg-[#2d8cff]" : "bg-transparent"
        }`}
      />
    </Pressable>
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
      className={`flex-1 min-h-[86px] items-center justify-center rounded-[26px] px-1 ${bgClass}`}
    >
      <Text className="text-[24px] font-extrabold text-white">{value}</Text>
      <Text className="mt-1 px-1 text-center text-[11px] font-bold leading-[13px] text-white">
        {label}
      </Text>
    </View>
  );
}

function ActionButton({
  title,
  icon,
  onPress,
  disabled = false,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      className={`flex-row items-center justify-center rounded-[20px] px-4 py-4 ${
        disabled ? "bg-slate-700" : "bg-[#18488d]"
      }`}
    >
      <Ionicons name={icon} size={20} color="#fff" />
      <Text className="ml-2 text-[16px] font-extrabold text-white">
        {title}
      </Text>
    </Pressable>
  );
}

function ListCard({
  title,
  subtitle,
  rightText,
  rightColor,
  onPress,
}: {
  title: string;
  subtitle: string;
  rightText: string;
  rightColor: string;
  onPress?: () => void;
}) {
  const content = (
    <View className="flex-row items-center justify-between rounded-[22px] border border-slate-800 bg-[#0b172b] px-4 py-4">
      <View className="flex-1 pr-3">
        <Text className="text-[16px] font-extrabold text-white">{title}</Text>
        <Text className="mt-1 text-[13px] text-slate-400">{subtitle}</Text>
      </View>

      <View className="flex-row items-center">
        <View
          style={{ backgroundColor: rightColor }}
          className="rounded-full px-4 py-2"
        >
          <Text className="text-[12px] font-extrabold text-white">
            {rightText}
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={18}
          color="#94a3b8"
          style={{ marginLeft: 8 }}
        />
      </View>
    </View>
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }

  return content;
}

function EmptyState({ text }: { text: string }) {
  return (
    <View className="items-center rounded-[22px] border border-slate-800 bg-[#0b172b] px-4 py-8">
      <Ionicons name="document-text-outline" size={34} color="#64748b" />
      <Text className="mt-3 text-[14px] font-semibold text-slate-400">
        {text}
      </Text>
    </View>
  );
}

function numberOrNull(value: any): number | null {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function normalizeToDateKey(value: any): string | null {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return formatDateKey(date);
}

function pickBestDate(item: any, status: RecordStatus): string | null {
  if (status === "assigned") {
    return (
      item?.scheduled_time_utc ||
      item?.assignedAt ||
      item?.assigned_at ||
      item?.dispatchScheduledAt ||
      item?.dispatch_scheduled_at ||
      item?.updatedAt ||
      item?.updated_at ||
      item?.createdAt ||
      item?.created_at ||
      null
    );
  }

  if (status === "received") {
    return (
      item?.receivedAt ||
      item?.received_at ||
      item?.updatedAt ||
      item?.updated_at ||
      item?.createdAt ||
      item?.created_at ||
      null
    );
  }

  return (
    item?.updatedAt ||
    item?.updated_at ||
    item?.createdAt ||
    item?.created_at ||
    null
  );
}

function buildSourceLabel(item: any, status: RecordStatus) {
  if (status === "assigned") {
    return (
      item?.assigned_to_label ||
      item?.assignedToLabel ||
      item?.destination_name ||
      item?.destinationName ||
      "Assigned to transport"
    );
  }

  if (status === "received") {
    return (
      item?.source ||
      item?.source_name ||
      item?.origin ||
      "Received at collection centre"
    );
  }

  return item?.source || item?.source_name || "Awaiting next step";
}

function mapStatus(item: any): RecordStatus {
  const status = String(
    item?.status || item?.crate_status || item?.dispatch_status || ""
  ).toUpperCase();

  const custody = String(
    item?.custody ||
      item?.custody_status ||
      item?.current_custodian_role ||
      ""
  ).toUpperCase();

  const hasAssignedTransport =
    custody.includes("SCHEDULED_FOR_DISPATCH") ||
    custody.includes("DISPATCH") ||
    status.includes("ASSIGN") ||
    status.includes("DISPATCH") ||
    status.includes("SCHEDULED") ||
    !!item?.assignedTransportOperatorId ||
    !!item?.assigned_transport_operator_id ||
    !!item?.transport_operator_id ||
    !!item?.transportId ||
    !!item?.transport_id ||
    !!item?.destinationName ||
    !!item?.destination_name ||
    !!item?.assigned_to_label ||
    !!item?.assignedToLabel ||
    !!item?.driverName ||
    !!item?.driver_name ||
    !!item?.vehicleNo ||
    !!item?.vehicle_no ||
    !!item?.scheduled_time_utc ||
    !!item?.dispatchScheduledAt ||
    !!item?.dispatch_scheduled_at;

  if (hasAssignedTransport) return "assigned";

  const isReceived =
    custody.includes("RECEIVED_AT_COLLECTION_CENTRE") ||
    custody.includes("COLLECTION_CENTRE") ||
    custody.includes("CENTRE") ||
    status.includes("RECEIVE") ||
    status.includes("RECEIVED") ||
    status.includes("COLLECTION") ||
    status === "CLOSED";

  if (isReceived) return "received";

  return "pending";
}

function formatDateKey(date: Date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);

  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getMonthLabel(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function getCalendarDays(
  year: number,
  month: number,
  todayKey: string
): CalendarDay[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const startWeekday = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const cells: CalendarDay[] = [];

  for (let i = 0; i < startWeekday; i++) {
    cells.push({
      key: `blank-prev-${year}-${month}-${i}`,
      dayNumber: 0,
      isCurrentMonth: false,
      isFuture: true,
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = formatDateKey(new Date(year, month, day));

    cells.push({
      key: dateKey,
      dayNumber: day,
      isCurrentMonth: true,
      isFuture: dateKey > todayKey,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({
      key: `blank-next-${year}-${month}-${cells.length}`,
      dayNumber: 0,
      isCurrentMonth: false,
      isFuture: true,
    });
  }

  return cells;
}