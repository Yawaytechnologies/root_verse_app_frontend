import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  PanResponder,
  Pressable,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fmtDMY } from "./helpers/date";

const BORDER = "rgba(255,255,255,0.12)";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const CELL_BASIS: any = { flexBasis: "14.285714%" };
const DAY_SIZE = 34;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toYmdLocal(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function ymdToDate(ymd: string): Date {
  const [y, m, d] = (ymd || "").split("-").map((x) => Number(x));
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

function monthStart(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function daysInMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function addMonths(d: Date, delta: number) {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

function fmtMonthTitle(d: Date) {
  const m = d.toLocaleString(undefined, { month: "long" });
  return `${m} ${d.getFullYear()}`;
}

function isoToYmd(iso: string) {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return toYmdLocal(Date.now());
  return toYmdLocal(dt.getTime());
}

function ymdToIso(ymd: string) {
  const d = ymdToDate(ymd);
  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    0,
    0,
    0
  ).toISOString();
}

export default function CalendarModal({
  visible,
  selectedISO,
  onClose,
  onPick,
  markedDays,
}: {
  visible: boolean;
  selectedISO: string;
  onClose: () => void;
  onPick: (iso: string) => void;
  markedDays?: Record<string, number>;
}) {
  const selectedYMD = useMemo(() => isoToYmd(selectedISO), [selectedISO]);

  const [calMonth, setCalMonth] = useState<Date>(() =>
    monthStart(ymdToDate(selectedYMD))
  );

  useEffect(() => {
    setCalMonth(monthStart(ymdToDate(selectedYMD)));
  }, [selectedYMD]);

  const todayYmd = useMemo(() => toYmdLocal(Date.now()), []);
  const todayMonthStart = useMemo(() => monthStart(new Date()), []);

  const canGoNextMonth = useMemo(() => {
    const next = monthStart(addMonths(calMonth, 1));
    return next.getTime() <= todayMonthStart.getTime();
  }, [calMonth, todayMonthStart]);

  const calCells = useMemo(() => {
    const start = monthStart(calMonth);
    const total = daysInMonth(start);
    const firstDow = start.getDay();
    const cells: Array<{ day?: number; ymd?: string }> = [];

    for (let i = 0; i < firstDow; i++) cells.push({});
    for (let d = 1; d <= total; d++) {
      const dt = new Date(start.getFullYear(), start.getMonth(), d);
      cells.push({ day: d, ymd: toYmdLocal(dt.getTime()) });
    }

    while (cells.length % 7 !== 0) cells.push({});
    while (cells.length < 42) cells.push({});

    return cells;
  }, [calMonth]);

  const panResponder = useMemo(() => {
    const TH = 40;
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, g) =>
        Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderRelease: (_evt, g) => {
        if (g.dx > TH) {
          setCalMonth((p) => addMonths(p, -1));
          return;
        }
        if (g.dx < -TH) {
          if (!canGoNextMonth) return;
          setCalMonth((p) => addMonths(p, 1));
        }
      },
    });
  }, [canGoNextMonth]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.72)",
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 16,
        }}
      >
        <Pressable
          onPress={onClose}
          style={{ position: "absolute", inset: 0 }}
        />

        <View
          style={{
            width: "100%",
            maxWidth: 360,
            borderRadius: 26,
            overflow: "hidden",
            backgroundColor: "#0b1630",
            borderWidth: 1,
            borderColor: BORDER,
          }}
        >
          {/* header */}
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 12,
              backgroundColor: "rgba(255,255,255,0.06)",
              borderBottomWidth: 1,
              borderBottomColor: "rgba(255,255,255,0.10)",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: "white", fontWeight: "900", fontSize: 15 }}>
                Select Date
              </Text>
              <Text
                style={{
                  color: "rgba(255,255,255,0.60)",
                  fontWeight: "800",
                  fontSize: 12,
                  marginTop: 2,
                }}
              >
                {fmtDMY(ymdToDate(selectedYMD))}
              </Text>
            </View>

            <Pressable onPress={onClose} hitSlop={12} style={{ padding: 8 }}>
              <Ionicons name="close" size={18} color="white" />
            </Pressable>
          </View>

          {/* body */}
          <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
            {/* month row */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Pressable
                onPress={() => setCalMonth((p) => addMonths(p, -1))}
                hitSlop={14}
                style={{ padding: 8 }}
              >
                <Ionicons name="chevron-back" size={18} color="white" />
              </Pressable>

              <Text style={{ color: "white", fontWeight: "900", fontSize: 16 }}>
                {fmtMonthTitle(calMonth)}
              </Text>

              <Pressable
                onPress={() => {
                  if (!canGoNextMonth) return;
                  setCalMonth((p) => addMonths(p, 1));
                }}
                hitSlop={14}
                style={{ padding: 8, opacity: canGoNextMonth ? 1 : 0.35 }}
              >
                <Ionicons name="chevron-forward" size={18} color="white" />
              </Pressable>
            </View>

            {/* DOW */}
            <View style={{ flexDirection: "row", marginTop: 12 }}>
              {DOW.map((d) => (
                <View key={d} style={CELL_BASIS}>
                  <Text
                    style={{
                      textAlign: "center",
                      color: "rgba(255,255,255,0.55)",
                      fontWeight: "900",
                      fontSize: 11,
                    }}
                  >
                    {d.toUpperCase()}
                  </Text>
                </View>
              ))}
            </View>

            {/* grid */}
            <View {...panResponder.panHandlers} style={{ marginTop: 8 }}>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {calCells.map((c, idx) => {
                  const ymd = c.ymd;
                  const isSel = !!ymd && ymd === selectedYMD;
                  const isToday = !!ymd && ymd === todayYmd;
                  const isFuture = !!ymd && ymd > todayYmd;
                  const count = ymd && markedDays ? markedDays[ymd] || 0 : 0;
                  const hasMark = count > 0;

                  return (
                    <View
                      key={idx}
                      style={[
                        CELL_BASIS,
                        { paddingVertical: 6, opacity: isFuture ? 0.35 : 1 },
                      ]}
                    >
                      {c.day ? (
                        <Pressable
                          hitSlop={10}
                          onPress={() => {
                            if (!ymd) return;
                            if (ymd > todayYmd) {
                              Alert.alert("Locked", "Future dates are locked.");
                              return;
                            }
                            onPick(ymdToIso(ymd));
                            onClose();
                          }}
                          style={{
                            width: DAY_SIZE,
                            height: DAY_SIZE,
                            alignSelf: "center",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: "transparent",
                            borderWidth: 0,
                            borderRadius: 0,

                            ...(isSel
                              ? {
                                  backgroundColor: "rgba(59,130,246,0.24)",
                                  borderWidth: 1,
                                  borderColor: "rgba(59,130,246,0.85)",
                                  borderRadius: 10,
                                }
                              : null),

                            ...(!isSel && isToday
                              ? {
                                  borderWidth: 1,
                                  borderColor: "rgba(34,197,94,0.95)",
                                  borderRadius: DAY_SIZE / 2,
                                }
                              : null),
                          }}
                        >
                          <Text
                            style={{
                              color: "white",
                              fontWeight: "900",
                              fontSize: 13,
                            }}
                          >
                            {c.day}
                          </Text>

                          {hasMark && (
                            <View
                              style={{
                                position: "absolute",
                                bottom: 4,
                                width: 5,
                                height: 5,
                                borderRadius: 999,
                                backgroundColor: isSel
                                  ? "rgba(255,255,255,0.95)"
                                  : "rgba(255,255,255,0.78)",
                              }}
                            />
                          )}
                        </Pressable>
                      ) : (
                        <View
                          style={{
                            width: DAY_SIZE,
                            height: DAY_SIZE,
                            alignSelf: "center",
                          }}
                        />
                      )}
                    </View>
                  );
                })}
              </View>
            </View>

            {/* footer */}
            <View
              style={{
                paddingTop: 12,
                paddingBottom: 16,
                alignItems: "center",
              }}
            >
              <Pressable
                onPress={() => {
                  onPick(new Date().toISOString());
                  onClose();
                }}
                style={{
                  width: 120,
                  paddingVertical: 10,
                  borderRadius: 14,
                  backgroundColor: "rgba(34,197,94,0.18)",
                  borderWidth: 1,
                  borderColor: "rgba(34,197,94,0.35)",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "white", fontWeight: "900" }}>Today</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}