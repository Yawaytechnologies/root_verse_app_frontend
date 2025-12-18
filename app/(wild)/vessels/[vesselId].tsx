import { useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import { ownersDummy, vesselsDummy } from "../../../src/data/wild/vessels.dummy";

function Field({ label, value }: { label: string; value: any }) {
  return (
    <View className="py-2">
      <Text className="text-xs text-slate-500">{label}</Text>
      <Text className="mt-1 text-sm font-semibold text-slate-900">
        {value ?? "—"}
      </Text>
    </View>
  );
}

export default function VesselDetails() {
  const { vesselId } = useLocalSearchParams<{ vesselId: string }>();

  const vessel = useMemo(
    () => vesselsDummy.find((v) => v.vesselId === vesselId),
    [vesselId]
  );

  const owner = useMemo(() => {
    if (!vessel) return undefined;
    return ownersDummy.find((o) => o.ownerId === vessel.ownerId);
  }, [vessel]);

  if (!vessel) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 px-6">
        <Text className="text-base font-semibold text-slate-900">
          Vessel not found
        </Text>
        <Text className="mt-2 text-sm text-slate-600">
          Check the Vessel ID or refresh dummy data.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerStyle={{ paddingBottom: 20 }}>
      <View className="p-4">
        {/* Vessel */}
        <View className="rounded-2xl border border-slate-200 bg-white p-4">
          <Text className="text-lg font-bold text-slate-900">
            {vessel.vesselName}
          </Text>
          <Text className="mt-1 text-sm text-slate-600">
            {vessel.vesselId} · Reg: {vessel.registrationNo}
          </Text>

          <View className="mt-4 border-t border-slate-100 pt-2">
            <Field label="Vessel Type" value={`${vessel.vesselTypeCode} · ${vessel.vesselTypeName}`} />
            <Field label="Home Port" value={`${vessel.homePortCode} · ${vessel.homePortName}`} />
            {vessel.homePortNameTa ? (
              <Field label="Home Port (Tamil)" value={vessel.homePortNameTa} />
            ) : null}
            {vessel.vesselTypeNameTa ? (
              <Field label="Vessel Type (Tamil)" value={vessel.vesselTypeNameTa} />
            ) : null}

            <Field label="Fishing License No." value={vessel.fishingLicenseNo} />
            <Field label="Crew Capacity (Max)" value={vessel.crewCapacityMax} />
            <Field label="Storage Capacity (kg)" value={vessel.storageCapacityKg} />
            <Field label="Engine Power (HP)" value={vessel.enginePowerHp} />
            <Field label="Fuel Type" value={vessel.fuelType} />
            <Field label="Status" value={vessel.status} />
          </View>
        </View>

        {/* Owner */}
        <View className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
          <Text className="text-base font-bold text-slate-900">Owner Details</Text>

          {owner ? (
            <View className="mt-3 border-t border-slate-100 pt-2">
              <Field label="Vessel Owner ID" value={owner.ownerId} />
              <Field label="Owner Name" value={owner.ownerName} />
              <Field label="Contact Number" value={owner.contactNumber} />
              <Field label="Email" value={owner.email} />
              <Field label="Address" value={owner.addressLine} />
              <Field label="KYC" value={owner.kycStatus} />
              <Field label="Linked Vessels" value={owner.linkedVesselIds.join(", ")} />
            </View>
          ) : (
            <Text className="mt-2 text-sm text-slate-600">
              Owner record not found for this vessel.
            </Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
