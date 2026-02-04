// app/quality/_layout.tsx
import { Stack } from "expo-router";
import React, { useEffect, useRef } from "react";
import Toast from "react-native-toast-message";

import { useAppDispatch, useAppSelector } from "../../src/store/hooks";
import { fetchQcMe, selectInspector } from "../../src/store/qualityAuth/qualityAuth.slice";

export default function QualityLayout() {
  const dispatch = useAppDispatch();

  const ranOnce = useRef(false);
  const toastShown = useRef(false);

  const qc = useAppSelector(selectInspector); // QualityInspector | null

  // Fetch QC profile once when entering /quality
  useEffect(() => {
    if (ranOnce.current) return;
    ranOnce.current = true;
    dispatch(fetchQcMe());
  }, [dispatch]);

  // Show toast once when QC is available
  useEffect(() => {
    if (!qc) return;
    if (toastShown.current) return;
    toastShown.current = true;

    Toast.show({
      type: "success",
      text1: `Welcome ${qc.checker_name || "Inspector"}`,
      text2: `${qc.checker_code || ""}`.trim(),
      visibilityTime: 3000, // ✅ 3 sec
      position: "top",      // ✅ top
      topOffset: 60,        // ✅ keeps below status bar/notch
    });
  }, [qc]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
