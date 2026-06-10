import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  getPendingTraderHarvestRequests,
  HarvestRequest,
  traderConfirmHarvestRequest,
} from "../../../src/services/aqua/harvest.service";

export default function TraderPendingHarvestRequestsScreen() {
  const [requests, setRequests] = useState<HarvestRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedRejectRequest, setSelectedRejectRequest] =
    useState<HarvestRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const loadRequests = useCallback(async () => {
    try {
      const result = await getPendingTraderHarvestRequests();
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

  async function handleAccept(item: HarvestRequest) {
    Alert.alert(
      "Accept Harvest Request",
      "Harvest ID will be generated after acceptance.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Accept",
          onPress: async () => {
            try {
              setActionLoadingId(item.id);

              const result = await traderConfirmHarvestRequest(item.id, {
                action: "ACCEPT",
              });

              Alert.alert(
                "Accepted",
                `Harvest ID generated: ${result.data?.harvest_id || "-"}`
              );

              loadRequests();
            } catch (error: any) {
              Alert.alert(
                "Failed",
                error?.message || "Unable to accept request."
              );
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ]
    );
  }

  function openRejectModal(item: HarvestRequest) {
    setSelectedRejectRequest(item);
    setRejectionReason("");
    setRejectModalVisible(true);
  }

  async function handleRejectSubmit() {
    if (!selectedRejectRequest) return;

    if (!rejectionReason.trim()) {
      Alert.alert("Required", "Please enter rejection reason.");
      return;
    }

    try {
      setActionLoadingId(selectedRejectRequest.id);

      await traderConfirmHarvestRequest(selectedRejectRequest.id, {
        action: "REJECT",
        rejection_reason: rejectionReason.trim(),
      });

      setRejectModalVisible(false);
      setSelectedRejectRequest(null);
      setRejectionReason("");

      Alert.alert("Rejected", "Harvest request rejected. No Harvest ID generated.");

      loadRequests();
    } catch (error: any) {
      Alert.alert("Failed", error?.message || "Unable to reject request.");
    } finally {
      setActionLoadingId(null);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16A34A" />
        <Text style={styles.loadingText}>Loading pending harvest requests...</Text>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>Pending Harvest Requests</Text>
        <Text style={styles.subtitle}>
          Accepting a request will generate Harvest ID.
        </Text>
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
            <Text style={styles.emptyTitle}>No Pending Requests</Text>
            <Text style={styles.emptyText}>
              Pending farmer harvest requests will appear here.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isLoading = actionLoadingId === item.id;

          return (
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>Request #{item.id}</Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>Pending</Text>
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
              <Text style={styles.infoText}>
                Preferred Time: {item.preferred_harvest_time}
              </Text>

              {item.harvest_reason ? (
                <Text style={styles.reasonText}>
                  Reason: {item.harvest_reason}
                </Text>
              ) : null}

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.acceptButton, isLoading && styles.disabledButton]}
                  onPress={() => handleAccept(item)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.acceptButtonText}>Accept</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.rejectButton, isLoading && styles.disabledButton]}
                  onPress={() => openRejectModal(item)}
                  disabled={isLoading}
                >
                  <Text style={styles.rejectButtonText}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reject Harvest Request</Text>
            <Text style={styles.modalSubtitle}>
              No Harvest ID will be generated for rejected request.
            </Text>

            <TextInput
              style={styles.rejectInput}
              value={rejectionReason}
              onChangeText={setRejectionReason}
              placeholder="Enter rejection reason"
              multiline
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={styles.modalRejectButton}
              onPress={handleRejectSubmit}
              disabled={actionLoadingId !== null}
            >
              {actionLoadingId !== null ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.modalRejectButtonText}>Submit Rejection</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setRejectModalVisible(false)}
              disabled={actionLoadingId !== null}
            >
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 6,
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
  infoText: {
    color: "#374151",
    fontSize: 14,
    marginTop: 5,
  },
  reasonText: {
    color: "#111827",
    fontSize: 14,
    marginTop: 10,
    fontWeight: "600",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: "#16A34A",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  acceptButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  rejectButton: {
    flex: 1,
    backgroundColor: "#FEE2E2",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  rejectButtonText: {
    color: "#991B1B",
    fontSize: 15,
    fontWeight: "800",
  },
  disabledButton: {
    opacity: 0.6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#111827",
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 6,
    lineHeight: 19,
  },
  rejectInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 100,
    fontSize: 15,
    color: "#111827",
    marginTop: 16,
  },
  modalRejectButton: {
    backgroundColor: "#DC2626",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
  },
  modalRejectButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  modalCancelButton: {
    backgroundColor: "#E5E7EB",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  modalCancelButtonText: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "800",
  },
});