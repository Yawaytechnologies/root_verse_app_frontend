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
  selectAquaFarm,
} from "../../../src/features/aqua/registration/registration.selectors";
import {
  setFarmField,
} from "../../../src/features/aqua/registration/registration.slice";

import {
  fetchCountries,
  fetchStatesByCountry,
  fetchDistrictsByState,
  fetchLocationsByDistrict,
} from "../../../src/store/auth/location.slice";

const MOBILE_REGEX = /^\d{10}$/;
const DECIMAL_REGEX = /^-?\d+(\.\d+)?$/;
const INTEGER_REGEX = /^\d+$/;

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

export default function FarmDetailsScreen() {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation();

  const tr = (key: string, fallback: string) => {
    return t(key, { defaultValue: fallback });
  };

  const farm = useSelector(selectAquaFarm);

  const me = useSelector((state: any) => state.me?.me);
  const ownerId = String(me?.owner_id ?? me?.id ?? me?.user_id ?? "");

  const [locationFetching, setLocationFetching] = useState(false);
  const [pickerType, setPickerType] = useState<PickerType>(null);

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

  useEffect(() => {
    if (ownerId) {
      dispatch(setFarmField({ key: "ownerId", value: ownerId }));
    }
  }, [dispatch, ownerId]);

  useEffect(() => {
    if (!(farm as any).technicianName) {
      dispatch(
        setFarmField({
          key: "technicianName" as any,
          value: "Sriram D",
        }),
      );
    }

    if (!(farm as any).technicianMobileNumber) {
      dispatch(
        setFarmField({
          key: "technicianMobileNumber" as any,
          value: "6374484558",
        }),
      );
    }
  }, [
    dispatch,
    (farm as any).technicianName,
    (farm as any).technicianMobileNumber,
  ]);

  useEffect(() => {
    if (farm.latitude && farm.longitude) return;

    let cancelled = false;

    const fetchCoords = async () => {
      setLocationFetching(true);

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== "granted") {
          Alert.alert(
            tr("registration.locationPermission", "Location Permission"),
            tr(
              "registration.locationPermissionDesc",
              "Location access is needed to auto-fill farm coordinates.",
            ),
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
          Alert.alert(
            tr("registration.locationError", "Location Error"),
            tr(
              "registration.locationErrorDesc",
              "Could not fetch device coordinates.",
            ),
          );
        }
      } finally {
        if (!cancelled) setLocationFetching(false);
      }
    };

    fetchCoords();

    return () => {
      cancelled = true;
    };
  }, [dispatch, farm.latitude, farm.longitude]);

  useEffect(() => {
    dispatch(fetchCountries());
  }, [dispatch]);

  const currentPickerTitle = useMemo(() => {
    if (pickerType === "country") {
      return tr("registration.selectCountry", "Select Country");
    }

    if (pickerType === "state") {
      return tr("registration.selectState", "Select State");
    }

    if (pickerType === "district") {
      return tr("registration.selectDistrict", "Select District");
    }

    if (pickerType === "location") {
      return tr("registration.selectLocation", "Select Location");
    }

    return tr("registration.select", "Select");
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
    if (!farm.farmName.trim()) {
      Alert.alert("Validation", "Please enter farm name");
      return;
    }

    if (!farm.farmAddress.trim()) {
      Alert.alert("Validation", "Please enter farm address");
      return;
    }

    if (!String((farm as any).technicianName ?? "").trim()) {
      Alert.alert("Validation", "Please enter technician name");
      return;
    }

    if (!String((farm as any).technicianMobileNumber ?? "").trim()) {
      Alert.alert("Validation", "Please enter technician mobile number");
      return;
    }

    if (
      !MOBILE_REGEX.test(String((farm as any).technicianMobileNumber ?? ""))
    ) {
      Alert.alert(
        "Validation",
        "Technician mobile number must be exactly 10 digits",
      );
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
        keyboardShouldPersistTaps="handled"
      >
        <View className="rounded-2xl border border-slate-900 bg-slate-900 p-5 dark:border-white/10 dark:bg-[#0B1220]">
          <View className="flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
              <Ionicons name="business-outline" size={20} color="#60A5FA" />
            </View>

            <View className="flex-1">
              <Text className="text-[11px] uppercase tracking-wide text-white opacity-80">
                {tr("registration.farmRegistrationHeader", "Farm Registration")}
              </Text>

              <Text className="mt-1 text-lg font-bold text-white">
                {tr(
                  "registration.farmRegistrationSubheader",
                  "Farm and pond details",
                )}
              </Text>
            </View>
          </View>
        </View>

        <View className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0B1220]">
          <Text className="text-base font-semibold text-slate-900 dark:text-white">
            {tr("registration.farmSection", "Farm Details")}
          </Text>

          <View className="mt-4 gap-4">
            <Field
              label={tr("registration.farmName", "Farm Name")}
              placeholder={tr(
                "registration.farmNamePlaceholder",
                "Example: RootVerse Aquaculture Farms",
              )}
              value={farm.farmName}
              onChangeText={(text) =>
                dispatch(setFarmField({ key: "farmName", value: text }))
              }
            />

            <Field
              label={tr("registration.farmAddress", "Address")}
              placeholder={tr(
                "registration.farmAddressPlaceholder",
                "Enter full farm address",
              )}
              value={farm.farmAddress}
              onChangeText={(text) =>
                dispatch(setFarmField({ key: "farmAddress", value: text }))
              }
              multiline
            />

            <View className="rounded-2xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-500/20 dark:bg-blue-500/10">
              <Text className="mb-3 text-base font-semibold text-blue-900 dark:text-blue-200">
                {tr("registration.technician", "Technician")}
              </Text>

              <View className="flex-row gap-3">
                <Field
                  label={tr(
                    "registration.technicianName",
                    "Technician Name",
                  )}
                  placeholder={tr(
                    "registration.technicianNamePlaceholder",
                    "Example: Sriram D",
                  )}
                  value={(farm as any).technicianName ?? "Sriram D"}
                  onChangeText={(text) =>
                    dispatch(
                      setFarmField({
                        key: "technicianName" as any,
                        value: text,
                      }),
                    )
                  }
                />

                <Field
                  label={tr(
                    "registration.technicianMobileNumber",
                    "Technician Mobile Number",
                  )}
                  placeholder={tr(
                    "registration.technicianMobilePlaceholder",
                    "Example: 6374484558",
                  )}
                  value={
                    (farm as any).technicianMobileNumber ?? "6374484558"
                  }
                  onChangeText={(text) =>
                    dispatch(
                      setFarmField({
                        key: "technicianMobileNumber" as any,
                        value: text.replace(/\D/g, "").slice(0, 10),
                      }),
                    )
                  }
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View className="flex-row gap-3">
              <SelectField
                label={tr("registration.country", "Country")}
                value={farm.countryName}
                placeholder={
                  countriesLoading
                    ? tr("registration.loading", "Loading...")
                    : tr("registration.selectCountry", "Select Country")
                }
                onPress={() => setPickerType("country")}
                disabled={countriesLoading}
              />

              <SelectField
                label={tr("registration.state", "State")}
                value={farm.stateName}
                placeholder={
                  statesLoading
                    ? tr("registration.loading", "Loading...")
                    : tr("registration.selectState", "Select State")
                }
                onPress={() => setPickerType("state")}
                disabled={!farm.countryId || statesLoading}
                helperText={
                  !farm.countryId
                    ? tr(
                        "registration.selectCountryFirst",
                        "Select country first",
                      )
                    : undefined
                }
              />
            </View>

            <View className="flex-row gap-3">
              <SelectField
                label={tr("registration.district", "District")}
                value={farm.district}
                placeholder={
                  districtsLoading
                    ? tr("registration.loading", "Loading...")
                    : tr("registration.selectDistrict", "Select District")
                }
                onPress={() => setPickerType("district")}
                disabled={!farm.stateId || districtsLoading}
                helperText={
                  !farm.stateId
                    ? tr("registration.selectStateFirst", "Select state first")
                    : undefined
                }
              />

              <SelectField
                label={tr("registration.location", "Location")}
                value={farm.locationName}
                placeholder={
                  locationsLoading
                    ? tr("registration.loading", "Loading...")
                    : tr("registration.selectLocation", "Select Location")
                }
                onPress={() => setPickerType("location")}
                disabled={!farm.districtId || locationsLoading}
                helperText={
                  !farm.districtId
                    ? tr(
                        "registration.selectDistrictFirst",
                        "Select district first",
                      )
                    : undefined
                }
              />
            </View>

            <Field
              label={tr("registration.waterSource", "Water Source")}
              placeholder={tr(
                "registration.waterSourcePlaceholder",
                "Example: Fresh Water / Vellayar",
              )}
              value={farm.waterSource}
              onChangeText={(text) =>
                dispatch(setFarmField({ key: "waterSource", value: text }))
              }
            />

            <View className="flex-row gap-3">
              <Field
                label={tr("registration.pondCount", "Pond Count")}
                placeholder={tr(
                  "registration.pondCountPlaceholder",
                  "Example: 2",
                )}
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
                label={tr("registration.farmArea", "Farm Area")}
                placeholder={tr(
                  "registration.farmAreaPlaceholder",
                  "Example: 4.2",
                )}
                value={farm.farmArea}
                onChangeText={(text) =>
                  dispatch(setFarmField({ key: "farmArea", value: text }))
                }
                keyboardType="numeric"
              />
            </View>

            <View className="flex-row gap-3">
              <Field
                label={tr("registration.latitude", "Latitude")}
                placeholder={
                  locationFetching
                    ? tr("registration.coordsFetching", "Fetching...")
                    : tr("registration.autoDetected", "Auto detected")
                }
                value={farm.latitude}
                editable={false}
              />

              <Field
                label={tr("registration.longitude", "Longitude")}
                placeholder={
                  locationFetching
                    ? tr("registration.coordsFetching", "Fetching...")
                    : tr("registration.autoDetected", "Auto detected")
                }
                value={farm.longitude}
                editable={false}
              />
            </View>

            {locationFetching ? (
              <View className="flex-row items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-500/20 dark:bg-blue-500/10">
                <Ionicons name="locate-outline" size={16} color="#2563EB" />
                <Text className="flex-1 text-xs text-blue-700 dark:text-blue-300">
                  {tr(
                    "registration.gpsDetecting",
                    "Detecting GPS location...",
                  )}
                </Text>
              </View>
            ) : !farm.latitude || !farm.longitude ? (
              <View className="flex-row items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/20 dark:bg-amber-500/10">
                <Ionicons name="location-outline" size={16} color="#D97706" />
                <Text className="flex-1 text-xs text-amber-700 dark:text-amber-300">
                  {tr(
                    "registration.gpsNoCoords",
                    "GPS coordinates are not available yet.",
                  )}
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
                  {tr(
                    "registration.gpsSuccess",
                    "GPS captured successfully.",
                  )}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
          <View className="flex-row items-start gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-500/20">
              <Ionicons name="qr-code-outline" size={20} color="#D97706" />
            </View>

            <View className="flex-1">
              <Text className="text-base font-semibold text-amber-800 dark:text-amber-300">
                {tr(
                  "registration.farmIdPrePrintedQr",
                  "Farm ID: Pre-printed QR Linking",
                )}
              </Text>

              <Text className="mt-2 text-sm leading-6 text-amber-700 dark:text-amber-200/80">
                {tr(
                  "registration.farmIdPrePrintedQrDesc",
                  "Do not enter Farm ID manually. The official Farm ID will be activated later by scanning the pre-printed Farm Gate QR.",
                )}
              </Text>
            </View>
          </View>
        </View>

        <View className="mt-5 flex-row gap-3">
          <View className="flex-1">
            <View className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#0B1220]">
              <Text className="text-center text-slate-500 dark:text-white/60">
                {tr("registration.step1of2", "Step 1 of 2")}
              </Text>
            </View>
          </View>

          <View className="flex-1">
            <Pressable
              onPress={handleNext}
              className="rounded-2xl bg-slate-900 px-4 py-3 dark:bg-white"
            >
              <Text className="text-center font-semibold text-white dark:text-slate-900">
                {tr("registration.next", "Next")}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

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
                    {tr("registration.noOptions", "No options found")}
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
