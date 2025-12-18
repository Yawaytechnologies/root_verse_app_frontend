import React, { useMemo } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Stage, useTrace } from "../../../src/data/wild/trace.store";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <View className={`rounded-2xl border border-slate-200 bg-white ${className}`}>{children}</View>;
}

function Chip({ label, tone }: { label: string; tone: "slate" | "green" | "amber" | "blue" }) {
  const m = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    blue: "bg-sky-100 text-sky-700",
  };
  return (
    <View className={`self-start rounded-full px-2.5 py-1 ${m[tone]}`}>
      <Text className="text-xs font-semibold">{label}</Text>
    </View>
  );
}

function StageCard({
  title,
  desc,
  done,
  meta,
  onPress,
}: {
  title: string;
  desc: string;
  done: boolean;
  meta?: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="rounded-2xl border border-slate-200 bg-white p-4 active:opacity-80">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-base font-bold text-slate-900">{title}</Text>
          <Text className="mt-1 text-xs text-slate-600">{desc}</Text>
          {meta ? <Text className="mt-2 text-[11px] text-slate-500">{meta}</Text> : null}
        </View>
        <Chip label={done ? "DONE" : "PENDING"} tone={done ? "green" : "amber"} />
      </View>
    </Pressable>
  );
}

export default function TraceWizard() {
  const { crateId } = useLocalSearchParams<{ crateId: string }>();
  const id = String(crateId || "");
  const trace = useTrace();

  const stages = trace.getStages(id);

  const progress = useMemo(() => {
    const total = 4;
    const done = (["TRIP", "CATCH", "LANDING", "TRANSPORT"] as Stage[]).filter((s) => stages[s].done).length;
    return { done, total };
  }, [stages]);

  const nextStage = useMemo<Stage>(() => {
    if (!stages.TRIP.done) return "TRIP";
    if (!stages.CATCH.done) return "CATCH";
    if (!stages.LANDING.done) return "LANDING";
    return "TRANSPORT";
  }, [stages]);

  const openStage = (s: Stage) => {
    // ✅ connect to your existing forms
    if (s === "TRIP") return router.push({ pathname: "/(wild)/trips/create", params: { crateId: id } } as any);
    if (s === "CATCH") return router.push({ pathname: "/(wild)/catch-logs/create", params: { crateId: id } } as any);
    if (s === "LANDING") return router.push({ pathname: `/(wild)/trace/${id}/landing`, params: { crateId: id } } as any);
    return router.push({ pathname: `/(wild)/trace/${id}/transport`, params: { crateId: id } } as any);
  };

  const meta = (s: Stage) => {
    const l = stages[s].latest;
    if (!l) return undefined;
    const when = new Date(l.createdAt).toLocaleString();
    return `Updated: ${when}${l.createdBy ? ` · By: ${l.createdBy}` : ""}`;
  };

  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerClassName="p-4 pb-10">
      <Card className="p-4">
        <Text className="text-lg font-bold text-slate-900">Trace Wizard</Text>
        <Text className="mt-1 text-sm text-slate-600">Scan sticker → fill stages → trace ready.</Text>

        <View className="mt-3 flex-row items-center justify-between">
          <View>
            <Text className="text-xs text-slate-500">Sticker / Crate ID</Text>
            <Text className="mt-1 text-base font-bold text-slate-900">{id}</Text>
          </View>
          <Chip label={`${progress.done}/${progress.total}`} tone={progress.done === 4 ? "green" : "blue"} />
        </View>

        <Pressable onPress={() => openStage(nextStage)} className="mt-4 rounded-2xl bg-slate-900 p-4 active:opacity-90">
          <Text className="text-center text-white font-semibold">Continue: {nextStage}</Text>
        </Pressable>

        <Pressable
          onPress={() => trace.resetCrate(id)}
          className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 active:opacity-80"
        >
          <Text className="text-center font-semibold text-slate-900">Reset (demo)</Text>
        </Pressable>
      </Card>

      <View className="mt-4 gap-3">
        <StageCard
          title="Trip Details"
          desc="Trip ID, port, method, start date, etc."
          done={stages.TRIP.done}
          meta={meta("TRIP")}
          onPress={() => openStage("TRIP")}
        />
        <StageCard
          title="Catch Log Details"
          desc="Species, weight, FAO, time, gear, GPS."
          done={stages.CATCH.done}
          meta={meta("CATCH")}
          onPress={() => openStage("CATCH")}
        />
        <StageCard
          title="Landing Details"
          desc="Landed port/time, landed weight, buyer."
          done={stages.LANDING.done}
          meta={meta("LANDING")}
          onPress={() => openStage("LANDING")}
        />
        <StageCard
          title="Transport Details"
          desc="Vehicle, route, dispatch/arrival, receiver."
          done={stages.TRANSPORT.done}
          meta={meta("TRANSPORT")}
          onPress={() => openStage("TRANSPORT")}
        />
      </View>

      {/* Timeline preview */}
      <View className="mt-6">
        <Text className="mb-2 text-base font-bold text-slate-900">Timeline</Text>
        <Card className="p-4">
          {trace.getTimeline(id).length === 0 ? (
            <Text className="text-sm text-slate-600">No events yet. Start with Trip.</Text>
          ) : (
            trace.getTimeline(id).map((e) => (
              <View key={e.id} className="mb-3">
                <Text className="text-sm font-semibold text-slate-900">{e.stage}</Text>
                <Text className="text-xs text-slate-500">{new Date(e.createdAt).toLocaleString()}</Text>
              </View>
            ))
          )}
        </Card>
      </View>
    </ScrollView>
  );
}
