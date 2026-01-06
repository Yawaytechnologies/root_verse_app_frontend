import React, { useMemo } from "react";
import { View, Text, ScrollView, useColorScheme } from "react-native";
import { useLocalSearchParams } from "expo-router";

function detectType(code: string) {
  const c = code.toUpperCase();
  if (c.includes("CRATE")) return "Crate";
  if (c.includes("BATCH") || c.includes("HB") || c.includes("MB")) return "Batch";
  if (c.includes("POND")) return "Pond";
  if (c.startsWith("RV-")) return "RootVerse Code";
  return "Unknown";
}

export default function TraceabilityDetails() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const bg = isDark ? "#050B16" : "#F5F7FB";
  const cardBg = isDark ? "#0B1220" : "#FFFFFF";
  const border = isDark ? "rgba(255,255,255,0.10)" : "#E2E8F0";
  const text = isDark ? "#E5E7EB" : "#0F172A";
  const sub = isDark ? "rgba(229,231,235,0.70)" : "#475569";

  const { code } = useLocalSearchParams<{ code?: string }>();

  const decoded = useMemo(() => {
    try {
      return decodeURIComponent(String(code ?? "")).trim();
    } catch {
      return String(code ?? "").trim();
    }
  }, [code]);

  const type = useMemo(() => detectType(decoded), [decoded]);

  // Dummy timeline (replace later with API)
  const timeline = [
    { t: "08:45", title: "Registered", desc: "Entity created in registry" },
    { t: "10:10", title: "Operation Logged", desc: "Feed/Health/Water entry recorded" },
    { t: "13:30", title: "Verified", desc: "Supervisor verification completed" },
    { t: "17:05", title: "Synced", desc: "Data synced to backend" },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: bg }} // ✅ prevents white flash
      contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header Card */}
      <View
        style={{
          backgroundColor: cardBg,
          borderColor: border,
          borderWidth: 1,
          borderRadius: 18,
          padding: 14,
        }}
      >
        <Text style={{ fontSize: 11, letterSpacing: 1, color: sub, fontWeight: "700" }}>
          TRACEABILITY
        </Text>

        <Text
          style={{
            marginTop: 6,
            fontSize: 18,
            fontWeight: "800",
            color: text,
          }}
          numberOfLines={2}
        >
          {decoded || "No code provided"}
        </Text>

        <Text style={{ marginTop: 6, fontSize: 13, color: sub }}>
          Type:{" "}
          <Text style={{ fontWeight: "800", color: text }}>
            {decoded ? type : "-"}
          </Text>
        </Text>
      </View>

      {/* Section Title */}
      <Text style={{ marginTop: 16, fontSize: 16, fontWeight: "800", color: text }}>
        Timeline
      </Text>
      <Text style={{ marginTop: 4, fontSize: 13, color: sub }}>
        This is demo data. Later we’ll fetch from your backend.
      </Text>

      {/* Timeline Cards */}
      <View style={{ marginTop: 12, gap: 10 }}>
        {timeline.map((item, idx) => (
          <View
            key={idx}
            style={{
              backgroundColor: cardBg,
              borderColor: border,
              borderWidth: 1,
              borderRadius: 18,
              padding: 14,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 14, fontWeight: "800", color: text }}>
                {item.title}
              </Text>
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 999,
                  backgroundColor: isDark ? "rgba(96,165,250,0.16)" : "rgba(37,99,235,0.10)",
                  borderWidth: 1,
                  borderColor: isDark ? "rgba(96,165,250,0.25)" : "rgba(37,99,235,0.18)",
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "800", color: isDark ? "#93C5FD" : "#2563EB" }}>
                  {item.t}
                </Text>
              </View>
            </View>

            <Text style={{ marginTop: 6, fontSize: 13, color: sub }}>
              {item.desc}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
