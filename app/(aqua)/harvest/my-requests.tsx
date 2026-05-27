import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import {
  getMyHarvestRequests,
  HarvestRequest,
} from "../../../src/services/aqua/harvest.service";

function getStatusLabel(status: string) {
  if (status === "PENDING_TRADER_CONFIRMATION") {
    return "Pending Trader Confirmation";
  }

  if (status === "ACCEPTED") {
    return "Accepted";
  }

  if (status === "REJECTED") {
    return "Rejected";
  }

  return status;
}

export default function MyHarvestRequestsScreen() {
  const [requests, setRequests] = useState<HarvestRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRequests = useCallback(async () => {
    try {
      const result = await getMyHarvestRequests();
      setRequests(result.data || []);
    } catch (error: any) {
      Alert.alert("Failed", error?.message || "Unable to fetch requests.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  function onRefresh() {
    setRefreshing(true);
    loadRequests();
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16A34A" />
        <Text style={styles.loadingText}>Loading harvest requests...</Text>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>My Harvest Requests</Text>

        <TouchableOpacity
          style={styles.scanButton}
          onPress={() => router.push("/(aqua)/harvest/scan-pond")}
        >
          <Text style={styles.scanButtonText}>Scan Pond QR</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={requests}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No Harvest Requests</Text>
            <Text style={styles.emptyText}>
              Scan Pond QR and create your first harvest request.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const accepted = item.status === "ACCEPTED";
          const rejected = item.status === "REJECTED";

          return (
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>
                  Request #{item.id}
                </Text>

                <View
                  style={[
                    styles.statusBadge,
                    accepted && styles.acceptedBadge,
                    rejected && styles.rejectedBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      accepted && styles.acceptedText,
                      rejected && styles.rejectedText,
                    ]}
                  >
                    {getStatusLabel(item.status)}
                  </Text>
                </View>
              </View>

              <Text style={styles.infoText}>
                Farm: {item.farm_name || item.farm_id}
              </Text>
              <Text style={styles.infoText}>
                Pond: {item.pond_name || item.pond_id}
              </Text>
              <Text style={styles.infoText}>
                Culture Cycle: {item.culture_cycle_id}
              </Text>
              <Text style={styles.infoText}>
                Method: {item.harvest_method}
              </Text>
              <Text style={styles.infoText}>
                Expected Size: {item.expected_size}
              </Text>
              <Text style={styles.infoText}>
                Expected Biomass: {item.expected_biomass}
              </Text>

              <View style={styles.harvestBox}>
                <Text style={styles.harvestLabel}>Harvest ID</Text>
                <Text style={styles.harvestValue}>
                  {item.harvest_id || "Not generated yet"}
                </Text>
              </View>

              {item.trader_id ? (
                <Text style={styles.infoText}>Trader ID: {item.trader_id}</Text>
              ) : null}

              {item.rejection_reason ? (
                <Text style={styles.rejectReason}>
                  Reason: {item.rejection_reason}
                </Text>
              ) : null}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#F7F8FA",
  },
  center: {
    flex: 1,
    backgroundColor: "#F7F8FA",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#6B7280",
    fontSize: 14,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  title: {
    fontSize: 23,
    fontWeight: "800",
    color: "#111827",
  },
  scanButton: {
    backgroundColor: "#16A34A",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 16,
  },
  scanButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
  },
  statusBadge: {
    backgroundColor: "#FEF3C7",
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  statusText: {
    color: "#92400E",
    fontSize: 11,
    fontWeight: "800",
  },
  acceptedBadge: {
    backgroundColor: "#DCFCE7",
  },
  acceptedText: {
    color: "#166534",
  },
  rejectedBadge: {
    backgroundColor: "#FEE2E2",
  },
  rejectedText: {
    color: "#991B1B",
  },
  infoText: {
    color: "#374151",
    fontSize: 14,
    marginTop: 5,
  },
  harvestBox: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
  },
  harvestLabel: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "700",
  },
  harvestValue: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 4,
  },
  rejectReason: {
    color: "#991B1B",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 10,
  },
});