import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  router,
  useLocalSearchParams,
} from "expo-router";

import {
  Ionicons,
} from "@expo/vector-icons";

import Screen from "../../src/components/centre/Screen";

import {
  getCurrentTransportOperator,
  type CurrentTransportOperator,
} from "../../src/services/transport/currentTransportOperator.service";

import {
  getAquaHarvestLoadingProgress,
  type AquaLoadingProgress,
  type AquaLoadedCrate,
} from "../../src/services/transport/aquaTransportLoading.service";

// ============================================================
// HELPERS
// ============================================================

function firstText(...values: any[]) {
  for (const value of values) {
    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {
      return String(value).trim();
    }
  }

  return "";
}

function display(value: any) {
  return firstText(value) || "-";
}

function formatStatus(value?: string) {
  if (!value) {
    return "-";
  }

  return String(value)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) =>
      c.toUpperCase()
    );
}

function formatDateTime(value?: string) {
  if (!value) {
    return "-";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleString();
}

function clampProgress(value: any) {
  const number =
    Number(value);

  if (
    !Number.isFinite(number)
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      100,
      number
    )
  );
}

// ============================================================
// SCREEN
// ============================================================

export default function AquaTransportProgressScreen() {
  const params =
    useLocalSearchParams<{
      harvestId?:
        | string
        | string[];
    }>();

  const initialHarvestId =
    Array.isArray(
      params.harvestId
    )
      ? params.harvestId[0] ||
        ""
      : params.harvestId ||
        "";

  // ==========================================================
  // OPERATOR
  // ==========================================================

  const [
    operator,
    setOperator,
  ] =
    useState<CurrentTransportOperator | null>(
      null
    );

  const [
    operatorLoading,
    setOperatorLoading,
  ] =
    useState(true);

  // ==========================================================
  // PROGRESS
  // ==========================================================

  const [
    harvestId,
    setHarvestId,
  ] =
    useState(
      initialHarvestId
    );

  const [
    progress,
    setProgress,
  ] =
    useState<AquaLoadingProgress | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  // ==========================================================
  // AUTH ME
  // ==========================================================

  const loadOperator =
    useCallback(async () => {
      try {
        setOperatorLoading(true);

        const response =
          await getCurrentTransportOperator();

        console.log(
          "AQUA PROGRESS AUTH ME:",
          JSON.stringify(response, null, 2)
        );

        if (
          response.ok &&
          response.data
        ) {
          setOperator(
            response.data
          );
        }
      } catch (error) {
        console.log(
          "AQUA PROGRESS AUTH ME ERROR:",
          error
        );
      } finally {
        setOperatorLoading(false);
      }
    }, []);

  useEffect(() => {
    loadOperator();
  }, [loadOperator]);

  // ==========================================================
  // GET PROGRESS
  // ==========================================================

  const loadProgress =
    useCallback(
      async (
        value?: string
      ) => {
        const id =
          String(
            value ||
              harvestId ||
              ""
          ).trim();

        if (!id) {
          setError(
            "Enter Harvest ID."
          );

          setProgress(null);

          return;
        }

        try {
          setLoading(true);

          setError("");

          const response =
            await getAquaHarvestLoadingProgress(
              id
            );

          console.log(
            "AQUA PROGRESS RESPONSE:",
            JSON.stringify(response, null, 2)
          );

          if (!response.ok) {
            throw new Error(
              response.message ||
                "Unable to fetch progress."
            );
          }

          setProgress(
            response.data ||
              null
          );
        } catch (error: any) {
          setProgress(null);

          setError(
            error?.message ||
              "Unable to fetch progress."
          );
        } finally {
          setLoading(false);
        }
      },
      [harvestId]
    );

  // ==========================================================
  // AUTO LOAD AFTER SCAN
  // ==========================================================

  useEffect(() => {
    if (initialHarvestId) {
      setHarvestId(
        initialHarvestId
      );

      loadProgress(
        initialHarvestId
      );
    }
  }, [
    initialHarvestId,
    loadProgress,
  ]);

  // ==========================================================
  // VALUES
  // ==========================================================

  const percentage =
    clampProgress(
      progress?.loading_progress
    );

  const crates:
    AquaLoadedCrate[] =
    Array.isArray(
      progress?.crates
    )
      ? progress!.crates!
      : [];

  const vehicleNumber =
    firstText(
      progress?.vehicle_number,

      operator?.vehicle_no,

      operator?.vehicle_number,

      operator?.vehicleNo
    );

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <Screen>
      <View className="flex-1 bg-[#031225]">
        {/* HEADER */}

        <View className="flex-row items-center bg-[#071a35] px-5 py-5">
          <Pressable
            onPress={() =>
              router.back()
            }
          >
            <Ionicons
              name="arrow-back-circle-outline"
              size={35}
              color="#ffffff"
            />
          </Pressable>

          <View className="ml-4 flex-1">
            <Text className="text-[24px] font-extrabold text-white">
              Harvest Loading Progress
            </Text>

            <Text className="mt-1 text-[13px] text-slate-400">
              Aquaculture Transport
            </Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={
            false
          }
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            padding: 20,
            paddingBottom: 50,
          }}
        >
          {/* LOGGED OPERATOR */}

          <View className="rounded-[24px] border border-slate-800 bg-[#0b172b] p-5">
            <Text className="text-[18px] font-extrabold text-white">
              Logged-in Transport
            </Text>

            {operatorLoading ? (
              <View className="items-center py-6">
                <ActivityIndicator
                  size="large"
                  color="#3b82f6"
                />
              </View>
            ) : (
              <>
                <InfoRow
                  label="Mobile"
                  value={display(
                    operator?.mobile
                  )}
                />

                <InfoRow
                  label="Vehicle No"
                  value={display(
                    operator?.vehicle_no ||
                      operator?.vehicle_number ||
                      operator?.vehicleNo
                  )}
                />

                <InfoRow
                  label="ID"
                  value={display(
                    operator?.operator_rv_id ||
                      operator?.user_id
                  )}
                />

                

                <InfoRow
                  label="Trader ID"
                  value={display(
                    operator?.trader_id ??
                      operator?.traderId
                  )}
                />
              </>
            )}
          </View>

          {/* HARVEST SEARCH */}

          <View className="mt-5 rounded-[24px] border border-slate-800 bg-[#0b172b] p-5">
            <Text className="text-[17px] font-extrabold text-white">
              Harvest ID
            </Text>

            <TextInput
              value={harvestId}
              onChangeText={
                setHarvestId
              }
              keyboardType="number-pad"
              placeholder="Enter Harvest ID"
              placeholderTextColor="#64748b"
              editable={!loading}
              className="mt-4 rounded-[18px] border border-slate-700 bg-[#07101f] p-4 text-white"
            />

            <Pressable
              onPress={() =>
                loadProgress()
              }
              disabled={loading}
              className={`mt-4 items-center rounded-[18px] py-4 ${
                loading
                  ? "bg-slate-700"
                  : "bg-blue-600"
              }`}
            >
              {loading ? (
                <ActivityIndicator
                  color="#ffffff"
                />
              ) : (
                <Text className="font-extrabold text-white">
                  Check Progress
                </Text>
              )}
            </Pressable>
          </View>

          {/* ERROR */}

          {error ? (
            <View className="mt-5 rounded-[20px] border border-red-900 bg-red-950/20 p-4">
              <Text className="text-[13px] font-semibold text-red-300">
                {error}
              </Text>
            </View>
          ) : null}

          {/* RESULT */}

          {!loading &&
          progress ? (
            <>
              {/* PROGRESS */}

              <View className="mt-5 rounded-[26px] border border-blue-900 bg-[#0b172b] p-5">
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-[11px] font-bold uppercase text-slate-400">
                      Harvest
                    </Text>

                    <Text className="mt-1 text-[24px] font-extrabold text-white">
                      #
                      {display(
                        progress.harvest_id
                      )}
                    </Text>
                  </View>

                  <Text className="text-[23px] font-extrabold text-blue-400">
                    {percentage}%
                  </Text>
                </View>

                {/* BAR */}

                <View className="mt-5 h-4 overflow-hidden rounded-full bg-slate-700">
                  <View
                    className="h-full rounded-full bg-blue-500"
                    style={{
                      width: `${percentage}%`,
                    }}
                  />
                </View>

                {/* STATS */}

                <View className="mt-5 flex-row gap-3">
                  <StatBox
                    label="Packed"
                    value={
                      progress.total_packed_crates ??
                      0
                    }
                  />

                  <StatBox
                    label="Loaded"
                    value={
                      progress.loaded_crates ??
                      0
                    }
                  />

                  <StatBox
                    label="Remaining"
                    value={
                      progress.remaining_crates ??
                      0
                    }
                  />
                </View>

                <InfoRow
                  label="Dispatch Status"
                  value={formatStatus(
                    progress.dispatch_status
                  )}
                />
              </View>

              {/* API TRANSPORT DETAILS */}

              <View className="mt-5 rounded-[24px] border border-slate-800 bg-[#0b172b] p-5">
                <Text className="text-[18px] font-extrabold text-white">
                  Loading Transport Details
                </Text>

                <InfoRow
                  label="Vehicle No"
                  value={display(
                    vehicleNumber
                  )}
                />

                <InfoRow
                  label="Trader ID"
                  value={display(
                    progress.trader_id
                  )}
                />

                <InfoRow
                  label="Operator ID"
                  value={display(
                    progress
                      .transport_operator
                      ?.operator_rv_id
                  )}
                />

                <InfoRow
                  label="Operator"
                  value={display(
                    progress
                      .transport_operator
                      ?.full_name
                  )}
                />
              </View>

              {/* CRATES */}

              <View className="mt-7">
                <View className="mb-4 flex-row items-center justify-between">
                  <Text className="text-[20px] font-extrabold text-white">
                    Crates
                  </Text>

                  <View className="rounded-full bg-[#102544] px-4 py-2">
                    <Text className="font-bold text-white">
                      {crates.length}
                    </Text>
                  </View>
                </View>

                {crates.length === 0 ? (
                  <View className="items-center rounded-[24px] border border-slate-800 bg-[#0b172b] py-9">
                    <Ionicons
                      name="cube-outline"
                      size={38}
                      color="#64748b"
                    />

                    <Text className="mt-3 text-slate-400">
                      No crate records
                    </Text>
                  </View>
                ) : (
                  <View className="gap-3">
                    {crates.map(
                      (
                        crate,
                        index
                      ) => (
                        <CrateCard
                          key={
                            crate.crate_packing_id ||
                            `${crate.crate_code}-${index}`
                          }
                          crate={crate}
                        />
                      )
                    )}
                  </View>
                )}
              </View>

              {/* REFRESH */}

              <Pressable
                onPress={() =>
                  loadProgress()
                }
                className="mt-6 flex-row items-center justify-center rounded-[18px] bg-blue-600 py-4"
              >
                <Ionicons
                  name="refresh"
                  size={20}
                  color="#ffffff"
                />

                <Text className="ml-2 font-extrabold text-white">
                  Refresh Progress
                </Text>
              </Pressable>
            </>
          ) : null}
        </ScrollView>
      </View>
    </Screen>
  );
}

// ============================================================
// COMPONENTS
// ============================================================

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View className="mt-3 rounded-[16px] bg-[#102544] p-3">
      <Text className="text-[10px] font-bold uppercase text-slate-400">
        {label}
      </Text>

      <Text className="mt-1 font-extrabold text-white">
        {value}
      </Text>
    </View>
  );
}

function StatBox({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <View className="flex-1 items-center rounded-[18px] bg-[#102544] py-4">
      <Text className="text-[21px] font-extrabold text-white">
        {value}
      </Text>

      <Text className="mt-1 text-[10px] text-slate-400">
        {label}
      </Text>
    </View>
  );
}

function CrateCard({
  crate,
}: {
  crate: AquaLoadedCrate;
}) {
  return (
    <View className="rounded-[22px] border border-slate-800 bg-[#0b172b] p-4">
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="text-[17px] font-extrabold text-white">
            {display(
              crate.crate_code
            )}
          </Text>

          <Text className="mt-1 text-[12px] text-slate-400">
            {display(
              crate.species
            )}
            {" • Grade "}
            {display(
              crate.grade
            )}
          </Text>
        </View>

        <View
          className={`rounded-full px-3 py-2 ${
            crate.loaded
              ? "bg-emerald-950"
              : "bg-slate-800"
          }`}
        >
          <Text
            className={`text-[10px] font-extrabold ${
              crate.loaded
                ? "text-emerald-300"
                : "text-slate-300"
            }`}
          >
            {crate.loaded
              ? "LOADED"
              : formatStatus(
                  crate.packing_status
                )}
          </Text>
        </View>
      </View>

      <InfoRow
        label="Weight"
        value={
          crate.weight_kg !==
          undefined
            ? `${crate.weight_kg} kg`
            : "-"
        }
      />

      <InfoRow
        label="Vehicle"
        value={display(
          crate.vehicle_number
        )}
      />

      <InfoRow
        label="Operator"
        value={display(
          crate.transport_operator_name
        )}
      />

      <InfoRow
        label="Loaded At"
        value={formatDateTime(
          crate.loaded_at
        )}
      />
    </View>
  );
}