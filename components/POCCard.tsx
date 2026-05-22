"use client";

import { POCRequest } from "@/lib/types";

const complexityColor = (c?: string) => {
  if (c === "HIGH") return "bg-red-900/60 text-red-300 border-red-700";
  if (c === "MEDIUM") return "bg-yellow-900/60 text-yellow-300 border-yellow-700";
  if (c === "LOW") return "bg-green-900/60 text-green-300 border-green-700";
  return "bg-gray-800 text-gray-400 border-gray-700";
};

const buyerColor = (b?: string) => {
  if (b === "Technical") return "bg-blue-900/60 text-blue-300 border-blue-700";
  if (b === "Semi-Technical") return "bg-purple-900/60 text-purple-300 border-purple-700";
  if (b === "Non-Technical") return "bg-gray-700/60 text-gray-300 border-gray-600";
  return "bg-gray-800 text-gray-400 border-gray-700";
};

const routingIcon = (r?: string) => {
  if (r === "Product Engineer Required") return "🔴";
  if (r === "Sales Engineer OK") return "🟡";
  if (r === "AE Can Handle") return "🟢";
  return "⚪";
};

const routingColor = (r?: string) => {
  if (r === "Product Engineer Required") return "text-red-400";
  if (r === "Sales Engineer OK") return "text-yellow-400";
  if (r === "AE Can Handle") return "text-green-400";
  return "text-gray-400";
};

const statusStyles: Record<string, string> = {
  pending: "bg-gray-700 text-gray-300",
  researching: "bg-blue-900/60 text-blue-300 animate-pulse",
  qualified: "bg-emerald-900/60 text-emerald-300",
  error: "bg-red-900/60 text-red-300",
};

const cardBorderColor = (poc: POCRequest) => {
  if (poc.status === "error") return "border-red-800/60";
  if (poc.status === "researching") return "border-blue-700/60";
  if (poc.technicalComplexity === "HIGH") return "border-red-700/40";
  if (poc.technicalComplexity === "MEDIUM") return "border-yellow-700/40";
  if (poc.technicalComplexity === "LOW") return "border-green-700/40";
  return "border-gray-700/60";
};

export default function POCCard({
  poc,
  onClick,
}: {
  poc: POCRequest;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-gray-900 border ${cardBorderColor(poc)} rounded-xl p-5 cursor-pointer hover:bg-gray-800/80 transition-all hover:scale-[1.01] hover:shadow-xl group`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white truncate">{poc.company}</h3>
          <p className="text-sm text-gray-400 truncate">
            {poc.contactName} · {poc.contactRole}
          </p>
        </div>
        <span
          className={`ml-2 shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[poc.status] || statusStyles.pending}`}
        >
          {poc.status}
        </span>
      </div>

      {/* Use case */}
      <p className="text-sm text-gray-300 line-clamp-2 mb-3 leading-relaxed">
        {poc.useCase}
      </p>

      {/* Qualification badges */}
      {poc.technicalComplexity || poc.buyerLevel ? (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {poc.technicalComplexity && (
            <span
              className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${complexityColor(poc.technicalComplexity)}`}
            >
              {poc.technicalComplexity}
            </span>
          )}
          {poc.buyerLevel && (
            <span
              className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${buyerColor(poc.buyerLevel)}`}
            >
              {poc.buyerLevel}
            </span>
          )}
        </div>
      ) : null}

      {/* Routing */}
      {poc.routing && (
        <div
          className={`flex items-center gap-1.5 text-sm font-semibold ${routingColor(poc.routing)}`}
        >
          <span>{routingIcon(poc.routing)}</span>
          <span>{poc.routing}</span>
        </div>
      )}

      {/* Error */}
      {poc.status === "error" && poc.researchNotes && (
        <p className="text-xs text-red-400 mt-2 line-clamp-2">
          {poc.researchNotes}
        </p>
      )}

      {/* Click hint */}
      <div className="mt-3 pt-3 border-t border-gray-800 flex items-center justify-between">
        <span className="text-xs text-gray-600">
          {poc.processedAt
            ? `Processed ${new Date(poc.processedAt).toLocaleDateString()}`
            : "Awaiting processing"}
        </span>
        <span className="text-xs text-gray-600 group-hover:text-blue-400 transition-colors">
          View brief →
        </span>
      </div>
    </div>
  );
}
