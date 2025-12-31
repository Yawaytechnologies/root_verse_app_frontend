import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

/* -------------------- Forgot glass modal -------------------- */
function ForgotGlassModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withTiming(open ? 1 : 0, {
      duration: open ? 260 : 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [open]);

  const overlayAnim = useAnimatedStyle(() => {
    return { opacity: interpolate(p.value, [0, 1], [0, 1]) };
  });

  const cardAnim = useAnimatedStyle(() => {
    const scale = interpolate(p.value, [0, 1], [0.92, 1]);
    const ty = interpolate(p.value, [0, 1], [18, 0]);
    return { transform: [{ translateY: ty }, { scale }], opacity: p.value };
  });

  return (
    <Modal visible={open} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View
        style={[
          { flex: 1, justifyContent: "center", paddingHorizontal: 20 },
          overlayAnim,
        ]}
      >
        <Pressable
          onPress={onClose}
          style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,1)" }}
        />

        <Animated.View style={cardAnim}>
          <View style={{ borderRadius: 26, overflow: "visible" }}>
            <View
              style={{
                position: "absolute",
                inset: -8,
                borderRadius: 30,
                backgroundColor: "rgba(16,185,129,0.18)",
              }}
            />

            <BlurView intensity={28} tint="dark" style={{ borderRadius: 26, overflow: "hidden" }}>
              <View
                style={{
                  borderRadius: 26,
                  padding: 18,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.10)",
                  backgroundColor: "rgba(0,0,0,0.35)",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View
                      style={{
                        height: 36,
                        width: 36,
                        borderRadius: 16,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "rgba(255,255,255,0.05)",
                        borderWidth: 1,
                        borderColor: "rgba(255,255,255,0.10)",
                      }}
                    >
                      <Ionicons name="shield-checkmark-outline" size={18} color="#7dd3fc" />
                    </View>
                    <Text style={{ color: "white", fontSize: 14, fontWeight: "600", marginLeft: 12 }}>
                      Password recovery
                    </Text>
                  </View>

                  <Pressable onPress={onClose} style={{ padding: 8, marginRight: -8 }}>
                    <Ionicons name="close" size={18} color="#cbd5e1" />
                  </Pressable>
                </View>

                <Text style={{ color: "#cbd5e1", fontSize: 12, marginTop: 12, lineHeight: 18 }}>
                  For security reasons, password reset is handled by your administrator. Please contact admin to
                  recover/reset your password.
                </Text>

                <View style={{ marginTop: 18, flexDirection: "row" }}>
                  <Pressable onPress={onClose} style={{ flex: 1, borderRadius: 16, overflow: "hidden" }}>
                    <View
                      style={{
                        paddingVertical: 12,
                        alignItems: "center",
                        borderRadius: 16,
                        backgroundColor: "rgba(255,255,255,0.05)",
                        borderWidth: 1,
                        borderColor: "rgba(255,255,255,0.10)",
                      }}
                    >
                      <Text style={{ color: "#e2e8f0", fontSize: 12, fontWeight: "600" }}>Got it</Text>
                    </View>
                  </Pressable>

                  <View style={{ width: 10 }} />

                  <Pressable onPress={onClose} style={{ flex: 1, borderRadius: 16, overflow: "hidden" }}>
                    <LinearGradient
                      colors={["#34d399", "#10b981", "#06b6d4"]}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={{ paddingVertical: 12, borderRadius: 16, alignItems: "center" }}
                    >
                      <Text style={{ color: "black", fontSize: 12, fontWeight: "600" }}>Contact admin</Text>
                    </LinearGradient>
                  </Pressable>
                </View>
              </View>
            </BlurView>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

/* -------------------- Screen -------------------- */
export default function LoginScreen() {
  const [userId, setUserId] = useState("");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [agree, setAgree] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  const idOk = useMemo(() => userId.trim().length >= 3, [userId]);
  const pwOk = useMemo(() => pw.length >= 4, [pw]);
  const canSubmit = idOk && pwOk && agree;

  const onSubmit = () => {
    if (!canSubmit) return;
    router.replace("/(aqua)/tabs/dashboard");
  };

  const idRef = useRef<TextInput>(null);
  const pwRef = useRef<TextInput>(null);

  const keyboardOpen = useSharedValue(0);
  const keyboardH = useSharedValue(0);

  const bgDim = useSharedValue(0);

  const dimOn = () => {
    bgDim.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
  };

  const dimOffIfNoFocus = () => {
    setTimeout(() => {
      const idFocused = idRef.current?.isFocused?.() ?? false;
      const pwFocused = pwRef.current?.isFocused?.() ?? false;
      if (!idFocused && !pwFocused) {
        bgDim.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) });
      }
    }, 80);
  };

  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const subShow = Keyboard.addListener(showEvt, (e: any) => {
      const h = e?.endCoordinates?.height ?? 0;
      keyboardH.value = h;
      keyboardOpen.value = withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) });
      dimOn();
    });

    const subHide = Keyboard.addListener(hideEvt, () => {
      keyboardOpen.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) });
      keyboardH.value = 0;
      dimOffIfNoFocus();
    });

    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, []);

  /* Fish subtle swim */
  const bob = useSharedValue(0);
  const sway = useSharedValue(0);
  const drift = useSharedValue(0);

  useEffect(() => {
    bob.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true);
    sway.value = withRepeat(withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.sin) }), -1, true);
    drift.value = withRepeat(withTiming(1, { duration: 5200, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, []);

  const fishAnim = useAnimatedStyle(() => {
    const ty = interpolate(bob.value, [0, 1], [6, -6]);
    const rot = interpolate(sway.value, [0, 1], [-3, 3]);
    const tx = interpolate(drift.value, [0, 0.5, 1], [-5, 6, -5]);
    return { transform: [{ translateX: tx }, { translateY: ty }, { rotateZ: `${rot}deg` }] };
  });

  /* Hero intro */
  const heroProgress = useSharedValue(0);
  const formProgress = useSharedValue(0);

  useEffect(() => {
    heroProgress.value = withDelay(2000, withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }));
    formProgress.value = withDelay(2900, withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) }));
  }, []);

  const heroAnim = useAnimatedStyle(() => {
    const translateY = interpolate(heroProgress.value, [0, 1], [0, -SCREEN_H * 0.26]);
    const scale = interpolate(heroProgress.value, [0, 1], [1.14, 0.92]);
    return { transform: [{ translateY }, { scale }] };
  });

  const dimOverlayAnim = useAnimatedStyle(() => ({
    opacity: interpolate(bgDim.value, [0, 1], [0, 0.88]),
  }));

  const formAnim = useAnimatedStyle(() => {
    const appearY = interpolate(formProgress.value, [0, 1], [40, 0]);
    const lift = -Math.min(keyboardH.value * 0.55, SCREEN_H * 0.28);
    const kbLiftY = interpolate(keyboardOpen.value, [0, 1], [0, lift]);

    return {
      opacity: formProgress.value,
      transform: [{ translateY: appearY + kbLiftY }],
    };
  });

  const heroFishWidth = SCREEN_W * 0.62;
  const heroFishHeight = heroFishWidth * 0.6;

  return (
    <View style={{ flex: 1, backgroundColor: "black", position: "relative" }}>
      <LinearGradient
        colors={["rgba(16,185,129,0.22)", "rgba(0,0,0,0.86)", "rgba(0,0,0,0.96)"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: "absolute", inset: 0 }}
      />

      <ForgotGlassModal open={forgotOpen} onClose={() => setForgotOpen(false)} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 20 }}>
          <Animated.View style={heroAnim}>
            <View style={{ alignItems: "center" }}>
              <Animated.View style={fishAnim}>
                <Image
                  source={require("../../assets/images/Fish.png")}
                  resizeMode="contain"
                  style={{ width: heroFishWidth, height: heroFishHeight }}
                />
              </Animated.View>

              <View style={{ marginTop: 0, alignItems: "center" }}>
                <Text
                  style={{
                    fontFamily: "System",
                    fontWeight: "900",
                    fontSize: 50,
                    letterSpacing: 3,
                    color: "white",
                    textAlign: "center",
                    textTransform: "uppercase",
                  }}
                >
                  ROOTVERSE
                </Text>

                <Text
                  style={{
                    fontFamily: "System",
                    fontWeight: "800",
                    fontSize: 18,
                    letterSpacing: 3,
                    color: "#0ea5e9",
                    textAlign: "center",
                    marginTop: 4,
                  }}
                >
                  BLUE ECONOMY
                </Text>

                <Text
                  style={{
                    fontFamily: "System",
                    fontWeight: "800",
                    fontSize: 18,
                    letterSpacing: 3,
                    color: "#0ea5e9",
                    textAlign: "center",
                    marginTop: 4,
                  }}
                >
                  TRACEABILITY SYSTEM
                </Text>
              </View>
            </View>
          </Animated.View>
        </View>

        <Animated.View
          pointerEvents="none"
          style={[{ position: "absolute", inset: 0, backgroundColor: "black", zIndex: 5 }, dimOverlayAnim]}
        />

        <View style={{ position: "absolute", left: 20, right: 20, bottom: 120, zIndex: 10 }}>
          <Animated.View style={formAnim}>
            <BlurView intensity={22} tint="dark" style={{ borderRadius: 26, overflow: "hidden" }}>
              <View
                style={{
                  backgroundColor: "rgba(0,0,0,0.35)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.10)",
                  borderRadius: 26,
                  padding: 20,
                }}
              >
                <Text style={{ color: "#cbd5e1", fontSize: 14, marginBottom: 16, textAlign: "center" }}>
                  Sign in to continue.
                </Text>

                <Text style={{ color: "#cbd5e1", fontSize: 11, marginBottom: 8 }}>ID</Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "rgba(255,255,255,0.05)",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.10)",
                    borderRadius: 16,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                  }}
                >
                  <Ionicons name="person-outline" size={18} color="#94a3b8" />
                  <TextInput
                    ref={idRef}
                    value={userId}
                    onChangeText={setUserId}
                    placeholder="Enter your ID"
                    placeholderTextColor="#64748b"
                    autoCapitalize="none"
                    style={{ color: "white", flex: 1, marginLeft: 12, backgroundColor: "transparent" }}
                    onFocus={dimOn}
                    onBlur={dimOffIfNoFocus}
                  />
                  <View
                    style={{
                      height: 10,
                      width: 10,
                      borderRadius: 99,
                      backgroundColor:
                        userId.length === 0 ? "#334155" : idOk ? "#34d399" : "#fb7185",
                    }}
                  />
                </View>

                <Text style={{ color: "#cbd5e1", fontSize: 11, marginTop: 16, marginBottom: 8 }}>Password</Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "rgba(255,255,255,0.05)",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.10)",
                    borderRadius: 16,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                  }}
                >
                  <Ionicons name="lock-closed-outline" size={18} color="#94a3b8" />
                  <TextInput
                    ref={pwRef}
                    value={pw}
                    onChangeText={setPw}
                    placeholder="••••••••"
                    placeholderTextColor="#64748b"
                    secureTextEntry={!show}
                    style={{ color: "white", flex: 1, marginLeft: 12, backgroundColor: "transparent" }}
                    onFocus={dimOn}
                    onBlur={dimOffIfNoFocus}
                  />
                  <Pressable onPress={() => setShow((p) => !p)} style={{ padding: 8, marginRight: -8 }}>
                    <Ionicons name={show ? "eye-off-outline" : "eye-outline"} size={18} color="#94a3b8" />
                  </Pressable>
                </View>

                {/* ✅ FIXED: wraps properly on mobile */}
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12 }}>
                  <Pressable
                    onPress={() => router.push("/(auth)/register")}
                    style={{ flex: 1, paddingRight: 12 }}
                    hitSlop={8}
                  >
                    <Text style={{ color: "#cbd5e1", fontSize: 11, flexWrap: "wrap", lineHeight: 16 }}>
                      If you don&apos;t have an account{" "}
                      <Text style={{ color: "#7dd3fc", fontWeight: "700" }}>create here</Text>
                    </Text>
                  </Pressable>

                  <Pressable onPress={() => setForgotOpen(true)} hitSlop={8}>
                    <Text style={{ color: "#6ee7b7", fontSize: 11, fontWeight: "700" }}>Forgot?</Text>
                  </Pressable>
                </View>

                <Pressable onPress={() => setAgree((p) => !p)} style={{ flexDirection: "row", alignItems: "center", marginTop: 16 }}>
                  <View
                    style={{
                      height: 20,
                      width: 20,
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.20)",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "rgba(255,255,255,0.05)",
                    }}
                  >
                    {agree ? <Ionicons name="checkmark" size={14} color="#34d399" /> : null}
                  </View>
                  <Text style={{ color: "#cbd5e1", fontSize: 11, marginLeft: 12 }}>
                    I agree to the terms and privacy policy
                  </Text>
                </Pressable>

                <View style={{ marginTop: 18 }}>
                  <View style={{ position: "absolute", left: -4, right: -4, top: -4, bottom: -4, borderRadius: 24, backgroundColor: "rgba(52,211,153,0.25)" }} />
                  <Pressable
                    disabled={!canSubmit}
                    onPress={onSubmit}
                    style={{
                      borderRadius: 24,
                      overflow: "hidden",
                      opacity: !canSubmit ? 0.6 : 1,
                    }}
                  >
                    <LinearGradient
                      colors={["#34d399", "#10b981", "#06b6d4"]}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={{ paddingVertical: 15, alignItems: "center", borderRadius: 24 }}
                    >
                      <Text style={{ color: "black", fontWeight: "600" }}>Continue</Text>
                    </LinearGradient>
                  </Pressable>
                </View>
              </View>
            </BlurView>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
