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
  PanResponder,
} from "react-native";

import {
  getQcFillQueue,
  removeQcFillById,
  type QcFillQueuedItem,
  deriveTabFromPayload,
  type TabStatus as QueueTabStatus,
} from "../../utils/qcFillQueue";

import { FullRow, TwoColRow, type Division } from "./QualityUI";

// ✅ current QC user (to scope local queue per user)
import { useAppSelector } from "../../store/hooks";
import { selectInspector as selectQcInspector } from "../../store/qualityAuth/qualityAuth.slice";

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
    p?.crate_images ||
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
    (typeof src?.formatted_address === "string"
      ? src.formatted_address
      : undefined) ||
    (typeof src?.place === "string" ? src.place : undefined) ||
    (typeof local?.address === "string" ? local.address : undefined) ||
    (typeof local?.formatted_address === "string"
      ? local.formatted_address
      : undefined);

  if (lat2 === undefined && lng2 === undefined && !address) return null;
  return { lat: lat2, lng: lng2, accuracy, address };
}

const CELL_BASIS: any = { flexBasis: "14.285714%" };

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

  "inspected_at",
  "inspectedAt",
  "inspected_at_time",
  "inspectedAtTime",
  "inspected at",

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

    entries.push({ label: k.replace(/_/g, " "), value: formatValue(v) });
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
        />,
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

export default function QcListScreen({
  division,
  status,
  selectedDate,
  onChangeDate,
  onEditItem,
}: {
  division: Division;
  status: TabStatus;

  selectedDate: string; // YYYY-MM-DD
  onChangeDate: (ymd: string) => void;

  onEditItem?: (draft: { qrCode: string; payload: any }) => void;
}) {
  const qcMe = useAppSelector(selectQcInspector);

  const qcUserKey = useMemo(() => {
    const v =
      (qcMe as any)?.id ??
      (qcMe as any)?.checker_code ??
      (qcMe as any)?.checkerCode ??
      (qcMe as any)?.checker_phone ??
      (qcMe as any)?.checkerPhone ??
      (qcMe as any)?.phone ??
      (qcMe as any)?.mobile ??
      "";
    return String(v || "").trim();
  }, [qcMe]);

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
    setImgIndex((p) => (imgUris.length ? Math.min(p + 1, imgUris.length - 1) : 0));
  };

  const prevImage = () => {
    setImgIndex((p) => (imgUris.length ? Math.max(p - 1, 0) : 0));
  };

  useEffect(() => {
    setCalMonth(monthStart(ymdToDate(selectedDate)));
  }, [selectedDate]);

  // ✅ clear selected when user switches
  useEffect(() => {
    setSelected(null);
  }, [qcUserKey]);

  const todayYmd = useMemo(() => toYmdLocal(Date.now()), []);
  const todayMonthStart = useMemo(() => monthStart(new Date()), []);

  const load = async () => {
    try {
      setLoading(true);

      if (!qcUserKey) {
        setItems([]);
        setMarkedDays({});
        setSelected(null);
        return;
      }

      const q = await getQcFillQueue(qcUserKey);
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
  }, [division, status, selectedDate, qcUserKey]);

  const onDeleteSelected = async () => {
    if (!selected) return;
    if (!qcUserKey) return;

    await removeQcFillById(qcUserKey, selected.id);
    setSelected(null);
    await load();
  };

  const title = useMemo(() => {
    if (status === "checked") return "Checked Inspections";
    if (status === "rejected") return "Rejected Inspections";
    return "Pending Inspections";
  }, [status]);

  const formEntries = useMemo(() => (selected ? getFormEntries(selected.payload) : []), [selected]);

  // ✅ calendar cells (FORCE 6 WEEKS = 42 cells) => size NEVER changes, Saturday always aligns
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

    // pad to end of week
    while (cells.length % 7 !== 0) cells.push({});

    // pad to 6 rows ALWAYS
    while (cells.length < 42) cells.push({});

    return cells;
  }, [calMonth]);

  const canGoNextMonth = useMemo(() => {
    const next = monthStart(addMonths(calMonth, 1));
    return next.getTime() <= todayMonthStart.getTime();
  }, [calMonth, todayMonthStart]);

  // ✅ swipe month (left/right) + keep arrows
  const panResponder = useMemo(() => {
    const TH = 40; // swipe threshold
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

  // ✅ calendar sizes (compact + stable)
  const DAY_SIZE = 34;

  return (
    <View className="mt-3 flex-1">
      {/* Header */}
      <View className="flex-row items-center justify-between">
        <Text className="text-white font-black text-[18px]">{title}</Text>

        {/* keep this button exactly as-is (your request) */}
        <Pressable
          onPress={() => setCalOpen(true)}
          className="px-3 py-[9px] rounded-[14px] bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.10)]"
        >
          <Text className="text-white font-black">{formatDmy(selectedDate)}</Text>
        </Pressable>
      </View>

      {loading && (
        <View className="mt-3.5">
          <ActivityIndicator />
        </View>
      )}

      {!loading && items.length === 0 && (
        <Text className="text-white/55 mt-3.5">No inspections for this date.</Text>
      )}

      <ScrollView className="mt-3" contentContainerClassName="pb-8">
        {items.map((it) => {
          const active = selected?.id === it.id;
          const allowEditDelete = it.tab === "pending";
          const imgs = getImages(it.payload);
          const loc = getLocation(it.payload);

          const cardClass = active
            ? "p-3.5 rounded-[18px] bg-[rgba(59,130,246,0.15)] border border-[rgba(59,130,246,0.45)]"
            : "p-3.5 rounded-[18px] bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.10)]";

          return (
            <View key={it.id} className="mb-2.5">
              <Pressable onPress={() => setSelected(active ? null : it)} className={cardClass}>
                <Text className="text-white font-black">{it.qrCode}</Text>

                <Text className="text-white/65 mt-1">Result: {getQcResult(it.payload) || "—"}</Text>

                {!!it.lastError && (
                  <Text className="text-[rgba(255,120,120,0.85)] mt-1">Error: {it.lastError}</Text>
                )}

                <Text className="text-white/55 mt-0.5">
                  {it.synced ? "Submitted" : "Saved"}: {new Date(it.createdAt).toLocaleString()}
                </Text>

                <Text className="text-white/45 mt-2 font-extrabold">
                  {active ? "Tap to hide details ▲" : "Tap to view details ▼"}
                </Text>
              </Pressable>

              {/* Details */}
              {active && (
                <View className="mt-2.5 p-3.5 rounded-[18px] bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.10)]">
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

                  {/* Location */}
                  <View className="mt-2.5">
                    <Text className="text-white/90 font-black text-[15px]">Current Location</Text>

                    {loc ? (
                      <>
                        <FullRow label="Address" value={loc.address ? loc.address : "—"} />
                        <TwoColRow
                          left={{ label: "Latitude", value: loc.lat !== undefined ? String(loc.lat) : "—" }}
                          right={{ label: "Longitude", value: loc.lng !== undefined ? String(loc.lng) : "—" }}
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
                      <Text className="text-white/55 mt-2">Location not found in payload.</Text>
                    )}
                  </View>

                  <FullRow label="Remarks" value={it.payload?.remarks || it.payload?.qc_remarks || "—"} />

                  {/* Form Details */}
                  <View className="mt-3">
                    <Text className="text-white/90 font-black text-[15px]">Form Details</Text>

                    {formEntries.length === 0 ? (
                      <Text className="text-white/55 mt-2">No extra fields found in payload.</Text>
                    ) : (
                      <View className="mt-1.5">{renderTwoCol(formEntries)}</View>
                    )}
                  </View>

                  {/* Images */}
                  {imgs.length > 0 && (
                    <View className="mt-3.5">
                      <Text className="text-white/90 font-black text-[15px]">Images</Text>

                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        className="mt-2.5"
                        contentContainerClassName="pr-1"
                      >
                        {imgs.map((uri, idx) => (
                          <Pressable
                            key={`${uri}_detail_${idx}`}
                            onPress={() => openImagePreview(imgs, idx)}
                            className="mr-2.5"
                            hitSlop={10}
                          >
                            <Image
                              source={{ uri }}
                              className="w-[140px] h-[110px] rounded-[14px] border border-[rgba(255,255,255,0.10)]"
                              resizeMode="cover"
                            />
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  {/* Edit/Delete only for pending */}
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
                        className="mt-3.5 p-3.5 rounded-[14px] bg-[#2563EB] items-center"
                      >
                        <Text className="text-white font-black">Edit (Open Form)</Text>
                      </Pressable>

                      <Pressable
                        onPress={onDeleteSelected}
                        className="mt-2.5 p-3.5 rounded-[14px] bg-[#DC2626] items-center"
                      >
                        <Text className="text-white font-black">Delete</Text>
                      </Pressable>
                    </>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Fullscreen Image Preview */}
      <Modal visible={imgOpen} transparent animationType="fade" onRequestClose={closeImagePreview}>
        <View className="flex-1 bg-[rgba(0,0,0,0.92)]">
          <Pressable onPress={closeImagePreview} className="absolute inset-0" />

          <View className="absolute top-0 left-0 right-0 pt-4 px-3.5 pb-2.5 flex-row items-center justify-between z-20">
            <View className="px-2.5 py-1.5 rounded-[12px] bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.12)]">
              <Text className="text-white font-black text-[12px]">
                {imgUris.length ? `${imgIndex + 1} / ${imgUris.length}` : "0 / 0"}
              </Text>
            </View>

            <Pressable
              onPress={closeImagePreview}
              hitSlop={10}
              className="w-10 h-10 rounded-[14px] bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.12)] items-center justify-center"
            >
              <Ionicons name="close" size={22} color="white" />
            </Pressable>
          </View>

          <View className="flex-1 items-center justify-center px-2.5">
            {imgUris[imgIndex] ? (
              <Image source={{ uri: imgUris[imgIndex] }} className="w-full h-[78%]" resizeMode="contain" />
            ) : null}
          </View>

          {imgUris.length > 1 && (
            <>
              <Pressable
                onPress={prevImage}
                hitSlop={12}
                className={`absolute left-3 top-1/2 -mt-[26px] w-[52px] h-[52px] rounded-[18px] bg-[rgba(255,255,255,0.10)] border border-[rgba(255,255,255,0.14)] items-center justify-center ${
                  imgIndex === 0 ? "opacity-35" : "opacity-100"
                }`}
              >
                <Ionicons name="chevron-back" size={26} color="white" />
              </Pressable>

              <Pressable
                onPress={nextImage}
                hitSlop={12}
                className={`absolute right-3 top-1/2 -mt-[26px] w-[52px] h-[52px] rounded-[18px] bg-[rgba(255,255,255,0.10)] border border-[rgba(255,255,255,0.14)] items-center justify-center ${
                  imgIndex === imgUris.length - 1 ? "opacity-35" : "opacity-100"
                }`}
              >
                <Ionicons name="chevron-forward" size={26} color="white" />
              </Pressable>

              <View className="px-3 pb-4">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {imgUris.map((uri, idx) => {
                    const isActive = idx === imgIndex;
                    return (
                      <Pressable
                        key={`${uri}_thumb_${idx}`}
                        onPress={() => setImgIndex(idx)}
                        className={`mr-2.5 rounded-[12px] overflow-hidden border-2 ${
                          isActive
                            ? "border-[rgba(59,130,246,0.95)] opacity-100"
                            : "border-[rgba(255,255,255,0.12)] opacity-70"
                        }`}
                      >
                        <Image source={{ uri }} className="w-[64px] h-[48px]" resizeMode="cover" />
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            </>
          )}
        </View>
      </Modal>

      {/* ✅ Center Calendar Modal (fixed height via 6-week grid + footer space) */}
      <Modal visible={calOpen} transparent animationType="fade" onRequestClose={() => setCalOpen(false)}>
        <View className="flex-1 bg-[rgba(0,0,0,0.72)] items-center justify-center px-4">
          <Pressable onPress={() => setCalOpen(false)} className="absolute inset-0" />

          <View className="w-full max-w-[360px] rounded-[26px] overflow-hidden bg-[#0b1630] border border-[rgba(255,255,255,0.12)]">
            {/* header */}
            <View className="px-4 py-3 bg-[rgba(255,255,255,0.06)] border-b border-[rgba(255,255,255,0.10)] flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-white font-black text-[15px]">Select Date</Text>
                <Text className="text-white/60 font-extrabold text-[12px] mt-0.5">
                  {formatDmy(selectedDate)}
                </Text>
              </View>

              {/* keep X (not the footer Close button) */}
              <Pressable onPress={() => setCalOpen(false)} hitSlop={12} className="p-2">
                <Ionicons name="close" size={18} color="white" />
              </Pressable>
            </View>

            {/* body */}
            <View className="px-4 pt-3">
              {/* month row: arrows BACK but NOT round */}
              <View className="flex-row items-center justify-between">
                <Pressable
                  onPress={() => setCalMonth((p) => addMonths(p, -1))}
                  hitSlop={14}
                  className="p-2"
                >
                  <Ionicons name="chevron-back" size={18} color="white" />
                </Pressable>

                <Text className="text-white font-black text-[16px]">{fmtMonthTitle(calMonth)}</Text>

                <Pressable
                  onPress={() => {
                    if (!canGoNextMonth) return;
                    setCalMonth((p) => addMonths(p, 1));
                  }}
                  hitSlop={14}
                  className={`p-2 ${canGoNextMonth ? "opacity-100" : "opacity-35"}`}
                >
                  <Ionicons name="chevron-forward" size={18} color="white" />
                </Pressable>
              </View>

              {/* DOW */}
              <View className="flex-row mt-3">
                {DOW.map((d) => (
                  <View key={d} style={CELL_BASIS} className="items-center">
                    <Text className="text-white/55 font-black text-[11px]">{d.toUpperCase()}</Text>
                  </View>
                ))}
              </View>

              {/* grid (swipe enabled) */}
              <View {...panResponder.panHandlers} className="mt-2">
                <View className="flex-row flex-wrap">
                  {calCells.map((c, idx) => {
                    const isSel = !!c.ymd && c.ymd === selectedDate;
                    const isToday = !!c.ymd && c.ymd === todayYmd;
                    const count = c.ymd ? markedDays[c.ymd] || 0 : 0;
                    const isFuture = !!c.ymd && c.ymd > todayYmd;

                    return (
                      <View key={idx} style={CELL_BASIS} className={`${isFuture ? "opacity-35" : "opacity-100"} py-[6px]`}>
                        {c.day ? (
                          <Pressable
                            hitSlop={10}
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
                              width: DAY_SIZE,
                              height: DAY_SIZE,
                              alignSelf: "center",
                              alignItems: "center",
                              justifyContent: "center",

                              // ✅ default: NO circle / NO bg
                              backgroundColor: "transparent",
                              borderWidth: 0,
                              borderRadius: 0,

                              // ✅ selected: highlight ONLY on click (not round)
                              ...(isSel
                                ? {
                                    backgroundColor: "rgba(59,130,246,0.24)",
                                    borderWidth: 1,
                                    borderColor: "rgba(59,130,246,0.85)",
                                    borderRadius: 10, // not a full circle
                                  }
                                : null),

                              // ✅ today: ONLY today gets the round ring
                              ...(!isSel && isToday
                                ? {
                                    borderWidth: 1,
                                    borderColor: "rgba(34,197,94,0.95)",
                                    borderRadius: DAY_SIZE / 2,
                                  }
                                : null),
                            }}
                          >
                            <Text style={{ color: "white", fontWeight: "900", fontSize: 13 }}>
                              {c.day}
                            </Text>

                            {!isSel && count > 0 && (
                              <View
                                style={{
                                  position: "absolute",
                                  bottom: 4,
                                  width: 5,
                                  height: 5,
                                  borderRadius: 999,
                                  backgroundColor: "rgba(255,255,255,0.78)",
                                }}
                              />
                            )}
                          </Pressable>
                        ) : (
                          <View style={{ width: DAY_SIZE, height: DAY_SIZE, alignSelf: "center" }} />
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* footer (ONLY Today button) */}
              <View className="pt-3 pb-4 items-center">
                <Pressable
                  onPress={() => {
                    onChangeDate(todayYmd);
                    setCalOpen(false);
                  }}
                  style={{
                    width: 120, // ✅ reduced width
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
    </View>
  );
}
