import React from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import {
  ActionBtn,
  ImageList,
  Input,
  Label,
  ReadOnly,
  Select,
  TwoCol,
} from "./common";

export type AquaFormState = {
  qc_status: "PENDING" | "CHECKED";

  species: string;
  water_temperature: string;
  ph_level: string;
  grade: "30" | "40";

  remarks: string;
  images: string[];
};

export const aquaInitial = (): AquaFormState => ({
  qc_status: "CHECKED",
  species: "",
  water_temperature: "",
  ph_level: "",
  grade: "30",
  remarks: "",
  images: [],
});

type Props = {
  visible: boolean;
  scannedCode: string;

  loading?: boolean;
  error?: string | null;
  data?: any;

  form: AquaFormState;
  setFormField: <K extends keyof AquaFormState>(
    k: K,
    v: AquaFormState[K]
  ) => void;

  onPickImages: () => void;
  onRemoveImage: (uri: string) => void;

  submitLoading: boolean;
  submitError?: string | null;

  onCancel: () => void;

  // ✅ FIX: accept payload (and allow async)
  onSubmit: (payload: any) => void | Promise<void>;

  // ✅ OPTIONAL: screen passes this already; add if you want to disable UI when already filled
  readOnly?: boolean;
};

const QC_STATUS = ["PENDING", "CHECKED"] as const;
const GRADE = ["30", "40"] as const;

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
  const speciesAuto = data?.fish_name ?? data?.species ?? "";

  // ✅ Build the payload here and pass to screen submit(payload)
  const buildPayload = () => ({
    qc_status: form.qc_status,

    // keep auto species if backend provides it, else user entry
    species: (speciesAuto || form.species || "").trim() || undefined,

    water_temperature: Number(form.water_temperature || 0),
    ph_level: Number(form.ph_level || 0),

    grade: form.grade,
    remarks: form.remarks?.trim() || undefined,

    // IMPORTANT: screen expects images array and slice will convert to FormData if needed
    pond_condition_images: form.images,
  });

  const disabled = submitLoading || readOnly;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
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
                Aqua Quality Inspection
              </Text>
              <Text
                style={{
                  color: "rgba(255,255,255,0.65)",
                  marginTop: 5,
                  fontWeight: "900",
                }}
              >
                {scannedCode || "—"}
              </Text>
            </View>

            <Pressable onPress={onCancel} style={{ padding: 10 }}>
              <Text
                style={{
                  color: "rgba(255,255,255,0.85)",
                  fontWeight: "900",
                  fontSize: 18,
                }}
              >
                ✕
              </Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: 18 }}
            showsVerticalScrollIndicator
          >
            {loading ? (
              <View
                style={{
                  marginTop: 8,
                  flexDirection: "row",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <ActivityIndicator />
                <Text
                  style={{
                    color: "rgba(255,255,255,0.7)",
                    fontWeight: "800",
                  }}
                >
                  Loading…
                </Text>
              </View>
            ) : null}

            {!!error ? (
              <Text
                style={{
                  marginTop: 10,
                  color: "rgba(248,113,113,0.95)",
                  fontWeight: "900",
                }}
              >
                {error}
              </Text>
            ) : null}

            <Label>QC Status</Label>
            <Select
              value={form.qc_status}
              onValueChange={(v) => setFormField("qc_status", v)}
              items={QC_STATUS}
            />

            <Label>Fish Code</Label>
            <ReadOnly value={scannedCode || "—"} />

            <Label>Species (auto)</Label>
            <ReadOnly value={speciesAuto || form.species || "—"} />

            <TwoCol>
              <View style={{ flex: 1 }}>
                <Label>Water Temperature</Label>
                <Input
                  value={form.water_temperature}
                  onChangeText={(v) => setFormField("water_temperature", v)}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Label>pH Level</Label>
                <Input
                  value={form.ph_level}
                  onChangeText={(v) => setFormField("ph_level", v)}
                  keyboardType="numeric"
                />
              </View>
            </TwoCol>

            <Label>Grade</Label>
            <Select
              value={form.grade}
              onValueChange={(v) => setFormField("grade", v)}
              items={GRADE}
            />

            <View style={{ marginTop: 14 }}>
              <Label>Images of Pond Condition</Label>
              <View style={{ marginTop: 10 }}>
                <ActionBtn
                  label={`Pick Images (${form.images.length})`}
                  onPress={onPickImages}
                  disabled={disabled}
                />
              </View>
              <ImageList uris={form.images} onRemove={onRemoveImage} disabled={disabled} />
            </View>

            <View style={{ marginTop: 14 }}>
              <Label>Remarks</Label>
              <Input
                value={form.remarks}
                onChangeText={(v) => setFormField("remarks", v)}
                placeholder="Add remarks…"
                multiline
                numberOfLines={5}
              />
            </View>

            {!!submitError ? (
              <Text
                style={{
                  marginTop: 12,
                  color: "rgba(248,113,113,0.95)",
                  fontWeight: "900",
                }}
              >
                {submitError}
              </Text>
            ) : null}

            {readOnly ? (
              <Text
                style={{
                  marginTop: 12,
                  color: "rgba(255,255,255,0.7)",
                  fontWeight: "900",
                }}
              >
                This QR is already filled (read-only).
              </Text>
            ) : null}
          </ScrollView>

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
              // ✅ FIX: pass payload
              onPress={() => onSubmit(buildPayload())}
              disabled={disabled}
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 16,
                backgroundColor: "rgba(46,125,255,0.35)",
                borderWidth: 1,
                borderColor: "rgba(46,125,255,0.55)",
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 10,
                opacity: disabled ? 0.7 : 1,
              }}
            >
              {submitLoading ? <ActivityIndicator color="#fff" /> : null}
              <Text style={{ color: "white", fontWeight: "900" }}>Submit</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
