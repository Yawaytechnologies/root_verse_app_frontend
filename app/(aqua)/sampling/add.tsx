import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { memo, useMemo, useState } from "react";
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

function todayDate() {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

function numberValue(value: string) {
  const cleaned = String(value || "").replace(/,/g, "").trim();
  const num = Number(cleaned);

  return Number.isFinite(num) ? num : 0;
}

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
};

type FieldProps = {
  C: Colors;
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "numeric";
  returnKeyType?: "done" | "next";
};

const Field = memo(function Field({
  C,
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  returnKeyType = "next",
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
        style={{
          minHeight: 48,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: C.cardBorder,
          backgroundColor: C.inputBg,
          paddingHorizontal: 13,
          color: C.text,
          fontSize: 14,
          fontWeight: "700",
        }}
      />
    </View>
  );
});

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
          },
    [dark],
  );

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

  const [samplingDate, setSamplingDate] = useState(todayDate());
  const [doc, setDoc] = useState("");
  const [sampleCount, setSampleCount] = useState("");
  const [sampleWeight, setSampleWeight] = useState("");

  const [totalPlStocked, setTotalPlStocked] = useState(
    pickText(
      params.totalPlStocked,
      params.total_pl_stocked,
      params.total_pl_stock,
      "",
    ),
  );

  const [saving, setSaving] = useState(false);

  const calculation = useMemo(() => {
    return calculateSamplingValues({
      sample_count: numberValue(sampleCount),
      sample_weight: numberValue(sampleWeight),
      total_pl_stocked: numberValue(totalPlStocked),
      total_pl_stock: numberValue(totalPlStocked),
    });
  }, [sampleCount, sampleWeight, totalPlStocked]);

  const qrReady = !!pondId;

  const submit = async () => {
    if (saving) return;

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

    const docValue = numberValue(doc);
    const sampleCountValue = numberValue(sampleCount);
    const sampleWeightValue = numberValue(sampleWeight);
    const totalPlValue = numberValue(totalPlStocked);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(samplingDate)) {
      Alert.alert("Invalid Date", "Enter sampling date as YYYY-MM-DD.");
      return;
    }

    if (docValue <= 0) {
      Alert.alert("Invalid DOC", "DOC must be greater than zero.");
      return;
    }

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
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: insets.bottom + 30,
          }}
        >
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

            <Field
              C={C}
              label="Sampling Date"
              value={samplingDate}
              onChangeText={setSamplingDate}
              placeholder="YYYY-MM-DD"
              keyboardType="default"
            />

            <Field
              C={C}
              label="DOC"
              value={doc}
              onChangeText={setDoc}
              placeholder="Example: 15"
              keyboardType="numeric"
            />

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

          <Pressable
            disabled={saving}
            onPress={submit}
            style={{
              marginTop: 16,
              borderRadius: 15,
              backgroundColor: C.primary,
              paddingVertical: 14,
              alignItems: "center",
              opacity: saving ? 0.65 : 1,
            }}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
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