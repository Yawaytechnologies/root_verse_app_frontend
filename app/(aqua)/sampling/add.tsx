import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { router, useLocalSearchParams } from "expo-router";
import React, { memo, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";

import type { RootState } from "../../../src/store/auth/store";
import {
  calculateSamplingValues,
  createSamplingRecord,
} from "../../../src/services/aqua/sampling.service";
import { fetchStockingRecords } from "../../../src/services/aqua/stocking.service";

// ============================================================
// BASIC HELPERS
// ============================================================

function paramValue(value: any) {
  if (Array.isArray(value)) return String(value[0] ?? "").trim();
  return String(value ?? "").trim();
}

function pickId(...values: any[]) {
  const found = values.find((value) => {
    const text = paramValue(value);

    return (
      text &&
      text !== "0" &&
      text !== "undefined" &&
      text !== "null"
    );
  });

  return paramValue(found);
}

function pickText(...values: any[]) {
  const found = values.find((value) => {
    const text = paramValue(value);
    return text && text !== "undefined" && text !== "null";
  });

  return paramValue(found);
}

function toNumericUserId(value: any) {
  const raw = String(value ?? "").trim();

  if (!raw) return "";
  if (/^\d+$/.test(raw)) return String(Number(raw));

  const digits = raw.replace(/\D/g, "");
  return digits ? String(Number(digits)) : "";
}

function numberValue(value: string) {
  const cleaned = String(value || "").replace(/,/g, "").trim();
  const num = Number(cleaned);

  return Number.isFinite(num) ? num : 0;
}

function sameId(a: any, b: any) {
  const left = paramValue(a);
  const right = paramValue(b);

  return Boolean(left && right && left === right);
}

function normalizeCode(value: any) {
  return paramValue(value).toUpperCase().replace(/\s+/g, "");
}

// ============================================================
// DATE HELPERS
// ============================================================

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function dateToYmd(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
    date.getDate(),
  )}`;
}

function todayDate() {
  return dateToYmd(new Date());
}

function normalizeYmdDate(value: any) {
  const text = String(value ?? "").trim();
  if (!text) return "";

  // Supports plain YYYY-MM-DD and ISO values from the API.
  // We intentionally keep only the backend calendar date and avoid timezone
  // conversion because DOC is a calendar-day difference.
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : "";
}

function parseYmdLocal(value: string) {
  const normalized = normalizeYmdDate(value);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);

  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function toUtcDay(value: string) {
  const normalized = normalizeYmdDate(value);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);

  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const utc = Date.UTC(year, month - 1, day);
  const date = new Date(utc);

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return utc;
}

function calculateDocDays(samplingDate: string, stockingDate: string) {
  const samplingDay = toUtcDay(samplingDate);
  const stockingDay = toUtcDay(stockingDate);

  if (samplingDay === null || stockingDay === null) return null;

  return Math.floor((samplingDay - stockingDay) / 86_400_000);
}

function formatDateForDisplay(value: string) {
  const date = parseYmdLocal(value);
  if (!date) return "Select date";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ============================================================
// STOCKING RECORD HELPERS
// ============================================================

function extractArray(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.stocking)) return data.stocking;
  if (Array.isArray(data?.stockings)) return data.stockings;
  if (Array.isArray(data?.stocking_records)) return data.stocking_records;
  if (Array.isArray(data?.stockingRecords)) return data.stockingRecords;

  if (data?.data && typeof data.data === "object") {
    return extractArray(data.data);
  }

  return [];
}

function getRecordCultureCycleId(item: any) {
  return pickId(
    item?.culture_cycle_id,
    item?.culturecycle_id,
    item?.cultureCycleId,
    item?.culture_id,
    item?.cultureId,
    item?.culture_cycle?.id,
    item?.cultureCycle?.id,
    item?.culture?.id,
  );
}

function getRecordPondId(item: any) {
  return pickId(
    item?.pond_id,
    item?.pondId,
    item?.pond?.id,
    item?.linked_pond?.id,
  );
}

function getRecordQrCode(item: any) {
  return pickText(
    item?.qr_code,
    item?.qrCode,
    item?.qrcode,
    item?.qr_value,
    item?.qrValue,
    item?.pond_qr,
    item?.pondQr,
    item?.qrs_code,
    item?.qrs?.qrs_code,
    item?.qrs?.qr_code,
    item?.pond?.qr_code,
    item?.pond?.pond_qr,
  );
}

function getRecordStockingDate(item: any) {
  return pickText(
    item?.stocking_date,
    item?.stockingDate,
    item?.stocked_date,
    item?.stockedDate,
    item?.date_of_stocking,
    item?.stocking?.stocking_date,
    item?.stocking?.stockingDate,
    item?.culture_cycle?.stocking_date,
    item?.cultureCycle?.stocking_date,
  );
}

function getRecordTotalPlStocked(item: any) {
  return pickText(
    item?.total_pl_stocked,
    item?.totalPlStocked,
    item?.total_pl_stock,
    item?.pl_stocked,
    item?.stocking?.total_pl_stocked,
    item?.stocking?.totalPlStocked,
  );
}

function isExplicitlyActiveStocking(item: any) {
  if (
    item?.is_active === true ||
    item?.isActive === true ||
    item?.active === true ||
    item?.culture_cycle?.is_active === true ||
    item?.cultureCycle?.isActive === true
  ) {
    return true;
  }

  const status = pickText(
    item?.status,
    item?.stocking_status,
    item?.stockingStatus,
    item?.culture_cycle?.status,
    item?.cultureCycle?.status,
  )
    .toUpperCase()
    .replace(/\s+/g, "_");

  return ["ACTIVE", "STOCKED", "ONGOING", "IN_PROGRESS"].includes(status);
}

function selectStockingRecord(
  records: any[],
  cultureCycleId: string,
  pondId: string,
  qrCode: string,
) {
  if (!records.length) return null;

  const exactCultureMatches = cultureCycleId
    ? records.filter((item) =>
        sameId(getRecordCultureCycleId(item), cultureCycleId),
      )
    : [];

  const pondMatches = pondId
    ? records.filter((item) => sameId(getRecordPondId(item), pondId))
    : [];

  const normalizedQr = normalizeCode(qrCode);
  const qrMatches = normalizedQr
    ? records.filter(
        (item) => normalizeCode(getRecordQrCode(item)) === normalizedQr,
      )
    : [];

  // Culture Cycle is the strongest match, then Pond, then QR.
  const candidates =
    exactCultureMatches.length > 0
      ? exactCultureMatches
      : pondMatches.length > 0
        ? pondMatches
        : qrMatches;

  if (!candidates.length) return null;

  // Prefer the record explicitly marked active. If the backend does not send
  // an active flag/status, use the latest matched stocking record.
  const activeCandidates = candidates.filter(isExplicitlyActiveStocking);
  const list = activeCandidates.length > 0 ? activeCandidates : candidates;

  return [...list].sort((a, b) => {
    const aDate = toUtcDay(getRecordStockingDate(a)) ?? 0;
    const bDate = toUtcDay(getRecordStockingDate(b)) ?? 0;
    return bDate - aDate;
  })[0];
}

// ============================================================
// UI TYPES / COMPONENTS
// ============================================================

type Colors = {
  screenBg: string;
  cardBg: string;
  cardBorder: string;
  text: string;
  subText: string;
  inputBg: string;
  primary: string;
  dangerBg: string;
  dangerText: string;
  successBg: string;
  successText: string;
};

type FieldProps = {
  C: Colors;
  label: string;
  value: string;
  onChangeText?: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "numeric";
  returnKeyType?: "done" | "next";
  editable?: boolean;
};

const Field = memo(function Field({
  C,
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  returnKeyType = "next",
  editable = true,
}: FieldProps) {
  return (
    <View style={{ marginTop: 14 }}>
      <Text
        style={{
          color: C.text,
          fontSize: 13,
          fontWeight: "800",
          marginBottom: 7,
        }}
      >
        {label}
      </Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.subText}
        keyboardType={keyboardType}
        returnKeyType={returnKeyType}
        blurOnSubmit={false}
        editable={editable}
        selectTextOnFocus={editable}
        style={{
          minHeight: 48,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: C.cardBorder,
          backgroundColor: C.inputBg,
          paddingHorizontal: 13,
          color: editable ? C.text : C.subText,
          fontSize: 14,
          fontWeight: "700",
          opacity: editable ? 1 : 0.9,
        }}
      />
    </View>
  );
});

type DateFieldProps = {
  C: Colors;
  label: string;
  value: string;
  onPress: () => void;
  disabled?: boolean;
};

const DateField = memo(function DateField({
  C,
  label,
  value,
  onPress,
  disabled = false,
}: DateFieldProps) {
  return (
    <View style={{ marginTop: 14 }}>
      <Text
        style={{
          color: C.text,
          fontSize: 13,
          fontWeight: "800",
          marginBottom: 7,
        }}
      >
        {label}
      </Text>

      <Pressable
        disabled={disabled}
        onPress={onPress}
        style={{
          minHeight: 48,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: C.cardBorder,
          backgroundColor: C.inputBg,
          paddingHorizontal: 13,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          opacity: disabled ? 0.65 : 1,
        }}
      >
        <Text
          style={{
            flex: 1,
            color: C.text,
            fontSize: 14,
            fontWeight: "700",
          }}
        >
          {formatDateForDisplay(value)}
        </Text>

        <Ionicons name="calendar-outline" size={20} color={C.primary} />
      </Pressable>
    </View>
  );
});

// ============================================================
// SCREEN
// ============================================================

export default function AddSamplingScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const me = useSelector((state: RootState) => state.me?.me);
  const themeMode = useSelector(
    (state: RootState) => (state as any).theme?.mode,
  );
  const dark = themeMode === "DARK";

  const C: Colors = useMemo(
    () =>
      dark
        ? {
            screenBg: "#050B16",
            cardBg: "#0B1220",
            cardBorder: "rgba(255,255,255,0.08)",
            text: "#FFFFFF",
            subText: "rgba(255,255,255,0.58)",
            inputBg: "rgba(255,255,255,0.05)",
            primary: "#2563EB",
            dangerBg: "rgba(244,63,94,0.14)",
            dangerText: "#FB7185",
            successBg: "rgba(34,197,94,0.12)",
            successText: "#4ADE80",
          }
        : {
            screenBg: "#E8EEF6",
            cardBg: "#EEF3FF",
            cardBorder: "#C0CEEA",
            text: "#0F172A",
            subText: "#5A6E8F",
            inputBg: "#F8FAFC",
            primary: "#1D4ED8",
            dangerBg: "#FDE8EC",
            dangerText: "#E11D48",
            successBg: "#DCFCE7",
            successText: "#15803D",
          },
    [dark],
  );

  // ==========================================================
  // ROUTE / USER DATA
  // ==========================================================

  const userId = toNumericUserId(
    pickId(
      params.userId,
      params.farmerId,
      (me as any)?.user_id,
      (me as any)?.id,
      (me as any)?.owner_id,
      (me as any)?.owner_code,
    ),
  );

  const farmId = pickId(params.farmDbId, params.farmId);
  const pondId = pickId(params.pondDbId, params.pondId);

  const cultureCycleId = pickId(
    params.cultureCycleId,
    params.culture_cycle_id,
    params.cycleId,
  );

  const qrCodeId = pickId(params.qrCodeId, params.qr_code_id, params.qrId);

  const qrCode = pickId(
    params.qrCode,
    params.qr_code,
    params.code,
    params.qrValue,
    params.pondQr,
  );

  const farmName = pickText(params.farmName, "Farm");
  const pondName = pickText(params.pondName, "Pond");

  const pondVerificationStatus = pickText(
    params.pond_verification_status,
    params.pondVerificationStatus,
    params.verification_status,
    "Verified",
  );

  const routeStockingDate = normalizeYmdDate(
    pickText(
      params.stockingDate,
      params.stocking_date,
      params.stockedDate,
      params.stocked_date,
      "",
    ),
  );

  const routeTotalPlStocked = pickText(
    params.totalPlStocked,
    params.total_pl_stocked,
    params.total_pl_stock,
    "",
  );

  // ==========================================================
  // FORM STATE
  // ==========================================================

  const [samplingDate, setSamplingDate] = useState(todayDate());
  const [showSamplingDatePicker, setShowSamplingDatePicker] = useState(false);

  const [stockingDate, setStockingDate] = useState(routeStockingDate);
  const [sampleCount, setSampleCount] = useState("");
  const [sampleWeight, setSampleWeight] = useState("");
  const [totalPlStocked, setTotalPlStocked] = useState(routeTotalPlStocked);

  const [stockingLoading, setStockingLoading] = useState(false);
  const [stockingError, setStockingError] = useState("");
  const [saving, setSaving] = useState(false);

  // ==========================================================
  // LOAD ACTIVE STOCKING RECORD
  // ==========================================================

  useEffect(() => {
    let mounted = true;

    const loadActiveStocking = async () => {
      // If the previous screen already supplied a valid stocking date, keep it
      // as a temporary fallback while the active stocking record is fetched.
      if (routeStockingDate && mounted) {
        setStockingDate(routeStockingDate);
      }

      if (routeTotalPlStocked && mounted) {
        setTotalPlStocked(routeTotalPlStocked);
      }

      if (!cultureCycleId && !pondId && !qrCode) {
        if (mounted && !routeStockingDate) {
          setStockingError("Unable to identify the active stocking record.");
        }
        return;
      }

      try {
        setStockingLoading(true);
        setStockingError("");

        const result: any = await fetchStockingRecords();

        if (!mounted) return;

        if (result?.ok === false) {
          throw new Error(
            result?.message || "Unable to load stocking information.",
          );
        }

        const records = extractArray(result?.data ?? result);
        const activeStocking = selectStockingRecord(
          records,
          cultureCycleId,
          pondId,
          qrCode,
        );

        if (!activeStocking) {
          if (!routeStockingDate) {
            setStockingError(
              "No active stocking record found for this pond/culture cycle.",
            );
          }
          return;
        }

        const fetchedStockingDate = normalizeYmdDate(
          getRecordStockingDate(activeStocking),
        );
        const fetchedTotalPl = getRecordTotalPlStocked(activeStocking);

        if (!fetchedStockingDate) {
          if (!routeStockingDate) {
            setStockingError(
              "Active stocking record does not contain a Stocking Date.",
            );
          }
          return;
        }

        setStockingDate(fetchedStockingDate);

        if (fetchedTotalPl) {
          setTotalPlStocked(fetchedTotalPl);
        }
      } catch (error: any) {
        if (!mounted) return;

        if (!routeStockingDate) {
          setStockingError(
            error?.message || "Unable to load active stocking information.",
          );
        }
      } finally {
        if (mounted) {
          setStockingLoading(false);
        }
      }
    };

    loadActiveStocking();

    return () => {
      mounted = false;
    };
  }, [
    cultureCycleId,
    pondId,
    qrCode,
    routeStockingDate,
    routeTotalPlStocked,
  ]);

  // ==========================================================
  // AUTO DOC
  // DOC = Sampling Date - Stocking Date
  // ==========================================================

  const docNumber = useMemo(() => {
    return calculateDocDays(samplingDate, stockingDate);
  }, [samplingDate, stockingDate]);

  const doc = useMemo(() => {
    if (docNumber === null || docNumber < 0) return "";
    return String(docNumber);
  }, [docNumber]);

  // ==========================================================
  // OTHER AUTO CALCULATIONS
  // ==========================================================

  const calculation = useMemo(() => {
    return calculateSamplingValues({
      sample_count: numberValue(sampleCount),
      sample_weight: numberValue(sampleWeight),
      total_pl_stocked: numberValue(totalPlStocked),
      total_pl_stock: numberValue(totalPlStocked),
    });
  }, [sampleCount, sampleWeight, totalPlStocked]);

  const qrReady = !!pondId;

  // ==========================================================
  // DATE PICKER
  // ==========================================================

  const samplingDateObject = useMemo(
    () => parseYmdLocal(samplingDate) || new Date(),
    [samplingDate],
  );

  const minimumSamplingDate = useMemo(() => {
    return stockingDate ? parseYmdLocal(stockingDate) ?? undefined : undefined;
  }, [stockingDate]);

  const openSamplingDatePicker = () => {
    setShowSamplingDatePicker(true);
  };

  const handleSamplingDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (Platform.OS === "android") {
      setShowSamplingDatePicker(false);
    }

    if (event.type === "dismissed" || !selectedDate) {
      return;
    }

    setSamplingDate(dateToYmd(selectedDate));
  };

  // ==========================================================
  // SUBMIT
  // ==========================================================

  const submit = async () => {
    if (saving || stockingLoading) return;

    if (!qrReady) {
      Alert.alert("Pond QR Required", "Scan Pond QR before adding sampling log.");
      return;
    }

    if (!farmId) {
      Alert.alert("Farm Missing", "Farm ID is missing from QR flow.");
      return;
    }

    if (!cultureCycleId) {
      Alert.alert(
        "Culture Cycle Missing",
        "Create culture cycle before sampling.",
      );
      return;
    }

    if (toUtcDay(samplingDate) === null) {
      Alert.alert("Invalid Date", "Please select a valid Sampling Date.");
      return;
    }

    if (!stockingDate || toUtcDay(stockingDate) === null) {
      Alert.alert(
        "Stocking Date Missing",
        "Unable to calculate DOC because the active Stocking Date is unavailable.",
      );
      return;
    }

    // Always recalculate immediately before submit. Do not read DOC from user
    // input. DOC = 0 is valid when both dates are the same day.
    const docValue = calculateDocDays(samplingDate, stockingDate);

    if (docValue === null) {
      Alert.alert(
        "Invalid DOC",
        "Unable to calculate DOC from Sampling Date and Stocking Date.",
      );
      return;
    }

    if (docValue < 0) {
      Alert.alert(
        "Invalid Sampling Date",
        "Sampling Date cannot be before the Stocking Date.",
      );
      return;
    }

    const sampleCountValue = numberValue(sampleCount);
    const sampleWeightValue = numberValue(sampleWeight);
    const totalPlValue = numberValue(totalPlStocked);

    if (sampleCountValue <= 0) {
      Alert.alert(
        "Invalid Sample Count",
        "Sample count must be greater than zero.",
      );
      return;
    }

    if (sampleWeightValue <= 0) {
      Alert.alert(
        "Invalid Sample Weight",
        "Sample weight must be greater than zero.",
      );
      return;
    }

    if (totalPlValue <= 0) {
      Alert.alert(
        "Invalid PL Stocked",
        "Enter total PL stocked from stocking data.",
      );
      return;
    }

    const payload: any = {
      user_id: userId,
      farmer_id: userId,

      farm_id: farmId,
      pond_id: pondId,
      culture_cycle_id: cultureCycleId,

      qr_code_id: qrCodeId || qrCode || undefined,
      qrcode_id: qrCodeId || qrCode || undefined,
      qr_code: qrCode || undefined,
      pond_qr: qrCode || undefined,

      pond_verification_status: "Verified",
      verification_status: "Verified",
      pond_status: "Verified",

      sampling_date: samplingDate,
      samplingDate,

      // Auto-calculated, never manually entered.
      doc: docValue,
      DOC: docValue,
      DoC: docValue,

      sample_count: sampleCountValue,
      sampleCount: sampleCountValue,

      sample_weight: sampleWeightValue,
      sample_weight_g: sampleWeightValue,
      sampleWeight: sampleWeightValue,

      abw: calculation.abw,
      ABW: calculation.abw,

      size_count_per_kg: calculation.size_count_per_kg,
      size: calculation.size_count_per_kg,
      size_count: calculation.size_count_per_kg,

      total_pl_stock: totalPlValue,
      total_pl_stocked: totalPlValue,
      totalPlStocked: totalPlValue,

      expected_biomass: calculation.expected_biomass,
      expected_biomass_kg: calculation.expected_biomass,
      expectedBiomass: calculation.expected_biomass,
    };

    console.log("SAMPLING PAYLOAD:", payload);
    console.log("STOCKING DATE:", stockingDate);
    console.log("SAMPLING DATE:", samplingDate);
    console.log("AUTO DOC:", docValue);

    try {
      setSaving(true);

      await createSamplingRecord(payload);

      Alert.alert("Success", "Sampling record submitted successfully.", [
        {
          text: "OK",
          onPress: () => router.replace("/(aqua)/sampling" as any),
        },
      ]);
    } catch (error: any) {
      Alert.alert(
        "Submit Failed",
        error?.message || "Unable to submit sampling record.",
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <View style={{ flex: 1, backgroundColor: C.screenBg }}>
      <View
        style={{
          paddingTop: insets.top + 10,
          paddingHorizontal: 16,
          paddingBottom: 12,
          backgroundColor: C.screenBg,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable
            onPress={() => router.back()}
            style={{
              height: 42,
              width: 42,
              borderRadius: 14,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: C.cardBg,
              borderWidth: 1,
              borderColor: C.cardBorder,
            }}
          >
            <Ionicons name="chevron-back" size={24} color={C.text} />
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: C.text,
                fontSize: 22,
                fontWeight: "900",
              }}
            >
              Sampling Log
            </Text>

            <Text
              style={{
                color: C.subText,
                fontSize: 12,
                marginTop: 2,
              }}
            >
              Pond QR based sampling entry
            </Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 20 : 0}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: insets.bottom + 30,
          }}
        >
          {/* LINKED POND */}
          <View
            style={{
              borderRadius: 18,
              borderWidth: 1,
              borderColor: C.cardBorder,
              backgroundColor: C.cardBg,
              padding: 14,
            }}
          >
            <Text
              style={{
                color: C.text,
                fontSize: 16,
                fontWeight: "900",
              }}
            >
              Linked Pond
            </Text>

            <View style={{ marginTop: 12, gap: 8 }}>
              <Text style={{ color: C.subText, fontSize: 12 }}>
                Farm:{" "}
                <Text style={{ color: C.text, fontWeight: "800" }}>
                  {farmName}
                </Text>
              </Text>

              <Text style={{ color: C.subText, fontSize: 12 }}>
                Farm ID:{" "}
                <Text style={{ color: C.text, fontWeight: "800" }}>
                  {farmId || "-"}
                </Text>
              </Text>

              <Text style={{ color: C.subText, fontSize: 12 }}>
                Pond:{" "}
                <Text style={{ color: C.text, fontWeight: "800" }}>
                  {pondName}
                </Text>
              </Text>

              <Text style={{ color: C.subText, fontSize: 12 }}>
                Pond ID:{" "}
                <Text style={{ color: C.text, fontWeight: "800" }}>
                  {pondId || "-"}
                </Text>
              </Text>

              <Text style={{ color: C.subText, fontSize: 12 }}>
                Culture Cycle ID:{" "}
                <Text style={{ color: C.text, fontWeight: "800" }}>
                  {cultureCycleId || "-"}
                </Text>
              </Text>

              <Text style={{ color: C.subText, fontSize: 12 }}>
                Pond Verification:{" "}
                <Text style={{ color: C.text, fontWeight: "800" }}>
                  {pondVerificationStatus || "Verified"}
                </Text>
              </Text>

              <Text style={{ color: C.subText, fontSize: 12 }}>
                QR Code:{" "}
                <Text style={{ color: C.text, fontWeight: "800" }}>
                  {qrCode || qrCodeId || "-"}
                </Text>
              </Text>
            </View>

            {!qrReady ? (
              <View
                style={{
                  marginTop: 12,
                  borderRadius: 13,
                  backgroundColor: C.dangerBg,
                  padding: 11,
                }}
              >
                <Text
                  style={{
                    color: C.dangerText,
                    fontSize: 12,
                    fontWeight: "800",
                    lineHeight: 18,
                  }}
                >
                  Pond QR is required. Open this screen from QR scanner or
                  activated pond flow.
                </Text>
              </View>
            ) : null}
          </View>

          {/* SAMPLING DETAILS */}
          <View
            style={{
              marginTop: 14,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: C.cardBorder,
              backgroundColor: C.cardBg,
              padding: 14,
            }}
          >
            <Text
              style={{
                color: C.text,
                fontSize: 16,
                fontWeight: "900",
              }}
            >
              Sampling Details
            </Text>

            <DateField
              C={C}
              label="Sampling Date"
              value={samplingDate}
              onPress={openSamplingDatePicker}
              disabled={saving}
            />

            {showSamplingDatePicker ? (
              <View
                style={{
                  marginTop: 10,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: C.cardBorder,
                  backgroundColor: C.inputBg,
                  padding: Platform.OS === "ios" ? 8 : 0,
                  overflow: "hidden",
                }}
              >
                <DateTimePicker
                  value={samplingDateObject}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={handleSamplingDateChange}
                  minimumDate={minimumSamplingDate}
                  maximumDate={new Date()}
                />

                {Platform.OS === "ios" ? (
                  <Pressable
                    onPress={() => setShowSamplingDatePicker(false)}
                    style={{
                      margin: 8,
                      marginTop: 2,
                      borderRadius: 12,
                      backgroundColor: C.primary,
                      paddingVertical: 10,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: "#FFFFFF",
                        fontSize: 14,
                        fontWeight: "900",
                      }}
                    >
                      Done
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {/* Stocking Date comes from active stocking record */}
            <View style={{ marginTop: 14 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 7,
                }}
              >
                <Text
                  style={{
                    color: C.text,
                    fontSize: 13,
                    fontWeight: "800",
                  }}
                >
                  Stocking Date
                </Text>

                {stockingLoading ? (
                  <ActivityIndicator size="small" color={C.primary} />
                ) : null}
              </View>

              <View
                style={{
                  minHeight: 48,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: C.cardBorder,
                  backgroundColor: C.inputBg,
                  paddingHorizontal: 13,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text
                  style={{
                    flex: 1,
                    color: stockingDate ? C.text : C.subText,
                    fontSize: 14,
                    fontWeight: "700",
                  }}
                >
                  {stockingLoading
                    ? "Loading active stocking record..."
                    : stockingDate
                      ? formatDateForDisplay(stockingDate)
                      : "Stocking date unavailable"}
                </Text>

                <Ionicons name="lock-closed" size={17} color={C.subText} />
              </View>
            </View>

            {stockingError ? (
              <View
                style={{
                  marginTop: 10,
                  borderRadius: 12,
                  backgroundColor: C.dangerBg,
                  padding: 10,
                }}
              >
                <Text
                  style={{
                    color: C.dangerText,
                    fontSize: 12,
                    fontWeight: "800",
                    lineHeight: 18,
                  }}
                >
                  {stockingError}
                </Text>
              </View>
            ) : null}

            {/* DOC is read-only and recalculates automatically */}
            <View style={{ marginTop: 14 }}>
              <Text
                style={{
                  color: C.text,
                  fontSize: 13,
                  fontWeight: "800",
                  marginBottom: 7,
                }}
              >
                DOC (Days of Culture)
              </Text>

              <View
                style={{
                  minHeight: 48,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: C.cardBorder,
                  backgroundColor: C.inputBg,
                  paddingHorizontal: 13,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text
                  style={{
                    color: doc !== "" ? C.text : C.subText,
                    fontSize: 14,
                    fontWeight: "800",
                  }}
                >
                  {doc !== "" ? doc : "Auto-calculated"}
                </Text>

                <Ionicons name="lock-closed" size={17} color={C.subText} />
              </View>

              <Text
                style={{
                  color: C.subText,
                  fontSize: 11,
                  marginTop: 6,
                  lineHeight: 16,
                }}
              >
                DOC = Sampling Date - Stocking Date
              </Text>

              {docNumber !== null && docNumber >= 0 && stockingDate ? (
                <View
                  style={{
                    marginTop: 8,
                    borderRadius: 12,
                    backgroundColor: C.successBg,
                    padding: 9,
                  }}
                >
                  <Text
                    style={{
                      color: C.successText,
                      fontSize: 11,
                      fontWeight: "800",
                    }}
                  >
                    {formatDateForDisplay(samplingDate)} - {" "}
                    {formatDateForDisplay(stockingDate)} = {docNumber} day
                    {docNumber === 1 ? "" : "s"}
                  </Text>
                </View>
              ) : null}
            </View>

            <Field
              C={C}
              label="Sample Count"
              value={sampleCount}
              onChangeText={setSampleCount}
              placeholder="Example: 100"
              keyboardType="numeric"
            />

            <Field
              C={C}
              label="Sample Weight (g)"
              value={sampleWeight}
              onChangeText={setSampleWeight}
              placeholder="Example: 320"
              keyboardType="numeric"
            />

            <Field
              C={C}
              label="Total PL Stocked"
              value={totalPlStocked}
              onChangeText={setTotalPlStocked}
              placeholder="Example: 300000"
              keyboardType="numeric"
              returnKeyType="done"
            />
          </View>

          {/* AUTO CALCULATIONS */}
          <View
            style={{
              marginTop: 14,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: C.cardBorder,
              backgroundColor: C.cardBg,
              padding: 14,
            }}
          >
            <Text
              style={{
                color: C.text,
                fontSize: 16,
                fontWeight: "900",
              }}
            >
              Auto Calculation
            </Text>

            <View style={{ marginTop: 12, gap: 10 }}>
              <View
                style={{
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: C.cardBorder,
                  padding: 12,
                }}
              >
                <Text style={{ color: C.subText, fontSize: 12 }}>ABW (g)</Text>

                <Text
                  style={{
                    color: C.text,
                    fontSize: 22,
                    fontWeight: "900",
                    marginTop: 4,
                  }}
                >
                  {calculation.abw}
                </Text>
              </View>

              <View
                style={{
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: C.cardBorder,
                  padding: 12,
                }}
              >
                <Text style={{ color: C.subText, fontSize: 12 }}>
                  Size (Count/kg)
                </Text>

                <Text
                  style={{
                    color: C.text,
                    fontSize: 22,
                    fontWeight: "900",
                    marginTop: 4,
                  }}
                >
                  {calculation.size_count_per_kg}
                </Text>
              </View>

              <View
                style={{
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: C.cardBorder,
                  padding: 12,
                }}
              >
                <Text style={{ color: C.subText, fontSize: 12 }}>
                  Expected Biomass (kg)
                </Text>

                <Text
                  style={{
                    color: C.text,
                    fontSize: 22,
                    fontWeight: "900",
                    marginTop: 4,
                  }}
                >
                  {calculation.expected_biomass}
                </Text>
              </View>
            </View>
          </View>

          {/* SUBMIT */}
          <Pressable
            disabled={saving || stockingLoading}
            onPress={submit}
            style={{
              marginTop: 16,
              borderRadius: 15,
              backgroundColor: C.primary,
              paddingVertical: 14,
              alignItems: "center",
              opacity: saving || stockingLoading ? 0.65 : 1,
            }}
          >
            {saving || stockingLoading ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <ActivityIndicator color="#FFFFFF" />
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: 15,
                    fontWeight: "900",
                  }}
                >
                  {saving ? "Submitting..." : "Loading Stocking Data..."}
                </Text>
              </View>
            ) : (
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 15,
                  fontWeight: "900",
                }}
              >
                Submit Sampling Record
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}