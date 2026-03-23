import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
  Image,
  Modal,
  ActivityIndicator,
} from "react-native";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";

import type { AppDispatch } from "../../../src/store/auth/store";
import type { AquaPondData } from "../../../src/types/aqua";
import { selectAquaRegistration } from "../../../src/features/aqua/registration/registration.selectors";
import {
  addPond,
  hydrateRegistration,
  removePond,
  setPondField,
} from "../../../src/features/aqua/registration/registration.slice";

const API_BASE = "https://rootverse-backend-5qoo.onrender.com";

type FishTypeItem = {
  id: number;
  fish_name: string;
  fish_code?: string;
  fish_type_url?: string;
};

type ApprovedFarm = {
  id: number | string;
  name: string;
  farm_code?: string;
  status?: string;
};

type WatermarkData = {
  farmerCode: string;
  farmLabel: string;
  pondLabel: string;
  coordStr: string;
  captureTime: string;
};

const getParamValue = (value: string | string[] | undefined, fallback = "") =>
  Array.isArray(value) ? String(value[0] ?? fallback) : String(value ?? fallback);

const createEmptyPond = (index = 1): AquaPondData => ({
  id: `pond-${index}`,
  pondName: "",
  pondArea: "",
  cultureType: "",
  speciesId: "",
  speciesName: "",
  speciesCode: "",
  speciesImageUrl: "",
  gpsLat: "",
  gpsLng: "",
  pondImageCaptured: false,
  pondImageUri: "",
});

const parsePondsFromParams = (
  pondsJson: string,
  fallbackPonds: AquaPondData[],
): AquaPondData[] => {
  if (!pondsJson) return fallbackPonds;
  try {
    const parsed = JSON.parse(pondsJson);
    if (!Array.isArray(parsed) || parsed.length === 0) return fallbackPonds;
    return parsed.map((item, index) => ({
      id:
        typeof item?.id === "string" && item.id.trim()
          ? item.id
          : `pond-${index + 1}`,
      pondName: String(item?.pondName ?? ""),
      pondArea: String(item?.pondArea ?? ""),
      cultureType: String(item?.cultureType ?? ""),
      speciesId: String(item?.speciesId ?? ""),
      speciesName: String(item?.speciesName ?? ""),
      speciesCode: String(item?.speciesCode ?? ""),
      speciesImageUrl: String(item?.speciesImageUrl ?? ""),
      gpsLat: String(item?.gpsLat ?? ""),
      gpsLng: String(item?.gpsLng ?? ""),
      pondImageCaptured: Boolean(item?.pondImageCaptured),
      pondImageUri: String(item?.pondImageUri ?? ""),
    }));
  } catch (error) {
    console.error("Failed to parse pondsJson:", error);
    return fallbackPonds;
  }
};

const pondCode = (index: number) => `PD${String(index + 1).padStart(2, "0")}`;

// Local time with AM/PM — used for watermark
const localNow = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  let hours = d.getHours();
  const minutes = pad(d.getMinutes());
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${year}-${month}-${day} ${pad(hours)}:${minutes} ${ampm}`;
};

// ─── Watermark — "Powered by Rootverse" at top ───────────────────────────────
function WatermarkOverlay({ wm }: { wm: WatermarkData }) {
  return (
    <View
      style={{
        position: "absolute",
        top: 8,
        right: 8,
        backgroundColor: "rgba(0,0,0,0.72)",
        borderRadius: 8,
        padding: 8,
        maxWidth: 215,
      }}
    >
      <Text
        style={{
          color: "#93C5FD",
          fontSize: 8,
          fontWeight: "700",
          lineHeight: 13,
          marginBottom: 3,
          letterSpacing: 0.4,
        }}
      >
        ⬡ Powered by Rootverse
      </Text>
      <Text style={{ color: "#FFFFFF", fontSize: 9, fontWeight: "700", lineHeight: 14 }}>
        Farmer: {wm.farmerCode}
      </Text>
      <Text style={{ color: "#FFFFFF", fontSize: 9, lineHeight: 14 }}>
        Farm: {wm.farmLabel}
      </Text>
      <Text style={{ color: "#FFFFFF", fontSize: 9, lineHeight: 14 }}>
        Pond: {wm.pondLabel}
      </Text>
      <Text style={{ color: "#CBD5E1", fontSize: 9, lineHeight: 14 }}>
        Location: {wm.coordStr}
      </Text>
      <Text style={{ color: "#CBD5E1", fontSize: 9, lineHeight: 14 }}>
        Time: {wm.captureTime}
      </Text>
    </View>
  );
}

// ─── SelectTrigger — the visible button that opens the modal ─────────────────
function SelectTrigger({
  label,
  placeholder,
  selectedLabel,
  selectedSub,
  loading,
  onPress,
}: {
  label: string;
  placeholder: string;
  selectedLabel?: string;
  selectedSub?: string;
  loading?: boolean;
  onPress: () => void;
}) {
  return (
    <View className="gap-2">
      {label ? (
        <Text className="text-sm font-medium text-slate-900 dark:text-white">
          {label}
        </Text>
      ) : null}
      <Pressable
        onPress={onPress}
        disabled={loading}
        className={`flex-row items-center justify-between rounded-2xl border px-4 py-3 ${
          selectedLabel
            ? "border-emerald-300 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10"
            : "border-slate-200 bg-white dark:border-white/10 dark:bg-[#0B1220]"
        }`}
      >
        {loading ? (
          <View className="flex-1 flex-row items-center gap-2">
            <ActivityIndicator size="small" color="#94A3B8" />
            <Text className="text-sm text-slate-400 dark:text-white/40">
              Loading...
            </Text>
          </View>
        ) : selectedLabel ? (
          <View className="flex-1">
            <Text
              className="text-sm font-semibold text-emerald-800 dark:text-emerald-300"
              numberOfLines={1}
            >
              {selectedLabel}
            </Text>
            {selectedSub ? (
              <Text
                className="mt-0.5 text-xs text-emerald-600 dark:text-emerald-400"
                numberOfLines={1}
              >
                {selectedSub}
              </Text>
            ) : null}
          </View>
        ) : (
          <Text className="flex-1 text-sm text-slate-400 dark:text-white/40">
            {placeholder}
          </Text>
        )}
        <Ionicons
          name="chevron-down"
          size={18}
          color={selectedLabel ? "#059669" : "#94A3B8"}
        />
      </Pressable>
    </View>
  );
}

// ─── Field — outside component to prevent keyboard dismiss ───────────────────
function Field({
  label,
  placeholder,
  value,
  onChangeText,
  keyboardType = "default",
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: "default" | "numeric";
}) {
  return (
    <View className="flex-1 gap-2">
      <Text className="text-sm font-medium text-slate-900 dark:text-white">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        keyboardType={keyboardType}
        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 dark:border-white/10 dark:bg-[#0B1220] dark:text-white"
      />
    </View>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

export default function PondDetailsScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation();

  const registration = useSelector(selectAquaRegistration);
  const { farmer, farm, ponds, submission } = registration;

  const me = useSelector((state: any) => state.me?.me);
  const farmerCode = me?.owner_id ?? farmer.farmerName ?? "FARMER";
  const numericOwnerId = farmerCode.replace(/\D/g, "").replace(/^0+/, "");

  // ── GPS coordinates ────────────────────────────────────────────────────────
  const [gpsLat, setGpsLat] = useState("");
  const [gpsLng, setGpsLng] = useState("");
  const [gpsLoading, setGpsLoading] = useState(false);

  // Capture timestamp per pond id — set the moment pondImageCaptured flips true
  const [captureTimeMap, setCaptureTimeMap] = useState<Record<string, string>>({});
  const prevImageCapturedRef = useRef<Record<string, boolean>>({});

  // Watch ponds for newly captured images and stamp timestamp
  useEffect(() => {
    const updated: Record<string, string> = { ...captureTimeMap };
    let changed = false;
    ponds.forEach((pond) => {
      const wasCaptured = prevImageCapturedRef.current[pond.id] ?? false;
      if (pond.pondImageCaptured && !wasCaptured) {
        updated[pond.id] = localNow();
        changed = true;
      }
      prevImageCapturedRef.current[pond.id] = pond.pondImageCaptured;
    });
    if (changed) setCaptureTimeMap(updated);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ponds]);

  useEffect(() => {
    let cancelled = false;
    const fetchCoords = async () => {
      setGpsLoading(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Location Permission",
            "Location access is needed to auto-fill pond coordinates.",
          );
          return;
        }
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        if (cancelled) return;
        const lat = String(pos.coords.latitude);
        const lng = String(pos.coords.longitude);
        setGpsLat(lat);
        setGpsLng(lng);
      } catch {
        // silent
      } finally {
        if (!cancelled) setGpsLoading(false);
      }
    };
    fetchCoords();
    return () => { cancelled = true; };
  }, []);

  // Dispatch GPS to all ponds whenever coords arrive or ponds change
  useEffect(() => {
    if (!gpsLat || !gpsLng || ponds.length === 0) return;
    ponds.forEach((pond, idx) => {
      if (!pond.gpsLat || !pond.gpsLng) {
        dispatch(setPondField({ index: idx, key: "gpsLat", value: gpsLat }));
        dispatch(setPondField({ index: idx, key: "gpsLng", value: gpsLng }));
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gpsLat, gpsLng, ponds.length]);

  // ── Approved farms ─────────────────────────────────────────────────────────
  const [approvedFarms, setApprovedFarms] = useState<ApprovedFarm[]>([]);
  const [farmsLoading, setFarmsLoading] = useState(false);
  const [farmModalOpen, setFarmModalOpen] = useState(false);

  const [selectedFarmId, setSelectedFarmId] = useState(
    getParamValue(params.farmId, ""),
  );
  const [selectedFarmName, setSelectedFarmName] = useState(
    getParamValue(params.farmName, farm.farmName || ""),
  );
  const [selectedFarmCode, setSelectedFarmCode] = useState(
    getParamValue(params.farmCode, ""),
  );

  const activeFarmId = selectedFarmId;
  const activeFarmName = selectedFarmName || "Approved Farm";
  const activeFarmCode = selectedFarmCode;

  // ── Species modal ──────────────────────────────────────────────────────────
  const [speciesModalForIndex, setSpeciesModalForIndex] = useState<number | null>(null);

  // ── Preview ────────────────────────────────────────────────────────────────
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUri, setPreviewUri] = useState("");
  const [previewWatermark, setPreviewWatermark] = useState<WatermarkData | null>(null);

  const [fishTypes, setFishTypes] = useState<FishTypeItem[]>([]);
  const [fishTypesLoading, setFishTypesLoading] = useState(false);

  const pondsJsonParam = useMemo(
    () => getParamValue(params.pondsJson, ""),
    [params.pondsJson],
  );
  const lastHydratedPondsJsonRef = useRef<string>("");

  // ── Fetch approved farms ───────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        setFarmsLoading(true);
        const url = numericOwnerId
          ? `${API_BASE}/api/farms?owner_id=${numericOwnerId}`
          : `${API_BASE}/api/farms`;
        const res = await fetch(url);
        const data = await res.json();
        const list: any[] = Array.isArray(data)
          ? data
          : (data?.farms ?? data?.data ?? []);

        console.log("FARMS RAW sample:", JSON.stringify(list.slice(0, 2), null, 2));

        const approved = list.filter(
          (f: any) =>
            String(f?.status ?? "").toLowerCase() === "approved" ||
            String(f?.approval_status ?? "").toLowerCase() === "approved",
        );
        setApprovedFarms(approved);
      } catch (e) {
        console.error("Failed to load approved farms:", e);
      } finally {
        setFarmsLoading(false);
      }
    };
    load();
  }, [numericOwnerId]);

  // ── Fetch fish types ───────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        setFishTypesLoading(true);
        const res = await fetch(`${API_BASE}/api/fish-types`);
        const data = await res.json();
        setFishTypes(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Failed to load fish types:", e);
      } finally {
        setFishTypesLoading(false);
      }
    };
    load();
  }, []);

  // ── Hydrate ponds ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!pondsJsonParam) return;
    if (lastHydratedPondsJsonRef.current === pondsJsonParam) return;
    const parsedPonds = parsePondsFromParams(
      pondsJsonParam,
      ponds.length > 0 ? ponds : [createEmptyPond(1)],
    );
    dispatch(hydrateRegistration({ farmer, farm, ponds: parsedPonds, submission }));
    lastHydratedPondsJsonRef.current = pondsJsonParam;
  }, [pondsJsonParam, dispatch, farmer, farm, ponds, submission]);

  useEffect(() => {
    if (!pondsJsonParam && ponds.length === 0) {
      dispatch(addPond());
    }
  }, [dispatch, ponds.length, pondsJsonParam]);

  const openPreview = (uri: string, wm: WatermarkData) => {
    if (!uri) return;
    setPreviewUri(uri);
    setPreviewWatermark(wm);
    setPreviewOpen(true);
  };

  const handleFarmSelect = (item: ApprovedFarm) => {
    setSelectedFarmId(String(item.id));
    setSelectedFarmName(item.name ?? "");
    setSelectedFarmCode(item.farm_code ?? "");
    setFarmModalOpen(false);
  };

  const handleSpeciesSelect = (index: number, item: FishTypeItem) => {
    dispatch(setPondField({ index, key: "speciesId", value: String(item.id) }));
    dispatch(setPondField({ index, key: "speciesName", value: item.fish_name }));
    dispatch(setPondField({ index, key: "speciesCode", value: item.fish_code ?? "" }));
    dispatch(setPondField({ index, key: "speciesImageUrl", value: item.fish_type_url ?? "" }));
    dispatch(setPondField({ index, key: "cultureType", value: item.fish_name }));
    setSpeciesModalForIndex(null);
  };

  const validatePonds = () => {
    for (let i = 0; i < ponds.length; i += 1) {
      const pond = ponds[i];
      if (!pond.pondName.trim()) {
        Alert.alert("Validation", `Please enter pond name for Pond ${i + 1}`);
        return false;
      }
      if (!pond.pondArea.trim()) {
        Alert.alert("Validation", `Please enter pond area for Pond ${i + 1}`);
        return false;
      }
      if (!pond.speciesId.trim()) {
        Alert.alert("Validation", `Please select species for Pond ${i + 1}`);
        return false;
      }
      if (!pond.pondImageCaptured) {
        Alert.alert("Validation", `Please capture pond image for Pond ${i + 1}`);
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!activeFarmId) {
      Alert.alert("Select Farm", "Please select an approved farm.");
      return;
    }
    if (!validatePonds()) return;
    router.push({
      pathname: "/(aqua)/registration/pond-review-submit",
      params: {
        farmId: activeFarmId,
        farmName: activeFarmName,
        farmCode: activeFarmCode,
        pondsJson: JSON.stringify(ponds),
        pondCount: String(ponds.length),
      },
    });
  };

  const latDisplay = gpsLoading ? "Fetching..." : gpsLat || farm.latitude || "N/A";
  const lngDisplay = gpsLoading ? "Fetching..." : gpsLng || farm.longitude || "N/A";

  return (
    <>
      <ScrollView
        className="flex-1 bg-[#F5F7FB] dark:bg-[#050B16]"
        contentContainerStyle={{
          padding: 16,
          paddingTop: insets.top + 8,
          paddingBottom: 32,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ── */}
        <View className="rounded-2xl border border-slate-900 bg-slate-900 p-5 dark:border-white/10 dark:bg-[#0B1220]">
          <View className="flex-row items-start gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
              <Ionicons name="water-outline" size={20} color="#60A5FA" />
            </View>
            <View className="flex-1">
              <Text className="text-[11px] uppercase tracking-wide text-white opacity-80">
                {t("registration.pondDetails")}
              </Text>
              <Text className="mt-1 text-lg font-bold text-white">
                {t("registration.pondDetails")}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Approved Farm Selector ── */}
        <View className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0B1220]">
          <Text className="mb-1 text-base font-semibold text-slate-900 dark:text-white">
            {t("registration.selectFarm") || "Select Approved Farm"}
          </Text>
          <Text className="mb-3 text-sm text-slate-500 dark:text-white/50">
            {t("registration.selectFarmSub") || "Ponds will be linked to this farm."}
          </Text>

          <SelectTrigger
            label=""
            placeholder={
              approvedFarms.length === 0 && !farmsLoading
                ? t("registration.noApprovedFarms") || "No approved farms found"
                : t("registration.selectFarmPlaceholder") || "Select approved farm"
            }
            selectedLabel={activeFarmId ? activeFarmName : undefined}
            selectedSub={
              activeFarmId
                ? `ID: ${activeFarmId}${activeFarmCode ? `  •  Code: ${activeFarmCode}` : ""}`
                : undefined
            }
            loading={farmsLoading}
            onPress={() => setFarmModalOpen(true)}
          />

          {!farmsLoading && approvedFarms.length === 0 && (
            <View className="mt-3 flex-row items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/20 dark:bg-amber-500/10">
              <Ionicons name="warning-outline" size={16} color="#D97706" />
              <Text className="flex-1 text-xs text-amber-700 dark:text-amber-300">
                {t("registration.noApprovedFarmsWarning")}
              </Text>
            </View>
          )}
        </View>

        {/* ── Pond cards ── */}
        {activeFarmId ? (
          <>
            <View className="mt-5 gap-4">
              {ponds.map((pond, index) => {
                const lat = pond.gpsLat || gpsLat || farm.latitude || "";
                const lng = pond.gpsLng || gpsLng || farm.longitude || "";
                const coordStr =
                  lat && lng
                    ? `${parseFloat(lat).toFixed(5)}, ${parseFloat(lng).toFixed(5)}`
                    : "Fetching...";
                // Use stored capture time if image was captured, else current time
                const captureTime =
                  captureTimeMap[pond.id] ||
                  (pond.pondImageCaptured ? localNow() : localNow());
                const thisPondCode = pondCode(index);
                const farmLabel = activeFarmCode || activeFarmId;
                const pondLabel = `${farmLabel}-${thisPondCode}`;

                const wm: WatermarkData = {
                  farmerCode,
                  farmLabel,
                  pondLabel,
                  coordStr,
                  captureTime,
                };

                return (
                  <View
                    key={pond.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0B1220]"
                  >
                    {/* Card header */}
                    <View className="mb-4 flex-row items-center justify-between">
                      <View>
                        <Text className="text-base font-semibold text-slate-900 dark:text-white">
                          {t("registration.pondDetails")} {index + 1}
                        </Text>
                        <Text className="text-xs text-slate-400 dark:text-white/40">
                          {pondLabel}
                        </Text>
                      </View>
                      {ponds.length > 1 ? (
                        <Pressable
                          onPress={() => dispatch(removePond(index))}
                          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 dark:border-rose-500/20 dark:bg-rose-500/10"
                        >
                          <Text className="text-sm font-semibold text-rose-700 dark:text-rose-300">
                            {t("common.remove")}
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>

                    <View className="gap-4">
                      {/* Row: Pond Name | Pond Area */}
                      <View className="flex-row gap-3">
                        <Field
                          label={t("registration.pondName")}
                          placeholder={t("registration.pondNamePlaceholder")}
                          value={pond.pondName}
                          onChangeText={(text) =>
                            dispatch(setPondField({ index, key: "pondName", value: text }))
                          }
                        />
                        <Field
                          label={t("registration.pondArea")}
                          placeholder={t("registration.pondAreaPlaceholder")}
                          value={pond.pondArea}
                          onChangeText={(text) =>
                            dispatch(setPondField({ index, key: "pondArea", value: text }))
                          }
                          keyboardType="numeric"
                        />
                      </View>

                      {/* Species selector */}
                      <SelectTrigger
                        label={t("registration.species")}
                        placeholder={t("registration.selectSpecies")}
                        selectedLabel={pond.speciesName || undefined}
                        selectedSub={
                          pond.speciesCode ? `Code: ${pond.speciesCode}` : undefined
                        }
                        loading={fishTypesLoading}
                        onPress={() => setSpeciesModalForIndex(index)}
                      />

                      {/* Species image after selection */}
                      {pond.speciesImageUrl ? (
                        <View className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
                          <Image
                            source={{ uri: pond.speciesImageUrl }}
                            className="h-28 w-full"
                            resizeMode="cover"
                          />
                          <View className="bg-slate-50 px-3 py-2 dark:bg-white/5">
                            <Text className="text-xs font-medium text-slate-600 dark:text-white/60">
                              {pond.speciesName}
                              {pond.speciesCode ? `  •  ${pond.speciesCode}` : ""}
                            </Text>
                          </View>
                        </View>
                      ) : null}

                      {/* Lat / Lng */}
                      <View className="flex-row gap-3">
                        <View className="flex-1 gap-2">
                          <Text className="text-sm font-medium text-slate-900 dark:text-white">
                            {t("registration.latitude")}
                          </Text>
                          <View
                            className={`rounded-2xl border px-4 py-3 ${
                              gpsLoading
                                ? "border-blue-200 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/10"
                                : "border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5"
                            }`}
                          >
                            <Text
                              className={`text-sm ${
                                gpsLoading
                                  ? "text-blue-500 dark:text-blue-300"
                                  : "text-slate-700 dark:text-white/80"
                              }`}
                            >
                              {latDisplay}
                            </Text>
                          </View>
                        </View>
                        <View className="flex-1 gap-2">
                          <Text className="text-sm font-medium text-slate-900 dark:text-white">
                            {t("registration.longitude")}
                          </Text>
                          <View
                            className={`rounded-2xl border px-4 py-3 ${
                              gpsLoading
                                ? "border-blue-200 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/10"
                                : "border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5"
                            }`}
                          >
                            <Text
                              className={`text-sm ${
                                gpsLoading
                                  ? "text-blue-500 dark:text-blue-300"
                                  : "text-slate-700 dark:text-white/80"
                              }`}
                            >
                              {lngDisplay}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* GPS status banner */}
                      {gpsLoading ? (
                        <View className="flex-row items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-500/20 dark:bg-blue-500/10">
                          <ActivityIndicator size="small" color="#2563EB" />
                          <Text className="flex-1 text-xs text-blue-700 dark:text-blue-300">
                            {t("registration.fetchingGps")}
                          </Text>
                        </View>
                      ) : gpsLat && gpsLng ? (
                        <View className="flex-row items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                          <Ionicons name="checkmark-circle-outline" size={16} color="#059669" />
                          <Text className="flex-1 text-xs text-emerald-700 dark:text-emerald-300">
                            {t("registration.gpsSuccess")}
                          </Text>
                        </View>
                      ) : (
                        <View className="flex-row items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/20 dark:bg-amber-500/10">
                          <Ionicons name="location-outline" size={16} color="#D97706" />
                          <Text className="flex-1 text-xs text-amber-700 dark:text-amber-300">
                            {t("registration.gpsNoPermission")}
                          </Text>
                        </View>
                      )}

                      {/* Pond Image */}
                      <View className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                        <Text className="font-medium text-slate-700 dark:text-white/80">
                          {t("registration.captureImage")}
                        </Text>
                        <Text className="mt-1 text-sm text-slate-600 dark:text-white/60">
                          {t("registration.farmGateDesc")}
                        </Text>

                        <Pressable
                          onPress={() =>
                            router.push({
                              pathname: "/(aqua)/registration/capture-pond-image",
                              params: {
                                farmId: activeFarmId,
                                farmName: activeFarmName,
                                farmCode: activeFarmCode,
                                pondsJson: JSON.stringify(ponds),
                                pondIndex: String(index),
                              },
                            })
                          }
                          className="mt-3 rounded-xl bg-slate-900 px-4 py-3 dark:bg-white"
                        >
                          <Text className="text-center font-semibold text-white dark:text-slate-900">
                            {pond.pondImageCaptured
                              ? t("registration.retakePondImage")
                              : t("registration.captureImage")}
                          </Text>
                        </Pressable>

                        {pond.pondImageCaptured && pond.pondImageUri ? (
                          <View className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                            <Text className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                              {t("registration.pondImageAttached")}
                            </Text>
                            <Pressable
                              onPress={() => openPreview(pond.pondImageUri, wm)}
                              className="mt-3"
                            >
                              <View style={{ position: "relative" }}>
                                <Image
                                  source={{ uri: pond.pondImageUri }}
                                  className="h-44 w-full rounded-xl"
                                  resizeMode="cover"
                                />
                                <WatermarkOverlay wm={wm} />
                              </View>
                              <Text className="mt-2 text-center text-xs font-medium text-emerald-700 dark:text-emerald-200/80">
                                {t("registration.tapToPreview")}
                              </Text>
                            </Pressable>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>

            <Pressable
              onPress={() => {
                dispatch(addPond());
                // stamp GPS on the new pond (index = current length after add)
                const newIndex = ponds.length;
                if (gpsLat && gpsLng) {
                  // setTimeout 0 lets Redux update first
                  setTimeout(() => {
                    dispatch(setPondField({ index: newIndex, key: "gpsLat", value: gpsLat }));
                    dispatch(setPondField({ index: newIndex, key: "gpsLng", value: gpsLng }));
                  }, 0);
                }
              }}
              className="mt-5 rounded-2xl border border-dashed border-slate-400 bg-white px-4 py-4 dark:border-white/20 dark:bg-[#0B1220]"
            >
              <Text className="text-center font-semibold text-slate-900 dark:text-white">
                {t("registration.addAnotherPond")}
              </Text>
            </Pressable>
          </>
        ) : null}

        {/* Footer */}
        <View className="mt-5 flex-row gap-3">
          <View className="flex-1">
            <Pressable
              onPress={() => router.back()}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#0B1220]"
            >
              <Text className="text-center font-semibold text-slate-900 dark:text-white">
                {t("registration.back")}
              </Text>
            </Pressable>
          </View>
          <View className="flex-1">
            <Pressable
              onPress={handleNext}
              disabled={!activeFarmId}
              className={`rounded-2xl px-4 py-3 ${
                activeFarmId
                  ? "bg-slate-900 dark:bg-white"
                  : "bg-slate-300 dark:bg-white/20"
              }`}
            >
              <Text
                className={`text-center font-semibold ${
                  activeFarmId
                    ? "text-white dark:text-slate-900"
                    : "text-slate-500 dark:text-white/40"
                }`}
              >
                {t("registration.next")}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* ── Farm picker Modal ── */}
      <Modal
        visible={farmModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setFarmModalOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View
            className="rounded-t-3xl bg-white px-4 pb-6 pt-4 dark:bg-[#0B1220]"
            style={{ maxHeight: "65%" }}
          >
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-base font-semibold text-slate-900 dark:text-white">
                {t("registration.selectFarm")}
              </Text>
              <Pressable
                onPress={() => setFarmModalOpen(false)}
                className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-white/10"
              >
                <Ionicons name="close" size={20} color="#94A3B8" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {approvedFarms.length ? (
                approvedFarms.map((item) => (
                  <Pressable
                    key={String(item.id)}
                    onPress={() => handleFarmSelect(item)}
                    className={`mb-2 flex-row items-center justify-between rounded-2xl border px-4 py-4 ${
                      activeFarmId === String(item.id)
                        ? "border-emerald-300 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10"
                        : "border-slate-200 bg-white dark:border-white/10 dark:bg-[#111827]"
                    }`}
                  >
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-slate-900 dark:text-white">
                        {item.name}
                      </Text>
                      <Text className="mt-0.5 text-xs text-slate-500 dark:text-white/50">
                        ID: {item.id}
                        {item.farm_code ? `  •  ${item.farm_code}` : ""}
                      </Text>
                    </View>
                    {activeFarmId === String(item.id) && (
                      <Ionicons name="checkmark-circle" size={20} color="#059669" />
                    )}
                  </Pressable>
                ))
              ) : (
                <View className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                  <Text className="text-sm text-slate-600 dark:text-white/60">
                    {t("registration.noApprovedFarmsAvailable")}
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Species picker Modal — scrollable ── */}
      <Modal
        visible={speciesModalForIndex !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setSpeciesModalForIndex(null)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View
            className="rounded-t-3xl bg-white px-4 pb-6 pt-4 dark:bg-[#0B1220]"
            style={{ maxHeight: "75%" }}
          >
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-base font-semibold text-slate-900 dark:text-white">
                {t("registration.selectSpecies")}
              </Text>
              <Pressable
                onPress={() => setSpeciesModalForIndex(null)}
                className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-white/10"
              >
                <Ionicons name="close" size={20} color="#94A3B8" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {fishTypesLoading ? (
                <View className="items-center py-8">
                  <ActivityIndicator size="large" color="#94A3B8" />
                  <Text className="mt-3 text-sm text-slate-500 dark:text-white/50">
                    {t("registration.loadingSpecies")}
                  </Text>
                </View>
              ) : fishTypes.length ? (
                fishTypes.map((item) => {
                  const isSelected =
                    speciesModalForIndex !== null &&
                    ponds[speciesModalForIndex]?.speciesId === String(item.id);

                  return (
                    <Pressable
                      key={item.id}
                      onPress={() =>
                        speciesModalForIndex !== null &&
                        handleSpeciesSelect(speciesModalForIndex, item)
                      }
                      className={`mb-3 overflow-hidden rounded-2xl border ${
                        isSelected
                          ? "border-emerald-300 dark:border-emerald-500/30"
                          : "border-slate-200 dark:border-white/10"
                      } bg-white dark:bg-[#111827]`}
                    >
                      {item.fish_type_url ? (
                        <Image
                          source={{ uri: item.fish_type_url }}
                          className="h-32 w-full"
                          resizeMode="cover"
                        />
                      ) : (
                        <View className="h-20 w-full items-center justify-center bg-slate-100 dark:bg-white/5">
                          <Ionicons name="fish-outline" size={32} color="#94A3B8" />
                        </View>
                      )}
                      <View className="flex-row items-center justify-between px-4 py-3">
                        <View className="flex-1">
                          <Text className="text-sm font-semibold text-slate-900 dark:text-white">
                            {item.fish_name}
                          </Text>
                          {item.fish_code ? (
                            <Text className="mt-0.5 text-xs text-slate-500 dark:text-white/50">
                              Code: {item.fish_code}
                            </Text>
                          ) : null}
                        </View>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={20} color="#059669" />
                        )}
                      </View>
                    </Pressable>
                  );
                })
              ) : (
                <View className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                  <Text className="text-sm text-slate-600 dark:text-white/60">
                    {t("registration.noSpeciesAvailable")}
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Full-screen image preview with watermark ── */}
      <Modal
        visible={previewOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setPreviewOpen(false)}
      >
        <View className="flex-1 bg-black/95">
          <View
            className="flex-row items-center justify-between px-4"
            style={{ paddingTop: insets.top + 8, paddingBottom: 12 }}
          >
            <Text className="text-base font-semibold text-white">
              {t("registration.pondImagePreview")}
            </Text>
            <Pressable
              onPress={() => setPreviewOpen(false)}
              className="h-10 w-10 items-center justify-center rounded-full bg-white/10"
            >
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </Pressable>
          </View>
          <View className="flex-1 items-center justify-center px-4 pb-6">
            {previewUri ? (
              <View style={{ position: "relative", width: "100%", height: "100%" }}>
                <Image
                  source={{ uri: previewUri }}
                  style={{ width: "100%", height: "100%", borderRadius: 16 }}
                  resizeMode="contain"
                />
                {previewWatermark && <WatermarkOverlay wm={previewWatermark} />}
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </>
  );
}