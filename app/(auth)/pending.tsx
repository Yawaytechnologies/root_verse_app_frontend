import { router } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";

export default function Pending() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: "700" }}>Approval Pending</Text>
      <Text style={{ marginTop: 10, textAlign: "center" }}>
        Your account is waiting for admin approval. Try login after approval.
      </Text>

      <Pressable
        onPress={() => router.replace("/(auth)/login")}
        style={{ marginTop: 20, paddingVertical: 12, paddingHorizontal: 18, borderRadius: 10, backgroundColor: "black" }}
      >
        <Text style={{ color: "white" }}>Go to Login</Text>
      </Pressable>
    </View>
  );
}
