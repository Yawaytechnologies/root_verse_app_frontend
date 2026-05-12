import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppDispatch, useAppSelector } from "../../../src/store/hooks";
import {
  fetchUserCultureCycles,
  setSelectedCultureCycleId,
} from "../../../src/features/aqua/cultureCycles/cultureCycles.slice";

import {
  fetchSpeciesRegistry,
  submitStockingDetails,
  type SpeciesRecord,
} from "../../../src/services/aqua/stocking.service";

const getParamValue = (value: string | string[] | undefined, fallback = "") =>
  Array.isArray(value)
    ? String(value[0] ?? fallback)
    : String(value ?? fallback);

function toNumberOrNull(value: string) {
  if (!String(value || "").trim()) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function toRequiredNumber(value: string) {
  const num = Number(value);
  return Number.isFinite(num) ? num : NaN;
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function toYmd(year: number, month: number, day: number) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function parseYmd(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return null;

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function formatDateForUi(value: string) {
  const parsed = parseYmd(value);
  if (!parsed) return "";
  return `${pad2(parsed.day)}-${pad2(parsed.month)}-${parsed.year}`;
}

function speciesIdOf(item: SpeciesRecord) {
  return String((item as any).id ?? (item as any).species_id ?? "");
}

function speciesNameOf(item: SpeciesRecord) {
  return String(
    (item as any).species_name ??
      (item as any).fish_name ??
      (item as any).name ??
      (item as any).common_name ??
      "",
  );
}

function cycleIdOf(item: any) {
  return String(item?.id ?? item?.culturecycle_id ?? item?.culture_cycle_id ?? "");
}

function cycleLabelOf(item: any) {
  return String(
    item?.culture_code ??
      item?.cultureCycleCode ??
      item?.cycle_code ??
      item?.id ??
      "",
  );
}

function cycleMetaOf(item: any) {
  const parts = [
    item?.farm_name ? String(item.farm_name) : "",
    item?.pond_name ? String(item.pond_name) : "",
    item?.verification_status ? String(item.verification_status) : "",
  ].filter(Boolean);

  return parts.join(" • ");
}

function Field({
  label,
  value,
  placeholder,
  onChangeText,
  keyboardType = "default",
  required = false,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (text: string) => void;
  keyboardType?: "default" | "numeric";
  required?: boolean;
}) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold text-slate-800 dark:text-white">
        {label}
        {required ? <Text className="text-rose-500"> *</Text> : null}
      </Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        keyboardType={keyboardType}
        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 dark:border-white/10 dark:bg-[#0B1220] dark:text-white"
      />
    </View>
  );
}

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-start justify-between gap-4 border-b border-slate-100 py-2 dark:border-white/5">
      <Text className="flex-1 text-sm text-slate-500 dark:text-white/60">
        {label}
      </Text>
      <Text
        className="flex-1 text-right text-sm font-semibold text-slate-900 dark:text-white"
        numberOfLines={2}
      >
        {value || "-"}
      </Text>
    </View>
  );
}

function DateOption({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`mb-2 rounded-xl border px-3 py-2 ${
        active
          ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-500/20"
          : "border-slate-200 bg-white dark:border-white/10 dark:bg-white/5"
      }`}
    >
      <Text
        className={`text-center text-sm font-semibold ${
          active
            ? "text-blue-700 dark:text-blue-200"
            : "text-slate-700 dark:text-white/70"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function StockingAddScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const {
    items: cultureCycles,
    loading: cultureCyclesLoading,
    error: cultureCyclesError,
    selectedId: selectedCultureCycleId,
  } = useAppSelector((state) => state.aquaCultureCycles);

  const tr = (key: string, fallback: string, options?: Record<string, any>) =>
    t(key, { defaultValue: fallback, ...(options || {}) });

  const farmerId =
    getParamValue(params.farmerId) || getParamValue(params.userId);

  const farmId =
    getParamValue(params.farmId) || getParamValue(params.farmDbId);

  const pondId =
    getParamValue(params.pondId) || getParamValue(params.pondDbId);

  const initialCultureCycleId =
    getParamValue(params.cultureCycleId) ||
    getParamValue(params.culturecycleId) ||
    getParamValue(params.culturecycle_id);

  const qrcodeId =
    getParamValue(params.qrcodeId) ||
    getParamValue(params.qrcode_id) ||
    getParamValue(params.qrId);

  const pondQr =
    getParamValue(params.pondQr) ||
    getParamValue(params.qrValue) ||
    getParamValue(params.code);

  const farmName = getParamValue(
    params.farmName,
    tr("stocking.linkedFarm", "Linked Farm"),
  );

  const pondName = getParamValue(
    params.pondName,
    tr("stocking.linkedPond", "Linked Pond"),
  );

  const today = new Date();
  const todayYmd = toYmd(
    today.getFullYear(),
    today.getMonth() + 1,
    today.getDate(),
  );

  const [speciesList, setSpeciesList] = useState<SpeciesRecord[]>([]);
  const [speciesLoading, setSpeciesLoading] = useState(false);
  const [speciesPickerVisible, setSpeciesPickerVisible] = useState(false);
  const [cultureCyclePickerVisible, setCultureCyclePickerVisible] =
    useState(false);

  const [selectedSpeciesId, setSelectedSpeciesId] = useState("");
  const [selectedSpeciesName, setSelectedSpeciesName] = useState("");

  const [hatchery, setHatchery] = useState("");
  const [hatcheryBatchNo, setHatcheryBatchNo] = useState("");
  const [plAgeAtDispatch, setPlAgeAtDispatch] = useState("");
  const [nurseryDays, setNurseryDays] = useState("");
  const [stockingDate, setStockingDate] = useState(todayYmd);
  const [plAgeAtStocking, setPlAgeAtStocking] = useState("");
  const [totalPlStocked, setTotalPlStocked] = useState("");

  const [gpsLat, setGpsLat] = useState("");
  const [gpsLng, setGpsLng] = useState("");

  const [dateModalVisible, setDateModalVisible] = useState(false);
  const currentYear = today.getFullYear();
  const parsedStockingDate = parseYmd(stockingDate);

  const [dateYear, setDateYear] = useState(
    parsedStockingDate?.year || currentYear,
  );
  const [dateMonth, setDateMonth] = useState(
    parsedStockingDate?.month || today.getMonth() + 1,
  );
  const [dateDay, setDateDay] = useState(
    parsedStockingDate?.day || today.getDate(),
  );

  const [submitting, setSubmitting] = useState(false);

  const yearOptions = useMemo(() => {
    return Array.from({ length: 6 }, (_, index) => currentYear - 1 + index);
  }, [currentYear]);

  const monthOptions = useMemo(() => {
    return Array.from({ length: 12 }, (_, index) => index + 1);
  }, []);

  const dayOptions = useMemo(() => {
    const days = getDaysInMonth(dateYear, dateMonth);
    return Array.from({ length: days }, (_, index) => index + 1);
  }, [dateYear, dateMonth]);

  useEffect(() => {
    const maxDay = getDaysInMonth(dateYear, dateMonth);
    if (dateDay > maxDay) setDateDay(maxDay);
  }, [dateDay, dateMonth, dateYear]);

  useEffect(() => {
    dispatch(setSelectedCultureCycleId(initialCultureCycleId || ""));
  }, [dispatch, initialCultureCycleId]);

  useEffect(() => {
    if (!farmerId) return;
    dispatch(fetchUserCultureCycles(farmerId));
  }, [dispatch, farmerId]);

  useEffect(() => {
    const loadSpecies = async () => {
      setSpeciesLoading(true);
      const result = await fetchSpeciesRegistry();
      setSpeciesLoading(false);

      if (result.ok) {
        setSpeciesList(result.data || []);
        return;
      }

      setSpeciesList([]);
      Alert.alert(
        tr("common.failed", "Failed"),
        result.message ||
          tr("stocking.noSpeciesAvailable", "No species available."),
      );
    };

    loadSpecies();
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadGps = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        if (!mounted) return;

        setGpsLat(String(position.coords.latitude));
        setGpsLng(String(position.coords.longitude));
      } catch {
        // GPS failure should not crash the form
      }
    };

    loadGps();

    return () => {
      mounted = false;
    };
  }, []);

  const saveDate = () => {
    setStockingDate(toYmd(dateYear, dateMonth, dateDay));
    setDateModalVisible(false);
  };

  const selectedCultureCycle =
    cultureCycles.find(
      (item) => cycleIdOf(item) === String(selectedCultureCycleId || ""),
    ) || null;

  const selectSpecies = (item: SpeciesRecord) => {
    setSelectedSpeciesId(speciesIdOf(item));
    setSelectedSpeciesName(speciesNameOf(item));
    setSpeciesPickerVisible(false);
  };

  const selectCultureCycle = (id: string) => {
    dispatch(setSelectedCultureCycleId(id));
    setCultureCyclePickerVisible(false);
  };

  const validate = () => {
    if (!farmerId || !farmId || !pondId || !selectedCultureCycleId) {
      Alert.alert(
        tr("common.failed", "Failed"),
        tr(
          "stocking.cultureCycleRequired",
          "Please select culture cycle.",
        ),
      );
      return false;
    }

    if (!selectedSpeciesId && !selectedSpeciesName.trim()) {
      Alert.alert(
        "Validation",
        tr("stocking.speciesRequired", "Please select species"),
      );
      return false;
    }

    if (!stockingDate) {
      Alert.alert(
        "Validation",
        tr("stocking.stockingDateRequired", "Please select stocking date"),
      );
      return false;
    }

    const total = toRequiredNumber(totalPlStocked);
    if (!Number.isFinite(total) || total <= 0) {
      Alert.alert(
        "Validation",
        tr("stocking.totalPlRequired", "Please enter valid total PL stocked"),
      );
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setSubmitting(true);

      const payload = {
        farmer_id: Number(farmerId),
        farm_id: Number(farmId),
        pond_id: Number(pondId),
        culture_cycle_id: Number(selectedCultureCycleId),
        qr_code_id: qrcodeId ? Number(qrcodeId) : null,
        species_id: selectedSpeciesId ? Number(selectedSpeciesId) : null,
        species: selectedSpeciesName.trim(),
        hatchery: hatchery.trim(),
        hatchery_batch_number: hatcheryBatchNo.trim(),
        pl_age_at_dispatch: toNumberOrNull(plAgeAtDispatch),
        nursery_days: toNumberOrNull(nurseryDays),
        stocking_date: stockingDate,
        pl_age_at_stocking: toNumberOrNull(plAgeAtStocking),
        total_pl_stocked: Number(totalPlStocked),
        gps_latitude: gpsLat,
        gps_longitude: gpsLng,
        qr_value: pondQr,
      };

      const response = await submitStockingDetails(payload);

      if (!response.ok) {
        Alert.alert(
          tr("common.failed", "Failed"),
          response.message ||
            tr("stocking.submitFailed", "Stocking submission failed"),
        );
        return;
      }

      Alert.alert(
        tr("common.success", "Success"),
        tr(
          "stocking.submitSuccess",
          "Stocking details submitted successfully",
        ),
        [
          {
            text: "OK",
            onPress: () => router.replace("/(aqua)/tabs/dashboard"),
          },
        ],
      );
    } catch (error: any) {
      Alert.alert(
        tr("common.failed", "Failed"),
        error?.message ||
          tr("stocking.submitFailed", "Stocking submission failed"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <ScrollView
        className="flex-1 bg-[#F5F7FB] dark:bg-[#050B16]"
        contentContainerStyle={{
          padding: 16,
          paddingTop: insets.top + 8,
          paddingBottom: 36,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="rounded-2xl border border-slate-900 bg-slate-900 p-5 dark:border-white/10 dark:bg-[#0B1220]">
          <View className="flex-row items-center gap-3">
            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
              <Ionicons name="fish-outline" size={22} color="#60A5FA" />
            </View>

            <View className="flex-1">
              <Text className="text-[11px] uppercase tracking-wide text-white/70">
                {tr("stocking.qrBasedEntry", "QR Based Entry")}
              </Text>

              <Text className="mt-1 text-xl font-extrabold text-white">
                {tr("stocking.title", "Pond Stocking Details")}
              </Text>

              <Text className="mt-2 text-sm leading-5 text-white/70">
                {tr(
                  "stocking.subtitle",
                  "This form is opened only after scanning Pond QR.",
                )}
              </Text>
            </View>
          </View>
        </View>

        <View className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
          <Text className="text-base font-bold text-emerald-900 dark:text-emerald-200">
            {tr("stocking.linkedDetails", "Linked Details")}
          </Text>

          <View className="mt-3">
            <ReadOnlyRow
              label={tr("stocking.linkedFarm", "Linked Farm")}
              value={farmName}
            />
            <ReadOnlyRow
              label={tr("stocking.linkedPond", "Linked Pond")}
              value={pondName}
            />
            <ReadOnlyRow
              label={tr("stocking.pondQr", "Pond QR")}
              value={pondQr ? tr("stocking.activated", "Activated") : "-"}
            />
            <ReadOnlyRow
              label={tr("stocking.cultureCycle", "Culture Cycle")}
              value={selectedCultureCycle ? cycleLabelOf(selectedCultureCycle) : "-"}
            />
          </View>
        </View>

        <View className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0B1220]">
          <Text className="text-base font-bold text-slate-900 dark:text-white">
            {tr("stocking.formTitle", "Stocking Form")}
          </Text>

          <View className="mt-4 gap-4">
            <View className="gap-2">
              <Text className="text-sm font-semibold text-slate-800 dark:text-white">
                {tr("stocking.cultureCycleId", "Culture Cycle ID")}
                <Text className="text-rose-500"> *</Text>
              </Text>

              <Pressable
                onPress={() => setCultureCyclePickerVisible(true)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#0B1220]"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text
                      className={`text-sm ${
                        selectedCultureCycle
                          ? "text-slate-900 dark:text-white"
                          : "text-slate-400 dark:text-white/40"
                      }`}
                    >
                      {cultureCyclesLoading
                        ? tr("stocking.loadingCultureCycles", "Loading culture cycles...")
                        : selectedCultureCycle
                          ? cycleLabelOf(selectedCultureCycle)
                          : tr("stocking.selectCultureCycle", "Select culture cycle")}
                    </Text>

                    {selectedCultureCycle ? (
                      <Text className="mt-1 text-xs text-slate-500 dark:text-white/50">
                        {cycleMetaOf(selectedCultureCycle)}
                      </Text>
                    ) : null}
                  </View>

                  {cultureCyclesLoading ? (
                    <ActivityIndicator size="small" color="#2563EB" />
                  ) : (
                    <Ionicons name="chevron-down" size={18} color="#94A3B8" />
                  )}
                </View>
              </Pressable>
            </View>

            <View className="gap-2">
              <Text className="text-sm font-semibold text-slate-800 dark:text-white">
                {tr("stocking.species", "Species")}
                <Text className="text-rose-500"> *</Text>
              </Text>

              <Pressable
                onPress={() => setSpeciesPickerVisible(true)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#0B1220]"
              >
                <View className="flex-row items-center justify-between">
                  <Text
                    className={`flex-1 text-sm ${
                      selectedSpeciesName
                        ? "text-slate-900 dark:text-white"
                        : "text-slate-400 dark:text-white/40"
                    }`}
                  >
                    {speciesLoading
                      ? tr("stocking.loadingSpecies", "Loading species...")
                      : selectedSpeciesName ||
                        tr("stocking.selectSpecies", "Select species")}
                  </Text>

                  {speciesLoading ? (
                    <ActivityIndicator size="small" color="#2563EB" />
                  ) : (
                    <Ionicons name="chevron-down" size={18} color="#94A3B8" />
                  )}
                </View>
              </Pressable>
            </View>

            <Field
              label={tr("stocking.hatchery", "Hatchery")}
              value={hatchery}
              placeholder={tr(
                "stocking.hatcheryPlaceholder",
                "Enter hatchery name",
              )}
              onChangeText={setHatchery}
            />

            <Field
              label={tr("stocking.hatcheryBatchNo", "Hatchery Batch No.")}
              value={hatcheryBatchNo}
              placeholder={tr(
                "stocking.hatcheryBatchPlaceholder",
                "Enter batch number",
              )}
              onChangeText={setHatcheryBatchNo}
            />

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Field
                  label={tr(
                    "stocking.plAgeAtDispatch",
                    "PL Age at Dispatch",
                  )}
                  value={plAgeAtDispatch}
                  placeholder="0"
                  onChangeText={(text) =>
                    setPlAgeAtDispatch(text.replace(/\D/g, ""))
                  }
                  keyboardType="numeric"
                />
              </View>

              <View className="flex-1">
                <Field
                  label={tr("stocking.nurseryDays", "Nursery Days")}
                  value={nurseryDays}
                  placeholder="0"
                  onChangeText={(text) =>
                    setNurseryDays(text.replace(/\D/g, ""))
                  }
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View className="gap-2">
              <Text className="text-sm font-semibold text-slate-800 dark:text-white">
                {tr("stocking.stockingDate", "Stocking Date")}
                <Text className="text-rose-500"> *</Text>
              </Text>

              <Pressable
                onPress={() => {
                  const parsed = parseYmd(stockingDate);
                  if (parsed) {
                    setDateYear(parsed.year);
                    setDateMonth(parsed.month);
                    setDateDay(parsed.day);
                  }
                  setDateModalVisible(true);
                }}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#0B1220]"
              >
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm font-semibold text-slate-900 dark:text-white">
                    {formatDateForUi(stockingDate)}
                  </Text>
                  <Ionicons
                    name="calendar-outline"
                    size={18}
                    color="#94A3B8"
                  />
                </View>
              </Pressable>
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Field
                  label={tr(
                    "stocking.plAgeAtStocking",
                    "PL Age at Stocking",
                  )}
                  value={plAgeAtStocking}
                  placeholder="0"
                  onChangeText={(text) =>
                    setPlAgeAtStocking(text.replace(/\D/g, ""))
                  }
                  keyboardType="numeric"
                />
              </View>

              <View className="flex-1">
                <Field
                  label={tr("stocking.totalPlStocked", "Total PL Stocked")}
                  value={totalPlStocked}
                  placeholder="100000"
                  onChangeText={(text) =>
                    setTotalPlStocked(text.replace(/\D/g, ""))
                  }
                  keyboardType="numeric"
                  required
                />
              </View>
            </View>

            <View className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
              <View className="flex-row items-center gap-2">
                <Ionicons name="location-outline" size={17} color="#2563EB" />
                <Text className="font-bold text-slate-900 dark:text-white">
                  {tr("stocking.gpsLocation", "GPS Location")}
                </Text>
              </View>

              <Text className="mt-2 text-sm text-slate-600 dark:text-white/60">
                {gpsLat && gpsLng
                  ? `${gpsLat}, ${gpsLng}`
                  : tr("stocking.gpsFetching", "Fetching GPS...")}
              </Text>
            </View>
          </View>
        </View>

        <Pressable
          disabled={submitting}
          onPress={handleSubmit}
          className={`mt-5 rounded-2xl px-4 py-4 ${
            submitting ? "bg-slate-400" : "bg-slate-900 dark:bg-white"
          }`}
        >
          <Text className="text-center text-base font-bold text-white dark:text-slate-900">
            {submitting
              ? tr("stocking.submitting", "Submitting...")
              : tr("stocking.submit", "Submit Stocking Details")}
          </Text>
        </Pressable>
      </ScrollView>

      <Modal
        visible={cultureCyclePickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCultureCyclePickerVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="max-h-[70%] rounded-t-3xl bg-white p-4 dark:bg-[#0B1220]">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-slate-900 dark:text-white">
                {tr("stocking.selectCultureCycle", "Select culture cycle")}
              </Text>

              <Pressable
                onPress={() => setCultureCyclePickerVisible(false)}
                className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-white/10"
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {cultureCycles.length ? (
                cultureCycles.map((item, index) => {
                  const itemId = cycleIdOf(item);
                  const isSelected = itemId === String(selectedCultureCycleId || "");

                  return (
                    <Pressable
                      key={`${itemId}-${index}`}
                      onPress={() => selectCultureCycle(itemId)}
                      className={`mb-2 rounded-2xl border bg-white px-4 py-4 dark:bg-[#111827] ${
                        isSelected
                          ? "border-emerald-300 dark:border-emerald-500/30"
                          : "border-slate-200 dark:border-white/10"
                      }`}
                    >
                      <Text className="font-semibold text-slate-900 dark:text-white">
                        {cycleLabelOf(item) || `Cycle ${index + 1}`}
                      </Text>
                      {cycleMetaOf(item) ? (
                        <Text className="mt-1 text-xs text-slate-500 dark:text-white/50">
                          {cycleMetaOf(item)}
                        </Text>
                      ) : null}
                    </Pressable>
                  );
                })
              ) : (
                <View className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                  <Text className="text-sm text-slate-600 dark:text-white/60">
                    {cultureCyclesError ||
                      tr(
                        "stocking.noCultureCyclesAvailable",
                        "No culture cycles available.",
                      )}
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={speciesPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSpeciesPickerVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="max-h-[70%] rounded-t-3xl bg-white p-4 dark:bg-[#0B1220]">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-slate-900 dark:text-white">
                {tr("stocking.selectSpecies", "Select species")}
              </Text>

              <Pressable
                onPress={() => setSpeciesPickerVisible(false)}
                className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-white/10"
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {speciesList.length ? (
                speciesList.map((item, index) => (
                  <Pressable
                    key={`${speciesIdOf(item)}-${index}`}
                    onPress={() => selectSpecies(item)}
                    className="mb-2 rounded-2xl border border-slate-200 bg-white px-4 py-4 dark:border-white/10 dark:bg-[#111827]"
                  >
                    <Text className="font-semibold text-slate-900 dark:text-white">
                      {speciesNameOf(item) || `Species ${index + 1}`}
                    </Text>
                  </Pressable>
                ))
              ) : (
                <View className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                  <Text className="text-sm text-slate-600 dark:text-white/60">
                    {tr(
                      "stocking.noSpeciesAvailable",
                      "No species available.",
                    )}
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={dateModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDateModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="rounded-t-3xl bg-white p-5 dark:bg-[#0B1220]">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-slate-900 dark:text-white">
                {tr("stocking.selectStockingDate", "Select Stocking Date")}
              </Text>

              <Pressable
                onPress={() => setDateModalVisible(false)}
                className="h-9 w-9 items-center justify-center rounded-full bg-slate-100 dark:bg-white/10"
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </Pressable>
            </View>

            <View className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 p-3 dark:border-blue-500/20 dark:bg-blue-500/10">
              <Text className="text-center text-sm font-bold text-blue-700 dark:text-blue-200">
                {`${pad2(dateDay)}-${pad2(dateMonth)}-${dateYear}`}
              </Text>
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="mb-2 text-center text-sm font-bold text-slate-700 dark:text-white/80">
                  {tr("registration.year", "Year")}
                </Text>

                <ScrollView
                  style={{ maxHeight: 220 }}
                  showsVerticalScrollIndicator={false}
                >
                  {yearOptions.map((year) => (
                    <DateOption
                      key={year}
                      label={String(year)}
                      active={dateYear === year}
                      onPress={() => setDateYear(year)}
                    />
                  ))}
                </ScrollView>
              </View>

              <View className="flex-1">
                <Text className="mb-2 text-center text-sm font-bold text-slate-700 dark:text-white/80">
                  {tr("registration.month", "Month")}
                </Text>

                <ScrollView
                  style={{ maxHeight: 220 }}
                  showsVerticalScrollIndicator={false}
                >
                  {monthOptions.map((month) => (
                    <DateOption
                      key={month}
                      label={pad2(month)}
                      active={dateMonth === month}
                      onPress={() => setDateMonth(month)}
                    />
                  ))}
                </ScrollView>
              </View>

              <View className="flex-1">
                <Text className="mb-2 text-center text-sm font-bold text-slate-700 dark:text-white/80">
                  {tr("registration.day", "Day")}
                </Text>

                <ScrollView
                  style={{ maxHeight: 220 }}
                  showsVerticalScrollIndicator={false}
                >
                  {dayOptions.map((day) => (
                    <DateOption
                      key={day}
                      label={pad2(day)}
                      active={dateDay === day}
                      onPress={() => setDateDay(day)}
                    />
                  ))}
                </ScrollView>
              </View>
            </View>

            <View className="mt-5 flex-row gap-3">
              <Pressable
                onPress={() => setDateModalVisible(false)}
                className="flex-1 rounded-2xl border border-slate-200 bg-white py-3 dark:border-white/10 dark:bg-white/5"
              >
                <Text className="text-center text-base font-bold text-slate-700 dark:text-white">
                  {tr("common.cancel", "Cancel")}
                </Text>
              </Pressable>

              <Pressable
                onPress={saveDate}
                className="flex-1 rounded-2xl bg-blue-600 py-3"
              >
                <Text className="text-center text-base font-bold text-white">
                  {tr("common.save", "Save")}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
