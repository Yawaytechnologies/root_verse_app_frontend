export function pickFirstDefined(...vals: any[]) {
  return vals.find(
    (v) => v !== undefined && v !== null && String(v).trim() !== ""
  );
}

export function pickAuthRole(...sources: any[]) {
  return String(
    pickFirstDefined(
      ...sources.flatMap((src) => [
        src?.role,
        src?.rootverse_type,
        src?.user?.role,
        src?.user?.rootverse_type,
        src?.data?.role,
        src?.data?.rootverse_type,
        src?.data?.user?.role,
        src?.data?.user?.rootverse_type,
      ])
    ) ?? ""
  ).toUpperCase();
}

export function pickAuthStatus(...sources: any[]) {
  return String(
    pickFirstDefined(
      ...sources.flatMap((src) => [
        src?.status,
        src?.verification_status,
        src?.user?.status,
        src?.data?.status,
        src?.data?.verification_status,
        src?.data?.user?.status,
      ])
    ) ?? ""
  ).toUpperCase();
}

export function getRouteForRole(role: string) {
  const normalizedRole = String(role || "").toUpperCase();

  if (normalizedRole === "QUALITY_CHECKER") return "/quality";
  if (normalizedRole === "COLLECTION_CENTRE_OPERATOR") {
    return "/(centre)/dashboard";
  }
  if (normalizedRole === "TRANSPORT_OPERATOR") {
    return "/(transport)/dashboard";
  }
  if (normalizedRole === "OWNER" || normalizedRole === "CRATE_PACKER") {
    return "/(wild)/dashboard";
  }

  if (normalizedRole.includes("WILD")) return "/(wild)/dashboard";
  if (normalizedRole.includes("AQUA")) return "/(aqua)/tabs/dashboard";
  if (normalizedRole.includes("MARI")) return "/mariculture";

  return null;
}
