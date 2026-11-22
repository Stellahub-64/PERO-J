interface Props {
  value: number | null;
  pending?: boolean;
  decimals?: number;
}

export default function OptimisticOddsPreview({
  value,
  pending = false,
  decimals = 2,
}: Props) {
  return (
    <span aria-live="polite" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      {pending && <span className="pending-spinner" aria-label="Updating odds" />}
      <span>{value === null ? "--" : value.toFixed(decimals)}</span>
    </span>
  );
}
