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
import { useSelector } from "react-redux";

import type { RootState } from "../../../src/store/auth/store";

import {
  submitHarvestRequest,
  type HarvestPayload,
} from "../../../src/services/aqua/harvest.service";

/* =========================================================
   HELPERS
========================================================= */

function paramValue(value: any) {
  if (Array.isArray(value)) {
    return String(value[0] ?? "").trim();
  }

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

    if (
      text &&
      text !== "undefined" &&
      text !== "null"
    ) {
      return text;
    }
  }

  return "";
}

function toNumericUserId(value: any) {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return "";
  }

  // Already numeric
  if (/^\d+$/.test(raw)) {
    return String(Number(raw));
  }

  // Example:
  // FARMER001 -> 1
  // OWNER0023 -> 23
  const digits = raw.replace(/\D/g, "");

  return digits ? String(Number(digits)) : "";
}

function toNumberValue(value: string) {
  const cleaned = String(value || "")
    .replace(/,/g, "")
    .trim();

  if (!cleaned) {
    return undefined;
  }

  const num = Number(cleaned);

  return Number.isFinite(num) ? num : undefined;
}

function formatDateTimeForDisplay(date: Date | null) {
  if (!date) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/* =========================================================
   TYPES
========================================================= */

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

/* =========================================================
   FIELD
========================================================= */

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

        {required ? (
          <Text style={{ color: "#E11D48" }}> *</Text>
        ) : null}
      </Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.subText}
        keyboardType={keyboardType}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
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

/* =========================================================
   DATE FIELD
========================================================= */

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

        {required ? (
          <Text style={{ color: "#E11D48" }}> *</Text>
        ) : null}
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

        <Ionicons
          name="calendar-outline"
          size={22}
          color={C.subText}
        />
      </Pressable>
    </View>
  );
}

/* =========================================================
   INFO ROW
========================================================= */

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
      <Text
        style={{
          flex: 1,
          color: C.subText,
          fontSize: 14,
        }}
      >
        {label}
      </Text>

      <Text
        numberOfLines={2}
        style={{
          flex: 1,
          color: C.text,
          fontSize: 14,
          fontWeight: "900",
          textAlign: "right",
        }}
      >
        {value || "-"}
      </Text>
    </View>
  );
}

/* =========================================================
   SCREEN
========================================================= */

export default function HarvestCreateRequestScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  /*
   * Redux login user.
   *
   * This is used as a fallback.
   * Normally QR scan already passes userId / farmerId.
   */
  const me = useSelector(
    (state: RootState) => state.me?.me,
  );

  /* =======================================================
     COLORS
  ======================================================= */

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

  /* =======================================================
     USER ID
  ======================================================= */

  const userId = toNumericUserId(
    pickText(
      params.userId,
      params.user_id,

      params.farmerId,
      params.farmer_id,

      (me as any)?.user_id,
      (me as any)?.id,
      (me as any)?.farmer_id,
      (me as any)?.owner_id,
      (me as any)?.owner_code,
    ),
  );

  /* =======================================================
     LINKED IDS
  ======================================================= */

  const cultureId = pickId(
    params.cultureId,
    params.culture_id,

    params.cultureCycleId,
    params.culture_cycle_id,

    params.culturecycleId,
    params.culturecycle_id,

    params.cycleId,
  );

  const qrCodeId = pickId(
    params.qrCodeId,
    params.qr_code_id,

    params.qrcodeId,
    params.qrcode_id,

    params.qrId,
  );

  const qrCode = pickText(
    params.qrCode,
    params.qr_code,
    params.qrs_code,
    params.code,
    params.qrValue,
    params.pondQr,
  );

  const farmId = pickText(
    params.farmDbId,
    params.farmId,
    params.farm_id,
  );

  const pondId = pickText(
    params.pondDbId,
    params.pondId,
    params.pond_id,
  );

  

  const cultureCode = pickText(
    params.cultureCode,
    params.culture_code,
  );

  const defaultSpecies = pickText(
    params.species,
    params.speciesName,
    params.species_name,
  );

  /* =======================================================
     FORM STATES
  ======================================================= */

  const [harvestMethod, setHarvestMethod] = useState<
    "" | "Partial" | "Full"
  >("");

  const [doc, setDoc] = useState("");

  const [
    preferredHarvestDate,
    setPreferredHarvestDate,
  ] = useState<Date | null>(null);

  const [
    preferredHarvestTime,
    setPreferredHarvestTime,
  ] = useState("");

  const [expectedSize, setExpectedSize] =
    useState("");

  const [expectedBiomass, setExpectedBiomass] =
    useState("");

  const [species, setSpecies] =
    useState(defaultSpecies);

  const [harvestReason, setHarvestReason] =
    useState("");

  /*
   * BUG FIX:
   *
   * STOCKING DATE STATE REMOVED.
   *
   * We do NOT allow the user to manually choose it.
   */

  const [
    showPreferredPicker,
    setShowPreferredPicker,
  ] = useState(false);

  const [
    preferredPickerMode,
    setPreferredPickerMode,
  ] = useState<"date" | "time">("date");

  const [submitting, setSubmitting] =
    useState(false);

  /* =======================================================
     OPEN HARVEST DATE PICKER
  ======================================================= */

  const openPreferredPicker = () => {
    setPreferredPickerMode("date");
    setShowPreferredPicker(true);
  };

  /* =======================================================
     HARVEST DATE/TIME CHANGE
  ======================================================= */

  const handlePreferredPickerChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (event.type === "dismissed") {
      setShowPreferredPicker(false);
      return;
    }

    if (!selectedDate) {
      return;
    }

    /*
     * Android requires date and time to be
     * selected separately.
     */
    if (Platform.OS === "android") {
      setShowPreferredPicker(false);

      if (preferredPickerMode === "date") {
        const current =
          preferredHarvestDate || new Date();

        const updatedDate =
          new Date(selectedDate);

        updatedDate.setHours(
          current.getHours(),
        );

        updatedDate.setMinutes(
          current.getMinutes(),
        );

        updatedDate.setSeconds(0);
        updatedDate.setMilliseconds(0);

        setPreferredHarvestDate(
          updatedDate,
        );

        setPreferredHarvestTime(
          updatedDate.toISOString(),
        );

        setPreferredPickerMode("time");

        setTimeout(() => {
          setShowPreferredPicker(true);
        }, 100);

        return;
      }

      const baseDate =
        preferredHarvestDate ||
        new Date();

      const finalDate =
        new Date(baseDate);

      finalDate.setHours(
        selectedDate.getHours(),
      );

      finalDate.setMinutes(
        selectedDate.getMinutes(),
      );

      finalDate.setSeconds(0);
      finalDate.setMilliseconds(0);

      setPreferredHarvestDate(
        finalDate,
      );

      setPreferredHarvestTime(
        finalDate.toISOString(),
      );

      return;
    }

    /*
     * iOS supports datetime directly.
     */
    const iosDate =
      new Date(selectedDate);

    iosDate.setSeconds(0);
    iosDate.setMilliseconds(0);

    setPreferredHarvestDate(
      iosDate,
    );

    setPreferredHarvestTime(
      iosDate.toISOString(),
    );
  };

  const closeIosPreferredPicker = () => {
    setShowPreferredPicker(false);
  };

  /* =======================================================
     VALIDATION
  ======================================================= */

  const validate = () => {
    /*
     * USER ID FIX
     */
    if (
      !userId ||
      !Number.isFinite(Number(userId)) ||
      Number(userId) <= 0
    ) {
      Alert.alert(
        "Failed",
        "Farmer/User ID not found. Please scan the Pond QR again.",
      );

      return false;
    }

    if (!cultureId) {
      Alert.alert(
        "Failed",
        "Culture ID not found. Please scan Pond QR again.",
      );

      return false;
    }

    if (!qrCodeId) {
      Alert.alert(
        "Failed",
        "QR Code ID not found. Please scan Pond QR again.",
      );

      return false;
    }

    if (!harvestMethod) {
      Alert.alert(
        "Validation",
        "Please select harvest method.",
      );

      return false;
    }

    if (
      !doc.trim() ||
      !Number.isFinite(Number(doc))
    ) {
      Alert.alert(
        "Validation",
        "DOC is required and must be a number.",
      );

      return false;
    }

    if (!preferredHarvestTime.trim()) {
      Alert.alert(
        "Validation",
        "Preferred harvest time is required.",
      );

      return false;
    }

    if (!expectedSize.trim()) {
      Alert.alert(
        "Validation",
        "Expected size is required.",
      );

      return false;
    }

    const biomass =
      toNumberValue(expectedBiomass);

    if (
      biomass === undefined ||
      biomass <= 0
    ) {
      Alert.alert(
        "Validation",
        "Expected biomass must be greater than 0.",
      );

      return false;
    }

    if (!species.trim()) {
      Alert.alert(
        "Validation",
        "Species is required.",
      );

      return false;
    }

    if (!harvestReason.trim()) {
      Alert.alert(
        "Validation",
        "Harvest reason is required.",
      );

      return false;
    }

    /*
     * BUG FIX:
     *
     * NO STOCKING DATE VALIDATION.
     */

    return true;
  };

  /* =======================================================
     SUBMIT
  ======================================================= */

  const handleSubmit = async () => {
    if (submitting) {
      return;
    }

    if (!validate()) {
      return;
    }

    try {
      setSubmitting(true);

      const biomass =
        toNumberValue(expectedBiomass);

      const payload: HarvestPayload = {
        culture_id: Number(cultureId),

        qr_code_id: Number(qrCodeId),

        DOC: Number(doc),

        preferred_harvest_time:
          preferredHarvestTime,

        expected_size:
          expectedSize.trim(),

        expected_biomass:
          biomass || 0,

        harvest_method:
          harvestMethod as
            | "Partial"
            | "Full",

        species:
          species.trim(),

        harvest_reason:
          harvestReason.trim(),

        /*
         * IMPORTANT:
         *
         * stocking_date is intentionally NOT sent.
         *
         * The linked culture/stocking record
         * should provide that value.
         */
      };

      console.log(
        "HARVEST USER ID:",
        userId,
      );

      console.log(
        "HARVEST FINAL PAYLOAD:",
        JSON.stringify(
          payload,
          null,
          2,
        ),
      );

      /*
       * MAIN USER ID BUG FIX:
       *
       * OLD:
       * submitHarvestRequest(payload)
       *
       * NEW:
       * submitHarvestRequest(payload, userId)
       */
      const response =
        await submitHarvestRequest(
          payload,
          userId,
        );

      if (!response.ok) {
        Alert.alert(
          "Failed",
          response.message ||
            "Harvest request submission failed.",
        );

        return;
      }

      Alert.alert(
        "Success",
        "Harvest request created successfully.",
        [
          {
            text: "OK",
            onPress: () =>
              router.replace(
                "/(aqua)/tabs/dashboard",
              ),
          },
        ],
      );
    } catch (error: any) {
      console.error(
        "HARVEST SUBMIT ERROR:",
        error,
      );

      Alert.alert(
        "Failed",
        error?.message ||
          "Harvest request submission failed.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* =======================================================
     UI
  ======================================================= */

  return (
    <KeyboardAvoidingView
      style={{
        flex: 1,
        backgroundColor: C.screenBg,
      }}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : undefined
      }
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 16,
          paddingTop: insets.top + 8,
          paddingBottom:
            insets.bottom + 36,
        }}
      >
        {/* ================= HEADER ================= */}

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Pressable
            onPress={() => router.back()}
            style={{
              width: 46,
              height: 46,
              borderRadius: 16,
              backgroundColor:
                C.cardBg,
              alignItems: "center",
              justifyContent:
                "center",
              borderWidth: 1,
              borderColor:
                C.cardBorder,
            }}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={C.text}
            />
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: C.text,
                fontSize: 27,
                fontWeight: "900",
              }}
            >
              Harvest Request
            </Text>

            <Text
              style={{
                color: C.subText,
                fontSize: 14,
                marginTop: 2,
              }}
            >
              Create harvest request
              for the linked pond
            </Text>
          </View>
        </View>

        

        {/* ================= LINKED QR DETAILS ================= */}

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
    <InfoRow
      C={C}
      label="Farmer/User ID"
      value={userId}
    />

    <InfoRow
      C={C}
      label="Farm ID"
      value={farmId}
    />

    <InfoRow
      C={C}
      label="Pond ID"
      value={pondId}
    />

    <InfoRow
      C={C}
      label="Culture ID"
      value={cultureId}
    />

    {cultureCode ? (
      <InfoRow
        C={C}
        label="Culture Code"
        value={cultureCode}
      />
    ) : null}

    <InfoRow
      C={C}
      label="QR Code ID"
      value={qrCodeId}
    />

    <InfoRow
      C={C}
      label="QR Code"
      value={qrCode}
    />
  </View>
</View>

        {/* ================= HARVEST FORM ================= */}

        <View
          style={{
            marginTop: 18,
            backgroundColor:
              C.cardBg,
            borderColor:
              C.cardBorder,
            borderWidth: 1,
            borderRadius: 18,
            padding: 16,
          }}
        >
          <Text
            style={{
              color: C.text,
              fontSize: 20,
              fontWeight: "900",
            }}
          >
            Harvest Details
          </Text>

          {/* HARVEST METHOD */}

          <Text
            style={{
              color: C.text,
              fontSize: 13,
              fontWeight: "800",
              marginTop: 16,
              marginBottom: 8,
            }}
          >
            Harvest Method
            <Text
              style={{
                color: "#E11D48",
              }}
            >
              {" "}
              *
            </Text>
          </Text>

          <View
            style={{
              flexDirection: "row",
              gap: 12,
            }}
          >
            <Pressable
              onPress={() =>
                setHarvestMethod(
                  "Partial",
                )
              }
              style={{
                flex: 1,
                borderRadius: 16,
                paddingVertical: 15,
                alignItems: "center",
                borderWidth: 1,

                borderColor:
                  harvestMethod ===
                  "Partial"
                    ? C.primary
                    : C.cardBorder,

                backgroundColor:
                  harvestMethod ===
                  "Partial"
                    ? C.primary
                    : C.inputBg,
              }}
            >
              <Text
                style={{
                  color:
                    harvestMethod ===
                    "Partial"
                      ? "#FFFFFF"
                      : C.text,

                  fontSize: 15,
                  fontWeight: "900",
                }}
              >
                Partial
              </Text>
            </Pressable>

            <Pressable
              onPress={() =>
                setHarvestMethod(
                  "Full",
                )
              }
              style={{
                flex: 1,
                borderRadius: 16,
                paddingVertical: 15,
                alignItems: "center",
                borderWidth: 1,

                borderColor:
                  harvestMethod ===
                  "Full"
                    ? C.primary
                    : C.cardBorder,

                backgroundColor:
                  harvestMethod ===
                  "Full"
                    ? C.primary
                    : C.inputBg,
              }}
            >
              <Text
                style={{
                  color:
                    harvestMethod ===
                    "Full"
                      ? "#FFFFFF"
                      : C.text,

                  fontSize: 15,
                  fontWeight: "900",
                }}
              >
                Full
              </Text>
            </Pressable>
          </View>

          {/* DOC */}

          <Field
            C={C}
            label="DOC"
            value={doc}
            onChangeText={setDoc}
            placeholder="Example: 45"
            keyboardType="numeric"
            required
          />

          {/* PREFERRED HARVEST TIME */}

          <SelectDateField
            C={C}
            label="Preferred Harvest Time"
            value={formatDateTimeForDisplay(
              preferredHarvestDate,
            )}
            placeholder="Select preferred harvest date and time"
            required
            onPress={
              openPreferredPicker
            }
          />

          {showPreferredPicker ? (
            <View
              style={{
                marginTop: 10,
              }}
            >
              <DateTimePicker
                value={
                  preferredHarvestDate ||
                  new Date()
                }
                mode={
                  Platform.OS ===
                  "ios"
                    ? "datetime"
                    : preferredPickerMode
                }
                display={
                  Platform.OS ===
                  "ios"
                    ? "spinner"
                    : "default"
                }
                onChange={
                  handlePreferredPickerChange
                }
              />

              {Platform.OS ===
              "ios" ? (
                <Pressable
                  onPress={
                    closeIosPreferredPicker
                  }
                  style={{
                    marginTop: 8,
                    borderRadius: 12,
                    paddingVertical: 10,
                    alignItems:
                      "center",
                    backgroundColor:
                      C.primary,
                  }}
                >
                  <Text
                    style={{
                      color:
                        "#FFFFFF",
                      fontSize: 14,
                      fontWeight:
                        "900",
                    }}
                  >
                    Done
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          <Text
            style={{
              color: C.subText,
              fontSize: 12,
              marginTop: 6,
            }}
          >
            API value is sent as
            ISO date/time.
          </Text>

          {/* EXPECTED SIZE */}

          <Field
            C={C}
            label="Expected Size"
            value={expectedSize}
            onChangeText={
              setExpectedSize
            }
            placeholder="Example: 35 - 38 Count/kg"
            required
          />

          {/* EXPECTED BIOMASS */}

          <Field
            C={C}
            label="Expected Biomass"
            value={expectedBiomass}
            onChangeText={
              setExpectedBiomass
            }
            placeholder="Example: 1200"
            keyboardType="numeric"
            required
          />

          {/* SPECIES */}

          <Field
            C={C}
            label="Species"
            value={species}
            onChangeText={setSpecies}
            placeholder="Example: Vannamei"
            required
          />

          {/* HARVEST REASON */}

          <Field
            C={C}
            label="Harvest Reason"
            value={harvestReason}
            onChangeText={
              setHarvestReason
            }
            placeholder="Example: Market demand"
            multiline
            required
          />

          {/*
            STOCKING DATE REMOVED.

            No date picker.
            No manual input.
            No validation.
          */}
        </View>

        {/* ================= SUBMIT ================= */}

        <Pressable
          disabled={submitting}
          onPress={handleSubmit}
          style={{
            marginTop: 18,
            borderRadius: 16,
            paddingVertical: 16,
            alignItems: "center",

            backgroundColor:
              submitting
                ? "#94A3B8"
                : C.primary,

            opacity:
              submitting
                ? 0.8
                : 1,
          }}
        >
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 16,
              fontWeight: "900",
            }}
          >
            {submitting
              ? "Submitting..."
              : "Submit Harvest Request"}
          </Text>
        </Pressable>

        {/* ================= BACK ================= */}

        <Pressable
          disabled={submitting}
          onPress={() =>
            router.back()
          }
          style={{
            marginTop: 12,
            borderRadius: 16,
            paddingVertical: 16,
            alignItems: "center",
            backgroundColor:
              "#E5E7EB",
            opacity:
              submitting
                ? 0.5
                : 1,
          }}
        >
          <Text
            style={{
              color: "#111827",
              fontSize: 16,
              fontWeight: "900",
            }}
          >
            Back
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}