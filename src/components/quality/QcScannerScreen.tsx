// src/components/quality/QcScannerScreen.tsx
import React, { useEffect, useRef, useState } from "react";
import { Alert, Animated, Pressable, Text, TextInput, View } from "react-native";
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
  resetQcFill,
} from "../../store/quality/qcFill.slice";

import { selectInspector } from "../../store/qualityAuth/qualityAuth.slice";
import { type Division, type Lang } from "./QualityUI";

import WildInspectionModal, { type WildFormState, wildInitial } from "./modals/WildInspectionModal";
import AquaInspectionModal, { type AquaFormState, aquaInitial } from "./modals/AquaInspectionModal";
import MariInspectionModal, { type MariFormState, mariInitial } from "./modals/MariInspectionModal";

import { upsertQcFillDraft, markQcFillSynced } from "../../utils/qcFillQueue";

type Props = {
  division: Division;
  lang: Lang;
  onAfterSubmit?: (qcResult: "PASS" | "HOLD" | "REJECT" | string) => void;
};

function upper(x: any) {
  return String(x || "").toUpperCase();
}

/** ✅ Extract qc_result from ANY backend shape */
function extractQcResult(res: any, fallbackPayload: any): string {
  const candidates = [
    res?.qr?.qc_result,
    res?.qr?.qcResult,
    res?.raw?.qr?.qc_result,
    res?.raw?.updatedQr?.qc_result,
    res?.raw?.data?.qr?.qc_result,
    res?.raw?.data?.updatedQr?.qc_result,
    res?.data?.qr?.qc_result,
    res?.updatedQr?.qc_result,
    fallbackPayload?.qc_result,
    fallbackPayload?.qcResult,
    fallbackPayload?.qc_status, // last fallback (not ideal)
  ];

  const r = upper(candidates.find((x) => !!x) || "");

  // normalize weird backend values
  if (r === "APPROVED") return "PASS";
  if (r === "REJECTED") return "REJECT";
  if (r === "CHECKED") return "PASS"; // some systems store checked=pass
  return r;
}

function deriveQcStatus(qcResult: string): string {
  const r = upper(qcResult);
  if (r === "REJECT") return "REJECTED";
  if (r === "HOLD") return "HOLD";
  if (r === "PASS") return "CHECKED";
  return "CHECKED";
}

export default function QcScannerScreen({ division, lang, onAfterSubmit }: Props) {
  const dispatch = useAppDispatch();

  const inspector = useAppSelector(selectInspector);

  const catchLog = useAppSelector(selectCatchLog);
  const catchLoading = useAppSelector(selectCatchLogLoading);
  const catchError = useAppSelector(selectCatchLogError);

  const submitLoading = useAppSelector(selectQcFillLoading);
  const submitError = useAppSelector(selectQcFillError);

  const [cameraPerm, requestCameraPerm] = useCameraPermissions();

  const [scannedCode, setScannedCode] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [manualCode, setManualCode] = useState("");

  const [wildForm, setWildForm] = useState<WildFormState>(wildInitial());
  const [aquaForm, setAquaForm] = useState<AquaFormState>(aquaInitial());
  const [mariForm, setMariForm] = useState<MariFormState>(mariInitial());

  const setWildField = <K extends keyof WildFormState>(k: K, v: WildFormState[K]) =>
    setWildForm((p: WildFormState) => ({ ...p, [k]: v }));

  const setAquaField = <K extends keyof AquaFormState>(k: K, v: AquaFormState[K]) =>
    setAquaForm((p: AquaFormState) => ({ ...p, [k]: v }));

  const setMariField = <K extends keyof MariFormState>(k: K, v: MariFormState[K]) =>
    setMariForm((p: MariFormState) => ({ ...p, [k]: v }));

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

  const scanTranslateY = scanLineY.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 210],
  });

  const resetAll = () => {
    setModalOpen(false);
    setHasScanned(false);
    setScannedCode("");
    setManualCode("");

    setWildForm(wildInitial());
    setAquaForm(aquaInitial());
    setMariForm(mariInitial());

    dispatch(clearCatchLog());
    dispatch(resetQcFill());
  };

  const openForCode = (code: string) => {
    const c = String(code || "").trim();
    if (!c) return;
    if (hasScanned) return;

    setHasScanned(true);
    setScannedCode(c);
    setModalOpen(true);

    dispatch(resetQcFill());
    dispatch(clearCatchLog());
    dispatch(fetchCatchLogByQr(c));
  };

  const pickImages = async (max: number) => {
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

    const uris = (res.assets || []).map((a) => a.uri).filter(Boolean) as string[];

    if (division === "WILD") setWildField("images", [...wildForm.images, ...uris].slice(0, max));
    else if (division === "AQUA") setAquaField("images", [...aquaForm.images, ...uris].slice(0, max));
    else setMariField("images", [...mariForm.images, ...uris].slice(0, max));
  };

  const removeImage = (uri: string) => {
    if (division === "WILD") setWildField("images", wildForm.images.filter((x) => x !== uri));
    else if (division === "AQUA") setAquaField("images", aquaForm.images.filter((x) => x !== uri));
    else setMariField("images", mariForm.images.filter((x) => x !== uri));
  };

  const readOnly = String(catchLog?.status || "").toUpperCase() === "FILLED";

  const submit = async (payload: any) => {
    if (!scannedCode) {
      Alert.alert("Scan required", "Please scan a QR first");
      return;
    }
    if (readOnly) {
      Alert.alert("Already submitted", "This QR is already filled.");
      return;
    }
    if (!inspector?.checker_code || !inspector?.id) {
      Alert.alert("Inspector missing", "QC inspector data not loaded");
      return;
    }

    const finalPayload = {
      ...payload,
      checker_code: inspector.checker_code,
      quality_checker_id: inspector.id,
      division,
    };

    // local snapshot (for showing full details in tabs)
    const createdAt = Date.now();
    const localPayloadBase = {
      ...finalPayload,
      _local: {
        qrCode: scannedCode,
        division,
        createdAt,
        inspector: {
          id: inspector.id,
          checker_code: inspector.checker_code,
        },
        catchLog: catchLog ?? null,
      },
    };

    try {
      // ✅ SERVER FIRST
      const res = await dispatch(submitQcFill({ qrCode: scannedCode, payload: finalPayload })).unwrap();

      const qcResult = extractQcResult(res, finalPayload);
      const qcStatus = deriveQcStatus(qcResult);

      // ✅ THEN store locally as CHECKED (synced=true)
      const checkedPayload = {
        ...localPayloadBase,
        qc_result: qcResult,
        qc_status: qcStatus,
        server_qr: res?.qr || res?.raw?.qr || res?.raw?.updatedQr || res?.raw?.data?.qr || null,
        _local: {
          ...(localPayloadBase as any)?._local,
          synced: true,
          syncedAt: Date.now(),
          last_error: null,
          last_error_at: null,
        },
      };

      // If your current queue doesn't have an item yet, markSynced may return null.
      // In that case create a local record and mark it synced.
      const updated = await markQcFillSynced(scannedCode, checkedPayload);
      if (!updated) {
        await upsertQcFillDraft(scannedCode, checkedPayload);
        await markQcFillSynced(scannedCode, checkedPayload);
      }

      Alert.alert("Success", res?.message || "QC submitted");
      onAfterSubmit?.(qcResult);
      resetAll();
    } catch (e: any) {
      // ✅ FAILED -> store locally as PENDING (synced=false) so it shows in Pending tab
      const pendingPayload = {
        ...localPayloadBase,
        _local: {
          ...(localPayloadBase as any)?._local,
          synced: false,
          last_error: String(e?.message || e || "Failed"),
          last_error_at: Date.now(),
        },
      };

      try {
        await upsertQcFillDraft(scannedCode, pendingPayload);
      } catch {
        // ignore local write errors
      }

      Alert.alert(
        "Submit failed",
        `${String(e?.message || e || "Failed")}\n\nSaved locally in Pending. You can edit/delete/retry later.`
      );
    }
  };

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
            onBarcodeScanned={(e: any) => {
              const code = String(e?.data || "").trim();
              if (!code) return;
              openForCode(code);
            }}
          />

          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              inset: 0 as any,
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
                fontSize: 14,
              }}
            >
              {lang === "en" ? "Align QR inside the box" : "QR-ஐ பெட்டிக்குள் வைத்துப் ஸ்கேன் செய்யவும்"}
            </Text>
          </View>
        </View>
      </View>

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

      {division === "WILD" ? (
        <WildInspectionModal
          visible={modalOpen}
          lang={lang}
          scannedCode={scannedCode}
          loading={catchLoading}
          error={catchError}
          data={catchLog}
          form={wildForm}
          setFormField={setWildField}
          onPickImages={() => pickImages(3)}
          onRemoveImage={removeImage}
          submitLoading={submitLoading}
          submitError={submitError}
          onCancel={resetAll}
          onSubmit={submit}
          readOnly={readOnly}
        />
      ) : division === "AQUA" ? (
        <AquaInspectionModal
          visible={modalOpen}
          lang={lang}
          scannedCode={scannedCode}
          loading={catchLoading}
          error={catchError}
          data={catchLog}
          form={aquaForm}
          setFormField={setAquaField}
          onPickImages={() => pickImages(5)}
          onRemoveImage={removeImage}
          submitLoading={submitLoading}
          submitError={submitError}
          onCancel={resetAll}
          onSubmit={submit}
          readOnly={readOnly}
        />
      ) : (
        <MariInspectionModal
          visible={modalOpen}
          lang={lang}
          scannedCode={scannedCode}
          loading={catchLoading}
          error={catchError}
          data={catchLog}
          form={mariForm}
          setFormField={setMariField}
          onPickImages={() => pickImages(5)}
          onRemoveImage={removeImage}
          submitLoading={submitLoading}
          submitError={submitError}
          onCancel={resetAll}
          onSubmit={submit}
          readOnly={readOnly}
        />
      )}
    </View>
  );
}
