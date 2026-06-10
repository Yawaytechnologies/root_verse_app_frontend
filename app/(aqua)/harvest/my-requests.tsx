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
  getHarvestRequests,
  HarvestRequest,
} from "../../../src/services/aqua/harvest.service";

function formatValue(value: any) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return String(value);
}

function getStatusText(item: HarvestRequest) {
  return (
    item.booking_status ||
    item.status ||
    (item.trader_id ? "Trader Assigned" : "Waiting Trader")
  );
}

export default function MyHarvestRequestsScreen() {
  const [requests, setRequests] = useState<HarvestRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRequests = useCallback(async () => {
    try {
      const result = await getHarvestRequests();
      setRequests(result.data || []);
    } catch (error: any) {
      Alert.alert("Failed", error?.message || "Unable to fetch harvest records.");
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
        <Text style={styles.title}>Harvest Requests</Text>

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
            <Text style={styles.emptyTitle}>No Harvest Records</Text>
            <Text style={styles.emptyText}>
              Scan Pond QR and create your first harvest request.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const statusText = getStatusText(item);
          const assigned = Boolean(item.trader_id);

          return (
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>Harvest #{item.id}</Text>

                <View
                  style={[
                    styles.statusBadge,
                    assigned && styles.acceptedBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      assigned && styles.acceptedText,
                    ]}
                  >
                    {statusText}
                  </Text>
                </View>
              </View>

              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  QR Code: {formatValue(item.qr_code)}
                </Text>
                <Text style={styles.infoText}>
                  QR Code ID: {formatValue(item.qr_code_id)}
                </Text>
                <Text style={styles.infoText}>
                  Culture ID: {formatValue(item.culture_cycle_id || item.culture_id)}
                </Text>
                <Text style={styles.infoText}>
                  Culture Code: {formatValue(item.culture_code)}
                </Text>
                <Text style={styles.infoText}>
                  Culture Status: {formatValue(item.culture_verification_status)}
                </Text>
              </View>

              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  Farmer: {formatValue(item.farmer_name || item.farmer_id)}
                </Text>
                <Text style={styles.infoText}>
                  Farm: {formatValue(item.farm_name || item.farm_id)}
                </Text>
                <Text style={styles.infoText}>
                  Pond: {formatValue(item.pond_name || item.pond_id)}
                </Text>
                <Text style={styles.infoText}>
                  Pond Code: {formatValue(item.pond_code)}
                </Text>
              </View>

              <View style={styles.harvestBox}>
                <Text style={styles.harvestLabel}>Harvest Details</Text>
                <Text style={styles.harvestValue}>
                  {formatValue(item.harvest_method)} / {formatValue(item.species)}
                </Text>

                <Text style={styles.infoText}>
                  DOC: {formatValue(item.DOC)}
                </Text>
                <Text style={styles.infoText}>
                  Expected Size: {formatValue(item.expected_size)}
                </Text>
                <Text style={styles.infoText}>
                  Expected Biomass: {formatValue(item.expected_biomass)}
                </Text>
                <Text style={styles.infoText}>
                  Preferred Time: {formatValue(item.preferred_harvest_time)}
                </Text>
                <Text style={styles.infoText}>
                  Stocking Date: {formatValue(item.stocking_date)}
                </Text>
                <Text style={styles.infoText}>
                  Reason: {formatValue(item.harvest_reason)}
                </Text>
              </View>

              {item.trader_id ? (
                <View style={styles.traderBox}>
                  <Text style={styles.harvestLabel}>Trader Details</Text>
                  <Text style={styles.infoText}>
                    Trader ID: {formatValue(item.trader_id)}
                  </Text>
                  <Text style={styles.infoText}>
                    Trader Code: {formatValue(item.trader_code)}
                  </Text>
                  <Text style={styles.infoText}>
                    Trader Name: {formatValue(item.trader_name)}
                  </Text>
                  <Text style={styles.infoText}>
                    Trader Mobile: {formatValue(item.trader_mobile)}
                  </Text>
                </View>
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
  infoBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },
  infoText: {
    color: "#374151",
    fontSize: 14,
    marginTop: 5,
    lineHeight: 20,
  },
  harvestBox: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
  },
  traderBox: {
    backgroundColor: "#ECFDF5",
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
  },
  harvestLabel: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "800",
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
    fontWeight: "700",
    marginTop: 10,
  },
});