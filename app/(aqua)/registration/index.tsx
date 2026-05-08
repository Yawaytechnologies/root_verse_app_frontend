import React from "react";
import { Redirect, useLocalSearchParams } from "expo-router";

export default function AquaRegistrationIndex() {
  const params = useLocalSearchParams();

  return (
    <Redirect
      href={{
        pathname: "/(aqua)/registration/farm-details",
        params: {
          fresh: String(params.fresh ?? Date.now().toString()),
        },
      }}
    />
  );
}
