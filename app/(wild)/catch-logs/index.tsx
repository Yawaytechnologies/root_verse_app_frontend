// app/(wild)/catch-logs/index.tsx
import React, { useMemo, useState } from "react";
import { router } from "expo-router";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

type Lang = "ta" | "en";
type CatchStatus = "DRAFT" | "LOGGED" | "VERIFIED";

type CatchLog = {
  catchId: string;
  tripId: string;
  species: string;
  weightKg: number;
  date: string; // YYYY-MM-DD
  status: CatchStatus;
};

const DUMMY_CATCH: CatchLog[] = [
  {
    catchId: "C250091",
    tripId: "T250057",
    species: "Yellowfin Tuna",
    weightKg: 82.5,
    date: "2025-12-14",
    status: "LOGGED",
  },
  {
    catchId: "C250092",
    tripId: "T250057",
    species: "Seer Fish",
    weightKg: 44.0,
    date: "2025-12-14",
    status: "VERIFIED",
  },
  {
    catchId: "C250088",
    tripId: "T250043",
    species: "Squid",
    weightKg: 25.2,
    date: "2025-12-07",
    status: "DRAFT",
  },
];

const i18n = {
  ta: {
    title: "பிடிப்பு பதிவு",
    sub: "இங்கே பிடிப்பை பதிவு செய்யவும்",
    add: "➕ பிடிப்பு பதிவு செய்",
    search: "தேடு",
    searchPH: "பயணம் / மீன் வகை / பிடிப்பு ஐடி...",
    list: "பட்டியல்",
    no: "பிடிப்பு இல்லை",
    status: { DRAFT: "வரைவு", LOGGED: "பதிவு", VERIFIED: "சரிபார்ப்பு" },
  },
  en: {
    title: "Catch Log",
    sub: "Add your catch easily",
    add: "➕ Add Catch",
    search: "Search",
    searchPH: "Trip / Species / Catch ID...",
    list: "List",
    no: "No catch logs",
    status: { DRAFT: "Draft", LOGGED: "Logged", VERIFIED: "Verified" },
  },
};

const UI = {
  bg: "bg-[#fbf6f1]",
  border: "border-[#ead7c8]",
  muted: "text-[#7a6f66]",
  text: "text-[#2b2b2b]",
  accent: "#a06b2a",
};

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <View className={`rounded-2xl border ${UI.border} bg-white ${className}`}>
      {children}
    </View>
  );
}

function StatusPill({
  text,
  tone,
}: {
  text: string;
  tone: "draft" | "logged" | "verified";
}) {
  const m = {
    draft: "bg-[#eef2f6] text-[#4b5563] border-[#e5e7eb]",
    logged: "bg-[#fff3e7] text-[#7a4a12] border-[#ffd9b6]",
    verified: "bg-[#e7fff2] text-[#137a3a] border-[#c9f4db]",
  };
  return (
    <View className={`rounded-full border px-2.5 py-1 ${m[tone]}`}>
      <Text className="text-[11px] font-semibold">{text}</Text>
    </View>
  );
}

function toneFromStatus(s: CatchStatus) {
  if (s === "VERIFIED") return "verified";
  if (s === "LOGGED") return "logged";
  return "draft";
}

export default function CatchLogsIndex() {
  const [lang, setLang] = useState<Lang>("ta");
  const t = i18n[lang];

  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return DUMMY_CATCH;
    return DUMMY_CATCH.filter((c) => {
      return (
        c.catchId.toLowerCase().includes(term) ||
        c.tripId.toLowerCase().includes(term) ||
        c.species.toLowerCase().includes(term)
      );
    });
  }, [q]);

  return (
    <View className={`flex-1 ${UI.bg}`}>
      <ScrollView contentContainerClassName="p-4 pb-10">
        {/* Header */}
        <Card className="p-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className={`text-lg font-bold ${UI.text}`}>{t.title}</Text>
              <Text className={`mt-1 text-sm ${UI.muted}`}>{t.sub}</Text>
            </View>

            <Pressable
              onPress={() => setLang((x) => (x === "ta" ? "en" : "ta"))}
              className={`rounded-full border ${UI.border} bg-[#fbf6f1] px-3 py-2 active:opacity-80`}
            >
              <Text className={`text-xs font-semibold ${UI.text}`}>
                {lang === "ta" ? "English" : "தமிழ்"}
              </Text>
            </Pressable>
          </View>
        </Card>

        {/* Add Catch */}
        <Pressable
          onPress={() => router.push("/catch-logs/create")}
          className="mt-4 rounded-2xl px-4 py-4 active:opacity-90"
          style={{ backgroundColor: UI.accent }}
        >
          <Text className="text-center text-white text-sm font-extrabold">
            {t.add}
          </Text>
        </Pressable>

        {/* Search */}
        <View className={`mt-4 rounded-2xl border ${UI.border} bg-white px-4 py-3`}>
          <Text className={`text-xs ${UI.muted}`}>{t.search}</Text>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={t.searchPH}
            className={`mt-1 text-base ${UI.text}`}
          />
        </View>

        {/* List */}
        <View className="mt-4">
          <Text className={`mb-2 text-base font-bold ${UI.text}`}>
            {t.list} ({filtered.length})
          </Text>

          <Card className="py-2">
            {filtered.length === 0 ? (
              <View className="px-4 py-6">
                <Text className={`text-sm ${UI.muted}`}>{t.no}</Text>
              </View>
            ) : (
              filtered.map((c, idx) => (
                <View
                  key={c.catchId}
                  className={`${idx !== 0 ? "border-t border-[#f0e3d8]" : ""}`}
                >
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: "/catch-logs/[catchId]",
                        params: { catchId: c.catchId },
                      })
                    }
                    className="px-4 py-4 active:opacity-80"
                  >
                    <View className="flex-row items-center justify-between">
                      <Text className={`text-base font-extrabold ${UI.text}`}>
                        {c.species}
                      </Text>
                      <StatusPill
                        text={t.status[c.status]}
                        tone={toneFromStatus(c.status)}
                      />
                    </View>

                    <Text className={`mt-1 text-sm ${UI.text}`}>
                      {c.weightKg.toFixed(1)} kg
                    </Text>

                    <Text className={`mt-1 text-xs ${UI.muted}`}>
                      Trip: {c.tripId} · Date: {c.date} · ID: {c.catchId}
                    </Text>
                  </Pressable>
                </View>
              ))
            )}
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}
