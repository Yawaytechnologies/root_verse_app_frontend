// app/(aqua)/harvest/create-request.tsx

import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { router, useLocalSearchParams } from "expo-router";
import React, { memo, useMemo, useState } from "react";
import {
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

import {
  submitHarvestRequest,
  type HarvestPayload,
} from "../../../src/services/aqua/harvest.service";

function paramValue(value: any) {
  if (Array.isArray(value)) return String(value[0] ?? "").trim();
  return String(value ?? "").trim();
}

function pickId(...values: any[]) {
  for (const value of values) {
    const text = paramValue(value);

    if (
      text &&
      text !== "0" &&
      text !== "undefined" &&
      text !== "null" &&
      Number.isFinite(Number(text))
    ) {
      return text;
    }
  }

  return "";
}

function pickText(...values: any[]) {
  for (const value of values) {
    const text = paramValue(value);

    if (text && text !== "undefined" && text !== "null") {
      return text;
    }
  }

  return "";
}

function toNumberValue(value: string) {
  const cleaned = String(value || "").replace(/,/g, "").trim();
  if (!cleaned) return undefined;

  const num = Number(cleaned);
  return Number.isFinite(num) ? num : undefined;
}

function toDateOnly(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateTimeForDisplay(date: Date | null) {
  if (!date) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

type Colors = {
  screenBg: string;
  cardBg: string;
  cardBorder: string;
  text: string;
  subText: string;
  inputBg: string;
  primary: string;
  greenBg: string;
  greenBorder: string;
  greenText: string;
};

type FieldProps = {
  C: Colors;
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "numeric";
  multiline?: boolean;
  required?: boolean;
};

const Field = memo(function Field({
  C,
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  multiline = false,
  required = false,
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
        {required ? <Text style={{ color: "#E11D48" }}> *</Text> : null}
      </Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.subText}
        keyboardType={keyboardType}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        autoCapitalize="none"
        autoCorrect={false}
        style={{
          minHeight: multiline ? 92 : 48,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: C.cardBorder,
          backgroundColor: C.inputBg,
          paddingHorizontal: 13,
          paddingVertical: multiline ? 12 : 0,
          color: C.text,
          fontSize: 14,
          fontWeight: "700",
        }}
      />
    </View>
  );
});

function SelectDateField({
  C,
  label,
  value,
  placeholder,
  required,
  onPress,
}: {
  C: Colors;
  label: string;
  value: string;
  placeholder: string;
  required?: boolean;
  onPress: () => void;
}) {
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
        {required ? <Text style={{ color: "#E11D48" }}> *</Text> : null}
      </Text>

      <Pressable
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
          gap: 10,
        }}
      >
        <Text
          style={{
            flex: 1,
            color: value ? C.text : C.subText,
            fontSize: 14,
            fontWeight: "700",
          }}
        >
          {value || placeholder}
        </Text>

        <Ionicons name="calendar-outline" size={22} color={C.subText} />
      </Pressable>
    </View>
  );
}

function InfoRow({
  C,
  label,
  value,
}: {
  C: Colors;
  label: string;
  value: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 12,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(148,163,184,0.18)",
      }}
    >
      <Text style={{ flex: 1, color: C.subText, fontSize: 14 }}>{label}</Text>

      <Text
        style={{
          flex: 1,
          color: C.text,
          fontSize: 14,
          fontWeight: "900",
          textAlign: "right",
        }}
        numberOfLines={2}
      >
        {value || "-"}
      </Text>
    </View>
  );
}

export default function HarvestCreateRequestScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const C: Colors = useMemo(
    () => ({
      screenBg: "#F5F7FB",
      cardBg: "#FFFFFF",
      cardBorder: "#E2E8F0",
      text: "#0F172A",
      subText: "#64748B",
      inputBg: "#F8FAFC",
      primary: "#047857",
      greenBg: "#ECFDF5",
      greenBorder: "#A7F3D0",
      greenText: "#064E3B",
    }),
    [],
  );

  const cultureId = pickId(
    params.cultureId,
    params.culture_id,
    params.cultureCycleId,
    params.culture_cycle_id,
  );

  const qrCodeId = pickId(
    params.qrCodeId,
    params.qr_code_id,
    params.qrcodeId,
    params.qrcode_id,
  );

  const qrCode = pickText(
    params.qrCode,
    params.qr_code,
    params.qrs_code,
    params.code,
  );

  const farmId = pickText(params.farmId, params.farm_id);
  const pondId = pickText(params.pondId, params.pond_id);

  const [harvestMethod, setHarvestMethod] = useState<"" | "Partial" | "Full">(
    "",
  );

  const [doc, setDoc] = useState("");
  const [preferredHarvestDate, setPreferredHarvestDate] =
    useState<Date | null>(null);
  const [preferredHarvestTime, setPreferredHarvestTime] = useState("");
  const [expectedSize, setExpectedSize] = useState("");
  const [expectedBiomass, setExpectedBiomass] = useState("");
  const [species, setSpecies] = useState("");
  const [harvestReason, setHarvestReason] = useState("");
  const [stockingDateObj, setStockingDateObj] = useState<Date | null>(null);
  const [stockingDate, setStockingDate] = useState("");

  const [showPreferredPicker, setShowPreferredPicker] = useState(false);
  const [preferredPickerMode, setPreferredPickerMode] = useState<
    "date" | "time"
  >("date");

  const [showStockingPicker, setShowStockingPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const openPreferredPicker = () => {
    setPreferredPickerMode("date");
    setShowPreferredPicker(true);
  };

  const openStockingPicker = () => {
    setShowStockingPicker(true);
  };

  const handlePreferredPickerChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (event.type === "dismissed") {
      setShowPreferredPicker(false);
      return;
    }

    if (!selectedDate) return;

    if (Platform.OS === "android") {
      setShowPreferredPicker(false);

      if (preferredPickerMode === "date") {
        const current = preferredHarvestDate || new Date();

        const updatedDate = new Date(selectedDate);
        updatedDate.setHours(current.getHours());
        updatedDate.setMinutes(current.getMinutes());
        updatedDate.setSeconds(0);
        updatedDate.setMilliseconds(0);

        setPreferredHarvestDate(updatedDate);
        setPreferredHarvestTime(updatedDate.toISOString());

        setPreferredPickerMode("time");

        setTimeout(() => {
          setShowPreferredPicker(true);
        }, 100);

        return;
      }

      const baseDate = preferredHarvestDate || new Date();

      const finalDate = new Date(baseDate);
      finalDate.setHours(selectedDate.getHours());
      finalDate.setMinutes(selectedDate.getMinutes());
      finalDate.setSeconds(0);
      finalDate.setMilliseconds(0);

      setPreferredHarvestDate(finalDate);
      setPreferredHarvestTime(finalDate.toISOString());

      return;
    }

    const iosDate = new Date(selectedDate);
    iosDate.setSeconds(0);
    iosDate.setMilliseconds(0);

    setPreferredHarvestDate(iosDate);
    setPreferredHarvestTime(iosDate.toISOString());
  };

  const handleStockingPickerChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (Platform.OS === "android") {
      setShowStockingPicker(false);
    }

    if (event.type === "dismissed") {
      return;
    }

    if (!selectedDate) return;

    const dateOnly = new Date(selectedDate);
    setStockingDateObj(dateOnly);
    setStockingDate(toDateOnly(dateOnly));
  };

  const closeIosPreferredPicker = () => {
    setShowPreferredPicker(false);
  };

  const closeIosStockingPicker = () => {
    setShowStockingPicker(false);
  };

  const validate = () => {
    if (!cultureId) {
      Alert.alert("Failed", "Culture ID not found. Please scan Pond QR again.");
      return false;
    }

    if (!qrCodeId) {
      Alert.alert("Failed", "QR Code ID not found. Please scan Pond QR again.");
      return false;
    }

    if (!harvestMethod) {
      Alert.alert("Validation", "Please select harvest method.");
      return false;
    }

    if (!doc.trim() || !Number.isFinite(Number(doc))) {
      Alert.alert("Validation", "DOC is required and must be a number.");
      return false;
    }

    if (!preferredHarvestTime.trim()) {
      Alert.alert("Validation", "Preferred harvest time is required.");
      return false;
    }

    if (!expectedSize.trim()) {
      Alert.alert("Validation", "Expected size is required.");
      return false;
    }

    const biomass = toNumberValue(expectedBiomass);

    if (biomass === undefined || biomass <= 0) {
      Alert.alert("Validation", "Expected biomass must be greater than 0.");
      return false;
    }

    if (!species.trim()) {
      Alert.alert("Validation", "Species is required.");
      return false;
    }

    if (!harvestReason.trim()) {
      Alert.alert("Validation", "Harvest reason is required.");
      return false;
    }

    if (!stockingDate.trim()) {
      Alert.alert("Validation", "Stocking date is required.");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setSubmitting(true);

      const biomass = toNumberValue(expectedBiomass);

      const payload: HarvestPayload = {
        culture_id: Number(cultureId),
        qr_code_id: Number(qrCodeId),
        DOC: Number(doc),
        preferred_harvest_time: preferredHarvestTime,
        expected_size: expectedSize.trim(),
        expected_biomass: biomass || 0,
        harvest_method: harvestMethod as "Partial" | "Full",
        species: species.trim(),
        harvest_reason: harvestReason.trim(),
        stocking_date: stockingDate,
      };

      console.log("HARVEST FINAL PAYLOAD:", JSON.stringify(payload, null, 2));

      const response = await submitHarvestRequest(payload);

      if (!response.ok) {
        Alert.alert(
          "Failed",
          response.message || "Harvest request submission failed.",
        );
        return;
      }

      Alert.alert("Success", "Harvest request created successfully.", [
        {
          text: "OK",
          onPress: () => router.replace("/(aqua)/tabs/dashboard"),
        },
      ]);
    } catch (error: any) {
      Alert.alert(
        "Failed",
        error?.message || "Harvest request submission failed.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.screenBg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 16,
          paddingTop: insets.top + 8,
          paddingBottom: 36,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable
            onPress={() => router.back()}
            style={{
              width: 46,
              height: 46,
              borderRadius: 16,
              backgroundColor: C.cardBg,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: C.cardBorder,
            }}
          >
            <Ionicons name="arrow-back" size={24} color={C.text} />
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text style={{ color: C.text, fontSize: 27, fontWeight: "900" }}>
              Harvest Request
            </Text>

            <Text style={{ color: C.subText, fontSize: 14, marginTop: 2 }}>
              Fill harvest details manually
            </Text>
          </View>
        </View>

        <View
          style={{
            marginTop: 18,
            backgroundColor: C.greenBg,
            borderColor: C.greenBorder,
            borderWidth: 1,
            borderRadius: 18,
            padding: 16,
          }}
        >
          <Text
            style={{
              color: C.greenText,
              fontSize: 18,
              fontWeight: "900",
            }}
          >
            Linked QR Details
          </Text>

          <View style={{ marginTop: 12 }}>
            <InfoRow C={C} label="Culture ID" value={cultureId} />
            <InfoRow C={C} label="QR Code ID" value={qrCodeId} />
            <InfoRow C={C} label="QR Code" value={qrCode} />
            <InfoRow C={C} label="Farm ID" value={farmId} />
            <InfoRow C={C} label="Pond ID" value={pondId} />
          </View>
        </View>

        <View
          style={{
            marginTop: 18,
            backgroundColor: C.cardBg,
            borderColor: C.cardBorder,
            borderWidth: 1,
            borderRadius: 18,
            padding: 16,
          }}
        >
          <Text style={{ color: C.text, fontSize: 20, fontWeight: "900" }}>
            Harvest Details
          </Text>

          <Text
            style={{
              color: C.text,
              fontSize: 13,
              fontWeight: "800",
              marginTop: 16,
              marginBottom: 8,
            }}
          >
            Harvest Method <Text style={{ color: "#E11D48" }}>*</Text>
          </Text>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <Pressable
              onPress={() => setHarvestMethod("Partial")}
              style={{
                flex: 1,
                borderRadius: 16,
                paddingVertical: 15,
                alignItems: "center",
                borderWidth: 1,
                borderColor:
                  harvestMethod === "Partial" ? C.primary : C.cardBorder,
                backgroundColor:
                  harvestMethod === "Partial" ? C.primary : C.inputBg,
              }}
            >
              <Text
                style={{
                  color: harvestMethod === "Partial" ? "#FFFFFF" : C.text,
                  fontSize: 15,
                  fontWeight: "900",
                }}
              >
                Partial
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setHarvestMethod("Full")}
              style={{
                flex: 1,
                borderRadius: 16,
                paddingVertical: 15,
                alignItems: "center",
                borderWidth: 1,
                borderColor:
                  harvestMethod === "Full" ? C.primary : C.cardBorder,
                backgroundColor:
                  harvestMethod === "Full" ? C.primary : C.inputBg,
              }}
            >
              <Text
                style={{
                  color: harvestMethod === "Full" ? "#FFFFFF" : C.text,
                  fontSize: 15,
                  fontWeight: "900",
                }}
              >
                Full
              </Text>
            </Pressable>
          </View>

          <Field
            C={C}
            label="DOC"
            value={doc}
            onChangeText={setDoc}
            placeholder="Example: 45"
            keyboardType="numeric"
            required
          />

          <SelectDateField
            C={C}
            label="Preferred Harvest Time"
            value={formatDateTimeForDisplay(preferredHarvestDate)}
            placeholder="Select preferred harvest date and time"
            required
            onPress={openPreferredPicker}
          />

          {showPreferredPicker ? (
            <View style={{ marginTop: 10 }}>
              <DateTimePicker
                value={preferredHarvestDate || new Date()}
                mode={
                  Platform.OS === "ios" ? "datetime" : preferredPickerMode
                }
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={handlePreferredPickerChange}
              />

              {Platform.OS === "ios" ? (
                <Pressable
                  onPress={closeIosPreferredPicker}
                  style={{
                    marginTop: 8,
                    borderRadius: 12,
                    paddingVertical: 10,
                    alignItems: "center",
                    backgroundColor: C.primary,
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

          <Text style={{ color: C.subText, fontSize: 12, marginTop: 6 }}>
            API value will be sent like: 2026-05-24T08:00:00.000Z
          </Text>

          <Field
            C={C}
            label="Expected Size"
            value={expectedSize}
            onChangeText={setExpectedSize}
            placeholder="Example: 35 - 38 Count/kg"
            required
          />

          <Field
            C={C}
            label="Expected Biomass"
            value={expectedBiomass}
            onChangeText={setExpectedBiomass}
            placeholder="Example: 1200"
            keyboardType="numeric"
            required
          />

          <Field
            C={C}
            label="Species"
            value={species}
            onChangeText={setSpecies}
            placeholder="Example: Vannamei"
            required
          />

          <Field
            C={C}
            label="Harvest Reason"
            value={harvestReason}
            onChangeText={setHarvestReason}
            placeholder="Example: Market demand"
            multiline
            required
          />

          <SelectDateField
            C={C}
            label="Stocking Date"
            value={stockingDate}
            placeholder="Select stocking date"
            required
            onPress={openStockingPicker}
          />

          {showStockingPicker ? (
            <View style={{ marginTop: 10 }}>
              <DateTimePicker
                value={stockingDateObj || new Date()}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={handleStockingPickerChange}
              />

              {Platform.OS === "ios" ? (
                <Pressable
                  onPress={closeIosStockingPicker}
                  style={{
                    marginTop: 8,
                    borderRadius: 12,
                    paddingVertical: 10,
                    alignItems: "center",
                    backgroundColor: C.primary,
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
        </View>

        <Pressable
          disabled={submitting}
          onPress={handleSubmit}
          style={{
            marginTop: 18,
            borderRadius: 16,
            paddingVertical: 16,
            alignItems: "center",
            backgroundColor: submitting ? "#94A3B8" : C.primary,
          }}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "900" }}>
            {submitting ? "Submitting..." : "Submit Harvest Request"}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.back()}
          style={{
            marginTop: 12,
            borderRadius: 16,
            paddingVertical: 16,
            alignItems: "center",
            backgroundColor: "#E5E7EB",
          }}
        >
          <Text style={{ color: "#111827", fontSize: 16, fontWeight: "900" }}>
            Back
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}