import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";

import type { RootState } from "../../../src/store/auth/store";
import {
  createCultureCycle,
  fetchFarms,
  fetchPonds,
  type FarmRecord,
  type PondRecord,
} from "../../../src/services/aqua/cultureCycle.service";

const getParamValue = (value: string | string[] | undefined, fallback = "") =>
  Array.isArray(value) ? String(value[0] ?? fallback) : String(value ?? fallback);

function todayDate() {
  return new Date().toISOString().split("T")[0];
}

function futureDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

function sameId(a: any, b: any) {
  if (a === undefined || a === null || b === undefined || b === null) {
    return false;
  }

  return String(a) === String(b);
}

function pickName(...values: any[]) {
  const found = values.find(
    (value) =>
      value !== undefined &&
      value !== null &&
      String(value).trim() !== "",
  );

  return found ? String(found) : "";
}

function pickRawId(...values: any[]) {
  const found = values.find((value) => {
    if (value === undefined || value === null) return false;

    const text = String(value).trim();

    return (
      text !== "" &&
      text !== "0" &&
      text !== "undefined" &&
      text !== "null"
    );
  });

  return found ? String(found).trim() : "";
}

function toNumericUserId(value: any) {
  const raw = String(value ?? "").trim();

  if (!raw) return "";

  // "85" => "85"
  if (/^\d+$/.test(raw)) {
    return String(Number(raw));
  }

  // "OWN-0085" => "85"
  const digits = raw.replace(/\D/g, "");

  if (!digits) return "";

  return String(Number(digits));
}

export default function CreateCultureCycleScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const me = useSelector((state: RootState) => state.me?.me);

  const initialFarmId =
    getParamValue(params.farmDbId) || getParamValue(params.farmId);

  const initialPondId =
    getParamValue(params.pondDbId) || getParamValue(params.pondId);

  const paramUserId = getParamValue(params.userId);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [farms, setFarms] = useState<FarmRecord[]>([]);
  const [ponds, setPonds] = useState<PondRecord[]>([]);

  const [selectedFarmId, setSelectedFarmId] = useState(initialFarmId);
  const [selectedPondId, setSelectedPondId] = useState(initialPondId);

  const [startDate, setStartDate] = useState(todayDate());
  const [endDate, setEndDate] = useState(futureDate(120));
  const [species, setSpecies] = useState("");

  const loginNumericUserId = toNumericUserId(
    pickRawId(
      paramUserId,
      (me as any)?.user_id,
      (me as any)?.id,
      me?.owner_id,
      (me as any)?.owner_code,
    ),
  );

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedFarm = useMemo(() => {
    return farms.find((farm) => sameId(farm.id, selectedFarmId)) || null;
  }, [farms, selectedFarmId]);

  const filteredPonds = useMemo(() => {
    if (!selectedFarmId) return ponds;

    return ponds.filter((pond) => sameId(pond.farm_id, selectedFarmId));
  }, [ponds, selectedFarmId]);

  const selectedPond = useMemo(() => {
    return filteredPonds.find((pond) => sameId(pond.id, selectedPondId)) || null;
  }, [filteredPonds, selectedPondId]);

  const finalUserId = useMemo(() => {
    return toNumericUserId(
      pickRawId(
        (selectedPond as any)?.user_id,
        (selectedFarm as any)?.user_id,
        (selectedFarm as any)?.owner_id,
        paramUserId,
        loginNumericUserId,
        (me as any)?.user_id,
        (me as any)?.id,
        me?.owner_id,
      ),
    );
  }, [selectedPond, selectedFarm, paramUserId, loginNumericUserId, me]);

  useEffect(() => {
    if (!filteredPonds.length) {
      setSelectedPondId("");
      return;
    }

    const exists = filteredPonds.some((pond) => sameId(pond.id, selectedPondId));

    if (!exists) {
      setSelectedPondId(String(filteredPonds[0].id));
    }
  }, [filteredPonds, selectedPondId]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [farmRes, pondRes] = await Promise.all([fetchFarms(), fetchPonds()]);

      if (!farmRes.ok) {
        Alert.alert("Farm Error", farmRes.message);
      }

      if (!pondRes.ok) {
        Alert.alert("Pond Error", pondRes.message);
      }

      const apiFarms = farmRes.data || [];
      const apiPonds = pondRes.data || [];

      const ownFarms = loginNumericUserId
        ? apiFarms.filter((farm: any) => {
            const farmUserId = toNumericUserId(
              pickRawId(farm.user_id, farm.owner_id),
            );

            if (!farmUserId) return true;

            return sameId(farmUserId, loginNumericUserId);
          })
        : apiFarms;

      const ownFarmIds = new Set(
        ownFarms.map((farm: any) => String(farm.id)).filter(Boolean),
      );

      const ownPonds = loginNumericUserId
        ? apiPonds.filter((pond: any) => {
            const pondUserId = toNumericUserId(pickRawId(pond.user_id));

            if (pondUserId && sameId(pondUserId, loginNumericUserId)) {
              return true;
            }

            if (pond.farm_id && ownFarmIds.has(String(pond.farm_id))) {
              return true;
            }

            return !pondUserId && !pond.farm_id;
          })
        : apiPonds;

      setFarms(ownFarms);
      setPonds(ownPonds);

      if (!selectedFarmId && ownFarms[0]?.id) {
        setSelectedFarmId(String(ownFarms[0].id));
      }

      if (!selectedPondId && ownPonds[0]?.id) {
        setSelectedPondId(String(ownPonds[0].id));
      }
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to load farm and pond");
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    if (!finalUserId) {
      Alert.alert(
        "User Missing",
        "Valid numeric user_id is missing. Login user must have numeric user_id or farm/pond must contain user_id.",
      );
      return false;
    }

    if (!selectedFarmId) {
      Alert.alert("Farm Required", "Please select farm.");
      return false;
    }

    if (!selectedPondId) {
      Alert.alert("Pond Required", "Please select pond.");
      return false;
    }

    if (!startDate.trim()) {
      Alert.alert("Start Date Required", "Please enter start date.");
      return false;
    }

    if (!endDate.trim()) {
      Alert.alert("End Date Required", "Please enter end date.");
      return false;
    }

    return true;
  };

  const submitCultureCycle = async () => {
    if (!validate()) return;

    try {
      setSubmitting(true);

      const payload = {
        user_id: Number(finalUserId),
        farm_id: Number(selectedFarmId),
        pond_id: Number(selectedPondId),
        start_date: startDate.trim(),
        end_date: endDate.trim(),
        species: species.trim() || undefined,
        verification_status: "PENDING",
        status: "PENDING",
      };

      console.log("[CULTURE_CYCLE_CREATE_PAYLOAD]", payload);

      const response = await createCultureCycle(payload);

      if (!response.ok || !response.data?.id) {
        Alert.alert("Submission Failed", response.message);
        return;
      }

      const cultureCycleId = String(response.data.id);

      Alert.alert("Culture Cycle Created", response.message, [
        {
          text: "Activate Pond QR",
          onPress: () => {
            router.replace({
              pathname: "/(aqua)/tabs/qr-scanner",
              params: {
                purpose: "POND_ACTIVATION",
                returnTo: "/(aqua)/registration/capture-pond-image",

                cultureCycleId,

                pondDbId: String(selectedPond?.id ?? selectedPondId),
                pondId: String(selectedPond?.id ?? selectedPondId),
                pondName: pickName(
                  selectedPond?.pond_name,
                  selectedPond?.name,
                  "Pond",
                ),

                farmDbId: String(selectedFarm?.id ?? selectedFarmId),
                farmId: String(selectedFarm?.id ?? selectedFarmId),
                farmName: pickName(
                  selectedFarm?.farm_name,
                  selectedFarm?.name,
                  "Farm",
                ),

                userId: String(finalUserId),
              },
            });
          },
        },
        {
          text: "Dashboard",
          onPress: () => router.replace("/(aqua)/tabs/dashboard"),
        },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Culture cycle creation failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-[#F5F7FB] dark:bg-[#050B16]">
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: insets.top + 14,
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 30,
        }}
      >
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => router.replace("/(aqua)/tabs/dashboard")}
            className="h-11 w-11 items-center justify-center rounded-2xl bg-white dark:bg-[#0B1220]"
          >
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </Pressable>

          <View className="flex-1">
            <Text className="text-2xl font-bold text-slate-900 dark:text-white">
              Create Culture Cycle
            </Text>

            <Text className="mt-1 text-sm text-slate-500 dark:text-white/60">
              Uses numeric user_id, farm DB ID and pond DB ID
            </Text>
          </View>
        </View>

        <View className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
          <Text className="text-sm font-bold text-amber-800 dark:text-amber-300">
            Correct ID Rule
          </Text>

          <Text className="mt-2 text-sm leading-6 text-amber-700 dark:text-amber-200/80">
            Culture cycle create API uses backend DB IDs only.{"\n"}
            user_id: {finalUserId || "missing"}{"\n"}
            farm_id: {selectedFarmId || "missing"}{"\n"}
            pond_id: {selectedPondId || "missing"}{"\n\n"}
            Activated QR code will show later in traceability.
          </Text>
        </View>

        {loading ? (
          <View className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-[#0B1220]">
            <ActivityIndicator size="large" color="#60A5FA" />

            <Text className="mt-3 text-center text-sm text-slate-600 dark:text-white/70">
              Loading farms and ponds...
            </Text>
          </View>
        ) : (
          <>
            <Section title="Select Farm">
              {farms.length === 0 ? (
                <EmptyText text="No farm found. Register farm first." />
              ) : (
                farms.map((farm) => {
                  const active = sameId(farm.id, selectedFarmId);

                  return (
                    <SelectableCard
                      key={String(farm.id)}
                      title={pickName(farm.farm_name, farm.name, "Farm")}
                      sub={`DB ID: ${farm.id} • Farm Code: ${
                        farm.farm_id || "Not activated yet"
                      }`}
                      active={active}
                      onPress={() => {
                        setSelectedFarmId(String(farm.id));
                        setSelectedPondId("");
                      }}
                    />
                  );
                })
              )}
            </Section>

            <Section title="Select Pond">
              {filteredPonds.length === 0 ? (
                <EmptyText text="No pond found for selected farm. Register pond first." />
              ) : (
                filteredPonds.map((pond) => {
                  const active = sameId(pond.id, selectedPondId);

                  return (
                    <SelectableCard
                      key={String(pond.id)}
                      title={pickName(pond.pond_name, pond.name, "Pond")}
                      sub={`DB ID: ${pond.id} • Pond Code: ${
                        pond.pond_id || "Not activated yet"
                      }`}
                      active={active}
                      onPress={() => setSelectedPondId(String(pond.id))}
                    />
                  );
                })
              )}
            </Section>

            <Section title="Culture Cycle Details">
              <Input
                label="Start Date"
                value={startDate}
                onChangeText={setStartDate}
                placeholder="YYYY-MM-DD"
              />

              <Input
                label="End Date"
                value={endDate}
                onChangeText={setEndDate}
                placeholder="YYYY-MM-DD"
              />

              <Input
                label="Species"
                value={species}
                onChangeText={setSpecies}
                placeholder="Example: Shrimp / Crab / Fish"
              />

              <View className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                <InfoRow label="Raw User ID" value={pickRawId(paramUserId, me?.owner_id) || "-"} />
                <InfoRow label="Numeric User ID" value={finalUserId || "-"} />
                <InfoRow label="Farm DB ID" value={selectedFarmId || "-"} />
                <InfoRow label="Pond DB ID" value={selectedPondId || "-"} />
              </View>
            </Section>

            <Pressable
              onPress={submitCultureCycle}
              disabled={submitting}
              className={`mt-6 rounded-2xl px-4 py-4 ${
                submitting ? "bg-slate-500" : "bg-slate-900 dark:bg-white"
              }`}
            >
              <Text className="text-center font-bold text-white dark:text-slate-900">
                {submitting ? "Creating..." : "Create Culture Cycle"}
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mt-6">
      <Text className="mb-3 text-base font-bold text-slate-900 dark:text-white">
        {title}
      </Text>

      <View className="gap-3">{children}</View>
    </View>
  );
}

function SelectableCard({
  title,
  sub,
  active,
  onPress,
}: {
  title: string;
  sub: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-2xl border p-4 ${
        active
          ? "border-emerald-300 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10"
          : "border-slate-200 bg-white dark:border-white/10 dark:bg-[#0B1220]"
      }`}
    >
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1">
          <Text className="text-base font-bold text-slate-900 dark:text-white">
            {title}
          </Text>

          <Text className="mt-1 text-sm text-slate-500 dark:text-white/60">
            {sub}
          </Text>
        </View>

        <Ionicons
          name={active ? "checkmark-circle" : "ellipse-outline"}
          size={24}
          color={active ? "#059669" : "#94A3B8"}
        />
      </View>
    </Pressable>
  );
}

function Input({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
}) {
  return (
    <View className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#0B1220]">
      <Text className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-white/50">
        {label}
      </Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        className="text-base font-semibold text-slate-900 dark:text-white"
      />
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between py-1">
      <Text className="text-sm text-slate-500 dark:text-white/60">
        {label}
      </Text>

      <Text className="text-sm font-bold text-slate-900 dark:text-white">
        {value}
      </Text>
    </View>
  );
}

function EmptyText({ text }: { text: string }) {
  return (
    <View className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0B1220]">
      <Text className="text-sm text-slate-500 dark:text-white/60">{text}</Text>
    </View>
  );
}