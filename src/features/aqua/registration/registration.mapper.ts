import type {
  AquaRegistrationPayload,
  AquaRegistrationState,
} from "../../../types/aqua";

/* -------------------------------------------------- */
/* IMAGE META */
/* -------------------------------------------------- */
function getImageMeta(uri: string) {
  const cleanUri = uri.split("?")[0];
  const extension = cleanUri.split(".").pop()?.toLowerCase() || "jpg";

  const mimeMap: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    heic: "image/heic",
  };

  return {
    extension,
    mimeType: mimeMap[extension] || "image/jpeg",
  };
}

/* -------------------------------------------------- */
/* GENERIC PAYLOAD (KEEP AS IS) */
/* -------------------------------------------------- */
export function mapRegistrationStateToPayload(
  state: AquaRegistrationState,
): AquaRegistrationPayload {
  return {
    farmer: {
      farmerName: state.farmer.farmerName,
      mobileNumber: state.farmer.mobileNumber,
      email: state.farmer.email,
      aadhaarNumber: state.farmer.aadhaarNumber,
    },
    farm: {
      farmName: state.farm.farmName,
      farmAddress: state.farm.farmAddress,
      district: state.farm.district,
      stateName: state.farm.stateName,
      farmArea: state.farm.farmArea,
      gpsLat: state.farm.gpsLat,
      gpsLng: state.farm.gpsLng,
      farmImageCaptured: state.farm.farmImageCaptured,
      farmImageUri: state.farm.farmImageUri,

      countryId: state.farm.countryId,
      countryName: state.farm.countryName,
      stateId: state.farm.stateId,
      districtId: state.farm.districtId,
      locationId: state.farm.locationId,
      locationName: state.farm.locationName,
      ownerId: state.farm.ownerId,
      talukId: state.farm.talukId,
      waterSource: state.farm.waterSource,
      pondCount: state.farm.pondCount,
      latitude: state.farm.latitude,
      longitude: state.farm.longitude,
    },
    ponds: state.ponds.map((pond) => ({
      id: pond.id,
      pondName: pond.pondName,
      pondArea: pond.pondArea,
      cultureType: pond.cultureType,
      speciesId: pond.speciesId,
      speciesName: pond.speciesName,
      speciesCode: pond.speciesCode,
      speciesImageUrl: pond.speciesImageUrl,
      gpsLat: pond.gpsLat,
      gpsLng: pond.gpsLng,
      pondImageCaptured: pond.pondImageCaptured,
      pondImageUri: pond.pondImageUri,
    })),
    pondCount: state.ponds.length,
  };
}

/* -------------------------------------------------- */
/* FARM → FORM DATA                                   */
/* ownerId passed directly from me.owner_id (Redux)   */
/* No AsyncStorage dependency                         */
/* -------------------------------------------------- */
export function mapFarmStateToFormData(
  state: AquaRegistrationState,
  ownerId: string,
): FormData {
  if (!ownerId) {
    throw new Error("OWNER_ID_MISSING: User is not logged in or owner ID is unavailable.");
  }

  // Backend expects owner_id as integer — extract numeric part from codes like "OWN-0083" → 83
  const numericOwnerId = ownerId.replace(/\D/g, "").replace(/^0+/, "") || ownerId;

  const formData = new FormData();

  formData.append("name", state.farm.farmName.trim());
  formData.append("location_id", state.farm.locationId.trim());
  formData.append("owner_id", numericOwnerId);
  formData.append("total_area", String(Math.floor(parseFloat(state.farm.farmArea.trim()) || 0)));
  formData.append("water_source", state.farm.waterSource.trim());
  formData.append("farm_address", state.farm.farmAddress.trim());
  formData.append("country_id", state.farm.countryId.trim());  // ✅ was missing
  formData.append("state_id", state.farm.stateId.trim());
  formData.append("district_id", state.farm.districtId.trim());
  formData.append("pond_count", state.farm.pondCount.trim());

  const latitude = (state.farm.latitude || state.farm.gpsLat || "").trim();
  const longitude = (state.farm.longitude || state.farm.gpsLng || "").trim();

  formData.append("latitude", latitude);
  formData.append("longitude", longitude);

  /* IMAGE */
  if (state.farm.farmImageUri) {
    const { extension, mimeType } = getImageMeta(state.farm.farmImageUri);

    formData.append("image", {
      uri: state.farm.farmImageUri,
      name: `farm-image.${extension}`,
      type: mimeType,
    } as any);
  }

  return formData;
}

/* -------------------------------------------------- */
/* POND → FORM DATA */
/* -------------------------------------------------- */
export function mapPondToFormData(
  pond: AquaRegistrationState["ponds"][number],
  farmId: string,
): FormData {
  const formData = new FormData();

  const numericArea = String(parseFloat(pond.pondArea.trim()) || 0);
  const numericFarmId = farmId.trim().replace(/\D/g, "").replace(/^0+/, "") || farmId.trim();
  const numericSpeciesId = pond.speciesId.trim().replace(/\D/g, "").replace(/^0+/, "") || pond.speciesId.trim();

  formData.append("name", pond.pondName.trim());
  formData.append("area", numericArea);
  formData.append("farm_id", numericFarmId);
  formData.append("species_id", numericSpeciesId);

  if (pond.pondImageUri) {
    const { extension, mimeType } = getImageMeta(pond.pondImageUri);

    formData.append("image", {
      uri: pond.pondImageUri,
      name: `pond-image.${extension}`,
      type: mimeType,
    } as any);
  }

  return formData;
}