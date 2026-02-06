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
  Linking,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

// ✅ Redux
import { loginWithPhone } from "../../src/store/auth/login.slice";
import { useAppDispatch } from "../../src/store/hooks";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

/** -------------------- Brand copy (content only) -------------------- */
const COMPANY_NAME = "ROOTVERSE";
const APP_NAME = "ONEBLUE";
const PLATFORM_NAME = "BLUEOS";

/**
 * Optional (recommended):
 * EXPO_PUBLIC_ADMIN_HELP_PHONE="+91XXXXXXXXXX"
 * EXPO_PUBLIC_TERMS_URL="https://yourdomain.com/terms"
 * EXPO_PUBLIC_PRIVACY_URL="https://yourdomain.com/privacy"
 */
const ADMIN_HELP_PHONE = (process.env.EXPO_PUBLIC_ADMIN_HELP_PHONE || "").trim();
const TERMS_URL = (process.env.EXPO_PUBLIC_TERMS_URL || "").trim();
const PRIVACY_URL = (process.env.EXPO_PUBLIC_PRIVACY_URL || "").trim();

const openUrlSafe = async (url: string) => {
  try {
    if (!url) return;
    const ok = await Linking.canOpenURL(url);
    if (ok) await Linking.openURL(url);
  } catch {
    // no-op
  }
};

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

  const contactAdmin = async () => {
    if (!ADMIN_HELP_PHONE) {
      alert(
        "Admin help contact is not configured.\n\nPlease contact your organization administrator via your internal support channel."
      );
      return;
    }
    await openUrlSafe(`tel:${ADMIN_HELP_PHONE}`);
  };

  return (
    <Modal
      visible={open}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
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
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,1)",
          }}
        />

        <Animated.View style={cardAnim}>
          <View style={{ borderRadius: 26, overflow: "visible" }}>
            <View
              style={{
                position: "absolute",
                top: -8,
                left: -8,
                right: -8,
                bottom: -8,
                borderRadius: 30,
                backgroundColor: "rgba(16,185,129,0.18)",
              }}
            />

            <BlurView
              intensity={28}
              tint="dark"
              style={{ borderRadius: 26, overflow: "hidden" }}
            >
              <View
                style={{
                  borderRadius: 26,
                  padding: 18,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.12)",
                  backgroundColor: "rgba(0,0,0,0.50)",
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
                      Sign-in help
                    </Text>
                  </View>

                  <Pressable
                    onPress={onClose}
                    style={{ padding: 8, marginRight: -8 }}
                  >
                    <Ionicons name="close" size={18} color="#cbd5e1" />
                  </Pressable>
                </View>

                <Text className="text-slate-300 text-[12px] mt-3 leading-5">
                  {APP_NAME} uses OTP verification for secure access.
                  {"\n\n"}
                  OTP is sent only to the mobile number registered for your
                  account. If you changed your number or OTP doesn’t arrive,
                  contact your administrator.
                </Text>

                <View className="mt-5 flex-row">
                  <Pressable
                    onPress={onClose}
                    className="flex-1 rounded-2xl overflow-hidden"
                  >
                    <View className="py-3 items-center rounded-2xl bg-white/5 border border-white/10">
                      <Text className="text-slate-200 text-[12px] font-semibold">
                        Close
                      </Text>
                    </View>
                  </Pressable>

                  <View style={{ width: 10 }} />

                  <Pressable
                    onPress={contactAdmin}
                    className="flex-1 rounded-2xl overflow-hidden"
                  >
                    <LinearGradient
                      colors={["#34d399", "#10b981", "#06b6d4"]}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={{
                        paddingVertical: 12,
                        borderRadius: 16,
                        alignItems: "center",
                      }}
                    >
                      <Text className="text-black text-[12px] font-semibold">
                        Contact admin
                      </Text>
                    </LinearGradient>
                  </Pressable>
                </View>

                {ADMIN_HELP_PHONE ? (
                  <Text className="text-slate-400 text-[10px] mt-3 text-center">
                    Admin helpline: {ADMIN_HELP_PHONE}
                  </Text>
                ) : null}
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
  // ✅ OTP login inputs
  const [phone, setPhone] = useState("");
  const [agree, setAgree] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [sending, setSending] = useState(false);

  // ✅ Redux
  const dispatch = useAppDispatch();

  // ✅ Safe area + professional layout sizing
  const insets = useSafeAreaInsets();
  const SIDE = 20;
  const CARD_MAX_W = 520;
  const CARD_W = Math.min(SCREEN_W - SIDE * 2, CARD_MAX_W);
  const CARD_BOTTOM = insets.bottom + 98;
  const SCRIM_H = Math.min(SCREEN_H * 0.55, 520);

  // ✅ Validation
  const phoneDigits = useMemo(() => phone.replace(/[^\d]/g, ""), [phone]);
  const phoneOk = useMemo(() => phoneDigits.length === 10, [phoneDigits]);
  const canSubmit = phoneOk && agree && !sending;

  const phoneRef = useRef<TextInput>(null);

  const onSubmit = async () => {
    if (!canSubmit) return;

    setSending(true);
    try {
      const loginRes = await dispatch(loginWithPhone(phoneDigits)).unwrap();

      if (!(loginRes as any)?.token) {
        throw new Error("TOKEN_NOT_RECEIVED");
      }

      router.push({
        pathname: "/(auth)/otp",
        params: { phone_no: phoneDigits },
      } as any);
    } catch (e: any) {
      console.log("LOGIN_ERROR", e);
      alert(typeof e === "string" ? e : e?.message || "Login failed");
    } finally {
      setSending(false);
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
      keyboardH.value = e?.endCoordinates?.height ?? 0;
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
      transform: [
        { translateX: tx },
        { translateY: ty },
        { rotateZ: `${rot}deg` },
      ],
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

  // ✅ keep your existing alignment animation (unchanged)
  const heroAnim = useAnimatedStyle(() => {
    const translateY = interpolate(heroProgress.value, [0, 1], [0, -SCREEN_H * 0.25]);
    const scale = interpolate(heroProgress.value, [0, 1], [1.14, 0.96]);
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

  const showPhoneError = phoneDigits.length > 0 && !phoneOk;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "black", position: "relative" }}>
      <LinearGradient
        colors={["rgba(16,185,129,0.22)", "rgba(0,0,0,0.86)", "rgba(0,0,0,0.96)"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />

      {/* ✅ Bottom scrim */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: SCRIM_H,
          zIndex: 4,
        }}
      >
        <LinearGradient
          colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.75)", "rgba(0,0,0,0.95)"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ flex: 1 }}
        />
      </View>

      <ForgotGlassModal open={helpOpen} onClose={() => setHelpOpen(false)} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Hero */}
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingBottom: SCRIM_H * 0.08, // keep as your current
          }}
        >
          <Animated.View style={heroAnim}>
            <View style={{ alignItems: "center" }}>
              <Animated.View style={fishAnim}>
                <Image
                  source={require("../../assets/images/Fish.png")}
                  resizeMode="contain"
                  style={{ width: heroFishWidth, height: heroFishHeight }}
                />
              </Animated.View>

              {/* ✅ ONLY CHANGED: Heading hierarchy (ONEBLUE primary, ROOTVERSE secondary) */}
              <View className="mt-0 items-center">
                <Text
                  style={{
                    fontFamily: "System",
                    fontWeight: "900",
                    fontSize: 48, // primary heading
                    letterSpacing: 4,
                    color: "white",
                    textAlign: "center",
                    textTransform: "uppercase",
                  }}
                >
                  {APP_NAME}
                </Text>

                <Text
                  style={{
                    fontFamily: "System",
                    fontWeight: "800",
                    fontSize: 14, // secondary
                    letterSpacing: 3,
                    color: "#94a3b8",
                    textAlign: "center",
                    marginTop: 6,
                    textTransform: "uppercase",
                    opacity: 0.95,
                  }}
                >
                  by {COMPANY_NAME}
                </Text>

                <Text
                  style={{
                    fontFamily: "System",
                    fontWeight: "800",
                    fontSize: 12,
                    letterSpacing: 3,
                    color: "#0ea5e9",
                    textAlign: "center",
                    marginTop: 10,
                    textTransform: "uppercase",
                    opacity: 0.9,
                  }}
                >
                  Record. Verify. Track.
                </Text>
              </View>
            </View>
          </Animated.View>
        </View>

        {/* Dim overlay */}
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "black",
              zIndex: 6,
            },
            dimOverlayAnim,
          ]}
        />

        {/* Card */}
        <View
          style={{
            position: "absolute",
            bottom: CARD_BOTTOM,
            width: CARD_W,
            alignSelf: "center",
            zIndex: 10,
          }}
        >
          <Animated.View style={formAnim}>
            <BlurView
              intensity={22}
              tint="dark"
              style={{ borderRadius: 26, overflow: "hidden" }}
            >
              <View
                style={{
                  backgroundColor: "rgba(0,0,0,0.58)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.14)",
                  borderRadius: 26,
                  padding: 20,
                }}
              >
                <Text
                  style={{
                    color: "white",
                    fontSize: 18,
                    fontWeight: "800",
                    textAlign: "center",
                  }}
                >
                  Sign in to {APP_NAME}
                </Text>

                <Text
                  style={{
                    color: "#cbd5e1",
                    fontSize: 12,
                    marginTop: 8,
                    marginBottom: 16,
                    textAlign: "center",
                  }}
                >
                  Enter your registered mobile number. We’ll send an OTP to verify
                  your access.
                </Text>

                {/* Mobile */}
                <Text className="text-slate-300 text-[11px] mb-2">
                  Registered mobile number
                </Text>
                <View className="flex-row items-center bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                  <Ionicons name="call-outline" size={18} color="#94a3b8" />
                  <TextInput
                    ref={phoneRef}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="10-digit mobile number"
                    placeholderTextColor="#64748b"
                    keyboardType="phone-pad"
                    className="text-white flex-1 ml-3"
                    style={{ backgroundColor: "transparent" }}
                    onFocus={dimOn}
                    onBlur={dimOffIfNoFocus}
                    maxLength={14}
                    returnKeyType="done"
                    onSubmitEditing={onSubmit}
                  />
                  <View
                    className={`h-2.5 w-2.5 rounded-full ${
                      phone.length === 0
                        ? "bg-slate-700"
                        : phoneOk
                        ? "bg-emerald-400"
                        : "bg-rose-400"
                    }`}
                  />
                </View>

                {showPhoneError && (
                  <Text style={{ color: "#fda4af", fontSize: 10, marginTop: 8 }}>
                    Enter a valid 10-digit mobile number.
                  </Text>
                )}

                {/* Register + Help */}
                <View className="flex-row items-center mt-3">
                  <View className="flex-1 pr-3">
                    <Text className="text-slate-300 text-[11px]" numberOfLines={2}>
                      {"Don’t have access yet? "}
                      <Text
                        className="text-emerald-300 text-[11px] font-semibold"
                        onPress={() =>
                          router.push({ pathname: "/(auth)/register" } as any)
                        }
                      >
                        Register here
                      </Text>
                      {" (if enabled)."}
                    </Text>
                  </View>

                  <Pressable onPress={() => setHelpOpen(true)} hitSlop={10}>
                    <Text className="text-emerald-300 text-[11px] font-semibold">
                      Need help?
                    </Text>
                  </Pressable>
                </View>

                {/* Agree */}
                <Pressable
                  onPress={() => setAgree((p) => !p)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginTop: 18,
                  }}
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
                    {agree ? (
                      <Ionicons name="checkmark" size={14} color="#34d399" />
                    ) : null}
                  </View>

                  <Text style={{ color: "#cbd5e1", fontSize: 11, marginLeft: 12 }}>
                    I agree to the{" "}
                    <Text
                      style={{ color: "#6ee7b7", fontWeight: "700" }}
                      onPress={() =>
                        TERMS_URL
                          ? openUrlSafe(TERMS_URL)
                          : alert("Terms URL not configured.")
                      }
                    >
                      Terms
                    </Text>
                    {" "}and{" "}
                    <Text
                      style={{ color: "#6ee7b7", fontWeight: "700" }}
                      onPress={() =>
                        PRIVACY_URL
                          ? openUrlSafe(PRIVACY_URL)
                          : alert("Privacy URL not configured.")
                      }
                    >
                      Privacy Policy
                    </Text>
                  </Text>
                </Pressable>

                {/* Send OTP */}
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
                      style={{
                        paddingVertical: 15,
                        alignItems: "center",
                        borderRadius: 24,
                      }}
                    >
                      <Text className="text-black font-semibold">
                        {sending ? "Sending OTP..." : "Send OTP"}
                      </Text>
                    </LinearGradient>
                  </Pressable>

                  <Text
                    style={{
                      color: "#64748b",
                      fontSize: 10,
                      marginTop: 10,
                      textAlign: "center",
                    }}
                  >
                    Secure access for authorized users only.
                  </Text>
                </View>
              </View>
            </BlurView>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
