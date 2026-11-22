import React from "react";

/** A single animated placeholder bar. */
export function SkeletonBar({ width = "100%", height = 16 }: { width?: string | number; height?: number }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 4,
        background: "linear-gradient(90deg, var(--border) 25%, var(--card) 50%, var(--border) 75%)",
        backgroundSize: "200% 100%",
        animation: "skeleton-shimmer 1.4s infinite",
      }}
    />
  );
}

export interface SkeletonProps {
  variant?: "table" | "card";
  rows?: number;
}

/**
 * Skeleton placeholder that mirrors the shape of an EventTable row or detail card.
 * Renders `rows` placeholder rows to reduce layout shift (CLS) when data loads.
 */
export default function Skeleton({ variant = "table", rows = 5 }: SkeletonProps) {
  return (
    <>
      <style>{`
        @keyframes skeleton-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {variant === "card" ? (
        <div style={{ display: "grid", gap: 12 }}>
          {Array.from({ length: rows }).map((_, i) => {
            const widths = ["60%", "40%", "80%", "50%", "70%", "45%"];
            const valWidth = widths[i % widths.length];
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 16,
                  alignItems: "center",
                }}
              >
                <div style={{ minWidth: 100, flexShrink: 0 }}>
                  <SkeletonBar width="80px" height={14} />
                </div>
                <div style={{ flex: 1 }}>
                  <SkeletonBar width={valWidth} height={14} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <>
          {/* Fake table header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "60px 90px 120px 1fr",
              gap: 12,
              padding: "8px 12px",
              borderBottom: "1px solid var(--border)",
              marginBottom: 4,
            }}
          >
            {["40%", "60%", "80%", "50%"].map((w, i) => (
              <SkeletonBar key={i} width={w} height={12} />
            ))}
          </div>

          {/* Fake rows */}
          {Array.from({ length: rows }).map((_, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "60px 90px 120px 1fr",
                gap: 12,
                padding: "10px 12px",
                borderBottom: "1px solid var(--border)",
                alignItems: "center",
              }}
            >
              <SkeletonBar width="70%" />
              <SkeletonBar width="90%" />
              <SkeletonBar width="60%" height={20} />
              <SkeletonBar width="80%" />
            </div>
          ))}
        </>
      )}
    </>
  );
}

