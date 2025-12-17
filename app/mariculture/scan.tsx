import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useState } from "react";
import { Alert, Platform, Pressable, Text, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

const SKY = "#7dd3fc";
const MINT = "#34d399";

export default function ScanScreen() {
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
            // e.g. router.push({ pathname: "/mariculture/assign-crate", params: { code: data }})
          },
        },
      ]);
    },
    [locked]
  );

  const hasPermission = permission?.granted;

  return (
    <View style={{ flex: 1 }}>
      {/* Background like your dashboard */}
      <LinearGradient
        colors={["#071425", "#06101E", "#04060D"]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={{ flex: 1 }}
      >
        {/* Vignette */}
        <LinearGradient
          colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.55)"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
          }}
        />

        {/* Header (Dashboard style: Mariculture + Scan) */}
        <Animated.View
          entering={FadeInDown.duration(Platform.OS === "android" ? 200 : 260)}
          style={{ paddingHorizontal: 18, paddingTop: 34 }}
        >
          <Text
            style={{
              color: MINT,
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
              color: "rgba(255,255,255,0.96)",
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
              color: "rgba(226,232,240,0.72)",
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
                backgroundColor: "rgba(15,23,42,0.70)",
                borderWidth: 1,
                borderColor: "rgba(148,163,184,0.35)",
              }}
            >
              <Ionicons name="qr-code-outline" size={16} color={MINT} />
              <Text
                style={{
                  marginLeft: 8,
                  color: "rgba(209,250,229,0.92)",
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
            <Text style={{ color: "rgba(226,232,240,0.75)", fontWeight: "800" }}>
              Checking camera permission…
            </Text>
          </View>
        ) : !hasPermission ? (
          <View style={{ flex: 1, paddingHorizontal: 18, justifyContent: "center" }}>
            <View
              style={{
                borderRadius: 22,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.10)",
                backgroundColor: "rgba(255,255,255,0.03)",
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
                    backgroundColor: "rgba(125,211,252,0.12)",
                    borderWidth: 1,
                    borderColor: "rgba(125,211,252,0.22)",
                  }}
                >
                  <Ionicons name="camera-outline" size={22} color={SKY} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ color: "white", fontWeight: "900", fontSize: 14 }}>
                    Camera permission needed
                  </Text>
                  <Text
                    style={{
                      color: "rgba(226,232,240,0.68)",
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
                  backgroundColor: "rgba(125,211,252,0.14)",
                  borderWidth: 1,
                  borderColor: "rgba(125,211,252,0.22)",
                  opacity: pressed ? 0.86 : 1,
                })}
              >
                <Text style={{ color: "rgba(125,211,252,0.98)", fontWeight: "900" }}>
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
                  borderColor: "rgba(125,211,252,0.22)",
                  backgroundColor: "rgba(0,0,0,0.35)",
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
                      borderColor: "rgba(125,211,252,0.55)",
                      backgroundColor: "rgba(0,0,0,0.15)",
                    }}
                  />
                  <Text
                    style={{
                      marginTop: 14,
                      color: "rgba(226,232,240,0.78)",
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
                  borderColor: "rgba(255,255,255,0.10)",
                  backgroundColor: "rgba(255,255,255,0.03)",
                  padding: 14,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="qr-code-outline" size={18} color={SKY} />
                  <Text style={{ marginLeft: 8, color: "white", fontWeight: "900" }}>
                    Scan status
                  </Text>
                </View>

                <Text
                  style={{
                    marginTop: 8,
                    color: "rgba(226,232,240,0.68)",
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
                      backgroundColor: "rgba(255,255,255,0.05)",
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.10)",
                      opacity: pressed ? 0.86 : 1,
                    })}
                  >
                    <Text style={{ color: "rgba(226,232,240,0.78)", fontWeight: "900" }}>
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
                      // TODO: route to assign screen
                    }}
                    style={({ pressed }) => ({
                      flex: 1,
                      height: 44,
                      borderRadius: 16,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "rgba(125,211,252,0.14)",
                      borderWidth: 1,
                      borderColor: "rgba(125,211,252,0.22)",
                      opacity: pressed ? 0.86 : 1,
                    })}
                  >
                    <Text style={{ color: "rgba(125,211,252,0.98)", fontWeight: "900" }}>
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
