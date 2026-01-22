import React, { useEffect } from "react";
import { Stack } from "expo-router";

import { useAppDispatch, useAppSelector } from "../../src/store/hooks";
import {
  fetchInspectorByCode,
  selectCheckerCode,
  setCheckerCode,
} from "../../src/store/qualityAuth/qualityAuth.slice";

export default function QualityLayout() {
  const dispatch = useAppDispatch();
  const checkerCode = useAppSelector(selectCheckerCode);

  // ✅ TEMP: guard dispatch to catch undefined action
  const safeDispatch = (action: any, label: string) => {
    if (!action) {
      console.error(`❌ dispatch got undefined action: ${label}`);
      return;
    }
    // if it's a normal action object, it must have type
    if (typeof action === "object" && !action.type) {
      console.error(`❌ dispatch got object without type: ${label}`, action);
      return;
    }
    dispatch(action);
  };

  useEffect(() => {
    if (!checkerCode) {
      safeDispatch(setCheckerCode("QC-000003"), "setCheckerCode('QC-000003')");
    }
  }, [checkerCode]);

  useEffect(() => {
    if (!checkerCode) return;
    safeDispatch(fetchInspectorByCode(checkerCode), "fetchInspectorByCode(checkerCode)");
  }, [checkerCode]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
