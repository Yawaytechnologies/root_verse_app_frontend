import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { httpJson } from "../../services/http"; // ✅ adjust path if needed
import { FullRow, TwoColRow, fmtDate, fmtTime, type Division, type Lang } from "./QualityUI";

type TabStatus = "pending" | "completed" | "rejected";

type ListItem = {
  code: string;
  vessel_name?: string;
  fish_name?: string;
  checked_at?: string;
  qc_result?: string;
};

export default function QcListScreen({
  division,
  lang,
  status,
}: {
  division: Division;
  lang: Lang;
  status: TabStatus;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ListItem[]>([]);

  // details modal
  const [open, setOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState<string>("");
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [details, setDetails] = useState<any>(null);

  const title =
    status === "pending"
      ? lang === "en"
        ? "Pending Inspections"
        : "நிலுவை பரிசோதனைகள்"
      : status === "completed"
        ? lang === "en"
          ? "Completed Inspections"
          : "முடிந்த பரிசோதனைகள்"
        : lang === "en"
          ? "Rejected Inspections"
          : "நிராகரிக்கப்பட்ட பரிசோதனைகள்";

  const close = () => {
    setOpen(false);
    setSelectedCode("");
    setDetails(null);
    setDetailsLoading(false);
  };

  const fetchList = async () => {
    setLoading(true);
    setError(null);
    try {
      // ✅ CHANGE THIS ENDPOINT to your backend list API
      // Example: /api/qc/list?division=AQUA&status=pending
      const res = await httpJson<any>(
        `/api/qc/list?division=${encodeURIComponent(division)}&status=${encodeURIComponent(status)}`
      );

      const list: ListItem[] = res?.items ?? res?.data ?? [];
      setItems(Array.isArray(list) ? list : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load list");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetails = async (code: string) => {
    setDetailsLoading(true);
    setDetails(null);
    try {
      // ✅ CHANGE THIS ENDPOINT to your backend details API
      const res = await httpJson<any>(`/api/filled/${encodeURIComponent(code)}`);
      const qr = res?.qr ?? res?.data ?? res;
      if (!qr) throw new Error("No details found");
      setDetails(qr);
    } catch (e: any) {
      Alert.alert("Not Found", e?.message || "No details for this QR");
      setDetails(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [division, status]);

  return (
    <View style={{ marginTop: 12 }}>
      <Text style={{ color: "white", fontWeight: "900", fontSize: 18 }}>{title}</Text>

      {loading ? (
        <View style={{ marginTop: 14 }}>
          <ActivityIndicator />
        </View>
      ) : error ? (
        <Text style={{ marginTop: 14, color: "rgba(248,113,113,0.95)", fontWeight: "900" }}>
          {error}
        </Text>
      ) : (
        <ScrollView style={{ marginTop: 12 }} contentContainerStyle={{ paddingBottom: 60 }}>
          {items.length === 0 ? (
            <View
              style={{
                marginTop: 14,
                padding: 14,
                borderRadius: 18,
                backgroundColor: "rgba(255,255,255,0.06)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.10)",
              }}
            >
              <Text style={{ color: "rgba(255,255,255,0.7)", fontWeight: "800" }}>
                {lang === "en" ? "No records." : "பதிவுகள் இல்லை."}
              </Text>
            </View>
          ) : (
            items.map((it) => (
              <Pressable
                key={it.code}
                style={{
                  marginBottom: 10,
                  padding: 14,
                  borderRadius: 18,
                  backgroundColor: "rgba(255,255,255,0.06)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.10)",
                }}
                onPress={() => {
                  setSelectedCode(it.code);
                  setOpen(true);
                  fetchDetails(it.code);
                }}
              >
                <Text style={{ color: "white", fontWeight: "900" }}>{it.code}</Text>
                <Text style={{ color: "rgba(255,255,255,0.65)", marginTop: 6, fontWeight: "700" }}>
                  {it.vessel_name || "—"} • {it.fish_name || "—"}
                </Text>
                {!!it.qc_result && (
                  <Text style={{ color: "rgba(255,255,255,0.65)", marginTop: 4, fontWeight: "700" }}>
                    Result: {it.qc_result}
                  </Text>
                )}
              </Pressable>
            ))
          )}
        </ScrollView>
      )}

      {/* Details Modal */}
      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", padding: 14, justifyContent: "center" }}>
          <View
            style={{
              maxHeight: "88%",
              borderRadius: 22,
              overflow: "hidden",
              backgroundColor: "#0b1630",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.10)",
            }}
          >
            <View
              style={{
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: "rgba(255,255,255,0.08)",
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: "white", fontWeight: "900", fontSize: 18 }}>
                  {lang === "en" ? "Inspection Details" : "பரிசோதனை விவரங்கள்"}
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.6)", marginTop: 4, fontWeight: "700" }}>
                  {selectedCode}
                </Text>
              </View>

              <Pressable onPress={close} style={{ padding: 10 }}>
                <Text style={{ color: "rgba(255,255,255,0.85)", fontWeight: "900", fontSize: 18 }}>✕</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 18 }} showsVerticalScrollIndicator>
              {detailsLoading ? (
                <View style={{ marginTop: 18, flexDirection: "row", alignItems: "center" }}>
                  <ActivityIndicator />
                  <Text style={{ marginLeft: 10, color: "rgba(255,255,255,0.7)", fontWeight: "700" }}>
                    Loading…
                  </Text>
                </View>
              ) : !details ? (
                <Text style={{ marginTop: 12, color: "rgba(255,255,255,0.7)", fontWeight: "800" }}>
                  No details.
                </Text>
              ) : (
                <View
                  style={{
                    borderRadius: 18,
                    padding: 14,
                    backgroundColor: "rgba(255,255,255,0.05)",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.08)",
                  }}
                >
                  <TwoColRow
                    left={{ label: "Vessel", value: details.vessel_name ?? "—" }}
                    right={{ label: "Fish", value: details.fish_name ?? "—" }}
                  />
                  <TwoColRow
                    left={{ label: "Weight", value: details.weight ? `${details.weight} kg` : "—" }}
                    right={{ label: "Date / Time", value: `${fmtDate(details.date)} • ${fmtTime(details.time)}` }}
                  />

                  <TwoColRow
                    left={{ label: "QC Status", value: details.qc_status ?? "—" }}
                    right={{ label: "QC Result", value: details.qc_result ?? "—" }}
                  />

                  <TwoColRow
                    left={{ label: "Grade", value: details.quality_grade ?? "—" }}
                    right={{ label: "Score", value: String(details.qc_score ?? "—") }}
                  />

                  <FullRow label="Reject Reason" value={details.qr_reject_reason ?? details.reject_reason ?? "—"} />
                  <FullRow label="Remarks" value={details.qc_remarks ?? "—"} />

                  {!!details.image_url && (
                    <View style={{ marginTop: 14 }}>
                      <Text style={{ color: "rgba(255,255,255,0.55)", fontWeight: "700" }}>Profile Image</Text>
                      <Image
                        source={{ uri: details.image_url }}
                        style={{ marginTop: 10, width: "100%", height: 160, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.06)" }}
                        resizeMode="cover"
                      />
                    </View>
                  )}
                </View>
              )}
            </ScrollView>

            <View style={{ padding: 14, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)" }}>
              <Pressable
                onPress={close}
                style={{
                  paddingVertical: 14,
                  borderRadius: 16,
                  backgroundColor: "rgba(255,255,255,0.07)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.10)",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "white", fontWeight: "900" }}>{lang === "en" ? "Close" : "மூடு"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
