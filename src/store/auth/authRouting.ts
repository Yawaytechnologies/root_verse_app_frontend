export function pickFirstDefined(...vals: any[]) {
  return vals.find(
    (v) => v !== undefined && v !== null && String(v).trim() !== ""
  );
}

export function normalizeRole(value: any) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

export function pickAuthRole(...sources: any[]) {
  return normalizeRole(
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
  );
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
  )
    .trim()
    .toUpperCase();
}

export function getRouteForRole(role: string) {
  const normalizedRole = normalizeRole(role);

  if (!normalizedRole) return null;

  if (normalizedRole === "QUALITY_CHECKER") {
    return "/quality";
  }

  if (
    normalizedRole === "COLLECTION_CENTRE_OPERATOR" ||
    normalizedRole === "COLLECTION_CENTER_OPERATOR" ||
    normalizedRole === "CENTER_OPERATOR" ||
    normalizedRole === "CENTRE_OPERATOR" ||
    ((normalizedRole.includes("COLLECTION") ||
      normalizedRole.includes("CENTER") ||
      normalizedRole.includes("CENTRE")) &&
      normalizedRole.includes("OPERATOR"))
  ) {
    return "/(centre)/dashboard";
  }

  if (
    normalizedRole === "TRANSPORT_OPERATOR" ||
    normalizedRole === "TRANSPORTER_OPERATOR" ||
    (normalizedRole.includes("TRANSPORT") &&
      normalizedRole.includes("OPERATOR"))
  ) {
    return "/(transport)/division";
  }

  if (normalizedRole === "CRATE_PACKER") {
    return "/crate_packer/index";
  }

  if (normalizedRole === "OWNER") {
    return "/(wild)/dashboard";
  }

  if (normalizedRole === "WILD_CAPTURE" || normalizedRole.includes("WILD")) {
    return "/(wild)/dashboard";
  }

  if (normalizedRole === "AQUACULTURE" || normalizedRole.includes("AQUA")) {
    return "/(aqua)/tabs/dashboard";
  }

  if (normalizedRole === "MARICULTURE" || normalizedRole.includes("MARI")) {
    return "/mariculture";
  }

  return null;
}