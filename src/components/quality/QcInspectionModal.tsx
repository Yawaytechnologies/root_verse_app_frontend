// src/components/quality/QcInspectionModal.tsx
import React from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Picker } from "@react-native-picker/picker";

export type Lang = "en" | "ta";

export const QC_RESULT = ["PASS", "HOLD", "REJECT"] as const;
export const QC_GRADE = ["A", "B", "C", "REJECTED"] as const;

export const REJECT_REASONS = [
  "TEMP_ABUSE",
  "SPOILAGE_ODOR",
  "CONTAMINATION",
  "DAMAGED_PACKAGING",
  "MIXED_SPECIES",
  "WRONG_LABEL",
  "UNDER_SIZE",
  "UNKNOWN_ORIGIN",
  "OTHER",
] as const;

export const QC_SCORE_OPTS = ["10", "20", "30", "40", "50", "60"] as const;
export const SCORE_1_10 = ["1","2","3","4","5","6","7","8","9","10"] as const;

export type QcResult = (typeof QC_RESULT)[number];
export type QualityGrade = (typeof QC_GRADE)[number];
export type QrRejectReason = (typeof REJECT_REASONS)[number];

export type QcFormState = {
  qc_status: "PENDING" | "CHECKED"; // set by big buttons
  qc_result: QcResult;
  quality_grade: QualityGrade;
  qr_reject_reason: QrRejectReason;

  qc_score: string;        // dropdown 10..60
  temperature_c: string;   // manual
  sample_count: string;    // manual

  odor_score: string;      // dropdown 1..10
  gill_score: string;      // dropdown 1..10
  eye_score: string;       // dropdown 1..10
  firmness_score: string;  // dropdown 1..10

  // checks (dropdown yes/no)
  ice_present: boolean;
  packaging_intact: boolean;
  foreign_matter_found: boolean;
  is_mixed_species: boolean;
  is_contaminated: boolean;
  is_damaged: boolean;

  qc_remarks: string;
  crate_images: string[]; // URIs
};

type Props = {
  visible: boolean;
  lang: Lang;

  scannedCode: string;
  mode: "NEW" | "FILLED";

  loading?: boolean; // optional (if you want)
  data?: any;        // filled data (optional)

  form: QcFormState;
  setFormField: <K extends keyof QcFormState>(k: K, v: QcFormState[K]) => void;

  onPickImages: () => void;
  onTakePhoto: () => void;
  onRemoveImage: (uri: string) => void;

  submitLoading: boolean;
  submitError?: string | null;

  onCancel: () => void;
  onSubmit: () => void;
};

export default function QcInspectionModal({
  visible,
  lang,
  scannedCode,
  mode,
  loading,
  data,

  form,
  setFormField,

  onPickImages,
  onTakePhoto,
  onRemoveImage,

  submitLoading,
  submitError,

  onCancel,
  onSubmit,
}: Props) {
  const isFilled = mode === "FILLED";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.55)",
          padding: 14,
          justifyContent: "center",
        }}
      >
        <View
          style={{
            maxHeight: "90%",
            borderRadius: 22,
            overflow: "hidden",
            backgroundColor: "#0b1630",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.10)",
          }}
        >
          {/* HEADER */}
          <View
            style={{
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: "rgba(255,255,255,0.08)",
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: "white", fontWeight: "900", fontSize: 18 }}>
                {lang === "en" ? "Quality Inspection" : "தர ஆய்வு"}
              </Text>

              <View style={{ marginTop: 6, flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Text style={{ color: "rgba(255,255,255,0.75)", fontWeight: "900" }}>
                  {scannedCode || "—"}
                </Text>

                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 999,
                    backgroundColor: isFilled ? "rgba(52,211,153,0.18)" : "rgba(251,191,36,0.18)",
                    borderWidth: 1,
                    borderColor: isFilled ? "rgba(52,211,153,0.35)" : "rgba(251,191,36,0.35)",
                  }}
                >
                  <Text style={{ color: "white", fontWeight: "900", fontSize: 12 }}>
                    {isFilled ? "FILLED" : "NEW"}
                  </Text>
                </View>
              </View>

              {isFilled ? (
                <Text style={{ marginTop: 6, color: "rgba(255,255,255,0.55)", fontWeight: "800" }}>
                  Already inspection submitted.
                </Text>
              ) : null}
            </View>

            <Pressable onPress={onCancel} style={{ padding: 10 }}>
              <Text style={{ color: "rgba(255,255,255,0.85)", fontWeight: "900", fontSize: 18 }}>
                ✕
              </Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: 18 }}
            showsVerticalScrollIndicator
          >
            {/* If you want a tiny loader while checking filled */}
            {loading ? (
              <View style={{ marginTop: 12, flexDirection: "row", gap: 10, alignItems: "center" }}>
                <ActivityIndicator />
                <Text style={{ color: "rgba(255,255,255,0.7)", fontWeight: "800" }}>
                  Loading…
                </Text>
              </View>
            ) : null}

            {/* ✅ IMPORTANT: NO catch log details shown for NEW */}
            {/* FILLED: we are NOT showing catch log details either (as you asked). Only message. */}
            {/* If you later want “view filled details” we can add a separate section. */}

            {/* ===== QUALITY CHECK STATUS (CENTER) ===== */}
            <Text
              style={{
                textAlign: "center",
                marginTop: 14,
                color: "rgba(255,255,255,0.75)",
                fontWeight: "900",
                letterSpacing: 0.6,
              }}
            >
              QUALITY CHECK STATUS
            </Text>

            {/* two big buttons */}
            <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
              <BigStatusBtn
                active={form.qc_status === "PENDING"}
                label="PENDING"
                onPress={() => setFormField("qc_status", "PENDING")}
                disabled={isFilled}
              />
              <BigStatusBtn
                active={form.qc_status === "CHECKED"}
                label="CHECKED"
                onPress={() => setFormField("qc_status", "CHECKED")}
                disabled={isFilled}
              />
            </View>

            {/* ===== DROPDOWNS: QC RESULT + QUALITY GRADE ===== */}
            <View style={{ flexDirection: "row", gap: 12, marginTop: 14 }}>
              <View style={{ flex: 1 }}>
                <Label>QC Result</Label>
                <Select
                  value={form.qc_result}
                  onValueChange={(v) => setFormField("qc_result", v as any)}
                  disabled={isFilled}
                  items={QC_RESULT as any}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Label>Quality Grade</Label>
                <Select
                  value={form.quality_grade}
                  onValueChange={(v) => setFormField("quality_grade", v as any)}
                  disabled={isFilled}
                  items={QC_GRADE as any}
                />
              </View>
            </View>

            {/* Reject reason only when REJECT */}
            {form.qc_result === "REJECT" ? (
              <View style={{ marginTop: 14 }}>
                <Label>Reject Reason</Label>
                <Select
                  value={form.qr_reject_reason}
                  onValueChange={(v) => setFormField("qr_reject_reason", v as any)}
                  disabled={isFilled}
                  items={REJECT_REASONS as any}
                />
              </View>
            ) : null}

            {/* ===== SIDE BY SIDE FIELDS (LEFT) + CHECKS (RIGHT) ===== */}

            {/* Row: QC Score (dropdown) | Ice Present (dropdown) */}
            <View style={{ flexDirection: "row", gap: 12, marginTop: 14 }}>
              <View style={{ flex: 1 }}>
                <Label>QC Score</Label>
                <Select
                  value={form.qc_score}
                  onValueChange={(v) => setFormField("qc_score", v)}
                  disabled={isFilled}
                  items={QC_SCORE_OPTS as any}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Label>Ice Present</Label>
                <YesNoSelect
                  value={form.ice_present}
                  onChange={(v) => setFormField("ice_present", v)}
                  disabled={isFilled}
                />
              </View>
            </View>

            {/* Row: Temperature (manual) | Packaging Intact */}
            <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
              <View style={{ flex: 1 }}>
                <Label>Temperature (°C)</Label>
                <Input
                  value={form.temperature_c}
                  onChangeText={(v) => setFormField("temperature_c", v)}
                  keyboardType="numeric"
                  disabled={isFilled}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Label>Packaging Intact</Label>
                <YesNoSelect
                  value={form.packaging_intact}
                  onChange={(v) => setFormField("packaging_intact", v)}
                  disabled={isFilled}
                />
              </View>
            </View>

            {/* Row: Sample Count (manual) | Foreign Matter */}
            <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
              <View style={{ flex: 1 }}>
                <Label>Sample Count</Label>
                <Input
                  value={form.sample_count}
                  onChangeText={(v) => setFormField("sample_count", v)}
                  keyboardType="numeric"
                  disabled={isFilled}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Label>Foreign Matter</Label>
                <YesNoSelect
                  value={form.foreign_matter_found}
                  onChange={(v) => setFormField("foreign_matter_found", v)}
                  disabled={isFilled}
                />
              </View>
            </View>

            {/* Row: Odor Score | Mixed Species */}
            <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
              <View style={{ flex: 1 }}>
                <Label>Odor Score</Label>
                <Select
                  value={form.odor_score}
                  onValueChange={(v) => setFormField("odor_score", v)}
                  disabled={isFilled}
                  items={SCORE_1_10 as any}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Label>Mixed Species</Label>
                <YesNoSelect
                  value={form.is_mixed_species}
                  onChange={(v) => setFormField("is_mixed_species", v)}
                  disabled={isFilled}
                />
              </View>
            </View>

            {/* Row: Gill Score | Contaminated */}
            <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
              <View style={{ flex: 1 }}>
                <Label>Gill Score</Label>
                <Select
                  value={form.gill_score}
                  onValueChange={(v) => setFormField("gill_score", v)}
                  disabled={isFilled}
                  items={SCORE_1_10 as any}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Label>Contaminated</Label>
                <YesNoSelect
                  value={form.is_contaminated}
                  onChange={(v) => setFormField("is_contaminated", v)}
                  disabled={isFilled}
                />
              </View>
            </View>

            {/* Row: Eye Score | Damaged */}
            <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
              <View style={{ flex: 1 }}>
                <Label>Eye Score</Label>
                <Select
                  value={form.eye_score}
                  onValueChange={(v) => setFormField("eye_score", v)}
                  disabled={isFilled}
                  items={SCORE_1_10 as any}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Label>Damaged</Label>
                <YesNoSelect
                  value={form.is_damaged}
                  onChange={(v) => setFormField("is_damaged", v)}
                  disabled={isFilled}
                />
              </View>
            </View>

            {/* Row: Firmness Score | (spare) */}
            <View style={{ marginTop: 12 }}>
              <Label>Firmness Score</Label>
              <Select
                value={form.firmness_score}
                onValueChange={(v) => setFormField("firmness_score", v)}
                disabled={isFilled}
                items={SCORE_1_10 as any}
              />
            </View>

            {/* ===== Images: Pick / Take Photo ===== */}
            <View style={{ marginTop: 16 }}>
              <Label>Crate Images (max 3)</Label>

              <View style={{ flexDirection: "row", gap: 12, marginTop: 10 }}>
                <ActionBtn
                  label="Pick Images"
                  onPress={onPickImages}
                  disabled={isFilled}
                />
                <ActionBtn
                  label="Take Photo"
                  onPress={onTakePhoto}
                  disabled={isFilled}
                />
              </View>

              {form.crate_images.length > 0 ? (
                <View style={{ marginTop: 12, gap: 10 }}>
                  {form.crate_images.map((uri) => (
                    <View
                      key={uri}
                      style={{
                        borderRadius: 16,
                        overflow: "hidden",
                        borderWidth: 1,
                        borderColor: "rgba(255,255,255,0.10)",
                        backgroundColor: "rgba(255,255,255,0.05)",
                      }}
                    >
                      <Image source={{ uri }} style={{ width: "100%", height: 150 }} />
                      <Pressable
                        onPress={() => onRemoveImage(uri)}
                        disabled={isFilled}
                        style={{
                          paddingVertical: 10,
                          alignItems: "center",
                          backgroundColor: "rgba(248,113,113,0.14)",
                          borderTopWidth: 1,
                          borderTopColor: "rgba(248,113,113,0.25)",
                          opacity: isFilled ? 0.5 : 1,
                        }}
                      >
                        <Text style={{ color: "white", fontWeight: "900" }}>Remove</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>

            {/* ===== Remarks textarea ===== */}
            <View style={{ marginTop: 16 }}>
              <Label>Remarks</Label>
              <TextInput
                value={form.qc_remarks}
                onChangeText={(v) => setFormField("qc_remarks", v)}
                editable={!isFilled}
                placeholder="Type remarks…"
                placeholderTextColor="rgba(255,255,255,0.35)"
                multiline
                numberOfLines={5}
                style={{
                  marginTop: 8,
                  minHeight: 120,
                  textAlignVertical: "top",
                  borderRadius: 16,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  backgroundColor: "rgba(255,255,255,0.06)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.10)",
                  color: "white",
                  fontWeight: "700",
                  opacity: isFilled ? 0.6 : 1,
                }}
              />
            </View>

            {!!submitError ? (
              <Text style={{ marginTop: 12, color: "rgba(248,113,113,0.95)", fontWeight: "900" }}>
                {submitError}
              </Text>
            ) : null}
          </ScrollView>

          {/* FOOTER */}
          <View
            style={{
              padding: 14,
              borderTopWidth: 1,
              borderTopColor: "rgba(255,255,255,0.08)",
              flexDirection: "row",
              gap: 12,
            }}
          >
            <Pressable
              onPress={onCancel}
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 16,
                backgroundColor: "rgba(255,255,255,0.07)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.10)",
                alignItems: "center",
              }}
            >
              <Text style={{ color: "white", fontWeight: "900" }}>Cancel</Text>
            </Pressable>

            <Pressable
              onPress={onSubmit}
              disabled={submitLoading || isFilled}
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 16,
                backgroundColor: isFilled
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(46,125,255,0.35)",
                borderWidth: 1,
                borderColor: isFilled
                  ? "rgba(255,255,255,0.12)"
                  : "rgba(46,125,255,0.55)",
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 10,
              }}
            >
              {submitLoading ? <ActivityIndicator color="#fff" /> : null}
              <Text style={{ color: "white", fontWeight: "900" }}>
                {isFilled ? "Already Submitted" : "Submit Inspection"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ---------------- UI atoms ---------------- */

function Label({ children }: { children: React.ReactNode }) {
  return <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: "900" }}>{children}</Text>;
}

function Input({
  value,
  onChangeText,
  keyboardType,
  disabled,
}: {
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: any;
  disabled?: boolean;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      editable={!disabled}
      placeholderTextColor="rgba(255,255,255,0.35)"
      style={{
        marginTop: 8,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: "rgba(255,255,255,0.06)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.10)",
        color: "white",
        fontWeight: "800",
        opacity: disabled ? 0.6 : 1,
      }}
    />
  );
}

function Select({
  value,
  onValueChange,
  items,
  disabled,
}: {
  value: string;
  onValueChange: (v: string) => void;
  items: string[];
  disabled?: boolean;
}) {
  return (
    <View
      style={{
        marginTop: 8,
        borderRadius: 14,
        overflow: "hidden",
        backgroundColor: "rgba(255,255,255,0.06)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.10)",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <Picker
        selectedValue={value}
        onValueChange={(v) => onValueChange(String(v))}
        enabled={!disabled}
        style={{ color: "white" }}
        dropdownIconColor="white"
      >
        {items.map((x) => (
          <Picker.Item key={x} label={x} value={x} />
        ))}
      </Picker>
    </View>
  );
}

function YesNoSelect({
  value,
  onChange,
  disabled,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Select
      value={value ? "YES" : "NO"}
      onValueChange={(v) => onChange(v === "YES")}
      disabled={disabled}
      items={["YES", "NO"]}
    />
  );
}

function BigStatusBtn({
  active,
  label,
  onPress,
  disabled,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        flex: 1,
        paddingVertical: 16,
        borderRadius: 18,
        backgroundColor: active ? "rgba(46,125,255,0.28)" : "rgba(255,255,255,0.06)",
        borderWidth: 1,
        borderColor: active ? "rgba(46,125,255,0.60)" : "rgba(255,255,255,0.10)",
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <Text style={{ color: "white", fontWeight: "900", fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

function ActionBtn({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        flex: 1,
        paddingVertical: 12,
        borderRadius: 16,
        backgroundColor: "rgba(255,255,255,0.06)",
        borderWidth: 1,
        borderColor: "rgba(46,125,255,0.35)",
        alignItems: "center",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <Text style={{ color: "white", fontWeight: "900" }}>{label}</Text>
    </Pressable>
  );
}
