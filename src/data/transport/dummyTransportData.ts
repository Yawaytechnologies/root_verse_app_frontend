import { TransportCrate, TransportProfile, TransportCrateStatus } from "../../types/transport";

export const DUMMY_TRANSPORT_PROFILE: TransportProfile = {
  id: "TR-000021",
  name: "Arun Kumar",
  vehicleNo: "TN-51-AB-4321",
  route: "Nagapattinam → Processor Hub",
  gps: "10.7654, 79.8428",
};

export function formatDateKey(date: Date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function offsetDateKey(baseDateKey: string, offset: number) {
  const [y, m, d] = baseDateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + offset);
  return formatDateKey(date);
}

export function formatDisplayDate(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);

  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatShortDay(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);

  return date.toLocaleDateString("en-US", {
    weekday: "short",
  });
}

export function formatUtcToLocal(utc?: string) {
  if (!utc) return "-";
  const date = new Date(utc);

  return date.toLocaleString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatStatus(status: TransportCrateStatus) {
  if (status === "scheduled") return "Scheduled";
  if (status === "in_transit") return "In Transit";
  if (status === "delivered") return "Delivered";
  return "Received";
}

export function getLastNDays(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - index);
    return formatDateKey(date);
  }).reverse();
}

export function buildDummyTransportCrates(today: string): TransportCrate[] {
  return [
    {
      id: "RV-CRATE-000121",
      source: "Scheduled from collection centre",
      status: "scheduled",
      date: today,
      collectionCentre: "Nagapattinam Centre",
      destination: "Delta Processor Unit",
      scheduledTime: "10:30 AM",
      weightKg: 32,
      assignedTransportId: "TR-000021",
      assignedTransportName: "Arun Kumar",
      assignedVehicleNo: "TN-51-AB-4321",
      qualityGrade: "A",
      fishTags: ["TUNA-01", "TUNA-02"],
      notes: "Keep chilled",
      temperatureLogs: [],
    },
    {
      id: "RV-CRATE-000122",
      source: "Scheduled from collection centre",
      status: "scheduled",
      date: today,
      collectionCentre: "Nagapattinam Centre",
      destination: "Export Packing Hub",
      scheduledTime: "11:15 AM",
      weightKg: 28,
      assignedTransportId: "TR-000021",
      assignedTransportName: "Arun Kumar",
      assignedVehicleNo: "TN-51-AB-4321",
      qualityGrade: "A+",
      fishTags: ["CRAB-11", "CRAB-12"],
      notes: "Priority crate",
      temperatureLogs: [],
    },
    {
      id: "RV-CRATE-000123",
      source: "Scheduled from collection centre",
      status: "scheduled",
      date: today,
      collectionCentre: "Nagapattinam Centre",
      destination: "Local Market Cold Hub",
      scheduledTime: "12:00 PM",
      weightKg: 25,
      assignedTransportId: "TR-000099",
      assignedTransportName: "Suresh",
      assignedVehicleNo: "TN-09-CD-9876",
      qualityGrade: "B",
      fishTags: ["PRAWN-07"],
      notes: "Assigned to another transport",
      temperatureLogs: [],
    },
    {
      id: "RV-CRATE-000124",
      source: "Picked by transport operator",
      status: "in_transit",
      date: today,
      collectionCentre: "Nagapattinam Centre",
      destination: "Main Processor Dock",
      scheduledTime: "09:45 AM",
      weightKg: 30,
      assignedTransportId: "TR-000021",
      assignedTransportName: "Arun Kumar",
      assignedVehicleNo: "TN-51-AB-4321",
      qualityGrade: "A",
      fishTags: ["SQUID-02", "SQUID-03"],
      gpsPickup: "10.7654, 79.8428",
      pickedUpAtUtc: new Date().toISOString(),
      notes: "Transit started",
      temperatureLogs: [
        {
          value: "4°C",
          recordedAtUtc: new Date().toISOString(),
          operatorId: "TR-000021",
        },
      ],
    },
    {
      id: "RV-CRATE-000110",
      source: "Scheduled from collection centre",
      status: "scheduled",
      date: offsetDateKey(today, -1),
      collectionCentre: "Nagapattinam Centre",
      destination: "Delta Processor Unit",
      scheduledTime: "02:00 PM",
      weightKg: 26,
      assignedTransportId: "TR-000021",
      assignedTransportName: "Arun Kumar",
      assignedVehicleNo: "TN-51-AB-4321",
      qualityGrade: "A",
      fishTags: ["LOBSTER-01"],
      notes: "Yesterday schedule",
      temperatureLogs: [],
    },
    {
      id: "RV-CRATE-000111",
      source: "Picked by transport operator",
      status: "in_transit",
      date: offsetDateKey(today, -1),
      collectionCentre: "Nagapattinam Centre",
      destination: "Export Packing Hub",
      scheduledTime: "01:00 PM",
      weightKg: 33,
      assignedTransportId: "TR-000021",
      assignedTransportName: "Arun Kumar",
      assignedVehicleNo: "TN-51-AB-4321",
      qualityGrade: "A+",
      fishTags: ["TUNA-09"],
      gpsPickup: "10.7640, 79.8401",
      pickedUpAtUtc: new Date().toISOString(),
      notes: "Handled yesterday",
      temperatureLogs: [],
    },
  ];
}