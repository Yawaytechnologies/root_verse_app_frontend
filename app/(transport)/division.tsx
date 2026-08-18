import React from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import Screen from "../../src/components/centre/Screen";

export default function TransportDivisionScreen() {
  const openWild = () => {
    // Existing Wild Transport code.
    // Nothing changed.
    router.push("/(transport)/dashboard");
  };

  const openAquaculture = () => {
    // New Aquaculture Transport Loading module.
    router.push("/(transport)/aqua-dashboard");
  };

  const openMariculture = () => {
    // Mariculture will be added separately later.
    Alert.alert(
      "Mariculture",
      "Mariculture transport module will be added separately."
    );
  };

  return (
    <Screen>
      <View className="flex-1 bg-[#071225]">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 50,
            paddingBottom: 40,
          }}
        >
          <Text className="text-[34px] font-extrabold text-white">
            Choose Division
          </Text>

          <Text className="mt-3 text-[17px] leading-6 text-slate-400">
            Transport operator can enter any available module from here
          </Text>

          {/* WILD */}
          <DivisionCard
            title="Wild Capture"
            subtitle="Assigned crates • Pickup scan • In-transit"
            icon="boat-outline"
            onPress={openWild}
          />

          {/* AQUACULTURE */}
          <DivisionCard
            title="Aquaculture"
            subtitle="Crate loading • Chain of custody • Loading progress"
            icon="water-outline"
            onPress={openAquaculture}
          />

          {/* MARICULTURE */}
          <DivisionCard
            title="Mariculture"
            subtitle="Transport loading • Trace updates"
            icon="fish-outline"
            onPress={openMariculture}
          />
        </ScrollView>
      </View>
    </Screen>
  );
}

function DivisionCard({
  title,
  subtitle,
  icon,
  onPress,
}: {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <View className="mt-7 rounded-[32px] border border-slate-300 bg-slate-200 px-6 py-7">
      <View className="flex-row items-center">
        <View className="h-16 w-16 items-center justify-center rounded-[20px] bg-[#071225]">
          <Ionicons name={icon} size={30} color="#ffffff" />
        </View>

        <View className="ml-4 flex-1">
          <Text className="text-[27px] font-extrabold text-[#071225]">
            {title}
          </Text>

          <Text className="mt-2 text-[15px] leading-5 text-slate-600">
            {subtitle}
          </Text>
        </View>
      </View>

      <Pressable
        onPress={onPress}
        className="mt-6 self-start rounded-full bg-[#071225] px-7 py-4"
      >
        <View className="flex-row items-center">
          <Text className="text-[17px] font-extrabold text-white">
            Open
          </Text>

          <Ionicons
            name="arrow-forward"
            size={19}
            color="#ffffff"
            style={{ marginLeft: 8 }}
          />
        </View>
      </Pressable>
    </View>
  );
}