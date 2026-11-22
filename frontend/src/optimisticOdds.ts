export interface OddsPreview {
  value: number | null;
  pending: boolean;
}

export function getOptimisticOddsPreview(
  currentOdds: number,
  optimisticBetCount: number,
  position: "for" | "against" = "for",
): OddsPreview {
  if (optimisticBetCount > 0) {
    const adjustment = optimisticBetCount * 0.01;
    return {
      value: position === "for"
        ? Math.max(0, currentOdds - adjustment)
        : currentOdds + adjustment,
      pending: true,
    };
  }
  return { value: currentOdds, pending: false };
}
