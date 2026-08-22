// src/components/quality/modals/AquaInspectionModal.tsx
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

export type AquaFormState = {
  harvest_id: string;

  // Inspector-final sampling measurements (editable)
  sample_count: string;
  sample_weight: string;

  // Auto-calculated, but inspector may override
  abw_g: string;
  size_count_kg: string;

  grade: string;
  disease_observation: "true" | "false";
  disease_notes: string;

  inspection_latitude: string;
  inspection_longitude: string;
  inspected_at: string;
  remarks: string;

  images: string[];

  // Kept optional for compatibility with the existing QC queue flow.
  qc_result?: "PASS" | "HOLD" | "REJECT" | string | null;
};

export function aquaInitial(): AquaFormState {
  return {
    harvest_id: "",
    sample_count: "",
    sample_weight: "",
    abw_g: "",
    size_count_kg: "",
    grade: "A",
    disease_observation: "false",
    disease_notes: "",
    inspection_latitude: "",
    inspection_longitude: "",
    inspected_at: new Date().toISOString(),
    remarks: "",
    images: [],
    qc_result: null,
  };
}

type Props = {
  visible: boolean;
  scannedCode: string;
  loading: boolean;
  error: string | null;
  data: any;

  form: AquaFormState;
  setFormField: <K extends keyof AquaFormState>(
    key: K,
    value: AquaFormState[K]
  ) => void;

  onPickImages: () => void;
  onRemoveImage: (uri: string) => void;

  submitLoading: boolean;
  submitError: string | null;

  onCancel: () => void;
  onSubmit: (payload: any) => void | Promise<void>;

  readOnly?: boolean;
};

const FIELD_BG = "#091a33";
const BORDER = "rgba(255,255,255,0.13)";
const TEXT = "#f8fafc";
const MUTED = "rgba(255,255,255,0.62)";
const BLUE = "#2563eb";

function positiveNumber(value: any): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function cleanNumberInput(value: string): string {
  const cleaned = String(value ?? "").replace(/[^0-9.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot < 0) return cleaned;
  return (
    cleaned.slice(0, firstDot + 1) +
    cleaned.slice(firstDot + 1).replace(/\./g, "")
  );
}

function formatCalculated(value: number | null): string {
  if (!value || !Number.isFinite(value)) return "";
  return String(Number(value.toFixed(4)));
}

function sameNumber(a: number | null, b: number | null): boolean {
  if (a === null || b === null) return a === b;
  return Math.abs(a - b) < 0.0001;
}

function firstText(...values: any[]): string {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
}

function ReadOnlyInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={{ flex: 1, minWidth: "46%", marginBottom: 10 }}>
      <Text style={{ color: MUTED, fontSize: 11, fontWeight: "700" }}>
        {label}
      </Text>
      <Text
        numberOfLines={2}
        style={{ color: TEXT, fontSize: 13, fontWeight: "800", marginTop: 3 }}
      >
        {value || "—"}
      </Text>
    </View>
  );
}

function InputLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <Text
      style={{
        color: "rgba(255,255,255,0.76)",
        fontSize: 12,
        fontWeight: "800",
        marginBottom: 7,
      }}
    >
      {children}
      {required ? <Text style={{ color: "#fb7185" }}> *</Text> : null}
    </Text>
  );
}

export default function AquaInspectionModal({
  visible,
  scannedCode,
  loading,
  error,
  data,
  form,
  setFormField,
  onPickImages,
  onRemoveImage,
  submitLoading,
  submitError,
  onCancel,
  onSubmit,
  readOnly = false,
}: Props) {
  const [abwManual, setAbwManual] = useState(false);
  const [sizeManual, setSizeManual] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const sampleCount = positiveNumber(form.sample_count);
  const sampleWeight = positiveNumber(form.sample_weight);

  useEffect(() => {
    if (!visible) {
      setPreviewImage(null);
    }
  }, [visible]);

  const automaticAbw = useMemo(() => {
    if (!sampleCount || !sampleWeight) return null;
    return sampleWeight / sampleCount;
  }, [sampleCount, sampleWeight]);

  const effectiveAbw = positiveNumber(form.abw_g) ?? automaticAbw;

  const automaticSize = useMemo(() => {
    if (!effectiveAbw) return null;
    return 1000 / effectiveAbw;
  }, [effectiveAbw]);

  // Detect a saved/manual override when an existing HOLD/final draft is opened.
  // This runs only for a new modal/QR, not while the inspector is typing.
  useEffect(() => {
    if (!visible) return;

    const currentAbw = positiveNumber(form.abw_g);
    const currentSize = positiveNumber(form.size_count_kg);

    setAbwManual(
      currentAbw !== null &&
        automaticAbw !== null &&
        !sameNumber(currentAbw, automaticAbw)
    );

    const sizeBasedOnCurrentAbw =
      currentAbw && currentAbw > 0 ? 1000 / currentAbw : automaticSize;

    setSizeManual(
      currentSize !== null &&
        sizeBasedOnCurrentAbw !== null &&
        !sameNumber(currentSize, sizeBasedOnCurrentAbw)
    );
    // form values are intentionally not dependencies: changing a field must not
    // reset the user's manual override state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, scannedCode]);

  const recalcFromSamples = (
    countText: string,
    weightText: string,
    nextAbwManual = abwManual,
    nextSizeManual = sizeManual
  ) => {
    const count = positiveNumber(countText);
    const weight = positiveNumber(weightText);
    const autoAbw = count && weight ? weight / count : null;

    let abwForSize = positiveNumber(form.abw_g);

    if (!nextAbwManual) {
      const nextAbw = formatCalculated(autoAbw);
      setFormField("abw_g", nextAbw);
      abwForSize = autoAbw;
    }

    if (!nextSizeManual) {
      const autoSize = abwForSize ? 1000 / abwForSize : null;
      setFormField("size_count_kg", formatCalculated(autoSize));
    }
  };

  const onSampleCountChange = (raw: string) => {
    const value = cleanNumberInput(raw);
    setFormField("sample_count", value);
    recalcFromSamples(value, form.sample_weight);
  };

  const onSampleWeightChange = (raw: string) => {
    const value = cleanNumberInput(raw);
    setFormField("sample_weight", value);
    recalcFromSamples(form.sample_count, value);
  };

  const onAbwChange = (raw: string) => {
    const value = cleanNumberInput(raw);
    setAbwManual(true);
    setFormField("abw_g", value);

    if (!sizeManual) {
      const abw = positiveNumber(value);
      setFormField(
        "size_count_kg",
        formatCalculated(abw ? 1000 / abw : null)
      );
    }
  };

  const onSizeChange = (raw: string) => {
    setSizeManual(true);
    setFormField("size_count_kg", cleanNumberInput(raw));
  };

  const resetAbwToAuto = () => {
    setAbwManual(false);
    const nextAbw = formatCalculated(automaticAbw);
    setFormField("abw_g", nextAbw);

    if (!sizeManual) {
      setFormField(
        "size_count_kg",
        formatCalculated(automaticAbw ? 1000 / automaticAbw : null)
      );
    }
  };

  const resetSizeToAuto = () => {
    setSizeManual(false);
    const abw = positiveNumber(form.abw_g) ?? automaticAbw;
    setFormField(
      "size_count_kg",
      formatCalculated(abw ? 1000 / abw : null)
    );
  };

  const submit = () => {
    if (readOnly) return;

    const count = positiveNumber(form.sample_count);
    const weight = positiveNumber(form.sample_weight);

    if (!count) {
      Alert.alert("Sample Count required", "Enter a value greater than 0.");
      return;
    }

    if (!weight) {
      Alert.alert(
        "Sample Weight required",
        "Enter the final sample weight in grams."
      );
      return;
    }

    const finalAbw = positiveNumber(form.abw_g) ?? weight / count;
    const finalSize =
      positiveNumber(form.size_count_kg) ?? 1000 / finalAbw;

    const harvestId = firstText(form.harvest_id, data?.harvest_id);
    if (!harvestId) {
      Alert.alert(
        "Harvest ID missing",
        "The scanned Pond QR did not return a Harvest ID."
      );
      return;
    }

    if (!String(form.grade || "").trim()) {
      Alert.alert("Grade required", "Select a shrimp grade.");
      return;
    }

    onSubmit({
      ...form,
      harvest_id: harvestId,
      sample_count: count,
      sample_weight: weight,
      abw_g: Number(finalAbw.toFixed(4)),
      size_count_kg: Number(finalSize.toFixed(4)),
      disease_observation: form.disease_observation === "true",
      inspected_at: form.inspected_at || new Date().toISOString(),
      images: Array.isArray(form.images) ? form.images : [],
    });
  };

  const farmerId = firstText(data?.farmer_id, data?.user_id);
  const farmId = firstText(data?.farm_id);
  const pondId = firstText(data?.pond_id);
  const harvestId = firstText(form.harvest_id, data?.harvest_id);
  const species = firstText(data?.species, data?.fish_name);
  const farmName = firstText(data?.farm_name);
  const pondName = firstText(data?.pond_name);

  const editable = !readOnly && !submitLoading;

  const inputStyle = {
    minHeight: 46,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: FIELD_BG,
    color: TEXT,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: "800" as const,
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.72)",
          justifyContent: "center",
          padding: 12,
        }}
      >
        <View
          style={{
            maxHeight: "92%",
            width: "100%",
            maxWidth: 560,
            alignSelf: "center",
            borderRadius: 22,
            overflow: "hidden",
            backgroundColor: "#07152d",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.12)",
          }}
        >
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 14,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottomWidth: 1,
              borderBottomColor: "rgba(255,255,255,0.08)",
            }}
          >
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text
                style={{ color: TEXT, fontSize: 17, fontWeight: "900" }}
              >
                Aquaculture Quality Inspection
              </Text>
              <Text
                style={{
                  color: MUTED,
                  fontSize: 11,
                  fontWeight: "700",
                  marginTop: 3,
                }}
              >
                {scannedCode || "Pond QR"}
                {readOnly ? " • Final / Read only" : ""}
              </Text>
            </View>

            <Pressable
              onPress={onCancel}
              disabled={submitLoading}
              style={{
                width: 34,
                height: 34,
                borderRadius: 11,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(255,255,255,0.07)",
              }}
            >
              <Ionicons name="close" size={20} color="#fff" />
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          >
            {loading ? (
              <View style={{ alignItems: "center", paddingVertical: 24 }}>
                <ActivityIndicator />
                <Text style={{ color: MUTED, marginTop: 10 }}>
                  Loading Pond / Harvest details…
                </Text>
              </View>
            ) : null}

            {!!error ? (
              <View
                style={{
                  borderRadius: 12,
                  padding: 11,
                  backgroundColor: "rgba(239,68,68,0.12)",
                  borderWidth: 1,
                  borderColor: "rgba(239,68,68,0.35)",
                  marginBottom: 12,
                }}
              >
                <Text style={{ color: "#fecaca", fontWeight: "800" }}>
                  {error}
                </Text>
              </View>
            ) : null}

            <View
              style={{
                borderRadius: 16,
                padding: 12,
                backgroundColor: "rgba(255,255,255,0.045)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.08)",
                marginBottom: 14,
              }}
            >
              <Text
                style={{
                  color: "#93c5fd",
                  fontSize: 12,
                  fontWeight: "900",
                  marginBottom: 10,
                }}
              >
                Traceability Details
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  columnGap: 14,
                }}
              >
                <ReadOnlyInfo label="Farmer ID" value={farmerId} />
                <ReadOnlyInfo label="Farm ID" value={farmId} />
                <ReadOnlyInfo label="Pond ID" value={pondId} />
                <ReadOnlyInfo label="Harvest ID" value={harvestId} />
                <ReadOnlyInfo label="Farm" value={farmName} />
                <ReadOnlyInfo
                  label="Pond"
                  value={pondName ? `${pondName}` : ""}
                />
                <ReadOnlyInfo label="Species" value={species} />
              </View>
            </View>

            <View style={{ marginBottom: 13 }}>
              <InputLabel required>Sample Count</InputLabel>
              <TextInput
                value={String(form.sample_count ?? "")}
                onChangeText={onSampleCountChange}
                editable={editable}
                keyboardType="decimal-pad"
                placeholder="Enter final sample count"
                placeholderTextColor="rgba(255,255,255,0.28)"
                selectTextOnFocus={false}
                style={[
                  inputStyle,
                  !editable ? { opacity: 0.62 } : null,
                ]}
              />
            </View>

            <View style={{ marginBottom: 13 }}>
              <InputLabel required>Sample Weight (g)</InputLabel>
              <TextInput
                value={String(form.sample_weight ?? "")}
                onChangeText={onSampleWeightChange}
                editable={editable}
                keyboardType="decimal-pad"
                placeholder="Enter final sample weight"
                placeholderTextColor="rgba(255,255,255,0.28)"
                style={[
                  inputStyle,
                  !editable ? { opacity: 0.62 } : null,
                ]}
              />
            </View>

            <View
              style={{
                flexDirection: "row",
                gap: 10,
                marginBottom: 13,
              }}
            >
              <View style={{ flex: 1 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 7,
                  }}
                >
                  <InputLabel>ABW (g)</InputLabel>
                  {!readOnly && abwManual ? (
                    <Pressable onPress={resetAbwToAuto}>
                      <Text
                        style={{
                          color: "#60a5fa",
                          fontSize: 10,
                          fontWeight: "900",
                        }}
                      >
                        USE AUTO
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
                <TextInput
                  value={String(
                    form.abw_g || formatCalculated(automaticAbw)
                  )}
                  onChangeText={onAbwChange}
                  editable={editable}
                  keyboardType="decimal-pad"
                  placeholder="Auto"
                  placeholderTextColor="rgba(255,255,255,0.28)"
                  style={[
                    inputStyle,
                    {
                      borderColor: abwManual
                        ? "rgba(251,191,36,0.48)"
                        : "rgba(96,165,250,0.38)",
                    },
                    !editable ? { opacity: 0.62 } : null,
                  ]}
                />
                <Text
                  style={{
                    color: abwManual ? "#fbbf24" : "#60a5fa",
                    fontSize: 10,
                    fontWeight: "800",
                    marginTop: 5,
                  }}
                >
                  {abwManual ? "Manual override" : "Auto: Weight ÷ Count"}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 7,
                  }}
                >
                  <InputLabel>Size (Count/kg)</InputLabel>
                  {!readOnly && sizeManual ? (
                    <Pressable onPress={resetSizeToAuto}>
                      <Text
                        style={{
                          color: "#60a5fa",
                          fontSize: 10,
                          fontWeight: "900",
                        }}
                      >
                        USE AUTO
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
                <TextInput
                  value={String(
                    form.size_count_kg || formatCalculated(automaticSize)
                  )}
                  onChangeText={onSizeChange}
                  editable={editable}
                  keyboardType="decimal-pad"
                  placeholder="Auto"
                  placeholderTextColor="rgba(255,255,255,0.28)"
                  style={[
                    inputStyle,
                    {
                      borderColor: sizeManual
                        ? "rgba(251,191,36,0.48)"
                        : "rgba(96,165,250,0.38)",
                    },
                    !editable ? { opacity: 0.62 } : null,
                  ]}
                />
                <Text
                  style={{
                    color: sizeManual ? "#fbbf24" : "#60a5fa",
                    fontSize: 10,
                    fontWeight: "800",
                    marginTop: 5,
                  }}
                >
                  {sizeManual ? "Manual override" : "Auto: 1000 ÷ ABW"}
                </Text>
              </View>
            </View>

            <View style={{ marginBottom: 13 }}>
              <InputLabel required>Grade</InputLabel>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {["A", "B", "C", "D"].map((grade) => {
                  const active = String(form.grade).toUpperCase() === grade;
                  return (
                    <Pressable
                      key={grade}
                      disabled={!editable}
                      onPress={() => setFormField("grade", grade)}
                      style={{
                        flex: 1,
                        height: 42,
                        borderRadius: 12,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: active
                          ? "rgba(37,99,235,0.34)"
                          : FIELD_BG,
                        borderWidth: 1,
                        borderColor: active ? "#3b82f6" : BORDER,
                        opacity: editable ? 1 : 0.62,
                      }}
                    >
                      <Text
                        style={{
                          color: TEXT,
                          fontWeight: "900",
                          fontSize: 14,
                        }}
                      >
                        {grade}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={{ marginBottom: 13 }}>
              <InputLabel>Disease Observation</InputLabel>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {[
                  { label: "No disease signs", value: "false" as const },
                  { label: "Disease observed", value: "true" as const },
                ].map((item) => {
                  const active = form.disease_observation === item.value;
                  return (
                    <Pressable
                      key={item.value}
                      disabled={!editable}
                      onPress={() =>
                        setFormField("disease_observation", item.value)
                      }
                      style={{
                        flex: 1,
                        minHeight: 42,
                        borderRadius: 12,
                        alignItems: "center",
                        justifyContent: "center",
                        paddingHorizontal: 8,
                        backgroundColor: active
                          ? item.value === "true"
                            ? "rgba(239,68,68,0.18)"
                            : "rgba(16,185,129,0.18)"
                          : FIELD_BG,
                        borderWidth: 1,
                        borderColor: active
                          ? item.value === "true"
                            ? "rgba(248,113,113,0.55)"
                            : "rgba(52,211,153,0.50)"
                          : BORDER,
                        opacity: editable ? 1 : 0.62,
                      }}
                    >
                      <Text
                        style={{
                          color: TEXT,
                          fontSize: 11,
                          fontWeight: "900",
                          textAlign: "center",
                        }}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {form.disease_observation === "true" ? (
              <View style={{ marginBottom: 13 }}>
                <InputLabel>Disease Notes</InputLabel>
                <TextInput
                  value={form.disease_notes}
                  onChangeText={(value) =>
                    setFormField("disease_notes", value)
                  }
                  editable={editable}
                  multiline
                  placeholder="Describe visible disease signs"
                  placeholderTextColor="rgba(255,255,255,0.28)"
                  style={[
                    inputStyle,
                    {
                      minHeight: 86,
                      textAlignVertical: "top",
                    },
                    !editable ? { opacity: 0.62 } : null,
                  ]}
                />
              </View>
            ) : null}

            <View style={{ marginBottom: 13 }}>
              <InputLabel>Shrimp Images</InputLabel>
              <Text
                style={{
                  color: MUTED,
                  fontSize: 10,
                  lineHeight: 15,
                  marginBottom: 9,
                }}
              >
                Camera capture only. AQUA images are permanently watermarked
                with Farmer ID, Farm ID, Pond ID, Harvest ID, GPS and UTC time.
              </Text>

              {!readOnly ? (
                <Pressable
                  disabled={!editable}
                  onPress={onPickImages}
                  style={{
                    minHeight: 44,
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "row",
                    gap: 7,
                    backgroundColor: "rgba(37,99,235,0.24)",
                    borderWidth: 1,
                    borderColor: "rgba(59,130,246,0.55)",
                    opacity: editable ? 1 : 0.55,
                  }}
                >
                  <Ionicons name="camera-outline" size={18} color="#bfdbfe" />
                  <Text
                    style={{
                      color: "#dbeafe",
                      fontWeight: "900",
                      fontSize: 12,
                    }}
                  >
                    Capture Shrimp Image
                  </Text>
                </Pressable>
              ) : null}

              {Array.isArray(form.images) && form.images.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginTop: 10 }}
                >
                  {form.images.map((uri, index) => (
                    <View
                      key={`${uri}_${index}`}
                      style={{
                        width: 92,
                        height: 92,
                        borderRadius: 12,
                        overflow: "hidden",
                        marginRight: 9,
                        borderWidth: 1,
                        borderColor: BORDER,
                        backgroundColor: "#020617",
                      }}
                    >
                      <Pressable
                        onPress={() => setPreviewImage(uri)}
                        accessibilityRole="button"
                        accessibilityLabel={`Open shrimp image ${index + 1} full screen`}
                        style={{ flex: 1 }}
                      >
                        <Image
                          source={{ uri }}
                          resizeMode="cover"
                          style={{ width: "100%", height: "100%" }}
                        />

                        <View
                          pointerEvents="none"
                          style={{
                            position: "absolute",
                            left: 5,
                            bottom: 5,
                            width: 25,
                            height: 25,
                            borderRadius: 9,
                            backgroundColor: "rgba(0,0,0,0.70)",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Ionicons name="expand-outline" size={15} color="#fff" />
                        </View>
                      </Pressable>

                      {!readOnly ? (
                        <Pressable
                          onPress={() => onRemoveImage(uri)}
                          disabled={!editable}
                          accessibilityRole="button"
                          accessibilityLabel={`Remove shrimp image ${index + 1}`}
                          style={{
                            position: "absolute",
                            top: 5,
                            right: 5,
                            width: 25,
                            height: 25,
                            borderRadius: 9,
                            backgroundColor: "rgba(0,0,0,0.70)",
                            alignItems: "center",
                            justifyContent: "center",
                            opacity: editable ? 1 : 0.55,
                          }}
                        >
                          <Ionicons name="close" size={16} color="#fff" />
                        </Pressable>
                      ) : null}
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <Text
                  style={{
                    color: "rgba(255,255,255,0.36)",
                    fontSize: 11,
                    marginTop: 8,
                  }}
                >
                  No shrimp images captured.
                </Text>
              )}
            </View>

            <View style={{ marginBottom: 4 }}>
              <InputLabel>Remarks</InputLabel>
              <TextInput
                value={form.remarks}
                onChangeText={(value) => setFormField("remarks", value)}
                editable={editable}
                multiline
                placeholder="Optional inspection remarks"
                placeholderTextColor="rgba(255,255,255,0.28)"
                style={[
                  inputStyle,
                  {
                    minHeight: 74,
                    textAlignVertical: "top",
                  },
                  !editable ? { opacity: 0.62 } : null,
                ]}
              />
            </View>

            {!!submitError ? (
              <View
                style={{
                  marginTop: 12,
                  borderRadius: 12,
                  padding: 10,
                  backgroundColor: "rgba(239,68,68,0.12)",
                  borderWidth: 1,
                  borderColor: "rgba(239,68,68,0.35)",
                }}
              >
                <Text style={{ color: "#fecaca", fontWeight: "800" }}>
                  {submitError}
                </Text>
              </View>
            ) : null}
          </ScrollView>

          <View
            style={{
              padding: 12,
              flexDirection: "row",
              gap: 9,
              borderTopWidth: 1,
              borderTopColor: "rgba(255,255,255,0.08)",
              backgroundColor: "#061229",
            }}
          >
            <Pressable
              onPress={onCancel}
              disabled={submitLoading}
              style={{
                flex: 1,
                minHeight: 44,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(255,255,255,0.06)",
                borderWidth: 1,
                borderColor: BORDER,
                opacity: submitLoading ? 0.55 : 1,
              }}
            >
              <Text style={{ color: "#e2e8f0", fontWeight: "900" }}>
                {readOnly ? "Close" : "Cancel"}
              </Text>
            </Pressable>

            {!readOnly ? (
              <Pressable
                onPress={submit}
                disabled={submitLoading || loading || !!error}
                style={{
                  flex: 1.35,
                  minHeight: 44,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: BLUE,
                  opacity:
                    submitLoading || loading || !!error ? 0.55 : 1,
                }}
              >
                {submitLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: "#fff", fontWeight: "900" }}>
                    Submit Inspection
                  </Text>
                )}
              </Pressable>
            ) : null}
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={!!previewImage}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setPreviewImage(null)}
        statusBarTranslucent
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "#000",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {previewImage ? (
            <Image
              source={{ uri: previewImage }}
              resizeMode="contain"
              style={{ width: "100%", height: "100%" }}
            />
          ) : null}

          <Pressable
            onPress={() => setPreviewImage(null)}
            accessibilityRole="button"
            accessibilityLabel="Close full screen image"
            style={{
              position: "absolute",
              top: Platform.OS === "android" ? 34 : 54,
              right: 18,
              width: 46,
              height: 46,
              borderRadius: 23,
              backgroundColor: "rgba(0,0,0,0.68)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.24)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>

          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: 18,
              bottom: 24,
              right: 18,
              alignItems: "center",
            }}
          >
            <View
              style={{
                backgroundColor: "rgba(0,0,0,0.62)",
                borderRadius: 999,
                paddingHorizontal: 14,
                paddingVertical: 8,
              }}
            >
              <Text style={{ color: "#fff", fontSize: 12, fontWeight: "800" }}>
                Full image • Tap × to close
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}