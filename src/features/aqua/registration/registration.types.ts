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
    technicianName: "",
    technicianMobileNumber: "",
  },
  ponds: [
    {
      id: "pond-1",
      pondName: "",
      pondArea: "",
      pondType: "Earthen",
      cultureType: "",
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
