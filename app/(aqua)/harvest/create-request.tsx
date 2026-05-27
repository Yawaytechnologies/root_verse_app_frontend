import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  createHarvestRequestFromPondQr,
  HarvestMethod,
} from "../../../src/services/aqua/harvest.service";

export default function CreateHarvestRequestScreen() {
  const params = useLocalSearchParams<{ qr_code?: string }>();

  const qrCode = useMemo(() => {
    return String(params.qr_code || "").trim();
  }, [params.qr_code]);

  const [preferredHarvestTime, setPreferredHarvestTime] = useState(
    new Date().toISOString()
  );
  const [expectedSize, setExpectedSize] = useState("");
  const [expectedBiomass, setExpectedBiomass] = useState("");
  const [harvestMethod, setHarvestMethod] = useState<HarvestMethod>("PARTIAL");
  const [harvestReason, setHarvestReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!qrCode) {
      Alert.alert("Missing QR", "Please scan Pond QR again.");
      return;
    }

    if (!preferredHarvestTime.trim()) {
      Alert.alert("Required", "Preferred harvest time is required.");
      return;
    }

    const sizeNumber = Number(expectedSize);
    const biomassNumber = Number(expectedBiomass);

    if (!sizeNumber || sizeNumber <= 0) {
      Alert.alert("Invalid Size", "Expected size must be greater than zero.");
      return;
    }

    if (!biomassNumber || biomassNumber <= 0) {
      Alert.alert(
        "Invalid Biomass",
        "Expected biomass must be greater than zero."
      );
      return;
    }

    try {
      setLoading(true);

      await createHarvestRequestFromPondQr({
        qr_code: qrCode,
        preferred_harvest_time: preferredHarvestTime.trim(),
        expected_size: sizeNumber,
        expected_biomass: biomassNumber,
        harvest_method: harvestMethod,
        harvest_reason: harvestReason.trim(),
      });

      Alert.alert(
        "Request Created",
        "Harvest request submitted. Waiting for trader confirmation."
      );

      router.replace("/(aqua)/harvest/my-requests");
    } catch (error: any) {
      Alert.alert("Failed", error?.message || "Unable to create request.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Harvest Request</Text>
        <Text style={styles.subtitle}>
          Pond QR scanned successfully. Fill harvest details and submit request.
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>Scanned Pond QR</Text>
          <Text style={styles.qrText}>{qrCode || "No QR found"}</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Preferred Harvest Time</Text>
          <TextInput
            style={styles.input}
            value={preferredHarvestTime}
            onChangeText={setPreferredHarvestTime}
            placeholder="2026-05-30T09:30:00.000Z"
            autoCapitalize="none"
          />
          <Text style={styles.helpText}>
            Use ISO format. Example: 2026-05-30T09:30:00.000Z
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Expected Size</Text>
          <TextInput
            style={styles.input}
            value={expectedSize}
            onChangeText={setExpectedSize}
            placeholder="Example: 25"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Expected Biomass</Text>
          <TextInput
            style={styles.input}
            value={expectedBiomass}
            onChangeText={setExpectedBiomass}
            placeholder="Example: 1200"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Harvest Method</Text>

          <View style={styles.methodRow}>
            <TouchableOpacity
              style={[
                styles.methodButton,
                harvestMethod === "PARTIAL" && styles.methodButtonActive,
              ]}
              onPress={() => setHarvestMethod("PARTIAL")}
            >
              <Text
                style={[
                  styles.methodText,
                  harvestMethod === "PARTIAL" && styles.methodTextActive,
                ]}
              >
                Partial
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.methodButton,
                harvestMethod === "FULL" && styles.methodButtonActive,
              ]}
              onPress={() => setHarvestMethod("FULL")}
            >
              <Text
                style={[
                  styles.methodText,
                  harvestMethod === "FULL" && styles.methodTextActive,
                ]}
              >
                Full
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Harvest Reason</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={harvestReason}
            onChangeText={setHarvestReason}
            placeholder="Reason for harvest"
            multiline
            textAlignVertical="top"
          />
        </View>

        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            Harvest ID will be generated only after trader accepts this request.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Harvest Request</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelButtonText}>Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#F7F8FA",
  },
  container: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
  },
  subtitle: {
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
    marginTop: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  qrText: {
    fontSize: 15,
    color: "#111827",
    marginTop: 6,
    fontWeight: "700",
  },
  inputGroup: {
    marginTop: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: "#111827",
  },
  textArea: {
    minHeight: 100,
  },
  helpText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 6,
  },
  methodRow: {
    flexDirection: "row",
    gap: 12,
  },
  methodButton: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  methodButtonActive: {
    backgroundColor: "#16A34A",
    borderColor: "#16A34A",
  },
  methodText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#374151",
  },
  methodTextActive: {
    color: "#FFFFFF",
  },
  warningBox: {
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#F59E0B",
    borderRadius: 12,
    padding: 14,
    marginTop: 22,
  },
  warningText: {
    color: "#92400E",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 19,
  },
  submitButton: {
    backgroundColor: "#16A34A",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 24,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  disabledButton: {
    opacity: 0.6,
  },
  cancelButton: {
    backgroundColor: "#E5E7EB",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },
  cancelButtonText: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "700",
  },
});