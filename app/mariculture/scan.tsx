import { useIsDarkTheme } from "@/src/store/useIsDarkTheme";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useMemo, useState } from "react";
import { Alert, Platform, Pressable, Text, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { g } from "@/src/utils/gradient";

const SKY = "#7dd3fc";
const MINT = "#34d399";

export default function ScanScreen() {
  const isDark = useIsDarkTheme();

  const T = useMemo(() => {
    const bgTop = isDark ? "#071425" : "#f5f7fb";
    const bgMid = isDark ? "#06101E" : "#eef2f7";
    const bgBot = isDark ? "#04060D" : "#e9eff6";

    const titleGreen = isDark ? MINT : "#10b981";
    const title = isDark ? "rgba(255,255,255,0.96)" : "#0f172a";
    const sub = isDark ? "rgba(226,232,240,0.72)" : "rgba(15,23,42,0.60)";
    const faint = isDark ? "rgba(226,232,240,0.75)" : "rgba(15,23,42,0.55)";

    const cardBg = isDark ? "rgba(255,255,255,0.03)" : "#ffffff";
    const cardBorder = isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.10)";

    const chipBg = isDark ? "rgba(15,23,42,0.70)" : "rgba(15,23,42,0.10)";
    const chipBorder = isDark ? "rgba(148,163,184,0.35)" : "rgba(15,23,42,0.12)";
    const chipText = isDark ? "rgba(209,250,229,0.92)" : "#0f172a";

    const btnSoftBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.06)";
    const btnSoftBorder = isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.10)";
    const btnSoftText = isDark ? "rgba(226,232,240,0.78)" : "rgba(15,23,42,0.70)";

    const btnSkyBg = isDark ? "rgba(125,211,252,0.14)" : "rgba(125,211,252,0.18)";
    const btnSkyBorder = isDark ? "rgba(125,211,252,0.22)" : "rgba(125,211,252,0.30)";
    const btnSkyText = isDark ? "rgba(125,211,252,0.98)" : "rgba(2,132,199,0.95)";

    const camFrameBorder = isDark ? "rgba(125,211,252,0.22)" : "rgba(2,132,199,0.22)";
    const camFrameBg = isDark ? "rgba(0,0,0,0.35)" : "rgba(15,23,42,0.06)";
    const scanBoxBorder = isDark ? "rgba(125,211,252,0.55)" : "rgba(2,132,199,0.45)";
    const scanBoxBg = isDark ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.35)";

    const vignette = isDark
      ? g("rgba(0,0,0,0)", "rgba(0,0,0,0.55)")
      : g("rgba(0,0,0,0)", "rgba(0,0,0,0.10)");

    return {
      bgTop,
      bgMid,
      bgBot,
      vignette,
      titleGreen,
      title,
      sub,
      faint,
      cardBg,
      cardBorder,
      chipBg,
      chipBorder,
      chipText,
      btnSoftBg,
      btnSoftBorder,
      btnSoftText,
      btnSkyBg,
      btnSkyBorder,
      btnSkyText,
      camFrameBorder,
      camFrameBg,
      scanBoxBorder,
      scanBoxBg,
    };
  }, [isDark]);

  const [permission, requestPermission] = useCameraPermissions();
  const [locked, setLocked] = useState(false);
  const [lastCode, setLastCode] = useState<string | null>(null);

  const askPermission = useCallback(async () => {
    const res = await requestPermission();
    return res.granted;
  }, [requestPermission]);

  const onBarcodeScanned = useCallback(
    ({ data }: { data: string }) => {
      if (locked) return;
      setLocked(true);
      setLastCode(data);

      Alert.alert("QR Scanned", data, [
        {
          text: "Scan again",
          style: "cancel",
          onPress: () => {
            setLocked(false);
            setLastCode(null);
          },
        },
        {
          text: "Use this",
          onPress: () => {
            // TODO: route to crate assignment form
          },
        },
      ]);
    },
    [locked]
  );

  const hasPermission = permission?.granted;

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <LinearGradient
        colors={g(T.bgTop, T.bgMid, T.bgBot)}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={{ flex: 1 }}
      >
        {/* Vignette */}
        <LinearGradient
          colors={T.vignette}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
        />

        {/* Header */}
        <Animated.View
          entering={FadeInDown.duration(Platform.OS === "android" ? 200 : 260)}
          style={{ paddingHorizontal: 18, paddingTop: 34 }}
        >
          <Text
            style={{
              color: T.titleGreen,
              fontSize: 36,
              fontWeight: "900",
              letterSpacing: 0.2,
            }}
            numberOfLines={1}
          >
            Mariculture
          </Text>

          <Text
            style={{
              marginTop: 6,
              color: T.title,
              fontSize: 18,
              fontWeight: "900",
              letterSpacing: 0.2,
            }}
            numberOfLines={1}
          >
            Scan
          </Text>

          <Text
            style={{
              marginTop: 8,
              color: T.sub,
              fontSize: 13,
              fontWeight: "700",
              lineHeight: 18,
            }}
          >
            Scan crate QR to assign it to a batch / unit.
          </Text>

          {/* Chip */}
          <View style={{ marginTop: 12, alignSelf: "flex-start" }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                height: 38,
                paddingHorizontal: 14,
                borderRadius: 999,
                backgroundColor: T.chipBg,
                borderWidth: 1,
                borderColor: T.chipBorder,
              }}
            >
              <Ionicons name="qr-code-outline" size={16} color={T.titleGreen} />
              <Text
                style={{
                  marginLeft: 8,
                  color: T.chipText,
                  fontSize: 13,
                  fontWeight: "900",
                  letterSpacing: 0.2,
                }}
              >
                Crate Scan
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Permission states */}
        {!permission ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: T.faint, fontWeight: "800" }}>
              Checking camera permission…
            </Text>
          </View>
        ) : !hasPermission ? (
          <View style={{ flex: 1, paddingHorizontal: 18, justifyContent: "center" }}>
            <View
              style={{
                borderRadius: 22,
                borderWidth: 1,
                borderColor: T.cardBorder,
                backgroundColor: T.cardBg,
                padding: 16,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View
                  style={{
                    height: 46,
                    width: 46,
                    borderRadius: 18,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: isDark
                      ? "rgba(125,211,252,0.12)"
                      : "rgba(125,211,252,0.18)",
                    borderWidth: 1,
                    borderColor: isDark
                      ? "rgba(125,211,252,0.22)"
                      : "rgba(125,211,252,0.28)",
                  }}
                >
                  <Ionicons name="camera-outline" size={22} color={SKY} />
                </View>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ color: T.title, fontWeight: "900", fontSize: 14 }}>
                    Camera permission needed
                  </Text>
                  <Text
                    style={{
                      color: T.sub,
                      fontWeight: "700",
                      fontSize: 12,
                      marginTop: 4,
                    }}
                  >
                    Allow camera to scan QR codes.
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={askPermission}
                style={({ pressed }) => ({
                  marginTop: 14,
                  height: 44,
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: T.btnSkyBg,
                  borderWidth: 1,
                  borderColor: T.btnSkyBorder,
                  opacity: pressed ? 0.86 : 1,
                })}
              >
                <Text style={{ color: T.btnSkyText, fontWeight: "900" }}>
                  Grant permission
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            {/* Camera frame */}
            <Animated.View
              entering={FadeInUp.duration(Platform.OS === "android" ? 200 : 260)}
              style={{ flex: 1, padding: 18 }}
            >
              <View
                style={{
                  flex: 1,
                  borderRadius: 26,
                  overflow: "hidden",
                  borderWidth: 1,
                  borderColor: T.camFrameBorder,
                  backgroundColor: T.camFrameBg,
                }}
              >
                <CameraView
                  style={{ flex: 1 }}
                  facing="back"
                  barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                  onBarcodeScanned={locked ? undefined : onBarcodeScanned}
                />

                {/* Overlay: scanning box */}
                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <View
                    style={{
                      width: "72%",
                      aspectRatio: 1,
                      borderRadius: 22,
                      borderWidth: 2,
                      borderColor: T.scanBoxBorder,
                      backgroundColor: T.scanBoxBg,
                    }}
                  />
                  <Text
                    style={{
                      marginTop: 14,
                      color: T.sub,
                      fontSize: 12,
                      fontWeight: "800",
                    }}
                  >
                    Align QR inside the frame
                  </Text>
                </View>
              </View>
            </Animated.View>

            {/* Bottom actions */}
            <View style={{ paddingHorizontal: 18, paddingBottom: 130 }}>
              <View
                style={{
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: T.cardBorder,
                  backgroundColor: T.cardBg,
                  padding: 14,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="qr-code-outline" size={18} color={SKY} />
                  <Text style={{ marginLeft: 8, color: T.title, fontWeight: "900" }}>
                    Scan status
                  </Text>
                </View>

                <Text
                  style={{
                    marginTop: 8,
                    color: T.sub,
                    fontSize: 12,
                    fontWeight: "700",
                  }}
                  numberOfLines={2}
                >
                  {lastCode ? `Last scan: ${lastCode}` : "Ready to scan a crate QR"}
                </Text>

                <View style={{ flexDirection: "row", marginTop: 12, gap: 10 }}>
                  <Pressable
                    onPress={() => {
                      setLocked(false);
                      setLastCode(null);
                    }}
                    style={({ pressed }) => ({
                      flex: 1,
                      height: 44,
                      borderRadius: 16,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: T.btnSoftBg,
                      borderWidth: 1,
                      borderColor: T.btnSoftBorder,
                      opacity: pressed ? 0.86 : 1,
                    })}
                  >
                    <Text style={{ color: T.btnSoftText, fontWeight: "900" }}>
                      Scan again
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      if (!lastCode) {
                        Alert.alert("No code yet", "Scan a QR code first.");
                        return;
                      }
                      Alert.alert("Use this code", lastCode);
                    }}
                    style={({ pressed }) => ({
                      flex: 1,
                      height: 44,
                      borderRadius: 16,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: T.btnSkyBg,
                      borderWidth: 1,
                      borderColor: T.btnSkyBorder,
                      opacity: pressed ? 0.86 : 1,
                    })}
                  >
                    <Text style={{ color: T.btnSkyText, fontWeight: "900" }}>
                      Use code
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </>
        )}
      </LinearGradient>
    </View>
  );
}
