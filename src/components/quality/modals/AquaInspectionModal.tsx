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
  harvest_id: string;
  sample_count: string;
  sample_weight: string;

  grade: "A" | "B" | "C" | "D";
  disease_observation: "false" | "true";
  disease_notes: string;

  inspection_latitude: string;
  inspection_longitude: string;
  inspected_at: string;

  remarks: string;
  images: string[];
};

export const aquaInitial = (): AquaFormState => ({
  harvest_id: "",
  sample_count: "",
  sample_weight: "",

  grade: "A",
  disease_observation: "false",
  disease_notes: "",

  inspection_latitude: "",
  inspection_longitude: "",
  inspected_at: new Date().toISOString(),

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
  onSubmit: (payload: any) => void | Promise<void>;
  readOnly?: boolean;
};

const GRADES = ["A", "B", "C", "D"] as const;
const BOOLS = ["false", "true"] as const;

function clean(v: any) {
  const t = String(v ?? "").trim();
  return t;
}

function firstText(...vals: any[]) {
  for (const v of vals) {
    const t = clean(v);
    if (t) return t;
  }
  return "";
}

function toNumOrUndefined(v: any) {
  const t = clean(v);
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
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
  const harvestIdValue = firstText(
    form.harvest_id,
    data?.harvest_id,
    data?.harvestId,
    data?.harvest?.id,
    data?.harvest_record?.id
  );

  const sampleCountValue = firstText(
    form.sample_count,
    data?.sample_count,
    data?.latest_sampling?.sample_count,
    data?.sampling?.sample_count
  );

  const sampleWeightValue = firstText(
    form.sample_weight,
    data?.sample_weight,
    data?.latest_sampling?.sample_weight,
    data?.sampling?.sample_weight
  );

  const latValue = firstText(
    form.inspection_latitude,
    data?.inspection_latitude,
    data?.latitude,
    data?.pond?.latitude,
    data?.farm?.latitude
  );

  const lngValue = firstText(
    form.inspection_longitude,
    data?.inspection_longitude,
    data?.longitude,
    data?.pond?.longitude,
    data?.farm?.longitude
  );

  const species = firstText(
    data?.species,
    data?.shrimp_species,
    data?.fish_name,
    data?.culture?.species
  );

  const pondName = firstText(data?.pond_name, data?.pond?.pond_name, data?.pond?.name);
  const farmName = firstText(data?.farm_name, data?.farm?.farm_name, data?.farm?.name);

  const buildPayload = () => ({
    pond_qr_scan: scannedCode,

    harvest_id: toNumOrUndefined(harvestIdValue),

    sample_count: toNumOrUndefined(sampleCountValue),
    sample_weight: toNumOrUndefined(sampleWeightValue),

    grade: form.grade,
    disease_observation: form.disease_observation === "true",
    disease_notes: clean(form.disease_notes) || undefined,

    shrimp_images: form.images,

    inspection_latitude: toNumOrUndefined(latValue),
    inspection_longitude: toNumOrUndefined(lngValue),
    inspected_at: clean(form.inspected_at) || undefined,

    remarks: clean(form.remarks) || undefined,

    qc_status: "CHECKED",
    qc_result: "PASS",
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
                Aquaculture Quality Inspection
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

            <Label>Pond QR Scan</Label>
            <ReadOnly value={scannedCode || "—"} />

            {!!farmName ? (
              <>
                <Label>Farm</Label>
                <ReadOnly value={farmName} />
              </>
            ) : null}

            {!!pondName ? (
              <>
                <Label>Pond</Label>
                <ReadOnly value={pondName} />
              </>
            ) : null}

            {!!species ? (
              <>
                <Label>Species</Label>
                <ReadOnly value={species} />
              </>
            ) : null}

            <Label>Harvest ID</Label>
            <Input
              value={harvestIdValue}
              onChangeText={(v) => setFormField("harvest_id", v)}
              keyboardType="numeric"
              disabled={disabled}
              placeholder="Enter harvest id"
            />

            <TwoCol>
              <View style={{ flex: 1 }}>
                <Label>Sample Count</Label>
                <Input
                  value={sampleCountValue}
                  onChangeText={(v) => setFormField("sample_count", v)}
                  keyboardType="numeric"
                  disabled={disabled}
                  placeholder="50"
                />
              </View>

              <View style={{ flex: 1 }}>
                <Label>Sample Weight</Label>
                <Input
                  value={sampleWeightValue}
                  onChangeText={(v) => setFormField("sample_weight", v)}
                  keyboardType="numeric"
                  disabled={disabled}
                  placeholder="600"
                />
              </View>
            </TwoCol>

            <Label>Grade</Label>
            <Select
              value={form.grade}
              onValueChange={(v) => setFormField("grade", v)}
              items={GRADES}
              disabled={disabled}
            />

            <Label>Disease Observation</Label>
            <Select
              value={form.disease_observation}
              onValueChange={(v) => setFormField("disease_observation", v)}
              items={BOOLS}
              disabled={disabled}
            />

            <Label>Disease Notes</Label>
            <Input
              value={form.disease_notes}
              onChangeText={(v) => setFormField("disease_notes", v)}
              disabled={disabled}
              placeholder="No visible disease signs"
              multiline
              numberOfLines={4}
            />

            <View style={{ marginTop: 14 }}>
              <Label>Shrimp Images</Label>
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

            <TwoCol>
              <View style={{ flex: 1 }}>
                <Label>Inspection Latitude</Label>
                <Input
                  value={latValue}
                  onChangeText={(v) => setFormField("inspection_latitude", v)}
                  keyboardType="numeric"
                  disabled={disabled}
                  placeholder="10.7637"
                />
              </View>

              <View style={{ flex: 1 }}>
                <Label>Inspection Longitude</Label>
                <Input
                  value={lngValue}
                  onChangeText={(v) => setFormField("inspection_longitude", v)}
                  keyboardType="numeric"
                  disabled={disabled}
                  placeholder="79.8435"
                />
              </View>
            </TwoCol>

            <Label>Inspected At</Label>
            <Input
              value={form.inspected_at}
              onChangeText={(v) => setFormField("inspected_at", v)}
              disabled={disabled}
              placeholder="2026-06-15T09:30:00.000Z"
            />

            <View style={{ marginTop: 14 }}>
              <Label>Remarks</Label>
              <Input
                value={form.remarks}
                onChangeText={(v) => setFormField("remarks", v)}
                placeholder="Add remarks…"
                multiline
                numberOfLines={5}
                disabled={disabled}
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
                This inspection is read-only.
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