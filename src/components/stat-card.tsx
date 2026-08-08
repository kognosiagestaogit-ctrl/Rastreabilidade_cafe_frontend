import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: "default" | "success" | "warning" | "accent";
}) {
  const toneMap = {
    default: "bg-primary-soft text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/20 text-warning-foreground",
    accent: "bg-accent/15 text-accent",
  };
  return (
    <div className="flex flex-col justify-between rounded-xl border bg-card p-4 sm:p-5 shadow-sm min-w-0 overflow-hidden">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <p className="truncate text-xs sm:text-sm font-medium text-muted-foreground" title={label}>
          {label}
        </p>
        <div
          className={`grid h-9 w-9 sm:h-10 sm:w-10 shrink-0 place-items-center rounded-lg ${toneMap[tone]}`}
        >
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      </div>
      <p
        className="mt-3 text-lg sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground truncate min-w-0"
        title={String(value)}
      >
        {value}
      </p>
      {hint && (
        <p className="mt-1 truncate text-xs text-muted-foreground" title={hint}>
          {hint}
        </p>
      )}
    </div>
  );
}
