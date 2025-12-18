import React, { createContext, useContext, useMemo, useState } from "react";

export type Stage = "TRIP" | "CATCH" | "LANDING" | "TRANSPORT";

export type TraceEvent = {
  id: string;
  crateId: string;
  stage: Stage;
  data: any;
  createdAt: string;
  createdBy?: string;
};

type TraceCtx = {
  events: TraceEvent[];
  addEvent: (args: { crateId: string; stage: Stage; data: any; createdBy?: string }) => void;
  getStages: (crateId: string) => Record<Stage, { done: boolean; latest?: TraceEvent }>;
  getTimeline: (crateId: string) => TraceEvent[];
  resetCrate: (crateId: string) => void;
};

const Ctx = createContext<TraceCtx | null>(null);

const nowStr = () => new Date().toISOString();

const uid = () => `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;

export function TraceProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<TraceEvent[]>([]);

  const addEvent: TraceCtx["addEvent"] = ({ crateId, stage, data, createdBy }) => {
    const e: TraceEvent = {
      id: uid(),
      crateId,
      stage,
      data,
      createdAt: nowStr(),
      createdBy,
    };
    setEvents((prev) => [e, ...prev]); // newest first
  };

  const getTimeline: TraceCtx["getTimeline"] = (crateId) =>
    events
      .filter((e) => e.crateId === crateId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const getStages: TraceCtx["getStages"] = (crateId) => {
    const crateEvents = events.filter((e) => e.crateId === crateId);
    const latest = (stage: Stage) =>
      crateEvents
        .filter((e) => e.stage === stage)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    const stages: Stage[] = ["TRIP", "CATCH", "LANDING", "TRANSPORT"];
    const out: any = {};
    for (const s of stages) {
      const l = latest(s);
      out[s] = { done: !!l, latest: l };
    }
    return out as Record<Stage, { done: boolean; latest?: TraceEvent }>;
  };

  const resetCrate: TraceCtx["resetCrate"] = (crateId) => {
    setEvents((prev) => prev.filter((e) => e.crateId !== crateId));
  };

  const value = useMemo(
    () => ({ events, addEvent, getStages, getTimeline, resetCrate }),
    [events]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTrace() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTrace must be used inside TraceProvider");
  return ctx;
}
