import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
  Image,
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
import { fetchDistrictsByState, fetchStates } from "../../src/store/auth/location.slice";
import { registerUser, type RootverseType } from "../../src/store/auth/registration.slice";

/** ✅ IMPORTANT: must match Provider store */
import type { AppDispatch, RootState } from "../../src/store/store";

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

/** ✅ BlurView blocks clicks on WEB sometimes */
function Glass({
  intensity = 18,
  style,
  children,
}: {
  intensity?: number;
  style?: any;
  children: React.ReactNode;
}) {
  if (Platform.OS === "web") {
    return <View style={[{ backgroundColor: "rgba(0,0,0,0.92)" }, style]}>{children}</View>;
  }
  return (
    <BlurView intensity={intensity} tint="dark" style={style}>
      {children}
    </BlurView>
  );
}

/**
 * ✅ ModalFrame
 * WEB: fixed overlay View (NO <Modal>) so list clicks work
 * MOBILE: absolute overlay View (NO <Modal>) so Toast can overlay
 *
 * IMPORTANT: zIndex is customizable:
 * - Register modal: zIndex 10000
 * - Dropdown modals: zIndex 20000 (so they appear above register modal)
 */
function ModalFrame({
  visible,
  onClose,
  borderRadius = 22,
  zIndex = 10000,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  borderRadius?: number;
  zIndex?: number;
  children: React.ReactNode;
}) {
  if (!visible) return null;

  // ✅ WEB: fixed overlay
  if (Platform.OS === "web") {
    return (
      <View
        style={{
          position: "fixed" as any,
          inset: 0,
          zIndex,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 18,
          backgroundColor: "transparent",
        }}
      >
        <Pressable
          onPress={onClose}
          style={{
            position: "fixed" as any,
            inset: 0,
            backgroundColor: "transparent",
          }}
        />

        <View
          style={{
            position: "relative",
            zIndex: zIndex + 1,
            width: "100%",
            maxWidth: 520,
            borderRadius,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.10)",
            backgroundColor: "rgba(0,0,0,0.92)",
          }}
        >
          {children}
        </View>
      </View>
    );
  }

  // ✅ MOBILE: absolute overlay
  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "center",
        paddingHorizontal: 18,
        zIndex,
        elevation: zIndex,
      }}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={onClose}
        style={{ position: "absolute", inset: 0, backgroundColor: "transparent" }}
        pointerEvents="auto"
      />

      <View
        style={{
          borderRadius,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.10)",
          backgroundColor: "rgba(0,0,0,0.92)",
        }}
        pointerEvents="auto"
      >
        {children}
      </View>
    </View>
  );
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
    <Pressable onPress={onPress} style={{ borderRadius: 26, overflow: "hidden" }}>
      <Glass intensity={22} style={{ borderRadius: 26, overflow: "hidden" }}>
        <View
          style={{
            backgroundColor: "rgba(0,0,0,0.35)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.10)",
            borderRadius: 26,
            padding: 20,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ color: "white", fontWeight: "800", fontSize: 16 }} numberOfLines={1}>
                {title}
              </Text>
              <Text style={{ color: "#cbd5e1", fontSize: 11, marginTop: 4, lineHeight: 16 }} numberOfLines={2}>
                {subtitle}
              </Text>
            </View>

            <View
              style={{
                height: 44,
                width: 44,
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.10)",
                backgroundColor: "rgba(255,255,255,0.05)",
              }}
            >
              <Ionicons name={icon} size={18} color={accent} />
            </View>
          </View>

          <View style={{ marginTop: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ color: "#cbd5e1", fontSize: 11, flex: 1, paddingRight: 10 }} numberOfLines={1}>
              Tap to register for this module
            </Text>

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={{ color: "#7dd3fc", fontSize: 11, fontWeight: "700", marginRight: 6 }}>Open</Text>
              <Ionicons name="chevron-forward" size={14} color="#7dd3fc" />
            </View>
          </View>
        </View>
      </Glass>
    </Pressable>
  );
}

/** ✅ State/District list modal */
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
    <ModalFrame visible={open} onClose={onClose} borderRadius={22} zIndex={20000}>
      <Glass intensity={18} style={{ padding: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ color: "white", fontWeight: "800", fontSize: 14 }}>{title}</Text>
          <Pressable onPress={onClose} style={{ padding: 8, marginRight: -8 }}>
            <Ionicons name="close" size={18} color="#cbd5e1" />
          </Pressable>
        </View>

        <View style={{ marginTop: 10, maxHeight: 340 }}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {!!disabledText ? (
              <Text style={{ color: "#94a3b8", fontSize: 12, paddingVertical: 14 }}>{disabledText}</Text>
            ) : loading ? (
              <Text style={{ color: "#94a3b8", fontSize: 12, paddingVertical: 14 }}>Loading...</Text>
            ) : items.length === 0 ? (
              <Text style={{ color: "#94a3b8", fontSize: 12, paddingVertical: 14 }}>No items found.</Text>
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
                    <Text style={{ color: "white", fontSize: 12, paddingRight: 12, flex: 1 }} numberOfLines={1}>
                      {it.name}
                    </Text>
                    {active ? <Ionicons name="checkmark" size={18} color="#7dd3fc" /> : null}
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>
      </Glass>
    </ModalFrame>
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

  React.useEffect(() => {
    if (!open) return;

    setUsername("");
    setPhoneNo("");
    setAddress("");
    setProfileUri("");
    setStateId(null);
    setDistrictId(null);
    setStateModal(false);
    setDistrictModal(false);

    dispatch(fetchStates());

    const t = setTimeout(() => userRef.current?.focus?.(), Platform.OS === "web" ? 250 : 150);
    return () => clearTimeout(t);
  }, [open, module?.key, dispatch]);

  const districts = useMemo(() => {
    if (!stateId) return [];
    const arr = districtsByStateId?.[stateId];
    return Array.isArray(arr) ? arr : [];
  }, [stateId, districtsByStateId]);

  const districtsLoading = useMemo(() => (!!stateId ? !!districtsLoadingByStateId?.[stateId] : false), [
    stateId,
    districtsLoadingByStateId,
  ]);

  const districtsError = useMemo(() => (!!stateId ? districtsErrorByStateId?.[stateId] ?? null : null), [
    stateId,
    districtsErrorByStateId,
  ]);

  const selectedStateName = useMemo(() => states?.find((s: any) => s.id === stateId)?.name ?? "", [states, stateId]);
  const selectedDistrictName = useMemo(() => districts?.find((d: any) => d.id === districtId)?.name ?? "", [districts, districtId]);

  const canSubmit =
    username.trim().length >= 2 &&
    isValidPhone10(phone_no) &&
    isValidAddress(address) &&
    profile_image_uri.trim().length > 0 &&
    !!stateId &&
    !!districtId;

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

    Toast.show({ type: "success", text1: "Registered successfully", text2: `${module.title} • ${phone_no}`, position: "top" });

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

      {/* ✅ Register modal zIndex LOWER than dropdowns */}
      <ModalFrame visible={open} onClose={onClose} borderRadius={26} zIndex={10000}>
        <Glass intensity={14} style={{ padding: 16 }}>
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1, paddingRight: 10 }}>
              <View
                style={{
                  height: 40,
                  width: 40,
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.10)",
                  backgroundColor: "rgba(255,255,255,0.05)",
                }}
              >
                <Ionicons name={module.icon} size={18} color={module.accent} />
              </View>

              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={{ color: "white", fontWeight: "800", fontSize: 15 }} numberOfLines={1}>
                  {module.title}
                </Text>
                <Text style={{ color: "#cbd5e1", fontSize: 11, marginTop: 2 }} numberOfLines={1}>
                  Username • Phone • State • District • Address • Photo
                </Text>
              </View>
            </View>

            <Pressable onPress={onClose} style={{ padding: 8, marginRight: -8 }}>
              <Ionicons name="close" size={18} color="#cbd5e1" />
            </Pressable>
          </View>

          {/* Profile pic */}
          <Text style={{ color: "#cbd5e1", fontSize: 11, marginTop: 16, marginBottom: 8 }}>Profile Picture</Text>
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
              <Text style={{ color: "white", fontSize: 12, fontWeight: "700" }} numberOfLines={1}>
                {profile_image_uri ? "Photo selected" : "Choose from gallery"}
              </Text>
              <Text style={{ color: "#94a3b8", fontSize: 10, marginTop: 2 }} numberOfLines={1}>
                {profile_image_uri ? profile_image_uri : "Tap to pick a profile image"}
              </Text>
            </View>
          </Pressable>

          {/* Username */}
          <Text style={{ color: "#cbd5e1", fontSize: 11, marginTop: 16, marginBottom: 8 }}>Username</Text>
          <View
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
            <Ionicons name="person-outline" size={18} color="#94a3b8" />
            <TextInput
              ref={userRef}
              value={username}
              onChangeText={setUsername}
              placeholder="Enter username"
              placeholderTextColor="#64748b"
              style={{ flex: 1, marginLeft: 12, color: "white", fontSize: 12 }}
            />
          </View>

          {/* Phone */}
          <Text style={{ color: "#cbd5e1", fontSize: 11, marginTop: 16, marginBottom: 8 }}>Phone Number</Text>
          <View
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
            <Ionicons name="call-outline" size={18} color="#94a3b8" />
            <TextInput
              value={phone_no}
              onChangeText={(t) => setPhoneNo(t.replace(/[^\d]/g, ""))}
              placeholder="10-digit mobile number"
              placeholderTextColor="#64748b"
              keyboardType="number-pad"
              maxLength={10}
              style={{ flex: 1, marginLeft: 12, color: "white", fontSize: 12 }}
            />
          </View>

          {/* State */}
          <Text style={{ color: "#cbd5e1", fontSize: 11, marginTop: 16, marginBottom: 8 }}>State</Text>
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

          {/* District */}
          <Text style={{ color: "#cbd5e1", fontSize: 11, marginTop: 16, marginBottom: 8 }}>District</Text>
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
            <Text style={{ color: "#fca5a5", fontSize: 11, marginTop: 8 }}>District API error: {districtsError}</Text>
          )}

          {/* Address */}
          <Text style={{ color: "#cbd5e1", fontSize: 11, marginTop: 16, marginBottom: 8 }}>Address</Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              borderRadius: 16,
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.12)",
              backgroundColor: "rgba(255,255,255,0.04)",
            }}
          >
            <Ionicons name="location-outline" size={18} color="#94a3b8" style={{ marginTop: 2 }} />
            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder="Enter address"
              placeholderTextColor="#64748b"
              multiline
              style={{ flex: 1, marginLeft: 12, color: "white", minHeight: 44, fontSize: 12 }}
            />
          </View>

          {/* Submit */}
          <View style={{ marginTop: 18 }}>
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
                <Text style={{ color: "black", fontWeight: "800" }}>{loading ? "Registering..." : "Register"}</Text>
              </LinearGradient>
            </Pressable>

            {!!statesError && (
              <Text style={{ color: "#fca5a5", fontSize: 11, marginTop: 8 }}>State API error: {statesError}</Text>
            )}
          </View>
        </Glass>
      </ModalFrame>
    </>
  );
}

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();

  const [selected, setSelected] = useState<Category | null>(null);
  const selectedModule = useMemo(() => MODULES.find((m) => m.key === selected) ?? null, [selected]);

  return (
    <View style={{ flex: 1, backgroundColor: "black", position: "relative" }}>
      <LinearGradient
        colors={["rgba(14,165,233,0.20)", "rgba(0,0,0,0.88)", "rgba(0,0,0,0.96)"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: "absolute", inset: 0 }}
      />

      <RegisterModal open={!!selected} onClose={() => setSelected(null)} module={selectedModule} />

      <SafeAreaView style={{ flex: 1, paddingTop: Math.max(8, insets.top * 0.25) }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 22 }}
        >
          <View style={{ marginBottom: 12 }}>
            <Pressable
              onPress={() => router.back()}
              style={{ flexDirection: "row", alignItems: "center", alignSelf: "flex-start", paddingVertical: 6, paddingRight: 10 }}
              hitSlop={10}
            >
              <Ionicons name="chevron-back" size={20} color="#cbd5e1" />
              <Text style={{ color: "#e2e8f0", fontSize: 13, marginLeft: 4, fontWeight: "700" }}>Back</Text>
            </Pressable>

            <Text style={{ color: "white", fontSize: 26, fontWeight: "900", marginTop: 8 }}>Create Account</Text>
            <Text style={{ color: "#cbd5e1", fontSize: 12, marginTop: 8 }}>Select your module to register.</Text>
          </View>

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

          <View style={{ alignItems: "center", marginTop: 18 }}>
            <Pressable onPress={() => router.replace("/(auth)/login")}>
              <Text style={{ color: "#cbd5e1", fontSize: 11 }}>
                Already have an account? <Text style={{ color: "#7dd3fc", fontWeight: "800" }}>Sign in</Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
