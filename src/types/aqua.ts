export type AquaRegistrationStatus =
  | "idle"
  | "draft"
  | "submitting"
  | "submitted"
  | "pending"
  | "approved"
  | "rejected";

export type AquaFarmerData = {
  farmerName: string;
  mobileNumber: string;
  email?: string;
  aadhaarNumber?: string;
};

export type AquaFarmData = {
  farmName: string;
  farmAddress: string;
  district: string;
  stateName: string;
  farmArea: string;
  gpsLat: string;
  gpsLng: string;
  farmImageCaptured: boolean;
  farmImageUri: string;

  countryId: string;
  countryName: string;

  stateId: string;
  districtId: string;
  locationId: string;
  locationName: string;

  ownerId: string;
  talukId: string;

  waterSource: string;
  pondCount: string;

  latitude: string;
  longitude: string;

  technicianName: string;
  technicianMobileNumber: string;
};

export type AquaPondData = {
  id: string;
  pondName: string;
  pondArea: string;

  // Added for client requirement: Earthen / HDPE / Concrete
  pondType: string;

  cultureType: string;

  gpsLat: string;
  gpsLng: string;
  pondImageCaptured: boolean;
  pondImageUri: string;
};

export type AquaSubmissionData = {
  status: AquaRegistrationStatus;
  message: string;
};

export type AquaRegistrationState = {
  farmer: AquaFarmerData;
  farm: AquaFarmData;
  ponds: AquaPondData[];
  submission: AquaSubmissionData;
};

export type AquaRegistrationPayload = {
  farmer: AquaFarmerData;
  farm: AquaFarmData;
  ponds: AquaPondData[];
  pondCount: number;
};
