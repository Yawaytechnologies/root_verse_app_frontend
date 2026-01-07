// app/(auth)/login.tsx
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

/* ✅ Redux */
import {
  clearAuthError,
  loginFail,
  loginStart,
  loginSuccess,
} from "../../src/features/auth/authSlice";
import { useAppDispatch, useAppSelector } from "../../src/store/hooks";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

/* -------------------- Forgot glass modal (keep as-is) -------------------- */
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
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(0,0,0,1)",
          }}
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
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <View className="h-9 w-9 rounded-2xl items-center justify-center bg-white/5 border border-white/10">
                      <Ionicons
                        name="shield-checkmark-outline"
                        size={18}
                        color="#7dd3fc"
                      />
                    </View>
                    <Text className="text-white text-[14px] font-semibold ml-3">
                      Help
                    </Text>
                  </View>

                  <Pressable onPress={onClose} style={{ padding: 8, marginRight: -8 }}>
                    <Ionicons name="close" size={18} color="#cbd5e1" />
                  </Pressable>
                </View>

                <Text className="text-slate-300 text-[12px] mt-3 leading-5">
                  OTP login is handled via your registered mobile number. If you
                  don’t receive OTP, please contact your administrator.
                </Text>

                <View className="mt-5 flex-row">
                  <Pressable onPress={onClose} className="flex-1 rounded-2xl overflow-hidden">
                    <View className="py-3 items-center rounded-2xl bg-white/5 border border-white/10">
                      <Text className="text-slate-200 text-[12px] font-semibold">
                        Got it
                      </Text>
                    </View>
                  </Pressable>

                  <View style={{ width: 10 }} />

                  <Pressable onPress={onClose} className="flex-1 rounded-2xl overflow-hidden">
                    <LinearGradient
                      colors={["#34d399", "#10b981", "#06b6d4"]}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={{ paddingVertical: 12, borderRadius: 16, alignItems: "center" }}
                    >
                      <Text className="text-black text-[12px] font-semibold">
                        Contact admin
                      </Text>
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
  const dispatch = useAppDispatch();

  // ✅ SAFEST: don’t destructure from possibly-undefined object
  const loading = useAppSelector((s) => s.auth?.loading ?? false);

  // ✅ OTP login inputs
  const [phone, setPhone] = useState("");
  const [agree, setAgree] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  // ✅ Validation
  const phoneDigits = useMemo(() => phone.replace(/[^\d]/g, ""), [phone]);
  const phoneOk = useMemo(() => phoneDigits.length === 10, [phoneDigits]);
  const canSubmit = phoneOk && agree && !loading;

  const phoneRef = useRef<TextInput>(null);

  const onSubmit = async () => {
    if (!canSubmit) return;

    dispatch(clearAuthError());
    dispatch(loginStart());

    try {
      // ✅ format for India (+91)
      const e164 = `+91${phoneDigits}`;

      // ✅ For now: just route to OTP screen.
      dispatch(loginSuccess({ step: "OTP_SENT", phone: e164 } as any));

      router.push({
        pathname: "/(auth)/otp",
        params: { phone: e164 },
      });
    } catch (e: any) {
      dispatch(loginFail(e?.message || "OTP send failed"));
    }
  };

  const keyboardOpen = useSharedValue(0);
  const keyboardH = useSharedValue(0);

  const bgDim = useSharedValue(0);

  const dimOn = () => {
    bgDim.value = withTiming(1, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  };

  const dimOffIfNoFocus = () => {
    setTimeout(() => {
      const focused = phoneRef.current?.isFocused?.() ?? false;
      if (!focused) {
        bgDim.value = withTiming(0, {
          duration: 220,
          easing: Easing.out(Easing.cubic),
        });
      }
    }, 80);
  };

  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const subShow = Keyboard.addListener(showEvt, (e: any) => {
      const h = e?.endCoordinates?.height ?? 0;
      keyboardH.value = h;

      keyboardOpen.value = withTiming(1, {
        duration: 240,
        easing: Easing.out(Easing.cubic),
      });
      dimOn();
    });

    const subHide = Keyboard.addListener(hideEvt, () => {
      keyboardOpen.value = withTiming(0, {
        duration: 220,
        easing: Easing.out(Easing.cubic),
      });
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
    bob.value = withRepeat(
      withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    sway.value = withRepeat(
      withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    drift.value = withRepeat(
      withTiming(1, { duration: 5200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, []);

  const fishAnim = useAnimatedStyle(() => {
    const ty = interpolate(bob.value, [0, 1], [6, -6]);
    const rot = interpolate(sway.value, [0, 1], [-3, 3]);
    const tx = interpolate(drift.value, [0, 0.5, 1], [-5, 6, -5]);
    return {
      transform: [{ translateX: tx }, { translateY: ty }, { rotateZ: `${rot}deg` }],
    };
  });

  /* Hero intro */
  const heroProgress = useSharedValue(0);
  const formProgress = useSharedValue(0);

  useEffect(() => {
    heroProgress.value = withDelay(
      2000,
      withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) })
    );
    formProgress.value = withDelay(
      2900,
      withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) })
    );
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
        colors={[
          "rgba(16,185,129,0.22)",
          "rgba(0,0,0,0.86)",
          "rgba(0,0,0,0.96)",
        ]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: "absolute", inset: 0 }}
      />

      <ForgotGlassModal open={helpOpen} onClose={() => setHelpOpen(false)} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {/* Hero */}
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

              <View className="mt-0 items-center">
                <Text style={{ fontFamily: "System", fontWeight: "900", fontSize: 50, letterSpacing: 3, color: "white", textAlign: "center", textTransform: "uppercase" }}>
                  ROOTVERSE
                </Text>

                <Text style={{ fontFamily: "System", fontWeight: "800", fontSize: 18, letterSpacing: 3, color: "#0ea5e9", textAlign: "center", marginTop: 4 }}>
                  BLUE ECONOMY
                </Text>

                <Text style={{ fontFamily: "System", fontWeight: "800", fontSize: 18, letterSpacing: 3, color: "#0ea5e9", textAlign: "center", marginTop: 4 }}>
                  TRACEABILITY SYSTEM
                </Text>
              </View>
            </View>
          </Animated.View>
        </View>

        {/* Dim overlay */}
        <Animated.View
          pointerEvents="none"
          style={[
            { position: "absolute", inset: 0, backgroundColor: "black", zIndex: 5 },
            dimOverlayAnim,
          ]}
        />

        {/* Card */}
        <View style={{ position: "absolute", left: 20, right: 20, bottom: 190, zIndex: 10 }}>
          <Animated.View style={formAnim}>
            <BlurView intensity={22} tint="dark" style={{ borderRadius: 26, overflow: "hidden" }}>
              <View style={{ backgroundColor: "rgba(0,0,0,0.35)", borderWidth: 1, borderColor: "rgba(255,255,255,0.10)", borderRadius: 26, padding: 20 }}>
                <Text style={{ color: "#cbd5e1", fontSize: 14, marginBottom: 16, textAlign: "center" }}>
                  Sign in to continue.
                </Text>

                {/* Mobile */}
                <Text className="text-slate-300 text-[11px] mb-2">Mobile Number</Text>
                <View className="flex-row items-center bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                  <Ionicons name="call-outline" size={18} color="#94a3b8" />
                  <TextInput
                    ref={phoneRef}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="Enter 10-digit mobile number"
                    placeholderTextColor="#64748b"
                    keyboardType="phone-pad"
                    className="text-white flex-1 ml-3"
                    style={{ backgroundColor: "transparent" }}
                    onFocus={dimOn}
                    onBlur={dimOffIfNoFocus}
                    maxLength={14}
                  />
                  <View
                    className={`h-2.5 w-2.5 rounded-full ${phone.length === 0 ? "bg-slate-700" : phoneOk ? "bg-emerald-400" : "bg-rose-400"
                      }`}
                  />
                </View>

                {/* ✅ Register (left) + Help (right) */}
                <View className="flex-row items-center mt-3">
                  {/* Left side: takes remaining space, wraps if needed */}
                  <View className="flex-1 pr-3">
                    <Text className="text-slate-300 text-[11px]" numberOfLines={2}>
                      {"If you don't have account "}
                      <Text
                        className="text-emerald-300 text-[11px] font-semibold"
                        onPress={() => router.push({ pathname: "/(auth)/register" } as any)}
                      >
                        Register here
                      </Text>
                    </Text>
                  </View>

                  {/* Right side: pinned */}
                  <Pressable onPress={() => setHelpOpen(true)} hitSlop={10}>
                    <Text className="text-emerald-300 text-[11px] font-semibold">
                      Need help?
                    </Text>
                  </Pressable>
                </View>
                <Pressable
                  onPress={() => setAgree((p) => !p)}
                  style={{ flexDirection: "row", alignItems: "center", marginTop: 20 }}
                >
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
                  <View
                    style={{
                      position: "absolute",
                      left: -4,
                      right: -4,
                      top: -4,
                      bottom: -4,
                      borderRadius: 24,
                      backgroundColor: "rgba(52,211,153,0.25)",
                    }}
                  />
                  <Pressable
                    disabled={!canSubmit}
                    onPress={onSubmit}
                    style={{ borderRadius: 24, overflow: "hidden", opacity: !canSubmit ? 0.6 : 1 }}
                  >
                    <LinearGradient
                      colors={["#34d399", "#10b981", "#06b6d4"]}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={{ paddingVertical: 15, alignItems: "center", borderRadius: 24 }}
                    >
                      <Text className="text-black font-semibold">
                        {loading ? "Sending..." : "Send OTP"}
                      </Text>
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
