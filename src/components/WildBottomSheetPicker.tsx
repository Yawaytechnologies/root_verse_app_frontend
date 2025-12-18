import React, { useMemo, useRef, useState } from "react";
import { View, Text, Pressable, TextInput, FlatList } from "react-native";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";

type Props = {
  title: string;
  options: string[];
  value: string;
  onSelect: (v: string) => void;
};

export default function BottomSheetPickerModal({ title, options, value, onSelect }: Props) {
  const ref = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["45%", "75%"], []);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return options;
    return options.filter((x) => x.toLowerCase().includes(t));
  }, [q, options]);

  const open = () => ref.current?.present();
  const close = () => ref.current?.dismiss();

  const Sheet = (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      enablePanDownToClose
      backgroundStyle={{ borderRadius: 24 }}
      handleIndicatorStyle={{ opacity: 0.35 }}
    >
      <BottomSheetView style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-bold text-slate-900">{title}</Text>
          <Pressable onPress={close} className="rounded-full px-3 py-2 active:opacity-80">
            <Text className="text-sm font-semibold text-blue-600">Done</Text>
          </Pressable>
        </View>

        <View className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search..."
            className="text-base text-slate-900"
          />
        </View>

        <FlatList
          className="mt-3"
          data={filtered}
          keyExtractor={(item) => item}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const active = item === value;
            return (
              <Pressable
                onPress={() => {
                  onSelect(item);
                  close();
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
          }}
        />
      </BottomSheetView>
    </BottomSheetModal>
  );

  return { open, Sheet } as any;
}
