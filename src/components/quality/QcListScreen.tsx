// src/components/quality/QcListScreen.tsx
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
  Alert,
  Modal,
} from "react-native";

import {
  getQcFillQueue,
  removeQcFillById,
  type QcFillQueuedItem,
  deriveTabFromPayload,
  type TabStatus as QueueTabStatus,
} from "../../utils/qcFillQueue";

import { FullRow, TwoColRow, type Division, type Lang } from "./QualityUI";

export type TabStatus = "pending" | "checked" | "rejected";

type ListItem = {
  id: string;
  qrCode: string;
  createdAt: number;
  eventAt: number;
  synced: boolean;
  payload: any;
  lastError?: string;
  syncedAt?: number;
  tab: QueueTabStatus;
};

function upper(v: any) {
  return String(v || "").toUpperCase();
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

function getQcResult(p: any) {
  const v =
    p?.qc_result ??
    p?.qcResult ??
    p?.qc_status ??
    p?.qcStatus ??
    p?.status ??
    "";
  return upper(v);
}

function getImages(p: any): string[] {
  const imgs =
    p?.inspection_images ||
    p?.pond_images ||
    p?.pond_condition_images ||
    p?.images ||
    [];
  return Array.isArray(imgs) ? imgs.filter(Boolean) : [];
}

/** ✅ Extract location saved at submit time (supports many key shapes) */
function numOrUndef(v: any): number | undefined {
  if (v === null || v === undefined) return undefined;
  const n = typeof v === "number" ? v : Number(String(v).trim());
  return Number.isFinite(n) ? n : undefined;
}

function getLocation(p: any): {
  lat?: number;
  lng?: number;
  accuracy?: number;
  address?: string;
} | null {
  const src = p || {};
  const local = src?._local || {};
  const coords =
    src?.coords ||
    src?.location?.coords ||
    src?.gps?.coords ||
    src?.geo?.coords ||
    local?.coords ||
    local?.location?.coords ||
    {};

  // coords
  const lat =
    numOrUndef(src?.latitude) ??
    numOrUndef(src?.lat) ??
    numOrUndef(src?.location?.latitude) ??
    numOrUndef(src?.location?.lat) ??
    numOrUndef(coords?.latitude) ??
    numOrUndef(coords?.lat) ??
    numOrUndef(local?.latitude) ??
    numOrUndef(local?.lat);

  const lng =
    numOrUndef(src?.longitude) ??
    numOrUndef(src?.lng) ??
    numOrUndef(src?.lon) ??
    numOrUndef(src?.location?.longitude) ??
    numOrUndef(src?.location?.lng) ??
    numOrUndef(src?.location?.lon) ??
    numOrUndef(coords?.longitude) ??
    numOrUndef(coords?.lng) ??
    numOrUndef(coords?.lon) ??
    numOrUndef(local?.longitude) ??
    numOrUndef(local?.lng) ??
    numOrUndef(local?.lon);

  // "lat,lng" string support
  const ll =
    src?.current_location ||
    src?.currentLocation ||
    src?.location_text ||
    src?.locationText ||
    local?.current_location ||
    local?.currentLocation;

  let lat2 = lat;
  let lng2 = lng;
  if ((lat2 === undefined || lng2 === undefined) && typeof ll === "string") {
    const m = ll.match(/(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)/);
    if (m) {
      lat2 = numOrUndef(m[1]);
      lng2 = numOrUndef(m[3]);
    }
  }

  const accuracy =
    numOrUndef(src?.accuracy) ??
    numOrUndef(src?.gps_accuracy) ??
    numOrUndef(coords?.accuracy) ??
    numOrUndef(local?.accuracy) ??
    numOrUndef(local?.gps_accuracy);

  const address =
    (typeof src?.address === "string" ? src.address : undefined) ||
    (typeof src?.location_name === "string" ? src.location_name : undefined) ||
    (typeof src?.locationName === "string" ? src.locationName : undefined) ||
    (typeof src?.formatted_address === "string" ? src.formatted_address : undefined) ||
    (typeof src?.place === "string" ? src.place : undefined) ||
    (typeof local?.address === "string" ? local.address : undefined) ||
    (typeof local?.formatted_address === "string" ? local.formatted_address : undefined);

  if (lat2 === undefined && lng2 === undefined && !address) return null;

  return { lat: lat2, lng: lng2, accuracy, address };
}

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

  // ✅ hide inspected time field coming from payload
  "inspected_at",
  "inspectedAt",
  "inspected_at_time",
  "inspectedAtTime",
  "inspected at",

  // ✅ hide raw location fields (we show clean "Location" block instead)
  "lat",
  "lng",
  "lon",
  "latitude",
  "longitude",
  "coords",
  "location",
  "gps",
  "geo",
  "accuracy",
  "gps_accuracy",
  "current_location",
  "currentLocation",
  "location_text",
  "locationText",
  "location_name",
  "locationName",
  "formatted_address",
  "address",
]);

function isUriLike(s: string) {
  const v = String(s || "");
  return v.startsWith("file:") || v.startsWith("content:") || v.startsWith("http");
}

function formatValue(v: any): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return v.trim() ? v : "—";

  if (Array.isArray(v)) {
    if (v.length === 0) return "—";
    if (v.every((x) => typeof x === "string" && isUriLike(x))) return `${v.length} file(s)`;
    if (v.length <= 8 && v.every((x) => typeof x !== "object")) return v.map(String).join(", ");
    return JSON.stringify(v);
  }

  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function getFormEntries(payload: any): Array<{ label: string; value: string }> {
  const p = payload || {};
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
      rows.push(<FullRow key={`${left.label}_${i}`} label={left.label} value={left.value} />);
    }
  }
  return rows;
}

/* ================= CALENDAR ================= */
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

const CAL = {
  overlay: "rgba(0,0,0,0.70)",
  cardBg: "#0b1630",
  cardTop: "rgba(255,255,255,0.04)",
  border: "rgba(255,255,255,0.10)",
  textSoft: "rgba(255,255,255,0.55)",

  btnBg: "rgba(255,255,255,0.07)",
  btnBorder: "rgba(255,255,255,0.12)",

  dayBg: "rgba(255,255,255,0.06)",
  dayBorder: "rgba(255,255,255,0.10)",

  selBg: "rgba(59,130,246,0.35)",
  selBorder: "rgba(59,130,246,0.70)",

  todayBorder: "rgba(34,197,94,0.85)",
  markDot: "rgba(255,255,255,0.70)",

  primaryBtnBg: "rgba(59,130,246,0.25)",
  primaryBtnBorder: "rgba(59,130,246,0.35)",

  okBg: "rgba(34,197,94,0.18)",
  okBorder: "rgba(34,197,94,0.35)",
};

export default function QcListScreen({
  division,
  lang,
  status,
  selectedDate,
  onChangeDate,
  onEditItem,
}: {
  division: Division;
  lang: Lang;
  status: TabStatus;

  selectedDate: string; // YYYY-MM-DD
  onChangeDate: (ymd: string) => void;

  onEditItem?: (draft: { qrCode: string; payload: any }) => void;
}) {
  const [items, setItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<ListItem | null>(null);

  const [markedDays, setMarkedDays] = useState<Record<string, number>>({});

  const [calOpen, setCalOpen] = useState(false);
  const [calMonth, setCalMonth] = useState<Date>(() => monthStart(ymdToDate(selectedDate)));

  // ✅ Fullscreen Image Preview (open ONLY inside details area)
  const [imgOpen, setImgOpen] = useState(false);
  const [imgUris, setImgUris] = useState<string[]>([]);
  const [imgIndex, setImgIndex] = useState(0);

  const openImagePreview = (uris: string[], index: number) => {
    if (!uris || uris.length === 0) return;
    setImgUris(uris);
    setImgIndex(Math.max(0, Math.min(index, uris.length - 1)));
    setImgOpen(true);
  };

  const closeImagePreview = () => setImgOpen(false);

  const nextImage = () => {
    setImgIndex((p) => {
      if (!imgUris.length) return 0;
      return Math.min(p + 1, imgUris.length - 1);
    });
  };

  const prevImage = () => {
    setImgIndex((p) => {
      if (!imgUris.length) return 0;
      return Math.max(p - 1, 0);
    });
  };

  useEffect(() => {
    setCalMonth(monthStart(ymdToDate(selectedDate)));
  }, [selectedDate]);

  const todayYmd = useMemo(() => toYmdLocal(Date.now()), []);
  const todayMonthStart = useMemo(() => monthStart(new Date()), []);

  const load = async () => {
    try {
      setLoading(true);
      const q = await getQcFillQueue();
      const ymd = String(selectedDate || "").trim();

      const base = (q as QcFillQueuedItem[])
        .filter((x) => upper(x.payload?.division) === upper(division))
        .filter((x) => {
          const tab = deriveTabFromPayload(x.payload);
          if (status === "checked") return tab === "checked";
          if (status === "rejected") return tab === "rejected";
          return tab === "pending";
        });

      const perDay: Record<string, number> = {};
      base.forEach((x) => {
        const eventAt = (x.synced ? x.syncedAt : undefined) || x.updatedAt || x.createdAt || 0;
        const k = toYmdLocal(eventAt);
        perDay[k] = (perDay[k] || 0) + 1;
      });
      setMarkedDays(perDay);

      const list = base
        .filter((x) => {
          if (!ymd) return true;
          const eventAt = (x.synced ? x.syncedAt : undefined) || x.updatedAt || x.createdAt || 0;
          return toYmdLocal(eventAt) === ymd;
        })
        .sort((a, b) => {
          const aT = (a.synced ? a.syncedAt : undefined) || a.updatedAt || a.createdAt || 0;
          const bT = (b.synced ? b.syncedAt : undefined) || b.updatedAt || b.createdAt || 0;
          return bT - aT;
        })
        .map((x) => {
          const eventAt = (x.synced ? x.syncedAt : undefined) || x.updatedAt || x.createdAt || 0;

          return {
            id: x.id,
            qrCode: x.qrCode,
            createdAt: eventAt,
            eventAt,
            synced: x.synced,
            syncedAt: x.syncedAt,
            payload: x.payload,
            tab: deriveTabFromPayload(x.payload),
            lastError: (x as any)?.lastError || (x as any)?.payload?._local?.last_error,
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

  const onDeleteSelected = async () => {
    if (!selected) return;
    await removeQcFillById(selected.id);
    setSelected(null);
    await load();
  };

  const title = useMemo(() => {
    if (status === "checked") return "Checked Inspections";
    if (status === "rejected") return "Rejected Inspections";
    return "Pending Inspections";
  }, [status]);

  const formEntries = useMemo(() => (selected ? getFormEntries(selected.payload) : []), [selected]);

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

  const canGoNextMonth = useMemo(() => {
    const next = monthStart(addMonths(calMonth, 1));
    return next.getTime() <= todayMonthStart.getTime();
  }, [calMonth, todayMonthStart]);

  return (
    <View style={{ marginTop: 12, flex: 1 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <Text style={{ color: "white", fontWeight: "900", fontSize: 18 }}>{title}</Text>

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
          <Text style={{ color: "white", fontWeight: "900" }}>{formatDmy(selectedDate)}</Text>
        </Pressable>
      </View>

      {loading && <ActivityIndicator style={{ marginTop: 14 }} />}

      {!loading && items.length === 0 && (
        <Text style={{ color: "rgba(255,255,255,0.55)", marginTop: 14 }}>
          No inspections for this date.
        </Text>
      )}

      <ScrollView style={{ marginTop: 12 }} contentContainerStyle={{ paddingBottom: 30 }}>
        {items.map((it) => {
          const active = selected?.id === it.id;
          const allowEditDelete = it.tab === "pending";
          const imgs = getImages(it.payload);
          const loc = getLocation(it.payload);

          return (
            <View key={it.id} style={{ marginBottom: 10 }}>
              <Pressable
                onPress={() => setSelected(active ? null : it)}
                style={{
                  padding: 14,
                  borderRadius: 18,
                  backgroundColor: active ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.06)",
                  borderWidth: 1,
                  borderColor: active ? "rgba(59,130,246,0.45)" : "rgba(255,255,255,0.10)",
                }}
              >
                <Text style={{ color: "white", fontWeight: "900" }}>{it.qrCode}</Text>

                <Text style={{ color: "rgba(255,255,255,0.65)", marginTop: 4 }}>
                  Result: {getQcResult(it.payload) || "—"}
                </Text>

                {!!it.lastError && (
                  <Text style={{ color: "rgba(255,120,120,0.85)", marginTop: 4 }}>
                    Error: {it.lastError}
                  </Text>
                )}

                <Text style={{ color: "rgba(255,255,255,0.55)", marginTop: 2 }}>
                  {it.synced ? "Submitted" : "Saved"}: {new Date(it.createdAt).toLocaleString()}
                </Text>

                <Text style={{ color: "rgba(255,255,255,0.45)", marginTop: 8, fontWeight: "800" }}>
                  {active ? "Tap to hide details ▲" : "Tap to view details ▼"}
                </Text>
              </Pressable>

              {/* ✅ Details only after clicking "Tap to view details" */}
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
                    right={{ label: "Result", value: getQcResult(it.payload) || "—" }}
                  />

                  <TwoColRow
                    left={{
                      label: "QC Status",
                      value: String(it.payload?.qc_status || it.payload?.qcStatus || "—"),
                    }}
                    right={{
                      label: "Sync",
                      value: it.synced ? "Submitted" : "Local Draft",
                    }}
                  />

                  {/* ✅ CURRENT LOCATION shown inside details */}
                  <View style={{ marginTop: 10 }}>
                    <Text style={{ color: "rgba(255,255,255,0.9)", fontWeight: "900", fontSize: 15 }}>
                      Current Location
                    </Text>

                    {loc ? (
                      <>
                        <FullRow
                          label="Address"
                          value={loc.address ? loc.address : "—"}
                        />
                        <TwoColRow
                          left={{
                            label: "Latitude",
                            value: loc.lat !== undefined ? String(loc.lat) : "—",
                          }}
                          right={{
                            label: "Longitude",
                            value: loc.lng !== undefined ? String(loc.lng) : "—",
                          }}
                        />
                        <TwoColRow
                          left={{
                            label: "Accuracy",
                            value: loc.accuracy !== undefined ? `${loc.accuracy} m` : "—",
                          }}
                          right={{
                            label: "Captured",
                            value: new Date(it.createdAt).toLocaleString(),
                          }}
                        />
                      </>
                    ) : (
                      <Text style={{ color: "rgba(255,255,255,0.55)", marginTop: 8 }}>
                        Location not found in payload.
                      </Text>
                    )}
                  </View>

                  <FullRow label="Remarks" value={it.payload?.remarks || it.payload?.qc_remarks || "—"} />

                  <View style={{ marginTop: 12 }}>
                    <Text style={{ color: "rgba(255,255,255,0.9)", fontWeight: "900", fontSize: 15 }}>
                      Form Details
                    </Text>

                    {formEntries.length === 0 ? (
                      <Text style={{ color: "rgba(255,255,255,0.55)", marginTop: 8 }}>
                        No extra fields found in payload.
                      </Text>
                    ) : (
                      <View style={{ marginTop: 6 }}>{renderTwoCol(formEntries)}</View>
                    )}
                  </View>

                  {/* ✅ Images below details; tap -> fullscreen preview */}
                  {imgs.length > 0 && (
                    <View style={{ marginTop: 14 }}>
                      <Text style={{ color: "rgba(255,255,255,0.9)", fontWeight: "900", fontSize: 15 }}>
                        Images
                      </Text>

                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={{ marginTop: 10 }}
                        contentContainerStyle={{ paddingRight: 4 }}
                      >
                        {imgs.map((uri, idx) => (
                          <Pressable
                            key={`${uri}_detail_${idx}`}
                            onPress={() => openImagePreview(imgs, idx)}
                            style={{ marginRight: 10 }}
                            hitSlop={10}
                          >
                            <Image
                              source={{ uri }}
                              style={{
                                width: 140,
                                height: 110,
                                borderRadius: 14,
                                borderWidth: 1,
                                borderColor: "rgba(255,255,255,0.10)",
                              }}
                              resizeMode="cover"
                            />
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  {allowEditDelete && (
                    <>
                      <Pressable
                        onPress={() => {
                          if (!onEditItem) {
                            Alert.alert("Edit not wired", "onEditItem prop missing");
                            return;
                          }
                          setSelected(null);
                          onEditItem({ qrCode: it.qrCode, payload: it.payload });
                        }}
                        style={{
                          marginTop: 14,
                          padding: 14,
                          borderRadius: 14,
                          backgroundColor: "#2563EB",
                          alignItems: "center",
                        }}
                      >
                        <Text style={{ color: "white", fontWeight: "900" }}>Edit (Open Form)</Text>
                      </Pressable>

                      <Pressable
                        onPress={onDeleteSelected}
                        style={{
                          marginTop: 10,
                          padding: 14,
                          borderRadius: 14,
                          backgroundColor: "#DC2626",
                          alignItems: "center",
                        }}
                      >
                        <Text style={{ color: "white", fontWeight: "900" }}>Delete</Text>
                      </Pressable>
                    </>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* ✅ Fullscreen Image Preview Modal */}
      <Modal visible={imgOpen} transparent animationType="fade" onRequestClose={closeImagePreview}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.92)" }}>
          <Pressable
            onPress={closeImagePreview}
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          />

          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              paddingTop: 18,
              paddingHorizontal: 14,
              paddingBottom: 10,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              zIndex: 20,
            }}
          >
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 12,
                backgroundColor: "rgba(255,255,255,0.08)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.12)",
              }}
            >
              <Text style={{ color: "white", fontWeight: "900", fontSize: 12 }}>
                {imgUris.length ? `${imgIndex + 1} / ${imgUris.length}` : "0 / 0"}
              </Text>
            </View>

            <Pressable
              onPress={closeImagePreview}
              hitSlop={10}
              style={{
                width: 40,
                height: 40,
                borderRadius: 14,
                backgroundColor: "rgba(255,255,255,0.08)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.12)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="close" size={22} color="white" />
            </Pressable>
          </View>

          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 10 }}>
            {imgUris[imgIndex] ? (
              <Image
                source={{ uri: imgUris[imgIndex] }}
                style={{ width: "100%", height: "78%" }}
                resizeMode="contain"
              />
            ) : null}
          </View>

          {imgUris.length > 1 && (
            <>
              <Pressable
                onPress={prevImage}
                hitSlop={12}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  marginTop: -26,
                  width: 52,
                  height: 52,
                  borderRadius: 18,
                  backgroundColor: "rgba(255,255,255,0.10)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.14)",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: imgIndex === 0 ? 0.35 : 1,
                }}
              >
                <Ionicons name="chevron-back" size={26} color="white" />
              </Pressable>

              <Pressable
                onPress={nextImage}
                hitSlop={12}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  marginTop: -26,
                  width: 52,
                  height: 52,
                  borderRadius: 18,
                  backgroundColor: "rgba(255,255,255,0.10)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.14)",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: imgIndex === imgUris.length - 1 ? 0.35 : 1,
                }}
              >
                <Ionicons name="chevron-forward" size={26} color="white" />
              </Pressable>

              <View style={{ paddingHorizontal: 12, paddingBottom: 18 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {imgUris.map((uri, idx) => {
                    const isActive = idx === imgIndex;
                    return (
                      <Pressable
                        key={`${uri}_thumb_${idx}`}
                        onPress={() => setImgIndex(idx)}
                        style={{
                          marginRight: 10,
                          borderRadius: 12,
                          overflow: "hidden",
                          borderWidth: 2,
                          borderColor: isActive ? "rgba(59,130,246,0.95)" : "rgba(255,255,255,0.12)",
                          opacity: isActive ? 1 : 0.7,
                        }}
                      >
                        <Image source={{ uri }} style={{ width: 64, height: 48 }} resizeMode="cover" />
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            </>
          )}
        </View>
      </Modal>

      {/* ✅ Center Calendar Modal */}
      <Modal visible={calOpen} transparent animationType="fade" onRequestClose={() => setCalOpen(false)}>
        <View
          style={{
            flex: 1,
            backgroundColor: CAL.overlay,
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <Pressable
            onPress={() => setCalOpen(false)}
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          />

          <View
            style={{
              width: "100%",
              maxWidth: 420,
              borderRadius: 22,
              overflow: "hidden",
              backgroundColor: CAL.cardBg,
              borderWidth: 1,
              borderColor: CAL.border,
              shadowColor: "#000",
              shadowOpacity: 0.35,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 10 },
              elevation: 18,
            }}
          >
            <View
              style={{
                paddingHorizontal: 14,
                paddingVertical: 12,
                backgroundColor: CAL.cardTop,
                borderBottomWidth: 1,
                borderBottomColor: "rgba(255,255,255,0.08)",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <View>
                <Text style={{ color: "white", fontWeight: "900", fontSize: 16 }}>Select Date</Text>
                <Text style={{ color: CAL.textSoft, fontWeight: "800", marginTop: 2 }}>
                  Selected: {formatDmy(selectedDate)}
                </Text>
              </View>

              <Pressable
                onPress={() => setCalOpen(false)}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  backgroundColor: CAL.btnBg,
                  borderWidth: 1,
                  borderColor: CAL.btnBorder,
                  alignItems: "center",
                  justifyContent: "center",
                }}
                hitSlop={10}
              >
                <Text style={{ color: "white", fontWeight: "900", fontSize: 16 }}>✕</Text>
              </Pressable>
            </View>

            <View style={{ padding: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <Pressable
                  onPress={() => setCalMonth((p) => addMonths(p, -1))}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    backgroundColor: CAL.btnBg,
                    borderWidth: 1,
                    borderColor: CAL.btnBorder,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  hitSlop={10}
                >
                  <Text style={{ color: "white", fontWeight: "900", fontSize: 18 }}>‹</Text>
                </Pressable>

                <View style={{ alignItems: "center" }}>
                  <Text style={{ color: "white", fontWeight: "900", fontSize: 18 }}>
                    {fmtMonthTitle(calMonth)}
                  </Text>
                </View>

                <Pressable
                  onPress={() => {
                    if (!canGoNextMonth) {
                      Alert.alert("Locked", "Future dates are locked.");
                      return;
                    }
                    setCalMonth((p) => addMonths(p, 1));
                  }}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    backgroundColor: CAL.btnBg,
                    borderWidth: 1,
                    borderColor: CAL.btnBorder,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: canGoNextMonth ? 1 : 0.35,
                  }}
                  hitSlop={10}
                >
                  <Text style={{ color: "white", fontWeight: "900", fontSize: 18 }}>›</Text>
                </Pressable>
              </View>

              <View style={{ flexDirection: "row", marginTop: 14 }}>
                {DOW.map((d) => (
                  <View key={d} style={{ flex: 1, alignItems: "center" }}>
                    <Text style={{ color: CAL.textSoft, fontWeight: "900", fontSize: 12 }}>
                      {d.toUpperCase()}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 10 }}>
                {calCells.map((c, idx) => {
                  const isSel = !!c.ymd && c.ymd === selectedDate;
                  const isToday = !!c.ymd && c.ymd === todayYmd;
                  const count = c.ymd ? (markedDays[c.ymd] || 0) : 0;
                  const isFuture = !!c.ymd && c.ymd > todayYmd;

                  return (
                    <View key={idx} style={{ width: "14.2857%", padding: 6, opacity: isFuture ? 0.35 : 1 }}>
                      {c.day ? (
                        <Pressable
                          onPress={() => {
                            if (!c.ymd) return;
                            if (c.ymd > todayYmd) {
                              Alert.alert("Locked", "Future dates are locked.");
                              return;
                            }
                            onChangeDate(c.ymd);
                            setCalOpen(false);
                          }}
                          style={{
                            width: "100%",
                            aspectRatio: 1,
                            borderRadius: 999,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: isSel ? CAL.selBg : CAL.dayBg,
                            borderWidth: 1.2,
                            borderColor: isSel ? CAL.selBorder : isToday ? CAL.todayBorder : CAL.dayBorder,
                          }}
                          hitSlop={10}
                        >
                          <Text style={{ color: "white", fontWeight: "900", fontSize: 14 }}>{c.day}</Text>

                          {!isSel && count > 0 && (
                            <View
                              style={{
                                position: "absolute",
                                bottom: 7,
                                width: 6,
                                height: 6,
                                borderRadius: 999,
                                backgroundColor: CAL.markDot,
                              }}
                            />
                          )}

                          {isToday && !isSel && (
                            <View
                              style={{
                                position: "absolute",
                                top: 7,
                                width: 6,
                                height: 6,
                                borderRadius: 999,
                                backgroundColor: "rgba(34,197,94,0.95)",
                              }}
                            />
                          )}
                        </Pressable>
                      ) : (
                        <View style={{ width: "100%", aspectRatio: 1 }} />
                      )}
                    </View>
                  );
                })}
              </View>

              <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                <Pressable
                  onPress={() => {
                    onChangeDate(todayYmd);
                    setCalOpen(false);
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 14,
                    backgroundColor: CAL.okBg,
                    borderWidth: 1,
                    borderColor: CAL.okBorder,
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
                    backgroundColor: CAL.primaryBtnBg,
                    borderWidth: 1,
                    borderColor: CAL.primaryBtnBorder,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "white", fontWeight: "900" }}>Close</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
