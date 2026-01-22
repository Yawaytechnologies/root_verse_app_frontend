import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import QcScannerScreen from "./QcScannerScreen";
import QcScanViewDetailsScreen from "./QcScanViewDetailsScreen";

export type Division = "WILD" | "AQUA" | "MARICULTURE";

export type InspectorInfo = {
  name: string;
  zone: string;
  id: string;
  divisionLabel: string;
};

export type CompletedInspection = {
  id: string;
  statusBadge: "Approved" | "Rejected";
  inspectedDate: string;
  tag?: string;
  title: string;
  farmer: string;
  quantity: string;
  waterTemp?: string;
  phLevel?: string;
  grade?: string;
  qualityGrade: string;
};

type Props = {
  division: Division;
  inspector: InspectorInfo;
  totalInspections: number; // pass completed.length
  completed: CompletedInspection[];
  onViewInspection: (id: string) => void;
};

export default function QualityInspectorDashboard({
  division,
  inspector,
  totalInspections,
  completed,
  onViewInspection,
}: Props) {
  const insets = useSafeAreaInsets();
  const theme = useMemo(() => getTheme(division), [division]);

  // ✅ 3 tabs now
  const [tab, setTab] = useState<"scanner" | "completed" | "scan_view">("scanner");
  const [lang, setLang] = useState<"en" | "ta">("en");

  const completedCount = completed.length;

  // ✅ safe camera import (web-safe)
  const CameraView = useMemo(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require("expo-camera");
      return mod?.CameraView || mod?.Camera || null;
    } catch {
      return null;
    }
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#030712" }} edges={["top"]}>
      {/* ===== Header ===== */}
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
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
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
              <Text style={{ color: "rgba(255,255,255,0.55)" }}>
                {inspector.divisionLabel}
              </Text>
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
            <Text style={{ color: "rgba(255,255,255,0.85)", fontWeight: "900" }}>
              EN
            </Text>

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

            <Text style={{ color: "rgba(255,255,255,0.75)", fontWeight: "900" }}>
              தமிழ்
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}
      >
        {/* ===== Banner ===== */}
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
              <Text
                style={{
                  color: "white",
                  fontSize: 28,
                  fontWeight: "900",
                  letterSpacing: -0.2,
                }}
              >
                {inspector.name}
              </Text>

              <Text
                style={{
                  color: "rgba(255,255,255,0.92)",
                  marginTop: 3,
                  fontSize: 13,
                }}
              >
                {lang === "en" ? "Quality Inspector" : "தர ஆய்வாளர்"} • {inspector.zone}
              </Text>

              <Text
                style={{
                  color: "rgba(255,255,255,0.85)",
                  marginTop: 2,
                  fontSize: 12.5,
                }}
              >
                {lang === "en" ? "ID" : "ஐடி"}: {inspector.id}
              </Text>
            </View>

            <View
              style={{
                width: 128,
                borderRadius: 18,
                backgroundColor: "rgba(255,255,255,0.18)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.12)",
                paddingVertical: 10,
                paddingHorizontal: 10,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  color: "white",
                  fontSize: 30,
                  fontWeight: "900",
                  lineHeight: 32,
                }}
              >
                {totalInspections}
              </Text>
              <Text
                style={{
                  color: "rgba(255,255,255,0.88)",
                  fontWeight: "900",
                  textAlign: "center",
                  fontSize: 12,
                }}
              >
                {lang === "en" ? "Total Inspections" : "மொத்த ஆய்வுகள்"}
              </Text>
            </View>
          </View>
        </View>

        {/* ===== Tabs ===== */}
        <View
          style={{
            backgroundColor: "#071228",
            borderBottomWidth: 1,
            borderBottomColor: "rgba(255,255,255,0.06)",
          }}
        >
          <View style={{ flexDirection: "row" }}>
            <MiniTab
              active={tab === "scanner"}
              label={lang === "en" ? "Scanner" : "ஸ்கேனர்"}
              icon="scan-outline"
              activeColor={theme.scannerActive}
              onPress={() => setTab("scanner")}
            />

            <MiniTab
              active={tab === "completed"}
              label={`${lang === "en" ? "Completed" : "நிறைவு"} (${completedCount})`}
              icon="checkmark-done-outline"
              activeColor={theme.completedActive}
              onPress={() => setTab("completed")}
            />

            <MiniTab
              active={tab === "scan_view"}
              label={lang === "en" ? "Scan & View" : "ஸ்கேன் & காண்க"}
              icon="document-text-outline"
              activeColor={theme.scannerActive}
              onPress={() => setTab("scan_view")}
            />
          </View>
        </View>

        {/* ===== Content ===== */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
          {tab === "scanner" ? (
            // ✅ QC FORM SCANNER: no need to fetch details now, only popup form
            <QcScannerScreen division={division} lang={lang} />
          ) : tab === "completed" ? (
            <>
              <Text style={{ color: "white", fontSize: 22, fontWeight: "900" }}>
                {lang === "en" ? "Completed Inspections" : "நிறைவு ஆய்வுகள்"}
              </Text>

              <View style={{ marginTop: 12, gap: 14 }}>
                {completed.map((c) => (
                  <Card key={c.id}>
                    {/* keep your completed card UI exactly */}
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                        <Pill
                          text={c.statusBadge}
                          tone={c.statusBadge === "Approved" ? "approved" : "rejected"}
                        />
                        {!!c.tag && <Pill text={c.tag} tone="tag" />}
                      </View>

                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={{ color: "rgba(255,255,255,0.55)" }}>
                          Inspected:
                        </Text>
                        <Text style={{ color: "rgba(255,255,255,0.85)", fontWeight: "800" }}>
                          {c.inspectedDate}
                        </Text>
                      </View>
                    </View>

                    <Text
                      style={{
                        color: "white",
                        fontSize: 22,
                        fontWeight: "900",
                        marginTop: 12,
                      }}
                    >
                      {c.title}
                    </Text>

                    <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: 6 }}>
                      Farmer: {c.farmer}
                    </Text>

                    {division === "AQUA" ? (
                      <>
                        <View style={{ flexDirection: "row", marginTop: 14, gap: 12 }}>
                          <Info label="Quantity" value={c.quantity || "—"} />
                          <Info label="Water Temp" value={c.waterTemp ?? "—"} />
                        </View>

                        <View style={{ flexDirection: "row", marginTop: 14, gap: 12 }}>
                          <Info label="pH Level" value={c.phLevel ?? "—"} />
                          <Info label="Grade" value={c.grade ?? "—"} />
                        </View>

                        <View style={{ marginTop: 14 }}>
                          <Text style={{ color: "rgba(255,255,255,0.55)" }}>Quality</Text>
                          <Text
                            style={{
                              color: "#34D399",
                              fontWeight: "900",
                              fontSize: 16,
                              marginTop: 4,
                            }}
                          >
                            {c.qualityGrade || "—"}
                          </Text>
                        </View>
                      </>
                    ) : (
                      <View style={{ marginTop: 14, gap: 12 }}>
                        <FieldRow label="Quantity" value={c.quantity || "—"} />
                        <FieldRow label="Grade" value={c.grade ?? "—"} />
                        <FieldRow
                          label="Quality"
                          value={c.qualityGrade || "—"}
                          valueColor="#34D399"
                        />
                      </View>
                    )}

                    <Pressable
                      onPress={() => onViewInspection(c.id)}
                      style={{
                        marginTop: 16,
                        paddingVertical: 12,
                        borderRadius: 16,
                        backgroundColor: "rgba(255,255,255,0.08)",
                        borderWidth: 1,
                        borderColor: "rgba(255,255,255,0.10)",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ color: "white", fontWeight: "900", fontSize: 15 }}>
                        View
                      </Text>
                    </Pressable>
                  </Card>
                ))}
              </View>
            </>
          ) : (
            // ✅ SCAN & VIEW DETAILS: scanner + manual input + fetch FILLED + show details
            <QcScanViewDetailsScreen division={division} lang={lang} />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ---------- small components ---------- */

function MiniTab({
  active,
  label,
  icon,
  activeColor,
  onPress,
}: {
  active: boolean;
  label: string;
  icon: any;
  activeColor: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        paddingVertical: 10,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Ionicons
          name={icon}
          size={17}
          color={active ? activeColor : "rgba(255,255,255,0.55)"}
        />
        <Text
          numberOfLines={1}
          style={{
            color: active ? activeColor : "rgba(255,255,255,0.55)",
            fontWeight: "900",
            fontSize: 14,
          }}
        >
          {label}
        </Text>
      </View>
      <View
        style={{
          marginTop: 8,
          height: 3,
          width: "100%",
          backgroundColor: active ? activeColor : "transparent",
        }}
      />
    </Pressable>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        borderRadius: 26,
        padding: 16,
        backgroundColor: "#071228",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.10)",
      }}
    >
      {children}
    </View>
  );
}

function Pill({ text, tone }: { text: string; tone: "tag" | "approved" | "rejected" }) {
  const bg =
    tone === "approved"
      ? "rgba(16, 185, 129, 0.16)"
      : tone === "rejected"
        ? "rgba(244, 63, 94, 0.16)"
        : "rgba(99, 102, 241, 0.16)";

  const fg =
    tone === "approved"
      ? "#34D399"
      : tone === "rejected"
        ? "#FB7185"
        : "#A5B4FC";

  return (
    <View
      style={{
        paddingVertical: 7,
        paddingHorizontal: 12,
        borderRadius: 999,
        backgroundColor: bg,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.10)",
      }}
    >
      <Text style={{ color: fg, fontWeight: "900" }}>{text}</Text>
    </View>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: "rgba(255,255,255,0.45)" }}>{label}</Text>
      <Text style={{ color: "white", fontWeight: "900", marginTop: 4, fontSize: 16 }}>
        {value}
      </Text>
    </View>
  );
}

function FieldRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View>
      <Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 13 }}>{label}</Text>
      <Text style={{ color: valueColor ?? "white", fontWeight: "900", marginTop: 4, fontSize: 16 }}>
        {value}
      </Text>
    </View>
  );
}

function getTheme(division: Division) {
  if (division === "AQUA")
    return { bannerFrom: "#1D4ED8", scannerActive: "#3b82f6", completedActive: "#34D399" };
  if (division === "MARICULTURE")
    return { bannerFrom: "#A855F7", scannerActive: "#3b82f6", completedActive: "#34D399" };
  return { bannerFrom: "#0EA5A4", scannerActive: "#3b82f6", completedActive: "#34D399" };
}
