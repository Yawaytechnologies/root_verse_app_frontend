// src/components/crate_packer/CrateScannerScreen.tsx
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, Pressable, Text, TextInput, View } from "react-native";

import { http } from "../../services/http";

const SURFACE = "rgba(255,255,255,0.06)";
const BORDER = "rgba(255,255,255,0.10)";
const FIELD_BG = "rgba(0,0,0,0.35)";
const BLUE = "rgba(46,125,255,0.95)";

const CONTENT_W: any = "92%";
const MAX_W = 380;

// ✅ backend endpoint
const CRATE_LOOKUP_PATH = "/api/crate";

// ✅ do not block modal for too long
const SERVER_LOOKUP_WAIT_MS = 900;

function normCode(raw: string) {
  return String(raw || "").trim().toUpperCase().replace(/\s+/g, "");
}

/**
 * Offline fallback ONLY:
 * Take last 5 digits from the code suffix.
 * Examples:
 *  - KA-W-26000061 -> "00061" -> 61
 *  - KA-W-000998   -> "00998" -> 998
 */
function deriveCrateIdLast5(code: string): number | null {
  const c = normCode(code);
  if (!c) return null;

  const m = c.match(/(\d+)\s*$/);
  if (!m) return null;

  const digits = String(m[1] || "");
  const last5 = digits.length > 5 ? digits.slice(-5) : digits;
  const n = Number(last5);

  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

type CrateMeta = {
  crate_id?: number | null;
  server?: any | null;
};

function CornerBrackets({ size, color }: { size: number; color: string }) {
  const CORNER = Math.max(22, Math.min(30, Math.round(size * 0.11)));
  const THICK = 5;

  return (
    <View style={{ width: size, height: size }}>
      {/* TL */}
      <View
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: CORNER,
          height: THICK,
          borderRadius: 999,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: THICK,
          height: CORNER,
          borderRadius: 999,
          backgroundColor: color,
        }}
      />

      {/* TR */}
      <View
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          width: CORNER,
          height: THICK,
          borderRadius: 999,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          width: THICK,
          height: CORNER,
          borderRadius: 999,
          backgroundColor: color,
        }}
      />

      {/* BL */}
      <View
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          width: CORNER,
          height: THICK,
          borderRadius: 999,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          width: THICK,
          height: CORNER,
          borderRadius: 999,
          backgroundColor: color,
        }}
      />

      {/* BR */}
      <View
        style={{
          position: "absolute",
          right: 0,
          bottom: 0,
          width: CORNER,
          height: THICK,
          borderRadius: 999,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          position: "absolute",
          right: 0,
          bottom: 0,
          width: THICK,
          height: CORNER,
          borderRadius: 999,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

export default function CrateScannerScreen({
  divisionLabel,
  manualCode,
  setManualCode,
  onScannedCrateQr,
  cameraEnabled = true,
}: {
  divisionLabel: string;
  manualCode: string;
  setManualCode: (v: string) => void;
  onScannedCrateQr?: (code: string, meta?: CrateMeta) => void;
  cameraEnabled?: boolean;
}) {
  const [cameraPerm, requestCameraPerm] = useCameraPermissions();
  const [torch, setTorch] = useState(false);

  const scanPausedUntilRef = useRef(0);
  const busyRef = useRef(false);

  // ✅ cache successful lookups to remove repeated wait
  const crateMetaCacheRef = useRef<Record<string, CrateMeta>>({});

  const [boxSize, setBoxSize] = useState<number>(300);

  // ✅ stable remount key instead of incrementing state
  const camKey = useMemo(() => {
    return `crate_cam_${cameraEnabled ? "on" : "off"}`;
  }, [cameraEnabled]);

  // ✅ clear old scan locks when camera resumes
  useEffect(() => {
    if (cameraEnabled) {
      busyRef.current = false;
      scanPausedUntilRef.current = 0;
    }
  }, [cameraEnabled]);

  const scanLine = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!cameraEnabled) {
      scanLine.stopAnimation();
      scanLine.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLine, {
          toValue: 1,
          duration: 1300,
          useNativeDriver: true,
        }),
        Animated.timing(scanLine, {
          toValue: 0,
          duration: 1300,
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [scanLine, cameraEnabled]);

  const frameSize = useMemo(() => {
    const s = Math.round(boxSize * 0.78);
    return Math.max(210, Math.min(270, s));
  }, [boxSize]);

  const scanTranslateY = useMemo(() => {
    const travel = frameSize - 50;
    return scanLine.interpolate({
      inputRange: [0, 1],
      outputRange: [0, travel],
    });
  }, [scanLine, frameSize]);

  function getFallbackMeta(crateQr: string): CrateMeta {
    const code = normCode(crateQr);
    return {
      crate_id: deriveCrateIdLast5(code),
      server: null,
    };
  }

  async function fetchServerCrateMeta(crateQr: string): Promise<CrateMeta> {
    const code = normCode(crateQr);

    const resp = await http.getJson<any>(
      `${CRATE_LOOKUP_PATH}/${encodeURIComponent(code)}`,
      15000
    );

    const qr = resp?.qr ?? resp?.data?.qr ?? resp?.data ?? resp;

    const idNum = Number(qr?.id ?? qr?.crate_id ?? qr?.crateId ?? NaN);
    if (Number.isFinite(idNum) && idNum > 0) {
      return { crate_id: idNum, server: qr };
    }

    return { crate_id: null, server: qr ?? null };
  }

  function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
    return new Promise((resolve) => {
      let done = false;

      const timer = setTimeout(() => {
        if (done) return;
        done = true;
        resolve(null);
      }, ms);

      promise
        .then((value) => {
          if (done) return;
          done = true;
          clearTimeout(timer);
          resolve(value);
        })
        .catch(() => {
          if (done) return;
          done = true;
          clearTimeout(timer);
          resolve(null);
        });
    });
  }

  const processCode = async (codeRaw: string) => {
    const code = normCode(codeRaw);
    if (!code) return;

    setManualCode(code);

    if (!onScannedCrateQr) {
      Alert.alert("Not ready", "Crate scanner handler is missing.");
      return;
    }

    if (busyRef.current) return;
    busyRef.current = true;

    try {
      // ✅ use cached server/fallback result if already known
      const cached = crateMetaCacheRef.current[code];
      if (cached?.crate_id) {
        onScannedCrateQr(code, cached);
        return;
      }

      const fallbackMeta = getFallbackMeta(code);

      // ✅ wait only a little for server
      const fastServerMeta = await withTimeout(
        fetchServerCrateMeta(code),
        SERVER_LOOKUP_WAIT_MS
      );

      if (fastServerMeta?.crate_id) {
        crateMetaCacheRef.current[code] = fastServerMeta;
        onScannedCrateQr(code, fastServerMeta);
        return;
      }

      // ✅ server slow -> open with fallback now
      if (fallbackMeta?.crate_id) {
        crateMetaCacheRef.current[code] = fallbackMeta;
        onScannedCrateQr(code, fallbackMeta);

        // keep trying server in background and upgrade cache
        fetchServerCrateMeta(code)
          .then((serverMeta) => {
            if (serverMeta?.crate_id) {
              crateMetaCacheRef.current[code] = serverMeta;
            }
          })
          .catch(() => {});

        return;
      }

      // ✅ no fallback available, wait once for final server result
      const finalServerMeta = await fetchServerCrateMeta(code).catch(() => null);
      if (finalServerMeta?.crate_id) {
        crateMetaCacheRef.current[code] = finalServerMeta;
        onScannedCrateQr(code, finalServerMeta);
        return;
      }

      Alert.alert(
        "Crate lookup failed",
        "Unable to resolve crate_id. Please check internet and try again."
      );
    } finally {
      busyRef.current = false;
    }
  };

  const handleScan = (raw: any) => {
    const now = Date.now();
    if (now < scanPausedUntilRef.current) return;

    const code = normCode(raw);
    if (!code) return;

    scanPausedUntilRef.current = now + 1400;
    processCode(code);
  };

  if (!cameraPerm) {
    return (
      <View style={{ padding: 16 }}>
        <Text style={{ color: "white" }}>Requesting camera permission…</Text>
      </View>
    );
  }

  if (!cameraPerm.granted) {
    return (
      <View style={{ padding: 16 }}>
        <Text style={{ color: "white", fontSize: 16, fontWeight: "900" }}>
          Camera permission required
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.70)", marginTop: 8 }}>
          Enable camera permission to scan QR codes.
        </Text>

        <Pressable
          onPress={requestCameraPerm}
          style={{
            marginTop: 16,
            height: 46,
            borderRadius: 14,
            backgroundColor: "rgba(46,125,255,0.25)",
            borderWidth: 1,
            borderColor: "rgba(46,125,255,0.5)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "white", fontWeight: "900" }}>
            Allow Camera
          </Text>
        </Pressable>
      </View>
    );
  }

  const title = "Crate Scanner";
  const placeholder = "e.g. KA-W-26000062";

  return (
    <View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <Text
          style={{
            color: "white",
            fontSize: 18,
            fontWeight: "900",
          }}
        >
          {title} ({divisionLabel})
        </Text>

        <Pressable
          onPress={() => setTorch((v) => !v)}
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: torch
              ? "rgba(255,214,0,0.20)"
              : "rgba(255,255,255,0.08)",
            borderWidth: 1,
            borderColor: torch
              ? "rgba(255,214,0,0.45)"
              : "rgba(255,255,255,0.12)",
          }}
        >
          <Ionicons
            name={torch ? "flashlight" : "flashlight-outline"}
            size={18}
            color={torch ? "#FFD600" : "rgba(255,255,255,0.65)"}
          />
        </Pressable>
      </View>

      {/* Manual Code */}
      <View
        style={{
          alignSelf: "center",
          width: CONTENT_W,
          maxWidth: MAX_W,
          backgroundColor: SURFACE,
          borderWidth: 1,
          borderColor: BORDER,
          borderRadius: 18,
          padding: 12,
        }}
      >
        <Text
          style={{
            color: "rgba(255,255,255,0.75)",
            fontWeight: "900",
            fontSize: 12,
          }}
        >
          Enter Crate QR manually
        </Text>

        <TextInput
          value={manualCode}
          onChangeText={setManualCode}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.35)"
          autoCapitalize="characters"
          autoCorrect={false}
          style={{
            marginTop: 8,
            height: 42,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.15)",
            paddingHorizontal: 12,
            color: "white",
            backgroundColor: FIELD_BG,
            fontWeight: "900",
            fontSize: 13,
          }}
          returnKeyType="done"
          onSubmitEditing={() => {
            const c = normCode(manualCode);
            if (!c) {
              return Alert.alert(
                "Missing code",
                "Please enter a crate QR code"
              );
            }
            processCode(c);
          }}
        />

        <Pressable
          onPress={() => {
            const c = normCode(manualCode);
            if (!c) {
              return Alert.alert(
                "Missing code",
                "Please enter a crate QR code"
              );
            }
            processCode(c);
          }}
          style={{
            marginTop: 10,
            height: 42,
            borderRadius: 14,
            backgroundColor: "rgba(46,125,255,0.35)",
            borderWidth: 1,
            borderColor: "rgba(46,125,255,0.55)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "white", fontWeight: "900", fontSize: 13 }}>
            Use Code
          </Text>
        </Pressable>
      </View>

      {/* OR divider */}
      <View
        style={{
          alignSelf: "center",
          width: CONTENT_W,
          maxWidth: MAX_W,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          marginTop: 12,
          marginBottom: 12,
        }}
      >
        <View
          style={{
            flex: 1,
            height: 1,
            backgroundColor: "rgba(255,255,255,0.15)",
          }}
        />
        <Text
          style={{
            color: "rgba(255,255,255,0.65)",
            fontWeight: "900",
            fontSize: 12,
            letterSpacing: 1,
          }}
        >
          OR
        </Text>
        <View
          style={{
            flex: 1,
            height: 1,
            backgroundColor: "rgba(255,255,255,0.15)",
          }}
        />
      </View>

      {/* Scanner */}
      <View
        onLayout={(e) => {
          const w = e?.nativeEvent?.layout?.width;
          if (w && Math.abs(w - boxSize) > 1) setBoxSize(w);
        }}
        style={{
          alignSelf: "center",
          width: CONTENT_W,
          maxWidth: MAX_W,
          borderRadius: 22,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: BORDER,
          backgroundColor: "rgba(0,0,0,0.35)",
          height: boxSize,
        }}
      >
        {cameraEnabled ? (
          <CameraView
            key={camKey}
            style={{ width: "100%", height: "100%" }}
            facing="back"
            enableTorch={torch}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={(e: any) => handleScan(e?.data)}
          />
        ) : (
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.35)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                color: "rgba(255,255,255,0.75)",
                fontWeight: "900",
              }}
            >
              Camera paused
            </Text>
          </View>
        )}

        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View style={{ width: frameSize, height: frameSize }}>
            <CornerBrackets size={frameSize} color={BLUE} />
            {cameraEnabled ? (
              <Animated.View
                style={{
                  position: "absolute",
                  left: 12,
                  right: 12,
                  top: 16,
                  height: 2,
                  borderRadius: 999,
                  backgroundColor: BLUE,
                  transform: [{ translateY: scanTranslateY }],
                }}
              />
            ) : null}
            <View
              style={{
                position: "absolute",
                left: 8,
                right: 8,
                top: 8,
                bottom: 8,
                borderRadius: 18,
                backgroundColor: "rgba(0,0,0,0.10)",
              }}
            />
          </View>

          <Text
            style={{
              marginTop: 10,
              color: "rgba(255,255,255,0.85)",
              fontWeight: "900",
              fontSize: 13,
            }}
          >
            Align QR inside the box
          </Text>
        </View>
      </View>
    </View>
  );
}