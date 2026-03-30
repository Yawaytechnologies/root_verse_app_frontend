import React, { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import {
  Feather,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";

import Screen from "../../src/components/centre/Screen";

type CentreTabKey = "scan" | "received" | "assign";
type RecordStatus = "received" | "assigned" | "pending";

type CrateRecord = {
  id: string;
  source: string;
  status: RecordStatus;
  date: string; // YYYY-MM-DD
  assignedTo?: string;
  driverName?: string;
  vehicleNo?: string;
  notes?: string;
  assignedAt?: string;
};

type CalendarDay = {
  key: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isFuture: boolean;
};

type AssignFormState = {
  assignedTo: string;
  driverName: string;
  vehicleNo: string;
  notes: string;
};

export default function CentreDashboard() {
  const [activeTab, setActiveTab] = useState<CentreTabKey>("scan");

  const today = useMemo(() => formatDateKey(new Date()), []);

  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const [selectedRecord, setSelectedRecord] = useState<CrateRecord | null>(
    null
  );
  const [recordViewOpen, setRecordViewOpen] = useState(false);
  const [assignFormOpen, setAssignFormOpen] = useState(false);

  const [assignForm, setAssignForm] = useState<AssignFormState>({
    assignedTo: "",
    driverName: "",
    vehicleNo: "",
    notes: "",
  });

  const initialMonth = useMemo(() => {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth(),
    };
  }, []);

  const [calendarMonth, setCalendarMonth] = useState(initialMonth);

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 5;

    return Array.from(
      { length: currentYear - startYear + 1 },
      (_, index) => currentYear - index
    );
  }, []);

  const [crateData, setCrateData] = useState<CrateRecord[]>(() =>
    buildInitialCrateData(today)
  );

  const selectedRecords = useMemo(() => {
    return crateData.filter((item) => item.date === selectedDate);
  }, [crateData, selectedDate]);

  const stats = useMemo(() => {
    const total = selectedRecords.length;
    const received = selectedRecords.filter(
      (item) => item.status === "received"
    ).length;
    const assigned = selectedRecords.filter(
      (item) => item.status === "assigned"
    ).length;
    const pending = selectedRecords.filter(
      (item) => item.status === "pending"
    ).length;

    return { total, received, assigned, pending };
  }, [selectedRecords]);

  const receivedList = useMemo(() => {
    return selectedRecords.filter((item) => item.status === "received");
  }, [selectedRecords]);

  const assignedList = useMemo(() => {
    return selectedRecords.filter((item) => item.status === "assigned");
  }, [selectedRecords]);

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

  const handleOpenRecordView = (record: CrateRecord) => {
    setSelectedRecord(record);
    setRecordViewOpen(true);
  };

  const handleCloseRecordView = () => {
    setRecordViewOpen(false);
    setSelectedRecord(null);
  };

  const handleOpenAssignForm = (record: CrateRecord) => {
    setSelectedRecord(record);
    setAssignForm({
      assignedTo: record.assignedTo ?? "",
      driverName: record.driverName ?? "",
      vehicleNo: record.vehicleNo ?? "",
      notes: record.notes ?? "",
    });
    setRecordViewOpen(false);
    setAssignFormOpen(true);
  };

  const handleCloseAssignForm = () => {
    setAssignFormOpen(false);
  };

  const handleSubmitAssign = () => {
    if (!selectedRecord) return;

    if (!assignForm.assignedTo.trim()) {
      Alert.alert("Validation", "Assigned To is required.");
      return;
    }

    if (!assignForm.driverName.trim()) {
      Alert.alert("Validation", "Driver Name is required.");
      return;
    }

    if (!assignForm.vehicleNo.trim()) {
      Alert.alert("Validation", "Vehicle Number is required.");
      return;
    }

    const updatedRecord: CrateRecord = {
      ...selectedRecord,
      status: "assigned",
      source: "Assigned to transport",
      assignedTo: assignForm.assignedTo.trim(),
      driverName: assignForm.driverName.trim(),
      vehicleNo: assignForm.vehicleNo.trim().toUpperCase(),
      notes: assignForm.notes.trim(),
      assignedAt: formatDateTimeLabel(new Date()),
    };

    setCrateData((prev) =>
      prev.map((item) => (item.id === updatedRecord.id ? updatedRecord : item))
    );

    setSelectedRecord(updatedRecord);
    setAssignFormOpen(false);
    setActiveTab("assign");

    Alert.alert(
      "Success",
      `${updatedRecord.id} moved to Assigned Dispatch successfully.`
    );
  };

  return (
    <Screen>
      <View className="flex-1 bg-[#031225]">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          {/* Header */}
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
                    Collection Centre
                  </Text>
                  <Text className="mt-1 text-[15px] font-semibold text-slate-400">
                    Operator Dashboard
                  </Text>
                </View>
              </View>

              <Pressable className="flex-row items-center rounded-2xl border border-slate-700 bg-[#102544] px-4 py-3">
                <Feather name="log-out" size={18} color="#fff" />
                <Text className="ml-2 text-[15px] font-bold text-white">
                  Logout
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Profile + stats */}
          <View className="flex-row bg-[#16b8b2] px-5 py-6">
            <View className="flex-1 pr-4">
              <Text className="text-[30px] font-extrabold text-white">
                Jana
              </Text>

              <Text className="mt-3 text-[15px] font-bold leading-7 text-white/90">
                Centre Operator{"\n"}• Nagapattinam, TamilNadu
              </Text>

              <Text className="mt-3 text-[16px] font-extrabold text-white/95">
                ID: CC-000003
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

          {/* Date Selector */}
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
                  Today selected. Scan, receive, and assign are enabled.
                </Text>
              ) : (
                <Text className="text-[14px] font-bold text-[#f1ab19]">
                  Past date selected. View only mode. Scan is disabled.
                </Text>
              )}
            </View>
          </View>

          {/* Tabs */}
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

          {/* Content */}
          <View className="px-5 pt-6">
            {activeTab === "scan" && (
              <View>
                <Text className="mb-5 text-[22px] font-extrabold text-white">
                  Centre Scanner
                </Text>

                <View className="rounded-[28px] border border-slate-800 bg-[#0b172b] p-4">
                  <Text className="mb-2 text-[17px] font-bold text-slate-200">
                    {isTodaySelected
                      ? "Scan crate QR to continue"
                      : "Past date records cannot be scanned"}
                  </Text>

                  <Text className="mb-5 text-[14px] text-slate-400">
                    {isTodaySelected
                      ? "Use this section for crate receive or crate assign flow."
                      : `Showing view-only records for ${formatDisplayDate(
                          selectedDate
                        )}.`}
                  </Text>

                  <View className="gap-3">
                    <ActionButton
                      title="Receive Crate (Scan)"
                      icon="download-outline"
                      disabled={!isTodaySelected}
                      onPress={() => router.push("/(centre)/receive")}
                    />
                    <ActionButton
                      title="Assign Dispatch (Scan)"
                      icon="car-outline"
                      disabled={!isTodaySelected}
                      onPress={() => router.push("/(centre)/assign")}
                    />
                  </View>

                  <View className="mt-6 min-h-[300px] items-center justify-center rounded-[24px] border border-slate-800 bg-[#040b19] p-5">
                    <View
                      className={`w-full items-center justify-center rounded-[24px] border-2 p-8 ${
                        isTodaySelected
                          ? "border-dashed border-[#1f86ff]"
                          : "border-slate-700"
                      }`}
                    >
                      <Ionicons
                        name={isTodaySelected ? "scan" : "lock-closed-outline"}
                        size={56}
                        color={isTodaySelected ? "#1f86ff" : "#64748b"}
                      />
                      <Text className="mt-4 text-[18px] font-bold text-slate-300">
                        {isTodaySelected
                          ? "Align QR inside the box"
                          : "Scanner disabled for past dates"}
                      </Text>
                      <Text className="mt-2 text-center text-[13px] text-slate-500">
                        {isTodaySelected
                          ? "Camera preview / QR scanner UI can be shown here"
                          : "You can only view received and assigned records for previous days"}
                      </Text>
                    </View>
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
                        key={item.id}
                        title={item.id}
                        subtitle={item.source}
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
                        key={item.id}
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

                    {isTodaySelected && (
                      <Pressable
                        onPress={() => router.push("/(centre)/assign")}
                        className="mt-3 items-center rounded-[22px] bg-[#18488d] py-4"
                      >
                        <Text className="text-[16px] font-extrabold text-white">
                          Go to Assign Screen
                        </Text>
                      </Pressable>
                    )}
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
          canAssign={!!selectedRecord && selectedRecord.status === "received" && isTodaySelected}
          onPressAssign={() => {
            if (selectedRecord) {
              handleOpenAssignForm(selectedRecord);
            }
          }}
        />

        <AssignFormModal
          visible={assignFormOpen}
          onClose={handleCloseAssignForm}
          record={selectedRecord}
          form={assignForm}
          onChange={setAssignForm}
          onSubmit={handleSubmitAssign}
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

            <View className="mt-2 rounded-2xl bg-[#040b19] px-4 py-3">
              <Text className="text-[13px] font-semibold text-slate-300">
                Future dates are disabled. Only today and past dates can be
                selected.
              </Text>
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
  canAssign,
  onPressAssign,
}: {
  visible: boolean;
  onClose: () => void;
  record: CrateRecord | null;
  canAssign: boolean;
  onPressAssign: () => void;
}) {
  if (!record) return null;

  const statusColor =
    record.status === "received"
      ? "#12c48b"
      : record.status === "assigned"
      ? "#2d8cff"
      : "#ef5a67";

  const statusText =
    record.status === "received"
      ? "Received"
      : record.status === "assigned"
      ? "Assigned"
      : "Pending";

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

          <View className="rounded-[24px] border border-slate-700 bg-[#0b172b] p-4">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-[20px] font-extrabold text-white">
                  {record.id}
                </Text>
                <Text className="mt-2 text-[13px] text-slate-400">
                  {record.source}
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
              <DetailRow label="Date" value={formatDisplayDate(record.date)} />
              <DetailRow label="Status" value={statusText} />
              <DetailRow
                label="Assigned To"
                value={record.assignedTo || "-"}
              />
              <DetailRow
                label="Driver Name"
                value={record.driverName || "-"}
              />
              <DetailRow
                label="Vehicle Number"
                value={record.vehicleNo || "-"}
              />
              <DetailRow label="Assigned At" value={record.assignedAt || "-"} />
              <DetailRow label="Notes" value={record.notes || "-"} />
            </View>

            {canAssign && (
              <Pressable
                onPress={onPressAssign}
                className="mt-6 items-center rounded-[22px] bg-[#18488d] py-4"
              >
                <Text className="text-[16px] font-extrabold text-white">
                  Assign This Crate
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function AssignFormModal({
  visible,
  onClose,
  record,
  form,
  onChange,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  record: CrateRecord | null;
  form: AssignFormState;
  onChange: React.Dispatch<React.SetStateAction<AssignFormState>>;
  onSubmit: () => void;
}) {
  if (!record) return null;

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
              Assign Dispatch Form
            </Text>

            <Pressable
              onPress={onClose}
              className="h-10 w-10 items-center justify-center rounded-full bg-[#102544]"
            >
              <Ionicons name="close" size={20} color="#fff" />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 12 }}
          >
            <View className="rounded-[24px] border border-slate-700 bg-[#0b172b] p-4">
              <Text className="mb-5 text-[18px] font-extrabold text-white">
                {record.id}
              </Text>

              <InputField
                label="Assigned To"
                placeholder="Enter dispatch team / unit"
                value={form.assignedTo}
                onChangeText={(value) =>
                  onChange((prev) => ({ ...prev, assignedTo: value }))
                }
              />

              <InputField
                label="Driver Name"
                placeholder="Enter driver name"
                value={form.driverName}
                onChangeText={(value) =>
                  onChange((prev) => ({ ...prev, driverName: value }))
                }
              />

              <InputField
                label="Vehicle Number"
                placeholder="Enter vehicle number"
                value={form.vehicleNo}
                autoCapitalize="characters"
                onChangeText={(value) =>
                  onChange((prev) => ({ ...prev, vehicleNo: value }))
                }
              />

              <InputField
                label="Notes"
                placeholder="Optional notes"
                value={form.notes}
                multiline
                onChangeText={(value) =>
                  onChange((prev) => ({ ...prev, notes: value }))
                }
              />

              <Pressable
                onPress={onSubmit}
                className="mt-3 items-center rounded-[22px] bg-[#18488d] py-4"
              >
                <Text className="text-[16px] font-extrabold text-white">
                  Submit and Move to Assign
                </Text>
              </Pressable>
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

function InputField({
  label,
  value,
  placeholder,
  onChangeText,
  multiline = false,
  autoCapitalize = "sentences",
}: {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-[13px] font-semibold text-slate-300">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#64748b"
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        className={`rounded-[18px] border border-slate-700 bg-[#102544] px-4 text-white ${
          multiline ? "min-h-[110px] py-4" : "py-4"
        }`}
      />
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

/* helpers */

function buildInitialCrateData(today: string): CrateRecord[] {
  return [
    {
      id: "RV-CRATE-000121",
      source: "Received from Wild Capture",
      status: "received",
      date: today,
    },
    {
      id: "RV-CRATE-000122",
      source: "Received from Wild Capture",
      status: "received",
      date: today,
    },
    {
      id: "RV-CRATE-000123",
      source: "Awaiting next step",
      status: "pending",
      date: today,
    },
    {
      id: "RV-CRATE-000118",
      source: "Assigned to transport",
      status: "assigned",
      date: today,
      assignedTo: "Nagapattinam Dispatch",
      driverName: "Prakash",
      vehicleNo: "TN51AB4321",
      notes: "Ready for delivery route",
      assignedAt: formatDateTimeLabel(new Date()),
    },
    {
      id: "RV-CRATE-000119",
      source: "Assigned to transport",
      status: "assigned",
      date: today,
      assignedTo: "Main Harbour Dispatch",
      driverName: "Arun",
      vehicleNo: "TN49CD8765",
      notes: "Urgent dispatch",
      assignedAt: formatDateTimeLabel(new Date()),
    },
    {
      id: "RV-CRATE-000110",
      source: "Received from Wild Capture",
      status: "received",
      date: offsetDateKey(today, -1),
    },
    {
      id: "RV-CRATE-000111",
      source: "Assigned to transport",
      status: "assigned",
      date: offsetDateKey(today, -1),
      assignedTo: "Yesterday Dispatch",
      driverName: "Muthu",
      vehicleNo: "TN22EF1234",
      notes: "Completed",
      assignedAt: formatDateTimeLabel(new Date()),
    },
    {
      id: "RV-CRATE-000112",
      source: "Awaiting next step",
      status: "pending",
      date: offsetDateKey(today, -1),
    },
    {
      id: "RV-CRATE-000101",
      source: "Received from Wild Capture",
      status: "received",
      date: offsetDateKey(today, -2),
    },
    {
      id: "RV-CRATE-000102",
      source: "Assigned to transport",
      status: "assigned",
      date: offsetDateKey(today, -2),
      assignedTo: "Zone 2 Dispatch",
      driverName: "Ravi",
      vehicleNo: "TN09GH2222",
      notes: "Moved from centre",
      assignedAt: formatDateTimeLabel(new Date()),
    },
    {
      id: "RV-CRATE-000090",
      source: "Received from Wild Capture",
      status: "received",
      date: offsetDateKey(today, -3),
    },
  ];
}

function formatDateKey(date: Date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function offsetDateKey(baseDateKey: string, offset: number) {
  const [y, m, d] = baseDateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + offset);
  return formatDateKey(date);
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

function formatDateTimeLabel(date: Date) {
  return date.toLocaleString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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