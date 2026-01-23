import React, { useEffect, useRef, useState } from "react";
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
import { httpJson } from "../../services/http"; // adjust if needed

import {
  fmtDate,
  fmtTime,
  FullRow,
  TwoColRow,
  type Division,
  type Lang,
} from "./QualityUI";

type Props = {
  division: Division; // ✅ NOW ACCEPTS division (fixes your TS error)
  lang: Lang;
  CameraView?: any; // optional (you can pass it or not)
};

export default function QcScanViewDetailsScreen({
  division,
  lang,
  CameraView,
}: Props) {
  const [hasScanned, setHasScanned] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [scannedCode, setScannedCode] = useState("");

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const scanLineY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineY, {
          toValue: 1,
          duration: 1300,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineY, {
          toValue: 0,
          duration: 1300,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scanLineY]);

  const scanTranslateY = scanLineY.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 210],
  });

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
      // ✅ if your endpoint is different, change it here
      const res = await httpJson<any>(
        `/api/filled/${encodeURIComponent(code)}?division=${encodeURIComponent(
          division
        )}`
      );

      if (!res?.success || !res?.qr) throw new Error("Not found");
      setData(res.qr);
    } catch (e: any) {
      Alert.alert("Not Found", e?.message || "No filled details for this QR");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const openForCode = (code: string) => {
    const c = (code || "").trim();
    if (!c) return;
    if (hasScanned) return;

    setHasScanned(true);
    setScannedCode(c);
    setOpen(true);
    fetchFilled(c);
  };

  return (
    <View style={{ marginTop: 12 }}>
      <Text style={{ color: "white", fontSize: 20, fontWeight: "900" }}>
        {lang === "en" ? "Scan & View Details" : "ஸ்கேன் & விவரங்கள்"}
      </Text>

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
          {CameraView ? (
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={(e: any) => {
                const code = (e?.data || "").trim();
                if (!code) return;
                openForCode(code);
              }}
            />
          ) : (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "rgba(255,255,255,0.7)", fontWeight: "800" }}>
                Camera not provided
              </Text>
            </View>
          )}

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

            <Text
              style={{
                marginTop: 14,
                color: "rgba(255,255,255,0.85)",
                fontWeight: "900",
              }}
            >
              {lang === "en"
                ? "Align QR inside the box"
                : "QR-ஐ பெட்டிக்குள் வைத்துப் ஸ்கேன் செய்யவும்"}
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
        <Text
          style={{
            color: "rgba(255,255,255,0.75)",
            fontWeight: "800",
            marginBottom: 8,
          }}
        >
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
                  {lang === "en" ? "Filled Details" : "நிரப்பப்பட்ட விவரங்கள்"}
                </Text>
                <Text
                  style={{
                    color: "rgba(255,255,255,0.6)",
                    marginTop: 4,
                    fontWeight: "700",
                  }}
                >
                  {scannedCode}
                </Text>
              </View>

              <Pressable onPress={reset} style={{ padding: 10 }}>
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
                <View style={{ marginTop: 18, flexDirection: "row", gap: 10, alignItems: "center" }}>
                  <ActivityIndicator />
                  <Text style={{ color: "rgba(255,255,255,0.7)", fontWeight: "700" }}>
                    Loading…
                  </Text>
                </View>
              ) : !data ? (
                <Text style={{ marginTop: 12, color: "rgba(255,255,255,0.7)", fontWeight: "800" }}>
                  No filled data.
                </Text>
              ) : (
                <View
                  style={{
                    borderRadius: 18,
                    padding: 14,
                    backgroundColor: "rgba(255,255,255,0.05)",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.08)",
                  }}
                >
                  <TwoColRow
                    left={{ label: "Code", value: data.code ?? "—" }}
                    right={{ label: "Type", value: data.type ?? "—" }}
                  />

                  <FullRow label="Status" value={data.status ?? "—"} />

                  <TwoColRow
                    left={{ label: "Vessel", value: data.vessel_name ?? "—" }}
                    right={{ label: "Fish", value: data.fish_name ?? "—" }}
                  />

                  <TwoColRow
                    left={{ label: "Weight", value: data.weight ? `${data.weight} kg` : "—" }}
                    right={{
                      label: "Date / Time",
                      value: `${fmtDate(data.date)} • ${fmtTime(data.time)}`,
                    }}
                  />

                  <TwoColRow
                    left={{ label: "QC Status", value: data.qc_status ?? "—" }}
                    right={{ label: "QC Result", value: data.qc_result ?? "—" }}
                  />

                  <TwoColRow
                    left={{ label: "Quality Grade", value: data.quality_grade ?? "—" }}
                    right={{ label: "QC Score", value: String(data.qc_score ?? "—") }}
                  />

                  <TwoColRow
                    left={{ label: "Temp (°C)", value: String(data.temperature_c ?? "—") }}
                    right={{ label: "Sample Count", value: String(data.sample_count ?? "—") }}
                  />

                  <FullRow
                    label="Reject Reason"
                    value={data.qr_reject_reason ?? data.reject_reason ?? "—"}
                  />
                  <FullRow label="Remarks" value={data.qc_remarks ?? "—"} />

                  {!!data.image_url && (
                    <View style={{ marginTop: 14 }}>
                      <Text style={{ color: "rgba(255,255,255,0.55)", fontWeight: "700" }}>
                        Profile Image
                      </Text>
                      <Image
                        source={{ uri: data.image_url }}
                        style={{
                          marginTop: 10,
                          width: "100%",
                          height: 160,
                          borderRadius: 16,
                          backgroundColor: "rgba(255,255,255,0.06)",
                        }}
                        resizeMode="cover"
                      />
                    </View>
                  )}

                  {!!data.crate_image_url && (
                    <View style={{ marginTop: 14 }}>
                      <Text style={{ color: "rgba(255,255,255,0.55)", fontWeight: "700" }}>
                        Crate Image
                      </Text>
                      <Image
                        source={{ uri: data.crate_image_url }}
                        style={{
                          marginTop: 10,
                          width: "100%",
                          height: 160,
                          borderRadius: 16,
                          backgroundColor: "rgba(255,255,255,0.06)",
                        }}
                        resizeMode="cover"
                      />
                    </View>
                  )}
                </View>
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
