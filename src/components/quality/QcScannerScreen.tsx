// src/components/quality/QcScannerScreen.tsx
import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  Alert,
  Animated,
  Pressable,
  Text,
  TextInput,
  View,
  Image,
  AppState,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";

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
import { Ionicons } from "@expo/vector-icons";
import { type Division } from "./QualityUI";

import WildInspectionModal, {
  type WildFormState,
  wildInitial,
} from "./modals/WildInspectionModal";
import AquaInspectionModal, {
  type AquaFormState,
  aquaInitial,
} from "./modals/AquaInspectionModal";
import MariInspectionModal, {
  type MariFormState,
  mariInitial,
} from "./modals/MariInspectionModal";

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
  selectedDate?: string;
  onAfterSubmit?: (qcResult: "PASS" | "HOLD" | "REJECT" | string) => void;
  editDraft?: { qrCode: string; payload: any } | null;
  onEditDraftConsumed?: () => void;
};

function upper(x: any) {
  return String(x || "").toUpperCase().trim();
}
function normCode(raw: string) {
  return String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}
function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
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
    payload?.shrimp_images ??
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

type LocalLocationSnap = {
  capturedAt: number;
  coords: { latitude: number; longitude: number; accuracy?: number | null };
};

function toCoordString(n: any): string | null {
  const num = Number(n);
  if (!Number.isFinite(num)) return null;
  return num.toFixed(8);
}

/* =========================
   IMAGE COMPRESSION (400–800KB)
   ========================= */

const KB = 1024;

function isRemoteUri(uri: string) {
  return /^https?:\/\//i.test(String(uri || ""));
}

async function getImageDims(
  uri: string
): Promise<{ w: number; h: number } | null> {
  return await new Promise((resolve) => {
    Image.getSize(
      uri,
      (w, h) => resolve({ w, h }),
      () => resolve(null)
    );
  });
}

const FS_ANY: any = FileSystem;

async function ensureFileUri(uri: string): Promise<string> {
  const u = String(uri || "");
  if (!u) return u;

  if (u.startsWith("content://")) {
    const base: string | null =
      FS_ANY.documentDirectory ?? FS_ANY.cacheDirectory ?? null;
    if (!base) return u;

    const dest = `${base}qc_img_${Date.now()}_${Math.random()
      .toString(16)
      .slice(2)}.jpg`;

    try {
      await FileSystem.copyAsync({ from: u, to: dest });
      return dest;
    } catch {
      return u;
    }
  }

  return u;
}

function getSizeBytesFromInfo(info: any): number | null {
  if (info?.exists !== true) return null;
  const s = info?.size;
  return typeof s === "number" && Number.isFinite(s) ? s : null;
}

async function compressToRange(
  uri: string,
  opts?: {
    minKB?: number;
    maxKB?: number;
    width?: number;
    startQuality?: number;
    minQuality?: number;
    step?: number;
    maxTries?: number;
  }
): Promise<string> {
  const {
    minKB = 400,
    maxKB = 800,
    width = 1600,
    startQuality = 0.8,
    minQuality = 0.55,
    step = 0.07,
    maxTries = 6,
  } = opts || {};

  if (!uri || isRemoteUri(uri)) return uri;

  const fileUri = await ensureFileUri(uri);

  try {
    const info0 = await FileSystem.getInfoAsync(fileUri, {
      size: true,
    } as any);
    const bytes0 = getSizeBytesFromInfo(info0);
    const sizeKB0 = bytes0 ? bytes0 / KB : 0;
    if (sizeKB0 >= minKB && sizeKB0 <= maxKB) return fileUri;
  } catch {}

  const dims = await getImageDims(fileUri);
  const shouldResize = !!dims?.w && dims.w > width;
  const actions: ImageManipulator.Action[] = shouldResize
    ? [{ resize: { width } }]
    : [];

  let q = startQuality;
  let bestUri = fileUri;

  for (let i = 0; i < maxTries; i++) {
    const r = await ImageManipulator.manipulateAsync(fileUri, actions, {
      compress: q,
      format: ImageManipulator.SaveFormat.JPEG,
    });

    bestUri = r.uri;

    try {
      const info = await FileSystem.getInfoAsync(bestUri, {
        size: true,
      } as any);
      const bytes = getSizeBytesFromInfo(info);
      const sizeKB = bytes ? bytes / KB : 0;

      if (sizeKB >= minKB && sizeKB <= maxKB) return bestUri;

      if (sizeKB > maxKB) {
        q = Math.max(minQuality, q - step);
        continue;
      }

      return bestUri;
    } catch {
      return bestUri;
    }
  }

  return bestUri;
}

async function compressImagesInPayload(payload: any): Promise<any> {
  if (!payload || typeof payload !== "object") return payload;

  const keys = [
    "images",
    "crate_images",
    "inspection_images",
    "pond_images",
    "pond_condition_images",
  ];
  const next = { ...payload };

  for (const k of keys) {
    const arr = next[k];
    if (!Array.isArray(arr) || arr.length === 0) continue;

    const out: string[] = [];
    for (const item of arr) {
      const uri = String(item || "");
      if (!uri) continue;

      try {
        const compressed = await compressToRange(uri, {
          minKB: 400,
          maxKB: 800,
          width: 1600,
          startQuality: 0.8,
          minQuality: 0.55,
          step: 0.07,
          maxTries: 6,
        });
        out.push(compressed);
      } catch {
        out.push(uri);
      }
    }

    next[k] = out;
  }

  return next;
}

/* ========================= */

function CornerBrackets() {
  const c = "bg-[rgba(46,125,255,0.95)]";
  return (
    <View className="w-[260px] h-[260px]">
      <View
        className={`absolute left-0 top-0 w-[28px] h-[5px] rounded-full ${c}`}
      />
      <View
        className={`absolute left-0 top-0 w-[5px] h-[28px] rounded-full ${c}`}
      />

      <View
        className={`absolute right-0 top-0 w-[28px] h-[5px] rounded-full ${c}`}
      />
      <View
        className={`absolute right-0 top-0 w-[5px] h-[28px] rounded-full ${c}`}
      />

      <View
        className={`absolute left-0 bottom-0 w-[28px] h-[5px] rounded-full ${c}`}
      />
      <View
        className={`absolute left-0 bottom-0 w-[5px] h-[28px] rounded-full ${c}`}
      />

      <View
        className={`absolute right-0 bottom-0 w-[28px] h-[5px] rounded-full ${c}`}
      />
      <View
        className={`absolute right-0 bottom-0 w-[5px] h-[28px] rounded-full ${c}`}
      />
    </View>
  );
}

export default function QcScannerScreen({
  division,
  selectedDate,
  onAfterSubmit,
  editDraft,
  onEditDraftConsumed,
}: Props) {
  const dispatch = useAppDispatch();
  const inspector = useAppSelector(selectInspector);

  const qcUserKey = useMemo(() => {
    const v =
      (inspector as any)?.id ??
      (inspector as any)?.checker_code ??
      (inspector as any)?.checkerCode ??
      (inspector as any)?.checker_phone ??
      (inspector as any)?.checkerPhone ??
      (inspector as any)?.phone ??
      (inspector as any)?.mobile ??
      "";
    return String(v || "").trim();
  }, [inspector]);

  const catchLog = useAppSelector(selectCatchLog);
  const catchLoading = useAppSelector(selectCatchLogLoading);
  const catchError = useAppSelector(selectCatchLogError);

  const submitLoading = useAppSelector(selectQcFillLoading);
  const submitError = useAppSelector(selectQcFillError);

  const [cameraPerm, requestCameraPerm] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [cameraKey, setCameraKey] = useState(0);
  const [cameraActive, setCameraActive] = useState(true);

  const [scannedCode, setScannedCode] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [manualCode, setManualCode] = useState("");

  const [wildForm, setWildForm] = useState<WildFormState>(wildInitial());
  const [aquaForm, setAquaForm] = useState<AquaFormState>(aquaInitial());
  const [mariForm, setMariForm] = useState<MariFormState>(mariInitial());

  const [localTab, setLocalTab] = useState<QueueTabStatus | null>(null);
  const [scanPausedUntil, setScanPausedUntil] = useState(0);

  const [locPermGranted, setLocPermGranted] = useState<boolean>(false);
  const [locCache, setLocCache] = useState<LocalLocationSnap | null>(null);
  const locCacheRef = useRef<LocalLocationSnap | null>(null);

  useEffect(() => {
    locCacheRef.current = locCache;
  }, [locCache]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const p = await Location.requestForegroundPermissionsAsync();
        if (!alive) return;
        setLocPermGranted(!!p.granted);
        if (p.granted) void primeLocation(false);
      } catch {
        if (!alive) return;
        setLocPermGranted(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cameraPerm?.granted && !modalOpen) {
      const t = setTimeout(() => {
        setCameraKey((k) => k + 1);
        setCameraActive(true);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [cameraPerm?.granted, modalOpen]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && cameraPerm?.granted && !modalOpen) {
        setCameraActive(false);
        setCameraKey((k) => k + 1);
        setTimeout(() => {
          setCameraActive(true);
          setCameraKey((k) => k + 1);
        }, 180);
      }
    });

    return () => sub.remove();
  }, [cameraPerm?.granted, modalOpen]);

  const primeLocation = async (
    forceNow: boolean
  ): Promise<LocalLocationSnap | null> => {
    if (!locPermGranted) return null;

    const now = Date.now();
    const cached = locCacheRef.current;
    if (!forceNow && cached && now - cached.capturedAt < 2 * 60 * 1000) {
      return cached;
    }

    try {
      const last = await Location.getLastKnownPositionAsync({
        maxAge: 2 * 60 * 1000,
        requiredAccuracy: 200,
      });

      if (last?.coords?.latitude && last?.coords?.longitude) {
        const snap: LocalLocationSnap = {
          capturedAt: now,
          coords: {
            latitude: last.coords.latitude,
            longitude: last.coords.longitude,
            accuracy: last.coords.accuracy ?? null,
          },
        };
        setLocCache(snap);
        return snap;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
      });
      const snap: LocalLocationSnap = {
        capturedAt: Date.now(),
        coords: {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? null,
        },
      };
      setLocCache(snap);
      return snap;
    } catch {
      return null;
    }
  };

  const setWildField = <K extends keyof WildFormState>(
    k: K,
    v: WildFormState[K]
  ) => setWildForm((p) => ({ ...p, [k]: v }));

  const setAquaField = <K extends keyof AquaFormState>(
    k: K,
    v: AquaFormState[K]
  ) => setAquaForm((p) => ({ ...p, [k]: v }));

  const setMariField = <K extends keyof MariFormState>(
    k: K,
    v: MariFormState[K]
  ) => setMariForm((p) => ({ ...p, [k]: v }));

  const viewOnlyByDate = useMemo(() => {
    const sel = String(selectedDate || "").trim();
    if (!sel) return false;
    if (editDraft?.qrCode) return false;
    return sel !== todayYmd();
  }, [selectedDate, editDraft?.qrCode]);

  const [warnedKey, setWarnedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!viewOnlyByDate) return;
    const k = String(selectedDate || "UNKNOWN");
    if (warnedKey === k) return;
    setWarnedKey(k);

    Alert.alert(
      "Only can able to scan already submitted",
      "Past/Future date selected. Scanner is view-only. Submission is disabled."
    );
  }, [viewOnlyByDate, selectedDate, warnedKey]);

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

    setCameraActive(false);
    setCameraKey((k) => k + 1);

    setTimeout(() => {
      setCameraActive(true);
      setCameraKey((k) => k + 1);
    }, 180);
  };

  const applyPrefillFromPayload = (
    code: string,
    p: any,
    tab: QueueTabStatus | null
  ) => {
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

  next.harvest_id = String(
    payload.harvest_id ?? payload.harvestId ?? payload?.harvest?.id ?? ""
  );

  next.sample_count = String(payload.sample_count ?? "");
  next.sample_weight = String(payload.sample_weight ?? "");

  next.grade = payload.grade ?? "A";
  next.disease_observation = String(
    payload.disease_observation ?? "false"
  ) as any;

  next.disease_notes = payload.disease_notes ?? "";
  next.inspection_latitude = String(
    payload.inspection_latitude ?? payload.latitude ?? ""
  );
  next.inspection_longitude = String(
    payload.inspection_longitude ?? payload.longitude ?? ""
  );
  next.inspected_at = payload.inspected_at ?? new Date().toISOString();

  next.remarks = payload.remarks ?? "";
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
    setLocalTab(null);
    setCameraActive(false);
    setCameraKey((k) => k + 1);

    void primeLocation(false);

    dispatch(resetQcFill());
    dispatch(clearCatchLog());

    try {
      if (qcUserKey) {
        const q = await getQcFillQueue(qcUserKey);
        const found = q.find((x) => normCode(x.qrCode) === c);
        if (found) {
          const tab = deriveTabFromPayload(found.payload);

          if (viewOnlyByDate && tab === "pending") {
            Alert.alert(
              "Only can able to scan already submitted",
              "This QR is saved as HOLD draft (not submitted). Open it from Pending tab to edit/submit."
            );
            resetAll(800);
            return;
          }

          if (tab === "checked" || tab === "rejected") {
            applyPrefillFromPayload(c, found.payload, tab);
          }
        }
      }
    } catch {}

    if (viewOnlyByDate) {
      try {
        await dispatch(
          fetchCatchLogByQr({ qrCode: c, mode: "FILLED_ONLY" })
        ).unwrap();
        setModalOpen(true);
        return;
      } catch {
        Alert.alert(
          "Only can able to scan already submitted",
          "This QR is not submitted."
        );
        resetAll(800);
        return;
      }
    }

    setModalOpen(true);
    dispatch(fetchCatchLogByQr({ qrCode: c, division }));
  };

  useEffect(() => {
    if (!editDraft?.qrCode) return;

    const code = normCode(editDraft.qrCode);
    const p = editDraft.payload || {};

    setCameraActive(false);
    setCameraKey((k) => k + 1);

    applyPrefillFromPayload(code, p, "pending");

    void primeLocation(false);

    dispatch(resetQcFill());
    dispatch(clearCatchLog());
    dispatch(fetchCatchLogByQr({ qrCode: code, division }));

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

    const uris = (res.assets || [])
      .map((a) => a.uri)
      .filter(Boolean) as string[];

    if (division === "WILD") {
      setWildField("images", [...wildForm.images, ...uris].slice(0, max));
    } else if (division === "AQUA") {
      setAquaField(
        "images",
        [...(((aquaForm as any).images || []) as string[]), ...uris].slice(
          0,
          max
        )
      );
    } else {
      setMariField(
        "images",
        [...(((mariForm as any).images || []) as string[]), ...uris].slice(
          0,
          max
        )
      );
    }
  };

  const removeImage = (uri: string) => {
    if (division === "WILD") {
      setWildField(
        "images",
        wildForm.images.filter((x) => x !== uri)
      );
    } else if (division === "AQUA") {
      setAquaField(
        "images",
        (((aquaForm as any).images || []) as string[]).filter((x) => x !== uri)
      );
    } else {
      setMariField(
        "images",
        (((mariForm as any).images || []) as string[]).filter((x) => x !== uri)
      );
    }
  };

  const serverStatus = upper((catchLog as any)?.status);
  const serverFilled = serverStatus === "FILLED";

  const editingHoldDraft = localTab === "pending";
  const localFinal = localTab === "checked" || localTab === "rejected";

  const readOnly =
    (viewOnlyByDate || localFinal || serverFilled) && !editingHoldDraft;

  const speciesOk = useMemo(() => {
    const fishName = String((catchLog as any)?.fish_name || "").trim();
    const fishId = (catchLog as any)?.fish_id;
    return !!fishId || !!fishName;
  }, [catchLog]);

const submit = async (payload: any) => {
  if (!scannedCode) {
    Alert.alert("Scan required", "Please scan a QR first");
    return;
  }

  if (viewOnlyByDate && !editingHoldDraft) {
    Alert.alert(
      "Already submitted",
      "Past/Future date selected. Submission is disabled."
    );
    return;
  }

  if (readOnly) {
    Alert.alert("Already submitted", "This QR is already filled.");
    return;
  }

  if (catchLoading) {
    Alert.alert("Wait", "QR details still loading. Please wait.");
    return;
  }

  if (catchError) {
    Alert.alert(
      "Cannot submit",
      "QR details fetch failed. Please rescan and try again."
    );
    return;
  }

  if (!catchLog) {
  Alert.alert("Cannot submit", "QR details not loaded. Please rescan.");
  return;
}

if (division !== "AQUA" && !speciesOk) {
  Alert.alert(
    "Cannot submit",
    "Species not loaded for this QR. Submission blocked."
  );
  return;
}

if (division === "AQUA") {
  const harvestId = String(
    payload?.harvest_id ?? (catchLog as any)?.harvest_id ?? ""
  ).trim();

  if (!harvestId) {
    Alert.alert("Cannot submit", "Harvest ID is required for aquaculture.");
    return;
  }
}

  if (!inspector?.checker_code || !inspector?.id) {
    Alert.alert("Inspector missing", "QC inspector data not loaded");
    return;
  }

  if (!qcUserKey) {
    Alert.alert(
      "QC user missing",
      "QC user key not ready. Please logout/login again."
    );
    return;
  }

  const cached = locCacheRef.current;
  const locSnap =
    cached ??
    (await Promise.race([
      primeLocation(false),
      new Promise<LocalLocationSnap | null>((res) =>
        setTimeout(() => res(null), 350)
      ),
    ]));

  const latitude = locSnap ? toCoordString(locSnap.coords.latitude) : null;
  const longitude = locSnap ? toCoordString(locSnap.coords.longitude) : null;

  // ✅ removed heavy image compression during submit
  const processedPayload = payload;

  const finalPayload =
  division === "AQUA"
    ? {
        ...processedPayload,
        pond_qr_scan: scannedCode,
        harvest_id:
          processedPayload?.harvest_id ?? (catchLog as any)?.harvest_id,
        checker_code: inspector.checker_code,
        quality_checker_id: inspector.id,
        division,
        ...(latitude ? { inspection_latitude: latitude } : {}),
        ...(longitude ? { inspection_longitude: longitude } : {}),
      }
    : {
        ...processedPayload,
        checker_code: inspector.checker_code,
        quality_checker_id: inspector.id,
        division,
        ...(latitude ? { latitude } : {}),
        ...(longitude ? { longitude } : {}),
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
      location: locSnap,
    },
  };

  if (qcResultFromForm === "HOLD") {
    try {
      await upsertQcFillDraft(qcUserKey, scannedCode, {
        ...localPayloadBase,
        _local: {
          ...(localPayloadBase as any)._local,
          synced: false,
          last_error: null,
          last_error_at: null,
        },
      });

      Alert.alert(
        "Saved",
        "Saved locally as HOLD. Edit/resubmit later from Pending tab."
      );
      onAfterSubmit?.("HOLD");
      resetAll(2000);
      return;
    } catch (e: any) {
      Alert.alert(
        "Local save failed",
        String(e?.message || e || "Failed")
      );
      return;
    }
  }

  try {
    const res = await dispatch(
      submitQcFill({ qrCode: scannedCode, payload: finalPayload })
    ).unwrap();

    const qcResult = extractQcResult(res, finalPayload);
    const qcStatus = deriveQcStatus(qcResult);

    const syncedPayload = {
      ...localPayloadBase,
      qc_result: qcResult,
      qc_status: qcStatus,
      server_qr:
        res?.qr ||
        res?.raw?.qr ||
        res?.raw?.updatedQr ||
        res?.raw?.data?.qr ||
        null,
      _local: {
        ...(localPayloadBase as any)?._local,
        synced: true,
        syncedAt: Date.now(),
        last_error: null,
        last_error_at: null,
      },
    };

    await markQcFillSynced(qcUserKey, scannedCode, syncedPayload);

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
      await markQcFillFailed(qcUserKey, scannedCode, errText, failedPayload);
    } catch {}

    Alert.alert(
      "Submit failed",
      `${errText}\n\nSaved locally. Edit/retry from the list.`
    );
    resetAll(1200);
  }
};

  if (!cameraPerm || cameraPerm.granted === null) {
    return (
      <View className="p-4">
        <Text className="text-white">Requesting camera permission…</Text>
      </View>
    );
  }

  if (!cameraPerm.granted) {
    return (
      <View className="p-4">
        <Text className="text-white font-black text-[16px]">
          Camera permission required
        </Text>
        <Text className="text-white/70 mt-2">
          Enable camera permission to scan QR codes.
        </Text>

        <Pressable
          onPress={requestCameraPerm}
          className="mt-4 py-3 rounded-[14px] items-center bg-[rgba(46,125,255,0.25)] border border-[rgba(46,125,255,0.5)]"
        >
          <Text className="text-white font-black">Allow Camera</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 pt-2.5">
      <View className="flex-row items-center justify-between mb-0">
        <Text className="text-white text-[22px] font-black">
          QC Scanner ({division})
        </Text>

        <Pressable
          onPress={() => setTorch((v) => !v)}
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: torch
              ? "rgba(255,214,0,0.20)"
              : "rgba(255,255,255,0.08)",
            borderWidth: 1,
            borderColor: torch
              ? "rgba(255,214,0,0.45)"
              : "rgba(255,255,255,0.12)",
          }}
        >
          <Ionicons
            name={torch ? "flashlight" : "flashlight-outline"}
            size={18}
            color={torch ? "#FFD600" : "rgba(255,255,255,0.65)"}
          />
        </Pressable>
      </View>

      <View className="mt-2.5 self-center w-[92%] max-w-[380px] p-2.5 rounded-[18px] bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.10)]">
        <Text className="text-white/75 font-extrabold mb-1.5 text-[12px]">
          Enter QR Code manually
        </Text>

        <TextInput
          value={manualCode}
          onChangeText={setManualCode}
          placeholder="e.g. RV-VESSEL-000638"
          placeholderTextColor="rgba(255,255,255,0.35)"
          autoCapitalize="characters"
          autoCorrect={false}
          className="rounded-[14px] px-3 py-2.5 bg-[rgba(0,0,0,0.35)] border border-[rgba(255,255,255,0.15)] text-white font-black tracking-[0.5px] text-[13px]"
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
          className="mt-2.5 py-2.5 rounded-[14px] items-center bg-[rgba(46,125,255,0.35)] border border-[rgba(46,125,255,0.55)]"
        >
          <Text className="text-white font-black text-[13px]">Use Code</Text>
        </Pressable>
      </View>

      <View className="mt-2.5 mb-2.5 self-center w-[92%] max-w-[380px] flex-row items-center justify-center gap-2.5">
        <View className="flex-1 h-[1px] bg-[rgba(255,255,255,0.15)]" />
        <Text className="text-white/65 font-black text-[12px] tracking-[1px]">
          OR
        </Text>
        <View className="flex-1 h-[1px] bg-[rgba(255,255,255,0.15)]" />
      </View>

      <View className="self-center w-[92%] max-w-[380px] rounded-[24px] overflow-hidden border border-[rgba(255,255,255,0.10)] bg-[rgba(0,0,0,0.35)]">
        <View className="h-[300px]" style={{ height: 300 }}>
          {cameraActive && !modalOpen ? (
            <CameraView
              key={cameraKey}
              className="flex-1"
              style={{ flex: 1 }}
              facing="back"
              enableTorch={torch}
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
          ) : (
            <View style={{ flex: 1, backgroundColor: "black" }} />
          )}

          <View
            pointerEvents="none"
            className="absolute inset-0 items-center justify-center"
          >
            <View className="w-[260px] h-[260px]">
              <CornerBrackets />

              <Animated.View
                className="absolute left-3 right-3 top-4 h-[2px] rounded-full bg-[rgba(46,125,255,0.95)]"
                style={{ transform: [{ translateY: scanTranslateY }] }}
              />

              <View className="absolute inset-2 rounded-[18px] bg-[rgba(0,0,0,0.10)]" />
            </View>

            <Text className="mt-2 text-white/85 font-black text-[13px]">
              Align QR inside the box
            </Text>
          </View>
        </View>
      </View>

      {division === "WILD" ? (
        <WildInspectionModal
          visible={modalOpen}
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