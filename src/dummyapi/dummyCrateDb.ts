import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Crate } from "../types/models";

const KEY = "dummy.crates.v1";

type DummyState = {
  crates: Record<string, Crate>; // key = qrValue
};

async function readState(): Promise<DummyState> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return { crates: {} };

  try {
    return JSON.parse(raw) as DummyState;
  } catch {
    return { crates: {} };
  }
}

async function writeState(st: DummyState) {
  await AsyncStorage.setItem(KEY, JSON.stringify(st));
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function mkCrate(qrValue: string): Crate {
  const num =
    Number(String(qrValue).replace(/\D+/g, "")) ||
    Math.floor(Math.random() * 999999);

  return {
    id: num,
    qrId: num,
    crateCode: `CR-${num}`,
    status: "AT_COLLECTION_POINT", // important: not received yet
    custody: "WILD_CAPTURE",
    qrValue: qrValue as any,
    centreId: null as any,
    operatorId: null as any,
    assignedTransportOperatorId: null as any,
    fishType: "Tuna" as any,
    weight: 25 as any,
    source: "Wild Capture" as any,
  };
}

/** Scan / fetch crate detail before receive */
export async function dummyCentreGetCrateByQr(params: {
  qrValue: string;
}): Promise<Crate> {
  const st = await readState();

  let crate = st.crates[params.qrValue];

  if (!crate) {
    crate = mkCrate(params.qrValue);
    st.crates[params.qrValue] = crate;
    await writeState(st);
  }

  await sleep(250);
  return crate;
}

/** Verify + receive crate */
export async function dummyCentreReceive(params: {
  qrValue: string;
  centreId: number;
  operatorId: number;
}): Promise<Crate> {
  const st = await readState();

  const existing = st.crates[params.qrValue] || mkCrate(params.qrValue);

  const updated: Crate = {
    ...existing,
    status: "RECEIVED_AT_CENTRE",
    custody: "CENTRE",
    centreId: params.centreId as any,
    operatorId: params.operatorId as any,
  };

  st.crates[params.qrValue] = updated;
  await writeState(st);

  await sleep(350);
  return updated;
}

export async function dummyCentreSchedule(params: {
  qrValue: string;
  centreId: number;
  destinationId: number;
  transportOperatorId: number;
  scheduledAtUtc: string;
}): Promise<Crate> {
  const st = await readState();

  const base = st.crates[params.qrValue] || mkCrate(params.qrValue);

  const updated: Crate = {
    ...base,
    status: "SCHEDULED_FOR_DISPATCH",
    custody: "CENTRE",
    centreId: params.centreId as any,
    assignedTransportOperatorId: params.transportOperatorId as any,
    destinationId: params.destinationId as any,
    scheduledAtUtc: params.scheduledAtUtc as any,
  };

  st.crates[params.qrValue] = updated;
  await writeState(st);

  await sleep(350);
  return updated;
}

export async function dummyCentreTempLog(params: {
  qrValue: string;
  centreId: number;
  tempC: number;
  operatorId?: number;
}): Promise<{ ok: true }> {
  const st = await readState();

  const base = st.crates[params.qrValue] || mkCrate(params.qrValue);

  const updated: Crate = {
    ...base,
    centreId: params.centreId as any,
    operatorId: params.operatorId as any,
    lastTempC: params.tempC as any,
    lastTempLoggedAt: new Date().toISOString() as any,
  };

  st.crates[params.qrValue] = updated;
  await writeState(st);

  await sleep(200);
  return { ok: true };
}