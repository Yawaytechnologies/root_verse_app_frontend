import React, { useEffect, useMemo, useRef, useState } from "react";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Speech from "expo-speech";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

import { useTrace } from "../../src/data/wild/trace.store";

// ✅ sync (same queue used by catchlog screen)
import { useAppDispatch } from "../../src/store/hooks";
import { submitCatchLog } from "../../src/services/wild/catchLog.slice";
import { flushQueue, getQueueCount } from "../../src/utils/offlineQueue";

type Lang = "ta" | "en";

const TOKEN_KEY = "auth_token";

const API_BASE = "https://rootverse-backend-5qoo.onrender.com";
const ME_API = `${API_BASE}/api/me`;
const OWNER_API_BASE = `${API_BASE}/api/owner/fetch`;

const LAST_OWNER_ID_KEY = "rv_last_owner_id";
const OWNER_CACHE_PREFIX = "rv_owner_cache:";

type OwnerApiRes = {
  id: number;
  username?: string;
  phone_no?: string;
  address?: string;
  rootverse_type?: string;
  verification_status?: string;
  profile_picture_url?: string;
  owner_id?: string;
  state_name?: string;
  district_name?: string;
  email?: string;
};

type MeApiRes = {
  id: number;
  username?: string;
  phone_no?: string;
  address?: string;
  rootverse_type?: string;
  verification_status?: string;
  profile_picture_url?: string;
  owner_id?: string;
  state_name?: string;
  district_name?: string;
  email?: string;
  [key: string]: any;
};

const i18n = {
  en: {
    title: "Wild Fisher",
    hint: "Tap to open. Long-press to hear again.",

    myDetails: "My Details",
    ownerId: "Owner ID",
    phone: "Phone",
    email: "Email",
    address: "Address",
    close: "Close",

    actions: "Quick Actions",
    newTrip: "New Trip",
    newTripSub: "Create new trip request",
    newTripVoice: "Tap New Trip",

    catchLog: "New Catch Log",
    catchLogSub: "Record catch details",
    catchLogVoice: "Tap New Catch Log",

    scanDetails: "Scan & View Catch Log Details",
    scanDetailsSub: "Scan QR to view catch log details",
    scanDetailsVoice: "Tap Scan and View Catch Log Details",

    trips: "My Trips",
    tripsSub: "View your trips list",
    tripsVoice: "Tap My Trips",

    langBtnTa: "தமிழ்",
    langBtnEn: "English",

    loadingProfile: "Loading profile…",
    failedProfile: "Failed to load profile",
    retry: "Retry",

    noToken: "No token found. Please login again.",
    sessionExpired: "Session expired. Please login again.",
    offlineNoCache: "Offline. No cached profile found.",

    logout: "Logout",
    logoutConfirm: "Do you want to logout?",
    cancel: "Cancel",

    syncPending: "Sync pending",
    syncing: "Syncing…",
    syncDone: "SYNC DONE",
  },
  ta: {
    title: "Wild Fisher",
    hint: "தட்டி திறக்கவும். நீண்ட தட்டலில் மீண்டும் கேட்கலாம்.",

    myDetails: "என் விவரங்கள்",
    ownerId: "உரிமையாளர் ஐடி",
    phone: "தொலைபேசி",
    email: "மின்னஞ்சல்",
    address: "முகவரி",
    close: "மூடு",

    actions: "விரைவு செயல்கள்",
    newTrip: "புதிய பயணம்",
    newTripSub: "பயணம் கோரிக்கை உருவாக்கவும்",
    newTripVoice: "புதிய பயணம் என்று தட்டுங்கள்",

    catchLog: "புதிய பிடிப்பு பதிவு",
    catchLogSub: "மீன் பிடிப்பு விவரங்களை பதிவு",
    catchLogVoice: "புதிய பிடிப்பு பதிவு என்று தட்டுங்கள்",

    scanDetails: "ஸ்கேன் & பிடிப்பு பதிவு விவரங்கள்",
    scanDetailsSub: "QR ஸ்கேன் செய்து பிடிப்பு பதிவு விவரங்களை பார்க்கவும்",
    scanDetailsVoice: "ஸ்கேன் செய்து பிடிப்பு பதிவு விவரங்கள் பார்க்க தட்டுங்கள்",

    trips: "என் பயணங்கள்",
    tripsSub: "பயண பட்டியலை பார்க்கவும்",
    tripsVoice: "என் பயணங்கள் என்று தட்டுங்கள்",

    langBtnTa: "தமிழ்",
    langBtnEn: "English",

    loadingProfile: "ப்ரோஃபைல் ஏற்றுகிறது…",
    failedProfile: "ப்ரோஃபைல் ஏற்ற முடியவில்லை",
    retry: "மீண்டும் முயற்சி",

    noToken: "டோக்கன் இல்லை. மீண்டும் லாகின் செய்யவும்.",
    sessionExpired: "செஷன் முடிந்தது. மீண்டும் லாகின் செய்யவும்.",
    offlineNoCache: "ஆஃப்லைன். சேமித்த ப்ரோஃபைல் இல்லை.",

    logout: "லாக்அவுட்",
    logoutConfirm: "லாக்அவுட் செய்ய வேண்டுமா?",
    cancel: "ரத்து",

    syncPending: "சிங்க் நிலுவையில்",
    syncing: "சிங்க் ஆகிறது…",
    syncDone: "சிங்க் முடிந்தது",
  },
};

function speak(text: string, lang: Lang) {
  try {
    Speech.stop();
    Speech.speak(text, {
      language: lang === "ta" ? "ta-IN" : "en-IN",
      rate: 0.95,
      pitch: 1,
    });
  } catch {}
}

async function haptic() {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {}
}

const UI = {
  bg: "#f5f7fb",
  card: "#ffffff",
  border: "#d9e2ef",
  text: "#0f172a",
  muted: "#64748b",
  blue: "#2f6fed",
  blueSoft: "#eaf1ff",
  green: "#16a34a",
  greenSoft: "#eafaf0",
  red: "#dc2626",
  redSoft: "#fee2e2",
};

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <View
      className={`rounded-2xl border ${className}`}
      style={{ backgroundColor: UI.card, borderColor: UI.border }}
    >
      {children}
    </View>
  );
}

// ✅ icon-only network indicator (no text)
function StatusChip({ online }: { online: boolean }) {
  return (
    <Ionicons
      name={online ? "wifi" : "wifi-outline"}
      size={18}
      color={online ? UI.green : UI.red}
      accessibilityLabel={online ? "Online" : "Offline"}
    />
  );
}

function ProfileDrawer({
  open,
  onClose,
  user,
  lang,
}: {
  open: boolean;
  onClose: () => void;
  user: {
    name: string;
    role: string;
    ownerId: string;
    phone: string;
    email: string;
    address: string;
    avatarUrl?: string;
    district?: string;
    state?: string;
  };
  lang: Lang;
}) {
  const t = i18n[lang];

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 bg-black/40">
        <Pressable onPress={() => {}} className="absolute left-0 top-0 h-full w-[86%] bg-white">
          <ScrollView contentContainerClassName="px-4 pt-6 pb-10">
            <View className="flex-row items-center justify-between">
              <Text className="text-xl font-bold" style={{ color: UI.text }}>
                {t.myDetails}
              </Text>
              <Pressable onPress={onClose} className="rounded-full p-2 active:opacity-70">
                <Ionicons name="close" size={24} color={UI.text} />
              </Pressable>
            </View>

            <View className="mt-4 flex-row items-center gap-3">
              <View
                className="h-16 w-16 rounded-full items-center justify-center overflow-hidden"
                style={{ backgroundColor: UI.blue }}
              >
                {user.avatarUrl ? (
                  <Image source={{ uri: user.avatarUrl }} style={{ width: 64, height: 64 }} resizeMode="cover" />
                ) : (
                  <Text className="text-white font-extrabold text-lg">
                    {(user.name || "—")
                      .split(" ")
                      .slice(0, 2)
                      .map((w) => (w ? w[0] : "—"))
                      .join("")
                      .toUpperCase()}
                  </Text>
                )}
              </View>

              <View className="flex-1">
                <Text className="text-lg font-bold" style={{ color: UI.text }} numberOfLines={1}>
                  {user.name}
                </Text>
                <Text className="text-sm" style={{ color: UI.muted }} numberOfLines={1}>
                  {user.role} · {user.ownerId}
                </Text>

                {!!(user.district || user.state) && (
                  <Text className="mt-1 text-sm" style={{ color: UI.muted }} numberOfLines={1}>
                    {[user.district, user.state].filter(Boolean).join(", ")}
                  </Text>
                )}
              </View>
            </View>

            <View className="mt-4 gap-3">
              {[
                { k: t.ownerId, v: user.ownerId },
                { k: t.phone, v: user.phone },
                { k: t.email, v: user.email },
                { k: t.address, v: user.address },
              ].map((x) => (
                <Card key={x.k}>
                  <View className="p-4">
                    <Text className="text-sm" style={{ color: UI.muted }}>
                      {x.k}
                    </Text>
                    <Text className="mt-1 text-base" style={{ color: UI.text, fontWeight: "700" }}>
                      {x.v}
                    </Text>
                  </View>
                </Card>
              ))}
            </View>

            <Pressable
              onPress={onClose}
              className="mt-6 rounded-2xl px-4 py-4 active:opacity-90"
              style={{ backgroundColor: UI.blue }}
            >
              <Text className="text-center text-white font-semibold text-base">{t.close}</Text>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ActionRow({
  icon,
  title,
  subtitle,
  voiceHint,
  lang,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  voiceHint: string;
  lang: Lang;
  onPress: () => void;
}) {
  const onPressIn = async () => {
    await haptic();
    speak(voiceHint, lang);
  };

  const onLongPress = async () => {
    await haptic();
    speak(voiceHint, lang);
  };

  const onTap = async () => {
    await haptic();
    onPress();
  };

  return (
    <Pressable onPressIn={onPressIn} onLongPress={onLongPress} delayLongPress={350} onPress={onTap} className="active:opacity-85">
      <Card>
        <View className="px-4 py-4 flex-row items-center">
          <View className="h-12 w-12 rounded-xl items-center justify-center" style={{ backgroundColor: UI.blueSoft }}>
            <Ionicons name={icon} size={24} color={UI.blue} />
          </View>

          <View className="ml-3 flex-1">
            <Text className="text-base font-bold" style={{ color: UI.text }} numberOfLines={1}>
              {title}
            </Text>
            <Text className="mt-0.5 text-sm" style={{ color: UI.muted }} numberOfLines={2}>
              {subtitle}
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={22} color={UI.muted} />
        </View>
      </Card>
    </Pressable>
  );
}

/* ----------------- AUTH + CACHE HELPERS ----------------- */

async function readTokenFromStorage(): Promise<string | null> {
  const keys = [TOKEN_KEY, "access_token", "token"];
  for (const k of keys) {
    const v = await AsyncStorage.getItem(k);
    const token = (v || "").trim();
    if (token) return token;
  }
  return null;
}

async function clearAuthStorage() {
  const keys = [TOKEN_KEY, "access_token", "token"];
  await Promise.all(keys.map((k) => AsyncStorage.removeItem(k)));
}

function cacheKeyForOwnerId(ownerId: number) {
  return `${OWNER_CACHE_PREFIX}${ownerId}`;
}

async function saveLastOwnerId(ownerId: number) {
  await AsyncStorage.setItem(LAST_OWNER_ID_KEY, String(ownerId));
}

async function readLastOwnerId(): Promise<number | null> {
  const v = await AsyncStorage.getItem(LAST_OWNER_ID_KEY);
  const n = v ? Number(String(v).trim()) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function saveOwnerCache(ownerId: number, data: OwnerApiRes) {
  await AsyncStorage.setItem(cacheKeyForOwnerId(ownerId), JSON.stringify(data));
  await saveLastOwnerId(ownerId);
}

async function readOwnerCache(ownerId: number): Promise<OwnerApiRes | null> {
  const raw = await AsyncStorage.getItem(cacheKeyForOwnerId(ownerId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OwnerApiRes;
  } catch {
    return null;
  }
}

async function clearOwnerCaches() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const del = keys.filter((k) => k === LAST_OWNER_ID_KEY || k.startsWith(OWNER_CACHE_PREFIX));
    if (del.length) await AsyncStorage.multiRemove(del);
  } catch {}
}

async function isOnlineNow(): Promise<boolean> {
  const s = await NetInfo.fetch();
  const connected = !!s.isConnected;
  const reachable = s.isInternetReachable;
  return reachable === null ? connected : connected && reachable;
}

/* ----------------- API CALLS ----------------- */

async function fetchMe(token: string): Promise<MeApiRes> {
  const res = await fetch(ME_API, {
    method: "GET",
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });

  if (res.status === 401) throw new Error("UNAUTHORIZED");
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`ME API failed: ${res.status} ${res.statusText} ${txt}`.trim());
  }

  const json: any = await res.json();
  const me: any = json?.user ?? json?.data?.user ?? json?.data ?? json;

  const id = Number(me?.id);
  if (!Number.isFinite(id) || id <= 0) throw new Error("ME API returned invalid user id");
  return { ...me, id } as MeApiRes;
}

async function fetchOwnerById(ownerDbId: number, token?: string): Promise<OwnerApiRes> {
  const res = await fetch(`${OWNER_API_BASE}/${encodeURIComponent(String(ownerDbId))}`, {
    method: "GET",
    headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Owner API failed: ${res.status} ${res.statusText} ${txt}`.trim());
  }

  return (await res.json()) as OwnerApiRes;
}

/* ----------------- SCREEN ----------------- */

export default function WildDashboard() {
  const insets = useSafeAreaInsets();
  const trace = useTrace();
  const dispatch = useAppDispatch();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lang, setLang] = useState<Lang>("ta");
  const t = i18n[lang];

  const [online, setOnline] = useState(true);

  // ✅ sync indicator
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const flushingRef = useRef(false);
  const doneTimerRef = useRef<any>(null);

  const lastCrateId = useMemo(() => trace.events?.[0]?.crateId ?? "", [trace.events]);

  const [ownerDbId, setOwnerDbId] = useState<number | null>(null);
  const [me, setMe] = useState<MeApiRes | null>(null);
  const [profile, setProfile] = useState<OwnerApiRes | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const refreshPendingCount = async (): Promise<number> => {
    try {
      const c = await getQueueCount();
      setPendingCount(c);
      return c;
    } catch {
      return pendingCount;
    }
  };

  const flashDoneAndHide = () => {
    setShowDone(true);
    if (doneTimerRef.current) clearTimeout(doneTimerRef.current);
    // ✅ 조금 பெரிய "Sync done" show longer
    doneTimerRef.current = setTimeout(() => {
      setShowDone(false);
    }, 2000);
  };

  const doFlushQueue = async (ownerIdForPatch?: number | null) => {
    if (flushingRef.current) return;

    const before = await refreshPendingCount();
    if (!before || before <= 0) {
      setSyncing(false);
      setShowDone(false);
      return;
    }

    if (!online) return;

    flushingRef.current = true;
    setSyncing(true);
    setShowDone(false);

    let remaining = before;
    setPendingCount(remaining);

    try {
      await flushQueue(async (payload: any) => {
        const patched: any = { ...(payload || {}) };
        if (!patched.ownerId && ownerIdForPatch) patched.ownerId = ownerIdForPatch;

        await dispatch(submitCatchLog(patched as any)).unwrap();

        remaining = Math.max(0, remaining - 1);
        setPendingCount(remaining);
      });
    } catch {
      // keep pending
    } finally {
      const after = await refreshPendingCount();
      setSyncing(false);
      flushingRef.current = false;

      if (before > 0 && after === 0) {
        flashDoneAndHide();
      }
    }
  };

  // ✅ network listener + auto flush
  useEffect(() => {
    let alive = true;

    const sub = NetInfo.addEventListener(async (s) => {
      const connected = !!s.isConnected;
      const reachable = s.isInternetReachable;
      const on = reachable === null ? connected : connected && reachable;

      if (!alive) return;
      setOnline(on);

      if (on) {
        const oid = ownerDbId || (await readLastOwnerId());
        await doFlushQueue(oid || null);
      }
    });

    (async () => {
      await refreshPendingCount();
      const onNow = await isOnlineNow();
      if (!alive) return;
      setOnline(onNow);
      if (onNow) {
        const oid = ownerDbId || (await readLastOwnerId());
        await doFlushQueue(oid || null);
      }
    })();

    return () => {
      alive = false;
      sub();
      if (doneTimerRef.current) clearTimeout(doneTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, ownerDbId]);

  const showSync = pendingCount > 0 || syncing || showDone;

  // ✅ red pending, blue syncing
  const syncUi = useMemo(() => {
    if (syncing) {
      return {
        icon: "sync-outline" as const,
        color: UI.blue,
        text: `${t.syncing} (${pendingCount})`,
      };
    }
    return {
      icon: online ? ("cloud-upload-outline" as const) : ("cloud-offline-outline" as const),
      color: UI.red,
      text: `${t.syncPending}: ${pendingCount}`,
    };
  }, [syncing, pendingCount, online, t]);

  const onLogout = () => {
    Alert.alert(
      t.logout,
      t.logoutConfirm,
      [
        { text: t.cancel, style: "cancel" },
        {
          text: t.logout,
          style: "destructive",
          onPress: async () => {
            try {
              await haptic();
              Speech.stop();

              await clearAuthStorage();
              await clearOwnerCaches();

              setMe(null);
              setProfile(null);
              setOwnerDbId(null);

              router.replace("/(auth)/otp" as const);
            } catch {
              router.replace("/(auth)/otp" as const);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const loadProfile = async () => {
    setLoadingProfile(true);
    setProfileError(null);

    try {
      const lastId = await readLastOwnerId();
      if (lastId) {
        const cached = await readOwnerCache(lastId);
        if (cached) {
          setOwnerDbId(lastId);
          setProfile(cached);
        }
      }

      const token = await readTokenFromStorage();
      if (!token) {
        if (!profile && !lastId) {
          setProfileError(t.noToken);
          router.replace("/(auth)/otp" as const);
        }
        return;
      }

      const onNow = await isOnlineNow();
      setOnline(onNow);
      if (!onNow) {
        if (!profile && !lastId) setProfileError(t.offlineNoCache);
        return;
      }

      const meData = await fetchMe(token);
      setMe(meData);
      setOwnerDbId(meData.id);

      const ownerData = await fetchOwnerById(meData.id, token);
      setProfile(ownerData);

      await saveOwnerCache(meData.id, ownerData);
      await refreshPendingCount();
    } catch (e: any) {
      if (e?.message === "UNAUTHORIZED") {
        await clearAuthStorage();
        await clearOwnerCaches();
        setMe(null);
        setProfile(null);
        setOwnerDbId(null);
        setProfileError(t.sessionExpired);
        router.replace("/(auth)/otp" as const);
        return;
      }

      if (!profile) setProfileError(e?.message || t.failedProfile);
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        loadProfile();
        refreshPendingCount();
      }
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const user = useMemo(() => {
    const src: any = profile || me;

    const name = src?.username ? String(src.username) : "—";
    const role = src?.rootverse_type ? String(src.rootverse_type) : "—";
    const ownerIdLabel = src?.owner_id ? String(src.owner_id) : ownerDbId ? `ID-${ownerDbId}` : "—";

    const phone = src?.phone_no ? String(src.phone_no) : "—";
    const email = src?.email ? String(src.email) : "—";
    const address = src?.address ? String(src.address) : "—";
    const avatarUrl = src?.profile_picture_url ? String(src.profile_picture_url) : undefined;

    return {
      name,
      role,
      ownerId: ownerIdLabel,
      phone,
      email,
      address,
      avatarUrl,
      state: src?.state_name || "",
      district: src?.district_name || "",
    };
  }, [profile, me, ownerDbId]);

  const greeted = useRef(false);
  useEffect(() => {
    if (greeted.current) return;
    greeted.current = true;

    const id = setTimeout(() => {
      if (AppState.currentState !== "active") return;
      speak(
        lang === "ta"
          ? "புதிய பயணம். புதிய பிடிப்பு பதிவு. ஸ்கேன் செய்து பிடிப்பு பதிவு விவரங்கள். என் பயணங்கள்."
          : "New Trip. New Catch Log. Scan and View Catch Log Details. My Trips.",
        lang
      );
    }, 650);

    return () => clearTimeout(id);
  }, [lang]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: UI.bg }} edges={["top", "left", "right"]}>
      <ProfileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} user={user} lang={lang} />

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 16 }} contentContainerClassName="px-4 pb-6">
        {/* Header */}
        <View className="pt-3 flex-row items-center justify-between">
          <Text className="text-lg font-bold" style={{ color: UI.text }}>
            {t.title}
          </Text>

          <View className="flex-row items-center">
            {/* ✅ show pending/syncing in header (small) ONLY when NOT showDone */}
            {showSync && !showDone && (
              <Pressable
                onPress={async () => {
                  await haptic();
                  if (syncing) return;
                  if (!online) return;
                  const oid = ownerDbId || (await readLastOwnerId());
                  await doFlushQueue(oid || null);
                }}
                className="flex-row items-center rounded-full px-2 py-2 active:opacity-70"
                hitSlop={8}
              >
                <Ionicons name={syncUi.icon as any} size={18} color={syncUi.color} />
                <Text className="ml-2 text-xs font-semibold" style={{ color: syncUi.color }}>
                  {syncUi.text}
                </Text>
              </Pressable>
            )}

            <View style={{ width: showSync && !showDone ? 8 : 0 }} />

            <StatusChip online={online} />

            <View style={{ width: 6 }} />
            <Pressable onPress={onLogout} className="rounded-full px-2 py-2 active:opacity-70" hitSlop={8}>
              <Ionicons name="log-out-outline" size={20} color={UI.text} />
            </Pressable>
          </View>
        </View>

        {/* ✅ BIG "SYNC DONE" banner (2 seconds) */}
        {showDone && (
          <View className="mt-3">
            <View
              className="flex-row items-center justify-center rounded-2xl px-4 py-3 border"
              style={{ backgroundColor: UI.greenSoft, borderColor: "#bfe8cd" }}
            >
              <Ionicons name="checkmark-circle" size={24} color={UI.green} />
              <Text className="ml-2 text-base font-extrabold" style={{ color: UI.green }}>
                {t.syncDone}
              </Text>
            </View>
          </View>
        )}

        {/* Profile card */}
        <Card className="mt-4">
          <Pressable
            onPress={() => setDrawerOpen(true)}
            className="px-4 py-4 active:opacity-80"
            disabled={loadingProfile || !!profileError || !profile}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View
                  className="h-14 w-14 rounded-full items-center justify-center overflow-hidden"
                  style={{ backgroundColor: UI.blue }}
                >
                  {user.avatarUrl ? (
                    <Image source={{ uri: user.avatarUrl }} style={{ width: 56, height: 56 }} resizeMode="cover" />
                  ) : (
                    <Text className="text-white font-extrabold text-lg">
                      {(user.name || "—")
                        .split(" ")
                        .slice(0, 2)
                        .map((w) => (w ? w[0] : "—"))
                        .join("")
                        .toUpperCase()}
                    </Text>
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <Text className="text-base font-bold" style={{ color: UI.text }} numberOfLines={1}>
                    {user.name}
                  </Text>

                  <Text className="text-sm" style={{ color: UI.muted }} numberOfLines={1}>
                    {user.role} · {user.ownerId}
                  </Text>

                  {!!(user.district || user.state) && (
                    <Text className="mt-0.5 text-sm" style={{ color: UI.muted }} numberOfLines={1}>
                      {[user.district, user.state].filter(Boolean).join(", ")}
                    </Text>
                  )}
                </View>
              </View>

              {loadingProfile ? <ActivityIndicator /> : <Ionicons name="chevron-forward" size={22} color={UI.muted} />}
            </View>

            <View className="mt-3 rounded-xl px-3 py-2" style={{ backgroundColor: UI.blueSoft }}>
              {loadingProfile ? (
                <Text className="text-sm font-semibold" style={{ color: UI.blue }}>
                  {t.loadingProfile}
                </Text>
              ) : profileError ? (
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm font-semibold flex-1 pr-2" style={{ color: UI.red }} numberOfLines={2}>
                    {profileError}
                  </Text>
                  <Pressable
                    onPress={async () => {
                      await haptic();
                      loadProfile();
                    }}
                    className="rounded-full px-3 py-1 border"
                    style={{ borderColor: UI.border, backgroundColor: UI.card }}
                  >
                    <Text className="text-sm font-semibold" style={{ color: UI.text }}>
                      {t.retry}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <Text className="text-sm font-semibold" style={{ color: UI.blue }}>
                  {t.hint}
                </Text>
              )}
            </View>

            {!!lastCrateId && (
              <View className="mt-2 rounded-xl px-3 py-2 border" style={{ backgroundColor: UI.greenSoft, borderColor: "#bfe8cd" }}>
                <Text className="text-sm" style={{ color: UI.text }}>
                  Last Sticker: <Text style={{ fontWeight: "800" }}>{String(lastCrateId)}</Text>
                </Text>
              </View>
            )}
          </Pressable>
        </Card>

        {/* Language toggle */}
        <View className="mt-3 flex-row justify-end">
          <Pressable
            onPress={async () => {
              await haptic();
              setLang((x) => (x === "ta" ? "en" : "ta"));
            }}
            className="rounded-full border bg-white px-3 py-2 active:opacity-80"
            style={{ borderColor: UI.border }}
          >
            <Text className="text-sm font-semibold" style={{ color: UI.text }}>
              {lang === "ta" ? i18n.ta.langBtnEn : i18n.en.langBtnTa}
            </Text>
          </Pressable>
        </View>

        {/* Actions */}
        <View className="mt-5">
          <Text className="mb-2 text-base font-bold" style={{ color: UI.text }}>
            {t.actions}
          </Text>

          <View className="gap-3">
            <ActionRow
              icon="boat-outline"
              title={t.newTrip}
              subtitle={t.newTripSub}
              voiceHint={t.newTripVoice}
              lang={lang}
              onPress={() => router.push("/(wild)/trips/create" as const)}
            />

            <ActionRow
              icon="fish-outline"
              title={t.catchLog}
              subtitle={t.catchLogSub}
              voiceHint={t.catchLogVoice}
              lang={lang}
              onPress={() => router.push("/(wild)/catch-logs/create" as const)}
            />

            <ActionRow
              icon="qr-code-outline"
              title={t.scanDetails}
              subtitle={t.scanDetailsSub}
              voiceHint={t.scanDetailsVoice}
              lang={lang}
              onPress={() => router.push("/(wild)/catch-logs/details" as const)}
            />

            <ActionRow
              icon="list-outline"
              title={t.trips}
              subtitle={t.tripsSub}
              voiceHint={t.tripsVoice}
              lang={lang}
              onPress={() => router.push("/(wild)/trips" as const)}
            />
          </View>
        </View>

        {/* Bottom CTA */}
        <Pressable
          onPress={() => router.push("/(wild)/trips/create" as const)}
          className="mt-6 rounded-2xl px-4 py-4 active:opacity-90"
          style={{ backgroundColor: UI.blue }}
        >
          <Text className="text-center text-white font-semibold text-base">
            {lang === "ta" ? "புதிய பயணம் தொடங்கு" : "Start New Trip"}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
