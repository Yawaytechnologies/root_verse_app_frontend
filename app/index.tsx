import { Redirect } from "expo-router";

const SKIP_LOGIN = process.env.EXPO_PUBLIC_SKIP_LOGIN === "true";
const APP_MODE = process.env.EXPO_PUBLIC_APP_MODE;

export default function Index() {
  if (__DEV__ && SKIP_LOGIN) {
    if (APP_MODE === "transport") {
      return <Redirect href="/(transport)/dashboard" />;
    }

    if (APP_MODE === "centre") {
      return <Redirect href="/(centre)/dashboard" />;
    }

    if (APP_MODE === "wild") {
      return <Redirect href="/(wild)/dashboard" />;
    }
  }

  return <Redirect href="/(auth)/login" />;
}