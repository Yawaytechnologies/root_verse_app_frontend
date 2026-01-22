import React, { useEffect, useMemo, useRef, useState } from "react";
import { router } from "expo-router";
import { Alert, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";

import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { createTrip as createTripDummy } from "../../../src/data/wild/trips.dummy";
import { useAppDispatch } from "../../../src/store/hooks";
import { createTrip as createTripThunk } from "../../../src/features/trip/tripSlice";

type Lang = "ta" | "en";

const FISHING_METHODS = ["Pole & Line", "Hook & Line", "Longline", "Gillnet", "Trawling"];

const LANDING_CENTERS = [
  "Chennai Fishing Harbor",
  "Nagapattinam Fishing Harbor",
  "Thoothukudi Fishing Harbor",
  "Ramanathapuram Fishing Harbor",
];

const i18n = {
  en: {
    title: "New Trip Request",
    online: "Online",
    offline: "Offline",
    ownerName: "Owner Name",
    regNo: "Registration No",
    tripDetails: "Trip Details",
    tripName: "Trip Name",
    fishingMethod: "Fishing Method",
    landingCenter: "Nearest Station",
    tapToSelect: "Tap to select",
    select: "Select",
    plannedTripDT: "Planned Trip Date & Time",
    crewDetails: "Crew Details",
    crewMembers: "Crew members",
    crewHelp: "Use + / − to adjust (min 0)",

    qrCount: "QR Count",
    qrCountPH: "e.g. 10",
    qrHelp: "How many QR codes needed for this trip",

    planning: "Planning",
    expectedReturn: "Arrival Date (optional)",
    suppliesCost: "Supplies Cost (Auto)",
    diesel: "Diesel",
    liters: "Liters",
    ratePerLiter: "₹ / Liter",
    dieselCost: "Diesel Cost",
    ice: "Ice",
    kg: "Kg",
    ratePerKg: "₹ / Kg",
    iceCost: "Ice Cost",
    totalCost: "Total",
    totalHelp: "Diesel + Ice (auto-calculated)",
    cancel: "Cancel",
    submit: "Submit",

    errMethod: "Select fishing method",
    errLanding: "Select nearest station",
    errPlanned: "Select planned trip date & time",
    sent: "Trip request sent ✅",
    status: "Status",

    savedOffline: "No internet. Saved locally. Will auto-sync when network returns.",
    syncing: "Syncing pending...",
    pending: "Pending sync",
    apiFailDummy: "API failed — saved locally (dummy).",
    synced: "Synced ✅",
  },
  ta: {
    title: "புதிய பயணம் கோரிக்கை",
    online: "இணையத்தில்",
    offline: "இணையமில்லை",
    ownerName: "உரிமையாளர் பெயர்",
    regNo: "பதிவு எண்",
    tripDetails: "பயண விவரங்கள்",
    tripName: "பயண பெயர்",
    fishingMethod: "மீன்பிடி முறை",
    landingCenter: "அருகிலுள்ள நிலையம்",
    tapToSelect: "தேர்வு செய்ய தட்டுங்கள்",
    select: "தேர்வு செய்",
    plannedTripDT: "திட்டமிட்ட பயண தேதி & நேரம்",
    crewDetails: "குழு விவரங்கள்",
    crewMembers: "குழு உறுப்பினர்கள்",
    crewHelp: "குறை / கூட்டு பட்டன்களை பயன்படுத்தவும் (குறைந்தபட்சம் 0)",

    qrCount: "QR எண்ணிக்கை",
    qrCountPH: "உதா: 10",
    qrHelp: "இந்த பயணத்திற்கு எத்தனை QR தேவை?",

    planning: "திட்டம்",
    expectedReturn: "வருகை தேதி (விருப்பம்)",
    suppliesCost: "செலவுகள் (தானாக கணக்கு)",
    diesel: "டீசல்",
    liters: "லிட்டர்",
    ratePerLiter: "₹ / லிட்டர்",
    dieselCost: "டீசல் செலவு",
    ice: "ஐஸ்",
    kg: "கிலோ",
    ratePerKg: "₹ / கிலோ",
    iceCost: "ஐஸ் செலவு",
    totalCost: "மொத்தம்",
    totalHelp: "டீசல் + ஐஸ் (தானாக கணக்கு)",
    cancel: "ரத்து",
    submit: "சமர்ப்பி",

    errMethod: "மீன்பிடி முறையை தேர்வு செய்யவும்",
    errLanding: "அருகிலுள்ள நிலையத்தை தேர்வு செய்யவும்",
    errPlanned: "பயண தேதி & நேரம் தேர்வு செய்யவும்",
    sent: "பயண கோரிக்கை அனுப்பப்பட்டது ✅",
    status: "நிலை",

    savedOffline: "இணையம் இல்லை. Local-ல் save பண்ணிட்டோம். Net வந்தவுடன் auto sync ஆகும்.",
    syncing: "Syncing pending...",
    pending: "Pending sync",
    apiFailDummy: "API தோல்வி — உள்ளூரில் சேமிக்கப்பட்டது (dummy).",
    synced: "Sync ஆனது ✅",
  },
};

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <View className={`rounded-2xl border border-[#ead7c8] bg-white ${className}`}>{children}</View>;
}
function Label({ children }: { children: React.ReactNode }) {
  return <Text className="text-xs text-[#7a6f66]">{children}</Text>;
}
function FieldBox({ children }: { children: React.ReactNode }) {
  return <View className="mt-2 rounded-xl border border-[#e6d4c5] bg-white px-3 py-3">{children}</View>;
}

function PickerSheet({
  title,
  value,
  options,
  onSelect,
  sheetRef,
}: {
  title: string;
  value: string;
  options: string[];
  onSelect: (v: string) => void;
  sheetRef: React.RefObject<BottomSheetModal>;
}) {
  const snapPoints = useMemo(() => ["45%", "75%"], []);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return options;
    return options.filter((x) => x.toLowerCase().includes(t));
  }, [q, options]);

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      backgroundStyle={{ borderRadius: 24 }}
      handleIndicatorStyle={{ opacity: 0.35 }}
    >
      <BottomSheetView style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-bold text-[#2b2b2b]">{title}</Text>
          <Pressable onPress={() => sheetRef.current?.dismiss()} className="rounded-full px-3 py-2 active:opacity-80">
            <Text className="text-sm font-semibold text-[#a06b2a]">Done</Text>
          </Pressable>
        </View>

        <View className="mt-3 rounded-xl border border-[#ead7c8] bg-[#fbf6f1] px-3 py-2">
          <TextInput value={q} onChangeText={setQ} placeholder="Search..." className="text-base text-[#2b2b2b]" />
        </View>

        <ScrollView className="mt-3" keyboardShouldPersistTaps="handled">
          {filtered.map((item) => {
            const active = item === value;
            return (
              <Pressable
                key={item}
                onPress={() => {
                  onSelect(item);
                  sheetRef.current?.dismiss();
                }}
                className={`mb-2 rounded-xl border px-4 py-3 active:opacity-80 ${
                  active ? "border-[#a06b2a] bg-[#fff3e7]" : "border-[#ead7c8] bg-white"
                }`}
              >
                <Text className={`text-sm font-semibold ${active ? "text-[#7a4a12]" : "text-[#2b2b2b]"}`}>{item}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

function toISO(dt: Date) {
  return dt.toISOString();
}
function toISOArrival(dateOnly: Date) {
  const d = new Date(dateOnly);
  d.setHours(18, 0, 0, 0);
  return d.toISOString();
}
function formatDateTime(dt: Date) {
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  let hr = dt.getHours();
  const min = String(dt.getMinutes()).padStart(2, "0");
  const ampm = hr >= 12 ? "PM" : "AM";
  hr = hr % 12;
  hr = hr === 0 ? 12 : hr;
  return `${yyyy}-${mm}-${dd} ${String(hr).padStart(2, "0")}:${min} ${ampm}`;
}

function onlyDecimal(v: string) {
  let s = (v || "").replace(/[^0-9.]/g, "");
  const firstDot = s.indexOf(".");
  if (firstDot !== -1) {
    s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, "");
  }
  return s;
}
function onlyInt(v: string) {
  return (v || "").replace(/[^0-9]/g, "");
}
function toNum(v: string) {
  const n = Number(String(v ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}
function money(n: number) {
  return `₹${n.toFixed(2)}`;
}
function mapMethodToApi(label: string) {
  const l = label.toLowerCase();
  if (l.includes("pole")) return "pole&line";
  if (l.includes("hook")) return "hook&line";
  if (l.includes("long")) return "longline";
  if (l.includes("gill")) return "gillnet";
  return "trawling";
}

/* ---------------- OFFLINE QUEUE (Trips) - FIXED ---------------- */
const TRIP_QUEUE_KEY = "RV_TRIP_QUEUE_V1";

type TripApiPayload = {
  fishing_method: string;
  near_station: string;
  planned_at: string;
  arrival_at: string | null;
  diesel: number;
  ice: number;
  total: number;
  qr_count: number;
  owner_code: string;
  count: number;
};

type TripQueuedItem = {
  id: string;
  createdAt: string;
  payload: TripApiPayload;
};

async function loadTripQueue(): Promise<TripQueuedItem[]> {
  const raw = await AsyncStorage.getItem(TRIP_QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as TripQueuedItem[]) : [];
  } catch {
    return [];
  }
}

async function saveTripQueue(items: TripQueuedItem[]) {
  await AsyncStorage.setItem(TRIP_QUEUE_KEY, JSON.stringify(items));
}

async function enqueueTrip(payload: TripApiPayload) {
  const items = await loadTripQueue();
  items.push({
    id: `trip_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    createdAt: new Date().toISOString(),
    payload,
  });
  await saveTripQueue(items);
}

async function getTripQueueCount() {
  const items = await loadTripQueue();
  return items.length;
}

async function flushTripQueue(send: (payload: TripApiPayload) => Promise<any>) {
  const items = await loadTripQueue();
  if (!items.length) return { sent: 0, left: 0 };

  let sent = 0;

  for (let i = 0; i < items.length; i++) {
    try {
      await send(items[i].payload);
      sent++;
    } catch (error) {
      const remaining = items.slice(i);
      await saveTripQueue(remaining);
      return { sent, left: remaining.length, error };
    }
  }

  await saveTripQueue([]);
  return { sent, left: 0 };
}
/* ------------------------------------------------------------ */

export default function NewTripRequest() {
  const dispatch = useAppDispatch();

  const [lang, setLang] = useState<Lang>("ta");
  const t = i18n[lang];

  const ownerName = "Sriharan";
  const registrationNo = "TN02F5678";
  const ownerCode = "OWN-0001";

  const [tripName] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${registrationNo}/${y}${m}${day}_${hh}${mi}`;
  });

  const [method, setMethod] = useState("");
  const [nearStation, setNearStation] = useState("");

  const [plannedDT, setPlannedDT] = useState<Date | null>(null);
  const [showPlannedDate, setShowPlannedDate] = useState(false);
  const [showPlannedTime, setShowPlannedTime] = useState(false);

  const [expectedReturn, setExpectedReturn] = useState<Date | null>(null);
  const [showReturnPicker, setShowReturnPicker] = useState(false);

  const [crewCount, setCrewCount] = useState(0);
  const [qrCount, setQrCount] = useState("");

  const [dieselLiters, setDieselLiters] = useState("");
  const [dieselRate, setDieselRate] = useState("95");
  const [iceKg, setIceKg] = useState("");
  const [iceRate, setIceRate] = useState("15");

  const dieselCost = useMemo(() => toNum(dieselLiters) * toNum(dieselRate), [dieselLiters, dieselRate]);
  const iceCost = useMemo(() => toNum(iceKg) * toNum(iceRate), [iceKg, iceRate]);
  const totalCost = useMemo(() => dieselCost + iceCost, [dieselCost, iceCost]);

  const plannedStr = plannedDT ? formatDateTime(plannedDT) : "";
  const returnStr = expectedReturn ? formatDateTime(expectedReturn).split(" ")[0] : "";

  const [posting, setPosting] = useState(false);

  // ✅ Network + pending
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const methodRef = useRef<BottomSheetModal>(null) as React.RefObject<BottomSheetModal>;
  const stationRef = useRef<BottomSheetModal>(null) as React.RefObject<BottomSheetModal>;

  // ✅ auto flush: on mount + on network change
  useEffect(() => {
    let alive = true;

    const refreshCount = async () => {
      const c = await getTripQueueCount();
      if (alive) setPendingCount(c);
    };

    const doFlush = async () => {
      setSyncing(true);
      try {
        const res = await flushTripQueue(async (payload) => {
          await dispatch(createTripThunk(payload as any)).unwrap();
        });

        await refreshCount();

        // optional toast
        // if (res.sent > 0) Alert.alert(t.synced, `Uploaded ${res.sent} trip(s).`);
      } finally {
        if (alive) setSyncing(false);
      }
    };

    refreshCount();

    // ✅ flush immediately if already online
    NetInfo.fetch().then((s) => {
      const online = !!s.isConnected && (s.isInternetReachable ?? true); // ✅ null => true
      if (alive) setIsOnline(online);
      if (online) doFlush();
    });

    const unsub = NetInfo.addEventListener((state) => {
      const online = !!state.isConnected && (state.isInternetReachable ?? true); // ✅ null => true
      if (!alive) return;
      setIsOnline(online);
      if (online) doFlush();
    });

    return () => {
      alive = false;
      unsub();
    };
  }, [dispatch]);

  const submit = async () => {
    if (!method) return Alert.alert(t.title, t.errMethod);
    if (!nearStation) return Alert.alert(t.title, t.errLanding);
    if (!plannedDT) return Alert.alert(t.title, t.errPlanned);

    const apiPayload: TripApiPayload = {
      fishing_method: mapMethodToApi(method),
      near_station: nearStation,
      planned_at: toISO(plannedDT),
      arrival_at: expectedReturn ? toISOArrival(expectedReturn) : null,

      diesel: Number(dieselCost.toFixed(2)),
      ice: Number(iceCost.toFixed(2)),
      total: Number(totalCost.toFixed(2)),

      qr_count: Number(qrCount || 0),
      owner_code: ownerCode,
      count: crewCount,
    };

    // ✅ OFFLINE => queue + dummy + go back
    if (!isOnline) {
      await enqueueTrip(apiPayload);
      const c = await getTripQueueCount();
      setPendingCount(c);

      createTripDummy({
        tripId: tripName,
        tripName,
        ownerName,
        ownerCode,
        registrationNo,
        method,
        landingCenter: nearStation,
        locationCode: "",
        plannedTripDateTime: plannedStr,
        expectedReturnDate: returnStr || null,
        crewCount,
        qrCount: Number(qrCount || 0),
        dieselLiters: toNum(dieselLiters),
        dieselRate: toNum(dieselRate),
        dieselCost,
        iceKg: toNum(iceKg),
        iceRate: toNum(iceRate),
        iceCost,
        totalCost,
        status: "pending",
        count: crewCount,
      } as any);

      router.replace("/(wild)/trips" as const);
      Alert.alert(t.title, t.savedOffline);
      return;
    }

    try {
      setPosting(true);

      const created = await dispatch(createTripThunk(apiPayload as any)).unwrap();

      router.replace("/(wild)/trips" as const);
      Alert.alert(t.sent, `${t.status}: ${created.approval_status}\n${t.totalCost}: ${money(totalCost)}`);
    } catch (e: any) {
      const msg = String(e?.message || e);
      const m = msg.toLowerCase();
      const networkish = m.includes("network") || m.includes("failed to fetch") || m.includes("timeout");

      if (networkish) {
        await enqueueTrip(apiPayload);
        const c = await getTripQueueCount();
        setPendingCount(c);

        createTripDummy({
          tripId: tripName,
          tripName,
          ownerName,
          ownerCode,
          registrationNo,
          method,
          landingCenter: nearStation,
          locationCode: "",
          plannedTripDateTime: plannedStr,
          expectedReturnDate: returnStr || null,
          crewCount,
          qrCount: Number(qrCount || 0),
          dieselLiters: toNum(dieselLiters),
          dieselRate: toNum(dieselRate),
          dieselCost,
          iceKg: toNum(iceKg),
          iceRate: toNum(iceRate),
          iceCost,
          totalCost,
          status: "pending",
          count: crewCount,
        } as any);

        router.replace("/(wild)/trips" as const);
        Alert.alert(t.title, t.savedOffline);
        return;
      }

      createTripDummy({
        tripId: tripName,
        tripName,
        ownerName,
        ownerCode,
        registrationNo,
        method,
        landingCenter: nearStation,
        locationCode: "",
        plannedTripDateTime: plannedStr,
        expectedReturnDate: returnStr || null,
        crewCount,
        qrCount: Number(qrCount || 0),
        dieselLiters: toNum(dieselLiters),
        dieselRate: toNum(dieselRate),
        dieselCost,
        iceKg: toNum(iceKg),
        iceRate: toNum(iceRate),
        iceCost,
        totalCost,
        status: "pending",
        count: crewCount,
      } as any);

      router.replace("/(wild)/trips" as const);
      Alert.alert(t.apiFailDummy, msg);
    } finally {
      setPosting(false);
    }
  };

  return (
    <View className="flex-1 bg-[#fbf6f1]">
      <PickerSheet title={t.fishingMethod} value={method} options={FISHING_METHODS} onSelect={setMethod} sheetRef={methodRef} />
      <PickerSheet title={t.landingCenter} value={nearStation} options={LANDING_CENTERS} onSelect={setNearStation} sheetRef={stationRef} />

      <ScrollView contentContainerClassName="p-4 pb-10">
        {/* Header */}
        <View className="mb-3 flex-row items-center justify-between">
          <View>
            <Text className="text-lg font-bold text-[#2b2b2b]">{t.title}</Text>

            <View className="mt-1 flex-row items-center gap-2">
              <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: isOnline ? "#10b981" : "#f59e0b" }} />
              <Text className="text-xs font-semibold" style={{ color: isOnline ? "#047857" : "#92400e" }}>
                {isOnline ? t.online : t.offline}
              </Text>
              {syncing ? <Text className="text-[11px] text-[#7a6f66]"> • {t.syncing}</Text> : null}
            </View>

            {pendingCount > 0 ? (
              <View className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                <Text className="text-xs font-semibold text-amber-800">
                  {t.pending}: {pendingCount} {isOnline ? "" : "(offline)"}
                </Text>
              </View>
            ) : null}
          </View>

          <Pressable
            onPress={() => setLang((x) => (x === "ta" ? "en" : "ta"))}
            className="rounded-full border border-[#ead7c8] bg-white px-3 py-2 active:opacity-80"
          >
            <Text className="text-xs font-semibold text-[#2b2b2b]">{lang === "ta" ? "English" : "தமிழ்"}</Text>
          </Pressable>
        </View>

        <Card className="p-4">
          <View className="flex-row justify-between">
            <View>
              <Label>{t.ownerName}:</Label>
              <Text className="mt-1 text-sm font-semibold text-[#2b2b2b]">{ownerName}</Text>
              <Text className="mt-1 text-[11px] text-[#7a6f66]">Owner Code: {ownerCode}</Text>
            </View>
            <View>
              <Label>{t.regNo}:</Label>
              <Text className="mt-1 text-sm font-semibold text-[#2b2b2b]">{registrationNo}</Text>
            </View>
          </View>
        </Card>

        {/* Trip Details */}
        <View className="mt-4">
          <Text className="text-base font-bold text-[#2b2b2b]">{t.tripDetails}</Text>

          <Card className="mt-3 p-4">
            <Label>{t.tripName}</Label>
            <FieldBox>
              <Text className="text-base text-[#2b2b2b]">{tripName}</Text>
            </FieldBox>

            <View className="mt-3">
              <FieldBox>
                <Pressable onPress={() => methodRef.current?.present()} className="active:opacity-80">
                  <Label>{t.fishingMethod}</Label>
                  <Text className={`mt-1 text-base ${method ? "text-[#2b2b2b]" : "text-[#b1a59a]"}`}>
                    {method || t.select}
                  </Text>
                  <Text className="mt-1 text-[11px] text-[#b1a59a]">{t.tapToSelect}</Text>
                </Pressable>
              </FieldBox>
            </View>

            <View className="mt-3">
              <FieldBox>
                <Pressable onPress={() => stationRef.current?.present()} className="active:opacity-80">
                  <Label>{t.landingCenter}</Label>
                  <Text className={`mt-1 text-base ${nearStation ? "text-[#2b2b2b]" : "text-[#b1a59a]"}`}>
                    {nearStation || t.select}
                  </Text>
                  <Text className="mt-1 text-[11px] text-[#b1a59a]">{t.tapToSelect}</Text>
                </Pressable>
              </FieldBox>
            </View>

            <View className="mt-3">
              <FieldBox>
                <Pressable onPress={() => setShowPlannedDate(true)} className="active:opacity-80">
                  <Label>{t.plannedTripDT}</Label>
                  <Text className={`mt-1 text-base ${plannedStr ? "text-[#2b2b2b]" : "text-[#b1a59a]"}`}>
                    {plannedStr || t.select}
                  </Text>
                </Pressable>
              </FieldBox>

              {showPlannedDate && Platform.OS !== "web" && (
                <DateTimePicker
                  value={plannedDT ?? new Date()}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(e, date) => {
                    if ((e as any).type === "dismissed") return setShowPlannedDate(false);
                    setShowPlannedDate(false);
                    if (date) {
                      const base = plannedDT ?? new Date();
                      const merged = new Date(date);
                      merged.setHours(base.getHours(), base.getMinutes(), 0, 0);
                      setPlannedDT(merged);
                      setShowPlannedTime(true);
                    }
                  }}
                />
              )}

              {showPlannedTime && Platform.OS !== "web" && (
                <DateTimePicker
                  value={plannedDT ?? new Date()}
                  mode="time"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(e, date) => {
                    if ((e as any).type === "dismissed") return setShowPlannedTime(false);
                    setShowPlannedTime(false);
                    if (date) {
                      const base = plannedDT ?? new Date();
                      const merged = new Date(base);
                      merged.setHours(date.getHours(), date.getMinutes(), 0, 0);
                      setPlannedDT(merged);
                    }
                  }}
                />
              )}
            </View>
          </Card>
        </View>

        {/* Crew Details */}
        <View className="mt-4">
          <Text className="text-base font-bold text-[#2b2b2b]">{t.crewDetails}</Text>

          <Card className="mt-3 p-4">
            <View className="flex-row items-start">
              <View className="flex-1 pr-3" style={{ flexShrink: 1 }}>
                <Text className="text-sm font-semibold text-[#2b2b2b]" numberOfLines={1}>
                  {t.crewMembers}: {crewCount}
                </Text>
                <Text className="mt-1 text-[11px] text-[#7a6f66]" numberOfLines={2}>
                  {t.crewHelp}
                </Text>
              </View>

              <View className="flex-row items-center" style={{ flexShrink: 0 }}>
                <Pressable
                  onPress={() => setCrewCount((c) => Math.max(0, c - 1))}
                  disabled={crewCount === 0}
                  className="h-10 w-10 items-center justify-center rounded-full border border-[#ead7c8] bg-white active:opacity-80"
                  style={{ opacity: crewCount === 0 ? 0.45 : 1 }}
                >
                  <Text className="text-base font-extrabold text-[#2b2b2b]">−</Text>
                </Pressable>

                <View style={{ width: 10 }} />

                <Pressable
                  onPress={() => setCrewCount((c) => c + 1)}
                  className="h-10 w-10 items-center justify-center rounded-full border border-[#a06b2a] bg-[#fff3e7] active:opacity-80"
                >
                  <Text className="text-base font-extrabold text-[#7a4a12]">+</Text>
                </Pressable>
              </View>
            </View>
          </Card>
        </View>

        {/* Planning + Costs */}
        <View className="mt-4">
          <Text className="text-base font-bold text-[#2b2b2b]">{t.planning}</Text>

          <Card className="mt-3 p-4">
            <FieldBox>
              <Pressable onPress={() => setShowReturnPicker(true)} className="active:opacity-80">
                <Label>{t.expectedReturn}</Label>
                <Text className={`mt-1 text-base ${returnStr ? "text-[#2b2b2b]" : "text-[#b1a59a]"}`}>
                  {returnStr || t.select}
                </Text>
              </Pressable>
            </FieldBox>

            {showReturnPicker && Platform.OS !== "web" && (
              <DateTimePicker
                value={expectedReturn ?? new Date()}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(e, date) => {
                  if ((e as any).type === "dismissed") return setShowReturnPicker(false);
                  setShowReturnPicker(false);
                  if (date) setExpectedReturn(date);
                }}
              />
            )}

            {/* QR Count */}
            <View className="mt-4">
              <Label>{t.qrCount}</Label>
              <FieldBox>
                <Text className="text-[11px] text-[#7a6f66]">{t.qrHelp}</Text>
                <TextInput
                  value={qrCount}
                  onChangeText={(v) => setQrCount(onlyInt(v))}
                  placeholder={t.qrCountPH}
                  keyboardType={Platform.OS === "ios" ? "number-pad" : "numeric"}
                  inputMode="numeric"
                  className="mt-1 text-base text-[#2b2b2b]"
                />
              </FieldBox>
            </View>

            {/* Supplies Cost */}
            <View className="mt-4">
              <Text className="text-sm font-bold text-[#2b2b2b]">{t.suppliesCost}</Text>

              {/* Diesel */}
              <View className="mt-3">
                <Label>{t.diesel}</Label>
                <View className="mt-2 flex-row gap-3">
                  <View className="flex-1 rounded-xl border border-[#e6d4c5] bg-white px-3 py-3">
                    <Text className="text-[11px] text-[#7a6f66]">{t.liters}</Text>
                    <TextInput
                      value={dieselLiters}
                      onChangeText={(v) => setDieselLiters(onlyDecimal(v))}
                      placeholder="e.g. 120"
                      keyboardType={Platform.OS === "ios" ? "decimal-pad" : "numeric"}
                      inputMode="decimal"
                      className="mt-1 text-base text-[#2b2b2b]"
                    />
                  </View>
                  <View className="flex-1 rounded-xl border border-[#e6d4c5] bg-white px-3 py-3">
                    <Text className="text-[11px] text-[#7a6f66]">{t.ratePerLiter}</Text>
                    <TextInput
                      value={dieselRate}
                      onChangeText={(v) => setDieselRate(onlyDecimal(v))}
                      placeholder="e.g. 95"
                      keyboardType={Platform.OS === "ios" ? "decimal-pad" : "numeric"}
                      inputMode="decimal"
                      className="mt-1 text-base text-[#2b2b2b]"
                    />
                  </View>
                </View>

                <View className="mt-2 rounded-xl border border-[#ffd9b6] bg-[#fff3e7] px-3 py-2">
                  <Text className="text-xs font-semibold text-[#7a4a12]">
                    {t.dieselCost}: {money(dieselCost)}
                  </Text>
                </View>
              </View>

              {/* Ice */}
              <View className="mt-4">
                <Label>{t.ice}</Label>
                <View className="mt-2 flex-row gap-3">
                  <View className="flex-1 rounded-xl border border-[#e6d4c5] bg-white px-3 py-3">
                    <Text className="text-[11px] text-[#7a6f66]">{t.kg}</Text>
                    <TextInput
                      value={iceKg}
                      onChangeText={(v) => setIceKg(onlyDecimal(v))}
                      placeholder="e.g. 60"
                      keyboardType={Platform.OS === "ios" ? "decimal-pad" : "numeric"}
                      inputMode="decimal"
                      className="mt-1 text-base text-[#2b2b2b]"
                    />
                  </View>
                  <View className="flex-1 rounded-xl border border-[#e6d4c5] bg-white px-3 py-3">
                    <Text className="text-[11px] text-[#7a6f66]">{t.ratePerKg}</Text>
                    <TextInput
                      value={iceRate}
                      onChangeText={(v) => setIceRate(onlyDecimal(v))}
                      placeholder="e.g. 15"
                      keyboardType={Platform.OS === "ios" ? "decimal-pad" : "numeric"}
                      inputMode="decimal"
                      className="mt-1 text-base text-[#2b2b2b]"
                    />
                  </View>
                </View>

                <View className="mt-2 rounded-xl border border-[#ffd9b6] bg-[#fff3e7] px-3 py-2">
                  <Text className="text-xs font-semibold text-[#7a4a12]">
                    {t.iceCost}: {money(iceCost)}
                  </Text>
                </View>
              </View>

              {/* Total */}
              <View className="mt-4 rounded-2xl border border-[#a06b2a] bg-[#fff3e7] px-4 py-3">
                <Text className="text-xs text-[#7a4a12]">{t.totalCost}</Text>
                <Text className="mt-1 text-lg font-extrabold text-[#2b2b2b]">{money(totalCost)}</Text>
                <Text className="mt-1 text-[11px] text-[#7a6f66]">{t.totalHelp}</Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Actions */}
        <View className="mt-6 flex-row gap-3">
          <Pressable
            onPress={() => router.back()}
            disabled={posting}
            className="flex-1 rounded-2xl border border-[#ead7c8] bg-white p-4 active:opacity-80"
            style={{ opacity: posting ? 0.7 : 1 }}
          >
            <Text className="text-center text-[#2b2b2b] font-semibold">{t.cancel}</Text>
          </Pressable>

          <Pressable
            onPress={submit}
            disabled={posting}
            className="flex-1 rounded-2xl bg-[#a06b2a] p-4 active:opacity-90"
            style={{ opacity: posting ? 0.7 : 1 }}
          >
            <Text className="text-center text-white font-semibold">{posting ? "..." : t.submit}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
