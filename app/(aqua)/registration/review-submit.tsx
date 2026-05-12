import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";

import type { AppDispatch } from "../../../src/store/auth/store";
import type { AquaPondData } from "../../../src/types/aqua";
import { selectAquaRegistration } from "../../../src/features/aqua/registration/registration.selectors";
import {
  submitRegistrationFailure,
  submitRegistrationStart,
  submitRegistrationSuccess,
} from "../../../src/features/aqua/registration/registration.slice";
import {
  submitFarmRegistration,
  submitPondRegistration,
} from "../../../src/services/aqua/registration.service";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-start justify-between gap-4 py-2">
      <Text className="flex-1 text-sm text-slate-500 dark:text-white/60">
        {label}
      </Text>

      <Text
        className="flex-1 text-right text-sm font-medium text-slate-900 dark:text-white"
        numberOfLines={3}
      >
        {value || "-"}
      </Text>
    </View>
  );
}

const getParamValue = (value: string | string[] | undefined, fallback = "") =>
  Array.isArray(value) ? String(value[0] ?? fallback) : String(value ?? fallback);

function toNumber(value: any, fallback = 0) {
  const num = Number(value);

  if (!Number.isFinite(num)) return fallback;

  return num;
}

function toNullableNumber(value: any) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return null;
  }

  const num = Number(value);

  if (!Number.isFinite(num)) return null;

  return num;
}

function pickValidUserId(...values: any[]) {
  const found = values.find((value) => {
    if (value === undefined || value === null) return false;

    const text = String(value).trim();

    return (
      text !== "" &&
      text !== "0" &&
      text !== "-" &&
      text !== "undefined" &&
      text !== "null"
    );
  });

  if (!found) return "";

  return String(found).replace(/\D/g, "");
}

function safeJsonParse(value: string | null) {
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function getStoredUserId() {
  const values = await AsyncStorage.multiGet([
    "user_id",
    "owner_id",
    "auth_user_id",
    "id",
    "me_cache_v1",
    "login_user",
    "auth_user",
    "user",
  ]);

  const store: Record<string, string> = {};

  values.forEach(([key, value]) => {
    if (value) store[key] = value;
  });

  const meCache = safeJsonParse(store.me_cache_v1);
  const loginUser = safeJsonParse(store.login_user);
  const authUser = safeJsonParse(store.auth_user);
  const user = safeJsonParse(store.user);

  return pickValidUserId(
    store.user_id,
    store.owner_id,
    store.auth_user_id,
    store.id,

    meCache?.user_id,
    meCache?.id,
    meCache?.owner_id,
    meCache?.data?.user_id,
    meCache?.data?.id,
    meCache?.data?.owner_id,

    loginUser?.user_id,
    loginUser?.id,
    loginUser?.owner_id,
    loginUser?.data?.user_id,
    loginUser?.data?.id,
    loginUser?.data?.owner_id,

    authUser?.user_id,
    authUser?.id,
    authUser?.owner_id,
    authUser?.data?.user_id,
    authUser?.data?.id,
    authUser?.data?.owner_id,

    user?.user_id,
    user?.id,
    user?.owner_id,
    user?.data?.user_id,
    user?.data?.id,
    user?.data?.owner_id,
  );
}

function buildFarmPrefix(farm: any) {
  const countryCode = farm?.countryCode || farm?.country_code || "IN";
  const stateCode = farm?.stateCode || farm?.state_code || "TN";
  const districtCode = farm?.districtCode || farm?.district_code || "KA";

  return `${countryCode}-${stateCode}-${districtCode}`;
}

function parsePonds(pondsJson: string, fallback: AquaPondData[]) {
  if (!pondsJson) return fallback;

  try {
    const parsed = JSON.parse(pondsJson);

    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as AquaPondData[];
    }

    return fallback;
  } catch {
    return fallback;
  }
}

function buildPondGps(lat: string, lng: string) {
  return `https://maps.google.com/?q=${lat},${lng}`;
}

export default function AquaReviewSubmitScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation();

  const registration = useSelector(selectAquaRegistration);
  const { farmer, farm, ponds, submission } = registration;

  const me = useSelector((state: any) => state.me?.me);
  const loginState = useSelector((state: any) => state.login);
  const authState = useSelector((state: any) => state.auth);
  const authSessionState = useSelector((state: any) => state.authSession);
  const qualityAuthState = useSelector((state: any) => state.qualityAuth);

  const [loggedUserId, setLoggedUserId] = useState("");
  const [loadingUserId, setLoadingUserId] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const pondsJson = getParamValue(params.pondsJson, "");

  const finalPonds = useMemo(
    () => parsePonds(pondsJson, ponds),
    [pondsJson, ponds],
  );

  const farmPrefix = useMemo(() => buildFarmPrefix(farm), [farm]);

  useEffect(() => {
    let mounted = true;

    const loadUserId = async () => {
      setLoadingUserId(true);

      const reduxUserId = pickValidUserId(
        me?.user_id,
        me?.id,
        me?.owner_id,

        loginState?.user_id,
        loginState?.id,
        loginState?.owner_id,
        loginState?.user?.user_id,
        loginState?.user?.id,
        loginState?.user?.owner_id,
        loginState?.data?.user_id,
        loginState?.data?.id,
        loginState?.data?.owner_id,

        authState?.user_id,
        authState?.id,
        authState?.owner_id,
        authState?.user?.user_id,
        authState?.user?.id,
        authState?.user?.owner_id,
        authState?.data?.user_id,
        authState?.data?.id,
        authState?.data?.owner_id,

        authSessionState?.user_id,
        authSessionState?.id,
        authSessionState?.owner_id,
        authSessionState?.user?.user_id,
        authSessionState?.user?.id,
        authSessionState?.user?.owner_id,
        authSessionState?.data?.user_id,
        authSessionState?.data?.id,
        authSessionState?.data?.owner_id,

        qualityAuthState?.user_id,
        qualityAuthState?.id,
        qualityAuthState?.owner_id,
        qualityAuthState?.user?.user_id,
        qualityAuthState?.user?.id,
        qualityAuthState?.user?.owner_id,

        (farm as any)?.ownerId,
        (farm as any)?.owner_id,
        (farm as any)?.userId,
        (farm as any)?.user_id,
      );

      if (reduxUserId) {
        if (mounted) {
          setLoggedUserId(reduxUserId);
          setLoadingUserId(false);
        }

        return;
      }

      const storageUserId = await getStoredUserId();

      if (mounted) {
        setLoggedUserId(storageUserId);
        setLoadingUserId(false);
      }
    };

    loadUserId();

    return () => {
      mounted = false;
    };
  }, [
    me,
    loginState,
    authState,
    authSessionState,
    qualityAuthState,
    farm,
  ]);

  const validateBeforeSubmit = () => {
    if (loadingUserId) {
      Alert.alert("Please wait", "User details are still loading.");
      return false;
    }

    if (!loggedUserId) {
      Alert.alert(
        "Error",
        "User ID is missing. Please logout and login again.",
      );
      return false;
    }

    if (!farm.farmName?.trim()) {
      Alert.alert("Validation", "Farm name is required");
      return false;
    }

    if (!farm.farmAddress?.trim()) {
      Alert.alert("Validation", "Farm address is required");
      return false;
    }

    if (!farm.waterSource?.trim()) {
      Alert.alert("Validation", "Water source is required");
      return false;
    }

    if (!farm.farmArea?.trim()) {
      Alert.alert("Validation", "Farm area is required");
      return false;
    }

    if (!farm.latitude?.trim() || !farm.longitude?.trim()) {
      Alert.alert("Validation", "Farm GPS location is required");
      return false;
    }

    if (!finalPonds.length) {
      Alert.alert("Validation", "At least one pond is required");
      return false;
    }

    for (let i = 0; i < finalPonds.length; i += 1) {
      const pond = finalPonds[i];

      if (!pond.pondName?.trim()) {
        Alert.alert("Validation", `Pond ${i + 1} name is required`);
        return false;
      }

      if (!String((pond as any).pondType ?? "").trim()) {
        Alert.alert("Validation", `Pond ${i + 1} type is required`);
        return false;
      }

      if (!pond.pondArea?.trim()) {
        Alert.alert("Validation", `Pond ${i + 1} area is required`);
        return false;
      }

      if (!String((pond as any).volume ?? "").trim()) {
        Alert.alert("Validation", `Pond ${i + 1} volume is required`);
        return false;
      }

      if (!pond.speciesId?.trim()) {
        Alert.alert("Validation", `Pond ${i + 1} species is required`);
        return false;
      }

      const lat = pond.gpsLat || farm.latitude;
      const lng = pond.gpsLng || farm.longitude;

      if (!lat || !lng) {
        Alert.alert("Validation", `Pond ${i + 1} GPS is required`);
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateBeforeSubmit()) return;

    const farmPayload = {
      user_id: Number(loggedUserId),
      farm_prefix: farmPrefix,
      farm_name: farm.farmName.trim(),
      address: farm.farmAddress.trim(),
      farm_gate_latitude: toNumber(farm.latitude),
      farm_gate_longitude: toNumber(farm.longitude),
      water_source: farm.waterSource.trim(),
      farm_area_acres: toNumber(farm.farmArea),
    };

    try {
      setSubmitting(true);
      dispatch(submitRegistrationStart());

      console.log("COMBINED_FARM_PAYLOAD:", farmPayload);

      const farmResponse = await submitFarmRegistration(farmPayload);

      if (!farmResponse.ok || !farmResponse.data?.id) {
        const errMsg =
          farmResponse.message || "Farm registration submission failed";

        dispatch(submitRegistrationFailure(errMsg));
        Alert.alert("Submission Failed", errMsg);
        return;
      }

      const createdFarmDbId = farmResponse.data.id;

      const pondResults = [];

      for (const pond of finalPonds) {
        const pondLat = pond.gpsLat || farm.latitude;
        const pondLng = pond.gpsLng || farm.longitude;

        const pondPayload = {
          farm_id: Number(createdFarmDbId),
          pond_name: pond.pondName.trim(),
          pond_type: String((pond as any).pondType || "Earthen"),
          water_spread_area_acres: toNumber(pond.pondArea),
          volume: toNullableNumber((pond as any).volume),
          pond_status: "Inactive",
          verification_status: "Unverified",
          pond_gps: buildPondGps(pondLat, pondLng),
        };

        console.log("COMBINED_POND_PAYLOAD:", pondPayload);

        const pondResponse = await submitPondRegistration(pondPayload);

        if (!pondResponse.ok) {
          const errMsg =
            pondResponse.message ||
            `Pond ${pond.pondName} registration failed`;

          dispatch(submitRegistrationFailure(errMsg));
          Alert.alert("Submission Failed", errMsg);
          return;
        }

        pondResults.push(pondResponse.data);
      }

      dispatch(
        submitRegistrationSuccess(
          "Farm and pond details submitted successfully for field verification",
        ),
      );

      router.replace({
        pathname: "/(aqua)/registration/success",
        params: {
          farmName: farm.farmName,
          pondCount: String(finalPonds.length),
          farmDbId: String(createdFarmDbId),
          userId: String(loggedUserId),
        },
      });
    } catch (error: any) {
      const errMsg =
        error?.message || "Farm and pond registration submission failed";

      dispatch(submitRegistrationFailure(errMsg));
      Alert.alert("Submission Failed", errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-[#F5F7FB] dark:bg-[#050B16]"
      contentContainerStyle={{
        padding: 16,
        paddingTop: insets.top + 8,
        paddingBottom: 32,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View className="rounded-2xl border border-slate-900 bg-slate-900 p-5 dark:border-white/10 dark:bg-[#0B1220]">
        <View className="flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
            <Ionicons name="document-text-outline" size={20} color="#60A5FA" />
          </View>

          <View className="flex-1">
            <Text className="text-[11px] uppercase tracking-wide text-white opacity-80">
              {t("registration.farmRegistry")}
            </Text>

            <Text className="mt-1 text-lg font-bold text-white">
              {t("registration.reviewSubmit")}
            </Text>
          </View>
        </View>
      </View>

      <View className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
        <Text className="text-base font-bold text-amber-800 dark:text-amber-300">
          {t("registration.pendingFieldVerification")}
        </Text>

        <Text className="mt-2 text-sm leading-6 text-amber-700 dark:text-amber-200/80">
          {t("registration.registrationReviewRule")}
        </Text>
      </View>

      <View className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0B1220]">
        <Text className="mb-3 text-base font-semibold text-slate-900 dark:text-white">
          {t("registration.farmerProfile")}
        </Text>

        <View className="rounded-2xl border border-slate-100 bg-slate-50 px-3 dark:border-white/5 dark:bg-white/5">
          <InfoRow label={t("registration.farmerName")} value={farmer.farmerName} />
          <View className="h-px bg-slate-100 dark:bg-white/5" />

          <InfoRow label={t("registration.fatherName")} value={String((farmer as any).fatherName ?? "")} />
          <View className="h-px bg-slate-100 dark:bg-white/5" />

          <InfoRow label={t("registration.dateOfBirth")} value={String((farmer as any).dateOfBirth ?? "")} />
          <View className="h-px bg-slate-100 dark:bg-white/5" />

          <InfoRow label={t("registration.farmerLicense")} value={String((farmer as any).farmerLicense ?? "")} />
          <View className="h-px bg-slate-100 dark:bg-white/5" />

          <InfoRow label={t("registration.contactNumber")} value={farmer.mobileNumber} />
          <View className="h-px bg-slate-100 dark:bg-white/5" />

          <InfoRow label={t("registration.farmerAddress")} value={String((farmer as any).farmerAddress ?? "")} />
          <View className="h-px bg-slate-100 dark:bg-white/5" />

          <InfoRow
            label={t("registration.farmingExperience")}
            value={`${String((farmer as any).farmingExperienceYears ?? "0")} ${t("registration.experienceYears")} ${String((farmer as any).farmingExperienceMonths ?? "0")} ${t("registration.experienceMonths")}`}
          />
        </View>
      </View>

      <View className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0B1220]">
        <Text className="mb-3 text-base font-semibold text-slate-900 dark:text-white">
          {t("registration.farmSection")}
        </Text>

        <View className="rounded-2xl border border-slate-100 bg-slate-50 px-3 dark:border-white/5 dark:bg-white/5">
          <InfoRow label={t("registration.officialFarmIdPendingLabel")} value={t("registration.officialFarmIdPending")} />
          <View className="h-px bg-slate-100 dark:bg-white/5" />

          <InfoRow label={t("registration.farmName")} value={farm.farmName} />
          <View className="h-px bg-slate-100 dark:bg-white/5" />

          <InfoRow label={t("registration.farmAddress")} value={farm.farmAddress} />
          <View className="h-px bg-slate-100 dark:bg-white/5" />

          <InfoRow label={t("registration.country")} value={farm.countryName} />
          <View className="h-px bg-slate-100 dark:bg-white/5" />

          <InfoRow label={t("registration.state")} value={farm.stateName} />
          <View className="h-px bg-slate-100 dark:bg-white/5" />

          <InfoRow label={t("registration.district")} value={farm.district} />
          <View className="h-px bg-slate-100 dark:bg-white/5" />

          <InfoRow label={t("registration.location")} value={farm.locationName} />
          <View className="h-px bg-slate-100 dark:bg-white/5" />

          <InfoRow label={t("registration.waterSource")} value={farm.waterSource} />
          <View className="h-px bg-slate-100 dark:bg-white/5" />

          <InfoRow label={t("registration.farmArea")} value={`${farm.farmArea} Acres`} />
          <View className="h-px bg-slate-100 dark:bg-white/5" />

          <InfoRow label={t("registration.farmGateGps")} value={`https://maps.google.com/?q=${farm.latitude},${farm.longitude}`} />
          <View className="h-px bg-slate-100 dark:bg-white/5" />

          <InfoRow label={t("registration.technicianName")} value={String((farm as any).technicianName ?? "Sriram D")} />
          <View className="h-px bg-slate-100 dark:bg-white/5" />

          <InfoRow label={t("registration.technicianMobileNumber")} value={String((farm as any).technicianMobileNumber ?? "6374484558")} />
        </View>
      </View>

      <View className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0B1220]">
        <Text className="mb-3 text-base font-semibold text-slate-900 dark:text-white">
          {t("registration.pondDetails")}
        </Text>

        <View className="gap-3">
          {finalPonds.map((pond, index) => {
            const pondLat = pond.gpsLat || farm.latitude;
            const pondLng = pond.gpsLng || farm.longitude;

            return (
              <View
                key={pond.id || `pond-${index + 1}`}
                className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 dark:border-white/5 dark:bg-white/5"
              >
                <InfoRow label={t("registration.pondIdQrLinking")} value={t("registration.officialPondIdPending")} />
                <View className="h-px bg-slate-100 dark:bg-white/5" />

                <InfoRow label={t("registration.pondName")} value={pond.pondName} />
                <View className="h-px bg-slate-100 dark:bg-white/5" />

                <InfoRow label={t("registration.pondType")} value={String((pond as any).pondType || "Earthen")} />
                <View className="h-px bg-slate-100 dark:bg-white/5" />

                <InfoRow label={t("registration.waterSpreadAreaAcres")} value={`${pond.pondArea} Acres`} />
                <View className="h-px bg-slate-100 dark:bg-white/5" />

                <InfoRow label={t("registration.volumeCubicMeter")} value={`${String((pond as any).volume || "-")} m³`} />
                <View className="h-px bg-slate-100 dark:bg-white/5" />

                <InfoRow label={t("registration.species")} value={pond.speciesName} />
                <View className="h-px bg-slate-100 dark:bg-white/5" />

                <InfoRow label={t("registration.pondGpsMap")} value={buildPondGps(pondLat, pondLng)} />
              </View>
            );
          })}
        </View>
      </View>

      {submission.message ? (
        <View className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0B1220]">
          <Text className="text-sm text-slate-700 dark:text-white/80">
            {submission.message}
          </Text>
        </View>
      ) : null}

      <View className="mt-5 flex-row gap-3">
        <View className="flex-1">
          <Pressable
            onPress={() => router.back()}
            disabled={submitting}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-4 dark:border-white/10 dark:bg-[#0B1220]"
          >
            <Text className="text-center font-semibold text-slate-900 dark:text-white">
              Back
            </Text>
          </Pressable>
        </View>

        <View className="flex-1">
          <Pressable
            onPress={handleSubmit}
            disabled={submitting || loadingUserId}
            className={`rounded-2xl px-4 py-4 dark:bg-white ${
              submitting || loadingUserId ? "bg-slate-500" : "bg-slate-900"
            }`}
          >
            <Text className="text-center font-semibold text-white dark:text-slate-900">
              {loadingUserId
                ? "Loading..."
                : submitting
                  ? "Submitting..."
                  : "Submit All"}
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}