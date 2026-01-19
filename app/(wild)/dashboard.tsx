// app/(wild)/index.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { router } from "expo-router";
import { AppState, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Speech from "expo-speech";
import * as Haptics from "expo-haptics";
import { useTrace } from "../../src/data/wild/trace.store";

type Lang = "ta" | "en";

const i18n = {
  en: {
    title: "Wild Fisher",
    online: "Online",
    offline: "Offline",
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

    scanDetails: "Scan & View Details",
    scanDetailsSub: "Scan QR to view owner, vessel, trip & catch",
    scanDetailsVoice: "Tap Scan and View Details",

    trips: "My Trips",
    tripsSub: "View your trips list",
    tripsVoice: "Tap My Trips",

    langBtnTa: "தமிழ்",
    langBtnEn: "English",
  },
  ta: {
    title: "Wild Fisher",
    online: "ஆன்லைன்",
    offline: "ஆஃப்லைன்",
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

    scanDetails: "ஸ்கேன் & விவரங்கள்",
    scanDetailsSub: "QR ஸ்கேன் செய்து உரிமையாளர்/கப்பல்/பயணம்/பிடிப்பு பார்க்கவும்",
    scanDetailsVoice: "ஸ்கேன் மற்றும் விவரங்கள் என்று தட்டுங்கள்",

    trips: "என் பயணங்கள்",
    tripsSub: "பயண பட்டியலை பார்க்கவும்",
    tripsVoice: "என் பயணங்கள் என்று தட்டுங்கள்",

    langBtnTa: "தமிழ்",
    langBtnEn: "English",
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

/** ✅ Video-like palette (cool grey + blue) */
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

function StatusChip({ online, label }: { online: boolean; label: string }) {
  return (
    <View className="flex-row items-center gap-2">
      <Ionicons name="wifi" size={16} color={online ? UI.green : UI.muted} />
      <Text className="text-xs font-semibold" style={{ color: online ? UI.green : UI.muted }}>
        {label}
      </Text>
    </View>
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
  user: { ownerId: string; phone: string; email: string; address: string };
  lang: Lang;
}) {
  const t = i18n[lang];

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 bg-black/40">
        <Pressable onPress={() => {}} className="absolute left-0 top-0 h-full w-[86%] bg-white">
          <ScrollView contentContainerClassName="px-4 pt-6 pb-10">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-bold" style={{ color: UI.text }}>
                {t.myDetails}
              </Text>
              <Pressable onPress={onClose} className="rounded-full p-2 active:opacity-70">
                <Ionicons name="close" size={22} color={UI.text} />
              </Pressable>
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
                    <Text className="text-xs" style={{ color: UI.muted }}>
                      {x.k}
                    </Text>
                    <Text className="mt-1 text-sm" style={{ color: UI.text, fontWeight: "600" }}>
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
              <Text className="text-center text-white font-semibold">{t.close}</Text>
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
    <Pressable
      onPressIn={onPressIn}
      onLongPress={onLongPress}
      delayLongPress={350}
      onPress={onTap}
      className="active:opacity-85"
    >
      <Card>
        {/* ✅ FIX: no justify-between; give text flex-1 so subtitle never overflows */}
        <View className="px-4 py-4 flex-row items-center">
          <View
            className="h-11 w-11 rounded-xl items-center justify-center"
            style={{ backgroundColor: UI.blueSoft }}
          >
            <Ionicons name={icon} size={22} color={UI.blue} />
          </View>

          <View className="ml-3 flex-1">
            <Text
              className="text-sm font-bold"
              style={{ color: UI.text }}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {title}
            </Text>

            <Text
              className="mt-0.5 text-xs"
              style={{ color: UI.muted }}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {subtitle}
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={20} color={UI.muted} />
        </View>
      </Card>
    </Pressable>
  );
}

export default function WildDashboard() {
  const insets = useSafeAreaInsets();
  const trace = useTrace();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lang, setLang] = useState<Lang>("ta");
  const t = i18n[lang];

  // demo network state (replace later)
  const [online] = useState(true);

  const lastCrateId = useMemo(() => trace.events?.[0]?.crateId ?? "", [trace.events]);

  const user = {
    name: "Gowtham Sakthivel",
    role: "Vessel Owner",
    ownerId: "NA026829",
    phone: "6374484558",
    email: "sgowtham2k1@gmail.com",
    address:
      "1/198 Main Road Kuthalam, Gopurajapuram (Post), Kuthalam - 609703, Nagapattinam",
  };

  // Speak once on first open
  const greeted = useRef(false);
  useEffect(() => {
    if (greeted.current) return;
    greeted.current = true;

    const id = setTimeout(() => {
      if (AppState.currentState !== "active") return;
      speak(
        lang === "ta"
          ? "புதிய பயணம். புதிய பிடிப்பு பதிவு. ஸ்கேன் மற்றும் விவரங்கள். என் பயணங்கள்."
          : "New Trip. New Catch Log. Scan and View Details. My Trips.",
        lang
      );
    }, 650);

    return () => clearTimeout(id);
  }, [lang]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: UI.bg }} edges={["top", "left", "right"]}>
      <ProfileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        user={{
          ownerId: user.ownerId,
          phone: user.phone,
          email: user.email,
          address: user.address,
        }}
        lang={lang}
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        contentContainerClassName="px-4 pb-6"
      >
        {/* ✅ Top header */}
        <View className="pt-3 flex-row items-center justify-between">
          <Text className="text-base font-bold" style={{ color: UI.text }}>
            {t.title}
          </Text>
          <StatusChip online={online} label={online ? t.online : t.offline} />
        </View>

        {/* Profile card */}
        <Card className="mt-4">
          <Pressable onPress={() => setDrawerOpen(true)} className="px-4 py-4 active:opacity-80">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View
                  className="h-12 w-12 rounded-full items-center justify-center"
                  style={{ backgroundColor: UI.blue }}
                >
                  <Text className="text-white font-extrabold">
                    {user.name
                      .split(" ")
                      .slice(0, 2)
                      .map((w) => w[0])
                      .join("")
                      .toUpperCase()}
                  </Text>
                </View>

                <View>
                  <Text className="text-sm font-bold" style={{ color: UI.text }}>
                    {user.name}
                  </Text>
                  <Text className="text-xs" style={{ color: UI.muted }}>
                    {user.role} · {user.ownerId}
                  </Text>
                </View>
              </View>

              <Ionicons name="chevron-forward" size={20} color={UI.muted} />
            </View>

            <View className="mt-3 rounded-xl px-3 py-2" style={{ backgroundColor: UI.blueSoft }}>
              <Text className="text-xs font-semibold" style={{ color: UI.blue }}>
                {t.hint}
              </Text>
            </View>

            {!!lastCrateId && (
              <View
                className="mt-2 rounded-xl px-3 py-2 border"
                style={{ backgroundColor: UI.greenSoft, borderColor: "#bfe8cd" }}
              >
                <Text className="text-xs" style={{ color: UI.text }}>
                  Last Sticker:{" "}
                  <Text style={{ fontWeight: "800" }}>{String(lastCrateId)}</Text>
                </Text>
              </View>
            )}
          </Pressable>
        </Card>

        {/* ✅ Language toggle (keep this one) */}
        <View className="mt-3 flex-row justify-end">
          <Pressable
            onPress={async () => {
              await haptic();
              setLang((x) => (x === "ta" ? "en" : "ta"));
            }}
            className="rounded-full border bg-white px-3 py-2 active:opacity-80"
            style={{ borderColor: UI.border }}
          >
            <Text className="text-xs font-semibold" style={{ color: UI.text }}>
              {lang === "ta" ? i18n.ta.langBtnEn : i18n.en.langBtnTa}
            </Text>
          </Pressable>
        </View>

        {/* Actions list */}
        <View className="mt-5">
          <Text className="mb-2 text-sm font-bold" style={{ color: UI.text }}>
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
          <Text className="text-center text-white font-semibold">
            {lang === "ta" ? "புதிய பயணம் தொடங்கு" : "Start New Trip"}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
