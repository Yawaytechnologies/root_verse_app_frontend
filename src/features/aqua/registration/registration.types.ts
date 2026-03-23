import type { AquaRegistrationState } from "../../../types/aqua";

export const initialAquaRegistrationState: AquaRegistrationState = {
  farmer: {
    farmerName: "",
    mobileNumber: "",
    email: "",
    aadhaarNumber: "",
  },
  farm: {
    farmName: "",
    farmAddress: "",
    district: "",
    stateName: "",
    farmArea: "",
    gpsLat: "",
    gpsLng: "",
    farmImageCaptured: false,
    farmImageUri: "",

    countryId: "",
    countryName: "",
    stateId: "",
    districtId: "",
    locationId: "",
    locationName: "",
    ownerId: "",
    talukId: "0",
    waterSource: "",
    pondCount: "",
    latitude: "",
    longitude: "",
  },
ponds: [
  {
    id: "pond-1",
    pondName: "",
    pondArea: "",
    cultureType: "",
    speciesId: "",
    speciesName: "",
    speciesCode: "",
    speciesImageUrl: "",
    gpsLat: "",
    gpsLng: "",
    pondImageCaptured: false,
    pondImageUri: "",
  },
],
  submission: {
    status: "idle",
    message: "",
  },
};