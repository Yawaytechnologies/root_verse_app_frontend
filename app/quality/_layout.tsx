// app/quality/_layout.tsx
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
 
  // ✅ DEV ONLY: allow testing without OTP team
  useEffect(() => {
    if (__DEV__ && !checkerCode) {
      dispatch(setCheckerCode("QC-000003"));
    }
  }, [checkerCode, dispatch]);
 
  // ✅ REAL: fetch inspector when code exists (from OTP flow later)
  useEffect(() => {
    if (!checkerCode) return;
    dispatch(fetchInspectorByCode(checkerCode));
  }, [checkerCode, dispatch]);
 
  return <Stack screenOptions={{ headerShown: false }} />;
}