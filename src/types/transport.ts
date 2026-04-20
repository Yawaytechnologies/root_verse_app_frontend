export type TransportCrateStatus =
  | "scheduled"
  | "in_transit"
  | "delivered"
  | "received";

export type TemperatureLog = {
  value: string;
  recordedAtUtc: string;
  operatorId: string;
};

export type TransportCrate = {
  id: string;
  source: string;
  status: TransportCrateStatus;
  date: string; // YYYY-MM-DD
  collectionCentre: string;
  destination: string;
  scheduledTime: string;
  weightKg?: number;
  assignedTransportId?: string;
  assignedTransportName?: string;
  assignedVehicleNo?: string;
  qualityGrade?: string;
  fishTags?: string[];
  gpsPickup?: string;
  pickedUpAtUtc?: string;
  notes?: string;
  temperatureLogs?: TemperatureLog[];
};

export type TransportProfile = {
  id: string;
  name: string;
  vehicleNo: string;
  route: string;
  gps: string;
};

export type ScanResult = {
  ok: boolean;
  message: string;
  crate?: TransportCrate;
};