import React, { useMemo, useRef, useState } from "react";
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
import { useTrace } from "../../../src/data/wild/trace.store";

/** ---------------- Dummy reference tables (replace with API later) ---------------- */
const SPECIES = ["Yellowfin Tuna", "Red Snapper", "Squid", "White Pomfret", "Seer Fish"];
const METHODS = ["Hook & Line", "Longline", "Gillnet", "Trawling", "Pole & Line"];
const FAO_ZONES = ["51", "57", "61", "71", "87"];
const TRIPS = [
  { tripId: "T250057", port: "Nagapattinam", vesselId: "RV-VES-NA026829" },
  { tripId: "T250043", port: "Chennai", vesselId: "RV-VES-NA026829" },
  { tripId: "T250021", port: "Thoothukudi", vesselId: "RV-VES-NA026829" },
];

/** ---------------- Helpers ---------------- */
const genCatchId = () => {
  const yy = String(new Date().getFullYear()).slice(-2);
  const rnd = Math.floor(10000 + Math.random() * 90000);
  return `C${yy}${rnd}`;
};

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
  return `${hh}:${mm}`;
};

const parseYMD = (s: string): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return dt;
};

/** ---------------- UI bits ---------------- */
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <View className={`rounded-2xl border border-slate-200 bg-white ${className}`}>{children}</View>;
}

function FieldCard({ children }: { children: React.ReactNode }) {
  return <View className="rounded-2xl border border-slate-200 bg-white px-4 py-3">{children}</View>;
}

function SelectField({
  label,
  value,
  placeholder,
  onPress,
}: {
  label: string;
  value: string;
  placeholder: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="active:opacity-80">
      <Text className="text-xs text-slate-500">{label}</Text>
      <Text className={`mt-1 text-base ${value ? "text-slate-900" : "text-slate-400"}`}>
        {value || placeholder}
      </Text>
      <Text className="mt-1 text-[11px] text-slate-400">Tap to choose ▾</Text>
    </Pressable>
  );
}

function DateField({
  label,
  value,
  placeholder,
  onPress,
  hint,
}: {
  label: string;
  value: string;
  placeholder: string;
  onPress: () => void;
  hint: string;
}) {
  return (
    <Pressable onPress={onPress} className="active:opacity-80">
      <Text className="text-xs text-slate-500">{label}</Text>
      <Text className={`mt-1 text-base ${value ? "text-slate-900" : "text-slate-400"}`}>
        {value || placeholder}
      </Text>
      <Text className="mt-1 text-[11px] text-slate-400">{hint}</Text>
    </Pressable>
  );
}

/** Web fallback modal for date (because DateTimePicker in web is inconsistent) */
function WebDateModal({
  open,
  title,
  value,
  onClose,
  onSave,
}: {
  open: boolean;
  title: string;
  value: string;
  onClose: () => void;
  onSave: (v: string) => void;
}) {
  const [v, setV] = useState(value);
  if (!open) return null;

  return (
    <View className="absolute inset-0 items-center justify-center bg-black/50 px-6">
      <View className="w-full rounded-2xl border border-slate-200 bg-white p-4">
        <Text className="text-base font-bold text-slate-900">{title}</Text>
        <Text className="mt-1 text-xs text-slate-500">Format: YYYY-MM-DD</Text>

        <View className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
          <TextInput value={v} onChangeText={setV} placeholder="2025-12-20" className="text-base text-slate-900" />
        </View>

        <View className="mt-4 flex-row gap-3">
          <Pressable onPress={onClose} className="flex-1 rounded-2xl border border-slate-200 p-3 active:opacity-80">
            <Text className="text-center font-semibold text-slate-700">Cancel</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              onSave(v);
              onClose();
            }}
            className="flex-1 rounded-2xl bg-slate-900 p-3 active:opacity-90"
          >
            <Text className="text-center font-semibold text-white">Save</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/** ✅ Native date/time picker overlay (fix behind-form issue) */
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
            <Text className="text-base font-bold text-slate-900">{title}</Text>
            <Pressable onPress={onClose} className="px-3 py-2 active:opacity-70">
              <Text className="text-sm font-semibold text-blue-600">Done</Text>
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

/** ---------------- Bottom Sheet Picker ---------------- */
function PickerSheet({
  title,
  value,
  options,
  onSelect,
  sheetRef,
  renderOption,
}: {
  title: string;
  value: string;
  options: string[];
  onSelect: (v: string) => void;
  sheetRef: React.RefObject<BottomSheetModal>;
  renderOption?: (item: string) => { title: string; sub?: string };
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
          <Text className="text-base font-bold text-slate-900">{title}</Text>
          <Pressable onPress={() => sheetRef.current?.dismiss()} className="rounded-full px-3 py-2 active:opacity-80">
            <Text className="text-sm font-semibold text-blue-600">Done</Text>
          </Pressable>
        </View>

        <View className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
          <TextInput value={q} onChangeText={setQ} placeholder="Search..." className="text-base text-slate-900" />
        </View>

        <ScrollView className="mt-3" keyboardShouldPersistTaps="handled">
          {filtered.map((item) => {
            const active = item === value;
            const display = renderOption ? renderOption(item) : { title: item };
            return (
              <Pressable
                key={item}
                onPress={() => {
                  onSelect(item);
                  sheetRef.current?.dismiss();
                }}
                className={`mb-2 rounded-2xl border px-4 py-3 active:opacity-80 ${
                  active ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white"
                }`}
              >
                <Text className={`text-sm font-semibold ${active ? "text-blue-700" : "text-slate-900"}`}>
                  {display.title}
                </Text>
                {display.sub ? <Text className="mt-0.5 text-xs text-slate-500">{display.sub}</Text> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

/** ---------------- Screen ---------------- */
export default function CreateCatchLog() {
  const { crateId } = useLocalSearchParams<{ crateId?: string }>();
  const trace = useTrace();

  // IDs
  const [catchId] = useState(genCatchId());

  // Select fields
  const [tripId, setTripId] = useState("");
  const [species, setSpecies] = useState("");
  const [method, setMethod] = useState("");
  const [faoZone, setFaoZone] = useState("");

  // Numeric/text fields
  const [weightKg, setWeightKg] = useState("");
  const [haulSetNo, setHaulSetNo] = useState("");
  const [gearType, setGearType] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [notes, setNotes] = useState("");

  // Date/Time
  const [catchDate, setCatchDate] = useState<Date | null>(null);
  const [catchTime, setCatchTime] = useState<Date | null>(new Date());
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);

  // Web date fallback
  const [webDateOpen, setWebDateOpen] = useState(false);
  const [webDateStr, setWebDateStr] = useState("");

  // Images
  const [images, setImages] = useState<string[]>([]);

  // Bottom sheet refs
  const tripRef = useRef<BottomSheetModal>(null);
  const speciesRef = useRef<BottomSheetModal>(null);
  const methodRef = useRef<BottomSheetModal>(null);
  const faoRef = useRef<BottomSheetModal>(null);

  const shownDate = Platform.OS === "web" ? webDateStr : fmtDate(catchDate);
  const shownTime = fmtTime(catchTime);

  const pickImages = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert("Permission needed", "Allow photo access to upload images.");

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

  const save = () => {
    if (!tripId) return Alert.alert("Missing", "Trip ID is required");
    if (!species) return Alert.alert("Missing", "Species is required");
    if (!method) return Alert.alert("Missing", "Fishing method is required");
    if (!weightKg.trim()) return Alert.alert("Missing", "Weight is required");

    // date validate
    if (Platform.OS === "web") {
      const dt = parseYMD(webDateStr);
      if (!dt) return Alert.alert("Missing", "Catch date required (YYYY-MM-DD)");
    } else {
      if (!catchDate) return Alert.alert("Missing", "Catch date required");
    }

    const payload = {
      catchId,
      tripId,
      species,
      method,
      weightKg: toNum(weightKg),
      faoZone: faoZone || "—",
      catchDate: shownDate,
      catchTime: shownTime || "—",
      haulSetNo: haulSetNo || "—",
      gearType: gearType || "—",
      latitude: latitude || "—",
      longitude: longitude || "—",
      notes: notes || "—",
      images,
    };

    // ✅ QR-Trace mode
    if (crateId) {
      trace.addEvent({
        crateId: String(crateId),
        stage: "CATCH",
        data: payload,
        createdBy: "Owner",
      });

      Alert.alert("Saved", `Catch linked to Sticker ${String(crateId)}\nCatch ID: ${catchId}`);
      router.replace(`/(wild)/trace/${String(crateId)}` as const);
      return;
    }

    Alert.alert("Saved (demo)", `${species} · ${payload.weightKg} kg\nCatch ID: ${catchId}`);
    router.back();
  };

  return (
    <View className="flex-1 bg-slate-50">
      {/* Web Date Modal */}
      <WebDateModal
        open={webDateOpen}
        title="Catch Date"
        value={webDateStr}
        onClose={() => setWebDateOpen(false)}
        onSave={(v) => setWebDateStr(v)}
      />

      {/* ✅ Native Date/Time overlays (FIX: never behind form) */}
      <PickerModal
        open={showDate && Platform.OS !== "web"}
        title="Catch Date"
        value={catchDate ?? new Date()}
        mode="date"
        onClose={() => setShowDate(false)}
        onPick={(d) => setCatchDate(d)}
      />
      <PickerModal
        open={showTime && Platform.OS !== "web"}
        title="Catch Time"
        value={catchTime ?? new Date()}
        mode="time"
        onClose={() => setShowTime(false)}
        onPick={(d) => setCatchTime(d)}
      />

      {/* Bottom sheet pickers */}
      <PickerSheet
        title="Choose Trip ID"
        value={tripId}
        options={TRIPS.map((t) => t.tripId)}
        onSelect={setTripId}
        sheetRef={tripRef}
        renderOption={(id) => {
          const t = TRIPS.find((x) => x.tripId === id);
          return { title: id, sub: t ? `${t.port} · ${t.vesselId}` : "" };
        }}
      />
      <PickerSheet
        title="Choose Species"
        value={species}
        options={SPECIES}
        onSelect={setSpecies}
        sheetRef={speciesRef}
      />
      <PickerSheet
        title="Choose Fishing Method"
        value={method}
        options={METHODS}
        onSelect={setMethod}
        sheetRef={methodRef}
      />
      <PickerSheet
        title="Choose FAO Zone"
        value={faoZone}
        options={FAO_ZONES}
        onSelect={setFaoZone}
        sheetRef={faoRef}
      />

      <ScrollView contentContainerClassName="p-4 pb-10">
        {/* Header */}
        <Card className="p-4">
          <Text className="text-lg font-bold text-slate-900">Create Catch Log</Text>
          <Text className="mt-1 text-sm text-slate-600">
            Record catch details linked to a trip.
          </Text>

          {crateId ? (
            <View className="mt-3 rounded-xl bg-amber-100 px-3 py-2">
              <Text className="text-xs font-semibold text-amber-800">
                Linked to Sticker: {String(crateId)}
              </Text>
            </View>
          ) : null}

          <View className="mt-3">
            <Text className="text-xs text-slate-500">Catch ID</Text>
            <Text className="mt-1 text-base font-bold text-slate-900">{catchId}</Text>
          </View>
        </Card>

        {/* Main fields */}
        <View className="mt-4 gap-3">
          <FieldCard>
            <SelectField
              label="Trip ID"
              value={tripId}
              placeholder="Choose trip"
              onPress={() => tripRef.current?.present()}
            />
          </FieldCard>

          <FieldCard>
            <SelectField
              label="Species"
              value={species}
              placeholder="Choose species"
              onPress={() => speciesRef.current?.present()}
            />
          </FieldCard>

          <FieldCard>
            <SelectField
              label="Fishing Method"
              value={method}
              placeholder="Choose method"
              onPress={() => methodRef.current?.present()}
            />
          </FieldCard>

          <FieldCard>
            <Text className="text-xs text-slate-500">Estimated Weight (kg)</Text>
            <TextInput
              value={weightKg}
              onChangeText={setWeightKg}
              keyboardType="numeric"
              placeholder="e.g., 120"
              className="mt-1 text-base text-slate-900"
            />
          </FieldCard>

          <FieldCard>
            <SelectField
              label="FAO Zone"
              value={faoZone}
              placeholder="Choose FAO zone"
              onPress={() => faoRef.current?.present()}
            />
          </FieldCard>

          <FieldCard>
            <DateField
              label="Catch Date"
              value={shownDate}
              placeholder="Choose date"
              hint="Tap to pick date 📅"
              onPress={() => (Platform.OS === "web" ? setWebDateOpen(true) : setShowDate(true))}
            />
          </FieldCard>

          <FieldCard>
            <DateField
              label="Catch Time"
              value={shownTime}
              placeholder="Choose time"
              hint="Tap to pick time ⏱️"
              onPress={() => (Platform.OS === "web" ? Alert.alert("Web", "Time picker not added for web yet") : setShowTime(true))}
            />
          </FieldCard>

          <FieldCard>
            <Text className="text-xs text-slate-500">Haul / Set No</Text>
            <TextInput value={haulSetNo} onChangeText={setHaulSetNo} placeholder="e.g., 2" className="mt-1 text-base text-slate-900" />
          </FieldCard>

          <FieldCard>
            <Text className="text-xs text-slate-500">Gear Type</Text>
            <TextInput value={gearType} onChangeText={setGearType} placeholder="e.g., Gillnet" className="mt-1 text-base text-slate-900" />
          </FieldCard>

          <View className="flex-row gap-3">
            <View className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <Text className="text-xs text-slate-500">Latitude</Text>
              <TextInput value={latitude} onChangeText={setLatitude} placeholder="10.7654" className="mt-1 text-base text-slate-900" />
            </View>
            <View className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <Text className="text-xs text-slate-500">Longitude</Text>
              <TextInput value={longitude} onChangeText={setLongitude} placeholder="79.8432" className="mt-1 text-base text-slate-900" />
            </View>
          </View>

          <FieldCard>
            <Text className="text-xs text-slate-500">Notes</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Optional notes..."
              multiline
              className="mt-1 text-base text-slate-900"
              style={{ minHeight: 84, textAlignVertical: "top" }}
            />
          </FieldCard>
        </View>

        {/* Uploads */}
        <View className="mt-6">
          <Text className="mb-2 text-base font-bold text-slate-900">Uploads</Text>
          <Card className="p-4">
            <Text className="text-sm font-semibold text-slate-900">Upload Catch Images</Text>
            <Text className="mt-1 text-xs text-slate-600">Add up to 10 images.</Text>

            <Pressable onPress={pickImages} className="mt-3 rounded-2xl bg-slate-900 px-4 py-3 active:opacity-90">
              <Text className="text-center text-white font-semibold">Pick Images</Text>
            </Pressable>

            {images.length > 0 && (
              <View className="mt-3 gap-2">
                {images.map((uri, idx) => (
                  <View key={uri} className="flex-row items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <Text className="flex-1 text-xs text-slate-700" numberOfLines={1}>
                      Image {idx + 1}: {uri}
                    </Text>
                    <Pressable onPress={() => removeImage(uri)} className="ml-3 rounded-full bg-rose-100 px-3 py-1 active:opacity-80">
                      <Text className="text-xs font-semibold text-rose-700">Remove</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </Card>
        </View>

        {/* Save */}
        <Pressable onPress={save} className="mt-6 rounded-2xl bg-slate-900 p-4 active:opacity-90">
          <Text className="text-center text-white font-semibold">Save Catch Log</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
