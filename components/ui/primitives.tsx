import type { ComponentPropsWithoutRef, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "icon";

export function buttonStyles({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-55",
    variant === "primary" && "bg-slate-900 !text-white hover:bg-slate-800 hover:!text-white",
    variant === "secondary" && "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
    variant === "danger" && "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
    variant === "ghost" && "bg-slate-100 text-slate-700 hover:bg-slate-200",
    size === "sm" && "min-h-10 px-3.5 text-sm",
    size === "md" && "min-h-11 px-4 text-sm",
    size === "icon" && "h-10 w-10",
    className,
  );
}

export function Button({
  className,
  variant,
  size,
  ...props
}: ComponentPropsWithoutRef<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return <button className={buttonStyles({ variant, size, className })} {...props} />;
}

export function Input({ className, ...props }: ComponentPropsWithoutRef<"input">) {
  return (
    <input
      className={cn(
        "min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-sky-700 focus-visible:ring-2 focus-visible:ring-sky-600/20",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: ComponentPropsWithoutRef<"select">) {
  return (
    <select
      className={cn(
        "min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-[15px] text-slate-900 outline-none transition focus:border-sky-700 focus-visible:ring-2 focus-visible:ring-sky-600/20",
        className,
      )}
      {...props}
    />
  );
}

export function TextArea({ className, ...props }: ComponentPropsWithoutRef<"textarea">) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-3 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-sky-700 focus-visible:ring-2 focus-visible:ring-sky-600/20",
        className,
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block space-y-2", className)}>
      <span className="text-sm font-medium text-slate-800">{label}</span>
      {children}
      {hint ? <span className="block text-sm text-slate-600">{hint}</span> : null}
    </label>
  );
}

export function Alert({
  className,
  tone = "error",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  tone?: "error" | "info";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3 text-sm",
        tone === "error" && "border-rose-200 bg-rose-50 text-rose-800",
        tone === "info" && "border-slate-200 bg-slate-50 text-slate-700",
        className,
      )}
      {...props}
    />
  );
}

export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-xl border border-slate-200 bg-white shadow-sm", className)}
      {...props}
    />
  );
}

export function PageIntro({
  eyebrow,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <Card className="px-5 py-5 sm:px-6 sm:py-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl space-y-2">
          {eyebrow ? (
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-700">{eyebrow}</p>
          ) : null}
          {description ? <p className="text-[15px] leading-7 text-slate-700">{description}</p> : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
    </Card>
  );
}
