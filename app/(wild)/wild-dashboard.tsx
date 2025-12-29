import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import WildBottomNav from "../../src/components/WildBottomNav";
import { useTrace } from "../../src/data/wild/trace.store";

type Lang = "en" | "ta";

const i18n = {
  en: {
    // Drawer
    myDetails: "My Details",
    language: "Language",
    goTo: "GO TO",
    tripRegistry: "Trip Registry",
    catchRegistry: "Catch Log Registry",
    vesselDetails: "Vessel Details",
    ownerDetails: "Owner Details",
    ownerId: "Owner ID",
    phone: "Phone",
    email: "Email",
    address: "Address",

    // Top actions
    scan: "Scan",
    continueTrace: "Continue Trace",
    startTrace: "Start Trace",
    linkedSticker: "Sticker",
    demo: "Demo",

    // Header / hero
    appTitle: "RootVerse · Wild Capture",
    appSubtitle: "Trips, catch logs, vessels and traceability.",

    // Common UI labels
    viewAll: "View all",
    tripDetails: "Trip Details",
    catchLogDetails: "Catch Log Details",

    // KPI
    kpiTrips: "Trips",
    kpiCatchTotal: "Catch Total",
    kpiSpecies: "Species",
    kpiActiveTrip: "Active Trip",

    // Strings inside cards/rows
    scanEmptySticker: "Scan empty QR sticker",
    vessel: "Vessel",
    trip: "Trip",
  },
  ta: {
    // Drawer
    myDetails: "என் விவரங்கள்",
    language: "மொழி",
    goTo: "செல்ல",
    tripRegistry: "பயண பதிவு",
    catchRegistry: "பிடிப்பு பதிவு",
    vesselDetails: "கப்பல் விவரம்",
    ownerDetails: "உரிமையாளர் விவரம்",
    ownerId: "உரிமையாளர் ஐடி",
    phone: "தொலைபேசி",
    email: "மின்னஞ்சல்",
    address: "முகவரி",

    // Top actions
    scan: "ஸ்கேன்",
    continueTrace: "தொடர்ந்து ட்ரேஸ்",
    startTrace: "ட்ரேஸ் தொடங்கு",
    linkedSticker: "ஸ்டிக்கர்",
    demo: "டெமோ",

    // Header / hero
    appTitle: "RootVerse · காட்டு பிடிப்பு",
    appSubtitle: "பயணங்கள், பிடிப்பு பதிவுகள், கப்பல்கள் மற்றும் ட்ரேஸபிலிட்டி.",

    // Common UI labels
    viewAll: "அனைத்தையும் பார்க்க",
    tripDetails: "பயண விவரங்கள்",
    catchLogDetails: "பிடிப்பு பதிவு விவரங்கள்",

    // KPI
    kpiTrips: "பயணங்கள்",
    kpiCatchTotal: "மொத்த பிடிப்பு",
    kpiSpecies: "வகைகள்",
    kpiActiveTrip: "நடப்பு பயணம்",

    // Strings inside cards/rows
    scanEmptySticker: "காலி QR ஸ்டிக்கரை ஸ்கேன் செய்யவும்",
    vessel: "கப்பல்",
    trip: "பயணம்",
  },
};

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <View className={`rounded-2xl border border-slate-200 bg-white ${className}`}>{children}</View>;
}

function Chip({ label }: { label: string }) {
  return (
    <View className="self-start rounded-full bg-slate-100 px-2.5 py-1">
      <Text className="text-xs font-semibold text-slate-700">{label}</Text>
    </View>
  );
}

function Row({
  title,
  sub,
  onPress,
  right,
}: {
  title: string;
  sub: string;
  onPress?: () => void;
  right?: React.ReactNode;
}) {
  const Wrap: any = onPress ? Pressable : View;
  return (
    <Wrap
      onPress={onPress}
      className={`flex-row items-center justify-between px-3 py-3 ${onPress ? "active:opacity-80" : ""}`}
    >
      <View className="flex-1 pr-3">
        <Text className="text-sm font-semibold text-slate-900">{title}</Text>
        <Text className="mt-0.5 text-xs text-slate-600">{sub}</Text>
      </View>
      {right ? <View>{right}</View> : null}
    </Wrap>
  );
}

function Segmented({ value, onChange }: { value: Lang; onChange: (v: Lang) => void }) {
  return (
    <View className="flex-row rounded-2xl border border-slate-200 bg-slate-50 p-1">
      <Pressable
        onPress={() => onChange("en")}
        className={`flex-1 rounded-xl px-3 py-2 active:opacity-80 ${value === "en" ? "bg-white" : ""}`}
      >
        <Text className={`text-center text-sm font-semibold ${value === "en" ? "text-slate-900" : "text-slate-600"}`}>
          English
        </Text>
      </Pressable>
      <Pressable
        onPress={() => onChange("ta")}
        className={`flex-1 rounded-xl px-3 py-2 active:opacity-80 ${value === "ta" ? "bg-white" : ""}`}
      >
        <Text className={`text-center text-sm font-semibold ${value === "ta" ? "text-slate-900" : "text-slate-600"}`}>
          தமிழ்
        </Text>
      </Pressable>
    </View>
  );
}

function ProfileDrawer({
  open,
  onClose,
  user,
  lang,
  setLang,
}: {
  open: boolean;
  onClose: () => void;
  user: { name: string; role: string; ownerId: string; phone: string; email: string; address: string };
  lang: Lang;
  setLang: (v: Lang) => void;
}) {
  const t = i18n[lang];

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 bg-black/40">
        <Pressable onPress={() => {}} className="absolute left-0 top-0 h-full w-[84%] bg-white">
          <View className="px-4 pt-6">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-bold text-slate-900">{t.myDetails}</Text>
              <Pressable onPress={onClose} className="rounded-full p-2 active:opacity-70">
                <Ionicons name="close" size={22} color="#0f172a" />
              </Pressable>
            </View>

            {/* Profile header */}
            <View className="mt-4 flex-row items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-slate-900">
                <Text className="text-base font-bold text-white">
                  {user.name
                    .split(" ")
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join("")
                    .toUpperCase()}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-slate-900">{user.name}</Text>
                <Text className="text-sm text-slate-600">{user.role}</Text>
              </View>
            </View>

            {/* Language setting */}
            <View className="mt-4">
              <Text className="mb-2 text-xs font-semibold text-slate-500">{t.language}</Text>
              <Segmented value={lang} onChange={setLang} />
              <Text className="mt-2 text-[11px] text-slate-500">
                {/* keep this demo note bilingual or remove */}
                {lang === "ta" ? "இது டெமோ நிலை. பின்னர் global store-ல் சேமிப்போம்." : "This is demo state now. Later we’ll store it in a global store."}
              </Text>
            </View>

            {/* Details cards */}
            <View className="mt-4 gap-3">
              <Card className="p-4">
                <Text className="text-xs text-slate-500">{t.ownerId}</Text>
                <Text className="mt-1 text-sm font-semibold text-slate-900">{user.ownerId}</Text>
              </Card>
              <Card className="p-4">
                <Text className="text-xs text-slate-500">{t.phone}</Text>
                <Text className="mt-1 text-sm font-semibold text-slate-900">{user.phone}</Text>
              </Card>
              <Card className="p-4">
                <Text className="text-xs text-slate-500">{t.email}</Text>
                <Text className="mt-1 text-sm font-semibold text-slate-900">{user.email}</Text>
              </Card>
              <Card className="p-4">
                <Text className="text-xs text-slate-500">{t.address}</Text>
                <Text className="mt-1 text-sm text-slate-900">{user.address}</Text>
              </Card>
            </View>

            {/* Navigation */}
            <Text className="mt-6 mb-2 text-xs font-semibold text-slate-500">{t.goTo}</Text>
            <View className="gap-2">
              <Pressable
                onPress={() => {
                  onClose();
                  router.push("/(wild)/trips");
                }}
                className="flex-row items-center gap-3 rounded-xl border border-slate-200 p-3 active:opacity-80"
              >
                <Ionicons name="boat-outline" size={18} color="#0f172a" />
                <Text className="text-sm font-semibold text-slate-900">{t.tripRegistry}</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  onClose();
                  router.push("/(wild)/catch-logs");
                }}
                className="flex-row items-center gap-3 rounded-xl border border-slate-200 p-3 active:opacity-80"
              >
                <Ionicons name="fish-outline" size={18} color="#0f172a" />
                <Text className="text-sm font-semibold text-slate-900">{t.catchRegistry}</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  onClose();
                  router.push("/(wild)/vessels");
                }}
                className="flex-row items-center gap-3 rounded-xl border border-slate-200 p-3 active:opacity-80"
              >
                <Ionicons name="albums-outline" size={18} color="#0f172a" />
                <Text className="text-sm font-semibold text-slate-900">{t.vesselDetails}</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  onClose();
                  router.push("/(wild)/owner");
                }}
                className="flex-row items-center gap-3 rounded-xl border border-slate-200 p-3 active:opacity-80"
              >
                <Ionicons name="person-outline" size={18} color="#0f172a" />
                <Text className="text-sm font-semibold text-slate-900">{t.ownerDetails}</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* ----------------------------- Mock Data ----------------------------- */

const TRIPS = [
  { id: "RV-TRIP-2025-0012", status: "ACTIVE", port: "Nagapattinam", vesselId: "RV-VES-NA026829" },
  { id: "RV-TRIP-2025-0011", status: "COMPLETED", port: "Nagapattinam", vesselId: "RV-VES-NA026829" },
];

const CATCH = [
  { id: "RV-CATCH-00091", species: "Yellowfin Tuna", kg: 82.5, tripId: "RV-TRIP-2025-0012" },
  { id: "RV-CATCH-00092", species: "Seer Fish", kg: 44.0, tripId: "RV-TRIP-2025-0012" },
];

export default function WildDashboard() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lang, setLang] = useState<Lang>("en");
  const trace = useTrace();
  const t = i18n[lang];

  // Replace with auth later
  const user = {
    name: "Gowtham Sakthivel",
    role: "Vessel Owner",
    ownerId: "NA026829",
    phone: "6374484558",
    email: "sgowtham2k1@gmail.com",
    address: "1/198 Main Road Kuthalam, Gopurajapuram (Post), Kuthalam - 609703, Nagapattinam",
  };

  const kpis = useMemo(() => {
    const activeTrip = TRIPS.find((x) => x.status === "ACTIVE");
    const totalKg = CATCH.reduce((s, c) => s + c.kg, 0);
    return {
      activeTrip: activeTrip?.id ?? "—",
      trips: String(TRIPS.length),
      catchKg: `${totalKg.toFixed(1)} kg`,
      species: String(new Set(CATCH.map((c) => c.species)).size),
    };
  }, []);

  const recentTraceEvents = useMemo(() => trace.events.slice(0, 4), [trace.events]);
  const lastCrateId = recentTraceEvents[0]?.crateId ?? "";

  return (
    <View className="flex-1 bg-slate-50">
      <ProfileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        user={user}
        lang={lang}
        setLang={setLang}
      />

      <ScrollView contentContainerClassName="px-4 pt-4 pb-6">
        {/* Top row */}
        <View className="mb-3 flex-row items-center justify-between">
          <Pressable
            onPress={() => router.push("/(wild)/scan")}
            className="flex-row items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 active:opacity-80"
          >
            <Ionicons name="qr-code-outline" size={18} color="#0f172a" />
            <Text className="text-sm font-semibold text-slate-900">{t.scan}</Text>
          </Pressable>

          <Pressable
            onPress={() => setDrawerOpen(true)}
            className="flex-row items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 active:opacity-80"
          >
            <View className="h-9 w-9 items-center justify-center rounded-full bg-slate-900">
              <Text className="text-sm font-bold text-white">
                {user.name
                  .split(" ")
                  .slice(0, 2)
                  .map((w) => w[0])
                  .join("")
                  .toUpperCase()}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-sm font-bold text-slate-900">{user.name}</Text>
              <Text className="text-xs text-slate-600">{user.role}</Text>
            </View>
          </Pressable>
        </View>

        {/* Header */}
        <Card className="p-4">
          <Text className="text-lg font-bold text-slate-900">{t.appTitle}</Text>
          <Text className="mt-1 text-sm text-slate-600">{t.appSubtitle}</Text>

          <View className="mt-4 flex-row gap-3">
            <Pressable
              onPress={() =>
                lastCrateId ? router.push(`/(wild)/trace/${lastCrateId}` as const) : router.push("/(wild)/scan")
              }
              className="flex-1 rounded-2xl bg-slate-900 p-3 active:opacity-90"
            >
              <Text className="text-center font-semibold text-white">
                {lastCrateId ? t.continueTrace : t.startTrace}
              </Text>
              <Text className="mt-1 text-center text-[11px] text-white/80">
                {lastCrateId ? `${t.linkedSticker}: ${lastCrateId}` : t.scanEmptySticker}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => router.push("/(wild)/trace/RV-CRATE-0001" as const)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 active:opacity-80"
            >
              <Text className="text-center text-sm font-semibold text-slate-900">{t.demo}</Text>
              <Text className="mt-1 text-center text-[11px] text-slate-500">RV-CRATE-0001</Text>
            </Pressable>
          </View>
        </Card>

        {/* KPIs */}
        <View className="mt-4 flex-row gap-3">
          <Card className="flex-1 p-4">
            <Text className="text-xs text-slate-500">{t.kpiTrips}</Text>
            <Text className="mt-1 text-xl font-bold text-slate-900">{kpis.trips}</Text>
          </Card>
          <Card className="flex-1 p-4">
            <Text className="text-xs text-slate-500">{t.kpiCatchTotal}</Text>
            <Text className="mt-1 text-xl font-bold text-slate-900">{kpis.catchKg}</Text>
          </Card>
        </View>

        <View className="mt-3 flex-row gap-3">
          <Card className="flex-1 p-4">
            <Text className="text-xs text-slate-500">{t.kpiSpecies}</Text>
            <Text className="mt-1 text-xl font-bold text-slate-900">{kpis.species}</Text>
          </Card>
          <Card className="flex-1 p-4">
            <Text className="text-xs text-slate-500">{t.kpiActiveTrip}</Text>
            <Text className="mt-1 text-sm font-bold text-slate-900">{kpis.activeTrip}</Text>
          </Card>
        </View>

        {/* Trips */}
        <View className="mt-5">
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-base font-bold text-slate-900">{t.tripDetails}</Text>
            <Pressable onPress={() => router.push("/(wild)/trips")} className="active:opacity-70">
              <Text className="text-sm font-semibold text-blue-600">{t.viewAll}</Text>
            </Pressable>
          </View>

          <Card className="py-2">
            {TRIPS.map((x, idx) => (
              <View key={x.id} className={`${idx !== 0 ? "border-t border-slate-100" : ""}`}>
                <Row
                  title={x.id}
                  sub={`${x.port} · ${t.vessel}: ${x.vesselId}`}
                  right={<Chip label={x.status} />}
                  onPress={() => router.push(`/(wild)/trips/${x.id}` as const)}
                />
              </View>
            ))}
          </Card>
        </View>

        {/* Catch */}
        <View className="mt-5">
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-base font-bold text-slate-900">{t.catchLogDetails}</Text>
            <Pressable onPress={() => router.push("/(wild)/catch-logs")} className="active:opacity-70">
              <Text className="text-sm font-semibold text-blue-600">{t.viewAll}</Text>
            </Pressable>
          </View>

          <Card className="py-2">
            {CATCH.map((x, idx) => (
              <View key={x.id} className={`${idx !== 0 ? "border-t border-slate-100" : ""}`}>
                <Row
                  title={`${x.species} · ${x.kg.toFixed(1)} kg`}
                  sub={`${t.trip}: ${x.tripId}`}
                  right={<Chip label={x.id} />}
                  onPress={() => router.push(`/(wild)/catch-logs/${x.id}` as const)}
                />
              </View>
            ))}
          </Card>
        </View>
      </ScrollView>

      <WildBottomNav />
    </View>
  );
}
