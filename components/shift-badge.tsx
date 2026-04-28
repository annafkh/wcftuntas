import { SHIFT_COLOR_CLASSES, SHIFT_LABELS, type ShiftType } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ShiftBadge({
  shift,
  className,
}: {
  shift: ShiftType;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold",
        SHIFT_COLOR_CLASSES[shift],
        className,
      )}
    >
      {SHIFT_LABELS[shift]}
    </span>
  );
}
