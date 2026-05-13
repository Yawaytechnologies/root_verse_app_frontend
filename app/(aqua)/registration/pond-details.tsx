import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";

import type { AppDispatch } from "../../../src/store/auth/store";
import type { AquaPondData } from "../../../src/types/aqua";
import { selectAquaRegistration } from "../../../src/features/aqua/registration/registration.selectors";
import {
  addPond,
  removePond,
  setPondField,
} from "../../../src/features/aqua/registration/registration.slice";

const POND_TYPES = ["Earthen", "HDPE", "Concrete"];

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

function TypeButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 rounded-2xl border px-3 py-3 ${
        active
          ? "border-emerald-300 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10"
          : "border-slate-200 bg-white dark:border-white/10 dark:bg-[#0B1220]"
      }`}
    >
      <Text
        className={`text-center text-sm font-semibold ${
          active
            ? "text-emerald-700 dark:text-emerald-300"
            : "text-slate-700 dark:text-white/70"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function PondDetailsScreen() {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation();

  const registration = useSelector(selectAquaRegistration);
  const { farm, ponds } = registration;

  const [gpsLat, setGpsLat] = useState("");
  const [gpsLng, setGpsLng] = useState("");
  const [gpsLoading, setGpsLoading] = useState(false);

  useEffect(() => {
    if (ponds.length === 0) {
      dispatch(addPond());
    }
  }, [dispatch, ponds.length]);

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

        setGpsLat(String(pos.coords.latitude));
        setGpsLng(String(pos.coords.longitude));
      } catch {
        if (!cancelled) {
          Alert.alert("Location Error", "Could not fetch pond coordinates.");
        }
      } finally {
        if (!cancelled) setGpsLoading(false);
      }
    };

    fetchCoords();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!gpsLat || !gpsLng) return;

    ponds.forEach((pond, index) => {
      if (!pond.gpsLat) {
        dispatch(setPondField({ index, key: "gpsLat", value: gpsLat }));
      }

      if (!pond.gpsLng) {
        dispatch(setPondField({ index, key: "gpsLng", value: gpsLng }));
      }
    });
  }, [dispatch, gpsLat, gpsLng, ponds]);

  const validatePonds = () => {
    if (!farm.farmName?.trim()) {
      Alert.alert(
        "Farm Details Missing",
        "Please complete farm details before pond registration.",
      );
      return false;
    }

    if (!ponds.length) {
      Alert.alert("Validation", "Please add at least one pond.");
      return false;
    }

    for (let i = 0; i < ponds.length; i += 1) {
      const pond = ponds[i];

      if (!pond.pondName.trim()) {
        Alert.alert("Validation", `Please enter pond name for Pond ${i + 1}`);
        return false;
      }

      if (!String((pond as any).pondType ?? "").trim()) {
        Alert.alert("Validation", `Please select pond type for Pond ${i + 1}`);
        return false;
      }

      if (!pond.pondArea.trim()) {
        Alert.alert("Validation", `Please enter pond area for Pond ${i + 1}`);
        return false;
      }

      const area = Number(pond.pondArea);

      if (!Number.isFinite(area) || area <= 0) {
        Alert.alert("Validation", `Enter valid pond area for Pond ${i + 1}`);
        return false;
      }

      if (!String((pond as any).volume ?? "").trim()) {
        Alert.alert("Validation", `Please enter volume for Pond ${i + 1}`);
        return false;
      }

      const volume = Number((pond as any).volume);

      if (!Number.isFinite(volume) || volume <= 0) {
        Alert.alert("Validation", `Enter valid volume for Pond ${i + 1}`);
        return false;
      }

      const lat = pond.gpsLat || gpsLat || farm.latitude;
      const lng = pond.gpsLng || gpsLng || farm.longitude;

      if (!lat || !lng) {
        Alert.alert("Validation", `GPS coordinates missing for Pond ${i + 1}`);
        return false;
      }
    }

    return true;
  };

  const handleNext = () => {
    if (!validatePonds()) return;

    const cleanPonds = ponds.map((pond, index) => ({
      ...pond,
      id: pond.id || `pond-${index + 1}`,
      pondType: String((pond as any).pondType || "Earthen"),
      volume: String((pond as any).volume || ""),
      gpsLat: pond.gpsLat || gpsLat || farm.latitude || "",
      gpsLng: pond.gpsLng || gpsLng || farm.longitude || "",
      pondImageCaptured: false,
      pondImageUri: "",
    }));

    router.push({
      pathname: "/(aqua)/registration/review-submit",
      params: {
        pondsJson: JSON.stringify(cleanPonds),
      },
    });
  };

  const addNewPond = () => {
    dispatch(addPond());

    const newIndex = ponds.length;

    if (gpsLat && gpsLng) {
      setTimeout(() => {
        dispatch(
          setPondField({
            index: newIndex,
            key: "gpsLat",
            value: gpsLat,
          }),
        );

        dispatch(
          setPondField({
            index: newIndex,
            key: "gpsLng",
            value: gpsLng,
          }),
        );
      }, 0);
    }
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
                {t("registration.addPondDetails")}
              </Text>
            </View>
          </View>
        </View>

        <View className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
          <View className="flex-row items-start gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-500/20">
              <Ionicons name="qr-code-outline" size={20} color="#D97706" />
            </View>

            <View className="flex-1">
              <Text className="text-base font-semibold text-amber-800 dark:text-amber-300">
                {t("registration.pondIdQrLinking")}
              </Text>

              <Text className="mt-2 text-sm leading-6 text-amber-700 dark:text-amber-200/80">
                {t("registration.pondIdQrLinkingDesc")}
              </Text>
            </View>
          </View>
        </View>

        <View className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
          <Text className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
            Linked Farm
          </Text>

          <Text className="mt-2 text-sm leading-6 text-emerald-700 dark:text-emerald-200/80">
            Farm Name: {farm.farmName || "-"}
            {"\n"}
            Farm Official ID: Not activated yet
            {"\n"}
            Submit Flow: Farm and ponds will be submitted together
          </Text>
        </View>

        <View className="mt-5 gap-4">
          {ponds.map((pond: AquaPondData, index: number) => {
            const lat = pond.gpsLat || gpsLat || farm.latitude || "";
            const lng = pond.gpsLng || gpsLng || farm.longitude || "";

            return (
              <View
                key={pond.id || `pond-${index + 1}`}
                className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0B1220]"
              >
                <View className="mb-4 flex-row items-center justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="text-base font-semibold text-slate-900 dark:text-white">
                      {t("registration.pondDetails")} {index + 1}
                    </Text>

                    <Text className="text-xs text-slate-400 dark:text-white/40">
                      {t("registration.officialPondIdPending")}
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
                  <View className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
                    <Text className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                      {t("registration.pondIdQrLinking")}
                    </Text>

                    <Text className="mt-2 text-sm leading-6 text-amber-700 dark:text-amber-200/80">
                      {t("registration.officialPondIdPending")}
                    </Text>
                  </View>

                  <Field
                    label={t("registration.pondName")}
                    placeholder={t("registration.pondNamePlaceholder")}
                    value={pond.pondName}
                    onChangeText={(text) =>
                      dispatch(
                        setPondField({
                          index,
                          key: "pondName",
                          value: text,
                        }),
                      )
                    }
                  />

                  <View className="gap-2">
                    <Text className="text-sm font-medium text-slate-900 dark:text-white">
                      {t("registration.pondType")}
                    </Text>

                    <View className="flex-row gap-2">
                      {POND_TYPES.map((type) => (
                        <TypeButton
                          key={type}
                          label={
                            type === "Earthen"
                              ? t("registration.pondTypeEarthen")
                              : type === "HDPE"
                                ? t("registration.pondTypeHdpe")
                                : t("registration.pondTypeConcrete")
                          }
                          active={String((pond as any).pondType || "Earthen") === type}
                          onPress={() =>
                            dispatch(
                              setPondField({
                                index,
                                key: "pondType" as any,
                                value: type,
                              }),
                            )
                          }
                        />
                      ))}
                    </View>
                  </View>

                  <View className="flex-row gap-3">
                    <Field
                      label={t("registration.waterSpreadAreaAcres")}
                      placeholder={t("registration.pondAreaPlaceholder")}
                      value={pond.pondArea}
                      onChangeText={(text) =>
                        dispatch(
                          setPondField({
                            index,
                            key: "pondArea",
                            value: text.replace(/[^0-9.]/g, ""),
                          }),
                        )
                      }
                      keyboardType="numeric"
                    />

                    <Field
                      label={t("registration.volumeCubicMeter")}
                      placeholder="7500"
                      value={String((pond as any).volume ?? "")}
                      onChangeText={(text) =>
                        dispatch(
                          setPondField({
                            index,
                            key: "volume" as any,
                            value: text.replace(/[^0-9.]/g, ""),
                          }),
                        )
                      }
                      keyboardType="numeric"
                    />
                  </View>

                  <View className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                    <Text className="text-sm font-semibold text-slate-900 dark:text-white">
                      {t("registration.pondGpsMap")}
                    </Text>

                    <Text className="mt-2 text-sm leading-6 text-slate-600 dark:text-white/60">
                      {lat && lng
                        ? `https://maps.google.com/?q=${lat},${lng}`
                        : t("registration.gpsFetching")}
                    </Text>
                  </View>

                  <View className="flex-row gap-3">
                    <View className="flex-1 gap-2">
                      <Text className="text-sm font-medium text-slate-900 dark:text-white">
                        {t("registration.latitude")}
                      </Text>

                      <View className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                        <Text className="text-sm text-slate-700 dark:text-white/80">
                          {lat || latDisplay}
                        </Text>
                      </View>
                    </View>

                    <View className="flex-1 gap-2">
                      <Text className="text-sm font-medium text-slate-900 dark:text-white">
                        {t("registration.longitude")}
                      </Text>

                      <View className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                        <Text className="text-sm text-slate-700 dark:text-white/80">
                          {lng || lngDisplay}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {gpsLoading ? (
                    <View className="flex-row items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-500/20 dark:bg-blue-500/10">
                      <ActivityIndicator size="small" color="#2563EB" />

                      <Text className="flex-1 text-xs text-blue-700 dark:text-blue-300">
                        {t("registration.gpsFetching")}
                      </Text>
                    </View>
                  ) : lat && lng ? (
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
                  ) : (
                    <View className="flex-row items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/20 dark:bg-amber-500/10">
                      <Ionicons
                        name="location-outline"
                        size={16}
                        color="#D97706"
                      />

                      <Text className="flex-1 text-xs text-amber-700 dark:text-amber-300">
                        {t("registration.gpsRequired")}
                      </Text>
                    </View>
                  )}

                  <View className="rounded-2xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-500/20 dark:bg-sky-500/10">
                    <View className="flex-row items-start gap-3">
                      <Ionicons
                        name="camera-outline"
                        size={20}
                        color="#2563EB"
                      />

                      <View className="flex-1">
                        <Text className="font-medium text-sky-800 dark:text-sky-300">
                          {t("registration.pondImageLater")}
                        </Text>

                        <Text className="mt-1 text-sm leading-6 text-sky-700 dark:text-sky-200/80">
                          {t("registration.pondImageLaterDesc")}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        <Pressable
          onPress={addNewPond}
          className="mt-5 rounded-2xl border border-dashed border-slate-400 bg-white px-4 py-4 dark:border-white/20 dark:bg-[#0B1220]"
        >
          <Text className="text-center font-semibold text-slate-900 dark:text-white">
            {t("registration.addAnotherPond")}
          </Text>
        </Pressable>

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
              className="rounded-2xl bg-slate-900 px-4 py-3 dark:bg-white"
            >
              <Text className="text-center font-semibold text-white dark:text-slate-900">
                {t("registration.reviewSubmit")}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </>
  );
}
