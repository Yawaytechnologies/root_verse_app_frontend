import type {
  AquaFarmerData,
  AquaFarmData,
  AquaPondData,
} from "../types/aqua";

export const initialFarmerData: AquaFarmerData = {
  farmerName: "",
  mobileNumber: "",
  email: "",
  aadhaarNumber: "",
};

export const initialFarmData: AquaFarmData = {
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
  talukId: "",
  waterSource: "",
  pondCount: "",
  latitude: "",
  longitude: "",
};

export const initialPondData: AquaPondData = {
  id: "",
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
};
