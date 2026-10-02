type StatusBadgeProps = {
  label: string;
  tone: "positive" | "neutral";
};

export function StatusBadge({ label, tone }: StatusBadgeProps) {
  const colors = tone === "positive" ? "bg-green-100 text-green-800" : "bg-zinc-100 text-zinc-700";
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colors}`}>{label}</span>;
}
