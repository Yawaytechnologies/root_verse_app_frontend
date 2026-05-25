import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";

import type { RootState } from "../../../src/store/auth/store";
import {
  getFarmerDetailsByUserId,
  updateFarmerDetailsByUserId,
  type FarmerProfilePayload,
} from "../../../src/services/aqua/farmer-details.service";

const FARMER_PROFILE_CACHE_KEY = "aqua_profile_edit_cache_v1";

function firstText(...values: any[]) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
}

function safeJsonParse(value: string | null) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function onlyDate(value: any) {
  if (!value) return "";
  const str = String(value);
  if (str.includes("T")) return str.split("T")[0];
  return str.slice(0, 10);
}

function getInitials(name: string) {
  if (!name.trim()) return "U";

  return name
    .trim()
    .split(" ")
    .map((item) => item[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function isValidDateFormat(value: string) {
  if (!value.trim()) return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}

export default function AquaProfileScreen() {
  const insets = useSafeAreaInsets();
  const me = useSelector((state: RootState) => state.me?.me);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [username, setUsername] = useState("");
  const [phoneNo, setPhoneNo] = useState("");
  const [email, setEmail] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [dob, setDob] = useState("");
  const [farmerLicence, setFarmerLicence] = useState("");
  const [farmingExperience, setFarmingExperience] = useState("");

  const userId = firstText(
    me?.rootverse_user?.id,
    me?.user_id,
    me?.id,
    me?.rootverse_user_id
  );

  const rootverseType = firstText(
    me?.rootverse_type,
    me?.rootverse_user?.rootverse_type,
    "AQUACULTURE"
  );

  const initials = useMemo(() => getInitials(username), [username]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);

        const localRaw = await AsyncStorage.getItem(FARMER_PROFILE_CACHE_KEY);
        const localProfile = safeJsonParse(localRaw) || {};

        let apiProfile: any = null;

        if (userId) {
          try {
            const response = await getFarmerDetailsByUserId(userId);
            apiProfile = response?.data || response;
          } catch (error: any) {
            console.warn("farmer details GET failed:", error?.message || error);
          }
        }

        const rootUser = apiProfile?.rootverse_user || me?.rootverse_user || {};

        setUsername(
          firstText(localProfile?.username, rootUser?.username, me?.username)
        );

        setPhoneNo(
          firstText(localProfile?.phone_no, rootUser?.phone_no, me?.phone_no)
        );

        setEmail(
          firstText(
            localProfile?.email,
            apiProfile?.email,
            me?.email,
            rootUser?.email
          )
        );

        setFatherName(
          firstText(
            localProfile?.Father_name,
            apiProfile?.Father_name,
            apiProfile?.father_name,
            me?.Father_name,
            me?.father_name
          )
        );

        setDob(
          onlyDate(
            firstText(
              localProfile?.DOB,
              apiProfile?.DOB,
              apiProfile?.dob,
              me?.DOB,
              me?.dob
            )
          )
        );

        setFarmerLicence(
          firstText(
            localProfile?.farmer_liscence,
            localProfile?.farmer_licence,
            apiProfile?.farmer_liscence,
            apiProfile?.farmer_licence,
            me?.farmer_liscence,
            me?.farmer_licence
          )
        );

        setFarmingExperience(
          onlyDate(
            firstText(
              localProfile?.farming_experience,
              apiProfile?.farming_experience,
              me?.farming_experience
            )
          )
        );
      } catch (error) {
        console.warn("profile load failed:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [me, userId]);

  const validate = () => {
    if (!userId) {
      Alert.alert("Error", "User ID not found. Please login again.");
      return false;
    }

    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) {
      Alert.alert("Validation", "Enter a valid email address.");
      return false;
    }

    if (!isValidDateFormat(dob)) {
      Alert.alert("Validation", "DOB must be in YYYY-MM-DD format.");
      return false;
    }

    if (!isValidDateFormat(farmingExperience)) {
      Alert.alert(
        "Validation",
        "Farming experience date must be in YYYY-MM-DD format."
      );
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;

    try {
      setSaving(true);

      const payload: FarmerProfilePayload = {};

      if (fatherName.trim()) payload.Father_name = fatherName.trim();
      if (dob.trim()) payload.DOB = dob.trim();
      if (email.trim()) payload.email = email.trim();
      if (farmerLicence.trim()) payload.farmer_liscence = farmerLicence.trim();

      if (farmingExperience.trim()) {
        payload.farming_experience = farmingExperience.trim();
      }

      const response = await updateFarmerDetailsByUserId(userId, payload);
      const updatedProfile = response?.data || response;

      const cacheProfile = {
        username: username.trim(),
        phone_no: phoneNo.trim(),
        Father_name:
          updatedProfile?.Father_name ?? payload.Father_name ?? fatherName.trim(),
        DOB: onlyDate(updatedProfile?.DOB ?? payload.DOB ?? dob),
        email: updatedProfile?.email ?? payload.email ?? email.trim(),
        farmer_liscence:
          updatedProfile?.farmer_liscence ??
          payload.farmer_liscence ??
          farmerLicence.trim(),
        farming_experience: onlyDate(
          updatedProfile?.farming_experience ??
            payload.farming_experience ??
            farmingExperience
        ),
        updated_at: new Date().toISOString(),
      };

      await AsyncStorage.setItem(
        FARMER_PROFILE_CACHE_KEY,
        JSON.stringify(cacheProfile)
      );

      Alert.alert("Success", "Profile updated successfully.", [
        {
          text: "OK",
          onPress: () => router.replace("/(aqua)/tabs/dashboard"),
        },
      ]);
    } catch (error: any) {
      console.error("profile update failed:", error);
      Alert.alert("Update Failed", error?.message || "Unable to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const Input = ({
    label,
    value,
    onChangeText,
    placeholder,
    keyboardType = "default",
    editable = true,
    helper,
  }: {
    label: string;
    value: string;
    onChangeText: (value: string) => void;
    placeholder?: string;
    keyboardType?: "default" | "phone-pad" | "email-address";
    editable?: boolean;
    helper?: string;
  }) => (
    <View style={{ marginTop: 14 }}>
      <Text
        style={{
          fontSize: 12,
          fontWeight: "700",
          color: "#475569",
          marginBottom: 7,
        }}
      >
        {label}
      </Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        keyboardType={keyboardType}
        editable={editable}
        autoCapitalize={keyboardType === "email-address" ? "none" : "sentences"}
        style={{
          borderWidth: 1,
          borderColor: "#CBD5E1",
          backgroundColor: editable ? "#FFFFFF" : "#E2E8F0",
          color: "#0F172A",
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: Platform.OS === "ios" ? 13 : 10,
          fontSize: 14,
        }}
      />

      {helper ? (
        <Text
          style={{
            marginTop: 5,
            fontSize: 11,
            color: "#64748B",
            lineHeight: 15,
          }}
        >
          {helper}
        </Text>
      ) : null}
    </View>
  );

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#E8EEF6",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator />
        <Text style={{ marginTop: 10, color: "#64748B" }}>
          Loading profile...
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#E8EEF6" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: insets.top + 10,
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 28,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
          }}
        >
          <Pressable
            onPress={() => router.back()}
            style={{
              height: 42,
              width: 42,
              borderRadius: 14,
              backgroundColor: "#D2E3F8",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="arrow-back" size={20} color="#1E293B" />
          </Pressable>

          <Text style={{ fontSize: 18, fontWeight: "800", color: "#0F172A" }}>
            Edit Profile
          </Text>

          <View style={{ width: 42 }} />
        </View>

        <View
          style={{
            borderRadius: 20,
            backgroundColor: "#1E293B",
            padding: 18,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View
              style={{
                height: 64,
                width: 64,
                borderRadius: 22,
                backgroundColor: "rgba(255,255,255,0.12)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 23,
                  fontWeight: "800",
                }}
              >
                {initials}
              </Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 18,
                  fontWeight: "800",
                }}
              >
                {username || "User"}
              </Text>

              <Text
                style={{
                  color: "rgba(255,255,255,0.7)",
                  fontSize: 12,
                  marginTop: 3,
                }}
              >
                {rootverseType} · RootVerse
              </Text>

              <Text
                style={{
                  color: "rgba(255,255,255,0.65)",
                  fontSize: 12,
                  marginTop: 3,
                }}
              >
                User ID: {userId || "—"}
              </Text>
            </View>
          </View>
        </View>

        <View
          style={{
            marginTop: 16,
            borderRadius: 20,
            backgroundColor: "#EEF3FF",
            borderWidth: 1,
            borderColor: "#C0CEEA",
            padding: 16,
          }}
        >
          <Text
            style={{
              fontSize: 15,
              fontWeight: "800",
              color: "#0F172A",
              marginBottom: 2,
            }}
          >
            User Details
          </Text>

          <Input
            label="Name"
            value={username}
            onChangeText={setUsername}
            editable={false}
            helper="Name belongs to rootverse_user. This API does not update name."
          />

          <Input
            label="Phone Number"
            value={phoneNo}
            onChangeText={setPhoneNo}
            editable={false}
            helper="Phone number belongs to rootverse_user. This API does not update phone number."
          />
        </View>

        <View
          style={{
            marginTop: 14,
            borderRadius: 20,
            backgroundColor: "#EEF3FF",
            borderWidth: 1,
            borderColor: "#C0CEEA",
            padding: 16,
          }}
        >
          <Text
            style={{
              fontSize: 15,
              fontWeight: "800",
              color: "#0F172A",
              marginBottom: 2,
            }}
          >
            Farmer Details
          </Text>

          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="updated-farmer@example.com"
            keyboardType="email-address"
          />

          <Input
            label="Father Name"
            value={fatherName}
            onChangeText={setFatherName}
            placeholder="Enter father name"
          />

          <Input
            label="Date of Birth"
            value={dob}
            onChangeText={setDob}
            placeholder="YYYY-MM-DD"
            helper="Example: 1988-04-15"
          />

          <Input
            label="Farmer Licence"
            value={farmerLicence}
            onChangeText={setFarmerLicence}
            placeholder="Enter farmer licence"
          />

          <Input
            label="Farming Experience"
            value={farmingExperience}
            onChangeText={setFarmingExperience}
            placeholder="YYYY-MM-DD"
            helper="Example: 2014-06-01"
          />
        </View>

        <Pressable
          disabled={saving}
          onPress={handleSave}
          style={{
            marginTop: 18,
            borderRadius: 16,
            backgroundColor: saving ? "#64748B" : "#1E293B",
            paddingVertical: 15,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 8,
          }}
        >
          {saving ? <ActivityIndicator color="#FFFFFF" /> : null}

          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 15,
              fontWeight: "800",
            }}
          >
            {saving ? "Saving..." : "Update Profile"}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}