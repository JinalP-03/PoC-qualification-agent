"use client";

import { POCRequest } from "@/lib/types";

const complexityColor = (c?: string) => {
  if (c === "HIGH") return "bg-red-900/50 text-red-300 border border-red-700";
  if (c === "MEDIUM") return "bg-yellow-900/50 text-yellow-300 border border-yellow-700";
  return "bg-green-900/50 text-green-300 border border-green-700";
};

const buyerColor = (b?: string) => {
  if (b === "Technical") return "bg-blue-900/50 text-blue-300 border border-blue-700";
  if (b === "Semi-Technical") return "bg-purple-900/50 text-purple-300 border border-purple-700";
  return "bg-gray-700/50 text-gray-300 border border-gray-600";
};

const routingColor = (r?: string) => {
  if (r === "Product Engineer Required") return "bg-red-900/50 text-red-300 border border-red-700";
  if (r === "Sales Engineer OK") return "bg-yellow-900/50 text-yellow-300 border border-yellow-700";
  return "bg-green-900/50 text-green-300 border border-green-700";
};

export default function DetailModal({
  poc,
  onClose,
}: {
  poc: POCRequest;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-xl max-w-2xl w-full max-h-[88vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Modal header */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold text-white">{poc.company}</h2>
              <p className="text-sm text-gray-400 mt-0.5">
                {poc.contactName} · {poc.contactRole}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-white text-2xl leading-none w-8 h-8 flex items-center justify-center hover:bg-gray-700 rounded-lg transition-colors"
            >
              ×
            </button>
          </div>

          <div className="space-y-5">
            {/* Use case */}
            <Section title="Use Case">
              <p className="text-sm text-gray-300 leading-relaxed">{poc.useCase}</p>
            </Section>

            {/* Qualification */}
            {(poc.technicalComplexity || poc.buyerLevel || poc.routing) && (
              <Section title="Qualification">
                <div className="flex flex-wrap gap-2">
                  {poc.technicalComplexity && (
                    <Badge
                      label={`Complexity: ${poc.technicalComplexity}`}
                      color={complexityColor(poc.technicalComplexity)}
                    />
                  )}
                  {poc.buyerLevel && (
                    <Badge
                      label={`Buyer: ${poc.buyerLevel}`}
                      color={buyerColor(poc.buyerLevel)}
                    />
                  )}
                  {poc.routing && (
                    <Badge label={poc.routing} color={routingColor(poc.routing)} />
                  )}
                </div>
              </Section>
            )}

            {/* Demo Brief */}
            {poc.demoBrief && (
              <Section title="Demo Brief">
                <div className="prose prose-invert prose-sm max-w-none">
                  <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed bg-gray-950/50 p-4 rounded-lg border border-gray-800">
                    {poc.demoBrief}
                  </pre>
                </div>
              </Section>
            )}

            {/* Research Notes */}
            {poc.researchNotes && (
              <Section title="Research Notes">
                <pre className="text-xs text-gray-400 whitespace-pre-wrap font-mono bg-gray-950 p-4 rounded-lg border border-gray-800 overflow-x-auto">
                  {poc.researchNotes}
                </pre>
              </Section>
            )}

            {/* Footer */}
            {poc.processedAt && (
              <p className="text-xs text-gray-600 pt-2 border-t border-gray-800">
                Processed: {new Date(poc.processedAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${color}`}>
      {label}
    </span>
  );
}
