import React from "react";
import {
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  visible: boolean;
  imageUri: string;
  onClose: () => void;

  title?: string;

  userLabel?: string;
  userId?: string;

  farmName?: string;
  pondName?: string;

  latitude?: string | number;
  longitude?: string | number;
  accuracy?: string | number;

  capturedAt?: string;
  qrCode?: string;
};

function value(v: any, fallback = "N/A") {
  const text = String(v ?? "").trim();
  return text || fallback;
}

function coordinate(v: any) {
  const n = Number(v);

  if (!Number.isFinite(n)) {
    return value(v);
  }

  return n.toFixed(5);
}

export default function RootverseImagePreview({
  visible,
  imageUri,
  onClose,

  title = "Preview",

  userLabel = "Farmer ID",
  userId,

  farmName,
  pondName,

  latitude,
  longitude,
  accuracy,

  capturedAt,
  qrCode,
}: Props) {
  if (!imageUri) return null;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: "#08162F",
        }}
      >
        {/* HEADER */}
        <View
          style={{
            paddingHorizontal: 24,
            paddingTop: 20,
            paddingBottom: 20,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 24,
              fontWeight: "900",
            }}
          >
            {title}
          </Text>

          <Pressable
            onPress={onClose}
            style={{
              height: 56,
              width: 56,
              borderRadius: 28,
              backgroundColor: "#1F2E4B",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name="close"
              size={35}
              color="#FFFFFF"
            />
          </Pressable>
        </View>

        {/* IMAGE */}
        <View
          style={{
            flex: 1,
            marginHorizontal: 24,
            marginBottom: 18,
            borderRadius: 24,
            overflow: "hidden",
            backgroundColor: "#061126",
            justifyContent: "center",
          }}
        >
          <Pressable
            style={{
              width: "100%",
              position: "relative",
            }}
            onPress={onClose}
          >
            <Image
              source={{ uri: imageUri }}
              style={{
                width: "100%",
                height: 520,
              }}
              resizeMode="contain"
            />

            {/* ROOTVERSE WATERMARK */}
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                top: 12,
                right: 12,

                minWidth: 220,
                maxWidth: "86%",

                backgroundColor: "rgba(0,0,0,0.58)",

                paddingHorizontal: 12,
                paddingVertical: 8,

                borderRadius: 12,
              }}
            >
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 12,
                  fontWeight: "900",
                  textAlign: "right",
                  lineHeight: 18,
                }}
              >
                Powered by Rootverse
              </Text>

              {userId ? (
                <Text style={watermarkText}>
                  {userLabel}: {value(userId)}
                </Text>
              ) : null}

              {farmName ? (
                <Text style={watermarkText}>
                  Farm: {value(farmName)}
                </Text>
              ) : null}

              {pondName ? (
                <Text style={watermarkText}>
                  Pond: {value(pondName)}
                </Text>
              ) : null}

              <Text style={watermarkText}>
                Lat: {coordinate(latitude)} · Lng:{" "}
                {coordinate(longitude)}
              </Text>

              <Text style={watermarkText}>
                Acc:{" "}
                {accuracy !== undefined &&
                accuracy !== null &&
                String(accuracy).trim() !== ""
                  ? `${Number(accuracy).toFixed(0)} m`
                  : "N/A"}
                {"  ·  "}
                {value(capturedAt)}
              </Text>

              {qrCode ? (
                <Text style={watermarkText}>
                  QR: {value(qrCode)}
                </Text>
              ) : null}
            </View>
          </Pressable>
        </View>

        <Pressable onPress={onClose}>
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 18,
              fontWeight: "900",
              textAlign: "center",
              paddingBottom: 24,
            }}
          >
            Tap to close
          </Text>
        </Pressable>
      </SafeAreaView>
    </Modal>
  );
}

const watermarkText = {
  color: "#FFFFFF",
  fontSize: 11,
  fontWeight: "700" as const,
  lineHeight: 17,
  textAlign: "right" as const,
};