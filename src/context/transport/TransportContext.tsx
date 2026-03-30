import React, { createContext, useContext, useMemo, useState } from "react";
import {
  buildDummyTransportCrates,
  DUMMY_TRANSPORT_PROFILE,
  formatDateKey,
} from "../../data/transport/dummyTransportData";
import {
  ScanResult,
  TemperatureLog,
  TransportCrate,
  TransportProfile,
} from "../../types/transport";

type TransportContextValue = {
  currentTransport: TransportProfile;
  selectedDate: string;
  setSelectedDate: React.Dispatch<React.SetStateAction<string>>;
  crates: TransportCrate[];
  assignedCrates: TransportCrate[];
  inTransitCrates: TransportCrate[];
  allScheduledNotMine: TransportCrate[];
  stats: {
    assigned: number;
    inTransit: number;
    totalMyCrates: number;
  };
  getCrateById: (crateId: string) => TransportCrate | undefined;
  scanCrate: (crateId: string) => ScanResult;
  logTemperature: (crateId: string, value: string) => ScanResult;
};

const TransportContext = createContext<TransportContextValue | null>(null);

export function TransportProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const today = formatDateKey(new Date());

  const [selectedDate, setSelectedDate] = useState(today);
  const [crates, setCrates] = useState<TransportCrate[]>(
    buildDummyTransportCrates(today)
  );

  const currentTransport = DUMMY_TRANSPORT_PROFILE;

  const visibleCratesForDate = useMemo(() => {
    return crates.filter((item) => item.date === selectedDate);
  }, [crates, selectedDate]);

  const assignedCrates = useMemo(() => {
    return visibleCratesForDate.filter(
      (item) =>
        item.assignedTransportId === currentTransport.id &&
        item.status === "scheduled"
    );
  }, [visibleCratesForDate, currentTransport.id]);

  const inTransitCrates = useMemo(() => {
    return visibleCratesForDate.filter(
      (item) =>
        item.assignedTransportId === currentTransport.id &&
        item.status === "in_transit"
    );
  }, [visibleCratesForDate, currentTransport.id]);

  const allScheduledNotMine = useMemo(() => {
    return visibleCratesForDate.filter(
      (item) =>
        item.status === "scheduled" &&
        item.assignedTransportId !== currentTransport.id
    );
  }, [visibleCratesForDate, currentTransport.id]);

  const stats = useMemo(() => {
    const totalMyCrates = visibleCratesForDate.filter(
      (item) => item.assignedTransportId === currentTransport.id
    ).length;

    return {
      assigned: assignedCrates.length,
      inTransit: inTransitCrates.length,
      totalMyCrates,
    };
  }, [assignedCrates.length, inTransitCrates.length, visibleCratesForDate, currentTransport.id]);

  const getCrateById = (crateId: string) => {
    return crates.find((item) => item.id === crateId);
  };

  const scanCrate = (crateId: string): ScanResult => {
    const crate = crates.find((item) => item.id.trim() === crateId.trim());

    if (!crate) {
      return {
        ok: false,
        message: "Invalid QR. Crate not found.",
      };
    }

    if (crate.assignedTransportId !== currentTransport.id) {
      return {
        ok: false,
        message: "Crate not assigned to this transport.",
      };
    }

    if (crate.status !== "scheduled") {
      return {
        ok: false,
        message: `Crate cannot be picked now. Current status is ${crate.status}.`,
      };
    }

    const updatedCrate: TransportCrate = {
      ...crate,
      status: "in_transit",
      source: "Picked by transport operator",
      gpsPickup: currentTransport.gps,
      pickedUpAtUtc: new Date().toISOString(),
      assignedTransportName: currentTransport.name,
      assignedVehicleNo: currentTransport.vehicleNo,
    };

    setCrates((prev) =>
      prev.map((item) => (item.id === updatedCrate.id ? updatedCrate : item))
    );

    return {
      ok: true,
      message: `${updatedCrate.id} verified and moved to In Transit.`,
      crate: updatedCrate,
    };
  };

  const logTemperature = (crateId: string, value: string): ScanResult => {
    const crate = crates.find((item) => item.id === crateId);

    if (!crate) {
      return {
        ok: false,
        message: "Crate not found.",
      };
    }

    if (crate.status !== "in_transit") {
      return {
        ok: false,
        message: "Temperature can be logged only for In Transit crates.",
      };
    }

    const log: TemperatureLog = {
      value: value.trim(),
      recordedAtUtc: new Date().toISOString(),
      operatorId: currentTransport.id,
    };

    const updatedCrate: TransportCrate = {
      ...crate,
      temperatureLogs: [...(crate.temperatureLogs ?? []), log],
    };

    setCrates((prev) =>
      prev.map((item) => (item.id === updatedCrate.id ? updatedCrate : item))
    );

    return {
      ok: true,
      message: `Temperature ${value.trim()} recorded for ${crate.id}.`,
      crate: updatedCrate,
    };
  };

  return (
    <TransportContext.Provider
      value={{
        currentTransport,
        selectedDate,
        setSelectedDate,
        crates,
        assignedCrates,
        inTransitCrates,
        allScheduledNotMine,
        stats,
        getCrateById,
        scanCrate,
        logTemperature,
      }}
    >
      {children}
    </TransportContext.Provider>
  );
}

export function useTransport() {
  const context = useContext(TransportContext);

  if (!context) {
    throw new Error("useTransport must be used inside TransportProvider");
  }

  return context;
}