import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  Alert,
  Modal,
} from "react-native";

import {
  getQcFillQueue,
  removeQcFillById,
  upsertQcFillDraft,
  type QcFillQueuedItem,
  deriveTabFromPayload,
  type TabStatus as DerivedTabStatus,
} from "../../utils/qcFillQueue";

import { FullRow, TwoColRow, type Division, type Lang } from "./QualityUI";

export type TabStatus = "pending" | "checked" | "rejected";

type ListItem = {
  id: string;
  qrCode: string;
  createdAt: number; // display time
  eventAt: number; // actual filter time (createdAt / syncedAt)
  synced: boolean;
  payload: any;
  lastError?: string;
  syncedAt?: number;
};

function upper(v: any) {
  return String(v ?? "").trim().toUpperCase();
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toYmdLocal(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${y}-${m}-${day}`;
}

function formatDmy(ymd: string): string {
  const [y, m, d] = String(ymd || "").split("-");
  if (!y || !m || !d) return ymd;
  return `${d}-${m}-${y}`;
}

function unwrapPayload(p: any) {
  if (!p) return p;
  if (p?.payload && typeof p.payload === "object") return p.payload;
  return p;
}

function getResultForDisplay(payload: any) {
  const p = unwrapPayload(payload);

  const r = upper(p?.qc_result ?? p?.qcResult ?? p?.result);
  if (r) return r;

  const s = upper(p?.qc_status ?? p?.qcStatus ?? p?.status);
  if (s === "CHECKED") return "PASS";
  if (s === "HOLD") return "HOLD";
  if (s === "REJECTED") return "REJECT";

  return "";
}

function getImages(p0: any): string[] {
  const p = unwrapPayload(p0);
  const imgs =
    p?.inspection_images ||
    p?.pond_images ||
    p?.pond_condition_images ||
    p?.images ||
    [];
  return Array.isArray(imgs) ? imgs : [];
}

/** ===== Render all form fields safely ===== */
const HIDE_KEYS = new Set([
  "_local",
  "server_qr",
  "raw",
  "data",
  "qr",
  "updatedQr",

  "checker_code",
  "checkerCode",
  "quality_checker_id",
  "qualityCheckerId",

  "division",
  "qc_result",
  "qcResult",
  "qc_status",
  "qcStatus",
  "status",

  "crate_images",
  "inspection_images",
  "pond_images",
  "pond_condition_images",
  "images",
]);

function isUriLike(s: string) {
  const v = String(s || "");
  return (
    v.startsWith("file:") || v.startsWith("content:") || v.startsWith("http")
  );
}

function formatValue(v: any): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return v.trim() ? v : "—";

  if (Array.isArray(v)) {
    if (v.length === 0) return "—";
    if (v.every((x) => typeof x === "string" && isUriLike(x)))
      return `${v.length} file(s)`;
    if (v.length <= 8 && v.every((x) => typeof x !== "object"))
      return v.map(String).join(", ");
    return JSON.stringify(v);
  }

  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function getFormEntries(payload0: any): Array<{ label: string; value: string }> {
  const p = unwrapPayload(payload0) || {};
  const entries: Array<{ label: string; value: string }> = [];

  Object.entries(p).forEach(([k, v]) => {
    if (HIDE_KEYS.has(k)) return;
    if (k.startsWith("_")) return;

    if (v === undefined || v === null) return;
    if (typeof v === "string" && !v.trim()) return;
    if (Array.isArray(v) && v.length === 0) return;

    entries.push({
      label: k.replace(/_/g, " "),
      value: formatValue(v),
    });
  });

  entries.sort((a, b) => a.label.localeCompare(b.label));
  return entries;
}

function renderTwoCol(entries: Array<{ label: string; value: string }>) {
  const rows: React.ReactNode[] = [];

  for (let i = 0; i < entries.length; i += 2) {
    const left = entries[i];
    const right = entries[i + 1];

    if (right) {
      rows.push(
        <TwoColRow
          key={`${left.label}_${right.label}_${i}`}
          left={{ label: left.label, value: left.value }}
          right={{ label: right.label, value: right.value }}
        />
      );
    } else {
      rows.push(
        <FullRow
          key={`${left.label}_${i}`}
          label={left.label}
          value={left.value}
        />
      );
    }
  }
  return rows;
}

/* ================= CALENDAR (no dependency) ================= */
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

/** ✅ backend enum list (used in edit for REJECT) */
const REJECT_REASONS = [
  "TEMP_ABUSE",
  "SPOILAGE_ODOR",
  "CONTAMINATION",
  "DAMAGED_PACKAGING",
  "MIXED_SPECIES",
  "WRONG_LABEL",
  "UNDER_SIZE",
  "UNKNOWN_ORIGIN",
  "OTHER",
] as const;

type RejectReason = (typeof REJECT_REASONS)[number];

export default function QcListScreen({
  division,
  lang,
  status,
  selectedDate,
  onChangeDate,
}: {
  division: Division;
  lang: Lang;
  status: TabStatus;

  selectedDate: string; // YYYY-MM-DD
  onChangeDate: (ymd: string) => void;
}) {
  const [items, setItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [selected, setSelected] = useState<ListItem | null>(null);

  // ✅ edit state (for ANY unsynced item, even in rejected tab)
  const [editMode, setEditMode] = useState(false);
  const [editResult, setEditResult] = useState("");
  const [editRemarks, setEditRemarks] = useState("");
  const [editRejectReason, setEditRejectReason] = useState<RejectReason | "">("");

  // ✅ calendar modal
  const [calOpen, setCalOpen] = useState(false);
  const [calMonth, setCalMonth] = useState<Date>(() =>
    monthStart(ymdToDate(selectedDate))
  );

  useEffect(() => {
    setCalMonth(monthStart(ymdToDate(selectedDate)));
  }, [selectedDate]);

  const load = async () => {
    try {
      setLoading(true);
      const q = await getQcFillQueue();

      const ymd = String(selectedDate || "").trim();
      const divU = upper(division);

      const list = (q as QcFillQueuedItem[])
        .filter((x) => {
          const p = unwrapPayload(x.payload);
          const d =
            upper((x as any)?.division) ||
            upper(p?.division) ||
            upper(p?._local?.division);
          return !divU || d === divU;
        })
        .filter((x) => {
          const tab = deriveTabFromPayload(x.payload) as DerivedTabStatus;
          return tab === status;
        })
        .filter((x) => {
          if (!ymd) return true;
          const eventAt = x.synced ? x.syncedAt || x.createdAt : x.createdAt;
          return toYmdLocal(eventAt) === ymd;
        })
        .sort((a, b) => (b.syncedAt || b.createdAt) - (a.syncedAt || a.createdAt))
        .map((x) => {
          const eventAt = x.synced ? x.syncedAt || x.createdAt : x.createdAt;
          const p = unwrapPayload(x.payload);

          return {
            id: x.id,
            qrCode: x.qrCode,
            createdAt: eventAt,
            eventAt,
            synced: x.synced,
            syncedAt: x.syncedAt,
            payload: x.payload,
            lastError:
              (x as any)?.lastError ||
              p?._local?.last_error ||
              p?._local?.lastError ||
              undefined,
          };
        });

      setItems(list);

      if (selected) {
        const still = list.find((i) => i.id === selected.id);
        if (!still) setSelected(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [division, status, selectedDate]);

  // preload edit values when selecting
  useEffect(() => {
    if (!selected) return;

    const p = unwrapPayload(selected.payload);
    setEditMode(false);

    const r = getResultForDisplay(p);
    setEditResult(r || "");

    setEditRemarks(String(p?.qc_remarks || p?.remarks || ""));

    const rr = upper(p?.reject_reason);
    const found = (REJECT_REASONS as readonly string[]).includes(rr)
      ? (rr as RejectReason)
      : "";
    setEditRejectReason(found);
  }, [selected]);

  const onDelete = async () => {
    if (!selected) return;
    await removeQcFillById(selected.id);
    setSelected(null);
    setEditMode(false);
    await load();
  };

  const onSaveEdit = async () => {
    if (!selected) return;

    // ✅ allow edit only for unsynced (any tab)
    if (selected.synced) return;

    const nextResult = upper(editResult);
    if (nextResult !== "PASS" && nextResult !== "HOLD" && nextResult !== "REJECT") {
      Alert.alert("Invalid Result", "Result must be PASS / HOLD / REJECT");
      return;
    }

    // ✅ if REJECT, require enum reject_reason
    if (nextResult === "REJECT") {
      if (!editRejectReason) {
        Alert.alert("Reject Reason required", "Select a reject reason");
        return;
      }
    }

    const prev = unwrapPayload(selected.payload) || {};

    const nextPayload = {
      ...(prev || {}),
      division,

      qc_result: nextResult,
      // keep qc_status in payload if you are using it elsewhere
      qc_status:
        nextResult === "PASS"
          ? "CHECKED"
          : nextResult === "HOLD"
          ? "HOLD"
          : "REJECTED",

      // ✅ backend expects qc_remarks (your modal uses qc_remarks)
      qc_remarks: editRemarks?.trim() || null,
      // keep old key also if any code reads it
      remarks: editRemarks?.trim() || null,

      // ✅ only for REJECT else null
      reject_reason: nextResult === "REJECT" ? editRejectReason : null,

      _local: {
        ...(prev?._local || {}),
        last_error: null,
        last_error_at: null,
      },
    };

    try {
      await upsertQcFillDraft(selected.qrCode, nextPayload);
      setSelected(null);
      setEditMode(false);
      await load();
    } catch (e: any) {
      Alert.alert("Edit failed", String(e?.message || e || "Failed"));
    }
  };

  const title = useMemo(() => {
    if (status === "checked") return "Checked Inspections";
    if (status === "rejected") return "Rejected Inspections";
    return "Pending Inspections";
  }, [status]);

  const formEntries = useMemo(() => {
    return selected ? getFormEntries(selected.payload) : [];
  }, [selected]);

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
    return cells;
  }, [calMonth]);

  return (
    <View style={{ marginTop: 12, flex: 1 }}>
      {/* Title left + Calendar right */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <Text style={{ color: "white", fontWeight: "900", fontSize: 18 }}>
          {title}
        </Text>

        <Pressable
          onPress={() => setCalOpen(true)}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 9,
            borderRadius: 14,
            backgroundColor: "rgba(255,255,255,0.06)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.10)",
          }}
        >
          <Text style={{ color: "white", fontWeight: "900" }}>
            {formatDmy(selectedDate)}
          </Text>
        </Pressable>
      </View>

      {loading && <ActivityIndicator style={{ marginTop: 14 }} />}

      {!loading && items.length === 0 && (
        <Text style={{ color: "rgba(255,255,255,0.55)", marginTop: 14 }}>
          No inspections for this date.
        </Text>
      )}

      <ScrollView
        style={{ marginTop: 12 }}
        contentContainerStyle={{ paddingBottom: 30 }}
      >
        {items.map((it) => {
          const active = selected?.id === it.id;

          const dispResult = getResultForDisplay(it.payload) || "—";
          const qcStatus = String(
            unwrapPayload(it.payload)?.qc_status || unwrapPayload(it.payload)?.qcStatus || "—"
          );

          return (
            <View key={it.id} style={{ marginBottom: 10 }}>
              <Pressable
                onPress={() => {
                  if (active) setSelected(null);
                  else setSelected(it);
                }}
                style={{
                  padding: 14,
                  borderRadius: 18,
                  backgroundColor: active
                    ? "rgba(59,130,246,0.15)"
                    : "rgba(255,255,255,0.06)",
                  borderWidth: 1,
                  borderColor: active
                    ? "rgba(59,130,246,0.45)"
                    : "rgba(255,255,255,0.10)",
                }}
              >
                <Text style={{ color: "white", fontWeight: "900" }}>
                  {it.qrCode}
                </Text>

                <Text style={{ color: "rgba(255,255,255,0.65)", marginTop: 4 }}>
                  Result: {dispResult}
                </Text>

                {/* ✅ show sync status always */}
                <Text style={{ color: "rgba(255,255,255,0.55)", marginTop: 2 }}>
                  Sync: {it.synced ? "Submitted" : "Pending"}
                </Text>

                {!!it.lastError && !it.synced && (
                  <Text
                    style={{ color: "rgba(255,120,120,0.85)", marginTop: 4 }}
                  >
                    Error: {it.lastError}
                  </Text>
                )}

                <Text style={{ color: "rgba(255,255,255,0.55)", marginTop: 2 }}>
                  {it.synced ? "Submitted" : "Saved"}:{" "}
                  {new Date(it.createdAt).toLocaleString()}
                </Text>

                <Text
                  style={{
                    color: "rgba(255,255,255,0.45)",
                    marginTop: 8,
                    fontWeight: "800",
                  }}
                >
                  {active ? "Tap to hide details ▲" : "Tap to view details ▼"}
                </Text>
              </Pressable>

              {/* INLINE DETAILS */}
              {active && (
                <View
                  style={{
                    marginTop: 10,
                    padding: 14,
                    borderRadius: 18,
                    backgroundColor: "rgba(255,255,255,0.06)",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.10)",
                  }}
                >
                  <TwoColRow
                    left={{ label: "Division", value: division }}
                    right={{ label: "Result", value: dispResult }}
                  />

                  <TwoColRow
                    left={{ label: "QC Status", value: qcStatus }}
                    right={{ label: "Sync", value: it.synced ? "Submitted" : "Pending" }}
                  />

                  <FullRow
                    label="Remarks"
                    value={
                      unwrapPayload(it.payload)?.qc_remarks ||
                      unwrapPayload(it.payload)?.remarks ||
                      "—"
                    }
                  />

                  {/* FORM DETAILS */}
                  <View style={{ marginTop: 12 }}>
                    <Text
                      style={{
                        color: "rgba(255,255,255,0.9)",
                        fontWeight: "900",
                        fontSize: 15,
                      }}
                    >
                      Form Details
                    </Text>

                    {formEntries.length === 0 ? (
                      <Text
                        style={{
                          color: "rgba(255,255,255,0.55)",
                          marginTop: 8,
                        }}
                      >
                        No extra fields found in payload.
                      </Text>
                    ) : (
                      <View style={{ marginTop: 6 }}>
                        {renderTwoCol(formEntries)}
                      </View>
                    )}
                  </View>

                  {getImages(it.payload).length > 0 && (
                    <ScrollView horizontal style={{ marginTop: 12 }}>
                      {getImages(it.payload).map((uri) => (
                        <Image
                          key={uri}
                          source={{ uri }}
                          style={{
                            width: 140,
                            height: 110,
                            borderRadius: 14,
                            marginRight: 10,
                          }}
                        />
                      ))}
                    </ScrollView>
                  )}

                  {/* ✅ EDIT/DELETE FOR ANY UNSYNCED ITEM (ALL TABS) */}
                  {!it.synced && (
                    <>
                      {!editMode ? (
                        <Pressable
                          onPress={() => setEditMode(true)}
                          style={{
                            marginTop: 14,
                            padding: 14,
                            borderRadius: 14,
                            backgroundColor: "#2563EB",
                            alignItems: "center",
                          }}
                        >
                          <Text style={{ color: "white", fontWeight: "900" }}>
                            Edit
                          </Text>
                        </Pressable>
                      ) : (
                        <View
                          style={{
                            marginTop: 14,
                            padding: 12,
                            borderRadius: 14,
                            borderWidth: 1,
                            borderColor: "rgba(255,255,255,0.10)",
                            backgroundColor: "rgba(255,255,255,0.06)",
                          }}
                        >
                          <Text
                            style={{
                              color: "rgba(255,255,255,0.8)",
                              fontWeight: "900",
                            }}
                          >
                            Edit Local Record
                          </Text>

                          <Text
                            style={{
                              color: "rgba(255,255,255,0.65)",
                              marginTop: 10,
                            }}
                          >
                            Result (PASS / HOLD / REJECT)
                          </Text>
                          <TextInput
                            value={editResult}
                            onChangeText={setEditResult}
                            placeholder="PASS"
                            placeholderTextColor="rgba(255,255,255,0.35)"
                            autoCapitalize="characters"
                            style={{
                              marginTop: 6,
                              borderRadius: 12,
                              paddingHorizontal: 12,
                              paddingVertical: 10,
                              backgroundColor: "rgba(0,0,0,0.35)",
                              borderWidth: 1,
                              borderColor: "rgba(255,255,255,0.12)",
                              color: "white",
                              fontWeight: "900",
                            }}
                          />

                          {upper(editResult) === "REJECT" && (
                            <>
                              <Text
                                style={{
                                  color: "rgba(255,255,255,0.65)",
                                  marginTop: 10,
                                }}
                              >
                                Reject Reason (ENUM)
                              </Text>
                              <TextInput
                                value={editRejectReason}
                                onChangeText={(v) =>
                                  setEditRejectReason(upper(v) as RejectReason | "")
                                }
                                placeholder="TEMP_ABUSE"
                                placeholderTextColor="rgba(255,255,255,0.35)"
                                autoCapitalize="characters"
                                style={{
                                  marginTop: 6,
                                  borderRadius: 12,
                                  paddingHorizontal: 12,
                                  paddingVertical: 10,
                                  backgroundColor: "rgba(0,0,0,0.35)",
                                  borderWidth: 1,
                                  borderColor: "rgba(255,255,255,0.12)",
                                  color: "white",
                                  fontWeight: "900",
                                }}
                              />
                              <Text
                                style={{
                                  color: "rgba(255,255,255,0.45)",
                                  marginTop: 6,
                                  fontWeight: "800",
                                }}
                              >
                                Allowed: {REJECT_REASONS.join(", ")}
                              </Text>
                            </>
                          )}

                          <Text
                            style={{
                              color: "rgba(255,255,255,0.65)",
                              marginTop: 10,
                            }}
                          >
                            Remarks
                          </Text>
                          <TextInput
                            value={editRemarks}
                            onChangeText={setEditRemarks}
                            placeholder="Remarks"
                            placeholderTextColor="rgba(255,255,255,0.35)"
                            multiline
                            style={{
                              marginTop: 6,
                              borderRadius: 12,
                              paddingHorizontal: 12,
                              paddingVertical: 10,
                              minHeight: 80,
                              backgroundColor: "rgba(0,0,0,0.35)",
                              borderWidth: 1,
                              borderColor: "rgba(255,255,255,0.12)",
                              color: "white",
                              fontWeight: "800",
                            }}
                          />

                          <Pressable
                            onPress={onSaveEdit}
                            style={{
                              marginTop: 12,
                              padding: 14,
                              borderRadius: 14,
                              backgroundColor: "#16A34A",
                              alignItems: "center",
                            }}
                          >
                            <Text style={{ color: "white", fontWeight: "900" }}>
                              Save
                            </Text>
                          </Pressable>

                          <Pressable
                            onPress={() => setEditMode(false)}
                            style={{
                              marginTop: 10,
                              padding: 12,
                              borderRadius: 14,
                              backgroundColor: "rgba(255,255,255,0.08)",
                              alignItems: "center",
                            }}
                          >
                            <Text style={{ color: "white", fontWeight: "900" }}>
                              Cancel
                            </Text>
                          </Pressable>
                        </View>
                      )}

                      <Pressable
                        onPress={onDelete}
                        style={{
                          marginTop: 10,
                          padding: 14,
                          borderRadius: 14,
                          backgroundColor: "#DC2626",
                          alignItems: "center",
                        }}
                      >
                        <Text style={{ color: "white", fontWeight: "900" }}>
                          Delete
                        </Text>
                      </Pressable>
                    </>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* ================= CALENDAR MODAL ================= */}
      <Modal visible={calOpen} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.65)",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <View
            style={{
              backgroundColor: "#0b1630",
              borderRadius: 22,
              padding: 14,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.10)",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <Pressable
                onPress={() => setCalMonth((p) => addMonths(p, -1))}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 14,
                  backgroundColor: "rgba(255,255,255,0.06)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.10)",
                }}
              >
                <Text style={{ color: "white", fontWeight: "900" }}>‹</Text>
              </Pressable>

              <Text style={{ color: "white", fontWeight: "900", fontSize: 16 }}>
                {fmtMonthTitle(calMonth)}
              </Text>

              <Pressable
                onPress={() => setCalMonth((p) => addMonths(p, 1))}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 14,
                  backgroundColor: "rgba(255,255,255,0.06)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.10)",
                }}
              >
                <Text style={{ color: "white", fontWeight: "900" }}>›</Text>
              </Pressable>
            </View>

            <View style={{ flexDirection: "row", marginTop: 12 }}>
              {DOW.map((d) => (
                <View key={d} style={{ flex: 1, alignItems: "center" }}>
                  <Text style={{ color: "rgba(255,255,255,0.55)", fontWeight: "900" }}>
                    {d}
                  </Text>
                </View>
              ))}
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 8 }}>
              {calCells.map((c, idx) => {
                const isSel = !!c.ymd && c.ymd === selectedDate;
                return (
                  <View key={idx} style={{ width: "14.2857%", padding: 4 }}>
                    {c.day ? (
                      <Pressable
                        onPress={() => {
                          if (!c.ymd) return;
                          onChangeDate(c.ymd);
                          setCalOpen(false);
                        }}
                        style={{
                          height: 40,
                          borderRadius: 12,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: isSel
                            ? "rgba(59,130,246,0.35)"
                            : "rgba(255,255,255,0.06)",
                          borderWidth: 1,
                          borderColor: isSel
                            ? "rgba(59,130,246,0.60)"
                            : "rgba(255,255,255,0.10)",
                        }}
                      >
                        <Text style={{ color: "white", fontWeight: "900" }}>
                          {c.day}
                        </Text>
                      </Pressable>
                    ) : (
                      <View style={{ height: 40 }} />
                    )}
                  </View>
                );
              })}
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              <Pressable
                onPress={() => {
                  const now = new Date();
                  const ymd = toYmdLocal(now.getTime());
                  onChangeDate(ymd);
                  setCalOpen(false);
                }}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 14,
                  backgroundColor: "rgba(34,197,94,0.20)",
                  borderWidth: 1,
                  borderColor: "rgba(34,197,94,0.35)",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "white", fontWeight: "900" }}>Today</Text>
              </Pressable>

              <Pressable
                onPress={() => setCalOpen(false)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 14,
                  backgroundColor: "rgba(255,255,255,0.08)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.10)",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "white", fontWeight: "900" }}>Close</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
