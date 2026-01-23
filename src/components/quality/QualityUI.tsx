import React from "react";
import { Pressable, Text, TextInput, View } from "react-native";

export type Division = "WILD" | "AQUA" | "MARICULTURE";
export type Lang = "en" | "ta";

export function fmtDate(d?: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return d;
  }
}

export function fmtTime(t?: string | null) {
  if (!t) return "—";
  return t;
}

export function Badge({
  text,
  tone = "muted",
}: {
  text: string;
  tone?: "muted" | "good" | "bad" | "warn";
}) {
  const bg =
    tone === "good"
      ? "rgba(52,211,153,0.18)"
      : tone === "bad"
        ? "rgba(248,113,113,0.16)"
        : tone === "warn"
          ? "rgba(251,191,36,0.16)"
          : "rgba(255,255,255,0.08)";
  const bd =
    tone === "good"
      ? "rgba(52,211,153,0.35)"
      : tone === "bad"
        ? "rgba(248,113,113,0.35)"
        : tone === "warn"
          ? "rgba(251,191,36,0.35)"
          : "rgba(255,255,255,0.12)";

  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: bg,
        borderWidth: 1,
        borderColor: bd,
      }}
    >
      <Text style={{ color: "white", fontWeight: "800", fontSize: 12 }}>
        {text}
      </Text>
    </View>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        color: "rgba(255,255,255,0.7)",
        fontSize: 13,
        fontWeight: "700",
      }}
    >
      {children}
    </Text>
  );
}

export function Input({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  numberOfLines,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: any;
  multiline?: boolean;
  numberOfLines?: number;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="rgba(255,255,255,0.35)"
      keyboardType={keyboardType}
      multiline={multiline}
      numberOfLines={numberOfLines}
      style={{
        marginTop: 8,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: "rgba(255,255,255,0.06)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.10)",
        color: "white",
        fontWeight: "700",
      }}
    />
  );
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
}) {
  return (
    <View style={{ marginTop: 14 }}>
      <Label>{label}</Label>
      <View
        style={{
          flexDirection: "row",
          gap: 10,
          marginTop: 10,
          flexWrap: "wrap",
        }}
      >
        {options.map((o) => {
          const active = o === value;
          return (
            <Pressable
              key={o}
              onPress={() => onChange(o)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 14,
                backgroundColor: active
                  ? "rgba(46,125,255,0.22)"
                  : "rgba(255,255,255,0.06)",
                borderWidth: 1,
                borderColor: active
                  ? "rgba(46,125,255,0.45)"
                  : "rgba(255,255,255,0.10)",
              }}
            >
              <Text style={{ color: "white", fontWeight: "900", fontSize: 12 }}>
                {o}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function FullRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={{ color: "rgba(255,255,255,0.55)", fontWeight: "700" }}>
        {label}
      </Text>
      <Text style={{ color: "white", fontWeight: "900", marginTop: 4 }}>
        {value}
      </Text>
    </View>
  );
}

export function TwoColRow({
  left,
  right,
}: {
  left: { label: string; value: string };
  right: { label: string; value: string };
}) {
  return (
    <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: "rgba(255,255,255,0.55)", fontWeight: "700" }}>
          {left.label}
        </Text>
        <Text style={{ color: "white", fontWeight: "900", marginTop: 4 }}>
          {left.value}
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{ color: "rgba(255,255,255,0.55)", fontWeight: "700" }}>
          {right.label}
        </Text>
        <Text style={{ color: "white", fontWeight: "900", marginTop: 4 }}>
          {right.value}
        </Text>
      </View>
    </View>
  );
}
