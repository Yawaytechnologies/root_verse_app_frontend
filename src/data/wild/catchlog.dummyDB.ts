type QrStatus = "NEW" | "FILLED";

export type DummyDetails = {
  crateId: string;
  catchLog: {
    catchId: string;
    tripId: string;
    species: string;
    weightKg: number;
    catchDate: string;
    catchTime?: string;
    notes?: string;
    linkedCrateId: string;
  };
  owner: {
    ownerId: string;
    name: string;
    phone: string;
  };
  vessel: {
    rvVesselId: string;
    vesselName: string;
    homePort: string;
    vesselType?: string;
  };
};

const qrStatusMap: Record<string, { status: QrStatus; catchId?: string }> = {
  "RV-CRATE-000123": { status: "NEW" },
  "RV-CRATE-000999": { status: "FILLED", catchId: "C250092" },
};

const detailsMap: Record<string, DummyDetails> = {
  "RV-CRATE-000999": {
    crateId: "RV-CRATE-000999",
    catchLog: {
      catchId: "C250092",
      tripId: "T250057",
      species: "Seer Fish",
      weightKg: 44,
      catchDate: "2025-12-14",
      catchTime: "06:40",
      notes: "Dummy saved catch log",
      linkedCrateId: "RV-CRATE-000999",
    },
    owner: {
      ownerId: "OWN-0009",
      name: "Owner Demo",
      phone: "9000000000",
    },
    vessel: {
      rvVesselId: "RV-VES-NA026829",
      vesselName: "Demo Vessel",
      homePort: "Nagapattinam",
      vesselType: "Trawl",
    },
  },
};

export function dummyGetQrStatus(crateId: string) {
  const row = qrStatusMap[crateId];
  if (!row) return { crateId, status: "NEW" as const };
  return { crateId, status: row.status, catchId: row.catchId };
}

export function dummyGetDetails(crateId: string): DummyDetails {
  // if not found, create a “filled-ish” placeholder (optional)
  const existing = detailsMap[crateId];
  if (existing) return existing;

  // fallback dummy details
  return {
    crateId,
    catchLog: {
      catchId: "C-DUMMY-0001",
      tripId: "T250043",
      species: "Yellowfin Tuna",
      weightKg: 80,
      catchDate: "2025-12-07",
      catchTime: "07:10",
      notes: "Auto dummy details (API unavailable)",
      linkedCrateId: crateId,
    },
    owner: { ownerId: "OWN-DUMMY", name: "Dummy Owner", phone: "9999999999" },
    vessel: {
      rvVesselId: "RV-VES-DUMMY",
      vesselName: "Dummy Vessel",
      homePort: "Chennai",
      vesselType: "Gillnet",
    },
  };
}

export function dummySaveCatchLog(payload: {
  linkedCrateId: string;
  catchId: string;
  tripId: string;
  species: string;
  weightKg: number;
  catchDate: string;
  catchTime?: string;
  notes?: string;
}) {
  const crateId = payload.linkedCrateId;

  qrStatusMap[crateId] = { status: "FILLED", catchId: payload.catchId };

  detailsMap[crateId] = {
    crateId,
    catchLog: {
      catchId: payload.catchId,
      tripId: payload.tripId,
      species: payload.species,
      weightKg: payload.weightKg,
      catchDate: payload.catchDate,
      catchTime: payload.catchTime,
      notes: payload.notes,
      linkedCrateId: crateId,
    },
    owner: {
      ownerId: "OWN-LOCAL",
      name: "Local Owner",
      phone: "9000000000",
    },
    vessel: {
      rvVesselId: "RV-VES-LOCAL",
      vesselName: "Local Vessel",
      homePort: "Nagapattinam",
      vesselType: "Trawl",
    },
  };

  return detailsMap[crateId];
}
