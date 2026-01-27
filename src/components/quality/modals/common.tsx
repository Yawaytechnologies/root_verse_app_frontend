// src/components/quality/modals/common.tsx
import React, { useMemo, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import type { TextInputProps } from "react-native";

/* ================= UI HELPERS ================= */

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <Text className="mt-3 text-[13px] font-extrabold text-white/70">
      {children}
    </Text>
  );
}

export function TwoCol({ children }: { children: React.ReactNode }) {
  return <View className="mt-3 flex-row gap-3">{children}</View>;
}

export function ReadOnly({ value }: { value: string }) {
  return (
    <View className="mt-2 rounded-2xl border border-white/10 bg-black/35 px-4 py-3">
      <Text className="font-extrabold text-white">{value}</Text>
    </View>
  );
}

/**
 * ✅ Input wrapper (NativeWind)
 * FIX:
 * - allow extra TextInput props like maxLength, autoCapitalize, inputMode, etc.
 * - keep your current UI + disabled behavior
 */
type InputProps = Omit<TextInputProps, "editable"> & {
  disabled?: boolean;
};

export function Input({ disabled, className, ...rest }: InputProps) {
  const multiline = !!rest.multiline;
  const hClass = multiline ? "h-28" : "";
  const opacity = disabled ? "opacity-60" : "opacity-100";

  return (
    <TextInput
      {...rest}
      editable={!disabled}
      placeholderTextColor="rgba(255,255,255,0.35)"
      textAlignVertical={multiline ? "top" : "auto"}
      className={[
        "mt-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-extrabold text-white",
        hClass,
        opacity,
        className || "",
      ].join(" ")}
    />
  );
}

/**
 * ✅ NativeWind Select (no Picker)
 * - avoids inline style
 * - works same on Android/iOS
 */
export function Select<T extends string>({
  value,
  onValueChange,
  items,
  disabled,
  placeholder,
}: {
  value: T | "";
  onValueChange: (v: T) => void;
  items: readonly T[];
  disabled?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);

  const label = useMemo(() => {
    if (value) return String(value);
    return placeholder || "Select";
  }, [value, placeholder]);

  return (
    <>
      <Pressable
        onPress={() => !disabled && setOpen(true)}
        disabled={disabled}
        className={[
          "mt-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3",
          disabled ? "opacity-60" : "opacity-100",
        ].join(" ")}
      >
        <Text className="font-extrabold text-white">{label}</Text>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View className="flex-1 bg-black/60 p-4 justify-center">
          <View className="max-h-[80%] rounded-3xl border border-white/10 bg-[#0b1630] overflow-hidden">
            <View className="flex-row items-center justify-between px-4 py-4 border-b border-white/10">
              <Text className="text-white font-extrabold text-[16px]">
                {placeholder || "Select"}
              </Text>
              <Pressable onPress={() => setOpen(false)} className="px-3 py-2">
                <Text className="text-white/85 font-extrabold text-[18px]">
                  ✕
                </Text>
              </Pressable>
            </View>

            <ScrollView contentContainerClassName="p-3">
              {items.map((it) => {
                const active = String(it) === String(value);
                return (
                  <Pressable
                    key={String(it)}
                    onPress={() => {
                      onValueChange(it);
                      setOpen(false);
                    }}
                    className={[
                      "mb-2 rounded-2xl border px-4 py-3",
                      active
                        ? "border-blue-400/50 bg-blue-500/20"
                        : "border-white/10 bg-white/5",
                    ].join(" ")}
                  >
                    <Text className="text-white font-extrabold">
                      {String(it)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

export function ActionBtn({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={[
        "mt-2 rounded-2xl border border-blue-400/35 bg-white/5 px-4 py-3 items-center",
        disabled ? "opacity-60" : "opacity-100",
      ].join(" ")}
    >
      <Text className="text-white font-extrabold">{label}</Text>
    </Pressable>
  );
}

export function ImageList({
  uris,
  onRemove,
  disabled,
}: {
  uris: string[];
  onRemove: (uri: string) => void;
  disabled?: boolean;
}) {
  if (!uris?.length) return null;

  return (
    <View className="mt-3 gap-3">
      {uris.map((uri) => (
        <View
          key={uri}
          className="overflow-hidden rounded-2xl border border-white/10 bg-white/5"
        >
          <Image source={{ uri }} className="w-full h-[150px]" />
          <Pressable
            onPress={() => onRemove(uri)}
            disabled={disabled}
            className={[
              "items-center py-3 border-t border-rose-400/25 bg-rose-400/15",
              disabled ? "opacity-50" : "opacity-100",
            ].join(" ")}
          >
            <Text className="text-white font-extrabold">Remove</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}
