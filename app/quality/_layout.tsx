// app/quality/_layout.tsx
import { Stack } from "expo-router";
import React, { useEffect, useRef } from "react";

import { useAppDispatch } from "../../src/store/hooks";
import { fetchQcMe } from "../../src/store/qualityAuth/qualityAuth.slice";

export default function QualityLayout() {
  const dispatch = useAppDispatch();
  const ranOnce = useRef(false);

  useEffect(() => {
    if (ranOnce.current) return;
    ranOnce.current = true;

    // ✅ LOGGED-IN QC details
    dispatch(fetchQcMe());
  }, [dispatch]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
