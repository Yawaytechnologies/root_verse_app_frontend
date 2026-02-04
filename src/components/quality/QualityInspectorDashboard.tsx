// src/components/quality/QualityInspectorDashboard.tsx
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import QcListScreen from "./QcListScreen";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { fetchQcMe, selectInspector as selectQcInspector } from "../../store/qualityAuth/qualityAuth.slice";
import QcScannerScreen from "./QcScannerScreen";

import { getQcFillQueue, type QcFillQueuedItem, deriveTabFromPayload } from "../../utils/qcFillQueue";

export type Division = "WILD" | "AQUA" | "MARICULTURE";

export type InspectorInfo = {
  name: string;
  state_id?: number;
  district_id?: number;
  state_name?: string;
  district_name?: string;
  id: string;
  divisionLabel: string;
};

type Props = {
  division: Division;
  inspector: InspectorInfo;
  totalInspections: number;
  completed: any[];
  onViewInspection: (id: string) => void;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function toYmdLocal(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatZone(i: InspectorInfo) {
  const dName = (i.district_name || "").trim();
  const sName = (i.state_name || "").trim();

  if (dName && sName) return `${dName}, ${sName}`;
  if (sName) return sName;
  if (dName) return dName;

  const dId = typeof i.district_id === "number" ? String(i.district_id) : "";
  const sId = typeof i.state_id === "number" ? String(i.state_id) : "";

  if (dId && sId) return `District #${dId}, State #${sId}`;
  if (sId) return `State #${sId}`;
  if (dId) return `District #${dId}`;
  return "—";
}

type TabKey = "scanner" | "checked" | "pending" | "rejected";

function upper(v: any) {
  return String(v ?? "").trim().toUpperCase();
}

export default function QualityInspectorDashboard({ division, inspector }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useMemo(() => getTheme(division), [division]);

  const dispatch = useAppDispatch();
  const qc = useAppSelector(selectQcInspector);

  useEffect(() => {
    if (!qc?.checker_code) dispatch(fetchQcMe());
  }, [dispatch, qc?.checker_code]);

  const mergedInspector: InspectorInfo = useMemo(() => {
    const name = inspector?.name || qc?.checker_name || "Inspector";
    const id = inspector?.id || qc?.checker_code || "";
    return {
      ...inspector,
      name,
      id,
      state_id: inspector.state_id ?? qc?.state_id,
      district_id: inspector.district_id ?? qc?.district_id,
      state_name: inspector.state_name ?? qc?.state_name,
      district_name: inspector.district_name ?? qc?.district_name,
    };
  }, [inspector, qc]);

  const [tab, setTab] = useState<TabKey>("scanner");
  const [lang, setLang] = useState<"en" | "ta">("en");

  const [selectedDate, setSelectedDate] = useState<string>(() => todayYmd());
  const [editDraft, setEditDraft] = useState<{ qrCode: string; payload: any } | null>(null);

  const zoneText = useMemo(() => formatZone(mergedInspector), [mergedInspector]);

  const [counts, setCounts] = useState({ total: 0, checked: 0, pending: 0, rejected: 0 });

  const refreshCounts = async () => {
    try {
      const q: QcFillQueuedItem[] = await getQcFillQueue();
      const ymd = String(selectedDate || "").trim();

      const divisionItems = q
        .filter((x) => upper(x.payload?.division) === upper(division))
        .filter((x) => {
          if (!ymd) return true;
          const eventAt = (x.synced ? x.syncedAt : undefined) || x.updatedAt || x.createdAt || 0;
          return toYmdLocal(eventAt) === ymd;
        });

      let pending = 0;
      let checked = 0;
      let rejected = 0;

      for (const x of divisionItems) {
        const t = deriveTabFromPayload(x.payload);
        if (t === "pending") pending += 1;
        else if (t === "checked") checked += 1;
        else rejected += 1;
      }

      setCounts({
        total: divisionItems.length,
        checked,
        pending,
        rejected,
      });
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    refreshCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [division, tab, selectedDate]);

  useEffect(() => {
    let alive = true;
    const t = setInterval(() => {
      if (!alive) return;
      refreshCounts();
    }, 1200);

    return () => {
      alive = false;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [division, selectedDate]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#030712" }} edges={["top"]}>
      <View
        style={{
          paddingTop: Platform.OS === "android" ? Math.max(insets.top, 2) : 2,
          paddingHorizontal: 12,
          paddingBottom: 6,
          backgroundColor: "#071228",
          borderBottomWidth: 1,
          borderBottomColor: "rgba(255,255,255,0.06)",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View
              style={{
                height: 42,
                width: 42,
                borderRadius: 16,
                backgroundColor: "rgba(14,165,233,0.18)",
                borderWidth: 1,
                borderColor: "#3b82f6",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="shield-checkmark-outline" size={22} color="#fff" />
            </View>

            <View style={{ marginTop: -2 }}>
              <Text style={{ color: "white", fontSize: 18, fontWeight: "900" }}>
                Quality{"\n"}Inspector
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.55)" }}>{mergedInspector.divisionLabel}</Text>
            </View>
          </View>

          <Pressable
            onPress={() => setLang((p) => (p === "en" ? "ta" : "en"))}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 7,
              borderRadius: 14,
              backgroundColor: "rgba(255,255,255,0.06)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.10)",
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginTop: -2,
            }}
          >
            <Text style={{ color: "rgba(255,255,255,0.85)", fontWeight: "900", fontSize: 13 }}>EN</Text>

            <View
              style={{
                height: 20,
                width: 44,
                borderRadius: 999,
                backgroundColor: "rgba(255,255,255,0.10)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.10)",
                justifyContent: "center",
              }}
            >
              <View
                style={{
                  height: 16,
                  width: 16,
                  borderRadius: 999,
                  backgroundColor: "#3b82f6",
                  marginLeft: lang === "en" ? 3 : 25,
                }}
              />
            </View>

            <Text style={{ color: "rgba(255,255,255,0.75)", fontWeight: "900", fontSize: 11 }}>தமிழ்</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}>
        <View
          style={{
            backgroundColor: theme.bannerFrom,
            borderBottomWidth: 1,
            borderBottomColor: "rgba(255,255,255,0.10)",
            paddingHorizontal: 14,
            paddingVertical: 12,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "white", fontSize: 28, fontWeight: "900", letterSpacing: -0.2 }}>
                {mergedInspector.name}
              </Text>

              <Text style={{ color: "rgba(255,255,255,0.92)", marginTop: 3, fontSize: 13 }}>
                {lang === "en" ? "Quality Inspector" : "தர ஆய்வாளர்"} • {zoneText}
              </Text>

              <Text style={{ color: "rgba(255,255,255,0.85)", marginTop: 2, fontSize: 12.5 }}>
                {lang === "en" ? "ID" : "ஐடி"}: {mergedInspector.id}
              </Text>

              {/* ✅ ALWAYS show date (including scanner tab) */}
              <Text style={{ color: "rgba(255,255,255,0.85)", marginTop: 6, fontSize: 12.5 }}>
                Date: {selectedDate}
              </Text>
            </View>

            <View style={{ width: 150, gap: 8 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <StatBox label={lang === "en" ? "Total" : "மொத்தம்"} value={counts.total} bg="#3E86E0" />
                <StatBox label={lang === "en" ? "Checked" : "சோதித்தது"} value={counts.checked} bg="#34A987" />
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <StatBox label={lang === "en" ? "Pending" : "நிலுவை"} value={counts.pending} bg="#D29B3B" />
                <StatBox label={lang === "en" ? "Rejected" : "நிராகரி"} value={counts.rejected} bg="#CF5A5A" />
              </View>
            </View>
          </View>
        </View>

        <View style={{ backgroundColor: "#071228", borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" }}>
          <View style={{ flexDirection: "row" }}>
            <MiniTab
              active={tab === "scanner"}
              label={lang === "en" ? "Scan" : "ஸ்கேன்"}
              icon="scan-outline"
              activeColor={theme.scannerActive}
              onPress={() => setTab("scanner")}
              lang={lang}
            />
            <MiniTab
              active={tab === "checked"}
              label={lang === "en" ? "Checked" : "சோதித்தது"}
              icon="checkmark-circle-outline"
              activeColor={theme.completedActive}
              onPress={() => setTab("checked")}
              lang={lang}
            />
            <MiniTab
              active={tab === "pending"}
              label={lang === "en" ? "Pending" : "நிலுவையில்"}
              icon="time-outline"
              activeColor={theme.pendingActive}
              onPress={() => setTab("pending")}
              lang={lang}
            />
            <MiniTab
              active={tab === "rejected"}
              label={lang === "en" ? "Rejected" : "நிராகரிப்பு"}
              icon="close-circle-outline"
              activeColor={theme.rejectedActive}
              onPress={() => setTab("rejected")}
              lang={lang}
            />
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
          {tab === "scanner" ? (
            <QcScannerScreen
              division={division}
              lang={lang as any}
              selectedDate={selectedDate}
              editDraft={editDraft}
              onEditDraftConsumed={() => setEditDraft(null)}
              onAfterSubmit={() => {
                refreshCounts();
              }}
            />
          ) : tab === "checked" ? (
            <QcListScreen
              division={division}
              lang={lang as any}
              status="checked"
              selectedDate={selectedDate}
              onChangeDate={setSelectedDate}
            />
          ) : tab === "pending" ? (
            <QcListScreen
              division={division}
              lang={lang as any}
              status="pending"
              selectedDate={selectedDate}
              onChangeDate={setSelectedDate}
              onEditItem={(draft) => {
                setEditDraft(draft);
                setTab("scanner");
              }}
            />
          ) : (
            <QcListScreen
              division={division}
              lang={lang as any}
              status="rejected"
              selectedDate={selectedDate}
              onChangeDate={setSelectedDate}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBox({ label, value, bg }: { label: string; value: number; bg: string }) {
  return (
    <View
      style={{
        flex: 1,
        borderRadius: 18,
        backgroundColor: bg,
        paddingVertical: 10,
        paddingHorizontal: 6,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOpacity: 0.28,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 6 },
        elevation: 8,
      }}
    >
      <Text style={{ color: "white", fontSize: 18, fontWeight: "900" }}>{value}</Text>

      <Text
        numberOfLines={1}
        ellipsizeMode="clip"
        style={{
          color: "rgba(255,255,255,0.92)",
          fontWeight: "900",
          fontSize: 9.5,
          lineHeight: 11,
          marginTop: 2,
          textAlign: "center",
          ...(Platform.OS === "android" ? ({ includeFontPadding: false } as any) : null),
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function MiniTab({
  active,
  label,
  icon,
  activeColor,
  onPress,
  lang,
}: {
  active: boolean;
  label: string;
  icon: any;
  activeColor: string;
  onPress: () => void;
  lang: "en" | "ta";
}) {
  const isTamil = lang === "ta";

  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        paddingVertical: 10,
        alignItems: "stretch",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          width: "100%",
          paddingHorizontal: 8,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "flex-start",
          gap: 8,
        }}
      >
        <Ionicons name={icon} size={17} color={active ? activeColor : "rgba(255,255,255,0.55)"} />

        <Text
          numberOfLines={1}
          ellipsizeMode="clip"
          style={{
            flex: 1,
            color: active ? activeColor : "rgba(255,255,255,0.55)",
            fontWeight: "900",
            fontSize: isTamil ? 11 : 14,
            lineHeight: isTamil ? 13 : 16,
            textAlign: "left",
            ...(Platform.OS === "android" ? ({ includeFontPadding: false } as any) : null),
          }}
        >
          {label}
        </Text>
      </View>

      <View style={{ marginTop: 8, height: 3, width: "100%", backgroundColor: active ? activeColor : "transparent" }} />
    </Pressable>
  );
}

function getTheme(division: Division) {
  if (division === "AQUA")
    return {
      bannerFrom: "#1D4ED8",
      scannerActive: "#3b82f6",
      completedActive: "#34D399",
      pendingActive: "#FBBF24",
      rejectedActive: "#F87171",
    };
  if (division === "MARICULTURE")
    return {
      bannerFrom: "#A855F7",
      scannerActive: "#3b82f6",
      completedActive: "#34D399",
      pendingActive: "#FBBF24",
      rejectedActive: "#F87171",
    };
  return {
    bannerFrom: "#0EA5A4",
    scannerActive: "#3b82f6",
    completedActive: "#34D399",
    pendingActive: "#FBBF24",
    rejectedActive: "#F87171",
  };
}
