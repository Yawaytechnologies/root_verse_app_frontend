import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import * as ImagePicker from "expo-image-picker";

/** ✅ Redux */
import { useDispatch, useSelector } from "react-redux";
import { registerUser, type RootverseType } from "../../src/store/auth/registration.slice";
import type { AppDispatch, RootState } from "../../src/store/auth/store";
import { fetchDistrictsByState, fetchStates } from "../../src/store/auth/location.slice";

/** ✅ Toast */
import Toast from "react-native-toast-message";

type Category = "WILD" | "AQUA" | "MARI";

const MODULES: Array<{
  key: Category;
  title: string;
  subtitle: string;
  accent: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { key: "WILD", title: "Wild Culture", subtitle: "Register for Wild Capture module", accent: "#38bdf8", icon: "fish-outline" },
  { key: "AQUA", title: "Aqua Culture", subtitle: "Register for Aquaculture module", accent: "#34d399", icon: "water-outline" },
  { key: "MARI", title: "Mari Culture", subtitle: "Register for Mariculture module", accent: "#a78bfa", icon: "leaf-outline" },
];

function isValidPhone10(phone: string) {
  return /^\d{10}$/.test(phone);
}
function isValidAddress(address: string) {
  return address.trim().length >= 8;
}

function mapToBackendRootverseType(k: Category): RootverseType {
  if (k === "WILD") return "WILD_CAPTURE";
  if (k === "AQUA") return "AQUACULTURE";
  return "MARICULTURE";
}

function ModuleCard({
  title,
  subtitle,
  accent,
  icon,
  onPress,
}: {
  title: string;
  subtitle: string;
  accent: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="rounded-[26px] overflow-hidden">
      <BlurView intensity={22} tint="dark" style={{ borderRadius: 26, overflow: "hidden" }}>
        <View className="bg-black/35 border border-white/10 rounded-[26px] p-5">
          <View className="flex-row items-center justify-between">
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text className="text-white font-extrabold" style={{ fontSize: 16 }} numberOfLines={1}>
                {title}
              </Text>
              <Text className="text-slate-300" style={{ fontSize: 11, marginTop: 4, lineHeight: 16 }} numberOfLines={2}>
                {subtitle}
              </Text>
            </View>

            <View className="h-11 w-11 rounded-2xl items-center justify-center border border-white/10 bg-white/5">
              <Ionicons name={icon} size={18} color={accent} />
            </View>
          </View>

          <View className="mt-4 flex-row items-center justify-between">
            <Text className="text-slate-300" style={{ fontSize: 11, flex: 1, paddingRight: 10 }} numberOfLines={1}>
              Tap to register for this module
            </Text>

            <View className="flex-row items-center">
              <Text className="text-sky-300 text-[11px] font-semibold mr-1">Open</Text>
              <Ionicons name="chevron-forward" size={14} color="#7dd3fc" />
            </View>
          </View>
        </View>
      </BlurView>
    </Pressable>
  );
}

/** ✅ Dark list modal (NO dim overlay) */
function SelectListModal<T extends { id: number; name: string }>({
  open,
  title,
  items,
  loading,
  selectedId,
  disabledText,
  onClose,
  onSelect,
}: {
  open: boolean;
  title: string;
  items: T[];
  loading: boolean;
  selectedId: number | null;
  disabledText?: string;
  onClose: () => void;
  onSelect: (item: T) => void;
}) {
  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 18, backgroundColor: "transparent" }}>
        {/* tap outside to close (NO background color = NO overlay) */}
        <Pressable onPress={onClose} style={{ position: "absolute", inset: 0, backgroundColor: "transparent" }} />

        <View
          style={{
            borderRadius: 22,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.10)",
            backgroundColor: "rgba(0,0,0,0.92)",
          }}
        >
          <BlurView intensity={18} tint="dark" style={{ padding: 14 }}>
            <View className="flex-row items-center justify-between">
              <Text className="text-white font-extrabold" style={{ fontSize: 14 }}>
                {title}
              </Text>
              <Pressable onPress={onClose} className="p-2 -mr-2">
                <Ionicons name="close" size={18} color="#cbd5e1" />
              </Pressable>
            </View>

            <View style={{ marginTop: 10, maxHeight: 340 }}>
              <ScrollView showsVerticalScrollIndicator={false}>
                {!!disabledText ? (
                  <Text className="text-slate-400 text-[12px] py-4">{disabledText}</Text>
                ) : loading ? (
                  <Text className="text-slate-400 text-[12px] py-4">Loading...</Text>
                ) : items.length === 0 ? (
                  <Text className="text-slate-400 text-[12px] py-4">No items found.</Text>
                ) : (
                  items.map((it) => {
                    const active = selectedId === it.id;
                    return (
                      <Pressable
                        key={it.id}
                        onPress={() => onSelect(it)}
                        style={{
                          paddingVertical: 12,
                          paddingHorizontal: 12,
                          borderRadius: 14,
                          marginBottom: 8,
                          borderWidth: 1,
                          borderColor: active ? "rgba(125,211,252,0.35)" : "rgba(255,255,255,0.08)",
                          backgroundColor: active ? "rgba(125,211,252,0.10)" : "rgba(255,255,255,0.04)",
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <Text className="text-white text-[12px]" numberOfLines={1} style={{ paddingRight: 12 }}>
                          {it.name}
                        </Text>
                        {active ? <Ionicons name="checkmark" size={18} color="#7dd3fc" /> : null}
                      </Pressable>
                    );
                  })
                )}
              </ScrollView>
            </View>
          </BlurView>
        </View>
      </View>
    </Modal>
  );
}

function RegisterModal({
  open,
  onClose,
  module,
}: {
  open: boolean;
  onClose: () => void;
  module: (typeof MODULES)[number] | null;
}) {
  const dispatch = useDispatch<AppDispatch>();
  const loading = useSelector((s: RootState) => s.registration.loading);

  const {
    states,
    statesLoading,
    statesError,
    districtsByStateId,
    districtsLoadingByStateId,
    districtsErrorByStateId,
  } = useSelector((s: RootState) => (s as any).location);

  const [username, setUsername] = useState("");
  const [phone_no, setPhoneNo] = useState("");
  const [address, setAddress] = useState("");
  const [profile_image_uri, setProfileUri] = useState("");

  const [stateId, setStateId] = useState<number | null>(null);
  const [districtId, setDistrictId] = useState<number | null>(null);

  const [stateModal, setStateModal] = useState(false);
  const [districtModal, setDistrictModal] = useState(false);

  const userRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const addrRef = useRef<TextInput>(null);

  React.useEffect(() => {
    if (open) {
      setUsername("");
      setPhoneNo("");
      setAddress("");
      setProfileUri("");
      setStateId(null);
      setDistrictId(null);
      setStateModal(false);
      setDistrictModal(false);

      dispatch(fetchStates());
      setTimeout(() => userRef.current?.focus?.(), 150);
    }
  }, [open, module?.key]);

  const districts = useMemo(() => {
    if (!stateId) return [];
    const arr = districtsByStateId?.[stateId];
    return Array.isArray(arr) ? arr : [];
  }, [stateId, districtsByStateId]);

  const districtsLoading = useMemo(() => {
    if (!stateId) return false;
    return !!districtsLoadingByStateId?.[stateId];
  }, [stateId, districtsLoadingByStateId]);

  const districtsError = useMemo(() => {
    if (!stateId) return null;
    return districtsErrorByStateId?.[stateId] ?? null;
  }, [stateId, districtsErrorByStateId]);

  const selectedStateName = useMemo(
    () => states?.find((s: any) => s.id === stateId)?.name ?? "",
    [states, stateId]
  );

  const selectedDistrictName = useMemo(
    () => districts?.find((d: any) => d.id === districtId)?.name ?? "",
    [districts, districtId]
  );

  const usernameOk = useMemo(() => username.trim().length >= 2, [username]);
  const phoneOk = useMemo(() => isValidPhone10(phone_no), [phone_no]);
  const addressOk = useMemo(() => isValidAddress(address), [address]);
  const photoOk = useMemo(() => profile_image_uri.trim().length > 0, [profile_image_uri]);

  const canSubmit = usernameOk && phoneOk && addressOk && photoOk && !!stateId && !!districtId;

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Toast.show({ type: "error", text1: "Permission needed", text2: "Allow gallery permission.", position: "top" });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      const uri = result.assets?.[0]?.uri ?? "";
      if (uri) setProfileUri(uri);
    }
  };

  const onRegister = async () => {
    if (!module || !canSubmit || loading) return;

    const rootverse_type = mapToBackendRootverseType(module.key);

    const res = await dispatch(
      registerUser({
        username: username.trim(),
        phone_no,
        address: address.trim(),
        rootverse_type,
        profile_image_uri,
        state_id: stateId!,
        district_id: districtId!,
      })
    );

    if (registerUser.rejected.match(res)) {
      Toast.show({
        type: "error",
        text1: "Registration failed",
        text2: (res.payload as string) || res.error.message || "Try again",
        position: "top",
      });
      return;
    }

    Toast.show({
      type: "success",
      text1: "Registered successfully",
      text2: `${module.title} • ${phone_no}`,
      position: "top",
    });

    onClose();
    router.replace("/(auth)/login");
  };

  if (!module) return null;

  return (
    <>
      <SelectListModal
        open={stateModal}
        title="Select State"
        items={states || []}
        loading={!!statesLoading}
        selectedId={stateId}
        onClose={() => setStateModal(false)}
        onSelect={(st: any) => {
          setStateId(st.id);
          setDistrictId(null);
          setStateModal(false);
          dispatch(fetchDistrictsByState({ stateId: st.id }));
        }}
      />

      <SelectListModal
        open={districtModal}
        title="Select District"
        items={districts}
        loading={districtsLoading}
        selectedId={districtId}
        disabledText={!stateId ? "Select state first" : undefined}
        onClose={() => setDistrictModal(false)}
        onSelect={(d: any) => {
          setDistrictId(d.id);
          setDistrictModal(false);
        }}
      />

      <Modal
        visible={open}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={onClose}
      >
        {/* IMPORTANT: no dim overlay */}
        <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 18, backgroundColor: "transparent" }}>
          <Pressable onPress={onClose} style={{ position: "absolute", inset: 0, backgroundColor: "transparent" }} />

          <View
            style={{
              borderRadius: 26,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.10)",
              backgroundColor: "rgba(0,0,0,0.92)",
            }}
          >
            <BlurView intensity={14} tint="dark" style={{ padding: 16 }}>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center" style={{ flex: 1, paddingRight: 10 }}>
                  <View className="h-10 w-10 rounded-2xl items-center justify-center border border-white/10 bg-white/5">
                    <Ionicons name={module.icon} size={18} color={module.accent} />
                  </View>
                  <View className="ml-3" style={{ flex: 1 }}>
                    <Text className="text-white font-extrabold" style={{ fontSize: 15 }} numberOfLines={1}>
                      {module.title}
                    </Text>
                    <Text className="text-slate-300" style={{ fontSize: 11, marginTop: 2 }} numberOfLines={1}>
                      Username • Phone • State • District • Address • Photo
                    </Text>
                  </View>
                </View>

                <Pressable onPress={onClose} className="p-2 -mr-2">
                  <Ionicons name="close" size={18} color="#cbd5e1" />
                </Pressable>
              </View>

              <Text className="text-slate-300 text-[11px] mt-4 mb-2">Profile Picture</Text>
              <Pressable
                onPress={pickImage}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  borderRadius: 16,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.12)",
                  backgroundColor: "rgba(255,255,255,0.04)",
                }}
              >
                <View
                  style={{
                    height: 44,
                    width: 44,
                    borderRadius: 14,
                    overflow: "hidden",
                    backgroundColor: "rgba(255,255,255,0.06)",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.10)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {profile_image_uri ? (
                    <Image source={{ uri: profile_image_uri }} style={{ height: 44, width: 44 }} />
                  ) : (
                    <Ionicons name="image-outline" size={18} color="#94a3b8" />
                  )}
                </View>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text className="text-white text-[12px] font-semibold" numberOfLines={1}>
                    {profile_image_uri ? "Photo selected" : "Choose from gallery"}
                  </Text>
                  <Text className="text-slate-400 text-[10px] mt-0.5" numberOfLines={1}>
                    {profile_image_uri ? profile_image_uri : "Tap to pick a profile image"}
                  </Text>
                </View>
              </Pressable>

              <Text className="text-slate-300 text-[11px] mt-4 mb-2">Username</Text>
              <View style={{ flexDirection: "row", alignItems: "center", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.04)" }}>
                <Ionicons name="person-outline" size={18} color="#94a3b8" />
                <TextInput
                  ref={userRef}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Enter username"
                  placeholderTextColor="#64748b"
                  style={{ flex: 1, marginLeft: 12, color: "white" }}
                  returnKeyType="next"
                  onSubmitEditing={() => phoneRef.current?.focus()}
                />
              </View>

              <Text className="text-slate-300 text-[11px] mt-4 mb-2">Phone Number</Text>
              <View style={{ flexDirection: "row", alignItems: "center", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.04)" }}>
                <Ionicons name="call-outline" size={18} color="#94a3b8" />
                <TextInput
                  ref={phoneRef}
                  value={phone_no}
                  onChangeText={(t) => setPhoneNo(t.replace(/[^\d]/g, ""))}
                  placeholder="10-digit mobile number"
                  placeholderTextColor="#64748b"
                  keyboardType="number-pad"
                  maxLength={10}
                  style={{ flex: 1, marginLeft: 12, color: "white" }}
                  returnKeyType="next"
                  onSubmitEditing={() => addrRef.current?.focus()}
                />
              </View>

              <Text className="text-slate-300 text-[11px] mt-4 mb-2">State</Text>
              <Pressable
                onPress={() => setStateModal(true)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  borderRadius: 16,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.12)",
                  backgroundColor: "rgba(255,255,255,0.04)",
                }}
              >
                <Ionicons name="map-outline" size={18} color="#94a3b8" />
                <Text style={{ flex: 1, marginLeft: 12, color: selectedStateName ? "white" : "#64748b", fontSize: 12 }}>
                  {statesLoading ? "Loading states..." : selectedStateName || "Select state"}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#cbd5e1" />
              </Pressable>

              <Text className="text-slate-300 text-[11px] mt-4 mb-2">District</Text>
              <Pressable
                onPress={() => {
                  if (!stateId) {
                    Toast.show({ type: "info", text1: "Select state first", position: "top" });
                    return;
                  }
                  if (!districtsLoading && districts.length === 0) {
                    dispatch(fetchDistrictsByState({ stateId }));
                  }
                  setDistrictModal(true);
                }}
                style={{
                  opacity: stateId ? 1 : 0.6,
                  flexDirection: "row",
                  alignItems: "center",
                  borderRadius: 16,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.12)",
                  backgroundColor: "rgba(255,255,255,0.04)",
                }}
              >
                <Ionicons name="business-outline" size={18} color="#94a3b8" />
                <Text style={{ flex: 1, marginLeft: 12, color: selectedDistrictName ? "white" : "#64748b", fontSize: 12 }}>
                  {!stateId
                    ? "Select state first"
                    : districtsLoading
                    ? "Loading districts..."
                    : selectedDistrictName || `Select district (${districts.length})`}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#cbd5e1" />
              </Pressable>

              {!!districtsError && (
                <Text className="text-red-300 text-[11px] mt-2">District API error: {districtsError}</Text>
              )}

              <Text className="text-slate-300 text-[11px] mt-4 mb-2">Address</Text>
              <View style={{ flexDirection: "row", alignItems: "flex-start", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.04)" }}>
                <Ionicons name="location-outline" size={18} color="#94a3b8" style={{ marginTop: 2 }} />
                <TextInput
                  ref={addrRef}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Enter address"
                  placeholderTextColor="#64748b"
                  multiline
                  style={{ flex: 1, marginLeft: 12, color: "white", minHeight: 44 }}
                />
              </View>

              <View className="mt-5">
                <Pressable
                  disabled={!canSubmit || loading}
                  onPress={onRegister}
                  style={{ opacity: !canSubmit || loading ? 0.6 : 1, borderRadius: 24, overflow: "hidden" }}
                >
                  <LinearGradient
                    colors={[module.accent, "#22c55e", "#06b6d4"]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={{ paddingVertical: 14, alignItems: "center", borderRadius: 24 }}
                  >
                    <Text style={{ color: "black", fontWeight: "700" }}>
                      {loading ? "Registering..." : "Register"}
                    </Text>
                  </LinearGradient>
                </Pressable>

                {!!statesError && (
                  <Text className="text-red-300 text-[11px] mt-2">State API error: {statesError}</Text>
                )}
              </View>
            </BlurView>
          </View>
        </View>
      </Modal>
    </>
  );
}

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();

  const [selected, setSelected] = useState<Category | null>(null);
  const selectedModule = useMemo(() => MODULES.find((m) => m.key === selected) ?? null, [selected]);

  return (
    <View className="flex-1 bg-black">
      <LinearGradient
        colors={["rgba(14,165,233,0.20)", "rgba(0,0,0,0.88)", "rgba(0,0,0,0.96)"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: "absolute", inset: 0 }}
      />

      <RegisterModal open={!!selected} onClose={() => setSelected(null)} module={selectedModule} />

      {/* ✅ Safe area fixes the Back being cut */}
      <SafeAreaView style={{ flex: 1, paddingTop: Math.max(8, insets.top * 0.25) }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 10,
            paddingBottom: 22, // small, so no huge empty space
          }}
        >
          {/* Header */}
          <View style={{ marginBottom: 12 }}>
            <Pressable
              onPress={() => router.back()}
              style={{ flexDirection: "row", alignItems: "center", alignSelf: "flex-start", paddingVertical: 6, paddingRight: 10 }}
              hitSlop={10}
            >
              <Ionicons name="chevron-back" size={20} color="#cbd5e1" />
              <Text style={{ color: "#e2e8f0", fontSize: 13, marginLeft: 4, fontWeight: "600" }}>
                Back
              </Text>
            </Pressable>

            <Text className="text-white text-[26px] font-extrabold mt-2">Create Account</Text>
            <Text className="text-slate-300 text-[12px] mt-2">Select your module to register.</Text>
          </View>

          {/* Cards */}
          <View style={{ gap: 14 }}>
            {MODULES.map((m) => (
              <ModuleCard
                key={m.key}
                title={m.title}
                subtitle={m.subtitle}
                accent={m.accent}
                icon={m.icon}
                onPress={() => setSelected(m.key)}
              />
            ))}
          </View>

          {/* ✅ This now sits right below cards (no forced bottom) */}
          <View style={{ alignItems: "center", marginTop: 18 }}>
            <Pressable onPress={() => router.replace("/(auth)/login")}>
              <Text className="text-slate-300 text-[11px]">
                Already have an account? <Text className="text-sky-300 font-semibold">Sign in</Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
