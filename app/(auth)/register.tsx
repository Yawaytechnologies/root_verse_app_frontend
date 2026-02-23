import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";

/** ✅ NativeWind interop (NO styled) */
import { cssInterop } from "nativewind";
cssInterop(BlurView, { className: "style" });
cssInterop(LinearGradient, { className: "style" });

/** ✅ Redux */
import { useDispatch, useSelector } from "react-redux";
import {
  fetchCountries,
  fetchStatesByCountry,
  fetchDistrictsByState,
  fetchLocationsByDistrict,
} from "../../src/store/auth/location.slice";
import {
  registerUser,
  type RootverseType,
} from "../../src/store/auth/registration.slice";

/** ✅ IMPORTANT: must match Provider store */
import type { AppDispatch, RootState } from "../../src/store/auth/store";

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
  {
    key: "WILD",
    title: "Wild Culture",
    subtitle: "Register for Wild Capture module",
    accent: "#38bdf8",
    icon: "fish-outline",
  },
  {
    key: "AQUA",
    title: "Aqua Culture",
    subtitle: "Register for Aquaculture module",
    accent: "#34d399",
    icon: "water-outline",
  },
  {
    key: "MARI",
    title: "Mari Culture",
    subtitle: "Register for Mariculture module",
    accent: "#a78bfa",
    icon: "leaf-outline",
  },
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

/** ✅ Toast helper */
function showToast(p: any) {
  Toast.show({
    visibilityTime: 3000,
    ...p,
  });
}

/** ✅ Glass */
function Glass({
  intensity = 18,
  className = "",
  children,
}: {
  intensity?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <BlurView
      intensity={intensity}
      tint="dark"
      className={`bg-black ${className}`}
    >
      {children}
    </BlurView>
  );
}

/**
 * ✅ ModalFrame (NO <Modal>)
 * ✅ UPDATED: can lift panel when keyboard opens
 * ✅ UPDATED: REMOVED OUTER BORDER LINE (no border on panel)
 */
function ModalFrame({
  visible,
  onClose,
  zClass = "z-[10000]",
  roundedClass = "rounded-3xl",
  containerClassName = "justify-center",
  panelStyle,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  zClass?: string;
  roundedClass?: string;
  containerClassName?: string;
  panelStyle?: any;
  children: React.ReactNode;
}) {
  if (!visible) return null;

  return (
    <View
      className={`absolute inset-0 items-center px-5 ${zClass} ${containerClassName}`}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={onClose}
        className="absolute inset-0 bg-black/90"
        pointerEvents="auto"
      />

      {/* ✅ Removed: border border-white/10 */}
      <View
        style={panelStyle}
        className={`w-full max-w-[520px] h-[74%] overflow-hidden bg-black ${roundedClass}`}
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
    <Pressable onPress={onPress} className="rounded-[26px] overflow-hidden">
      <Glass intensity={22} className="rounded-[26px] overflow-hidden">
        <View className="rounded-[26px] border border-white/10 bg-white/5 p-5">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text
                className="text-white font-extrabold text-base"
                numberOfLines={1}
              >
                {title}
              </Text>
              <Text
                className="text-slate-300 text-[11px] mt-1 leading-4"
                numberOfLines={2}
              >
                {subtitle}
              </Text>
            </View>

            <View className="h-11 w-11 rounded-2xl items-center justify-center border border-white/10 bg-white/5">
              <Ionicons name={icon} size={18} color={accent} />
            </View>
          </View>

          <View className="mt-3.5 flex-row items-center justify-between">
            <Text
              className="text-slate-300 text-[11px] flex-1 pr-2.5"
              numberOfLines={1}
            >
              Tap to register for this module
            </Text>

            <View className="flex-row items-center">
              <Text className="text-sky-300 text-[11px] font-bold mr-1.5">
                Open
              </Text>
              <Ionicons name="chevron-forward" size={14} color="#7dd3fc" />
            </View>
          </View>
        </View>
      </Glass>
    </Pressable>
  );
}

/** ✅ Generic Select list modal */
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
    <ModalFrame
      visible={open}
      onClose={onClose}
      zClass="z-[20000]"
      roundedClass="rounded-2xl"
    >
      <Glass intensity={18} className="p-3.5 flex-1">
        <View className="flex-row items-center justify-between">
          <Text className="text-white font-extrabold text-sm">{title}</Text>
          <Pressable onPress={onClose} className="p-2 -mr-2">
            <Ionicons name="close" size={18} color="#cbd5e1" />
          </Pressable>
        </View>

        <View className="mt-2 flex-1">
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            {disabledText ? (
              <Text className="text-slate-400 text-xs py-3.5">
                {disabledText}
              </Text>
            ) : loading ? (
              <Text className="text-slate-400 text-xs py-3.5">Loading...</Text>
            ) : items.length === 0 ? (
              <Text className="text-slate-400 text-xs py-3.5">
                No items found.
              </Text>
            ) : (
              <View className="pt-2 pb-3">
                {items.map((it) => {
                  const active = selectedId === it.id;
                  return (
                    <Pressable
                      key={it.id}
                      onPress={() => onSelect(it)}
                      className={[
                        "px-3 py-3 rounded-2xl mb-2 border flex-row items-center justify-between",
                        active
                          ? "border-sky-300/40 bg-sky-300/10"
                          : "border-white/10 bg-white/5",
                      ].join(" ")}
                    >
                      <Text
                        className="text-white text-xs flex-1 pr-3"
                        numberOfLines={1}
                      >
                        {it.name}
                      </Text>
                      {active ? (
                        <Ionicons name="checkmark" size={18} color="#7dd3fc" />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
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

  const insets = useSafeAreaInsets();

  const {
    countries,
    countriesLoading,
    countriesError,

    states,
    statesLoading,
    statesError,

    districtsByStateId,
    districtsLoadingByStateId,
    districtsErrorByStateId,

    locationsByDistrictId,
    locationsLoadingByDistrictId,
    locationsErrorByDistrictId,
  } = useSelector((s: RootState) => (s as any).location);

  const [username, setUsername] = useState("");
  const [phone_no, setPhoneNo] = useState("");
  const [address, setAddress] = useState("");
  const [profile_image_uri, setProfileUri] = useState("");

  const [countryId, setCountryId] = useState<number | null>(null);
  const [stateId, setStateId] = useState<number | null>(null);
  const [districtId, setDistrictId] = useState<number | null>(null);
  const [locationId, setLocationId] = useState<number | null>(null);

  const [countryModal, setCountryModal] = useState(false);
  const [stateModal, setStateModal] = useState(false);
  const [districtModal, setDistrictModal] = useState(false);
  const [locationModal, setLocationModal] = useState(false);

  const userRef = useRef<TextInput>(null);
  const addressRef = useRef<TextInput>(null);
  const formScrollRef = useRef<ScrollView>(null);

  const [row1Y, setRow1Y] = useState(0);
  const [row2Y, setRow2Y] = useState(0);
  const [row3Y, setRow3Y] = useState(0);
  const [profileY, setProfileY] = useState(0);
  const [addressY, setAddressY] = useState(0);
  const [submitY, setSubmitY] = useState(0);

  const [kbOpen, setKbOpen] = useState(false);
  const [kbH, setKbH] = useState(0);

  React.useEffect(() => {
    const showEvt =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvt as any, (e: any) => {
      setKbOpen(true);
      setKbH(e?.endCoordinates?.height ?? 0);
    });

    const hideSub = Keyboard.addListener(hideEvt as any, () => {
      setKbOpen(false);
      setKbH(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  React.useEffect(() => {
    if (!open) return;

    setUsername("");
    setPhoneNo("");
    setAddress("");
    setProfileUri("");

    setCountryId(null);
    setStateId(null);
    setDistrictId(null);
    setLocationId(null);

    setCountryModal(false);
    setStateModal(false);
    setDistrictModal(false);
    setLocationModal(false);

    dispatch(fetchCountries());

    const t = setTimeout(() => userRef.current?.focus?.(), 180);
    return () => clearTimeout(t);
  }, [open, module?.key, dispatch]);

  const districts = useMemo(() => {
    if (!stateId) return [];
    const arr = districtsByStateId?.[stateId];
    return Array.isArray(arr) ? arr : [];
  }, [stateId, districtsByStateId]);

  const districtsLoading = useMemo(
    () => (!!stateId ? !!districtsLoadingByStateId?.[stateId] : false),
    [stateId, districtsLoadingByStateId],
  );

  const districtsError = useMemo(
    () =>
      !!stateId ? (districtsErrorByStateId?.[stateId] ?? null) : null,
    [stateId, districtsErrorByStateId],
  );

  const locations = useMemo(() => {
    if (!districtId) return [];
    const arr = locationsByDistrictId?.[districtId];
    return Array.isArray(arr) ? arr : [];
  }, [districtId, locationsByDistrictId]);

  const locationsLoading = useMemo(
    () => (!!districtId ? !!locationsLoadingByDistrictId?.[districtId] : false),
    [districtId, locationsLoadingByDistrictId],
  );

  const locationsError = useMemo(
    () =>
      !!districtId ? (locationsErrorByDistrictId?.[districtId] ?? null) : null,
    [districtId, locationsErrorByDistrictId],
  );

  const selectedCountryName = useMemo(
    () => countries?.find((c: any) => c.id === countryId)?.name ?? "",
    [countries, countryId],
  );

  const selectedStateName = useMemo(
    () => states?.find((s: any) => s.id === stateId)?.name ?? "",
    [states, stateId],
  );

  const selectedDistrictName = useMemo(
    () => districts?.find((d: any) => d.id === districtId)?.name ?? "",
    [districts, districtId],
  );

  const selectedLocationName = useMemo(
    () => locations?.find((l: any) => l.id === locationId)?.name ?? "",
    [locations, locationId],
  );

  const canSubmit =
    username.trim().length >= 2 &&
    isValidPhone10(phone_no) &&
    isValidAddress(address) &&
    profile_image_uri.trim().length > 0 &&
    !!countryId &&
    !!stateId &&
    !!districtId &&
    !!locationId;

  const scrollToY = (y: number) => {
    formScrollRef.current?.scrollTo({ y: Math.max(0, y - 60), animated: true });
  };

  const validateOrToast = () => {
    if (username.trim().length < 2) {
      showToast({ type: "info", text1: "Enter username" });
      scrollToY(row1Y);
      setTimeout(() => userRef.current?.focus?.(), 150);
      return false;
    }
    if (!isValidPhone10(phone_no)) {
      showToast({ type: "info", text1: "Enter valid 10-digit phone" });
      scrollToY(row1Y);
      return false;
    }

    if (!countryId) {
      showToast({ type: "info", text1: "Select country" });
      scrollToY(row2Y);
      return false;
    }
    if (!stateId) {
      showToast({ type: "info", text1: "Select state" });
      scrollToY(row2Y);
      return false;
    }
    if (!districtId) {
      showToast({ type: "info", text1: "Select district" });
      scrollToY(row3Y);
      return false;
    }
    if (!locationId) {
      showToast({ type: "info", text1: "Select location" });
      scrollToY(row3Y);
      return false;
    }
    if (!profile_image_uri.trim()) {
      showToast({ type: "info", text1: "Select profile photo" });
      scrollToY(profileY);
      return false;
    }
    if (!isValidAddress(address)) {
      showToast({ type: "info", text1: "Enter address (min 8 chars)" });
      scrollToY(addressY);
      setTimeout(() => addressRef.current?.focus?.(), 150);
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showToast({
        type: "error",
        text1: "Permission needed",
        text2: "Allow gallery permission.",
      });
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
    if (!module || loading) return;
    if (!validateOrToast()) return;

    const rootverse_type = mapToBackendRootverseType(module.key);

    const res = await dispatch(
      registerUser({
        username: username.trim(),
        phone_no,
        address: address.trim(),
        rootverse_type,
        profile_image_uri,

        country_id: countryId!,
        state_id: stateId!,
        district_id: districtId!,
        location_id: locationId!,
      } as any),
    );

    if (registerUser.rejected.match(res)) {
      showToast({
        type: "error",
        text1: "Registration failed",
        text2: (res.payload as string) || res.error.message || "Try again",
      });
      return;
    }

    showToast({
      type: "success",
      text1: "Registered successfully",
      text2: `${module.title} • ${phone_no}`,
    });

    onClose();
    router.replace("/(auth)/login");
  };

  if (!module) return null;

  return (
    <>
      <SelectListModal
        open={countryModal}
        title="Select Country"
        items={countries || []}
        loading={!!countriesLoading}
        selectedId={countryId}
        onClose={() => setCountryModal(false)}
        onSelect={(c: any) => {
          setCountryId(c.id);
          setStateId(null);
          setDistrictId(null);
          setLocationId(null);
          setCountryModal(false);
          dispatch(fetchStatesByCountry({ countryId: c.id }));
        }}
      />

      <SelectListModal
        open={stateModal}
        title="Select State"
        items={states || []}
        loading={!!statesLoading}
        selectedId={stateId}
        disabledText={!countryId ? "Select country first" : undefined}
        onClose={() => setStateModal(false)}
        onSelect={(st: any) => {
          setStateId(st.id);
          setDistrictId(null);
          setLocationId(null);
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
          setLocationId(null);
          setDistrictModal(false);
          dispatch(fetchLocationsByDistrict({ districtId: d.id }));
        }}
      />

      <SelectListModal
        open={locationModal}
        title="Select Location"
        items={locations}
        loading={locationsLoading}
        selectedId={locationId}
        disabledText={!districtId ? "Select district first" : undefined}
        onClose={() => setLocationModal(false)}
        onSelect={(l: any) => {
          setLocationId(l.id);
          setLocationModal(false);
        }}
      />

      <ModalFrame
        visible={open}
        onClose={onClose}
        zClass="z-[10000]"
        roundedClass="rounded-[26px]"
        containerClassName={kbOpen ? "justify-start pt-8" : "justify-center"}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 24 : 0}
          className="flex-1"
        >
          <Glass intensity={14} className="p-4 flex-1">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 pr-2.5">
                <View className="h-10 w-10 rounded-2xl items-center justify-center border border-white/10 bg-white/5">
                  <Ionicons
                    name={module.icon}
                    size={18}
                    color={module.accent}
                  />
                </View>

                <View className="ml-3 flex-1">
                  <Text
                    className="text-white font-extrabold text-[15px]"
                    numberOfLines={1}
                  >
                    {module.title}
                  </Text>
                </View>
              </View>

              <Pressable onPress={onClose} className="p-2 -mr-2">
                <Ionicons name="close" size={18} color="#cbd5e1" />
              </Pressable>
            </View>

            <ScrollView
              ref={formScrollRef}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              nestedScrollEnabled
              className="flex-1 mt-3"
              contentContainerStyle={{
                paddingBottom: 16 + (kbOpen ? kbH : 0),
              }}
            >
              {/* Row 1 */}
              <View onLayout={(e) => setRow1Y(e.nativeEvent.layout.y)}>
                <View className="flex-row">
                  <View className="flex-1 mr-3">
                    <Text className="text-slate-300 text-[11px] mb-1.5">
                      Username
                    </Text>
                    <View className="flex-row items-center rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5">
                      <Ionicons
                        name="person-outline"
                        size={16}
                        color="#94a3b8"
                      />
                      <TextInput
                        ref={userRef}
                        value={username}
                        onChangeText={setUsername}
                        placeholder="Username"
                        placeholderTextColor="#64748b"
                        className="flex-1 ml-2.5 text-white text-[12px] py-0"
                      />
                    </View>
                  </View>

                  <View className="flex-1">
                    <Text className="text-slate-300 text-[11px] mb-1.5">
                      Phone
                    </Text>
                    <View className="flex-row items-center rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5">
                      <Ionicons
                        name="call-outline"
                        size={16}
                        color="#94a3b8"
                      />
                      <TextInput
                        value={phone_no}
                        onChangeText={(t) =>
                          setPhoneNo(t.replace(/[^\d]/g, ""))
                        }
                        placeholder="10-digit"
                        placeholderTextColor="#64748b"
                        keyboardType="number-pad"
                        maxLength={10}
                        className="flex-1 ml-2.5 text-white text-[12px] py-0"
                      />
                    </View>
                  </View>
                </View>
              </View>

              {/* Row 2: Country + State */}
              <View
                className="mt-3"
                onLayout={(e) => setRow2Y(e.nativeEvent.layout.y)}
              >
                <View className="flex-row">
                  <View className="flex-1 mr-3">
                    <Text className="text-slate-300 text-[11px] mb-1.5">
                      Country
                    </Text>
                    <Pressable
                      onPress={() => setCountryModal(true)}
                      className="flex-row items-center rounded-2xl border border-white/10 bg-white/5 px-3 py-5"
                    >
                      <Ionicons
                        name="flag-outline"
                        size={16}
                        color="#94a3b8"
                      />
                      <Text
                        className={[
                          "flex-1 ml-2.5 text-[12px]",
                          selectedCountryName ? "text-white" : "text-slate-500",
                        ].join(" ")}
                        numberOfLines={1}
                      >
                        {countriesLoading
                          ? "Loading..."
                          : selectedCountryName || "Select"}
                      </Text>
                      <Ionicons
                        name="chevron-down"
                        size={16}
                        color="#cbd5e1"
                      />
                    </Pressable>
                  </View>

                  <View className="flex-1">
                    <Text className="text-slate-300 text-[11px] mb-1.5">
                      State
                    </Text>
                    <Pressable
                      onPress={() => {
                        if (!countryId) {
                          showToast({
                            type: "info",
                            text1: "Select country first",
                          });
                          return;
                        }
                        if (!statesLoading && (!states || states.length === 0)) {
                          dispatch(fetchStatesByCountry({ countryId }));
                        }
                        setStateModal(true);
                      }}
                      className={[
                        "flex-row items-center rounded-2xl border border-white/10 bg-white/5 px-3 py-5",
                        countryId ? "opacity-100" : "opacity-60",
                      ].join(" ")}
                    >
                      <Ionicons
                        name="map-outline"
                        size={16}
                        color="#94a3b8"
                      />
                      <Text
                        className={[
                          "flex-1 ml-2.5 text-[12px]",
                          selectedStateName ? "text-white" : "text-slate-500",
                        ].join(" ")}
                        numberOfLines={1}
                      >
                        {!countryId
                          ? "Select country"
                          : statesLoading
                            ? "Loading..."
                            : selectedStateName || "Select"}
                      </Text>
                      <Ionicons
                        name="chevron-down"
                        size={16}
                        color="#cbd5e1"
                      />
                    </Pressable>
                  </View>
                </View>

                {!!countriesError && (
                  <Text className="text-red-300 text-[11px] mt-2">
                    Country API error: {countriesError}
                  </Text>
                )}
                {!!statesError && (
                  <Text className="text-red-300 text-[11px] mt-2">
                    State API error: {statesError}
                  </Text>
                )}
              </View>

              {/* Row 3: District + Location */}
              <View
                className="mt-3"
                onLayout={(e) => setRow3Y(e.nativeEvent.layout.y)}
              >
                <View className="flex-row">
                  <View className="flex-1 mr-3">
                    <Text className="text-slate-300 text-[11px] mb-1.5">
                      District
                    </Text>
                    <Pressable
                      onPress={() => {
                        if (!stateId) {
                          showToast({
                            type: "info",
                            text1: "Select state first",
                          });
                          return;
                        }
                        if (!districtsLoading && districts.length === 0) {
                          dispatch(fetchDistrictsByState({ stateId }));
                        }
                        setDistrictModal(true);
                      }}
                      className={[
                        "flex-row items-center rounded-2xl border border-white/10 bg-white/5 px-3 py-5",
                        stateId ? "opacity-100" : "opacity-60",
                      ].join(" ")}
                    >
                      <Ionicons
                        name="business-outline"
                        size={16}
                        color="#94a3b8"
                      />
                      <Text
                        className={[
                          "flex-1 ml-2.5 text-[12px]",
                          selectedDistrictName ? "text-white" : "text-slate-500",
                        ].join(" ")}
                        numberOfLines={1}
                      >
                        {!stateId
                          ? "Select state"
                          : districtsLoading
                            ? "Loading..."
                            : selectedDistrictName || "Select"}
                      </Text>
                      <Ionicons
                        name="chevron-down"
                        size={16}
                        color="#cbd5e1"
                      />
                    </Pressable>
                  </View>

                  <View className="flex-1">
                    <Text className="text-slate-300 text-[11px] mb-1.5">
                      Location
                    </Text>
                    <Pressable
                      onPress={() => {
                        if (!districtId) {
                          showToast({
                            type: "info",
                            text1: "Select district first",
                          });
                          return;
                        }
                        if (!locationsLoading && locations.length === 0) {
                          dispatch(fetchLocationsByDistrict({ districtId }));
                        }
                        setLocationModal(true);
                      }}
                      className={[
                        "flex-row items-center rounded-2xl border border-white/10 bg-white/5 px-3 py-5",
                        districtId ? "opacity-100" : "opacity-60",
                      ].join(" ")}
                    >
                      <Ionicons
                        name="navigate-outline"
                        size={16}
                        color="#94a3b8"
                      />
                      <Text
                        className={[
                          "flex-1 ml-2.5 text-[12px]",
                          selectedLocationName ? "text-white" : "text-slate-500",
                        ].join(" ")}
                        numberOfLines={1}
                      >
                        {!districtId
                          ? "Select district"
                          : locationsLoading
                            ? "Loading..."
                            : selectedLocationName || "Select"}
                      </Text>
                      <Ionicons
                        name="chevron-down"
                        size={16}
                        color="#cbd5e1"
                      />
                    </Pressable>
                  </View>
                </View>

                {!!districtsError && (
                  <Text className="text-red-300 text-[11px] mt-2">
                    District API error: {districtsError}
                  </Text>
                )}
                {!!locationsError && (
                  <Text className="text-red-300 text-[11px] mt-2">
                    Location API error: {locationsError}
                  </Text>
                )}
              </View>

              {/* Profile Picture */}
              <View
                className="mt-3"
                onLayout={(e) => setProfileY(e.nativeEvent.layout.y)}
              >
                <Text className="text-slate-300 text-[11px] mb-1.5">
                  Profile Picture
                </Text>
                <Pressable
                  onPress={pickImage}
                  className="flex-row items-center rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5"
                >
                  <View className="h-12 w-12 rounded-2xl overflow-hidden bg-white/10 border border-white/10 items-center justify-center">
                    {profile_image_uri ? (
                      <Image
                        source={{ uri: profile_image_uri }}
                        className="h-12 w-12"
                      />
                    ) : (
                      <Ionicons
                        name="image-outline"
                        size={20}
                        color="#94a3b8"
                      />
                    )}
                  </View>

                  <View className="flex-1 ml-3">
                    <Text
                      className="text-white text-xs font-bold"
                      numberOfLines={1}
                    >
                      {profile_image_uri ? "Photo selected" : "Choose photo"}
                    </Text>
                    <Text
                      className="text-slate-400 text-[10px] mt-0.5"
                      numberOfLines={1}
                    >
                      {profile_image_uri
                        ? "Ready"
                        : "Tap to pick a profile image"}
                    </Text>
                  </View>

                  <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
                </Pressable>
              </View>

              {/* Address */}
              <View
                className="mt-3"
                onLayout={(e) => setAddressY(e.nativeEvent.layout.y)}
              >
                <Text className="text-slate-300 text-[11px] mb-1.5">
                  Address
                </Text>
                <View className="flex-row items-start rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5">
                  <View className="mt-0.5">
                    <Ionicons
                      name="location-outline"
                      size={16}
                      color="#94a3b8"
                    />
                  </View>
                  <TextInput
                    ref={addressRef}
                    value={address}
                    onChangeText={setAddress}
                    placeholder="Enter address"
                    placeholderTextColor="#64748b"
                    multiline
                    textAlignVertical="top"
                    className="flex-1 ml-2.5 text-white text-[12px] min-h-[64px]"
                  />
                </View>
              </View>

              {/* Submit */}
              <View
                className="mt-4 mb-1"
                onLayout={(e) => setSubmitY(e.nativeEvent.layout.y)}
              >
                <Pressable
                  disabled={loading}
                  onPress={onRegister}
                  className={[
                    "rounded-3xl overflow-hidden",
                    !canSubmit || loading ? "opacity-60" : "opacity-100",
                  ].join(" ")}
                >
                  <LinearGradient
                    colors={[module.accent, "#22c55e", "#06b6d4"]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    className="py-3 items-center rounded-3xl"
                  >
                    <Text className="text-black font-extrabold">
                      {loading ? "Registering..." : "Register"}
                    </Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </ScrollView>
          </Glass>
        </KeyboardAvoidingView>
      </ModalFrame>
    </>
  );
}

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();

  const [selected, setSelected] = useState<Category | null>(null);
  const selectedModule = useMemo(
    () => MODULES.find((m) => m.key === selected) ?? null,
    [selected],
  );

  return (
    <View className="flex-1 bg-black relative">
      <LinearGradient
        colors={[
          "rgba(14,165,233,0.20)",
          "rgba(0,0,0,0.88)",
          "rgba(0,0,0,0.96)",
        ]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        className="absolute inset-0"
      />

      <RegisterModal
        open={!!selected}
        onClose={() => setSelected(null)}
        module={selectedModule}
      />

      <SafeAreaView
        className="flex-1"
        style={{
          paddingTop: Math.max(8, insets.top * 0.25),
          paddingBottom: Math.max(12, insets.bottom + 12),
        }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: Math.max(24, insets.bottom + 24),
          }}
        >
          <View className="px-5 pt-2 pb-6">
            <View className="mb-3">
              <Pressable
                onPress={() => router.back()}
                className="flex-row items-center self-start py-1.5 pr-2.5"
                hitSlop={10}
              >
                <Ionicons name="chevron-back" size={20} color="#cbd5e1" />
                <Text className="text-slate-200 text-[13px] ml-1 font-bold">
                  Back
                </Text>
              </Pressable>

              <Text className="text-white text-[26px] font-black mt-2">
                Create Account
              </Text>
              <Text className="text-slate-300 text-xs mt-2">
                Select your module to register.
              </Text>
            </View>

            <View>
              {MODULES.map((m, idx) => (
                <View
                  key={m.key}
                  className={idx === MODULES.length - 1 ? "" : "mb-3.5"}
                >
                  <ModuleCard
                    title={m.title}
                    subtitle={m.subtitle}
                    accent={m.accent}
                    icon={m.icon}
                    onPress={() => setSelected(m.key)}
                  />
                </View>
              ))}
            </View>

            <View className="mt-5 pb-6 px-2">
              <Pressable
                onPress={() => router.replace("/(auth)/login")}
                hitSlop={10}
                className="w-full"
              >
                <Text className="w-full text-slate-300 text-[11px] leading-5 text-center">
                  Already have an account?{" "}
                  <Text className="text-sky-300 font-extrabold">
                    {"Sign\u00A0in"}
                  </Text>
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}