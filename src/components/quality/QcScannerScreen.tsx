  // src/components/quality/QcScannerScreen.tsx
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

  import * as ImagePicker from "expo-image-picker";
  import { CameraView, useCameraPermissions } from "expo-camera";

  import { useAppDispatch, useAppSelector } from "../../store/hooks";

  import {
    fetchCatchLogByQr,
    selectCatchLog,
    selectCatchLogLoading,
    selectCatchLogError,
    clearCatchLog,
  } from "../../store/quality/qrDetails.slice";

  import {
    submitQcFill,
    selectQcFillLoading,
    selectQcFillError,
    selectQcFillSuccess,
    resetQcFill,
  } from "../../store/quality/qcFill.slice";

  import { selectInspector } from "../../store/qualityAuth/qualityAuth.slice";

  // ✅ Use shared UI helpers (you already have this file)
  import {
    Badge,
    Input,
    Label,
    Segmented,
    fmtDate,
    fmtTime,
    type Division,
    type Lang,
  } from "./QualityUI";

  // ✅ enums
  const QC_STATUS = ["PENDING", "CHECKED"] as const;
  const QC_RESULT = ["PASS", "HOLD", "REJECT"] as const;
  const QC_GRADE = ["A", "B", "C", "REJECTED"] as const;
  const REJECT_REASONS = [
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

  type QcStatus = (typeof QC_STATUS)[number];
  type QcResult = (typeof QC_RESULT)[number];
  type QualityGrade = (typeof QC_GRADE)[number];
  type QrRejectReason = (typeof REJECT_REASONS)[number];

  type Props = {
    division: Division;
    lang: Lang;
  };

  export default function QcScannerScreen({ division, lang }: Props) {
    const dispatch = useAppDispatch();

    const inspector = useAppSelector(selectInspector);

    const catchLog = useAppSelector(selectCatchLog);
    const catchLoading = useAppSelector(selectCatchLogLoading);
    const catchError = useAppSelector(selectCatchLogError);

    const submitLoading = useAppSelector(selectQcFillLoading);
    const submitError = useAppSelector(selectQcFillError);
    const submitSuccess = useAppSelector(selectQcFillSuccess);

    const [cameraPerm, requestCameraPerm] = useCameraPermissions();

    const [scannedCode, setScannedCode] = useState<string>("");
    const [modalOpen, setModalOpen] = useState(false);
    const [hasScanned, setHasScanned] = useState(false);

    // ---------------- FORM STATE ----------------
    const [qc_status, setQcStatus] = useState<QcStatus>("CHECKED");
    const [qc_result, setQcResult] = useState<QcResult>("PASS");
    const [quality_grade, setQualityGrade] = useState<QualityGrade>("A");
    const [qr_reject_reason, setQrRejectReason] =
      useState<QrRejectReason>("OTHER");

    const [qc_score, setQcScore] = useState("40");
    const [temperature_c, setTemperatureC] = useState("2.5");
    const [sample_count, setSampleCount] = useState("20");
    const [odor_score, setOdorScore] = useState("5");
    const [gill_score, setGillScore] = useState("5");
    const [eye_score, setEyeScore] = useState("5");
    const [firmness_score, setFirmnessScore] = useState("5");

    const [ice_present, setIcePresent] = useState(true);
    const [packaging_intact, setPackagingIntact] = useState(true);
    const [foreign_matter_found, setForeignMatterFound] = useState(false);
    const [is_mixed_species, setIsMixedSpecies] = useState(false);
    const [is_contaminated, setIsContaminated] = useState(false);
    const [is_damaged, setIsDamaged] = useState(false);

    const [qc_remarks, setQcRemarks] = useState("");
    const [manualCode, setManualCode] = useState("");

    // images as URIs
    const [crate_images, setCrateImages] = useState<string[]>([]);

    // ---------------- SCAN LINE ANIMATION ----------------
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

    // ---------------- HELPERS ----------------
    const resetAll = () => {
      setModalOpen(false);
      setHasScanned(false);
      setScannedCode("");
      setManualCode("");
      setCrateImages([]);

      dispatch(clearCatchLog());
      dispatch(resetQcFill());
    };

    const openForCode = (code: string) => {
      const c = (code || "").trim();
      if (!c) return;

      // prevent double-scan spam
      if (hasScanned) return;

      setHasScanned(true);
      setScannedCode(c);
      setModalOpen(true);

      dispatch(resetQcFill());
      dispatch(clearCatchLog());
      dispatch(fetchCatchLogByQr(c));
    };

    useEffect(() => {
      if (submitSuccess) {
        Alert.alert("Saved", "QC submitted successfully");
        resetAll();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [submitSuccess]);

    useEffect(() => {
      if (submitError) Alert.alert("Failed", submitError);
    }, [submitError]);

    // if result is REJECT -> grade should be REJECTED (auto)
    useEffect(() => {
      if (qc_result === "REJECT") {
        setQualityGrade("REJECTED");
      } else if (quality_grade === "REJECTED") {
        setQualityGrade("A");
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [qc_result]);

    // if grade is REJECTED -> result should be REJECT (auto)
    useEffect(() => {
      if (quality_grade === "REJECTED") setQcResult("REJECT");
    }, [quality_grade]);

    const pickImages = async () => {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission needed", "Please allow gallery permission");
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (res.canceled) return;

      const uris = (res.assets || [])
        .map((a) => a.uri)
        .filter(Boolean) as string[];

      setCrateImages((prev) => {
        const merged = [...prev, ...uris];
        return merged.slice(0, 3); // ✅ keep max 3
      });
    };

    const removeImage = (uri: string) => {
      setCrateImages((prev) => prev.filter((x) => x !== uri));
    };

    const submit = async () => {
      if (!scannedCode) {
        Alert.alert("Scan required", "Please scan a QR first");
        return;
      }

      if (!inspector?.checker_code || !inspector?.id) {
        Alert.alert("Inspector missing", "QC inspector data not loaded");
        return;
      }

      const payload: any = {
        checker_code: inspector.checker_code,
        quality_checker_id: inspector.id,

        qc_status,
        qc_result,
        quality_grade,

        qc_score: Number(qc_score || 0),
        temperature_c: Number(temperature_c || 0),
        sample_count: Number(sample_count || 0),

        odor_score: Number(odor_score || 0),
        gill_score: Number(gill_score || 0),
        eye_score: Number(eye_score || 0),
        firmness_score: Number(firmness_score || 0),

        ice_present,
        packaging_intact,
        foreign_matter_found,
        is_mixed_species,
        is_contaminated,
        is_damaged,

        // ✅ only send when reject
        qr_reject_reason: qc_result === "REJECT" ? qr_reject_reason : undefined,

        qc_remarks: qc_remarks || undefined,

        // ✅ qcFill.slice must convert to FormData
        crate_images,
      };

      const action = await dispatch(submitQcFill({ qrCode: scannedCode, payload }));
      if (submitQcFill.rejected.match(action)) return;
    };

    // ---------------- UI ----------------
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
      <View style={{ marginTop: 14 }}>
        <Text style={{ color: "white", fontSize: 22, fontWeight: "900" }}>
          QC Scanner ({division})
        </Text>

        {/* ✅ CAMERA BOX */}
        <View
          style={{
            marginTop: 14,
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
              onBarcodeScanned={(e) => {
                const code = (e?.data || "").trim();
                if (!code) return;
                openForCode(code);
              }}
            />

            {/* Overlay */}
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
                {/* corners */}
                <View
                  style={{
                    position: "absolute",
                    left: 10,
                    top: 10,
                    width: 28,
                    height: 28,
                    borderLeftWidth: 4,
                    borderTopWidth: 4,
                    borderColor: "rgba(255,255,255,0.65)",
                    borderTopLeftRadius: 10,
                  }}
                />
                <View
                  style={{
                    position: "absolute",
                    right: 10,
                    top: 10,
                    width: 28,
                    height: 28,
                    borderRightWidth: 4,
                    borderTopWidth: 4,
                    borderColor: "rgba(255,255,255,0.65)",
                    borderTopRightRadius: 10,
                  }}
                />
                <View
                  style={{
                    position: "absolute",
                    left: 10,
                    bottom: 10,
                    width: 28,
                    height: 28,
                    borderLeftWidth: 4,
                    borderBottomWidth: 4,
                    borderColor: "rgba(255,255,255,0.65)",
                    borderBottomLeftRadius: 10,
                  }}
                />
                <View
                  style={{
                    position: "absolute",
                    right: 10,
                    bottom: 10,
                    width: 28,
                    height: 28,
                    borderRightWidth: 4,
                    borderBottomWidth: 4,
                    borderColor: "rgba(255,255,255,0.65)",
                    borderBottomRightRadius: 10,
                  }}
                />

                {/* scan line */}
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
                  fontSize: 14,
                }}
              >
                {lang === "en"
                  ? "Align QR inside the box"
                  : "QR-ஐ பெட்டிக்குள் வைத்துப் ஸ்கேன் செய்யவும்"}
              </Text>
            </View>
          </View>
        </View>

        {/* scanned pill */}
        {!!scannedCode && (
          <View
            style={{
              marginTop: 12,
              padding: 14,
              borderRadius: 18,
              backgroundColor: "rgba(255,255,255,0.06)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.10)",
            }}
          >
            <Text style={{ color: "white", fontWeight: "900" }}>
              Scanned: {scannedCode}
            </Text>
            <Text
              style={{
                marginTop: 6,
                color: "rgba(255,255,255,0.6)",
                fontWeight: "700",
              }}
            >
              {lang === "en"
                ? "Form opens as popup. Tap Cancel to rescan."
                : "படிவம் பாப்அப் ஆக திறக்கும். மீண்டும் ஸ்கேன் செய்ய Cancel."}
            </Text>
          </View>
        )}

        {/* Manual QR Code Input */}
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
            Enter QR Code manually
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
              if (!code) {
                Alert.alert("Missing code", "Please enter a QR code");
                return;
              }
              openForCode(code);
              setManualCode("");
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
            <Text style={{ color: "white", fontWeight: "900" }}>Use Code</Text>
          </Pressable>
        </View>

        {/* MODAL */}
        <Modal
          visible={modalOpen}
          transparent
          animationType="fade"
          onRequestClose={resetAll}
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
                    Quality Inspection
                  </Text>
                  <Text
                    style={{
                      color: "rgba(255,255,255,0.6)",
                      marginTop: 4,
                      fontWeight: "700",
                    }}
                  >
                    {scannedCode || "—"}
                  </Text>
                </View>

                <Pressable onPress={resetAll} style={{ padding: 10 }}>
                  <Text style={{ color: "rgba(255,255,255,0.85)", fontWeight: "900", fontSize: 18 }}>
                    ✕
                  </Text>
                </Pressable>
              </View>

              <ScrollView
                contentContainerStyle={{ padding: 16, paddingBottom: 18 }}
                showsVerticalScrollIndicator
              >
                {/* Catch log details */}
                <View
                  style={{
                    borderRadius: 18,
                    padding: 14,
                    backgroundColor: "rgba(255,255,255,0.05)",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.08)",
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                    <Text style={{ color: "white", fontWeight: "900", fontSize: 14 }}>
                      Catch Log Details
                    </Text>

                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {!!catchLog?.status && (
                        <Badge
                          text={catchLog.status}
                          tone={catchLog.status === "FILLED" ? "good" : "muted"}
                        />
                      )}
                      {!!catchLog?.type && <Badge text={catchLog.type} tone="muted" />}
                    </View>
                  </View>

                  {catchLoading ? (
                    <View style={{ marginTop: 12, flexDirection: "row", gap: 10, alignItems: "center" }}>
                      <ActivityIndicator />
                      <Text style={{ color: "rgba(255,255,255,0.7)", fontWeight: "700" }}>
                        Loading…
                      </Text>
                    </View>
                  ) : catchError ? (
                    <Text style={{ marginTop: 12, color: "rgba(248,113,113,0.95)", fontWeight: "800" }}>
                      {catchError}
                    </Text>
                  ) : (
                    <>
                      <View style={{ marginTop: 12, flexDirection: "row", gap: 12 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: "rgba(255,255,255,0.55)", fontWeight: "700" }}>
                            Vessel
                          </Text>
                          <Text style={{ color: "white", fontWeight: "900", marginTop: 4 }}>
                            {catchLog?.vessel_name || "—"}
                          </Text>
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text style={{ color: "rgba(255,255,255,0.55)", fontWeight: "700" }}>
                            Fish
                          </Text>
                          <Text style={{ color: "white", fontWeight: "900", marginTop: 4 }}>
                            {catchLog?.fish_name || "—"}
                          </Text>
                        </View>
                      </View>

                      <View style={{ marginTop: 12, flexDirection: "row", gap: 12 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: "rgba(255,255,255,0.55)", fontWeight: "700" }}>
                            Weight
                          </Text>
                          <Text style={{ color: "white", fontWeight: "900", marginTop: 4 }}>
                            {catchLog?.weight ? `${catchLog.weight} kg` : "—"}
                          </Text>
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text style={{ color: "rgba(255,255,255,0.55)", fontWeight: "700" }}>
                            Date / Time
                          </Text>
                          <Text style={{ color: "white", fontWeight: "900", marginTop: 4 }}>
                            {fmtDate(catchLog?.date)} • {fmtTime(catchLog?.time)}
                          </Text>
                        </View>
                      </View>

                      {!!catchLog?.image_url && (
                        <View style={{ marginTop: 12 }}>
                          <Text style={{ color: "rgba(255,255,255,0.55)", fontWeight: "700" }}>
                            Profile Image
                          </Text>
                          <Image
                            source={{ uri: catchLog.image_url }}
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
                    </>
                  )}
                </View>

                {/* QC form */}
                <View style={{ marginTop: 14 }}>
                  <Text style={{ color: "white", fontWeight: "900", fontSize: 14 }}>
                    QC Fields
                  </Text>

                  <Segmented<QcStatus
                    >
                    label="QC Status"
                    value={qc_status}
                    options={QC_STATUS}
                    onChange={setQcStatus}
                  />

                  <Segmented<QcResult>
                    label="QC Result"
                    value={qc_result}
                    options={QC_RESULT}
                    onChange={setQcResult}
                  />

                  <Segmented<QualityGrade>
                    label="Quality Grade"
                    value={quality_grade}
                    options={QC_GRADE}
                    onChange={setQualityGrade}
                  />

                  {qc_result === "REJECT" && (
                    <Segmented<QrRejectReason>
                      label="Reject Reason"
                      value={qr_reject_reason}
                      options={REJECT_REASONS}
                      onChange={setQrRejectReason}
                    />
                  )}

                  {/* numeric fields */}
                  <View style={{ flexDirection: "row", gap: 12, marginTop: 14 }}>
                    <View style={{ flex: 1 }}>
                      <Label>QC Score</Label>
                      <Input value={qc_score} onChangeText={setQcScore} keyboardType="numeric" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Label>Temp (°C)</Label>
                      <Input value={temperature_c} onChangeText={setTemperatureC} keyboardType="numeric" />
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Label>Sample Count</Label>
                      <Input value={sample_count} onChangeText={setSampleCount} keyboardType="numeric" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Label>Odor Score</Label>
                      <Input value={odor_score} onChangeText={setOdorScore} keyboardType="numeric" />
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Label>Gill Score</Label>
                      <Input value={gill_score} onChangeText={setGillScore} keyboardType="numeric" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Label>Eye Score</Label>
                      <Input value={eye_score} onChangeText={setEyeScore} keyboardType="numeric" />
                    </View>
                  </View>

                  <View style={{ marginTop: 12 }}>
                    <Label>Firmness Score</Label>
                    <Input value={firmness_score} onChangeText={setFirmnessScore} keyboardType="numeric" />
                  </View>

                  {/* booleans */}
                  <View style={{ marginTop: 14 }}>
                    <Label>Checks</Label>
                    <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                      {[
                        ["Ice Present", ice_present, setIcePresent],
                        ["Packaging Intact", packaging_intact, setPackagingIntact],
                        ["Foreign Matter", foreign_matter_found, setForeignMatterFound],
                        ["Mixed Species", is_mixed_species, setIsMixedSpecies],
                        ["Contaminated", is_contaminated, setIsContaminated],
                        ["Damaged", is_damaged, setIsDamaged],
                      ].map(([label, val, setVal]: any) => (
                        <Pressable
                          key={label}
                          onPress={() => setVal(!val)}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            borderRadius: 14,
                            backgroundColor: val ? "rgba(52,211,153,0.18)" : "rgba(255,255,255,0.06)",
                            borderWidth: 1,
                            borderColor: val ? "rgba(52,211,153,0.35)" : "rgba(255,255,255,0.10)",
                          }}
                        >
                          <Text style={{ color: "white", fontWeight: "900", fontSize: 12 }}>
                            {label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  {/* Images */}
                  <View style={{ marginTop: 16 }}>
                    <Label>Crate Images (max 3)</Label>

                    <Pressable
                      onPress={pickImages}
                      style={{
                        marginTop: 10,
                        paddingVertical: 12,
                        borderRadius: 16,
                        backgroundColor: "rgba(255,255,255,0.06)",
                        borderWidth: 1,
                        borderColor: "rgba(46,125,255,0.35)",
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ color: "white", fontWeight: "900" }}>
                        Pick Images ({crate_images.length})
                      </Text>
                    </Pressable>

                    {crate_images.length > 0 && (
                      <View style={{ marginTop: 12, gap: 10 }}>
                        {crate_images.map((uri) => (
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
                              onPress={() => removeImage(uri)}
                              style={{
                                paddingVertical: 10,
                                alignItems: "center",
                                backgroundColor: "rgba(248,113,113,0.14)",
                                borderTopWidth: 1,
                                borderTopColor: "rgba(248,113,113,0.25)",
                              }}
                            >
                              <Text style={{ color: "white", fontWeight: "900" }}>Remove</Text>
                            </Pressable>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Remarks */}
                  <View style={{ marginTop: 16 }}>
                    <Label>Remarks</Label>
                    <Input
                      value={qc_remarks}
                      onChangeText={setQcRemarks}
                      placeholder="Add QC remarks…"
                      multiline
                      numberOfLines={4}
                    />
                  </View>

                  {!!submitError && (
                    <Text style={{ marginTop: 12, color: "rgba(248,113,113,0.95)", fontWeight: "900" }}>
                      {submitError}
                    </Text>
                  )}
                </View>
              </ScrollView>

              {/* footer buttons */}
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
                  onPress={resetAll}
                  disabled={submitLoading}
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
                  onPress={submit}
                  disabled={submitLoading || catchLoading}
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    borderRadius: 16,
                    backgroundColor: submitLoading ? "rgba(46,125,255,0.22)" : "rgba(46,125,255,0.35)",
                    borderWidth: 1,
                    borderColor: "rgba(46,125,255,0.55)",
                    alignItems: "center",
                    flexDirection: "row",
                    justifyContent: "center",
                    gap: 10,
                  }}
                >
                  {submitLoading ? <ActivityIndicator color="#fff" /> : null}
                  <Text style={{ color: "white", fontWeight: "900" }}>Submit Inspection</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );      
  }
