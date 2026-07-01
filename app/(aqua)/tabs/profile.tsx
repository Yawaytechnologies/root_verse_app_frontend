import React, { memo, useEffect, useMemo, useState } from "react";
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
  saveFarmerDetailsByUserId,
  type FarmerProfilePayload,
} from "../../../src/services/aqua/farmer-details.service";

const OLD_BAD_PROFILE_CACHE_KEY = "aqua_profile_edit_cache_v1";

function firstText(...values: any[]) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }

  return "";
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

function getRootverseUserFromMe(me: any) {
  return me?.rootverse_user || me?.user || me || {};
}

function getUserIdFromMe(me: any) {
  const rootUser = getRootverseUserFromMe(me);

  return firstText(
    rootUser?.id,
    me?.rootverse_user_id,
    me?.user_id,
    me?.userId,
    me?.rootverseUserId,
    me?.id
  );
}

function getRootverseType(me: any) {
  const rootUser = getRootverseUserFromMe(me);

  return firstText(
    rootUser?.rootverse_type,
    me?.rootverse_type,
    "AQUACULTURE"
  );
}

function isSameUser(apiProfile: any, currentUserId: string) {
  if (!apiProfile || !currentUserId) return true;

  const apiUserId = firstText(
    apiProfile?.rootverse_user?.id,
    apiProfile?.user_id,
    apiProfile?.rootverse_user_id,
    apiProfile?.userId
  );

  if (!apiUserId) return true;

  return String(apiUserId) === String(currentUserId);
}

function isNotFoundMessage(message: any) {
  const text = String(message || "").toLowerCase();

  return (
    text.includes("not found") ||
    text.includes("farmer details not found") ||
    text.includes("user_id")
  );
}

type ProfileInputProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "phone-pad" | "email-address";
  editable?: boolean;
  helper?: string;
};

const ProfileInput = memo(function ProfileInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  editable = true,
  helper,
}: ProfileInputProps) {
  return (
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
        autoCorrect={keyboardType === "email-address" ? false : true}
        blurOnSubmit={false}
        returnKeyType="next"
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
});

export default function AquaProfileScreen() {
  const insets = useSafeAreaInsets();
  const me = useSelector((state: RootState) => state.me?.me);

  const userId = useMemo(() => getUserIdFromMe(me), [me]);
  const rootverseType = useMemo(() => getRootverseType(me), [me]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [farmerDetailsExists, setFarmerDetailsExists] = useState(false);

  const [username, setUsername] = useState("");
  const [phoneNo, setPhoneNo] = useState("");
  const [email, setEmail] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [dob, setDob] = useState("");
  const [farmerLicence, setFarmerLicence] = useState("");
  const [farmingExperience, setFarmingExperience] = useState("");
  const [farmerLoadMessage, setFarmerLoadMessage] = useState("");

  const initials = useMemo(() => getInitials(username), [username]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        setFarmerLoadMessage("");
        setFarmerDetailsExists(false);

        await AsyncStorage.removeItem(OLD_BAD_PROFILE_CACHE_KEY);

        const currentRootUser = getRootverseUserFromMe(me);

        setUsername(
          firstText(
            currentRootUser?.username,
            currentRootUser?.name,
            me?.username,
            me?.name
          )
        );

        setPhoneNo(
          firstText(
            currentRootUser?.phone_no,
            currentRootUser?.mobile,
            currentRootUser?.phone,
            me?.phone_no,
            me?.mobile,
            me?.phone
          )
        );

        setEmail("");
        setFatherName("");
        setDob("");
        setFarmerLicence("");
        setFarmingExperience("");

        if (!userId) {
          setFarmerLoadMessage("User ID not found. Please logout and login again.");
          return;
        }

        try {
          const response = await getFarmerDetailsByUserId(userId);
          const apiProfile: any = response?.data || response;

          if (!isSameUser(apiProfile, userId)) {
            setFarmerLoadMessage(
              "Wrong farmer profile was returned, so it was ignored."
            );
            setFarmerDetailsExists(false);
            return;
          }

          setFarmerDetailsExists(true);

          const apiRootUser = apiProfile?.rootverse_user || {};

          setUsername(
            firstText(
              apiRootUser?.username,
              apiRootUser?.name,
              currentRootUser?.username,
              currentRootUser?.name,
              me?.username,
              me?.name
            )
          );

          setPhoneNo(
            firstText(
              apiRootUser?.phone_no,
              apiRootUser?.mobile,
              apiRootUser?.phone,
              currentRootUser?.phone_no,
              currentRootUser?.mobile,
              currentRootUser?.phone,
              me?.phone_no,
              me?.mobile,
              me?.phone
            )
          );

          setEmail(
            firstText(
              apiProfile?.email,
              apiRootUser?.email,
              currentRootUser?.email,
              me?.email
            )
          );

          setFatherName(
            firstText(
              apiProfile?.Father_name,
              apiProfile?.father_name,
              me?.Father_name,
              me?.father_name
            )
          );

          setDob(
            onlyDate(
              firstText(apiProfile?.DOB, apiProfile?.dob, me?.DOB, me?.dob)
            )
          );

          setFarmerLicence(
            firstText(
              apiProfile?.farmer_liscence,
              apiProfile?.farmer_licence,
              me?.farmer_liscence,
              me?.farmer_licence
            )
          );

          setFarmingExperience(
            onlyDate(
              firstText(
                apiProfile?.farming_experience,
                me?.farming_experience
              )
            )
          );
        } catch (error: any) {
          const message = error?.message || "Farmer details not found";

          setFarmerDetailsExists(false);

          if (isNotFoundMessage(message)) {
            setFarmerLoadMessage(
              "Farmer details are not created yet for this user. Fill the form and save to create it."
            );
          } else {
            setFarmerLoadMessage(message);
          }
        }
      } catch (error: any) {
        setFarmerLoadMessage(error?.message || "Unable to load profile details.");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [me, userId]);

  const validate = () => {
    if (!userId) {
      Alert.alert("Error", "User ID not found. Please logout and login again.");
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

      const payload: FarmerProfilePayload = {
        Father_name: fatherName.trim(),
        DOB: dob.trim(),
        email: email.trim(),
        farmer_liscence: farmerLicence.trim(),
        farming_experience: farmingExperience.trim(),
      };

      const response = await saveFarmerDetailsByUserId(userId, payload);
      const updatedProfile: any = response?.data || response;

      if (updatedProfile && !isSameUser(updatedProfile, userId)) {
        Alert.alert(
          "Error",
          "Updated profile does not match current logged-in user."
        );
        return;
      }

      setFarmerDetailsExists(true);
      setFarmerLoadMessage("");

      setFatherName(
        firstText(
          updatedProfile?.Father_name,
          updatedProfile?.father_name,
          payload.Father_name
        )
      );

      setDob(
        onlyDate(firstText(updatedProfile?.DOB, updatedProfile?.dob, payload.DOB))
      );

      setEmail(firstText(updatedProfile?.email, payload.email));

      setFarmerLicence(
        firstText(
          updatedProfile?.farmer_liscence,
          updatedProfile?.farmer_licence,
          payload.farmer_liscence
        )
      );

      setFarmingExperience(
        onlyDate(
          firstText(
            updatedProfile?.farming_experience,
            payload.farming_experience
          )
        )
      );

      Alert.alert(
        "Success",
        farmerDetailsExists
          ? "Profile updated successfully."
          : "Farmer details created successfully.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/(aqua)/tabs/dashboard"),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        "Save Failed",
        error?.message ||
          "Unable to save farmer details. Backend may not support create API."
      );
    } finally {
      setSaving(false);
    }
  };

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
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        removeClippedSubviews={false}
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

        {farmerLoadMessage ? (
          <View
            style={{
              marginTop: 14,
              borderRadius: 14,
              backgroundColor: "#FEF3C7",
              borderWidth: 1,
              borderColor: "#F59E0B",
              padding: 12,
            }}
          >
            <Text
              style={{
                color: "#92400E",
                fontSize: 12,
                fontWeight: "700",
                lineHeight: 17,
              }}
            >
              {farmerLoadMessage}
            </Text>
          </View>
        ) : null}

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

          <ProfileInput
            label="Name"
            value={username}
            onChangeText={setUsername}
            editable={false}
            helper="Name comes from the logged-in rootverse_user."
          />

          <ProfileInput
            label="Phone Number"
            value={phoneNo}
            onChangeText={setPhoneNo}
            editable={false}
            helper="Phone number comes from the logged-in rootverse_user."
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

          <ProfileInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="farmer@example.com"
            keyboardType="email-address"
          />

          <ProfileInput
            label="Father Name"
            value={fatherName}
            onChangeText={setFatherName}
            placeholder="Enter father name"
          />

          <ProfileInput
            label="Date of Birth"
            value={dob}
            onChangeText={setDob}
            placeholder="YYYY-MM-DD"
            helper="Example: 1988-04-15"
          />

          <ProfileInput
            label="Farmer Licence"
            value={farmerLicence}
            onChangeText={setFarmerLicence}
            placeholder="Enter farmer licence"
          />

          <ProfileInput
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
            {saving
              ? "Saving..."
              : farmerDetailsExists
                ? "Update Profile"
                : "Create Farmer Details"}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}