import React, { useEffect, useMemo, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";

// ✅ Redux
import { useAppDispatch, useAppSelector } from "../../../src/store/hooks";
import { submitCatchLog } from "../../../src/services/wild/catchLog.slice";

/* ---------------- TYPES ---------------- */
type TripItem = { tripId: string; port: string; vesselId: string };
type Lang = "ta" | "en";

type FishType = {
  id: number;
  fish_name: string;
  created_at?: string;
  updated_at?: string;
};

type PickerItem = { key: string; label: string };
type FishOption = { key: string; label: string; id: number };

/* ---------------- DUMMY TRIPS ---------------- */
const DUMMY_TRIPS: TripItem[] = [
  { tripId: "T250057", port: "Nagapattinam", vesselId: "RV-VES-NA026829" },
  { tripId: "T250043", port: "Chennai", vesselId: "RV-VES-NA026829" },
  { tripId: "T250021", port: "Thoothukudi", vesselId: "RV-VES-NA026829" },
];

/* ---------------- i18n ---------------- */
const i18n = {
  ta: {
    title: "பிடிப்பு பதிவு",
    sub: "QR ஸ்கேன் செய்து பதிவு செய்யவும் ✅",
    step: (n: number) => `படி ${n}/3`,
    next: "அடுத்து",
    back: "மீண்டும்",
    save: "சேமி",
    required: "அவசியம்",
    optional: "விருப்பம்",
    addPhoto: "📷 படம் சேர்க்க",
    remove: "நீக்கு",
    langBtn: "English",

    trip: "பயணம் (Trip)",
    chooseTrip: "பயணத்தை தேர்வு செய்",
    species: "மீன் வகை",
    chooseSpecies: "மீன் வகை தேர்வு செய்",
    weight: "எடை (kg)",
    weightPH: "உதா: 120",
    date: "தேதி",
    time: "நேரம்",
    pickDate: "தேதி தேர்வு செய்ய தட்டுங்கள் 📅",
    pickTime: "நேரம் தேர்வு செய்ய தட்டுங்கள் ⏱️",

    errTrip: "பயணத்தை தேர்வு செய்யவும்",
    errSpecies: "மீன் வகையை தேர்வு செய்யவும்",
    errWeight: "எடை போடவும்",
    errDate: "தேதி தேர்வு செய்யவும்",
    saved: "சேமிக்கப்பட்டது ✅",
    posting: "பதிவேற்றுகிறது...",

    fishLoading: "மீன் வகைகள் ஏற்றுகிறது...",
    fishFailed: "மீன் வகைகள் பெற முடியவில்லை",
  },
  en: {
    title: "Catch Log",
    sub: "Create catch linked to scanned QR ✅",
    step: (n: number) => `Step ${n}/3`,
    next: "Next",
    back: "Back",
    save: "Save",
    required: "Required",
    optional: "Optional",
    addPhoto: "📷 Add Photos",
    remove: "Remove",
    langBtn: "தமிழ்",

    trip: "Trip",
    chooseTrip: "Choose trip",
    species: "Species",
    chooseSpecies: "Choose species",
    weight: "Weight (kg)",
    weightPH: "ex: 120",
    date: "Date",
    time: "Time",
    pickDate: "Tap to pick date 📅",
    pickTime: "Tap to pick time ⏱️",

    errTrip: "Please choose trip",
    errSpecies: "Please choose species",
    errWeight: "Please enter weight",
    errDate: "Please choose date",
    saved: "Saved ✅",
    posting: "Posting...",

    fishLoading: "Loading fish types...",
    fishFailed: "Failed to load fish types",
  },
};

const UI = {
  bg: "bg-[#fbf6f1]",
  border: "border-[#ead7c8]",
  muted: "text-[#7a6f66]",
  text: "text-[#2b2b2b]",
  chipBg: "bg-[#fff3e7]",
  chipBorder: "border-[#ffd9b6]",
  accent: "#a06b2a",
};

/* ---------------- HELPERS ---------------- */
const toNum = (v: string) => {
  const n = Number(String(v).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const fmtDate = (d?: Date | null) => {
  if (!d) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const fmtTime = (d?: Date | null) => {
  if (!d) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}:00`;
};

const fishNameOf = (f: FishType) => String(f.fish_name || "").trim();

/* ---------------- UI COMPONENTS ---------------- */
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

function FieldCard({ children }: { children: React.ReactNode }) {
  return (
    <View className={`rounded-2xl border ${UI.border} bg-white px-4 py-3`}>
      {children}
    </View>
  );
}

function SelectField({
  label,
  value,
  placeholder,
  hint,
  onPress,
}: {
  label: string;
  value: string;
  placeholder: string;
  hint: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="active:opacity-80">
      <Text className={`text-xs ${UI.muted}`}>{label}</Text>
      <Text className={`mt-1 text-base ${value ? UI.text : "text-[#b1a59a]"}`}>
        {value || placeholder}
      </Text>
      <Text className="mt-1 text-[11px] text-[#b1a59a]">{hint}</Text>
    </Pressable>
  );
}

function DateField({
  label,
  value,
  placeholder,
  hint,
  onPress,
}: {
  label: string;
  value: string;
  placeholder: string;
  hint: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="active:opacity-80">
      <Text className={`text-xs ${UI.muted}`}>{label}</Text>
      <Text className={`mt-1 text-base ${value ? UI.text : "text-[#b1a59a]"}`}>
        {value || placeholder}
      </Text>
      <Text className="mt-1 text-[11px] text-[#b1a59a]">{hint}</Text>
    </Pressable>
  );
}

function PickerModal({
  open,
  title,
  value,
  mode,
  onClose,
  onPick,
}: {
  open: boolean;
  title: string;
  value: Date;
  mode: "date" | "time";
  onClose: () => void;
  onPick: (d: Date) => void;
}) {
  if (!open) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 bg-black/50 justify-end">
        <Pressable onPress={() => {}} className="rounded-t-3xl bg-white p-4">
          <View className="flex-row items-center justify-between">
            <Text className={`text-base font-bold ${UI.text}`}>{title}</Text>
            <Pressable onPress={onClose} className="px-3 py-2 active:opacity-70">
              <Text style={{ color: UI.accent }} className="text-sm font-semibold">
                Done
              </Text>
            </Pressable>
          </View>

          <View className="mt-3">
            <DateTimePicker
              value={value}
              mode={mode}
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={(event, date) => {
                if (Platform.OS !== "ios") {
                  if ((event as any).type === "dismissed") return onClose();
                  if (date) onPick(date);
                  return onClose();
                }
                if (date) onPick(date);
              }}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function PickerSheetObj<T extends PickerItem>({
  title,
  valueKey,
  options,
  onSelect,
  sheetRef,
  searchPlaceholder = "Search...",
}: {
  title: string;
  valueKey: string;
  options: T[];
  onSelect: (item: T) => void;
  sheetRef: React.RefObject<BottomSheetModal | null>;
  searchPlaceholder?: string;
}) {
  const snapPoints = useMemo(() => ["45%", "75%"], []);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return options;
    return options.filter((x) => x.label.toLowerCase().includes(t));
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
          <Text className={`text-base font-bold ${UI.text}`}>{title}</Text>
          <Pressable
            onPress={() => sheetRef.current?.dismiss()}
            className="rounded-full px-3 py-2 active:opacity-80"
          >
            <Text style={{ color: UI.accent }} className="text-sm font-semibold">
              Done
            </Text>
          </Pressable>
        </View>

        <View className={`mt-3 rounded-2xl border ${UI.border} bg-[#fbf6f1] px-3 py-2`}>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={searchPlaceholder}
            className={`text-base ${UI.text}`}
          />
        </View>

        <ScrollView className="mt-3" keyboardShouldPersistTaps="handled">
          {filtered.map((item) => {
            const active = item.key === valueKey;
            return (
              <Pressable
                key={item.key}
                onPress={() => {
                  onSelect(item);
                  sheetRef.current?.dismiss();
                }}
                className={`mb-2 rounded-2xl border px-4 py-3 active:opacity-80 ${
                  active ? `bg-[#fff3e7] border-[#ffd9b6]` : `${UI.border} bg-white`
                }`}
              >
                <Text className={`text-sm font-semibold ${UI.text}`}>{item.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

/* ---------------- MAIN SCREEN ---------------- */
export default function CreateCatchLog() {
  const { crateId } = useLocalSearchParams<{ crateId: string }>();
  const finalCrateId = String(crateId || "").trim();

  const dispatch = useAppDispatch();
  const catchState = useAppSelector((s: any) => s.catchLog);
  const posting = !!catchState?.loading;

  const [lang, setLang] = useState<Lang>("ta");
  const t = i18n[lang];

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Trips
  const [tripOptions] = useState<TripItem[]>(DUMMY_TRIPS);

  // Fish types
  const [fishTypes, setFishTypes] = useState<FishType[]>([]);
  const [fishLoading, setFishLoading] = useState(false);
  const [fishError, setFishError] = useState<string | null>(null);

  // Required
  const [tripId, setTripId] = useState("");

  // ✅ select by ID, show name
  const [fishId, setFishId] = useState<number | null>(null);
  const [fishName, setFishName] = useState("");

  const [weightKg, setWeightKg] = useState("");
  const [catchDate, setCatchDate] = useState<Date | null>(null);
  const [catchTime, setCatchTime] = useState<Date | null>(new Date());

  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);

  const [images, setImages] = useState<string[]>([]);

  const tripRef = useRef<BottomSheetModal>(null);
  const fishRef = useRef<BottomSheetModal>(null);

  const shownDate = fmtDate(catchDate);
  const shownTime = fmtTime(catchTime);

  // Fetch fish types
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setFishLoading(true);
        setFishError(null);

        const res = await fetch("https://rootverse-backend.onrender.com/api/fish-types");
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`${res.status} ${txt || "Fish types request failed"}`);
        }

        const json = await res.json();
        const list: FishType[] = Array.isArray(json)
          ? json
          : Array.isArray(json?.data)
          ? json.data
          : [];

        if (alive) setFishTypes(list);
      } catch (e: any) {
        if (alive) setFishError(e?.message || t.fishFailed);
      } finally {
        if (alive) setFishLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [t.fishFailed]);

  useEffect(() => {
    if (!finalCrateId) {
      Alert.alert("Missing QR", "No crateId provided. Please scan again.");
      router.replace("/catch-logs");
    }
  }, [finalCrateId]);

  const fishPickerOptions: FishOption[] = useMemo(() => {
    return fishTypes
      .filter((f) => f?.id && fishNameOf(f))
      .map((f) => ({
        key: String(f.id),
        label: fishNameOf(f),
        id: f.id,
      }));
  }, [fishTypes]);

  const pickImages = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      return Alert.alert("Permission", "Allow photo access to upload images.");
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      selectionLimit: 6,
    });

    if (result.canceled) return;

    const uris = result.assets.map((a) => a.uri);
    setImages((prev) => [...prev, ...uris].slice(0, 10));
  };

  const removeImage = (uri: string) => setImages((prev) => prev.filter((u) => u !== uri));

  const validateStep = () => {
    if (step === 1) {
      if (!tripId) return Alert.alert(t.required, t.errTrip), false;
      if (!fishId) return Alert.alert(t.required, t.errSpecies), false;
      return true;
    }
    if (step === 2) {
      if (!weightKg.trim()) return Alert.alert(t.required, t.errWeight), false;
      if (!catchDate) return Alert.alert(t.required, t.errDate), false;
      return true;
    }
    return true;
  };

  const next = () => {
    if (!validateStep()) return;
    setStep((s) => (s === 1 ? 2 : 3));
  };

  const back = () => setStep((s) => (s === 3 ? 2 : 1));

  const save = async () => {
    if (!finalCrateId) return Alert.alert("Missing QR", "crateId not found.");
    if (!tripId) return Alert.alert(t.required, t.errTrip);
    if (!fishId) return Alert.alert(t.required, t.errSpecies);
    if (!weightKg.trim()) return Alert.alert(t.required, t.errWeight);
    if (!catchDate) return Alert.alert(t.required, t.errDate);

    // dummy
    const DEFAULT_RV_VESSEL_ID = 2;
    const DEFAULT_OWNER_ID = 9;

    try {
      console.log("SENDING fishId:", fishId, "fishName:", fishName);

      const result = await dispatch(
        submitCatchLog({
          linkedCrateId: finalCrateId,
          tripId,
          fishId: fishId, // ✅ ID only
          rvVesselId: DEFAULT_RV_VESSEL_ID,
          ownerId: DEFAULT_OWNER_ID,
          weightKg: toNum(weightKg),
          catchDate: fmtDate(catchDate),
          catchTime: fmtTime(catchTime),
          images,
        } as any)
      ).unwrap();

    const catchId = result?.id || result?.catchId || "Success";
      Alert.alert(t.saved, `Catch ID: ${catchId}`);

      router.replace({
        pathname: "/catch-logs/details",
        params: { crateId: finalCrateId },
      });
    } catch (e: any) {
      Alert.alert("Error", String(e?.message || e));
    }
  };

  return (
    <View className={`flex-1 ${UI.bg}`}>
      {/* Native pickers */}
      <PickerModal
        open={showDate && Platform.OS !== "web"}
        title={t.date}
        value={catchDate ?? new Date()}
        mode="date"
        onClose={() => setShowDate(false)}
        onPick={(d) => setCatchDate(d)}
      />
      <PickerModal
        open={showTime && Platform.OS !== "web"}
        title={t.time}
        value={catchTime ?? new Date()}
        mode="time"
        onClose={() => setShowTime(false)}
        onPick={(d) => setCatchTime(d)}
      />

      {/* Trip sheet (simple) */}
      <BottomSheetModal
        ref={tripRef}
        snapPoints={["45%", "75%"]}
        enablePanDownToClose
        backgroundStyle={{ borderRadius: 24 }}
        handleIndicatorStyle={{ opacity: 0.35 }}
      >
        <BottomSheetView style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
          <View className="flex-row items-center justify-between">
            <Text className={`text-base font-bold ${UI.text}`}>{t.chooseTrip}</Text>
            <Pressable
              onPress={() => tripRef.current?.dismiss()}
              className="rounded-full px-3 py-2 active:opacity-80"
            >
              <Text style={{ color: UI.accent }} className="text-sm font-semibold">
                Done
              </Text>
            </Pressable>
          </View>

          <ScrollView className="mt-3" keyboardShouldPersistTaps="handled">
            {tripOptions.map((x) => {
              const active = x.tripId === tripId;
              return (
                <Pressable
                  key={x.tripId}
                  onPress={() => {
                    setTripId(x.tripId);
                    tripRef.current?.dismiss();
                  }}
                  className={`mb-2 rounded-2xl border px-4 py-3 active:opacity-80 ${
                    active ? `bg-[#fff3e7] border-[#ffd9b6]` : `${UI.border} bg-white`
                  }`}
                >
                  <Text className={`text-sm font-semibold ${UI.text}`}>{x.tripId}</Text>
                  <Text className={`mt-1 text-xs ${UI.muted}`}>{x.port}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </BottomSheetView>
      </BottomSheetModal>

      {/* ✅ Fish picker: select by id, show name */}
      <PickerSheetObj<FishOption>
        title={t.chooseSpecies}
        valueKey={fishId ? String(fishId) : ""}
        options={fishPickerOptions}
        onSelect={(item) => {
          setFishId(item.id);       // ✅ store id
          setFishName(item.label);  // ✅ show name
        }}
        sheetRef={fishRef}
        searchPlaceholder="Search fish..."
      />

      <ScrollView contentContainerClassName="p-4 pb-10">
        {/* Header */}
        <Card className="p-4">
          <View className="flex-row items-start justify-between">
            <View>
              <Text className={`text-lg font-bold ${UI.text}`}>{t.title}</Text>
              <Text className={`mt-1 text-sm ${UI.muted}`}>{t.sub}</Text>
            </View>

            <Pressable
              onPress={() => setLang((x) => (x === "ta" ? "en" : "ta"))}
              className={`rounded-full border ${UI.border} bg-[#fbf6f1] px-3 py-2 active:opacity-80`}
            >
              <Text className={`text-xs font-semibold ${UI.text}`}>{t.langBtn}</Text>
            </Pressable>
          </View>

          <View className="mt-3">
            <Text className={`text-xs ${UI.muted}`}>QR Code</Text>
            <Text className={`mt-1 text-base font-extrabold ${UI.text}`}>{finalCrateId}</Text>
          </View>

          <View className={`mt-3 rounded-xl border ${UI.chipBorder} ${UI.chipBg} px-3 py-2`}>
            <Text className={`text-xs font-semibold ${UI.text}`}>{t.step(step)}</Text>
          </View>

          {fishLoading ? (
            <View className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2">
              <Text className="text-xs font-semibold text-blue-800">{t.fishLoading}</Text>
            </View>
          ) : fishError ? (
            <View className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
              <Text className="text-xs font-semibold text-rose-800">
                {t.fishFailed}: {fishError}
              </Text>
            </View>
          ) : null}
        </Card>

        {/* STEP 1 */}
        {step === 1 ? (
          <View className="mt-4 gap-3">
            <FieldCard>
              <SelectField
                label={`✅ ${t.trip} (${t.required})`}
                value={tripId}
                placeholder={t.chooseTrip}
                hint="Tap ▾"
                onPress={() => tripRef.current?.present()}
              />
            </FieldCard>

            <FieldCard>
              <SelectField
                label={`✅ ${t.species} (${t.required})`}
                value={fishName}
                placeholder={t.chooseSpecies}
                hint={fishLoading ? t.fishLoading : "Tap ▾"}
                onPress={() => {
                  // ✅ opens sheet only
                  if (!fishLoading) fishRef.current?.present();
                }}
              />
            </FieldCard>

            <Pressable
              onPress={next}
              className="mt-2 rounded-2xl px-4 py-4 active:opacity-90"
              style={{ backgroundColor: UI.accent, opacity: fishLoading ? 0.7 : 1 }}
              disabled={fishLoading}
            >
              <Text className="text-center text-white text-base font-extrabold">{t.next}</Text>
            </Pressable>
          </View>
        ) : null}

        {/* STEP 2 */}
        {step === 2 ? (
          <View className="mt-4 gap-3">
            <FieldCard>
              <Text className={`text-xs ${UI.muted}`}>{`✅ ${t.weight} (${t.required})`}</Text>
              <TextInput
                value={weightKg}
                onChangeText={setWeightKg}
                keyboardType="numeric"
                placeholder={t.weightPH}
                className={`mt-1 text-base ${UI.text}`}
              />
            </FieldCard>

            <FieldCard>
              <DateField
                label={`✅ ${t.date} (${t.required})`}
                value={shownDate}
                placeholder="YYYY-MM-DD"
                hint={t.pickDate}
                onPress={() => setShowDate(true)}
              />
            </FieldCard>

            <FieldCard>
              <DateField
                label={`${t.time} (${t.optional})`}
                value={shownTime}
                placeholder="HH:MM:SS"
                hint={t.pickTime}
                onPress={() => setShowTime(true)}
              />
            </FieldCard>

            <View className="mt-2 flex-row gap-3">
              <Pressable
                className={`flex-1 rounded-2xl border ${UI.border} bg-white px-4 py-4 active:opacity-80`}
                onPress={back}
              >
                <Text className={`text-center ${UI.text} text-base font-extrabold`}>{t.back}</Text>
              </Pressable>

              <Pressable
                className="flex-1 rounded-2xl px-4 py-4 active:opacity-90"
                style={{ backgroundColor: UI.accent }}
                onPress={next}
              >
                <Text className="text-center text-white text-base font-extrabold">{t.next}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* STEP 3 */}
        {step === 3 ? (
          <View className="mt-4">
            <Card className="p-4">
              <View className="flex-row items-center gap-2">
                <Ionicons name="camera-outline" size={20} color={UI.accent} />
                <Text className={`text-sm font-extrabold ${UI.text}`}>{t.addPhoto}</Text>
              </View>

              <Pressable
                onPress={pickImages}
                className="mt-3 rounded-2xl border px-4 py-3 active:opacity-90"
                style={{ borderColor: UI.accent, backgroundColor: "#fff3e7" }}
              >
                <Text className="text-center font-semibold" style={{ color: UI.accent }}>
                  {t.addPhoto}
                </Text>
              </Pressable>

              {images.length > 0 ? (
                <View className="mt-3 gap-2">
                  {images.map((uri, idx) => (
                    <View
                      key={uri}
                      className={`flex-row items-center justify-between rounded-xl border ${UI.border} bg-[#fbf6f1] px-3 py-2`}
                    >
                      <Text className={`flex-1 text-xs ${UI.text}`} numberOfLines={1}>
                        Photo {idx + 1}
                      </Text>
                      <Pressable
                        onPress={() => removeImage(uri)}
                        className="ml-3 rounded-full bg-rose-100 px-3 py-1 active:opacity-80"
                      >
                        <Text className="text-xs font-semibold text-rose-700">{t.remove}</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : null}
            </Card>

            <View className="mt-5 flex-row gap-3">
              <Pressable
                className={`flex-1 rounded-2xl border ${UI.border} bg-white px-4 py-4 active:opacity-80`}
                onPress={back}
                disabled={posting}
              >
                <Text className={`text-center ${UI.text} text-base font-extrabold`}>{t.back}</Text>
              </Pressable>

              <Pressable
                className="flex-1 rounded-2xl px-4 py-4 active:opacity-90"
                style={{ backgroundColor: UI.accent, opacity: posting ? 0.7 : 1 }}
                onPress={save}
                disabled={posting}
              >
                <Text className="text-center text-white text-base font-extrabold">
                  {posting ? (lang === "ta" ? "சேமிக்கிறது..." : "Saving...") : t.save}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
