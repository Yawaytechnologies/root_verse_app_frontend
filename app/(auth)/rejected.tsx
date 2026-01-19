import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

export default function Rejected() {
  return (
    <View style={{ flex: 1, backgroundColor: "black", justifyContent: "center", padding: 20 }}>
      <Text style={{ color: "white", fontSize: 22, fontWeight: "900" }}>Rejected</Text>
      <Text style={{ color: "#94a3b8", marginTop: 10 }}>
        Your account was rejected. Contact admin.
      </Text>

      <Pressable onPress={() => router.replace("/(auth)/login")} style={{ marginTop: 20 }}>
        <Text style={{ color: "#34d399", fontWeight: "700" }}>Go to Login</Text>
      </Pressable>
    </View>
  );
}
