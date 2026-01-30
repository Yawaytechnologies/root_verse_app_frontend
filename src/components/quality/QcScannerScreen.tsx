// src/components/quality/QcScannerScreen.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Pressable,
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
  resetQcFill,
} from "../../store/quality/qcFill.slice";

import { selectInspector } from "../../store/qualityAuth/qualityAuth.slice";
import { type Division, type Lang } from "./QualityUI";

import WildInspectionModal, { type WildFormState, wildInitial } from "./modals/WildInspectionModal";
import AquaInspectionModal, { type AquaFormState, aquaInitial } from "./modals/AquaInspectionModal";
import MariInspectionModal, { type MariFormState, mariInitial } from "./modals/MariInspectionModal";

import {
  getQcFillQueue,
  deriveTabFromPayload,
  type TabStatus as QueueTabStatus,
  upsertQcFillDraft,
  markQcFillSynced,
  markQcFillFailed,
} from "../../utils/qcFillQueue";

type Props = {
  division: Division;
  lang: Lang;
  onAfterSubmit?: (qcResult: "PASS" | "HOLD" | "REJECT" | string) => void;

  editDraft?: { qrCode: string; payload: any } | null;
  onEditDraftConsumed?: () => void;
};

function upper(x: any) {
  return String(x || "").toUpperCase().trim();
}
function normCode(raw: string) {
  return String(raw || "").trim().toUpperCase().replace(/\s+/g, "");
}

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
    fallbackPayload?.qc_status,
  ];

  const r = upper(candidates.find((x) => !!x) || "");
  if (r === "APPROVED") return "PASS";
  if (r === "REJECTED") return "REJECT";
  if (r === "CHECKED") return "PASS";
  return r;
}

function deriveQcStatus(qcResult: string): string {
  const r = upper(qcResult);
  if (r === "REJECT") return "REJECTED";
  if (r === "HOLD") return "HOLD";
  if (r === "PASS") return "CHECKED";
  return "CHECKED";
}

function pickImagesFromPayload(payload: any): string[] {
  const imgs =
    payload?.crate_images ??
    payload?.inspection_images ??
    payload?.pond_images ??
    payload?.pond_condition_images ??
    payload?.images ??
    [];
  return Array.isArray(imgs) ? imgs.filter(Boolean) : [];
}

function getFormQcResult(payload: any): string {
  const v =
    payload?.qc_result ??
    payload?.qcResult ??
    payload?.qc_status ??
    payload?.qcStatus ??
    payload?.status ??
    "";
  const r = upper(v);
  if (r === "APPROVED") return "PASS";
  if (r === "REJECTED") return "REJECT";
  if (r === "CHECKED") return "PASS";
  return r;
}

/**
 * ✅ 4-corner bracket overlay (pill ends)
 * Looks like your reference: L-shaped corners only, not full border.
 */
function CornerBrackets({
  size = 260,
  corner = 22, // how long the bracket arms are
  thickness = 4, // bracket thickness
}: {
  size?: number;
  corner?: number;
  thickness?: number;
}) {
  const c = "rgba(46,125,255,0.95)";
  const r = 999; // pill ends

  return (
    <View style={{ width: size, height: size }}>
      {/* TOP-LEFT */}
      <View style={{ position: "absolute", left: 0, top: 0, width: corner, height: thickness, backgroundColor: c, borderRadius: r }} />
      <View style={{ position: "absolute", left: 0, top: 0, width: thickness, height: corner, backgroundColor: c, borderRadius: r }} />

      {/* TOP-RIGHT */}
      <View style={{ position: "absolute", right: 0, top: 0, width: corner, height: thickness, backgroundColor: c, borderRadius: r }} />
      <View style={{ position: "absolute", right: 0, top: 0, width: thickness, height: corner, backgroundColor: c, borderRadius: r }} />

      {/* BOTTOM-LEFT */}
      <View style={{ position: "absolute", left: 0, bottom: 0, width: corner, height: thickness, backgroundColor: c, borderRadius: r }} />
      <View style={{ position: "absolute", left: 0, bottom: 0, width: thickness, height: corner, backgroundColor: c, borderRadius: r }} />

      {/* BOTTOM-RIGHT */}
      <View style={{ position: "absolute", right: 0, bottom: 0, width: corner, height: thickness, backgroundColor: c, borderRadius: r }} />
      <View style={{ position: "absolute", right: 0, bottom: 0, width: thickness, height: corner, backgroundColor: c, borderRadius: r }} />
    </View>
  );
}

export default function QcScannerScreen({
  division,
  lang,
  onAfterSubmit,
  editDraft,
  onEditDraftConsumed,
}: Props) {
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

  const [localTab, setLocalTab] = useState<QueueTabStatus | null>(null);
  const [scanPausedUntil, setScanPausedUntil] = useState(0);

  const setWildField = <K extends keyof WildFormState>(k: K, v: WildFormState[K]) =>
    setWildForm((p) => ({ ...p, [k]: v }));
  const setAquaField = <K extends keyof AquaFormState>(k: K, v: AquaFormState[K]) =>
    setAquaForm((p) => ({ ...p, [k]: v }));
  const setMariField = <K extends keyof MariFormState>(k: K, v: MariFormState[K]) =>
    setMariForm((p) => ({ ...p, [k]: v }));

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

  const resetAll = (pauseMs: number = 1200) => {
    setScanPausedUntil(Date.now() + pauseMs);

    setModalOpen(false);
    setHasScanned(false);
    setScannedCode("");
    setManualCode("");
    setLocalTab(null);

    setWildForm(wildInitial());
    setAquaForm(aquaInitial());
    setMariForm(mariInitial());

    dispatch(clearCatchLog());
    dispatch(resetQcFill());
  };

  const applyPrefillFromPayload = (code: string, p: any, tab: QueueTabStatus | null) => {
    const payload = p || {};
    setLocalTab(tab);

    if (division === "WILD") {
      const next: any = wildInitial();
      next.qc_result = payload.qc_result ?? payload.qcResult ?? null;
      next.quality_grade = payload.quality_grade ?? payload.qualityGrade ?? null;
      next.weight_kg = String(payload.weight_kg ?? payload.weight ?? "").trim();
      next.temperature_c = String(payload.temperature_c ?? "").trim();
      next.size = payload.size ?? "MEDIUM";
      next.damage = payload.damage ?? "NONE";
      next.reject_reason = payload.reject_reason ?? "";
      next.remarks = payload.qc_remarks ?? payload.remarks ?? "";
      next.images = pickImagesFromPayload(payload);
      setWildForm(next);
    } else if (division === "AQUA") {
      const next: any = aquaInitial();
      Object.assign(next, payload);
      next.images = pickImagesFromPayload(payload);
      setAquaForm(next);
    } else {
      const next: any = mariInitial();
      Object.assign(next, payload);
      next.images = pickImagesFromPayload(payload);
      setMariForm(next);
    }

    setScannedCode(code);
    setModalOpen(true);
    setHasScanned(true);
  };

  const openForCode = async (code: string) => {
    const c = normCode(code);
    if (!c) return;
    if (hasScanned) return;

    setHasScanned(true);
    setScannedCode(c);
    setModalOpen(true);
    setLocalTab(null);

    dispatch(resetQcFill());
    dispatch(clearCatchLog());

    try {
      const q = await getQcFillQueue();
      const found = q.find((x) => normCode(x.qrCode) === c);
      if (found) {
        const tab = deriveTabFromPayload(found.payload);
        applyPrefillFromPayload(c, found.payload, tab);
      }
    } catch {}

    dispatch(fetchCatchLogByQr(c));
  };

  useEffect(() => {
    if (!editDraft?.qrCode) return;

    const code = normCode(editDraft.qrCode);
    const p = editDraft.payload || {};

    applyPrefillFromPayload(code, p, "pending");

    dispatch(resetQcFill());
    dispatch(clearCatchLog());
    dispatch(fetchCatchLogByQr(code));

    onEditDraftConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editDraft?.qrCode]);

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
    else if (division === "AQUA")
      setAquaField("images", [...(((aquaForm as any).images || []) as string[]), ...uris].slice(0, max));
    else
      setMariField("images", [...(((mariForm as any).images || []) as string[]), ...uris].slice(0, max));
  };

  const removeImage = (uri: string) => {
    if (division === "WILD") setWildField("images", wildForm.images.filter((x) => x !== uri));
    else if (division === "AQUA")
      setAquaField("images", (((aquaForm as any).images || []) as string[]).filter((x) => x !== uri));
    else setMariField("images", (((mariForm as any).images || []) as string[]).filter((x) => x !== uri));
  };

  const serverStatus = upper((catchLog as any)?.status);
  const serverFilled = serverStatus === "FILLED";

  const editingHoldDraft = localTab === "pending";
  const localFinal = localTab === "checked" || localTab === "rejected";

  const readOnly = (localFinal || serverFilled) && !editingHoldDraft;

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

    const qcResultFromForm = getFormQcResult(finalPayload);
    const qcStatusFromForm = deriveQcStatus(qcResultFromForm);

    const createdAt = Date.now();
    const localPayloadBase = {
      ...finalPayload,
      qc_result: qcResultFromForm,
      qc_status: qcStatusFromForm,
      _local: {
        qrCode: scannedCode,
        division,
        createdAt,
        inspector: { id: inspector.id, checker_code: inspector.checker_code },
        catchLog: catchLog ?? null,
      },
    };

    if (qcResultFromForm === "HOLD") {
      try {
        await upsertQcFillDraft(scannedCode, {
          ...localPayloadBase,
          _local: {
            ...(localPayloadBase as any)._local,
            synced: false,
            last_error: null,
            last_error_at: null,
          },
        });

        Alert.alert("Saved", "Saved locally as HOLD. Edit/resubmit later from Pending tab.");
        onAfterSubmit?.("HOLD");
        resetAll(2000);
        return;
      } catch (e: any) {
        Alert.alert("Local save failed", String(e?.message || e || "Failed"));
        return;
      }
    }

    try {
      const res = await dispatch(submitQcFill({ qrCode: scannedCode, payload: finalPayload })).unwrap();

      const qcResult = extractQcResult(res, finalPayload);
      const qcStatus = deriveQcStatus(qcResult);

      const syncedPayload = {
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

      await markQcFillSynced(scannedCode, syncedPayload);

      Alert.alert("Success", res?.message || "QC submitted");
      onAfterSubmit?.(qcResult);
      resetAll(2000);
    } catch (e: any) {
      const errText = String(e?.message || e || "Failed");

      const failedPayload = {
        ...localPayloadBase,
        _local: {
          ...(localPayloadBase as any)?._local,
          synced: false,
          last_error: errText,
          last_error_at: Date.now(),
        },
      };

      try {
        await markQcFillFailed(scannedCode, errText, failedPayload);
      } catch {}

      Alert.alert("Submit failed", `${errText}\n\nSaved locally. Edit/retry from the list.`);
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
        <Text style={{ color: "white", fontWeight: "900", fontSize: 16 }}>Camera permission required</Text>
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
    <View style={{ flex: 1, paddingTop: 10 }}>
      <Text style={{ color: "white", fontSize: 22, fontWeight: "900" }}>
        QC Scanner ({division})
      </Text>

      {/* Manual input (small) */}
      <View
        style={{
          marginTop: 10,
          alignSelf: "center",
          width: "92%",
          maxWidth: 380,
          padding: 10,
          borderRadius: 18,
          backgroundColor: "rgba(255,255,255,0.06)",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.10)",
        }}
      >
        <Text style={{ color: "rgba(255,255,255,0.75)", fontWeight: "800", marginBottom: 6, fontSize: 12 }}>
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
            paddingHorizontal: 12,
            paddingVertical: 10,
            backgroundColor: "rgba(0,0,0,0.35)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.15)",
            color: "white",
            fontWeight: "900",
            letterSpacing: 0.5,
            fontSize: 13,
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
            marginTop: 8,
            paddingVertical: 10,
            borderRadius: 14,
            backgroundColor: "rgba(46,125,255,0.35)",
            borderWidth: 1,
            borderColor: "rgba(46,125,255,0.55)",
            alignItems: "center",
          }}
        >
          <Text style={{ color: "white", fontWeight: "900", fontSize: 13 }}>Use Code</Text>
        </Pressable>
      </View>

      {/* OR divider */}
      <View
        style={{
          marginTop: 10,
          marginBottom: 10,
          alignSelf: "center",
          width: "92%",
          maxWidth: 380,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
        }}
      >
        <View style={{ flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.15)" }} />
        <Text style={{ color: "rgba(255,255,255,0.65)", fontWeight: "900", fontSize: 12, letterSpacing: 1 }}>
          OR
        </Text>
        <View style={{ flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.15)" }} />
      </View>

      {/* Scanner container (reduced width) */}
      <View
        style={{
          alignSelf: "center",
          width: "92%",
          maxWidth: 380,
          borderRadius: 24, // ✅ normal rounded container (NOT pill)
          overflow: "hidden",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.10)",
          backgroundColor: "rgba(0,0,0,0.35)",
        }}
      >
        <View style={{ height: 300 }}>
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={(e: any) => {
              const now = Date.now();
              if (now < scanPausedUntil) return;

              const code = String(e?.data || "").trim();
              if (!code) return;
              if (hasScanned) return;

              openForCode(code);
            }}
          />

          {/* Overlay */}
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              inset: 0 as any,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* ✅ Corner brackets only (no full border) */}
            <View style={{ width: 260, height: 260 }}>
             <CornerBrackets size={260} corner={28} thickness={5} />

              {/* Scan line inside */}
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

              {/* subtle dark glass inside (optional, matches your reference) */}
              <View
                style={{
                  position: "absolute",
                  inset: 8,
                  borderRadius: 18,
                  backgroundColor: "rgba(0,0,0,0.10)",
                }}
              />
            </View>

            <Text style={{ marginTop: 8, color: "rgba(255,255,255,0.85)", fontWeight: "900", fontSize: 13 }}>
              {lang === "en" ? "Align QR inside the box" : "QR-ஐ பெட்டிக்குள் வைத்துப் ஸ்கேன் செய்யவும்"}
            </Text>
          </View>
        </View>
      </View>

      {/* Modals */}
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
          onCancel={() => resetAll(800)}
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
          onCancel={() => resetAll(800)}
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
          onCancel={() => resetAll(800)}
          onSubmit={submit}
          readOnly={readOnly}
        />
      )}
    </View>
  );
}
