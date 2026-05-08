import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import * as Location from "expo-location";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
  Modal,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";

import type { AppDispatch } from "../../../src/store/auth/store";
import {
  selectAquaFarmer,
  selectAquaFarm,
} from "../../../src/features/aqua/registration/registration.selectors";
import {
  setFarmerField,
  setFarmField,
} from "../../../src/features/aqua/registration/registration.slice";

import {
  fetchCountries,
  fetchStatesByCountry,
  fetchDistrictsByState,
  fetchLocationsByDistrict,
} from "../../../src/store/auth/location.slice";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_REGEX = /^\d{10}$/;
const AADHAAR_REGEX = /^\d{12}$/;
const ALPHA_SPACE_REGEX = /^[A-Za-z\s]+$/;
const DECIMAL_REGEX = /^-?\d+(\.\d+)?$/;
const INTEGER_REGEX = /^\d+$/;

const sanitizeAlphaText = (text: string) =>
  text.replace(/[^A-Za-z\s]/g, "").replace(/\s{2,}/g, " ");

type PickerType = "country" | "state" | "district" | "location" | null;

function extractId(item: any): number | string {
  return (
    item?.id ??
    item?.country_id ??
    item?.state_id ??
    item?.district_id ??
    item?.location_id ??
    ""
  );
}

function extractLabel(item: any): string {
  return (
    item?.name ??
    item?.country_name ??
    item?.state_name ??
    item?.district_name ??
    item?.location_name ??
    ""
  );
}

// ─── Standalone reusable field components (must be outside the screen) ────────

function Field({
  label,
  placeholder,
  value,
  onChangeText,
  keyboardType = "default",
  multiline = false,
  editable = true,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText?: (text: string) => void;
  keyboardType?: "default" | "numeric" | "email-address" | "phone-pad";
  multiline?: boolean;
  editable?: boolean;
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
        multiline={multiline}
        editable={editable}
        autoCapitalize={keyboardType === "email-address" ? "none" : "sentences"}
        textAlignVertical={multiline ? "top" : "center"}
        className={`rounded-2xl border border-slate-200 px-4 text-sm text-slate-900 dark:border-white/10 dark:text-white ${
          multiline ? "min-h-[96px] py-4" : "py-3"
        } ${
          editable
            ? "bg-white dark:bg-[#0B1220]"
            : "bg-slate-100 opacity-70 dark:bg-white/5"
        }`}
      />
    </View>
  );
}

function SelectField({
  label,
  value,
  placeholder,
  onPress,
  disabled = false,
  helperText,
}: {
  label: string;
  value: string;
  placeholder: string;
  onPress: () => void;
  disabled?: boolean;
  helperText?: string;
}) {
  return (
    <View className="flex-1 gap-2">
      <Text className="text-sm font-medium text-slate-900 dark:text-white">
        {label}
      </Text>

      <Pressable
        disabled={disabled}
        onPress={onPress}
        className={`rounded-2xl border px-4 py-3 ${
          disabled
            ? "border-slate-200 bg-slate-100 opacity-60 dark:border-white/10 dark:bg-white/5"
            : "border-slate-200 bg-white dark:border-white/10 dark:bg-[#0B1220]"
        }`}
      >
        <View className="flex-row items-center justify-between">
          <Text
            className={`flex-1 text-sm ${
              value
                ? "text-slate-900 dark:text-white"
                : "text-slate-400 dark:text-white/40"
            }`}
            numberOfLines={1}
          >
            {value || placeholder}
          </Text>
          <Ionicons name="chevron-down" size={16} color="#94A3B8" />
        </View>
      </Pressable>

      {helperText ? (
        <Text className="text-xs text-slate-500 dark:text-white/50">
          {helperText}
        </Text>
      ) : null}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function FarmDetailsScreen() {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation();

  const farmer = useSelector(selectAquaFarmer);
  const farm = useSelector(selectAquaFarm);

  // Owner ID — same source as Profile page (state.me.me.owner_id)
  const me = useSelector((state: any) => state.me?.me);
  const ownerId = String(me?.owner_id ?? "");
  const [locationFetching, setLocationFetching] = useState(false);

  const locationState = useSelector((state: any) => state.location);

  const countries = locationState?.countries ?? [];
  const states = locationState?.states ?? [];
  const districts =
    locationState?.districtsByStateId?.[Number(farm.stateId || 0)] ?? [];
  const locations =
    locationState?.locationsByDistrictId?.[Number(farm.districtId || 0)] ?? [];

  const countriesLoading = locationState?.countriesLoading ?? false;
  const statesLoading = locationState?.statesLoading ?? false;
  const districtsLoading =
    locationState?.districtsLoadingByStateId?.[Number(farm.stateId || 0)] ??
    false;
  const locationsLoading =
    locationState?.locationsLoadingByDistrictId?.[
      Number(farm.districtId || 0)
    ] ?? false;

  const [pickerType, setPickerType] = useState<PickerType>(null);
  // Auto-set owner id from logged-in user
  useEffect(() => {
    if (ownerId) {
      dispatch(setFarmField({ key: "ownerId", value: ownerId }));
    }
  }, [dispatch, ownerId]);

  // Fetch device GPS coordinates directly via expo-location
  useEffect(() => {
    if (farm.latitude && farm.longitude) return; // already set, skip
    let cancelled = false;

    const fetchCoords = async () => {
      setLocationFetching(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Location Permission",
            "Location access is needed to auto-fill farm coordinates.",
          );
          return;
        }
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        if (cancelled) return;
        dispatch(
          setFarmField({
            key: "latitude",
            value: String(pos.coords.latitude),
          }),
        );
        dispatch(
          setFarmField({
            key: "longitude",
            value: String(pos.coords.longitude),
          }),
        );
      } catch {
        if (!cancelled) {
          Alert.alert("Location Error", "Could not fetch device coordinates.");
        }
      } finally {
        if (!cancelled) setLocationFetching(false);
      }
    };

    fetchCoords();
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchCountries());
  }, [dispatch]);

  const currentPickerTitle = useMemo(() => {
    if (pickerType === "country") return t("registration.selectCountry");
    if (pickerType === "state") return t("registration.selectState");
    if (pickerType === "district") return t("registration.selectDistrict");
    if (pickerType === "location") return t("registration.selectLocation");
    return t("registration.select") || "Select";
  }, [pickerType, t]);

  const currentPickerItems = useMemo(() => {
    if (pickerType === "country") return countries;
    if (pickerType === "state") return states;
    if (pickerType === "district") return districts;
    if (pickerType === "location") return locations;
    return [];
  }, [pickerType, countries, states, districts, locations]);

  const handleCountrySelect = async (item: any) => {
    const id = String(extractId(item));
    const name = extractLabel(item);

    dispatch(setFarmField({ key: "countryId", value: id }));
    dispatch(setFarmField({ key: "countryName", value: name }));

    dispatch(setFarmField({ key: "stateId", value: "" }));
    dispatch(setFarmField({ key: "stateName", value: "" }));
    dispatch(setFarmField({ key: "districtId", value: "" }));
    dispatch(setFarmField({ key: "district", value: "" }));
    dispatch(setFarmField({ key: "locationId", value: "" }));
    dispatch(setFarmField({ key: "locationName", value: "" }));

    setPickerType(null);

    if (id) {
      await dispatch(fetchStatesByCountry({ countryId: Number(id) }));
    }
  };

  const handleStateSelect = async (item: any) => {
    const id = String(extractId(item));
    const name = extractLabel(item);

    dispatch(setFarmField({ key: "stateId", value: id }));
    dispatch(setFarmField({ key: "stateName", value: name }));

    dispatch(setFarmField({ key: "districtId", value: "" }));
    dispatch(setFarmField({ key: "district", value: "" }));
    dispatch(setFarmField({ key: "locationId", value: "" }));
    dispatch(setFarmField({ key: "locationName", value: "" }));

    setPickerType(null);

    if (id) {
      await dispatch(fetchDistrictsByState({ stateId: Number(id) }));
    }
  };

  const handleDistrictSelect = async (item: any) => {
    const id = String(extractId(item));
    const name = extractLabel(item);

    dispatch(setFarmField({ key: "districtId", value: id }));
    dispatch(setFarmField({ key: "district", value: name }));

    dispatch(setFarmField({ key: "locationId", value: "" }));
    dispatch(setFarmField({ key: "locationName", value: "" }));

    setPickerType(null);

    if (id) {
      await dispatch(fetchLocationsByDistrict({ districtId: Number(id) }));
    }
  };

  const handleLocationSelect = (item: any) => {
    const id = String(extractId(item));
    const name = extractLabel(item);

    dispatch(setFarmField({ key: "locationId", value: id }));
    dispatch(setFarmField({ key: "locationName", value: name }));

    setPickerType(null);
  };

  const handlePickerItemPress = (item: any) => {
    if (pickerType === "country") {
      handleCountrySelect(item);
      return;
    }
    if (pickerType === "state") {
      handleStateSelect(item);
      return;
    }
    if (pickerType === "district") {
      handleDistrictSelect(item);
      return;
    }
    if (pickerType === "location") {
      handleLocationSelect(item);
    }
  };

  const handleNext = () => {
    const farmerName = farmer.farmerName.trim();
    const mobile = farmer.mobileNumber.trim();
    const email = (farmer.email ?? "").trim();
    const aadhaar = (farmer.aadhaarNumber ?? "").trim();

    if (!farmerName) {
      Alert.alert("Validation", "Please enter farmer name");
      return;
    }

    if (!ALPHA_SPACE_REGEX.test(farmerName)) {
      Alert.alert(
        "Validation",
        "Farmer name should contain only letters and spaces",
      );
      return;
    }

    if (!mobile) {
      Alert.alert("Validation", "Please enter mobile number");
      return;
    }

    if (!MOBILE_REGEX.test(mobile)) {
      Alert.alert("Validation", "Mobile number must be exactly 10 digits");
      return;
    }

    if (email && !EMAIL_REGEX.test(email)) {
      Alert.alert("Validation", "Please enter a valid email address");
      return;
    }

    if (!aadhaar) {
      Alert.alert("Validation", "Please enter Aadhaar number");
      return;
    }

    if (!AADHAAR_REGEX.test(aadhaar)) {
      Alert.alert("Validation", "Aadhaar number must be exactly 12 digits");
      return;
    }

    if (!farm.farmName.trim()) {
      Alert.alert("Validation", "Please enter farm name");
      return;
    }

    if (!farm.farmAddress.trim()) {
      Alert.alert("Validation", "Please enter farm address");
      return;
    }

    if (!farm.countryId.trim()) {
      Alert.alert("Validation", "Please select country");
      return;
    }

    if (!farm.stateId.trim()) {
      Alert.alert("Validation", "Please select state");
      return;
    }

    if (!farm.districtId.trim()) {
      Alert.alert("Validation", "Please select district");
      return;
    }

    if (!farm.locationId.trim()) {
      Alert.alert("Validation", "Please select location");
      return;
    }

    if (!farm.waterSource.trim()) {
      Alert.alert("Validation", "Please enter water source");
      return;
    }

    if (!farm.pondCount.trim()) {
      Alert.alert("Validation", "Please enter pond count");
      return;
    }

    if (!INTEGER_REGEX.test(farm.pondCount.trim())) {
      Alert.alert("Validation", "Pond count must be a whole number");
      return;
    }

    if (!farm.farmArea.trim()) {
      Alert.alert("Validation", "Please enter total farm area");
      return;
    }

    if (!DECIMAL_REGEX.test(farm.farmArea.trim())) {
      Alert.alert("Validation", "Farm area must be a valid number");
      return;
    }

    if (!farm.latitude.trim()) {
      Alert.alert("Validation", "Location coordinates not available yet");
      return;
    }

    if (!farm.longitude.trim()) {
      Alert.alert("Validation", "Location coordinates not available yet");
      return;
    }

    if (!farm.talukId.trim()) {
      dispatch(setFarmField({ key: "talukId", value: "0" }));
    }

    router.push("/(aqua)/registration/pond-details");
  };

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
      >
        {/* ── Header ── */}
        <View className="rounded-2xl border border-slate-900 bg-slate-900 p-5 dark:border-white/10 dark:bg-[#0B1220]">
          <View className="flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
              <Ionicons name="business-outline" size={20} color="#60A5FA" />
            </View>
            <View className="flex-1">
              <Text className="text-[11px] uppercase tracking-wide text-white opacity-80">
                {t("registration.farmRegistrationHeader")}
              </Text>
              <Text className="mt-1 text-lg font-bold text-white">
                {t("registration.farmRegistrationSubheader")}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Farmer Details ── */}
        <View className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0B1220]">
          <Text className="text-base font-semibold text-slate-900 dark:text-white">
            {t("registration.farmerSection")}
          </Text>

          <View className="mt-4 gap-4">
            <View className="flex-row gap-3">
              <Field
                label={t("registration.farmerName")}
                placeholder={t("registration.farmerNamePlaceholder")}
                value={farmer.farmerName}
                onChangeText={(text) =>
                  dispatch(
                    setFarmerField({
                      key: "farmerName",
                      value: sanitizeAlphaText(text),
                    }),
                  )
                }
              />
              <Field
                label={t("registration.mobileNumber")}
                placeholder={t("registration.mobileNumberPlaceholder")}
                value={farmer.mobileNumber}
                onChangeText={(text) =>
                  dispatch(
                    setFarmerField({
                      key: "mobileNumber",
                      value: text.replace(/\D/g, "").slice(0, 10),
                    }),
                  )
                }
                keyboardType="phone-pad"
              />
            </View>

            <View className="flex-row gap-3">
              <Field
                label={t("registration.email")}
                placeholder={t("registration.emailPlaceholder")}
                value={farmer.email ?? ""}
                onChangeText={(text) =>
                  dispatch(setFarmerField({ key: "email", value: text }))
                }
                keyboardType="email-address"
              />
              <Field
                label={t("registration.aadhaarNumber")}
                placeholder={t("registration.aadhaarPlaceholder")}
                value={farmer.aadhaarNumber ?? ""}
                onChangeText={(text) =>
                  dispatch(
                    setFarmerField({
                      key: "aadhaarNumber",
                      value: text.replace(/\D/g, "").slice(0, 12),
                    }),
                  )
                }
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        {/* ── Farm Details ── */}
        <View className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0B1220]">
          <Text className="text-base font-semibold text-slate-900 dark:text-white">
            {t("registration.farmSection")}
          </Text>

          <View className="mt-4 gap-4">
            {/* Farm Name */}
            <Field
              label={t("registration.farmName")}
              placeholder={t("registration.farmNamePlaceholder")}
              value={farm.farmName}
              onChangeText={(text) =>
                dispatch(setFarmField({ key: "farmName", value: text }))
              }
            />

            {/* Farm Address */}
            <Field
              label={t("registration.farmAddress")}
              placeholder={t("registration.farmAddressPlaceholder")}
              value={farm.farmAddress}
              onChangeText={(text) =>
                dispatch(setFarmField({ key: "farmAddress", value: text }))
              }
              multiline
            />

            {/* Country | State — side by side */}
            <View className="flex-row gap-3">
              <SelectField
                label={t("registration.country")}
                value={farm.countryName}
                placeholder={
                  countriesLoading
                    ? t("registration.loading")
                    : t("registration.selectCountry")
                }
                onPress={() => setPickerType("country")}
                disabled={countriesLoading}
              />
              <SelectField
                label={t("registration.state")}
                value={farm.stateName}
                placeholder={
                  statesLoading
                    ? t("registration.loading")
                    : t("registration.selectState")
                }
                onPress={() => setPickerType("state")}
                disabled={!farm.countryId || statesLoading}
                helperText={
                  !farm.countryId
                    ? t("registration.selectCountryFirst")
                    : undefined
                }
              />
            </View>

            {/* District | Location — side by side */}
            <View className="flex-row gap-3">
              <SelectField
                label={t("registration.district")}
                value={farm.district}
                placeholder={
                  districtsLoading
                    ? t("registration.loading")
                    : t("registration.selectDistrict")
                }
                onPress={() => setPickerType("district")}
                disabled={!farm.stateId || districtsLoading}
                helperText={
                  !farm.stateId ? t("registration.selectStateFirst") : undefined
                }
              />
              <SelectField
                label={t("registration.location")}
                value={farm.locationName}
                placeholder={
                  locationsLoading
                    ? t("registration.loading")
                    : t("registration.selectLocation")
                }
                onPress={() => setPickerType("location")}
                disabled={!farm.districtId || locationsLoading}
                helperText={
                  !farm.districtId
                    ? t("registration.selectDistrictFirst")
                    : undefined
                }
              />
            </View>

            {/* Water Source — full width */}
            <Field
              label={t("registration.waterSource")}
              placeholder={t("registration.waterSourcePlaceholder")}
              value={farm.waterSource}
              onChangeText={(text) =>
                dispatch(setFarmField({ key: "waterSource", value: text }))
              }
            />

            {/* Pond Count | Total Farm Area — side by side */}
            <View className="flex-row gap-3">
              <Field
                label={t("registration.pondCount")}
                placeholder={t("registration.pondCountPlaceholder")}
                value={farm.pondCount}
                onChangeText={(text) =>
                  dispatch(
                    setFarmField({
                      key: "pondCount",
                      value: text.replace(/\D/g, ""),
                    }),
                  )
                }
                keyboardType="numeric"
              />
              <Field
                label={t("registration.farmArea")}
                placeholder={t("registration.farmAreaPlaceholder")}
                value={farm.farmArea}
                onChangeText={(text) =>
                  dispatch(setFarmField({ key: "farmArea", value: text }))
                }
                keyboardType="numeric"
              />
            </View>

            {/* Lat / Long — auto-fetched, read-only */}
            <View className="flex-row gap-3">
              <Field
                label={t("registration.latitude")}
                placeholder={
                  locationFetching
                    ? t("registration.coordsFetching")
                    : t("registration.autoDetected")
                }
                value={farm.latitude}
                editable={false}
              />
              <Field
                label={t("registration.longitude")}
                placeholder={
                  locationFetching
                    ? t("registration.coordsFetching")
                    : t("registration.autoDetected")
                }
                value={farm.longitude}
                editable={false}
              />
            </View>

            {/* Coordinates info banner */}
            {locationFetching ? (
              <View className="flex-row items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-500/20 dark:bg-blue-500/10">
                <Ionicons name="locate-outline" size={16} color="#2563EB" />
                <Text className="flex-1 text-xs text-blue-700 dark:text-blue-300">
                  {t("registration.gpsDetecting")}
                </Text>
              </View>
            ) : !farm.latitude || !farm.longitude ? (
              <View className="flex-row items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/20 dark:bg-amber-500/10">
                <Ionicons name="location-outline" size={16} color="#D97706" />
                <Text className="flex-1 text-xs text-amber-700 dark:text-amber-300">
                  {t("registration.gpsNoCoords")}
                </Text>
              </View>
            ) : (
              <View className="flex-row items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                <Ionicons
                  name="checkmark-circle-outline"
                  size={16}
                  color="#059669"
                />
                <Text className="flex-1 text-xs text-emerald-700 dark:text-emerald-300">
                  {t("registration.gpsSuccess")}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── QR Activation Notice ── */}
        <View className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
          <View className="flex-row items-start gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-500/20">
              <Ionicons name="qr-code-outline" size={20} color="#D97706" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-amber-800 dark:text-amber-300">
                Farm Gate Image Not Required Now
              </Text>
              <Text className="mt-2 text-sm leading-6 text-amber-700 dark:text-amber-200/80">
                Farm Gate image must be captured only after field verification
                and Farm QR activation. At this stage, submit farm details only.
                The pre-printed QR value will become the official Farm ID after
                scanning.
              </Text>
            </View>
          </View>
        </View>

        {/* ── Footer Nav ── */}
        <View className="mt-5 flex-row gap-3">
          <View className="flex-1">
            <View className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#0B1220]">
              <Text className="text-center text-slate-500 dark:text-white/60">
                {t("registration.step1of2")}
              </Text>
            </View>
          </View>

          <View className="flex-1">
            <Pressable
              onPress={handleNext}
              className="rounded-2xl bg-slate-900 px-4 py-3 dark:bg-white"
            >
              <Text className="text-center font-semibold text-white dark:text-slate-900">
                {t("registration.next")}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* ── Location Picker Modal ── */}
      <Modal
        visible={pickerType !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setPickerType(null)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="max-h-[70%] rounded-t-3xl bg-white px-4 pb-6 pt-4 dark:bg-[#0B1220]">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-base font-semibold text-slate-900 dark:text-white">
                {currentPickerTitle}
              </Text>
              <Pressable
                onPress={() => setPickerType(null)}
                className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-white/10"
              >
                <Ionicons name="close" size={20} color="#94A3B8" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {currentPickerItems.length ? (
                currentPickerItems.map((item: any, index: number) => {
                  const label = extractLabel(item);
                  const id = extractId(item);

                  return (
                    <Pressable
                      key={`${id}-${index}`}
                      onPress={() => handlePickerItemPress(item)}
                      className="mb-2 rounded-2xl border border-slate-200 bg-white px-4 py-4 dark:border-white/10 dark:bg-[#111827]"
                    >
                      <Text className="text-sm font-medium text-slate-900 dark:text-white">
                        {label || `Option ${index + 1}`}
                      </Text>
                    </Pressable>
                  );
                })
              ) : (
                <View className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                  <Text className="text-sm text-slate-600 dark:text-white/60">
                    {t("registration.noOptions")}
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
