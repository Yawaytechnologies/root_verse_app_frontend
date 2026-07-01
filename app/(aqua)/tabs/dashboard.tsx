import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import {
  extractSamplingArray,
  getSamplingRecords,
} from "../../../src/services/aqua/sampling.service";
import {
  getFarmerDetailsByUserId,
  type FarmerDetails,
} from "../../../src/services/aqua/farmer-details.service";

const SCREEN_W = Dimensions.get("window").width;
const PANEL_W = SCREEN_W * 0.82;
const TOKEN_KEY = "auth_token";
const LANGUAGE_KEY = "app_language";
const PROFILE_EDIT_ROUTE = "/(aqua)/tabs/profile";

type IconName = keyof typeof Ionicons.glyphMap;

type SummaryViewerMode =
  | "REGISTERED_FARMS"
  | "ACTIVATED_FARMS"
  | "REGISTERED_PONDS"
  | "ACTIVATED_PONDS"
  | "SAMPLING_LOGS"
  | "CULTURE_CYCLES"
  | null;

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

  return String(a).trim() === String(b).trim();
}

function pickId(...values: any[]) {
  const found = values.find((value) => {
    if (value === undefined || value === null) return false;

    const text = String(value).trim();

    return (
      text !== "" && text !== "0" && text !== "undefined" && text !== "null"
    );
  });

  return found ? String(found).trim() : "";
}

function pickName(...values: any[]) {
  const found = values.find(
    (value) =>
      value !== undefined && value !== null && String(value).trim() !== "",
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

function showValue(value: any) {
  const text = String(value ?? "").trim();
  return text ? text : "—";
}

function formatDate(value: any) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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

function getSamplingFarmId(record: any) {
  return pickId(
    record?.farm_id,
    record?.farm?.id,
    record?.farm_code,
    record?.farm_uid,
  );
}

function getSamplingPondId(record: any) {
  return pickId(
    record?.pond_id,
    record?.pond?.id,
    record?.pond_code,
    record?.pond_uid,
  );
}

function getSamplingUserId(record: any) {
  return toNumericUserId(
    pickId(record?.user_id, record?.farmer_id, record?.owner_id),
  );
}

function getSamplingDisplayCode(record: any) {
  return pickName(
    record?.sampling_id,
    record?.sampling_code,
    record?.id,
    record?.log_id,
    "—",
  );
}

function getSamplingDisplayDate(record: any) {
  return pickName(
    record?.sampling_date,
    record?.date,
    record?.created_at,
    record?.createdAt,
    "—",
  );
}

function getFarmUiKey(farm: any, index = 0) {
  return (
    pickId(
      farm?.id,
      farm?.farm_id,
      farm?.farm_code,
      farm?.farm_uid,
      farm?.code,
    ) || `farm-${index}`
  );
}

function getFarmDisplayName(farm: any) {
  return pickName(farm?.farm_name, farm?.name, farm?.farmName, "Unnamed Farm");
}

function getFarmDisplayCode(farm: any) {
  return pickName(
    farm?.farm_id,
    farm?.farm_code,
    farm?.farm_uid,
    farm?.code,
    farm?.id,
    "—",
  );
}

function getPondUiKey(pond: any, index = 0) {
  return (
    pickId(
      pond?.id,
      pond?.pond_id,
      pond?.pond_code,
      pond?.pond_uid,
      pond?.code,
    ) || `pond-${index}`
  );
}

function getPondDisplayName(pond: any) {
  return pickName(pond?.pond_name, pond?.name, pond?.pondName, "Unnamed Pond");
}

function getPondDisplayCode(pond: any) {
  return pickName(
    pond?.pond_id,
    pond?.pond_code,
    pond?.pond_uid,
    pond?.code,
    pond?.id,
    "—",
  );
}

function getCultureCycleUiKey(cycle: any, index = 0) {
  return (
    pickId(
      cycle?.id,
      cycle?.culture_cycle_id,
      cycle?.cycle_id,
      cycle?.cycle_code,
      cycle?.code,
    ) || `culture-cycle-${index}`
  );
}

function getCultureCycleDisplayCode(cycle: any) {
  return pickName(
    cycle?.culture_cycle_id,
    cycle?.cycle_id,
    cycle?.cycle_code,
    cycle?.code,
    cycle?.id,
    "—",
  );
}

function getCultureCycleStatus(cycle: any) {
  return pickName(
    cycle?.culture_cycle_status,
    cycle?.cycle_status,
    cycle?.status,
    "Created",
  );
}

function getCultureCycleFarmId(cycle: any) {
  return pickId(
    cycle?.farm_id,
    cycle?.farmId,
    cycle?.farm_db_id,
    cycle?.farm?.id,
    cycle?.farm?.farm_id,
    cycle?.farm_code,
  );
}

function getCultureCyclePondId(cycle: any) {
  return pickId(
    cycle?.pond_id,
    cycle?.pondId,
    cycle?.pond_db_id,
    cycle?.pond?.id,
    cycle?.pond?.pond_id,
    cycle?.pond_code,
  );
}

function compactIds(...values: any[]) {
  return values
    .map((value) => String(value ?? "").trim())
    .filter(
      (value) =>
        value !== "" &&
        value !== "0" &&
        value !== "undefined" &&
        value !== "null",
    );
}

function getFarmPossibleIds(farm: any) {
  return compactIds(
    farm?.id,
    farm?.farm_id,
    farm?.farm_code,
    farm?.farm_uid,
    farm?.code,
  );
}

function getPondPossibleIds(pond: any) {
  return compactIds(
    pond?.id,
    pond?.pond_id,
    pond?.pond_code,
    pond?.pond_uid,
    pond?.code,
  );
}

function getPondFarmPossibleIds(pond: any) {
  return compactIds(
    pond?.farm_id,
    pond?.farmId,
    pond?.farm_db_id,
    pond?.farmDbId,
    pond?.farm?.id,
    pond?.farm?.farm_id,
    pond?.farm?.farm_code,
    pond?.farm_code,
    pond?.farm_uid,
  );
}

function isPondLinkedToSelectedFarm(pond: any, farm: any) {
  const farmIds = getFarmPossibleIds(farm);
  const pondFarmIds = getPondFarmPossibleIds(pond);

  if (!farmIds.length || !pondFarmIds.length) return false;

  return pondFarmIds.some((pondFarmId) =>
    farmIds.some((farmId) => sameId(farmId, pondFarmId)),
  );
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

function unwrapApiData<T = any>(response: any): T {
  if (response?.data && !Array.isArray(response.data)) {
    return response.data as T;
  }

  return response as T;
}

function getRootverseUserFromMe(me: any) {
  return (
    me?.rootverse_user ||
    me?.data?.rootverse_user ||
    me?.user?.rootverse_user ||
    me?.user ||
    me?.data ||
    me ||
    {}
  );
}

function getFarmerDetailsUserId(details: any) {
  return toNumericUserId(
    pickId(
      details?.rootverse_user?.id,
      details?.user_id,
      details?.rootverse_user_id,
      details?.userId,
      details?.farmer_id,
    ),
  );
}

function isFarmerDetailsForCurrentUser(details: any, currentUserId: any) {
  const current = toNumericUserId(currentUserId);
  const detailsUserId = getFarmerDetailsUserId(details);

  if (!current || !detailsUserId) {
    return true;
  }

  return sameId(detailsUserId, current);
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

  const loggedRootUser = useMemo(() => getRootverseUserFromMe(me), [me]);

  const numericOwnerId = useMemo(
    () =>
      toNumericUserId(
        pickId(
          loggedRootUser?.id,
          (me as any)?.rootverse_user_id,
          (me as any)?.user_id,
          (me as any)?.id,
          loggedRootUser?.owner_id,
          (me as any)?.owner_id,
          (me as any)?.owner_code,
        ),
      ),
    [loggedRootUser, me],
  );

  const reduxAllFarms = useSelector(selectAllFarms);
  const reduxApprovedFarms = useSelector(selectApprovedFarms);
  const reduxPendingFarms = useSelector(selectPendingFarms);
  const reduxApprovedPonds = useSelector(selectApprovedPonds);
  const reduxPendingPonds = useSelector(selectPendingPonds);

  const [apiFarms, setApiFarms] = useState<any[]>([]);
  const [apiPonds, setApiPonds] = useState<any[]>([]);
  const [apiCultureCycles, setApiCultureCycles] = useState<any[]>([]);
  const [apiSamplingLogs, setApiSamplingLogs] = useState<any[]>([]);
  const [farmerDetails, setFarmerDetails] = useState<FarmerDetails | null>(
    null,
  );
  const [farmerDetailsError, setFarmerDetailsError] = useState("");
  const [viewerMode, setViewerMode] = useState<SummaryViewerMode>(null);
  const [selectedFarmKey, setSelectedFarmKey] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const loadBackendData = useCallback(async () => {
    try {
      const [farmsRes, pondsRes, samplingRes] = await Promise.all([
        getJson("/api/farms"),
        getJson("/api/ponds"),
        getSamplingRecords().catch(() => ({ data: [] })),
      ]);

      const farms = extractArray<any>(farmsRes);
      const ponds = extractArray<any>(pondsRes);
      const samplingRecords = extractSamplingArray<any>(samplingRes);

      const ownFarms = numericOwnerId
        ? farms.filter((farm) => {
            const farmUserId = toNumericUserId(
              pickId(farm?.user_id, farm?.owner_id),
            );

            return !!farmUserId && sameId(farmUserId, numericOwnerId);
          })
        : farms;

      const ownFarmIds = new Set<string>();

      ownFarms.forEach((farm: any) => {
        [farm?.id, farm?.farm_id, farm?.farm_code, farm?.farm_uid].forEach(
          (value) => {
            const id = pickId(value);
            if (id) ownFarmIds.add(id);
          },
        );
      });

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

      const ownPondIds = new Set<string>();

      ownPonds.forEach((pond: any) => {
        [pond?.id, pond?.pond_id, pond?.pond_code, pond?.pond_uid].forEach(
          (value) => {
            const id = pickId(value);
            if (id) ownPondIds.add(id);
          },
        );
      });

      const ownSamplingLogs = numericOwnerId
        ? samplingRecords.filter((record: any) => {
            const recordUserId = getSamplingUserId(record);

            if (recordUserId && sameId(recordUserId, numericOwnerId)) {
              return true;
            }

            const farmId = getSamplingFarmId(record);
            if (farmId && ownFarmIds.has(farmId)) return true;

            const pondId = getSamplingPondId(record);
            if (pondId && ownPondIds.has(pondId)) return true;

            return false;
          })
        : samplingRecords;

      setApiFarms(ownFarms);
      setApiPonds(ownPonds);
      setApiSamplingLogs(ownSamplingLogs);

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
      setApiSamplingLogs([]);
    }
  }, [numericOwnerId]);

  const loadFarmerDetails = useCallback(async () => {
    if (!numericOwnerId) {
      setFarmerDetails(null);
      setFarmerDetailsError("User ID not found");
      return;
    }

    try {
      setFarmerDetails(null);
      setFarmerDetailsError("");

      const response = await getFarmerDetailsByUserId(numericOwnerId);
      const data = unwrapApiData<FarmerDetails>(response);

      if (!isFarmerDetailsForCurrentUser(data, numericOwnerId)) {
        console.warn("Ignored mismatched farmer profile on dashboard:", {
          currentUserId: numericOwnerId,
          returnedUserId: getFarmerDetailsUserId(data),
        });

        setFarmerDetails(null);
        setFarmerDetailsError(
          "Farmer details returned for another user, so it was ignored.",
        );
        return;
      }

      setFarmerDetails(data);
    } catch (error: any) {
      console.log("Farmer details load failed:", error);
      setFarmerDetails(null);
      setFarmerDetailsError(error?.message || "Farmer details not found");
    }
  }, [numericOwnerId]);

  useEffect(() => {
    if (numericOwnerId) {
      dispatch(fetchAquaApprovals(numericOwnerId));
    }

    loadBackendData();
    loadFarmerDetails();
  }, [dispatch, numericOwnerId, loadBackendData, loadFarmerDetails]);

  const onRefresh = async () => {
    setRefreshing(true);

    if (numericOwnerId) {
      dispatch(fetchAquaApprovals(numericOwnerId));
    }

    await Promise.all([loadBackendData(), loadFarmerDetails()]);
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

  const activatedFarmList = useMemo(() => {
    return allRegisteredFarms.filter(isFarmActivated);
  }, [allRegisteredFarms]);

  const activatedPondList = useMemo(() => {
    return allRegisteredPonds.filter(isPondActivated);
  }, [allRegisteredPonds]);

  const farmViewerMode =
    viewerMode === "REGISTERED_FARMS" || viewerMode === "ACTIVATED_FARMS";

  const visibleFarmList = useMemo(() => {
    if (viewerMode === "ACTIVATED_FARMS") return activatedFarmList;
    return allRegisteredFarms;
  }, [viewerMode, activatedFarmList, allRegisteredFarms]);

  const farmPondViewerFarms = useMemo(() => {
    return visibleFarmList.map((farm, index) => ({
      farm,
      key: getFarmUiKey(farm, index),
    }));
  }, [visibleFarmList]);

  useEffect(() => {
    if (!farmViewerMode) return;

    if (!farmPondViewerFarms.length) {
      if (selectedFarmKey) setSelectedFarmKey("");
      return;
    }

    const selectedExists = farmPondViewerFarms.some(
      (item) => item.key === selectedFarmKey,
    );

    if (!selectedExists) {
      setSelectedFarmKey(farmPondViewerFarms[0].key);
    }
  }, [farmViewerMode, farmPondViewerFarms, selectedFarmKey]);

  const selectedFarmForViewer = useMemo(() => {
    return (
      farmPondViewerFarms.find((item) => item.key === selectedFarmKey)?.farm ??
      farmPondViewerFarms[0]?.farm ??
      null
    );
  }, [farmPondViewerFarms, selectedFarmKey]);

  const selectedFarmLinkedPonds = useMemo(() => {
    if (!selectedFarmForViewer) return [];

    return allRegisteredPonds.filter((pond) =>
      isPondLinkedToSelectedFarm(pond, selectedFarmForViewer),
    );
  }, [allRegisteredPonds, selectedFarmForViewer]);

  const totalFarms = allRegisteredFarms.length;
  const totalPonds = allRegisteredPonds.length;
  const totalCultureCycles = apiCultureCycles.length;
  const totalSamplingLogs = apiSamplingLogs.length;

  const activatedFarms = activatedFarmList.length;
  const activatedPonds = activatedPondList.length;

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
  const canAddSampling =
    !!firstRegisteredPond && !!firstCultureCycle && activatedPonds > 0;

  const canCreateHarvestRequest = activatedPonds > 0 && totalSamplingLogs > 0;

  const farmerRootUser = loggedRootUser;

  const profileUsername = pickName(
    farmerRootUser?.username,
    farmerRootUser?.name,
    (me as any)?.username,
    (me as any)?.name,
    "User",
  );

  const profileType = pickName(
    farmerRootUser?.rootverse_type,
    (me as any)?.rootverse_type,
    "-",
  );

  const profilePhone = pickName(
    farmerRootUser?.phone_no,
    farmerRootUser?.mobile,
    farmerRootUser?.phone,
    (me as any)?.phone_no,
    (me as any)?.mobile,
    (me as any)?.phone,
  );

  const profileOwnerId = pickName(
    farmerRootUser?.owner_id,
    (me as any)?.owner_id,
    "—",
  );

  const userRoleText = cleanStatus(
    pickName(
      (me as any)?.role,
      (me as any)?.user_role,
      farmerRootUser?.rootverse_type,
      (me as any)?.rootverse_type,
      profileType,
    ),
  );

  const canOpenTraderConfirmation =
    userRoleText.includes("trader") ||
    userRoleText.includes("admin") ||
    userRoleText.includes("super_admin");

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
    const username = String(profileUsername || "").trim();

    if (!username) return "U";

    return username
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, [profileUsername]);

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

  const DrawerInfoRow = ({
    label,
    value,
  }: {
    label: string;
    value: any;
  }) => {
    return (
      <View
        style={{
          paddingVertical: 7,
          borderBottomWidth: 1,
          borderBottomColor: C.divider,
        }}
      >
        <Text
          style={{
            color: C.subText,
            fontSize: 10,
            fontWeight: "800",
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          {label}
        </Text>

        <Text
          style={{
            color: C.text,
            fontSize: 12,
            fontWeight: "700",
            marginTop: 3,
            lineHeight: 17,
          }}
        >
          {showValue(value)}
        </Text>
      </View>
    );
  };

  const findFarmForPond = useCallback(
    (pond: any) => {
      return (
        allRegisteredFarms.find((farm) =>
          isPondLinkedToSelectedFarm(pond, farm),
        ) ?? null
      );
    },
    [allRegisteredFarms],
  );

  const findFarmForCultureCycle = useCallback(
    (cycle: any) => {
      const cycleFarmId = getCultureCycleFarmId(cycle);

      if (!cycleFarmId) return null;

      return (
        allRegisteredFarms.find((farm) =>
          getFarmPossibleIds(farm).some((farmId) =>
            sameId(farmId, cycleFarmId),
          ),
        ) ?? null
      );
    },
    [allRegisteredFarms],
  );

  const findPondForCultureCycle = useCallback(
    (cycle: any) => {
      const cyclePondId = getCultureCyclePondId(cycle);

      if (!cyclePondId) return null;

      return (
        allRegisteredPonds.find((pond) =>
          getPondPossibleIds(pond).some((pondId) =>
            sameId(pondId, cyclePondId),
          ),
        ) ?? null
      );
    },
    [allRegisteredPonds],
  );

  const openSummaryViewer = (mode: Exclude<SummaryViewerMode, null>) => {
    setViewerMode(mode);

    if (mode === "REGISTERED_FARMS" && allRegisteredFarms.length) {
      setSelectedFarmKey(getFarmUiKey(allRegisteredFarms[0], 0));
    }

    if (mode === "ACTIVATED_FARMS" && activatedFarmList.length) {
      setSelectedFarmKey(getFarmUiKey(activatedFarmList[0], 0));
    }
  };

  const closeSummaryViewer = () => {
    setViewerMode(null);
  };

  const getViewerHeader = () => {
    switch (viewerMode) {
      case "REGISTERED_FARMS":
        return {
          title: tr("dashboard.registeredFarmsList", "Registered Farms"),
          sub: tr(
            "dashboard.registeredFarmsListSub",
            "Select a farm to view linked ponds",
          ),
        };
      case "ACTIVATED_FARMS":
        return {
          title: tr("dashboard.activatedFarmsList", "Activated Farms"),
          sub: tr(
            "dashboard.activatedFarmsListSub",
            "Only farms with activated QR/status are shown",
          ),
        };
      case "REGISTERED_PONDS":
        return {
          title: tr("dashboard.registeredPondsList", "Registered Ponds"),
          sub: tr(
            "dashboard.registeredPondsListSub",
            "All ponds registered under this user",
          ),
        };
      case "ACTIVATED_PONDS":
        return {
          title: tr("dashboard.activatedPondsList", "Activated Ponds"),
          sub: tr(
            "dashboard.activatedPondsListSub",
            "Only ponds with activated QR/status are shown",
          ),
        };
      case "SAMPLING_LOGS":
        return {
          title: tr("dashboard.samplingLogsList", "Sampling Submitted"),
          sub: tr(
            "dashboard.samplingLogsListSub",
            "All submitted pond sampling logs",
          ),
        };
      case "CULTURE_CYCLES":
        return {
          title: tr("dashboard.cultureCyclesList", "Registered Culture Cycles"),
          sub: tr(
            "dashboard.cultureCyclesListSub",
            "Culture cycles created for registered farms and ponds",
          ),
        };
      default:
        return {
          title: "",
          sub: "",
        };
    }
  };

  const viewerHeader = getViewerHeader();

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
        "aqua_profile_edit_cache_v1",
      ]);

      dispatch(clearMe());
      router.replace("/(auth)/login");
    }, 280);
  };

  const goEditProfile = () => {
    closePanel();

    setTimeout(() => {
      router.push({
        pathname: PROFILE_EDIT_ROUTE,
        params: {
          mode: "edit",
          userId: numericOwnerId,
        },
      } as any);
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

  const goAddSampling = () => {
    router.push({
      pathname: "/(aqua)/tabs/qr-scanner",
      params: {
        purpose: "SAMPLING_ENTRY",
        returnTo: "/(aqua)/sampling/add",
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

  const goViewSamplingLogs = () => {
    router.push("/(aqua)/sampling" as any);
  };

  const goCreateHarvestRequest = () => {
    router.push("/(aqua)/harvest/scan-pond" as any);
  };

  const goMyHarvestRequests = () => {
    router.push("/(aqua)/harvest/my-requests" as any);
  };

  const goTraderHarvestPending = () => {
    router.push("/(aqua)/harvest/trader-pending" as any);
  };

  const goTraceabilityScanner = () => {
    router.push({
      pathname: "/(aqua)/tabs/qr-scanner",
      params: {
        purpose: "TRACEABILITY",
      },
    } as any);
  };

  const EmptyState = ({
    title,
    sub,
  }: {
    title: string;
    sub: string;
  }) => {
    return (
      <View
        style={{
          marginTop: 14,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: C.cardBorder,
          padding: 14,
        }}
      >
        <Text
          style={{
            color: C.text,
            fontSize: 14,
            fontWeight: "800",
          }}
        >
          {title}
        </Text>

        <Text
          style={{
            color: C.subText,
            fontSize: 12,
            marginTop: 6,
            lineHeight: 18,
          }}
        >
          {sub}
        </Text>
      </View>
    );
  };

  const renderFarmViewer = () => {
    if (farmPondViewerFarms.length === 0) {
      return (
        <EmptyState
          title={
            viewerMode === "ACTIVATED_FARMS"
              ? tr("dashboard.noActivatedFarms", "No activated farms found")
              : tr("dashboard.noFarmsFound", "No farms found")
          }
          sub={
            viewerMode === "ACTIVATED_FARMS"
              ? tr(
                  "dashboard.noActivatedFarmsSub",
                  "Activate Farm QR first. Activated farms will show here.",
                )
              : tr(
                  "dashboard.noFarmsFoundSub",
                  "Register a farm first. After that linked ponds will show here.",
                )
          }
        />
      );
    }

    return (
      <>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            gap: 10,
            paddingTop: 14,
            paddingBottom: 4,
          }}
        >
          {farmPondViewerFarms.map((item, index) => {
            const active = item.key === selectedFarmKey;

            return (
              <Pressable
                key={`${item.key}-${index}`}
                onPress={() => setSelectedFarmKey(item.key)}
                style={{
                  width: 160,
                  borderRadius: 15,
                  borderWidth: 1.5,
                  borderColor: active ? C.tapHint : C.cardBorder,
                  backgroundColor: active
                    ? dark
                      ? "rgba(37,99,235,0.18)"
                      : "#DCEEFF"
                    : dark
                      ? "rgba(255,255,255,0.04)"
                      : "#F8FAFC",
                  padding: 12,
                }}
              >
                <Text
                  style={{
                    color: active ? C.tapHint : C.text,
                    fontSize: 13,
                    fontWeight: "900",
                  }}
                  numberOfLines={1}
                >
                  {getFarmDisplayName(item.farm)}
                </Text>

                <Text
                  style={{
                    color: active ? C.tapHint : C.subText,
                    fontSize: 11,
                    fontWeight: "700",
                    marginTop: 5,
                  }}
                  numberOfLines={1}
                >
                  {getFarmDisplayCode(item.farm)}
                </Text>

                <Text
                  style={{
                    color: isFarmActivated(item.farm) ? "#16A34A" : "#D97706",
                    fontSize: 10,
                    fontWeight: "900",
                    marginTop: 7,
                    textTransform: "uppercase",
                  }}
                >
                  {isFarmActivated(item.farm) ? "Active" : "Pending"}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View
          style={{
            marginTop: 12,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: C.cardBorder,
            backgroundColor: dark ? "rgba(255,255,255,0.03)" : "#F8FAFC",
            padding: 12,
          }}
        >
          <Text
            style={{
              color: C.text,
              fontSize: 14,
              fontWeight: "900",
            }}
          >
            {tr("dashboard.linkedPonds", "Linked Ponds")}
          </Text>

          <Text
            style={{
              color: C.subText,
              fontSize: 12,
              marginTop: 4,
              lineHeight: 18,
            }}
          >
            {selectedFarmForViewer
              ? tr(
                  "dashboard.linkedPondsForFarm",
                  "Ponds linked with {{farmName}}",
                  {
                    farmName: getFarmDisplayName(selectedFarmForViewer),
                  },
                )
              : tr("dashboard.selectFarmToViewPonds", "Select a farm to view linked ponds")}
          </Text>

          {renderPondList(selectedFarmLinkedPonds)}
        </View>
      </>
    );
  };

  const renderPondList = (ponds: any[]) => {
    if (ponds.length === 0) {
      return (
        <EmptyState
          title={
            viewerMode === "ACTIVATED_PONDS"
              ? tr("dashboard.noActivatedPonds", "No activated ponds found")
              : tr("dashboard.noRegisteredPonds", "No registered ponds found")
          }
          sub={
            viewerMode === "ACTIVATED_PONDS"
              ? tr(
                  "dashboard.noActivatedPondsSub",
                  "Activate Pond QR first. Activated ponds will show here.",
                )
              : tr(
                  "dashboard.noRegisteredPondsSub",
                  "Register a pond first. Registered ponds will show here.",
                )
          }
        />
      );
    }

    return (
      <View style={{ marginTop: 14, gap: 10 }}>
        {ponds.map((pond, index) => {
          const linkedFarm = findFarmForPond(pond);

          return (
            <View
              key={`${getPondUiKey(pond, index)}-${index}`}
              style={{
                borderRadius: 14,
                borderWidth: 1,
                borderColor: C.cardBorder,
                backgroundColor: dark ? "rgba(255,255,255,0.04)" : "#F8FAFC",
                padding: 12,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
              }}
            >
              <View
                style={{
                  height: 42,
                  width: 42,
                  borderRadius: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: C.iconBg,
                }}
              >
                <Ionicons
                  name="water-outline"
                  size={21}
                  color={C.iconColor}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: C.text,
                    fontSize: 14,
                    fontWeight: "900",
                  }}
                  numberOfLines={1}
                >
                  {getPondDisplayName(pond)}
                </Text>

                <Text
                  style={{
                    color: C.subText,
                    fontSize: 12,
                    fontWeight: "700",
                    marginTop: 3,
                  }}
                  numberOfLines={1}
                >
                  Pond ID: {getPondDisplayCode(pond)}
                </Text>

                <Text
                  style={{
                    color: C.subText,
                    fontSize: 11,
                    marginTop: 3,
                  }}
                  numberOfLines={1}
                >
                  Farm:{" "}
                  {linkedFarm
                    ? getFarmDisplayName(linkedFarm)
                    : pickName(pond?.farm_id, pond?.farm_code, "—")}
                </Text>
              </View>

              <Text
                style={{
                  color: isPondActivated(pond) ? "#16A34A" : "#D97706",
                  fontSize: 10,
                  fontWeight: "900",
                  textTransform: "uppercase",
                }}
              >
                {isPondActivated(pond) ? "Active" : "Pending"}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  const renderCultureCycles = () => {
    if (apiCultureCycles.length === 0) {
      return (
        <EmptyState
          title={tr(
            "dashboard.noCultureCycles",
            "No registered culture cycles found",
          )}
          sub={tr(
            "dashboard.noCultureCyclesSub",
            "Create a culture cycle first. Registered culture cycles will show here.",
          )}
        />
      );
    }

    return (
      <View style={{ marginTop: 14, gap: 10 }}>
        {apiCultureCycles.map((cycle, index) => {
          const farm = findFarmForCultureCycle(cycle);
          const pond = findPondForCultureCycle(cycle);
          const status = getCultureCycleStatus(cycle);

          return (
            <View
              key={`${getCultureCycleUiKey(cycle, index)}-${index}`}
              style={{
                borderRadius: 14,
                borderWidth: 1,
                borderColor: C.cardBorder,
                backgroundColor: dark ? "rgba(255,255,255,0.04)" : "#F8FAFC",
                padding: 12,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: 10,
                }}
              >
                <View
                  style={{
                    height: 42,
                    width: 42,
                    borderRadius: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: C.iconBg,
                  }}
                >
                  <Ionicons
                    name="sync-circle-outline"
                    size={22}
                    color={C.iconColor}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: C.text,
                      fontSize: 14,
                      fontWeight: "900",
                    }}
                    numberOfLines={1}
                  >
                    Culture Cycle: {getCultureCycleDisplayCode(cycle)}
                  </Text>

                  <Text
                    style={{
                      color: C.subText,
                      fontSize: 12,
                      fontWeight: "700",
                      marginTop: 4,
                    }}
                    numberOfLines={1}
                  >
                    Farm:{" "}
                    {farm
                      ? getFarmDisplayName(farm)
                      : pickName(getCultureCycleFarmId(cycle), "—")}
                  </Text>

                  <Text
                    style={{
                      color: C.subText,
                      fontSize: 12,
                      fontWeight: "700",
                      marginTop: 3,
                    }}
                    numberOfLines={1}
                  >
                    Pond:{" "}
                    {pond
                      ? getPondDisplayName(pond)
                      : pickName(getCultureCyclePondId(cycle), "—")}
                  </Text>
                </View>

                <Text
                  style={{
                    color:
                      cleanStatus(status) === "active" ||
                      cleanStatus(status) === "stocked" ||
                      cleanStatus(status) === "in_progress"
                        ? "#16A34A"
                        : "#D97706",
                    fontSize: 10,
                    fontWeight: "900",
                    textTransform: "uppercase",
                  }}
                >
                  {status}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const renderSamplingLogs = () => {
    if (apiSamplingLogs.length === 0) {
      return (
        <EmptyState
          title={tr("dashboard.noSamplingLogs", "No sampling logs found")}
          sub={tr(
            "dashboard.noSamplingLogsSub",
            "Submit pond sampling first. Sampling logs will show here.",
          )}
        />
      );
    }

    return (
      <View style={{ marginTop: 14, gap: 10 }}>
        {apiSamplingLogs.map((record, index) => (
          <View
            key={`${getSamplingDisplayCode(record)}-${index}`}
            style={{
              borderRadius: 14,
              borderWidth: 1,
              borderColor: C.cardBorder,
              backgroundColor: dark ? "rgba(255,255,255,0.04)" : "#F8FAFC",
              padding: 12,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <View
              style={{
                height: 42,
                width: 42,
                borderRadius: 14,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: C.iconBg,
              }}
            >
              <Ionicons
                name="analytics-outline"
                size={21}
                color={C.iconColor}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: C.text,
                  fontSize: 14,
                  fontWeight: "900",
                }}
                numberOfLines={1}
              >
                Sampling: {getSamplingDisplayCode(record)}
              </Text>

              <Text
                style={{
                  color: C.subText,
                  fontSize: 12,
                  fontWeight: "700",
                  marginTop: 3,
                }}
                numberOfLines={1}
              >
                Farm ID: {pickName(getSamplingFarmId(record), "—")} | Pond ID:{" "}
                {pickName(getSamplingPondId(record), "—")}
              </Text>

              <Text
                style={{
                  color: C.subText,
                  fontSize: 11,
                  marginTop: 3,
                }}
                numberOfLines={1}
              >
                Date: {getSamplingDisplayDate(record)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const StatCard = ({
    title,
    value,
    sub,
    icon,
    onPress,
  }: {
    title: string;
    value: number;
    sub: string;
    icon: IconName;
    onPress?: () => void;
  }) => {
    const body = (
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

    if (!onPress) return body;

    return (
      <Pressable onPress={onPress} style={{ flex: 1 }}>
        {body}
      </Pressable>
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
                gap: 8,
              }}
            >
              <Text
                style={{
                  flex: 1,
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
                    borderRadius: 999,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    backgroundColor: C.badgeBg,
                  }}
                >
                  <Text
                    style={{
                      color: C.badgeText,
                      fontSize: 9,
                      fontWeight: "900",
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
              {profileUsername}
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
              sub={tr(
                "dashboard.farmsRegisteredSub",
                "Tap to view registered farms",
              )}
              icon="business-outline"
              onPress={() => openSummaryViewer("REGISTERED_FARMS")}
            />

            <StatCard
              title={tr("dashboard.farmsActivated", "Farms Activated")}
              value={activatedFarms}
              sub={tr(
                "dashboard.farmsActivatedSub",
                "Tap to view activated farms",
              )}
              icon="qr-code-outline"
              onPress={() => openSummaryViewer("ACTIVATED_FARMS")}
            />
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <StatCard
              title={tr("dashboard.pondsRegistered", "Ponds Registered")}
              value={totalPonds}
              sub={tr(
                "dashboard.pondsRegisteredSub",
                "Tap to view registered ponds",
              )}
              icon="water-outline"
              onPress={() => openSummaryViewer("REGISTERED_PONDS")}
            />

            <StatCard
              title={tr("dashboard.pondsActivated", "Ponds Activated")}
              value={activatedPonds}
              sub={tr(
                "dashboard.pondsActivatedSub",
                "Tap to view activated ponds",
              )}
              icon="scan-outline"
              onPress={() => openSummaryViewer("ACTIVATED_PONDS")}
            />
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <StatCard
              title={tr("dashboard.samplingSubmitted", "Sampling Submitted")}
              value={totalSamplingLogs}
              sub={tr(
                "dashboard.samplingSubmittedSub",
                "Tap to view submitted logs",
              )}
              icon="analytics-outline"
              onPress={() => openSummaryViewer("SAMPLING_LOGS")}
            />

            <StatCard
              title={tr("dashboard.cultureCycles", "Culture Cycles")}
              value={totalCultureCycles}
              sub={tr(
                "dashboard.cultureCyclesSub",
                "Tap to view registered cycles",
              )}
              icon="sync-circle-outline"
              onPress={() => openSummaryViewer("CULTURE_CYCLES")}
            />
          </View>
        </View>

        {viewerMode ? (
          <View
            style={{
              marginTop: 16,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: C.cardBorder,
              backgroundColor: C.cardBg,
              padding: 14,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: C.text,
                    fontSize: 18,
                    fontWeight: "900",
                  }}
                >
                  {viewerHeader.title}
                </Text>

                <Text
                  style={{
                    color: C.subText,
                    fontSize: 12,
                    marginTop: 4,
                    lineHeight: 18,
                  }}
                >
                  {viewerHeader.sub}
                </Text>
              </View>

              <Pressable
                onPress={closeSummaryViewer}
                style={{
                  height: 34,
                  width: 34,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: C.iconBg,
                }}
              >
                <Ionicons name="close" size={18} color={C.text} />
              </Pressable>
            </View>

            {farmViewerMode ? renderFarmViewer() : null}

            {viewerMode === "REGISTERED_PONDS"
              ? renderPondList(allRegisteredPonds)
              : null}

            {viewerMode === "ACTIVATED_PONDS"
              ? renderPondList(activatedPondList)
              : null}

            {viewerMode === "CULTURE_CYCLES" ? renderCultureCycles() : null}

            {viewerMode === "SAMPLING_LOGS" ? renderSamplingLogs() : null}
          </View>
        ) : null}

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
              !canCreateCultureCycle ? tr("common.locked", "LOCKED") : undefined
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
            title={tr("dashboard.addSamplingLog", "Add Sampling Log")}
            sub={
              canAddSampling
                ? tr(
                    "dashboard.addSamplingLogSub",
                    "Scan Pond QR and enter sampling details",
                  )
                : tr(
                    "dashboard.addSamplingLogLockedSub",
                    "Activate Pond QR and add stocking before sampling",
                  )
            }
            icon="analytics-outline"
            variant="dark"
            disabled={!canAddSampling}
            badge={!canAddSampling ? tr("common.locked", "LOCKED") : undefined}
            onPress={goAddSampling}
          />

          <ActionCard
            title={tr(
              "dashboard.viewSamplingSubmitted",
              "View Sampling Submitted",
            )}
            sub={tr(
              "dashboard.viewSamplingSubmittedSub",
              "View all submitted sampling logs with ABW, size and biomass",
            )}
            icon="clipboard-outline"
            variant="light"
            onPress={goViewSamplingLogs}
          />

          <ActionCard
            title={tr("dashboard.createHarvestRequest", "Create Harvest Request")}
            sub={
              canCreateHarvestRequest
                ? tr(
                    "dashboard.createHarvestRequestSub",
                    "Scan Pond QR and submit harvest request for trader confirmation",
                  )
                : tr(
                    "dashboard.createHarvestRequestLockedSub",
                    "Activate Pond QR and submit sampling first before harvest request",
                  )
            }
            icon="leaf-outline"
            variant="dark"
            disabled={!canCreateHarvestRequest}
            badge={
              !canCreateHarvestRequest
                ? tr("common.locked", "LOCKED")
                : undefined
            }
            onPress={goCreateHarvestRequest}
          />

          <ActionCard
            title={tr("dashboard.myHarvestRequests", "My Harvest Requests")}
            sub={tr(
              "dashboard.myHarvestRequestsSub",
              "View harvest request status and generated Harvest ID after trader acceptance",
            )}
            icon="document-text-outline"
            variant="light"
            onPress={goMyHarvestRequests}
          />

          {canOpenTraderConfirmation ? (
            <ActionCard
              title={tr(
                "dashboard.traderHarvestConfirmation",
                "Trader Harvest Confirmation",
              )}
              sub={tr(
                "dashboard.traderHarvestConfirmationSub",
                "Accept or reject pending farmer harvest requests",
              )}
              icon="checkmark-done-circle-outline"
              variant="dark"
              onPress={goTraderHarvestPending}
            />
          ) : null}

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
                  {profileUsername}
                </Text>

                <Text
                  style={{
                    marginTop: 3,
                    fontSize: 12,
                    color: C.subText,
                    textAlign: "center",
                  }}
                >
                  {profileType} · RootVerse
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
                  }}
                >
                  <DrawerInfoRow label="User ID" value={numericOwnerId} />
                  <DrawerInfoRow label="Owner ID" value={profileOwnerId} />
                  <DrawerInfoRow label="Phone" value={profilePhone} />

                  {farmerDetailsError ? (
                    <Text
                      style={{
                        color: C.logoutText,
                        fontSize: 11,
                        fontWeight: "700",
                        marginTop: 8,
                        lineHeight: 16,
                      }}
                    >
                      {farmerDetailsError}
                    </Text>
                  ) : null}
                </View>

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
                  }}
                >
                  <Text
                    style={{
                      color: C.text,
                      fontSize: 13,
                      fontWeight: "900",
                      marginBottom: 4,
                    }}
                  >
                    Farmer Details
                  </Text>

                  <DrawerInfoRow
                    label="Father Name"
                    value={farmerDetails?.Father_name}
                  />
                  <DrawerInfoRow
                    label="DOB"
                    value={formatDate(farmerDetails?.DOB)}
                  />
                  <DrawerInfoRow label="Email" value={farmerDetails?.email} />
                  <DrawerInfoRow
                    label="Farmer Licence"
                    value={farmerDetails?.farmer_liscence}
                  />
                  <DrawerInfoRow
                    label="Farming Experience"
                    value={formatDate(farmerDetails?.farming_experience)}
                  />
                </View>

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
                  }}
                >
                  <Text
                    style={{
                      color: C.text,
                      fontSize: 13,
                      fontWeight: "900",
                      marginBottom: 4,
                    }}
                  >
                    RootVerse Details
                  </Text>

                  <DrawerInfoRow
                    label="Verification"
                    value={farmerRootUser?.verification_status}
                  />
                  <DrawerInfoRow
                    label="Register Progress"
                    value={farmerRootUser?.owner_register_progress}
                  />
                  <DrawerInfoRow label="Address" value={farmerRootUser?.address} />
                  <DrawerInfoRow label="State" value={farmerRootUser?.state_name} />
                  <DrawerInfoRow
                    label="District"
                    value={farmerRootUser?.district_name}
                  />
                  <DrawerInfoRow
                    label="Location"
                    value={farmerRootUser?.location_name}
                  />
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
                onPress={goEditProfile}
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
                  <Ionicons name="create-outline" size={18} color={C.iconColor} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "700",
                      color: C.text,
                    }}
                  >
                    {tr("dashboard.editProfile", "Edit Profile")}
                  </Text>

                  <Text
                    style={{
                      fontSize: 11,
                      color: C.subText,
                      marginTop: 1,
                    }}
                  >
                    {tr(
                      "dashboard.editProfileSub",
                      "Update farmer and RootVerse details",
                    )}
                  </Text>
                </View>

                <Ionicons name="chevron-forward" size={17} color={C.subText} />
              </Pressable>

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