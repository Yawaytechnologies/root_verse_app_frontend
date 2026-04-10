import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { PackedCrateItem } from "../../utils/cratePackerStorage";
import { isSameYMD, fmtDMY } from "./helpers/date";
import CalendarModal from "./CalendarModal";

const SURFACE = "rgba(255,255,255,0.06)";
const BORDER = "rgba(255,255,255,0.12)";

function normCode(raw: any) {
  return String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function safeItems(payload: any): any[] {
  const arr = payload?.items;
  return Array.isArray(arr) ? arr : [];
}

function getCrateGrade(payload: any) {
  const v = payload?.crate_grade ?? payload?.crateGrade ?? payload?.grade ?? "";
  const s = String(v || "").trim().toUpperCase();
  return s || "-";
}

function getTotalKg(payload: any) {
  const v =
    payload?.total_weight_kg ??
    payload?.totalWeightKg ??
    payload?.total_kg ??
    "";
  const n = Number(v);
  if (!Number.isFinite(n)) return "-";
  return String(Number(n.toFixed(2)));
}

function formatDisplayDate(value: any) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return fmtDMY(d);
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toYmdLocal(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export default function PackedCratesScreen({
  packed,
  selectedDateISO,
  setSelectedDateISO,
}: {
  packed: PackedCrateItem[];
  selectedDateISO: string;
  setSelectedDateISO: (iso: string) => void;
}) {
  const [calOpen, setCalOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const list = useMemo(
    () => packed.filter((x) => isSameYMD(x.packed_at, selectedDateISO)),
    [packed, selectedDateISO]
  );

  const markedDays = useMemo(() => {
    const out: Record<string, number> = {};

    for (const row of packed) {
      const d = new Date(row.packed_at);
      if (Number.isNaN(d.getTime())) continue;

      const ymd = toYmdLocal(d.getTime());
      out[ymd] = (out[ymd] || 0) + 1;
    }

    return out;
  }, [packed]);

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <Text style={{ color: "white", fontSize: 18, fontWeight: "900" }}>
          Packed Crates
        </Text>

        <Pressable
          onPress={() => setCalOpen(true)}
          style={{
            paddingVertical: 10,
            paddingHorizontal: 14,
            borderRadius: 999,
            backgroundColor: "rgba(255,255,255,0.08)",
            borderWidth: 1,
            borderColor: BORDER,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Ionicons name="calendar-outline" size={16} color="white" />
          <Text style={{ color: "white", fontWeight: "900" }}>
            {fmtDMY(new Date(selectedDateISO))}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {list.length === 0 ? (
          <View
            style={{
              marginTop: 20,
              backgroundColor: SURFACE,
              borderWidth: 1,
              borderColor: BORDER,
              borderRadius: 18,
              padding: 16,
            }}
          >
            <Text style={{ color: "white", fontWeight: "900" }}>
              No packed crates
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: 6 }}>
              Pack a crate from Scan tab to see it here.
            </Text>
          </View>
        ) : (
          list.map((item) => {
            const expanded = openId === item.id;

            const payload = item.payload || {};
            const items = safeItems(payload);

            const fishCount =
              (Array.isArray(item.fish_qrs) && item.fish_qrs.length) ||
              items.length ||
              0;

            const crateGrade = getCrateGrade(payload);
            const totalKg = getTotalKg(payload);

            const hasItemsArray = Array.isArray(payload?.items);

            return (
              <View
                key={item.id}
                style={{
                  marginBottom: 12,
                  backgroundColor: SURFACE,
                  borderWidth: 1,
                  borderColor: BORDER,
                  borderRadius: 18,
                  padding: 14,
                }}
              >
                <Pressable onPress={() => setOpenId(expanded ? null : item.id)}>
                  <Text style={{ color: "white", fontWeight: "900" }}>
                    {normCode(item.code)}
                  </Text>

                  <Text
                    style={{ color: "rgba(255,255,255,0.75)", marginTop: 6 }}
                  >
                    Packed at: {new Date(item.packed_at).toLocaleString()}
                  </Text>

                  <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                    <View
                      style={{
                        flex: 1,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: "rgba(255,255,255,0.10)",
                        backgroundColor: "rgba(0,0,0,0.20)",
                        padding: 10,
                      }}
                    >
                      <Text
                        style={{
                          color: "rgba(255,255,255,0.65)",
                          fontWeight: "900",
                          fontSize: 11,
                        }}
                      >
                        Crate Grade
                      </Text>
                      <Text
                        style={{
                          color: "white",
                          fontWeight: "900",
                          marginTop: 4,
                        }}
                      >
                        {crateGrade}
                      </Text>
                    </View>

                    <View
                      style={{
                        flex: 1,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: "rgba(255,255,255,0.10)",
                        backgroundColor: "rgba(0,0,0,0.20)",
                        padding: 10,
                      }}
                    >
                      <Text
                        style={{
                          color: "rgba(255,255,255,0.65)",
                          fontWeight: "900",
                          fontSize: 11,
                        }}
                      >
                        Total (kg)
                      </Text>
                      <Text
                        style={{
                          color: "white",
                          fontWeight: "900",
                          marginTop: 4,
                        }}
                      >
                        {totalKg}
                      </Text>
                    </View>

                    <View
                      style={{
                        width: 90,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: "rgba(255,255,255,0.10)",
                        backgroundColor: "rgba(0,0,0,0.20)",
                        padding: 10,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        style={{
                          color: "rgba(255,255,255,0.65)",
                          fontWeight: "900",
                          fontSize: 11,
                        }}
                      >
                        Fish
                      </Text>
                      <Text
                        style={{
                          color: "white",
                          fontWeight: "900",
                          marginTop: 4,
                        }}
                      >
                        {fishCount}
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={{
                      color: "rgba(255,255,255,0.6)",
                      marginTop: 10,
                      fontWeight: "800",
                    }}
                  >
                    Tap to {expanded ? "hide details ▲" : "view details ▼"}
                  </Text>
                </Pressable>

                {expanded ? (
                  <View
                    style={{
                      marginTop: 12,
                      borderTopWidth: 1,
                      borderTopColor: "rgba(255,255,255,0.08)",
                      paddingTop: 12,
                    }}
                  >
                    <Text style={{ color: "rgba(255,255,255,0.75)" }}>
                      Packer: {item.packer_name}
                    </Text>
                    <Text
                      style={{
                        color: "rgba(255,255,255,0.75)",
                        marginTop: 4,
                      }}
                    >
                      Division: {item.division}
                    </Text>

                    {!hasItemsArray ? (
                      <View
                        style={{
                          marginTop: 12,
                          borderRadius: 14,
                          borderWidth: 1,
                          borderColor: "rgba(251,191,36,0.25)",
                          backgroundColor: "rgba(251,191,36,0.10)",
                          padding: 12,
                        }}
                      >
                        <Text
                          style={{
                            color: "rgba(251,191,36,0.95)",
                            fontWeight: "900",
                          }}
                        >
                          Details not saved locally for this record.
                        </Text>
                      </View>
                    ) : null}

                    <View style={{ marginTop: 12 }}>
                      <Text style={{ color: "white", fontWeight: "900" }}>
                        Fish Details
                      </Text>

                      {items.length === 0 ? (
                        <Text
                          style={{
                            color: "rgba(255,255,255,0.65)",
                            marginTop: 6,
                          }}
                        >
                          No fish items stored for this record.
                        </Text>
                      ) : (
                        <View style={{ marginTop: 8, gap: 10 }}>
                          {items.map((it: any, idx: number) => {
                            const fishCode =
                              it?.fish_code ??
                              it?.fishCode ??
                              it?.fish_qr ??
                              it?.fishQr ??
                              "-";

                            const species =
                              it?.species ?? it?.speciesName ?? "-";
                            const kg =
                              it?.weight_kg ?? it?.weightKg ?? "-";
                            const qc =
                              it?.qc_grade ?? it?.qcGrade ?? it?.grade ?? "-";

                            const catchDate =
                              it?.catch_date ??
                              it?.catchDate ??
                              it?.catch_at ??
                              it?.catchAt ??
                              "-";

                            const landDate =
                              it?.landed_date ??
                              it?.landedDate ??
                              it?.land_date ??
                              it?.landDate ??
                              it?.landing_date ??
                              it?.landingDate ??
                              "-";

                            const method =
                              it?.method_code ??
                              it?.methodCode ??
                              it?.catch_method ??
                              it?.catchMethod ??
                              it?.method ??
                              "-";

                            return (
                              <View
                                key={`${item.id}_${idx}`}
                                style={{
                                  borderRadius: 14,
                                  borderWidth: 1,
                                  borderColor: "rgba(255,255,255,0.10)",
                                  backgroundColor: "rgba(0,0,0,0.18)",
                                  padding: 10,
                                }}
                              >
                                <Text
                                  style={{ color: "white", fontWeight: "900" }}
                                  numberOfLines={1}
                                >
                                  {normCode(fishCode)}
                                </Text>

                                <View
                                  style={{
                                    flexDirection: "row",
                                    gap: 10,
                                    marginTop: 8,
                                  }}
                                >
                                  <View style={{ flex: 1 }}>
                                    <Text
                                      style={{
                                        color: "rgba(255,255,255,0.60)",
                                        fontWeight: "900",
                                        fontSize: 11,
                                      }}
                                    >
                                      Species
                                    </Text>
                                    <Text
                                      style={{
                                        color: "rgba(255,255,255,0.85)",
                                        fontWeight: "800",
                                        marginTop: 3,
                                      }}
                                      numberOfLines={1}
                                    >
                                      {String(species)}
                                    </Text>
                                  </View>

                                  <View style={{ flex: 1 }}>
                                    <Text
                                      style={{
                                        color: "rgba(255,255,255,0.60)",
                                        fontWeight: "900",
                                        fontSize: 11,
                                        textAlign: "center",
                                      }}
                                    >
                                      QC
                                    </Text>
                                    <Text
                                      style={{
                                        color: "rgba(255,255,255,0.85)",
                                        fontWeight: "900",
                                        marginTop: 3,
                                        textAlign: "center",
                                      }}
                                      numberOfLines={1}
                                    >
                                      {String(qc)}
                                    </Text>
                                  </View>

                                  <View style={{ flex: 1 }}>
                                    <Text
                                      style={{
                                        color: "rgba(255,255,255,0.60)",
                                        fontWeight: "900",
                                        fontSize: 11,
                                        textAlign: "center",
                                      }}
                                    >
                                      Kg
                                    </Text>
                                    <Text
                                      style={{
                                        color: "rgba(255,255,255,0.85)",
                                        fontWeight: "900",
                                        marginTop: 3,
                                        textAlign: "center",
                                      }}
                                      numberOfLines={1}
                                    >
                                      {String(kg)}
                                    </Text>
                                  </View>
                                </View>

                                <View
                                  style={{
                                    flexDirection: "row",
                                    gap: 10,
                                    marginTop: 12,
                                  }}
                                >
                                  <View style={{ flex: 1 }}>
                                    <Text
                                      style={{
                                        color: "rgba(255,255,255,0.60)",
                                        fontWeight: "900",
                                        fontSize: 11,
                                      }}
                                    >
                                      Catch Date
                                    </Text>
                                    <Text
                                      style={{
                                        color: "rgba(255,255,255,0.85)",
                                        fontWeight: "800",
                                        marginTop: 3,
                                      }}
                                      numberOfLines={1}
                                    >
                                      {formatDisplayDate(catchDate)}
                                    </Text>
                                  </View>

                                  <View style={{ flex: 1 }}>
                                    <Text
                                      style={{
                                        color: "rgba(255,255,255,0.60)",
                                        fontWeight: "900",
                                        fontSize: 11,
                                        textAlign: "center",
                                      }}
                                    >
                                      Land Date
                                    </Text>
                                    <Text
                                      style={{
                                        color: "rgba(255,255,255,0.85)",
                                        fontWeight: "800",
                                        marginTop: 3,
                                        textAlign: "center",
                                      }}
                                      numberOfLines={1}
                                    >
                                      {formatDisplayDate(landDate)}
                                    </Text>
                                  </View>

                                  <View style={{ flex: 1 }}>
                                    <Text
                                      style={{
                                        color: "rgba(255,255,255,0.60)",
                                        fontWeight: "900",
                                        fontSize: 11,
                                        textAlign: "center",
                                      }}
                                    >
                                      Method
                                    </Text>
                                    <Text
                                      style={{
                                        color: "rgba(255,255,255,0.85)",
                                        fontWeight: "900",
                                        marginTop: 3,
                                        textAlign: "center",
                                      }}
                                      numberOfLines={1}
                                    >
                                      {String(method)}
                                    </Text>
                                  </View>
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>

      <CalendarModal
        visible={calOpen}
        selectedISO={selectedDateISO}
        onClose={() => setCalOpen(false)}
        onPick={(iso) => {
          setSelectedDateISO(iso);
          setCalOpen(false);
        }}
        markedDays={markedDays}
      />
    </View>
  );
}