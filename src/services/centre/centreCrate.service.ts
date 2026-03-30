import { apiFetch } from "../../dummyapi/client";
import type { Crate } from "../../types/models";
import {
  dummyCentreGetCrateByQr,
  dummyCentreReceive,
  dummyCentreSchedule,
  dummyCentreTempLog,
} from "../../dummyapi/dummyCrateDb";

const FORCE_DUMMY =
  String(process.env.EXPO_PUBLIC_USE_DUMMY_API || "").toLowerCase() === "true";

async function tryReal<T>(fn: () => Promise<T>): Promise<T | null> {
  if (FORCE_DUMMY) return null;
  try {
    return await fn();
  } catch {
    return null;
  }
}

export type CentreGetCrateByQrParams = {
  qrValue: string;
};

export type CentreReceiveParams = {
  qrValue: string;
  centreId: number;
  operatorId: number;
};

export type CentreScheduleParams = {
  qrValue: string;
  centreId: number;
  destinationId: number;
  transportOperatorId: number;
  scheduledAtUtc: string;
};

export type CentreTempParams = {
  qrValue: string;
  centreId: number;
  tempC: number;
  operatorId?: number;
};

export const centreCrateService = {
  async getByQr(params: CentreGetCrateByQrParams): Promise<Crate> {
    const real = await tryReal(() =>
      apiFetch<Crate>(
        `/api/centre/crates/by-qr?qrValue=${encodeURIComponent(params.qrValue)}`,
        {
          method: "GET",
        }
      )
    );

    return real ?? dummyCentreGetCrateByQr(params);
  },

  async receive(params: CentreReceiveParams): Promise<Crate> {
    const real = await tryReal(() =>
      apiFetch<Crate>("/api/centre/crates/receive", {
        method: "POST",
        body: JSON.stringify(params),
      })
    );

    return real ?? dummyCentreReceive(params);
  },

  async scheduleDispatch(params: CentreScheduleParams): Promise<Crate> {
    const real = await tryReal(() =>
      apiFetch<Crate>("/api/centre/crates/schedule", {
        method: "POST",
        body: JSON.stringify(params),
      })
    );

    return real ?? dummyCentreSchedule(params);
  },

  async logTemp(params: CentreTempParams): Promise<{ ok: true }> {
    const real = await tryReal(() =>
      apiFetch<{ ok: true }>("/api/centre/crates/temp", {
        method: "POST",
        body: JSON.stringify(params),
      })
    );

    return real ?? dummyCentreTempLog(params);
  },
};