import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";

import type { AppDispatch } from "../../../src/store/auth/store";
import { selectAquaRegistration } from "../../../src/features/aqua/registration/registration.selectors";
import {
  submitRegistrationFailure,
  submitRegistrationStart,
  submitRegistrationSuccess,
} from "../../../src/features/aqua/registration/registration.slice";
import { submitFarmRegistration } from "../../../src/services/aqua/registration.service";

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

function toNumber(value: any, fallback = 0) {
  const num = Number(value);

  if (!Number.isFinite(num)) return fallback;

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
    "auth_token",
    "user_id",
    "owner_id",
    "auth_user_id",
    "id",
    "phone_no",
    "auth_phone_no",
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

export default function FarmReviewSubmitScreen() {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();

  const registration = useSelector(selectAquaRegistration);
  const { farm, submission } = registration;

  const me = useSelector((state: any) => state.me?.me);
  const loginState = useSelector((state: any) => state.login);
  const authState = useSelector((state: any) => state.auth);
  const authSessionState = useSelector((state: any) => state.authSession);
  const qualityAuthState = useSelector((state: any) => state.qualityAuth);

  const [loggedUserId, setLoggedUserId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingUserId, setLoadingUserId] = useState(true);

  const farmAny = farm as any;

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
        loginState?.loginData?.user_id,
        loginState?.loginData?.id,
        loginState?.loginData?.owner_id,

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

        farmAny?.ownerId,
        farmAny?.owner_id,
        farmAny?.userId,
        farmAny?.user_id,
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
    farmAny?.ownerId,
    farmAny?.owner_id,
    farmAny?.userId,
    farmAny?.user_id,
  ]);

  const farmPrefix = useMemo(() => buildFarmPrefix(farmAny), [farmAny]);

  const handleSubmit = async () => {
    if (loadingUserId) {
      Alert.alert("Please wait", "User details are still loading.");
      return;
    }

    if (!loggedUserId) {
      console.log("USER_ID_DEBUG:", {
        me,
        loginState,
        authState,
        authSessionState,
        qualityAuthState,
        farmOwnerId: farmAny?.ownerId,
        farmOwnerIdSnake: farmAny?.owner_id,
        farmUserId: farmAny?.userId,
        farmUserIdSnake: farmAny?.user_id,
      });

      Alert.alert(
        "Error",
        "User ID is missing. Login user details are not loaded. Please logout and login again.",
      );
      return;
    }

    if (!farm.farmName?.trim()) {
      Alert.alert("Validation", "Farm name is required");
      return;
    }

    if (!farm.farmAddress?.trim()) {
      Alert.alert("Validation", "Farm address is required");
      return;
    }

    if (!farm.waterSource?.trim()) {
      Alert.alert("Validation", "Water source is required");
      return;
    }

    if (!farm.farmArea?.trim()) {
      Alert.alert("Validation", "Farm area is required");
      return;
    }

    if (!farm.latitude?.trim() || !farm.longitude?.trim()) {
      Alert.alert("Validation", "Farm GPS location is required");
      return;
    }

    const farmArea = toNumber(farm.farmArea);
    const latitude = toNumber(farm.latitude);
    const longitude = toNumber(farm.longitude);

    if (farmArea <= 0) {
      Alert.alert("Validation", "Farm area must be greater than 0");
      return;
    }

    if (!latitude || !longitude) {
      Alert.alert("Validation", "Valid latitude and longitude are required");
      return;
    }

    const payload = {
      user_id: Number(loggedUserId),
      owner_id: Number(loggedUserId),
      farm_prefix: farmPrefix,
      farm_name: farm.farmName.trim(),
      address: farm.farmAddress.trim(),
      farm_gate_latitude: latitude,
      farm_gate_longitude: longitude,
      water_source: farm.waterSource.trim(),
      farm_area_acres: farmArea,
    };

    console.log("FARM_SUBMIT_PAYLOAD:", payload);

    try {
      setSubmitting(true);
      dispatch(submitRegistrationStart());

      const response = await submitFarmRegistration(payload);

      if (!response.ok) {
        const errMsg = response.message || "Farm registration failed";

        dispatch(submitRegistrationFailure(errMsg));
        Alert.alert("Submission Failed", errMsg);
        return;
      }

      dispatch(
        submitRegistrationSuccess(
          response.message || "Farm registered successfully",
        ),
      );

      router.replace({
        pathname: "/(aqua)/registration/farm-pending",
        params: {
          farmDbId: String(response.data?.id ?? ""),
          farmName: String(response.data?.farm_name ?? farm.farmName),
          tempFarmCode: String(response.data?.farm_id ?? ""),
          userId: String(loggedUserId),
        },
      });
    } catch (error: any) {
      const errMsg = error?.message || "Farm registration failed";

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
              Farm Registration
            </Text>

            <Text className="mt-1 text-lg font-bold text-white">
              Review & Submit
            </Text>
          </View>
        </View>
      </View>

      <View className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
        <Text className="text-base font-bold text-amber-800 dark:text-amber-300">
          Pending Field Verification Flow
        </Text>

        <Text className="mt-2 text-sm leading-6 text-amber-700 dark:text-amber-200/80">
          • No official Farm ID is generated now{"\n"}
          • Image capture is not required before activation{"\n"}
          • Farm QR becomes the official Farm ID only after field verification
          and QR scan{"\n"}
          • Daily logs must remain locked until QR activation
        </Text>
      </View>

      <View className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0B1220]">
        <Text className="mb-3 text-base font-semibold text-slate-900 dark:text-white">
          Farm Details
        </Text>

        <View className="rounded-2xl border border-slate-100 bg-slate-50 px-3 dark:border-white/5 dark:bg-white/5">
          <InfoRow
            label="Owner ID"
            value={loadingUserId ? "Loading..." : loggedUserId || "Not found"}
          />
          <View className="h-px bg-slate-100 dark:bg-white/5" />

          <InfoRow label="Farm Prefix" value={farmPrefix} />
          <View className="h-px bg-slate-100 dark:bg-white/5" />

          <InfoRow label="Farm Name" value={farm.farmName} />
          <View className="h-px bg-slate-100 dark:bg-white/5" />

          <InfoRow label="Farm Address" value={farm.farmAddress} />
          <View className="h-px bg-slate-100 dark:bg-white/5" />

          <InfoRow label="Country" value={farm.countryName} />
          <View className="h-px bg-slate-100 dark:bg-white/5" />

          <InfoRow label="State" value={farm.stateName} />
          <View className="h-px bg-slate-100 dark:bg-white/5" />

          <InfoRow label="District" value={farm.district} />
          <View className="h-px bg-slate-100 dark:bg-white/5" />

          <InfoRow label="Location" value={farm.locationName} />
          <View className="h-px bg-slate-100 dark:bg-white/5" />

          <InfoRow label="Water Source" value={farm.waterSource} />
          <View className="h-px bg-slate-100 dark:bg-white/5" />

          <InfoRow label="Number of Ponds" value={farm.pondCount} />
          <View className="h-px bg-slate-100 dark:bg-white/5" />

          <InfoRow label="Total Farm Area" value={farm.farmArea} />
          <View className="h-px bg-slate-100 dark:bg-white/5" />

          <InfoRow label="Latitude" value={farm.latitude} />
          <View className="h-px bg-slate-100 dark:bg-white/5" />

          <InfoRow label="Longitude" value={farm.longitude} />
        </View>
      </View>

      {submission.message ? (
        <View className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0B1220]">
          <Text className="text-sm text-slate-700 dark:text-white/80">
            {submission.message}
          </Text>
        </View>
      ) : null}

      {!loadingUserId && !loggedUserId ? (
        <View className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-500/20 dark:bg-rose-500/10">
          <Text className="text-sm font-bold text-rose-700 dark:text-rose-300">
            User ID not found
          </Text>

          <Text className="mt-1 text-xs leading-5 text-rose-600 dark:text-rose-200/80">
            The login response is not available in Redux or AsyncStorage. Logout
            and login again. If this still shows, update login to save owner_id
            or id.
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
                  : "Submit Farm"}
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
