import React, { useMemo, useRef } from "react";
import { Tabs, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View, useColorScheme } from "react-native";
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function AquaTabsLayout() {
  const isDark = useColorScheme() === "dark";
  const sheetRef = useRef<BottomSheet>(null);
  const insets = useSafeAreaInsets();

  const colors = useMemo(() => {
    const tabBg = isDark ? "#0B1220" : "#FFFFFF";
    const tabBorder = isDark ? "rgba(148,163,184,0.18)" : "#E2E8F0";
    const screenBg = isDark ? "#050B16" : "#F5F7FB";
    const headerText = isDark ? "#E5E7EB" : "#0F172A";
    const active = isDark ? "#60A5FA" : "#2563EB";
    const inactive = isDark ? "#94A3B8" : "#64748B";
    return { tabBg, tabBorder, screenBg, headerText, active, inactive };
  }, [isDark]);

  const snapPoints = useMemo(() => ["CONTENT_HEIGHT"], []);

  const MORE_ITEMS = [
    { label: "Pond List", icon: "fish-outline" as const, href: "/(aqua)/pond-list" },
    { label: "Feed Log", icon: "cube-outline" as const, href: "/(aqua)/feed-log" },
    { label: "Water Quality", icon: "water-outline" as const, href: "/(aqua)/water-quality" },
    { label: "Health / Mortality", icon: "medkit-outline" as const, href: "/(aqua)/health-mortality" },
  ];

  const openMore = () => sheetRef.current?.expand();
  const closeMore = () => sheetRef.current?.close();

  const goMore = (href: string) => {
    closeMore();
    requestAnimationFrame(() => {
      router.push(href as any);
    });
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.screenBg }}>
      <Tabs
        screenOptions={{
          // ✅ FIX: keep header below status bar / notch
          headerStatusBarHeight: insets.top,

          tabBarActiveTintColor: colors.active,
          tabBarInactiveTintColor: colors.inactive,
          tabBarShowLabel: true,
          tabBarLabelStyle: { fontSize: 11, marginTop: 2, fontWeight: "700" },
          tabBarStyle: {
            height: 78,
            paddingTop: 8,
            paddingBottom: 12,
            backgroundColor: colors.tabBg,
            borderTopWidth: 1,
            borderTopColor: colors.tabBorder,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            overflow: "hidden",
          },
          headerStyle: { backgroundColor: colors.screenBg },
          headerTitleStyle: { color: colors.headerText },
          headerShadowVisible: false,
          headerTitleAlign: "left",
        }}
      >
        <Tabs.Screen
          name="more"
          options={{
            title: "More",
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "apps" : "apps-outline"} size={26} color={color} />
            ),
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              openMore();
            },
          }}
        />

        <Tabs.Screen name="dashboard" options={{ title: "Dashboard" }} />
        <Tabs.Screen name="qr-scanner" options={{ title: "QR Scanner", tabBarLabel: "Scan" }} />
        <Tabs.Screen name="profile" options={{ title: "Profile" }} />

        <Tabs.Screen name="pond-list" options={{ href: null }} />
        <Tabs.Screen name="feed-log" options={{ href: null }} />
        <Tabs.Screen name="water-quality" options={{ href: null }} />
        <Tabs.Screen name="health-mortality" options={{ href: null }} />

        <Tabs.Screen name="traceability" options={{ href: null }} />
        <Tabs.Screen name="traceability/[code]" options={{ href: null }} />
      </Tabs>

      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={snapPoints}
        enableDynamicSizing
        enablePanDownToClose
        handleComponent={() => null}
        backgroundStyle={{
          backgroundColor: colors.tabBg,
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
        }}
        bottomInset={insets.bottom}
        backdropComponent={(props) => (
          <BottomSheetBackdrop
            {...props}
            disappearsOnIndex={-1}
            appearsOnIndex={0}
            opacity={0.35}
            pressBehavior="close"
          />
        )}
      >
        <BottomSheetView style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10 }}>
          <Text style={{ color: colors.headerText, fontSize: 14, fontWeight: "800", marginBottom: 10 }}>
            Aquaculture Modules
          </Text>

          <View style={{ gap: 8 }}>
            {MORE_ITEMS.map((it) => (
              <Pressable
                key={it.href}
                onPress={() => goMore(it.href)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: colors.tabBorder,
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                }}
              >
                <View
                  style={{
                    height: 36,
                    width: 36,
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: `${colors.active}18`,
                  }}
                >
                  <Ionicons name={it.icon} size={18} color={colors.active} />
                </View>

                <Text style={{ flex: 1, color: colors.headerText, fontSize: 13, fontWeight: "600" }}>
                  {it.label}
                </Text>

                <Ionicons name="chevron-forward" size={18} color={colors.inactive} />
              </Pressable>
            ))}
          </View>
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}
