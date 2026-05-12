import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

import { API_BASE } from "../../../src/config/env";
import type { AppDispatch, RootState } from "../../../src/store/auth/store";
import { fetchAquaApprovals } from "../../../src/features/aqua/approvals/approvals.slice";
import {
  selectApprovedFarms,
  selectPendingFarms,
  selectApprovedPonds,
  selectPendingPonds,
  selectAllFarms,
} from "../../../src/features/aqua/approvals/approvals.selectors";
import { clearMe } from "../../../src/store/auth/me.slice";
import { toggleTheme } from "../../../src/store/theme.slice";

const SCREEN_W = Dimensions.get("window").width;
const PANEL_W = SCREEN_W * 0.62;
const TOKEN_KEY = "auth_token";
const LANGUAGE_KEY = "app_language";

type IconName = keyof typeof Ionicons.glyphMap;

function apiUrl(path: string) {
  const base = String(API_BASE || "").replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

function extractArray<T = any>(data: any): T[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.farms)) return data.farms;
  if (Array.isArray(data?.ponds)) return data.ponds;
  if (Array.isArray(data?.culture_cycles)) return data.culture_cycles;
  if (Array.isArray(data?.cultureCycles)) return data.cultureCycles;
  return [];
}

function sameId(a: any, b: any) {
  if (a === undefined || a === null || b === undefined || b === null) {
    return false;
  }

  return String(a) === String(b);
}

function pickId(...values: any[]) {
  const found = values.find((value) => {
    if (value === undefined || value === null) return false;

    const text = String(value).trim();

    return (
      text !== "" &&
      text !== "0" &&
      text !== "undefined" &&
      text !== "null"
    );
  });

  return found ? String(found) : "";
}

function pickName(...values: any[]) {
  const found = values.find(
    (value) =>
      value !== undefined &&
      value !== null &&
      String(value).trim() !== "",
  );

  return found ? String(found) : "";
}

function toNumericUserId(value: any) {
  const raw = String(value ?? "").trim();

  if (!raw) return "";

  if (/^\d+$/.test(raw)) {
    return String(Number(raw));
  }

  const digits = raw.replace(/\D/g, "");

  if (!digits) return "";

  return String(Number(digits));
}

function normalizeList<T = any>(items: T[]) {
  const unique: T[] = [];
  const seen = new Set<string>();

  items.forEach((item: any, index) => {
    const key = String(
      item?.id ??
        item?.farm_id ??
        item?.pond_id ??
        item?.farm_code ??
        item?.pond_code ??
        index,
    );

    if (seen.has(key)) return;

    seen.add(key);
    unique.push(item);
  });

  return unique;
}

function cleanStatus(value: any) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function isTruthyFlag(value: any) {
  return value === true || value === 1 || value === "1" || value === "true";
}

function isFarmActivated(farm: any) {
  const status = cleanStatus(
    pickName(
      farm?.qr_status,
      farm?.farm_qr_status,
      farm?.activation_status,
      farm?.farm_status,
      farm?.status,
      farm?.verification_status,
    ),
  );

  if (
    ["active", "activated", "qr_activated", "linked", "verified"].includes(
      status,
    )
  ) {
    return true;
  }

  if (
    isTruthyFlag(farm?.is_active) ||
    isTruthyFlag(farm?.is_activated) ||
    isTruthyFlag(farm?.qr_activated) ||
    isTruthyFlag(farm?.farm_qr_activated)
  ) {
    return true;
  }

  if (
    pickName(
      farm?.farm_qr_id,
      farm?.farm_qr_code,
      farm?.activated_qr_code,
      farm?.qr_code,
      farm?.qr_value,
    )
  ) {
    return true;
  }

  return false;
}

function isPondActivated(pond: any) {
  const status = cleanStatus(
    pickName(
      pond?.qr_status,
      pond?.pond_qr_status,
      pond?.activation_status,
      pond?.pond_status,
      pond?.status,
      pond?.verification_status,
    ),
  );

  if (
    ["active", "activated", "qr_activated", "linked", "verified"].includes(
      status,
    )
  ) {
    return true;
  }

  if (
    isTruthyFlag(pond?.is_active) ||
    isTruthyFlag(pond?.is_activated) ||
    isTruthyFlag(pond?.qr_activated) ||
    isTruthyFlag(pond?.pond_qr_activated)
  ) {
    return true;
  }

  if (
    pickName(
      pond?.pond_qr_id,
      pond?.pond_qr_code,
      pond?.activated_qr_code,
      pond?.qr_code,
      pond?.qr_value,
    )
  ) {
    return true;
  }

  return false;
}

async function getJson(path: string) {
  const token = await AsyncStorage.getItem(TOKEN_KEY);

  const response = await fetch(apiUrl(path), {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  let data: any = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.message || data?.detail || "Request failed");
  }

  return data;
}

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();
  const { t, i18n } = useTranslation();

  const me = useSelector((state: RootState) => state.me?.me);
  const themeMode = useSelector((state: RootState) => state.theme.mode);
  const dark = themeMode === "DARK";

  const tr = useCallback(
    (key: string, defaultValue: string, options?: Record<string, any>) =>
      t(key, { defaultValue, ...(options || {}) }),
    [t],
  );

  const currentLanguage = String(i18n.resolvedLanguage || i18n.language || "en")
    .split("-")[0]
    .toLowerCase();

  const handleLanguageChange = async (lang: "en" | "ta") => {
    await AsyncStorage.setItem(LANGUAGE_KEY, lang);
    await i18n.changeLanguage(lang);
  };

  const numericOwnerId = toNumericUserId(
    pickId(
      (me as any)?.user_id,
      (me as any)?.id,
      (me as any)?.owner_id,
      (me as any)?.owner_code,
    ),
  );

  const reduxAllFarms = useSelector(selectAllFarms);
  const reduxApprovedFarms = useSelector(selectApprovedFarms);
  const reduxPendingFarms = useSelector(selectPendingFarms);
  const reduxApprovedPonds = useSelector(selectApprovedPonds);
  const reduxPendingPonds = useSelector(selectPendingPonds);

  const [apiFarms, setApiFarms] = useState<any[]>([]);
  const [apiPonds, setApiPonds] = useState<any[]>([]);
  const [apiCultureCycles, setApiCultureCycles] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadBackendData = useCallback(async () => {
    try {
      const [farmsRes, pondsRes] = await Promise.all([
        getJson("/api/farms"),
        getJson("/api/ponds"),
      ]);

      const farms = extractArray<any>(farmsRes);
      const ponds = extractArray<any>(pondsRes);

      const ownFarms = numericOwnerId
        ? farms.filter((farm) => {
            const farmUserId = toNumericUserId(
              pickId(farm?.user_id, farm?.owner_id),
            );

            return !!farmUserId && sameId(farmUserId, numericOwnerId);
          })
        : farms;

      const ownFarmIds = new Set(
        ownFarms.map((farm: any) => String(farm?.id)).filter(Boolean),
      );

      const ownPonds = numericOwnerId
        ? ponds.filter((pond) => {
            const pondUserId = toNumericUserId(pickId(pond?.user_id));

            if (pondUserId && sameId(pondUserId, numericOwnerId)) return true;

            if (pond?.farm_id && ownFarmIds.has(String(pond.farm_id))) {
              return true;
            }

            return false;
          })
        : ponds;

      setApiFarms(ownFarms);
      setApiPonds(ownPonds);

      if (numericOwnerId) {
        try {
          const cyclesRes = await getJson(
            `/api/aquaculture/culture-cycles/user/${numericOwnerId}`,
          );

          setApiCultureCycles(extractArray<any>(cyclesRes));
        } catch (error) {
          console.log("Culture cycle load failed:", error);
          setApiCultureCycles([]);
        }
      } else {
        setApiCultureCycles([]);
      }
    } catch (error) {
      console.log("Dashboard backend data load failed:", error);
    }
  }, [numericOwnerId]);

  useEffect(() => {
    if (numericOwnerId) {
      dispatch(fetchAquaApprovals(numericOwnerId));
    }

    loadBackendData();
  }, [dispatch, numericOwnerId, loadBackendData]);

  const onRefresh = async () => {
    setRefreshing(true);

    if (numericOwnerId) {
      dispatch(fetchAquaApprovals(numericOwnerId));
    }

    await loadBackendData();
    setRefreshing(false);
  };

  const allRegisteredFarms = useMemo(() => {
    return normalizeList([
      ...reduxApprovedFarms,
      ...reduxPendingFarms,
      ...reduxAllFarms,
      ...apiFarms,
    ]);
  }, [reduxApprovedFarms, reduxPendingFarms, reduxAllFarms, apiFarms]);

  const allRegisteredPonds = useMemo(() => {
    return normalizeList([
      ...reduxApprovedPonds,
      ...reduxPendingPonds,
      ...apiPonds,
    ]);
  }, [reduxApprovedPonds, reduxPendingPonds, apiPonds]);

  const totalFarms = allRegisteredFarms.length;
  const totalPonds = allRegisteredPonds.length;
  const totalCultureCycles = apiCultureCycles.length;

  const activatedFarms = useMemo(() => {
    return allRegisteredFarms.filter(isFarmActivated).length;
  }, [allRegisteredFarms]);

  const activatedPonds = useMemo(() => {
    return allRegisteredPonds.filter(isPondActivated).length;
  }, [allRegisteredPonds]);

  const pendingFarmActivation = Math.max(totalFarms - activatedFarms, 0);
  const pendingPondActivation = Math.max(totalPonds - activatedPonds, 0);

  const firstRegisteredFarm = allRegisteredFarms[0] ?? null;
  const firstRegisteredPond = allRegisteredPonds[0] ?? null;

  const firstCultureCycle = useMemo(() => {
    if (!apiCultureCycles.length) return null;

    if (firstRegisteredPond?.id) {
      const pondCycle = apiCultureCycles.find((cycle) =>
        sameId(cycle?.pond_id, firstRegisteredPond.id),
      );

      if (pondCycle) return pondCycle;
    }

    if (firstRegisteredFarm?.id) {
      const farmCycle = apiCultureCycles.find((cycle) =>
        sameId(cycle?.farm_id, firstRegisteredFarm.id),
      );

      if (farmCycle) return farmCycle;
    }

    return apiCultureCycles[0] ?? null;
  }, [apiCultureCycles, firstRegisteredFarm, firstRegisteredPond]);

  const canCreatePond = !!firstRegisteredFarm;
  const canCreateCultureCycle = !!firstRegisteredFarm && !!firstRegisteredPond;
  const canActivateFarmQr = !!firstRegisteredFarm && !!firstCultureCycle;
  const canActivatePondQr = !!firstRegisteredPond && !!firstCultureCycle;
  const canAddStocking =
    !!firstRegisteredPond && !!firstCultureCycle && activatedPonds > 0;

  const farmNameForAction = pickName(
    firstRegisteredFarm?.farm_name,
    firstRegisteredFarm?.name,
    tr("dashboard.registeredFarm", "registered farm"),
  );

  const pondNameForAction = pickName(
    firstRegisteredPond?.pond_name,
    firstRegisteredPond?.name,
    tr("dashboard.registeredPond", "registered pond"),
  );

  const initials = useMemo(() => {
    const username = String((me as any)?.username || "").trim();

    if (!username) return "U";

    return username
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, [me]);

  const [profileVisible, setProfileVisible] = useState(false);
  const panelAnim = useRef(new Animated.Value(PANEL_W)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const C = dark
    ? {
        screenBg: "#050B16",
        cardBg: "#0B1220",
        cardBorder: "rgba(255,255,255,0.08)",
        text: "#FFFFFF",
        subText: "rgba(255,255,255,0.52)",
        iconBg: "rgba(255,255,255,0.08)",
        iconColor: "#60A5FA",
        tapHint: "#60A5FA",
        panelBg: "#0D1424",
        panelBorder: "rgba(255,255,255,0.08)",
        divider: "rgba(255,255,255,0.07)",
        avatarBg: "rgba(255,255,255,0.1)",
        actionDarkBg: "#0B1220",
        actionDarkBorder: "rgba(255,255,255,0.08)",
        actionLightBg: "#111827",
        actionLightBorder: "rgba(255,255,255,0.08)",
        badgeBg: "rgba(217,119,6,0.18)",
        badgeText: "#FCD34D",
        toggleOn: "#2563EB",
        toggleOff: "rgba(255,255,255,0.15)",
        logoutBg: "rgba(244,63,94,0.12)",
        logoutText: "#FB7185",
        ownerBg: "rgba(255,255,255,0.05)",
      }
    : {
        screenBg: "#E8EEF6",
        cardBg: "#EEF3FF",
        cardBorder: "#C0CEEA",
        text: "#0F172A",
        subText: "#5A6E8F",
        iconBg: "#D2E3F8",
        iconColor: "#1D4ED8",
        tapHint: "#1D4ED8",
        panelBg: "#EEF3FF",
        panelBorder: "#C0CEEA",
        divider: "#D5E0F0",
        avatarBg: "#1E293B",
        actionDarkBg: "#1E293B",
        actionDarkBorder: "#1E293B",
        actionLightBg: "#E4ECFF",
        actionLightBorder: "#BCCEF0",
        badgeBg: "rgba(217,119,6,0.12)",
        badgeText: "#92400E",
        toggleOn: "#1D4ED8",
        toggleOff: "#C8D8EE",
        logoutBg: "#FDE8EC",
        logoutText: "#E11D48",
        ownerBg: "#E0EAF8",
      };

  const openPanel = () => {
    panelAnim.setValue(PANEL_W);
    overlayOpacity.setValue(0);
    setProfileVisible(true);

    Animated.parallel([
      Animated.timing(panelAnim, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 250,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closePanel = () => {
    Animated.parallel([
      Animated.timing(panelAnim, {
        toValue: PANEL_W,
        duration: 240,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 220,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setProfileVisible(false);
      panelAnim.setValue(PANEL_W);
      overlayOpacity.setValue(0);
    });
  };

  const handleLogout = async () => {
    closePanel();

    setTimeout(async () => {
      await AsyncStorage.multiRemove([
        "auth_token",
        "owner_id",
        "owner_code",
        "me_cache_v1",
      ]);

      dispatch(clearMe());
      router.replace("/(auth)/login");
    }, 280);
  };

  const goRegisterFarm = () => {
    router.push("/(aqua)/registration/farm-details");
  };

  const goCreatePond = () => {
    if (!firstRegisteredFarm) return;

    router.push({
      pathname: "/(aqua)/registration/pond-details",
      params: {
        farmId: String(firstRegisteredFarm.id ?? ""),
        farmName: pickName(
          firstRegisteredFarm.farm_name,
          firstRegisteredFarm.name,
          "Farm",
        ),
        userId: numericOwnerId,
      },
    } as any);
  };

  const goCreateCultureCycle = () => {
    if (!firstRegisteredFarm || !firstRegisteredPond) return;

    router.push({
      pathname: "/(aqua)/culture-cycle/add",
      params: {
        farmDbId: String(firstRegisteredFarm.id ?? ""),
        farmId: String(firstRegisteredFarm.id ?? ""),
        farmName: pickName(
          firstRegisteredFarm.farm_name,
          firstRegisteredFarm.name,
          "Farm",
        ),
        pondDbId: String(firstRegisteredPond.id ?? ""),
        pondId: String(firstRegisteredPond.id ?? ""),
        pondName: pickName(
          firstRegisteredPond.pond_name,
          firstRegisteredPond.name,
          "Pond",
        ),
        userId: numericOwnerId,
      },
    } as any);
  };

  const goActivateFarmQr = () => {
    if (!firstRegisteredFarm || !firstCultureCycle) return;

    router.push({
      pathname: "/(aqua)/tabs/qr-scanner",
      params: {
        purpose: "FARM_ACTIVATION",
        returnTo: "/(aqua)/registration/capture-farm-gate",
        cultureCycleId: String(firstCultureCycle.id ?? ""),
        farmDbId: String(firstRegisteredFarm.id ?? ""),
        farmId: String(firstRegisteredFarm.id ?? ""),
        farmName: pickName(
          firstRegisteredFarm.farm_name,
          firstRegisteredFarm.name,
          "Farm",
        ),
        userId: numericOwnerId,
      },
    } as any);
  };

  const goActivatePondQr = () => {
    if (!firstRegisteredPond || !firstCultureCycle) return;

    const linkedFarmId = pickId(
      firstRegisteredPond.farm_id,
      firstCultureCycle.farm_id,
      firstRegisteredFarm?.id,
    );

    router.push({
      pathname: "/(aqua)/tabs/qr-scanner",
      params: {
        purpose: "POND_ACTIVATION",
        returnTo: "/(aqua)/registration/capture-pond-image",
        cultureCycleId: String(firstCultureCycle.id ?? ""),
        pondDbId: String(firstRegisteredPond.id ?? ""),
        pondId: String(firstRegisteredPond.id ?? ""),
        pondName: pickName(
          firstRegisteredPond.pond_name,
          firstRegisteredPond.name,
          "Pond",
        ),
        farmDbId: linkedFarmId,
        farmId: linkedFarmId,
        userId: numericOwnerId,
      },
    } as any);
  };

  const goAddStocking = () => {
    router.push({
      pathname: "/(aqua)/tabs/qr-scanner",
      params: {
        purpose: "STOCKING_ENTRY",
        returnTo: "/(aqua)/stocking/add",

        cultureCycleId: String(firstCultureCycle?.id ?? ""),

        pondDbId: String(firstRegisteredPond?.id ?? ""),
        pondId: String(firstRegisteredPond?.id ?? ""),
        pondName: pickName(
          firstRegisteredPond?.pond_name,
          firstRegisteredPond?.name,
          "Pond",
        ),

        farmDbId: String(firstRegisteredFarm?.id ?? ""),
        farmId: String(firstRegisteredFarm?.id ?? ""),
        farmName: pickName(
          firstRegisteredFarm?.farm_name,
          firstRegisteredFarm?.name,
          "Farm",
        ),

        userId: numericOwnerId,
        farmerId: numericOwnerId,
      },
    } as any);
  };

  const goTraceabilityScanner = () => {
    router.push({
      pathname: "/(aqua)/tabs/qr-scanner",
      params: {
        purpose: "TRACEABILITY",
      },
    } as any);
  };

  const StatCard = ({
    title,
    value,
    sub,
    icon,
  }: {
    title: string;
    value: number;
    sub: string;
    icon: IconName;
  }) => {
    return (
      <View
        style={{
          flex: 1,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: C.cardBorder,
          backgroundColor: C.cardBg,
          padding: 14,
          minHeight: 116,
        }}
      >
        <View
          style={{
            height: 38,
            width: 38,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: C.iconBg,
            marginBottom: 10,
          }}
        >
          <Ionicons name={icon} size={20} color={C.iconColor} />
        </View>

        <Text
          style={{
            fontSize: 24,
            fontWeight: "900",
            color: C.text,
          }}
        >
          {value}
        </Text>

        <Text
          style={{
            marginTop: 3,
            fontSize: 13,
            fontWeight: "800",
            color: C.text,
          }}
          numberOfLines={1}
        >
          {title}
        </Text>

        <Text
          style={{
            marginTop: 4,
            fontSize: 11,
            color: C.subText,
            lineHeight: 16,
          }}
          numberOfLines={2}
        >
          {sub}
        </Text>
      </View>
    );
  };

  const ActionCard = ({
    title,
    sub,
    icon,
    onPress,
    variant = "dark",
    disabled = false,
    badge,
  }: {
    title: string;
    sub: string;
    icon: IconName;
    onPress: () => void;
    variant?: "dark" | "light";
    disabled?: boolean;
    badge?: string;
  }) => {
    const isDarkCard = variant === "dark";

    const bg = isDarkCard ? C.actionDarkBg : C.actionLightBg;
    const border = isDarkCard ? C.actionDarkBorder : C.actionLightBorder;
    const titleCol = isDarkCard ? "#FFFFFF" : C.text;
    const subCol = isDarkCard ? "rgba(255,255,255,0.68)" : C.subText;
    const iconBgC = isDarkCard ? "rgba(255,255,255,0.1)" : C.iconBg;
    const iconC = isDarkCard ? "#60A5FA" : C.iconColor;

    return (
      <Pressable
        disabled={disabled}
        onPress={onPress}
        style={{
          borderRadius: 16,
          borderWidth: 1,
          borderColor: border,
          backgroundColor: bg,
          padding: 15,
          opacity: disabled ? 0.55 : 1,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <View style={{ flex: 1 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 7,
              }}
            >
              <Text
                style={{
                  fontWeight: "700",
                  color: titleCol,
                  fontSize: 16,
                }}
                numberOfLines={1}
              >
                {title}
              </Text>

              {badge ? (
                <View
                  style={{
                    borderRadius: 99,
                    backgroundColor: C.badgeBg,
                    paddingHorizontal: 7,
                    paddingVertical: 2,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "700",
                      color: C.badgeText,
                    }}
                  >
                    {badge}
                  </Text>
                </View>
              ) : null}
            </View>

            <Text
              style={{
                fontSize: 14,
                marginTop: 6,
                lineHeight: 21,
                color: subCol,
              }}
            >
              {sub}
            </Text>
          </View>

          <View
            style={{
              height: 44,
              width: 44,
              borderRadius: 14,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: iconBgC,
            }}
          >
            <Ionicons name={icon} size={22} color={iconC} />
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.screenBg }}>
      <View
        style={{
          paddingTop: insets.top + 10,
          paddingHorizontal: 16,
          paddingBottom: 12,
          backgroundColor: C.screenBg,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text
              style={{
                fontSize: 12,
                color: C.subText,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              {tr("dashboard.oneBlueAquaculture", "OneBlue Aquaculture")}
            </Text>

            <Text
              style={{
                fontSize: 28,
                fontWeight: "800",
                color: C.text,
                marginTop: 4,
              }}
              numberOfLines={1}
            >
              {(me as any)?.username ||
                tr("dashboard.dashboardFallback", "Dashboard")}
            </Text>
          </View>

          <Pressable
            onPress={openPanel}
            style={{
              height: 58,
              width: 58,
              borderRadius: 18,
              backgroundColor: C.avatarBg,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                color: "#FFFFFF",
                fontWeight: "800",
                fontSize: 20,
              }}
            >
              {initials}
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 32,
        }}
      >
        <Text
          style={{
            marginTop: 16,
            fontSize: 20,
            fontWeight: "800",
            color: C.text,
          }}
        >
          {tr("dashboard.registrationSummary", "Registration Summary")}
        </Text>

        <View style={{ marginTop: 14, gap: 10 }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <StatCard
              title={tr("dashboard.farmsRegistered", "Farms Registered")}
              value={totalFarms}
              sub={tr("dashboard.farmsRegisteredSub", "Total farms submitted")}
              icon="business-outline"
            />

            <StatCard
              title={tr("dashboard.farmsActivated", "Farms Activated")}
              value={activatedFarms}
              sub={tr("dashboard.farmsActivatedSub", "Farm QR activated")}
              icon="qr-code-outline"
            />
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <StatCard
              title={tr("dashboard.pondsRegistered", "Ponds Registered")}
              value={totalPonds}
              sub={tr("dashboard.pondsRegisteredSub", "Total ponds submitted")}
              icon="water-outline"
            />

            <StatCard
              title={tr("dashboard.pondsActivated", "Ponds Activated")}
              value={activatedPonds}
              sub={tr("dashboard.pondsActivatedSub", "Pond QR activated")}
              icon="scan-outline"
            />
          </View>
        </View>

        <View
          style={{
            marginTop: 14,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: C.cardBorder,
            backgroundColor: C.cardBg,
            padding: 14,
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: "800",
              color: C.text,
            }}
          >
            {tr("dashboard.activationPending", "Activation Pending")}
          </Text>

          <Text
            style={{
              marginTop: 6,
              fontSize: 13,
              lineHeight: 20,
              color: C.subText,
            }}
          >
            {tr(
              "dashboard.activationPendingSub",
              "Farm QR pending: {{farms}} | Pond QR pending: {{ponds}}",
              {
                farms: pendingFarmActivation,
                ponds: pendingPondActivation,
              },
            )}
          </Text>

          <Text
            style={{
              marginTop: 6,
              fontSize: 13,
              lineHeight: 20,
              color: C.subText,
            }}
          >
            {tr(
              "dashboard.totalSummary",
              "Farms: {{farms}} | Ponds: {{ponds}} | Culture Cycles: {{cycles}}",
              {
                farms: totalFarms,
                ponds: totalPonds,
                cycles: totalCultureCycles,
              },
            )}
          </Text>
        </View>

        <Text
          style={{
            marginTop: 22,
            fontSize: 20,
            fontWeight: "800",
            color: C.text,
          }}
        >
          {tr("dashboard.quickActions", "Quick Actions")}
        </Text>

        <View style={{ marginTop: 18, gap: 12 }}>
          <ActionCard
            title={tr("dashboard.registerFarmPond", "Register Farm & Pond")}
            sub={tr(
              "dashboard.registerFarmPondSub",
              "Register farmer, farm and pond details together for field verification",
            )}
            icon="add-circle-outline"
            variant="dark"
            onPress={goRegisterFarm}
          />

          <ActionCard
            title={tr("dashboard.createCultureCycle", "Create Culture Cycle")}
            sub={
              canCreateCultureCycle
                ? tr(
                    "dashboard.createCultureCycleSub",
                    "Create culture cycle before QR activation and image capture",
                  )
                : tr(
                    "dashboard.createCultureCycleLockedSub",
                    "Register farm and pond first before creating culture cycle",
                  )
            }
            icon="sync-circle-outline"
            variant="dark"
            disabled={!canCreateCultureCycle}
            badge={
              !canCreateCultureCycle
                ? tr("common.locked", "LOCKED")
                : undefined
            }
            onPress={goCreateCultureCycle}
          />

          <ActionCard
            title={tr("dashboard.activateFarmQr", "Activate Farm QR")}
            sub={
              canActivateFarmQr
                ? tr(
                    "dashboard.activateFarmQrSubNamed",
                    "Scan Farm Gate QR for {{farmName}}",
                    {
                      farmName: farmNameForAction,
                    },
                  )
                : tr(
                    "dashboard.activateFarmQrLockedSub",
                    "Create culture cycle first, then activate Farm QR",
                  )
            }
            icon="qr-code-outline"
            variant="dark"
            disabled={!canActivateFarmQr}
            badge={
              !canActivateFarmQr ? tr("common.locked", "LOCKED") : undefined
            }
            onPress={goActivateFarmQr}
          />

          <ActionCard
            title={tr("dashboard.activatePondQr", "Activate Pond QR")}
            sub={
              canActivatePondQr
                ? tr(
                    "dashboard.activatePondQrSubNamed",
                    "Scan Pond QR for {{pondName}}",
                    {
                      pondName: pondNameForAction,
                    },
                  )
                : tr(
                    "dashboard.activatePondQrLockedSub",
                    "Create culture cycle first, then activate Pond QR",
                  )
            }
            icon="scan-outline"
            variant="light"
            disabled={!canActivatePondQr}
            badge={
              !canActivatePondQr ? tr("common.locked", "LOCKED") : undefined
            }
            onPress={goActivatePondQr}
          />

          <ActionCard
            title={tr("dashboard.addStockingDetails", "Add Stocking Details")}
            sub={
              canAddStocking
                ? tr(
                    "dashboard.addStockingDetailsSub",
                    "Scan Pond QR and enter stocking details",
                  )
                : tr(
                    "dashboard.addStockingDetailsLockedSub",
                    "Activate Pond QR first, then add stocking details",
                  )
            }
            icon="fish-outline"
            variant="dark"
            disabled={!canAddStocking}
            badge={!canAddStocking ? tr("common.locked", "LOCKED") : undefined}
            onPress={goAddStocking}
          />

          <ActionCard
            title={tr("dashboard.addExtraPond", "Add Extra Pond")}
            sub={
              canCreatePond
                ? tr(
                    "dashboard.addExtraPondSubNamed",
                    "Add another pond under {{farmName}}",
                    {
                      farmName: farmNameForAction,
                    },
                  )
                : tr(
                    "dashboard.addExtraPondLockedSub",
                    "Register a farm before adding extra pond",
                  )
            }
            icon="water-outline"
            variant="light"
            disabled={!canCreatePond}
            badge={!canCreatePond ? tr("common.locked", "LOCKED") : undefined}
            onPress={goCreatePond}
          />

          <ActionCard
            title={tr("dashboard.qrScanner", "QR Scanner")}
            sub={tr(
              "dashboard.qrScannerSub",
              "Scan QR for traceability view only",
            )}
            icon="barcode-outline"
            variant="light"
            onPress={goTraceabilityScanner}
          />
        </View>

        <View
          style={{
            marginTop: 24,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: C.cardBorder,
            backgroundColor: C.cardBg,
            padding: 16,
          }}
        >
          <Text
            style={{
              color: C.text,
              fontSize: 18,
              fontWeight: "800",
            }}
          >
            {tr("dashboard.correctWorkflow", "Correct Workflow")}
          </Text>

          <Text
            style={{
              marginTop: 10,
              color: C.subText,
              fontSize: 15,
              lineHeight: 24,
            }}
          >
            {tr(
              "dashboard.correctWorkflowSub",
              "Farm + Pond Register → Create Culture Cycle → Activate Farm/Pond QR → Capture Image → Add Stocking → Daily Logs.",
            )}
          </Text>
        </View>
      </ScrollView>

      {profileVisible ? (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            flexDirection: "row",
          }}
        >
          <Animated.View style={{ flex: 1, opacity: overlayOpacity }}>
            <Pressable
              style={{
                flex: 1,
                backgroundColor: "rgba(0,0,0,0.48)",
              }}
              onPress={closePanel}
            />
          </Animated.View>

          <Animated.View
            style={{
              width: PANEL_W,
              backgroundColor: C.panelBg,
              transform: [{ translateX: panelAnim }],
              paddingTop: insets.top + 20,
              paddingBottom: insets.bottom + 16,
              borderLeftWidth: 1,
              borderLeftColor: C.panelBorder,
            }}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 16 }}
            >
              <Pressable
                onPress={closePanel}
                style={{
                  alignSelf: "flex-end",
                  marginRight: 16,
                  marginBottom: 4,
                }}
              >
                <Ionicons name="close" size={22} color={C.subText} />
              </Pressable>

              <View
                style={{
                  alignItems: "center",
                  paddingHorizontal: 16,
                  paddingBottom: 16,
                }}
              >
                <View
                  style={{
                    height: 60,
                    width: 60,
                    borderRadius: 20,
                    backgroundColor: C.avatarBg,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontWeight: "800",
                      fontSize: 22,
                    }}
                  >
                    {initials}
                  </Text>
                </View>

                <Text
                  style={{
                    marginTop: 10,
                    fontSize: 16,
                    fontWeight: "800",
                    color: C.text,
                    textAlign: "center",
                  }}
                >
                  {(me as any)?.username ||
                    tr("dashboard.profileUserFallback", "User")}
                </Text>

                <Text
                  style={{
                    marginTop: 3,
                    fontSize: 12,
                    color: C.subText,
                    textAlign: "center",
                  }}
                >
                  {(me as any)?.rootverse_type || "-"} · RootVerse
                </Text>

                <View
                  style={{
                    marginTop: 12,
                    width: "100%",
                    borderRadius: 12,
                    backgroundColor: C.ownerBg,
                    borderWidth: 1,
                    borderColor: C.panelBorder,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      color: C.subText,
                      textTransform: "uppercase",
                      letterSpacing: 0.6,
                    }}
                  >
                    {tr("dashboard.profileId", "User ID")}
                  </Text>

                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "800",
                      color: C.text,
                    }}
                  >
                    {numericOwnerId || "—"}
                  </Text>
                </View>
              </View>

              <View
                style={{
                  height: 1,
                  backgroundColor: C.divider,
                  marginHorizontal: 16,
                }}
              />

              <Pressable
                onPress={() => dispatch(toggleTheme())}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                }}
              >
                <View
                  style={{
                    height: 36,
                    width: 36,
                    borderRadius: 11,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: C.iconBg,
                  }}
                >
                  <Ionicons
                    name={dark ? "moon-outline" : "sunny-outline"}
                    size={18}
                    color={C.iconColor}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "700",
                      color: C.text,
                    }}
                  >
                    {tr("dashboard.theme", "Theme")}
                  </Text>

                  <Text
                    style={{
                      fontSize: 11,
                      color: C.subText,
                      marginTop: 1,
                    }}
                  >
                    {dark
                      ? tr("dashboard.darkMode", "Dark mode")
                      : tr("dashboard.lightMode", "Light mode")}
                  </Text>
                </View>

                <View
                  style={{
                    width: 42,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: dark ? C.toggleOn : C.toggleOff,
                    justifyContent: "center",
                    paddingHorizontal: 3,
                    alignItems: dark ? "flex-end" : "flex-start",
                  }}
                >
                  <View
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 9,
                      backgroundColor: "#FFFFFF",
                    }}
                  />
                </View>
              </Pressable>

              <View
                style={{
                  height: 1,
                  backgroundColor: C.divider,
                  marginHorizontal: 16,
                }}
              />

              <View style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 10,
                  }}
                >
                  <View
                    style={{
                      height: 36,
                      width: 36,
                      borderRadius: 11,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: C.iconBg,
                    }}
                  >
                    <Ionicons
                      name="language-outline"
                      size={18}
                      color={C.iconColor}
                    />
                  </View>

                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "700",
                      color: C.text,
                    }}
                  >
                    {tr("dashboard.language", "Language")}
                  </Text>
                </View>

                <View style={{ flexDirection: "row", gap: 8 }}>
                  {[
                    {
                      code: "en" as const,
                      label: tr("dashboard.english", "English"),
                    },
                    {
                      code: "ta" as const,
                      label: tr("dashboard.tamil", "தமிழ்"),
                    },
                  ].map((lang) => {
                    const active = currentLanguage === lang.code;

                    return (
                      <Pressable
                        key={lang.code}
                        onPress={() => handleLanguageChange(lang.code)}
                        style={{
                          flex: 1,
                          paddingVertical: 9,
                          borderRadius: 10,
                          borderWidth: 1.5,
                          borderColor: active ? C.tapHint : C.panelBorder,
                          backgroundColor: active
                            ? dark
                              ? "rgba(37,99,235,0.18)"
                              : "#DCEEFF"
                            : "transparent",
                          alignItems: "center",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "800",
                            color: active ? C.tapHint : C.subText,
                          }}
                        >
                          {lang.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View
                style={{
                  height: 1,
                  backgroundColor: C.divider,
                  marginHorizontal: 16,
                }}
              />

              <Pressable
                onPress={handleLogout}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                }}
              >
                <View
                  style={{
                    height: 36,
                    width: 36,
                    borderRadius: 11,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: C.logoutBg,
                  }}
                >
                  <Ionicons
                    name="log-out-outline"
                    size={18}
                    color={C.logoutText}
                  />
                </View>

                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "700",
                    color: C.logoutText,
                  }}
                >
                  {tr("dashboard.logout", "Logout")}
                </Text>
              </Pressable>
            </ScrollView>
          </Animated.View>
        </View>
      ) : null}
    </View>
  );
}