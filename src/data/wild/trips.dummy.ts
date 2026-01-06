// src/data/wild/trips.dummy.ts
export type TripStatus = "PENDING" | "APPROVED" | "REJECTED" | "ONGOING" | "COMPLETED";

export type Trip = {
  tripId: string;              // unique id
  tripName: string;            // display
  ownerName: string;
  registrationNo: string;
  method: string;
  landingCenter: string;
  locationCode: string;
  plannedTripDateTime: string; // "YYYY-MM-DD hh:mm AM/PM"
  expectedReturnDate?: string | null; // "YYYY-MM-DD"
  crewCount: number;
  status: TripStatus;
  createdAt: string;
};

// ✅ in-memory dummy DB (restarts on reload)
let TRIPS_DB: Trip[] = [
  {
    tripId: "TN02F5678/20250726_1531",
    tripName: "TN02F5678/20250726_1531",
    ownerName: "Sriharan",
    registrationNo: "TN02F5678",
    method: "Pole & Line",
    landingCenter: "Chennai Landing Centre",
    locationCode: "CHN",
    plannedTripDateTime: "2025-07-26 03:31 PM",
    expectedReturnDate: "2025-07-28",
    crewCount: 5,
    status: "APPROVED",
    createdAt: new Date().toISOString(),
  },
  {
    tripId: "TN02F5678/20250710_0915",
    tripName: "TN02F5678/20250710_0915",
    ownerName: "Sriharan",
    registrationNo: "TN02F5678",
    method: "Gillnet",
    landingCenter: "Nagapattinam Landing Centre",
    locationCode: "NAG",
    plannedTripDateTime: "2025-07-10 09:15 AM",
    expectedReturnDate: null,
    crewCount: 3,
    status: "PENDING",
    createdAt: new Date().toISOString(),
  },
];

export function listTrips(): Trip[] {
  return [...TRIPS_DB].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getTripById(tripId: string): Trip | undefined {
  return TRIPS_DB.find((t) => t.tripId === tripId);
}

export function createTrip(payload: Omit<Trip, "status" | "createdAt">): Trip {
  const trip: Trip = {
    ...payload,
    status: "PENDING", // ✅ request goes to admin
    createdAt: new Date().toISOString(),
  };
  TRIPS_DB = [trip, ...TRIPS_DB];
  return trip;
}

// ✅ admin simulation (for testing)
export function approveTrip(tripId: string): Trip | undefined {
  const t = getTripById(tripId);
  if (!t) return;
  t.status = "APPROVED";
  return t;
}

export function rejectTrip(tripId: string): Trip | undefined {
  const t = getTripById(tripId);
  if (!t) return;
  t.status = "REJECTED";
  return t;
}
