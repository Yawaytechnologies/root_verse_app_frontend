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

/** ---------------- Dummy reference tables (replace from API later) ---------------- */
const FISHING_METHODS = ["Hook & Line", "Longline", "Gillnet", "Trawling", "Pole & Line"];
const PORTS = ["Chennai", "Nagapattinam", "Thoothukudi", "Ramanathapuram", "Kanyakumari"];
const SPECIES = ["Yellowfin Tuna", "Red Snapper", "Squid", "White Pomfret", "Seer Fish"];

/** ---------------- Helpers ---------------- */
const genTripId = () => {
  const yy = String(new Date().getFullYear()).slice(-2);
  const rnd = Math.floor(1000 + Math.random() * 9000);
  return `T${yy}${rnd}`;
};

const toNum = (v: string) => {
  const n = Number(String(v).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const moneyINR = (n: number) =>
  n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });

const fmtDate = (d?: Date | null) => {
  if (!d) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
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
      <Text className="mt-1 text-[11px] text-slate-400">Tap to pick date 📅</Text>
    </Pressable>
  );
}

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
          <TextInput
            value={v}
            onChangeText={setV}
            placeholder="2025-12-20"
            className="text-base text-slate-900"
          />
        </View>

        <View className="mt-4 flex-row gap-3">
          <Pressable
            onPress={onClose}
            className="flex-1 rounded-2xl border border-slate-200 p-3 active:opacity-80"
          >
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

/** ✅ Native Picker Modal (fix: never behind form) */
function PickerModal({
  open,
  title,
  value,
  onClose,
  onPick,
}: {
  open: boolean;
  title: string;
  value: Date;
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
              mode="date"
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
                  {item}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

/** ---------------- Screen ---------------- */
export default function CreateTrip() {
  const { crateId } = useLocalSearchParams<{ crateId?: string }>();
  const trace = useTrace();

  // Core
  const [tripId] = useState(genTripId());
  const [method, setMethod] = useState("");
  const [departurePort, setDeparturePort] = useState("");
  const [targetSpecies, setTargetSpecies] = useState("");
  const [crewMembers, setCrewMembers] = useState("");

  // Dates (native)
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [returnDate, setReturnDate] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showReturnPicker, setShowReturnPicker] = useState(false);

  // Dates (web fallback)
  const [webStartOpen, setWebStartOpen] = useState(false);
  const [webReturnOpen, setWebReturnOpen] = useState(false);
  const [webStartStr, setWebStartStr] = useState("");
  const [webReturnStr, setWebReturnStr] = useState("");

  // Expenses
  const [fuelLiters, setFuelLiters] = useState("100");
  const [fuelPrice, setFuelPrice] = useState("100");
  const [iceKg, setIceKg] = useState("1000");
  const [icePrice, setIcePrice] = useState("10");
  const [foodExpenses, setFoodExpenses] = useState("5000");
  const [otherExpenses, setOtherExpenses] = useState("1000");

  // Images
  const [images, setImages] = useState<string[]>([]);

  // Bottom sheets
  const methodRef = useRef<BottomSheetModal>(null);
  const portRef = useRef<BottomSheetModal>(null);
  const speciesRef = useRef<BottomSheetModal>(null);

  const fuelTotal = useMemo(() => toNum(fuelLiters) * toNum(fuelPrice), [fuelLiters, fuelPrice]);
  const iceTotal = useMemo(() => toNum(iceKg) * toNum(icePrice), [iceKg, icePrice]);
  const totalExpenses = useMemo(
    () => fuelTotal + iceTotal + toNum(foodExpenses) + toNum(otherExpenses),
    [fuelTotal, iceTotal, foodExpenses, otherExpenses]
  );

  const startDateStr = useMemo(() => fmtDate(startDate), [startDate]);
  const returnDateStr = useMemo(() => fmtDate(returnDate), [returnDate]);

  const shownStart = Platform.OS === "web" ? webStartStr : startDateStr;
  const shownReturn = Platform.OS === "web" ? webReturnStr : returnDateStr;

  const pickImages = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow photo access to upload images.");
      return;
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

  const save = () => {
    if (!method) return Alert.alert("Missing", "Fishing method is required");
    if (!departurePort) return Alert.alert("Missing", "Departure port is required");
    if (!targetSpecies) return Alert.alert("Missing", "Target species is required");

    // Validate start date depending on platform
    if (Platform.OS === "web") {
      const dt = parseYMD(webStartStr);
      if (!dt) return Alert.alert("Missing", "Trip start date is required (YYYY-MM-DD)");
    } else {
      if (!startDate) return Alert.alert("Missing", "Trip start date is required");
    }

    const payload = {
      tripId,
      method,
      departurePort,
      targetSpecies,
      tripStartDate: shownStart,
      expectedReturnDate: shownReturn,
      crewMembers: toNum(crewMembers),
      fuel: { liters: toNum(fuelLiters), pricePerQty: toNum(fuelPrice), total: fuelTotal },
      ice: { kg: toNum(iceKg), pricePerQty: toNum(icePrice), total: iceTotal },
      foodExpenses: toNum(foodExpenses),
      otherExpenses: toNum(otherExpenses),
      totalExpenses,
      images,
    };

    // ✅ If opened from Trace Wizard via QR scan, create trace event and return to wizard
    if (crateId) {
      trace.addEvent({
        crateId: String(crateId),
        stage: "TRIP",
        data: payload,
        createdBy: "Owner",
      });

      Alert.alert("Saved", `Trip linked to Sticker ${String(crateId)}\nTrip ID: ${tripId}`);
      router.replace(`/(wild)/trace/${String(crateId)}` as const);
      return;
    }

    Alert.alert("Saved (demo)", `Trip ${payload.tripId}\nTotal: ${moneyINR(totalExpenses)}`);
    router.back();
  };

  return (
    <View className="flex-1 bg-slate-50">
      {/* Web date modals */}
      <WebDateModal
        open={webStartOpen}
        title="Trip Start Date"
        value={webStartStr}
        onClose={() => setWebStartOpen(false)}
        onSave={(v) => setWebStartStr(v)}
      />
      <WebDateModal
        open={webReturnOpen}
        title="Expected Return Date"
        value={webReturnStr}
        onClose={() => setWebReturnOpen(false)}
        onSave={(v) => setWebReturnStr(v)}
      />

      {/* ✅ Native date picker overlays (FIXED: not behind form) */}
      <PickerModal
        open={showStartPicker && Platform.OS !== "web"}
        title="Trip Start Date"
        value={startDate ?? new Date()}
        onClose={() => setShowStartPicker(false)}
        onPick={(d) => setStartDate(d)}
      />
      <PickerModal
        open={showReturnPicker && Platform.OS !== "web"}
        title="Expected Return Date"
        value={returnDate ?? new Date()}
        onClose={() => setShowReturnPicker(false)}
        onPick={(d) => setReturnDate(d)}
      />

      {/* Bottom sheet pickers */}
      <PickerSheet
        title="Choose Fishing Method"
        value={method}
        options={FISHING_METHODS}
        onSelect={setMethod}
        sheetRef={methodRef}
      />
      <PickerSheet
        title="Choose Departure Port"
        value={departurePort}
        options={PORTS}
        onSelect={setDeparturePort}
        sheetRef={portRef}
      />
      <PickerSheet
        title="Choose Target Species"
        value={targetSpecies}
        options={SPECIES}
        onSelect={setTargetSpecies}
        sheetRef={speciesRef}
      />

      <ScrollView contentContainerClassName="p-4 pb-10">
        {/* Header */}
        <Card className="p-4">
          <Text className="text-lg font-bold text-slate-900">New Fishing Trip</Text>
          <Text className="mt-1 text-sm text-slate-600">Full trip registration form.</Text>

          {crateId ? (
            <View className="mt-3 rounded-xl bg-amber-100 px-3 py-2">
              <Text className="text-xs font-semibold text-amber-800">
                Linked to Sticker: {String(crateId)}
              </Text>
            </View>
          ) : null}

          <View className="mt-3">
            <Text className="text-xs text-slate-500">Trip ID</Text>
            <Text className="mt-1 text-base font-bold text-slate-900">{tripId}</Text>
          </View>
        </Card>

        {/* Core Fields */}
        <View className="mt-4 gap-3">
          <FieldCard>
            <SelectField
              label="Fishing Method"
              value={method}
              placeholder="Choose fishing method"
              onPress={() => methodRef.current?.present()}
            />
          </FieldCard>

          <FieldCard>
            <SelectField
              label="Departure Fishing Port"
              value={departurePort}
              placeholder="Choose departure port"
              onPress={() => portRef.current?.present()}
            />
          </FieldCard>

          <FieldCard>
            <SelectField
              label="Target Species"
              value={targetSpecies}
              placeholder="Choose target species"
              onPress={() => speciesRef.current?.present()}
            />
          </FieldCard>

          <FieldCard>
            <DateField
              label="Trip Start Date"
              value={shownStart}
              placeholder="Choose start date"
              onPress={() => (Platform.OS === "web" ? setWebStartOpen(true) : setShowStartPicker(true))}
            />
          </FieldCard>

          <FieldCard>
            <DateField
              label="Expected Return Date"
              value={shownReturn}
              placeholder="Choose return date"
              onPress={() => (Platform.OS === "web" ? setWebReturnOpen(true) : setShowReturnPicker(true))}
            />
          </FieldCard>

          <FieldCard>
            <Text className="text-xs text-slate-500">Crew Members</Text>
            <TextInput
              value={crewMembers}
              onChangeText={setCrewMembers}
              keyboardType="numeric"
              placeholder="e.g., 6"
              className="mt-1 text-base text-slate-900"
            />
          </FieldCard>
        </View>

        {/* Expenses */}
        <View className="mt-6">
          <Text className="mb-2 text-base font-bold text-slate-900">Expenses</Text>

          {/* Fuel */}
          <Card className="p-4">
            <Text className="text-sm font-bold text-slate-900">Fuel</Text>
            <View className="mt-3 flex-row gap-3">
              <View className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                <Text className="text-xs text-slate-500">Fuel (liters)</Text>
                <TextInput value={fuelLiters} onChangeText={setFuelLiters} keyboardType="numeric" className="mt-1 text-base text-slate-900" />
              </View>

              <View className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                <Text className="text-xs text-slate-500">Price per Qty</Text>
                <TextInput value={fuelPrice} onChangeText={setFuelPrice} keyboardType="numeric" className="mt-1 text-base text-slate-900" />
              </View>
            </View>

            <View className="mt-3 flex-row items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
              <Text className="text-xs text-slate-500">Total Fuel Cost</Text>
              <Text className="text-sm font-bold text-slate-900">{moneyINR(fuelTotal)}</Text>
            </View>
          </Card>

          {/* Ice */}
          <Card className="mt-3 p-4">
            <Text className="text-sm font-bold text-slate-900">Ice</Text>
            <View className="mt-3 flex-row gap-3">
              <View className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                <Text className="text-xs text-slate-500">Ice (kg)</Text>
                <TextInput value={iceKg} onChangeText={setIceKg} keyboardType="numeric" className="mt-1 text-base text-slate-900" />
              </View>

              <View className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                <Text className="text-xs text-slate-500">Price per Qty</Text>
                <TextInput value={icePrice} onChangeText={setIcePrice} keyboardType="numeric" className="mt-1 text-base text-slate-900" />
              </View>
            </View>

            <View className="mt-3 flex-row items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
              <Text className="text-xs text-slate-500">Total Ice Cost</Text>
              <Text className="text-sm font-bold text-slate-900">{moneyINR(iceTotal)}</Text>
            </View>
          </Card>

          {/* Food & Other */}
          <Card className="mt-3 p-4">
            <Text className="text-sm font-bold text-slate-900">Other</Text>

            <View className="mt-3 gap-3">
              <View className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                <Text className="text-xs text-slate-500">Food Expenses</Text>
                <TextInput value={foodExpenses} onChangeText={setFoodExpenses} keyboardType="numeric" className="mt-1 text-base text-slate-900" />
              </View>

              <View className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                <Text className="text-xs text-slate-500">Other Expense</Text>
                <TextInput value={otherExpenses} onChangeText={setOtherExpenses} keyboardType="numeric" className="mt-1 text-base text-slate-900" />
              </View>

              <View className="flex-row items-center justify-between rounded-xl bg-slate-100 px-3 py-3">
                <Text className="text-sm font-semibold text-slate-700">Total Expenses</Text>
                <Text className="text-base font-bold text-slate-900">{moneyINR(totalExpenses)}</Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Uploads */}
        <View className="mt-6">
          <Text className="mb-2 text-base font-bold text-slate-900">Uploads</Text>

          <Card className="p-4">
            <Text className="text-sm font-semibold text-slate-900">Upload Vessel & Fishing Gear Images</Text>
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
          <Text className="text-center text-white font-semibold">Save Trip</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
