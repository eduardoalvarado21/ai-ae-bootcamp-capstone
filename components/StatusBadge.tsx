import type { CheckStatus } from "@/lib/types";

const styles: Record<CheckStatus, string> = {
  success: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  failure: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
  pending: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
};

const label: Record<CheckStatus, string> = {
  success: "passing",
  failure: "failing",
  pending: "pending",
};

export default function StatusBadge({ status }: { status: CheckStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${styles[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label[status]}
    </span>
  );
}
