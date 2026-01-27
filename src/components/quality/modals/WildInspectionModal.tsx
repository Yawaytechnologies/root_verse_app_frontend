// src/components/quality/modals/WildInspectionModal.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

import type { Lang } from "../QualityUI";
import { ImageList, Input, Label, ReadOnly, TwoCol, Select } from "./common";

export type QCStatus = "CHECKED" | "HOLD" | "REJECTED";
export type QcResult = "PASS" | "HOLD" | "REJECT";
export type QualityGrade = "A" | "B" | "C"; // ✅ no REJECTED

export type WildFormState = {
  // keep hidden for backend compatibility
  qc_status: QCStatus | null;

  qc_result: QcResult | null;
  quality_grade: QualityGrade | null;

  species: string;

  weight_kg: string;
  temperature_c: string;

  size: "SMALL" | "MEDIUM" | "LARGE";
  damage: "NONE" | "MINOR" | "MODERATE" | "SEVERE";

  reject_reason: string; // medium textarea
  remarks: string;

  images: string[];
};

export const wildInitial = (): WildFormState => ({
  qc_status: null,

  qc_result: null,
  quality_grade: null,

  species: "",

  weight_kg: "",
  temperature_c: "",

  size: "MEDIUM",
  damage: "NONE",

  reject_reason: "",
  remarks: "",

  images: [],
});

type Props = {
  visible: boolean;
  lang: Lang;
  scannedCode: string;

  loading?: boolean;
  error?: string | null;
  data?: any;

  form: WildFormState;
  setFormField: <K extends keyof WildFormState>(k: K, v: WildFormState[K]) => void;

  onPickImages: () => void;
  onRemoveImage: (uri: string) => void;

  submitLoading: boolean;
  submitError?: string | null;

  onCancel: () => void;
  onSubmit: (payload: any) => void | Promise<void>;

  readOnly: boolean;
};

/* ---------- input rules ---------- */
function sanitize3DigitInt(input: string) {
  return input.replace(/[^\d]/g, "").slice(0, 3);
}

function sanitizeTemp(input: string) {
  let v = input.replace(/[^\d.]/g, "");

  const firstDot = v.indexOf(".");
  if (firstDot !== -1) {
    v = v.slice(0, firstDot + 1) + v.slice(firstDot + 1).replace(/\./g, "");
  }
  if (v.startsWith(".")) v = "0" + v;

  const [a = "", b = ""] = v.split(".");
  const a2 = a.slice(0, 2);
  const b2 = b.slice(0, 2);

  if (firstDot !== -1) return `${a2}.${b2}`;
  return a2;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function formatDate(dt: Date) {
  return `${pad2(dt.getDate())}-${pad2(dt.getMonth() + 1)}-${dt.getFullYear()}`;
}
function formatTime(dt: Date) {
  return `${pad2(dt.getHours())}:${pad2(dt.getMinutes())}:${pad2(dt.getSeconds())}`;
}

function mapResultToStatus(r: QcResult | null): QCStatus | null {
  if (!r) return null;
  if (r === "PASS") return "CHECKED";
  if (r === "HOLD") return "HOLD";
  return "REJECTED";
}

export default function WildInspectionModal({
  visible,
  lang,
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
  readOnly,
}: Props) {
  const speciesAuto = data?.fish_name ?? "";

  const [capturedAtIso, setCapturedAtIso] = useState<string>("");
  const [capturedDate, setCapturedDate] = useState<string>("");
  const [capturedTime, setCapturedTime] = useState<string>("");

  useEffect(() => {
    if (visible) {
      const now = new Date();
      setCapturedAtIso(now.toISOString());
      setCapturedDate(formatDate(now));
      setCapturedTime(formatTime(now));
    }
  }, [visible]);

  const isReject = String(form.qc_result || "").toUpperCase() === "REJECT";

  const validation = useMemo(() => {
    if (readOnly) return { ok: true, msg: "" };

    if (!form.qc_result) return { ok: false, msg: "QC result required" };
    if (!form.quality_grade) return { ok: false, msg: "Quality grade required" };

    if (!form.weight_kg) return { ok: false, msg: "Weight required" };
    if (!form.temperature_c) return { ok: false, msg: "Temperature required" };

    if (!form.size) return { ok: false, msg: "Size required" };
    if (!form.damage) return { ok: false, msg: "Damage required" };

    if (isReject && !form.reject_reason.trim())
      return { ok: false, msg: "Reject reason required" };

    return { ok: true, msg: "" };
  }, [form, readOnly, isReject]);

  const onCaptureImage = async () => {
    if (readOnly || submitLoading) return;

    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;

    const res = await ImagePicker.launchCameraAsync({
      quality: 0.75,
      allowsEditing: false,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });

    if (res.canceled) return;
    const uri = res.assets?.[0]?.uri;
    if (!uri) return;

    const next = Array.from(new Set([...(form.images || []), uri]));
    setFormField("images", next);
  };

  const buildPayload = () => {
    const qc_status = mapResultToStatus(form.qc_result);

    return {
      qc_status,
      qc_result: form.qc_result,
      quality_grade: form.quality_grade,

      weight: String(form.weight_kg || "").trim(),
      temperature_c: String(form.temperature_c || "").trim(),

      size: form.size,
      damage: form.damage,
      is_damaged: form.damage !== "NONE",

      reject_reason: isReject ? form.reject_reason.trim() : null,
      qc_remarks: form.remarks?.trim() || null,

      inspected_at: capturedAtIso || null,
      images: form.images,
    };
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/60 p-4 justify-center">
        <View className="rounded-3xl bg-[#0b1630] h-[90%] overflow-hidden">
          {/* HEADER */}
          <View className="px-4 py-4 border-b border-white/10">
            <View className="flex-row items-start justify-between">
              {/* LEFT */}
              <View className="flex-1 pr-3">
                <Text className="text-white font-extrabold text-lg">
                  Wild Quality Inspection
                </Text>

                <View className="mt-2 flex-row items-center">
                  <Ionicons
                    name="qr-code-outline"
                    size={16}
                    color="rgba(255,255,255,0.7)"
                  />
                  <Text className="text-white/70 ml-2">{scannedCode}</Text>
                </View>

                {readOnly && (
                  <Text className="mt-2 text-amber-300 font-extrabold">
                    Already submitted (Read-only)
                  </Text>
                )}

                {!readOnly && !validation.ok && (
                  <Text className="mt-2 text-red-300 font-extrabold">
                    {validation.msg}
                  </Text>
                )}
              </View>

              {/* RIGHT: date then time below */}
              <View className="items-end gap-2">
                <View className="items-end">
                  <Text className="text-white/70 font-extrabold">
                    {capturedDate || "-"}
                  </Text>
                  <Text className="text-white/60 font-extrabold">
                    {capturedTime || "-"}
                  </Text>
                </View>

                <Pressable
                  onPress={onCancel}
                  className="w-10 h-10 rounded-2xl bg-white/10 items-center justify-center"
                >
                  <Ionicons name="close" size={20} color="white" />
                </Pressable>
              </View>
            </View>
          </View>

          {/* BODY */}
          <ScrollView
            className="flex-1"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 16, flexGrow: 1 }}
          >
            {loading && <ActivityIndicator />}
            {!!error && <Text className="text-red-400">{error}</Text>}

            {/* Fish code + Species */}
            <TwoCol>
              <View className="flex-1">
                <Label>Fish Code</Label>
                <ReadOnly value={scannedCode} />
              </View>
              <View className="flex-1">
                <Label>Species</Label>
                <ReadOnly value={speciesAuto || "-"} />
              </View>
            </TwoCol>

            {/* QC Result + Grade */}
            <TwoCol>
              <View className="flex-1">
                <Label>QC Result</Label>
                <Select<QcResult>
                  value={(form.qc_result || "") as QcResult | ""}
                  onValueChange={(v) => {
                    setFormField("qc_result", v);
                    setFormField("qc_status", mapResultToStatus(v)); // hidden mapping
                    if (v !== "REJECT") setFormField("reject_reason", "");
                  }}
                  items={["PASS", "HOLD", "REJECT"] as const}
                  disabled={readOnly || submitLoading}
                  placeholder="Select"
                />
              </View>

              <View className="flex-1">
                <Label>Quality Grade</Label>
                <Select<QualityGrade>
                  value={(form.quality_grade || "") as QualityGrade | ""}
                  onValueChange={(v) => setFormField("quality_grade", v)}
                  items={["A", "B", "C"] as const}
                  disabled={readOnly || submitLoading}
                  placeholder="Select"
                />
              </View>
            </TwoCol>

            {/* ✅ Weight + Temp side-by-side (your ask) */}
            <TwoCol>
              <View className="flex-1">
                <Label>Weight (kg)</Label>
                <Input
                  value={form.weight_kg}
                  onChangeText={(v) => setFormField("weight_kg", sanitize3DigitInt(v))}
                  keyboardType="number-pad"
                  maxLength={3}
                  disabled={readOnly || submitLoading}
                  placeholder="Eg: 120"
                />
              </View>

              <View className="flex-1">
                <Label>Temp (°C)</Label>
                <Input
                  value={form.temperature_c}
                  onChangeText={(v) => setFormField("temperature_c", sanitizeTemp(v))}
                  keyboardType="decimal-pad"
                  disabled={readOnly || submitLoading}
                  placeholder="Eg: 0.2"
                />
              </View>
            </TwoCol>

            {/* ✅ BELOW: Size + Damage side-by-side (your ask) */}
            <TwoCol>
              <View className="flex-1">
                <Label>Size</Label>
                <Select<"SMALL" | "MEDIUM" | "LARGE">
                  value={(form.size || "") as "SMALL" | "MEDIUM" | "LARGE" | ""}
                  onValueChange={(v) => setFormField("size", v)}
                  items={["SMALL", "MEDIUM", "LARGE"] as const}
                  disabled={readOnly || submitLoading}
                  placeholder="Select"
                />
              </View>

              <View className="flex-1">
                <Label>Damage</Label>
                <Select<"NONE" | "MINOR" | "MODERATE" | "SEVERE">
                  value={
                    (form.damage || "") as
                      | "NONE"
                      | "MINOR"
                      | "MODERATE"
                      | "SEVERE"
                      | ""
                  }
                  onValueChange={(v) => setFormField("damage", v)}
                  items={["NONE", "MINOR", "MODERATE", "SEVERE"] as const}
                  disabled={readOnly || submitLoading}
                  placeholder="Select"
                />
              </View>
            </TwoCol>

            {/* Reject Reason medium textarea */}
            <Label>Reject Reason</Label>
            <Input
              value={form.reject_reason}
              onChangeText={(v) => setFormField("reject_reason", v)}
              placeholder={isReject ? "Enter reason" : "Only when QC Result = REJECT"}
              disabled={readOnly || submitLoading || !isReject}
              multiline
              numberOfLines={3}
            />

            <Label>Remarks</Label>
            <Input
              value={form.remarks}
              onChangeText={(v) => setFormField("remarks", v)}
              placeholder="Write remarks"
              multiline
              numberOfLines={4}
              disabled={readOnly || submitLoading}
            />

            {/* Images buttons side-by-side */}
            <TwoCol>
              <View className="flex-1">
                <Label>Capture</Label>
                <Pressable
                  onPress={onCaptureImage}
                  disabled={readOnly || submitLoading}
                  className={[
                    "mt-2 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3",
                    readOnly || submitLoading ? "opacity-60" : "opacity-100",
                  ].join(" ")}
                >
                  <View className="flex-row items-center justify-center">
                    <Ionicons name="camera-outline" size={18} color="white" />
                    <Text className="text-white font-extrabold ml-2">Capture</Text>
                  </View>
                </Pressable>
              </View>

              <View className="flex-1">
                <Label>Gallery</Label>
                <Pressable
                  onPress={onPickImages}
                  disabled={readOnly || submitLoading}
                  className={[
                    "mt-2 rounded-2xl border border-blue-400/30 bg-blue-500/10 px-4 py-3",
                    readOnly || submitLoading ? "opacity-60" : "opacity-100",
                  ].join(" ")}
                >
                  <View className="flex-row items-center justify-center">
                    <Ionicons name="images-outline" size={18} color="white" />
                    <Text className="text-white font-extrabold ml-2">
                      Pick ({form.images.length})
                    </Text>
                  </View>
                </Pressable>
              </View>
            </TwoCol>

            <ImageList
              uris={form.images}
              onRemove={onRemoveImage}
              disabled={readOnly || submitLoading}
            />

            {!!submitError && <Text className="text-red-400 mt-2">{submitError}</Text>}
            <View style={{ height: 24 }} />
          </ScrollView>

          {/* FOOTER */}
          <View className="p-4 border-t border-white/10 flex-row gap-3">
            <Pressable
              onPress={onCancel}
              className="flex-1 bg-white/10 p-4 rounded-2xl"
            >
              <Text className="text-white text-center font-extrabold">Close</Text>
            </Pressable>

            {!readOnly && (
              <Pressable
                disabled={!validation.ok || submitLoading}
                onPress={() => onSubmit(buildPayload())}
                className="flex-1 bg-blue-500/30 p-4 rounded-2xl"
              >
                <Text className="text-white text-center font-extrabold">
                  {submitLoading ? "Submitting…" : "Submit"}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
