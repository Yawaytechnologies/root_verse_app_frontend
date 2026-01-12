// app/(auth)/otp.tsx
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
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
  withTiming,
} from "react-native-reanimated";

// ✅ Redux
import { useDispatch, useSelector } from "react-redux";
import { loginWithPhone } from "../../src/store/auth/login.slice";
import type { AppDispatch, RootState } from "../../src/store/store";

const { height: SCREEN_H } = Dimensions.get("window");

export default function OtpScreen() {
  // ✅ phone_no can be string | string[] | undefined
  const params = useLocalSearchParams<{ phone_no?: string | string[] }>();
  const phone_no = Array.isArray(params.phone_no) ? params.phone_no[0] : params.phone_no;

  const dispatch = useDispatch<AppDispatch>();
 const login = useSelector((s: RootState) => (s as any).login ?? (s as any).auth);

  const [otp, setOtp] = useState("");
  const [sec, setSec] = useState(30);
  const [agree, setAgree] = useState(true);
  const [loading, setLoading] = useState(false);

  // ✅ demo OTP: any 6 digits
  const otpOk = useMemo(() => /^\d{6}$/.test(otp), [otp]);
  const canVerify = otpOk && agree && !loading;

  const otpRef = useRef<TextInput>(null);

  // keyboard/dim animations
  const keyboardOpen = useSharedValue(0);
  const keyboardH = useSharedValue(0);
  const bgDim = useSharedValue(0);

  const dimOverlayAnim = useAnimatedStyle(() => ({
    opacity: interpolate(bgDim.value, [0, 1], [0, 0.88]),
  }));

  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const subShow = Keyboard.addListener(showEvt, (e: any) => {
      keyboardH.value = e?.endCoordinates?.height ?? 0;
      keyboardOpen.value = withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) });
      bgDim.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
    });

    const subHide = Keyboard.addListener(hideEvt, () => {
      keyboardOpen.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) });
      keyboardH.value = 0;
      bgDim.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) });
    });

    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, []);

  // card intro
  const formProgress = useSharedValue(0);
  useEffect(() => {
    formProgress.value = withDelay(
      250,
      withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) })
    );
  }, []);

  const formAnim = useAnimatedStyle(() => {
    const appearY = interpolate(formProgress.value, [0, 1], [40, 0]);
    const lift = -Math.min(keyboardH.value * 0.45, SCREEN_H * 0.24);
    const kbLiftY = interpolate(keyboardOpen.value, [0, 1], [0, lift]);

    return {
      opacity: formProgress.value,
      transform: [{ translateY: appearY + kbLiftY }],
    };
  });

  // resend timer
  useEffect(() => {
    if (sec <= 0) return;
    const t = setInterval(() => setSec((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [sec]);

  const routeByStatus = (status: any, rootType: any) => {
    if (status === "PENDING_APPROVAL") return router.replace("/(auth)/pending");
    if (status === "REJECTED") return router.replace("/(auth)/rejected");

    // APPROVED
    if (rootType === "WILD_CAPTURE") return router.replace("/(wild)/dashboard" as any);
    if (rootType === "AQUACULTURE") return router.replace("/(aqua)/dashboard" as any);
    if (rootType === "MARICULTURE") return router.replace("/(mari)/dashboard" as any);

    // fallback
    return router.replace("/(wild)/dashboard" as any);
  };

  const onVerify = async () => {
    if (!canVerify) return;

    if (!phone_no || phone_no.length !== 10) {
      Alert.alert("Error", "Phone number missing / invalid");
      return;
    }

    setLoading(true);
    try {
      const res = await dispatch(loginWithPhone(phone_no));

      // ✅ rejected
      if (loginWithPhone.rejected.match(res)) {
  const msg = (res.payload as string) || "Login blocked";
  const m = msg.toLowerCase();

  // ✅ pending / not approved -> pending screen
  if (m.includes("pending") || m.includes("approval") || m.includes("not approved")) {
    // toast optional
    Alert.alert("Waiting for approval", "Admin has not approved your account yet.");
    return router.replace("/(auth)/pending");
  }

  // ✅ rejected -> rejected screen
  if (m.includes("reject")) return router.replace("/(auth)/rejected");

  // ✅ only truly new user -> register
  if (m.includes("not found") || m.includes("no user")) {
    Alert.alert("Not registered", "Please register first.");
    return router.replace("/(auth)/register");
  }

  Alert.alert("Login blocked", msg);
  return;
}


      // ✅ fulfilled: route using payload FIRST (no stale redux read)
      const payload: any = (res as any).payload || {};
      const status = payload.status ?? payload.user?.status ?? login.status;
      const rootType = payload.rootverse_type ?? payload.user?.rootverse_type ?? login.rootverse_type;

      routeByStatus(status, rootType);
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    if (sec > 0) return;
    setSec(30); // demo
  };

  return (
    <View className="flex-1 bg-black" style={{ position: "relative" }}>
      <LinearGradient
        colors={["rgba(16,185,129,0.22)", "rgba(0,0,0,0.86)", "rgba(0,0,0,0.96)"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: "absolute", inset: 0 }}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={{ paddingTop: 70, paddingHorizontal: 20 }}>
          <Pressable onPress={() => router.back()} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="chevron-back" size={20} color="#cbd5e1" />
            <Text style={{ color: "#cbd5e1", fontWeight: "700" }}>Back</Text>
          </Pressable>

          <Text style={{ marginTop: 20, color: "white", fontSize: 28, fontWeight: "900" }}>
            Verify OTP
          </Text>
          <Text style={{ marginTop: 8, color: "#94a3b8" }}>
            Sent to {phone_no || "your number"}
          </Text>
        </View>

        <Animated.View
          pointerEvents="none"
          style={[{ position: "absolute", inset: 0, backgroundColor: "black", zIndex: 5 }, dimOverlayAnim]}
        />

        <View style={{ position: "absolute", left: 20, right: 20, bottom: 190, zIndex: 10 }}>
          <Animated.View style={formAnim}>
            <BlurView intensity={22} tint="dark" style={{ borderRadius: 26, overflow: "hidden" }}>
              <View className="bg-black/35 border border-white/10 rounded-[26px] p-5">
                

                <Text className="text-slate-300 text-[11px] mb-2">OTP</Text>
                <View className="flex-row items-center bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                  <Ionicons name="key-outline" size={18} color="#94a3b8" />
                  <TextInput
                    ref={otpRef}
                    value={otp}
                    onChangeText={(v) => setOtp(v.replace(/\D/g, "").slice(0, 6))}
                    placeholder="Enter OTP"
                    placeholderTextColor="#64748b"
                    keyboardType="number-pad"
                    className="text-white flex-1 ml-3"
                    style={{ backgroundColor: "transparent", letterSpacing: 6, fontSize: 18 }}
                  />
                  <View
                    className={`h-2.5 w-2.5 rounded-full ${
                      otp.length === 0 ? "bg-slate-700" : otpOk ? "bg-emerald-400" : "bg-rose-400"
                    }`}
                  />
                </View>

                <View className="flex-row items-center justify-between mt-3">
                  <Text className="text-slate-400 text-[11px]">
                    {sec > 0 ? `Resend OTP in ${sec}s` : "Didn’t get OTP?"}
                  </Text>

                  <Pressable onPress={onResend} disabled={sec > 0}>
                    <Text className={`text-[11px] font-semibold ${sec > 0 ? "text-slate-500" : "text-emerald-300"}`}>
                      Resend
                    </Text>
                  </Pressable>
                </View>

                <Pressable onPress={() => setAgree((p) => !p)} className="flex-row items-center mt-4">
                  <View className="h-5 w-5 rounded-md border border-white/20 items-center justify-center bg-white/5">
                    {agree ? <Ionicons name="checkmark" size={14} color="#34d399" /> : null}
                  </View>
                  <Text className="text-slate-300 text-[11px] ml-3">I confirm this OTP is mine</Text>
                </Pressable>

                <View className="mt-5">
                  <View className="absolute -inset-1 rounded-3xl bg-emerald-400/25" />
                  <Pressable
                  disabled={!canVerify}
                    onPress={onVerify}
                    className={`rounded-3xl overflow-hidden ${!canVerify || login.loading ? "opacity-60" : "opacity-100"}`}
                  >
                    <LinearGradient
                      colors={["#34d399", "#10b981", "#06b6d4"]}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={{ paddingVertical: 15, alignItems: "center", borderRadius: 24 }}
                    >
                      <Text className="text-black font-semibold">
                        {loading || login.loading ? "Checking..." : "Verify & Continue"}
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
