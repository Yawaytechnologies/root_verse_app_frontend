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
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <View className="h-9 w-9 rounded-2xl items-center justify-center bg-white/5 border border-white/10">
                      <Ionicons name="shield-checkmark-outline" size={18} color="#7dd3fc" />
                    </View>
                    <Text className="text-white text-[14px] font-semibold ml-3">
                      Password recovery
                    </Text>
                  </View>

                  <Pressable onPress={onClose} className="p-2 -mr-2">
                    <Ionicons name="close" size={18} color="#cbd5e1" />
                  </Pressable>
                </View>

                <Text className="text-slate-300 text-[12px] mt-3 leading-5">
                  For security reasons, password reset is handled by your administrator.
                  Please contact admin to recover/reset your password.
                </Text>

                <View className="mt-5 flex-row">
                  <Pressable onPress={onClose} className="flex-1 rounded-2xl overflow-hidden">
                    <View className="py-3 items-center rounded-2xl bg-white/5 border border-white/10">
                      <Text className="text-slate-200 text-[12px] font-semibold">Got it</Text>
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
                      <Text className="text-black text-[12px] font-semibold">Contact admin</Text>
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
    router.replace("/(tabs)/home");
  };

  const idRef = useRef<TextInput>(null);
  const pwRef = useRef<TextInput>(null);

  const keyboardOpen = useSharedValue(0);
  const keyboardH = useSharedValue(0);

  // ✅ Full screen dim value
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
    <View className="flex-1 bg-black" style={{ position: "relative" }}>
      {/* Base gradient BG */}
      <LinearGradient
        colors={["rgba(16,185,129,0.22)", "rgba(0,0,0,0.86)", "rgba(0,0,0,0.96)"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: "absolute", inset: 0 }}
      />

      <ForgotGlassModal open={forgotOpen} onClose={() => setForgotOpen(false)} />

      {/* ✅ No ScrollView at all => nothing can scroll */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Hero (fixed) */}
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 20 }}>
          <Animated.View style={heroAnim}>
            <View className="items-center">
              <Animated.View style={fishAnim}>
                <Image
                  source={require("../../assets/images/Fish.png")}
                  resizeMode="contain"
                  style={{ width: heroFishWidth, height: heroFishHeight }}
                />
              </Animated.View>

              <View className="mt-0 items-center">
                <Text className="text-white text-[35px] font-extrabold tracking-wider">ROOTVERSE</Text>
                <Text className="text-sky-300 text-[18px] font-semibold tracking-[3px] mt-1">BLUE ECONOMY</Text>
                <Text className="text-sky-300 text-[18px] font-semibold tracking-[3px] mt-1">
                  TRACEABILITY SYSTEM
                </Text>
              </View>
            </View>
          </Animated.View>
        </View>

        {/* Full-screen dim overlay (below card) */}
        <Animated.View
          pointerEvents="none"
          style={[
            { position: "absolute", inset: 0, backgroundColor: "black", zIndex: 5 },
            dimOverlayAnim,
          ]}
        />

        {/* Login card (above overlay) */}
        <View style={{ position: "absolute", left: 20, right: 20, bottom: 120, zIndex: 10 }}>
          <Animated.View style={formAnim}>
            <BlurView intensity={22} tint="dark" style={{ borderRadius: 26, overflow: "hidden" }}>
              <View className="bg-black/35 border border-white/10 rounded-[26px] p-5">
                <Text className="text-slate-300 text-[14px] mb-4 text-center">
                  Sign in to continue.
                </Text>

                {/* ID */}
                <Text className="text-slate-300 text-[11px] mb-2">ID</Text>
                <View className="flex-row items-center bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                  <Ionicons name="person-outline" size={18} color="#94a3b8" />
                  <TextInput
                    ref={idRef}
                    value={userId}
                    onChangeText={setUserId}
                    placeholder="Enter your ID"
                    placeholderTextColor="#64748b"
                    autoCapitalize="none"
                    className="text-white flex-1 ml-3"
                    style={{ backgroundColor: "transparent" }}
                    onFocus={dimOn}
                    onBlur={dimOffIfNoFocus}
                  />
                  <View
                    className={`h-2.5 w-2.5 rounded-full ${
                      userId.length === 0 ? "bg-slate-700" : idOk ? "bg-emerald-400" : "bg-rose-400"
                    }`}
                  />
                </View>

                {/* Password */}
                <Text className="text-slate-300 text-[11px] mt-4 mb-2">Password</Text>
                <View className="flex-row items-center bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                  <Ionicons name="lock-closed-outline" size={18} color="#94a3b8" />
                  <TextInput
                    ref={pwRef}
                    value={pw}
                    onChangeText={setPw}
                    placeholder="••••••••"
                    placeholderTextColor="#64748b"
                    secureTextEntry={!show}
                    className="text-white flex-1 ml-3"
                    style={{ backgroundColor: "transparent" }}
                    onFocus={dimOn}
                    onBlur={dimOffIfNoFocus}
                  />
                  <Pressable onPress={() => setShow((p) => !p)} className="p-2 -mr-2">
                    <Ionicons
                      name={show ? "eye-off-outline" : "eye-outline"}
                      size={18}
                      color="#94a3b8"
                    />
                  </Pressable>
                </View>

                {/* Forgot */}
                <View className="flex-row items-center justify-end mt-3">
                  <Pressable onPress={() => setForgotOpen(true)}>
                    <Text className="text-emerald-300 text-[11px] font-semibold">Forgot?</Text>
                  </Pressable>
                </View>

                {/* Agree */}
                <Pressable onPress={() => setAgree((p) => !p)} className="flex-row items-center mt-4">
                  <View className="h-5 w-5 rounded-md border border-white/20 items-center justify-center bg-white/5">
                    {agree ? <Ionicons name="checkmark" size={14} color="#34d399" /> : null}
                  </View>
                  <Text className="text-slate-300 text-[11px] ml-3">
                    I agree to the terms and privacy policy
                  </Text>
                </Pressable>

                {/* CTA */}
                <View className="mt-5">
                  <View className="absolute -inset-1 rounded-3xl bg-emerald-400/25" />
                  <Pressable
                    disabled={!canSubmit}
                    onPress={onSubmit}
                    className={`rounded-3xl overflow-hidden ${!canSubmit ? "opacity-60" : "opacity-100"}`}
                  >
                    <LinearGradient
                      colors={["#34d399", "#10b981", "#06b6d4"]}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={{ paddingVertical: 15, alignItems: "center", borderRadius: 24 }}
                    >
                      <Text className="text-black font-semibold">Continue</Text>
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
