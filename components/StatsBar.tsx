"use client";

import { PoCRequest } from "@/lib/types";

export default function StatsBar({ pocs }: { pocs: PoCRequest[] }) {
  const qualified = pocs.filter((p) => p.status === "qualified");
  const pending = pocs.filter((p) => p.status === "pending" || p.status === "researching");
  const errors = pocs.filter((p) => p.status === "error");

  const highComplexity = qualified.filter((p) => p.technicalComplexity === "HIGH").length;
  const medComplexity = qualified.filter((p) => p.technicalComplexity === "MEDIUM").length;
  const lowComplexity = qualified.filter((p) => p.technicalComplexity === "LOW").length;

  const needsPE = qualified.filter((p) => p.routing === "Product Engineer Required").length;
  const needsSE = qualified.filter((p) => p.routing === "Sales Engineer OK").length;
  const aeHandle = qualified.filter((p) => p.routing === "AE Can Handle").length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatCard
        label="Total POCs"
        value={pocs.length}
        sub={`${pending.length} pending · ${errors.length} error`}
        color="border-gray-700"
        icon="📊"
      />
      <StatCard
        label="Qualified"
        value={qualified.length}
        sub={`HIGH: ${highComplexity} · MED: ${medComplexity} · LOW: ${lowComplexity}`}
        color="border-emerald-700/40"
        icon="✅"
      />
      <StatCard
        label="Needs Eng"
        value={needsPE}
        sub="Product Engineer Required"
        color="border-red-700/40"
        icon="🔴"
      />
      <StatCard
        label="SE / AE"
        value={needsSE + aeHandle}
        sub={`SE: ${needsSE} · AE: ${aeHandle}`}
        color="border-yellow-700/40"
        icon="🟡"
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  color,
  icon,
}: {
  label: string;
  value: number;
  sub: string;
  color: string;
  icon: string;
}) {
  return (
    <div className={`bg-gray-900 border ${color} rounded-xl p-4`}>
      <div className="flex items-center gap-2 mb-1">
        <span>{icon}</span>
        <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{sub}</div>
    </div>
  );
}
