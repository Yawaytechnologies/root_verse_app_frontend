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
  technicianName: "",
  technicianMobileNumber: "",
};

export const initialPondData: AquaPondData = {
  id: "",
  pondName: "",
  pondArea: "",
  pondType: "Earthen",
  cultureType: "",
  gpsLat: "",
  gpsLng: "",
  pondImageCaptured: false,
  pondImageUri: "",
};
