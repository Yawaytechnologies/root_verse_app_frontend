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

export type MariFormState = {
  qc_status: "PENDING" | "CHECKED";

  species: string;
  water_temperature: string;
  moisture_content: string;
  cleanliness: "CLEAN" | "AVERAGE" | "POOR";

  grade: "A" | "B" | "C" | "D";
  quality_score: "10" | "20" | "30" | "40" | "50" | "60";

  remarks: string;
  images: string[];
};

export const mariInitial = (): MariFormState => ({
  qc_status: "CHECKED",
  species: "",
  water_temperature: "",
  moisture_content: "",
  cleanliness: "CLEAN",
  grade: "A",
  quality_score: "40",
  remarks: "",
  images: [],
});

type Props = {
  visible: boolean;
  scannedCode: string;

  loading?: boolean;
  error?: string | null;
  data?: any;

  form: MariFormState;
  setFormField: <K extends keyof MariFormState>(
    k: K,
    v: MariFormState[K]
  ) => void;

  onPickImages: () => void;
  onRemoveImage: (uri: string) => void;

  submitLoading: boolean;
  submitError?: string | null;

  onCancel: () => void;

  // ✅ FIX: accept payload (allow async)
  onSubmit: (payload: any) => void | Promise<void>;

  // ✅ allow disabling submit when QR already filled
  readOnly?: boolean;
};

const QC_STATUS = ["PENDING", "CHECKED"] as const;
const CLEAN = ["CLEAN", "AVERAGE", "POOR"] as const;
const GRADE = ["A", "B", "C", "D"] as const;
const SCORE = ["10", "20", "30", "40", "50", "60"] as const;

export default function MariInspectionModal({
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
  const speciesAuto = data?.species ?? data?.fish_name ?? "";

  // ✅ build payload to send to screen submit(payload)
  const buildPayload = () => ({
    qc_status: form.qc_status,

    species: (speciesAuto || form.species || "").trim() || undefined,

    water_temperature: Number(form.water_temperature || 0),
    moisture_content: Number(form.moisture_content || 0),
    cleanliness: form.cleanliness,

    grade: form.grade,
    quality_score: Number(form.quality_score || 0),

    remarks: form.remarks?.trim() || undefined,

    // keep same naming pattern as aqua fix
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
                Mariculture Quality Inspection
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

            <Label>Species (auto)</Label>
            <ReadOnly value={speciesAuto || form.species || "—"} />

            <Label>Water Temperature</Label>
            <Input
              value={form.water_temperature}
              onChangeText={(v) => setFormField("water_temperature", v)}
              keyboardType="numeric"
            />

            <TwoCol>
              <View style={{ flex: 1 }}>
                <Label>Moisture Content (%)</Label>
                <Input
                  value={form.moisture_content}
                  onChangeText={(v) => setFormField("moisture_content", v)}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Label>Cleanliness</Label>
                <Select
                  value={form.cleanliness}
                  onValueChange={(v) => setFormField("cleanliness", v)}
                  items={CLEAN}
                />
              </View>
            </TwoCol>

            <TwoCol>
              <View style={{ flex: 1 }}>
                <Label>Grade</Label>
                <Select
                  value={form.grade}
                  onValueChange={(v) => setFormField("grade", v)}
                  items={GRADE}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Label>Quality Score</Label>
                <Select
                  value={form.quality_score}
                  onValueChange={(v) => setFormField("quality_score", v)}
                  items={SCORE}
                />
              </View>
            </TwoCol>

            <View style={{ marginTop: 14 }}>
              <Label>Capture Photos</Label>
              <View style={{ marginTop: 10 }}>
                <ActionBtn
                  label={`Pick Images (${form.images.length})`}
                  onPress={onPickImages}
                  disabled={disabled}
                />
              </View>
              <ImageList
                uris={form.images}
                onRemove={onRemoveImage}
                disabled={disabled}
              />
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
