// src/components/quality/QcScanViewDetailsScreen.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CameraView, useCameraPermissions } from "expo-camera";

import {
  fmtDate,
  fmtTime,
  FullRow,
  TwoColRow,
  type Division,
  type Lang,
} from "./QualityUI";

type Props = {
  division: Division;
  lang: Lang;
};

const TOKEN_KEY = "auth_token";

// ✅ your real backend for filled overview
const FILLED_BASE = "https://rootverse-backend.onrender.com";
const FILLED_ENDPOINT = (code: string) =>
  `${FILLED_BASE}/api/filled/${encodeURIComponent(code)}`;

function normalizeFilled(raw: any) {
  // support common backend shapes:
  // { success, data }, { success, qr }, direct object
  const obj = raw?.data ?? raw?.qr ?? raw;

  // try to normalize images
  const crateImages =
    Array.isArray(obj?.crate_images) ? obj.crate_images :
    Array.isArray(obj?.crateImages) ? obj.crateImages :
    Array.isArray(obj?.images) ? obj.images :
    [];

  const otherImages: string[] = [];
  if (typeof obj?.image_url === "string") otherImages.push(obj.image_url);
  if (typeof obj?.profile_image_url === "string") otherImages.push(obj.profile_image_url);
  if (typeof obj?.crate_image_url === "string") otherImages.push(obj.crate_image_url);
  if (typeof obj?.catch_image_url === "string") otherImages.push(obj.catch_image_url);

  const mergedImages = [...crateImages, ...otherImages].filter(Boolean);

  return { ...obj, _images: mergedImages };
}

export default function QcScanViewDetailsScreen({ division, lang }: Props) {
  const [cameraPerm, requestCameraPerm] = useCameraPermissions();

  const [hasScanned, setHasScanned] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [scannedCode, setScannedCode] = useState("");

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  // scan line animation
  const scanLineY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineY, { toValue: 1, duration: 1300, useNativeDriver: true }),
        Animated.timing(scanLineY, { toValue: 0, duration: 1300, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scanLineY]);

  const scanTranslateY = useMemo(
    () =>
      scanLineY.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 210],
      }),
    [scanLineY]
  );

  const reset = () => {
    setHasScanned(false);
    setScannedCode("");
    setManualCode("");
    setOpen(false);
    setLoading(false);
    setData(null);
  };

  const fetchFilled = async (code: string) => {
    setLoading(true);
    setData(null);

    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);

      const res = await fetch(FILLED_ENDPOINT(code), {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const text = await res.text();
      let raw: any = {};
      try {
        raw = text ? JSON.parse(text) : {};
      } catch {
        raw = { message: text };
      }

      if (!res.ok) {
        const msg = raw?.message || raw?.error || `FILLED_FETCH_FAILED_${res.status}`;
        throw new Error(msg);
      }

      const normalized = normalizeFilled(raw);

      // hard guard: must have something meaningful
      if (!normalized) throw new Error("NO_DATA");
      setData(normalized);
    } catch (e: any) {
      Alert.alert("Not Found", e?.message || "No filled details for this QR");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const openForCode = (code: string) => {
    const c = String(code || "").trim();
    if (!c) return;

    // prevent spam
    if (hasScanned) return;

    setHasScanned(true);
    setScannedCode(c);
    setOpen(true);
    fetchFilled(c);
  };

  // ---------- permission UI ----------
  if (!cameraPerm) {
    return (
      <View style={{ padding: 16 }}>
        <Text style={{ color: "white" }}>Requesting camera permission…</Text>
      </View>
    );
  }

  if (!cameraPerm.granted) {
    return (
      <View style={{ padding: 16 }}>
        <Text style={{ color: "white", fontWeight: "900", fontSize: 16 }}>
          Camera permission required
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: 8 }}>
          Enable camera permission to scan QR codes.
        </Text>

        <Pressable
          onPress={requestCameraPerm}
          style={{
            marginTop: 14,
            paddingVertical: 12,
            borderRadius: 14,
            backgroundColor: "rgba(46,125,255,0.25)",
            borderWidth: 1,
            borderColor: "rgba(46,125,255,0.5)",
            alignItems: "center",
          }}
        >
          <Text style={{ color: "white", fontWeight: "900" }}>Allow Camera</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ marginTop: 12 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ color: "white", fontSize: 20, fontWeight: "900" }}>
          {lang === "en" ? "Scan & View Details" : "ஸ்கேன் & விவரங்கள்"} ({division})
        </Text>

        <Pressable
          onPress={reset}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 14,
            backgroundColor: "rgba(255,255,255,0.06)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.10)",
          }}
        >
          <Text style={{ color: "white", fontWeight: "900" }}>
            {lang === "en" ? "Rescan" : "மீண்டும்"}
          </Text>
        </Pressable>
      </View>

      {/* CAMERA BOX */}
      <View
        style={{
          marginTop: 12,
          borderRadius: 22,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.10)",
          backgroundColor: "rgba(0,0,0,0.35)",
        }}
      >
        <View style={{ height: 320 }}>
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={(e: any) => {
              const code = String(e?.data || "").trim();
              if (!code) return;
              openForCode(code);
            }}
          />

          {/* overlay */}
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              inset: 0,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View
              style={{
                width: 260,
                height: 260,
                borderRadius: 18,
                borderWidth: 2,
                borderColor: "rgba(46,125,255,0.85)",
                backgroundColor: "rgba(0,0,0,0.12)",
              }}
            >
              <Animated.View
                style={{
                  position: "absolute",
                  left: 12,
                  right: 12,
                  height: 2,
                  borderRadius: 999,
                  backgroundColor: "rgba(46,125,255,0.95)",
                  transform: [{ translateY: scanTranslateY }],
                  top: 16,
                }}
              />
            </View>

            <Text style={{ marginTop: 14, color: "rgba(255,255,255,0.85)", fontWeight: "900" }}>
              {lang === "en" ? "Align QR inside the box" : "QR-ஐ பெட்டிக்குள் வைத்துப் ஸ்கேன் செய்யவும்"}
            </Text>
          </View>
        </View>
      </View>

      {/* Manual input */}
      <View
        style={{
          marginTop: 14,
          padding: 14,
          borderRadius: 18,
          backgroundColor: "rgba(255,255,255,0.06)",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.10)",
        }}
      >
        <Text style={{ color: "rgba(255,255,255,0.75)", fontWeight: "800", marginBottom: 8 }}>
          {lang === "en" ? "Enter QR Code manually" : "QR Code கைமுறையாக உள்ளிடவும்"}
        </Text>

        <TextInput
          value={manualCode}
          onChangeText={setManualCode}
          placeholder="e.g. RV-VESSEL-000638"
          placeholderTextColor="rgba(255,255,255,0.35)"
          autoCapitalize="characters"
          autoCorrect={false}
          style={{
            borderRadius: 14,
            paddingHorizontal: 14,
            paddingVertical: 12,
            backgroundColor: "rgba(0,0,0,0.35)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.15)",
            color: "white",
            fontWeight: "900",
            letterSpacing: 0.5,
          }}
        />

        <Pressable
          onPress={() => {
            const code = manualCode.trim();
            if (!code) return Alert.alert("Missing code", "Please enter a QR code");
            openForCode(code);
          }}
          style={{
            marginTop: 10,
            paddingVertical: 12,
            borderRadius: 14,
            backgroundColor: "rgba(46,125,255,0.35)",
            borderWidth: 1,
            borderColor: "rgba(46,125,255,0.55)",
            alignItems: "center",
          }}
        >
          <Text style={{ color: "white", fontWeight: "900" }}>
            {lang === "en" ? "View Details" : "விவரங்களை காண்க"}
          </Text>
        </Pressable>
      </View>

      {/* MODAL details */}
      <Modal visible={open} transparent animationType="fade" onRequestClose={reset}>
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
              maxHeight: "88%",
              borderRadius: 22,
              overflow: "hidden",
              backgroundColor: "#0b1630",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.10)",
            }}
          >
            {/* header */}
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
                  {lang === "en" ? "Overall Details" : "முழு விவரங்கள்"}
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.6)", marginTop: 4, fontWeight: "700" }}>
                  {scannedCode}
                </Text>
              </View>

              <Pressable onPress={reset} style={{ padding: 10 }}>
                <Text style={{ color: "rgba(255,255,255,0.85)", fontWeight: "900", fontSize: 18 }}>
                  ✕
                </Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 18 }} showsVerticalScrollIndicator>
              {loading ? (
                <View style={{ marginTop: 18, flexDirection: "row", gap: 10, alignItems: "center" }}>
                  <ActivityIndicator />
                  <Text style={{ color: "rgba(255,255,255,0.7)", fontWeight: "700" }}>Loading…</Text>
                </View>
              ) : !data ? (
                <Text style={{ marginTop: 12, color: "rgba(255,255,255,0.7)", fontWeight: "800" }}>
                  No data.
                </Text>
              ) : (
                <>
                  {/* -------- Catch Log -------- */}
                  <Section title="Catch Log">
                    <TwoColRow
                      left={{ label: "Type", value: data.type ?? "—" }}
                      right={{ label: "Status", value: data.status ?? "—" }}
                    />

                    <TwoColRow
                      left={{ label: "Trip ID", value: String(data.trip_id ?? "—") }}
                      right={{ label: "Owner ID", value: String(data.owner_id ?? "—") }}
                    />

                    <TwoColRow
                      left={{ label: "Vessel ID", value: String(data.rv_vessel_id ?? "—") }}
                      right={{ label: "Fish ID", value: String(data.fish_id ?? "—") }}
                    />

                    <TwoColRow
                      left={{ label: "Vessel", value: data.vessel_name ?? "—" }}
                      right={{ label: "Fish", value: data.fish_name ?? "—" }}
                    />

                    <TwoColRow
                      left={{ label: "Weight", value: data.weight ? `${data.weight} kg` : "—" }}
                      right={{ label: "Date / Time", value: `${fmtDate(data.date)} • ${fmtTime(data.time)}` }}
                    />

                    <FullRow
                      label="Location"
                      value={
                        data.latitude && data.longitude
                          ? `${data.latitude}, ${data.longitude}`
                          : "—"
                      }
                    />
                  </Section>

                  {/* -------- QC Inspection -------- */}
                  <Section title="QC Inspection">
                    <TwoColRow
                      left={{ label: "Checker Code", value: data.checker_code ?? "—" }}
                      right={{ label: "Checker Name", value: data.checker_name ?? "—" }}
                    />

                    <TwoColRow
                      left={{ label: "QC Status", value: data.qc_status ?? "—" }}
                      right={{ label: "QC Result", value: data.qc_result ?? "—" }}
                    />

                    <TwoColRow
                      left={{ label: "Grade", value: data.quality_grade ?? "—" }}
                      right={{ label: "Reject Reason", value: data.qr_reject_reason ?? "—" }}
                    />

                    <TwoColRow
                      left={{ label: "QC Score", value: data.qc_score != null ? String(data.qc_score) : "—" }}
                      right={{ label: "Temp (°C)", value: data.temperature_c != null ? String(data.temperature_c) : "—" }}
                    />

                    <TwoColRow
                      left={{ label: "Sample Count", value: data.sample_count != null ? String(data.sample_count) : "—" }}
                      right={{ label: "Odor", value: data.odor_score != null ? String(data.odor_score) : "—" }}
                    />

                    <TwoColRow
                      left={{ label: "Gill", value: data.gill_score != null ? String(data.gill_score) : "—" }}
                      right={{ label: "Eye", value: data.eye_score != null ? String(data.eye_score) : "—" }}
                    />

                    <FullRow
                      label="Firmness"
                      value={data.firmness_score != null ? String(data.firmness_score) : "—"}
                    />

                    <TwoColRow
                      left={{ label: "Ice Present", value: data.ice_present == null ? "—" : data.ice_present ? "YES" : "NO" }}
                      right={{ label: "Packaging Intact", value: data.packaging_intact == null ? "—" : data.packaging_intact ? "YES" : "NO" }}
                    />

                    <TwoColRow
                      left={{ label: "Foreign Matter", value: data.foreign_matter_found == null ? "—" : data.foreign_matter_found ? "YES" : "NO" }}
                      right={{ label: "Mixed Species", value: data.is_mixed_species == null ? "—" : data.is_mixed_species ? "YES" : "NO" }}
                    />

                    <TwoColRow
                      left={{ label: "Contaminated", value: data.is_contaminated == null ? "—" : data.is_contaminated ? "YES" : "NO" }}
                      right={{ label: "Damaged", value: data.is_damaged == null ? "—" : data.is_damaged ? "YES" : "NO" }}
                    />

                    <FullRow label="Remarks" value={data.qc_remarks ?? "—"} />
                    <FullRow label="Updated At" value={data.updated_at ?? "—"} />
                  </Section>

                  {/* -------- Images -------- */}
                  <Section title="Images">
                    {Array.isArray(data._images) && data._images.length > 0 ? (
                      <View style={{ marginTop: 10, gap: 10 }}>
                        {data._images.slice(0, 6).map((uri: string) => (
                          <Image
                            key={uri}
                            source={{ uri }}
                            style={{
                              width: "100%",
                              height: 170,
                              borderRadius: 16,
                              backgroundColor: "rgba(255,255,255,0.06)",
                            }}
                            resizeMode="cover"
                          />
                        ))}
                      </View>
                    ) : (
                      <Text style={{ color: "rgba(255,255,255,0.7)", fontWeight: "800", marginTop: 10 }}>
                        No images
                      </Text>
                    )}
                  </Section>
                </>
              )}
            </ScrollView>

            <View style={{ padding: 14, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)" }}>
              <Pressable
                onPress={reset}
                style={{
                  paddingVertical: 14,
                  borderRadius: 16,
                  backgroundColor: "rgba(255,255,255,0.07)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.10)",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "white", fontWeight: "900" }}>
                  {lang === "en" ? "Close" : "மூடு"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ---------- small UI ---------- */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View
      style={{
        marginTop: 12,
        borderRadius: 18,
        padding: 14,
        backgroundColor: "rgba(255,255,255,0.05)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
      }}
    >
      <Text style={{ color: "white", fontWeight: "900", fontSize: 14 }}>{title}</Text>
      <View style={{ marginTop: 10 }}>{children}</View>
    </View>
  );
}
