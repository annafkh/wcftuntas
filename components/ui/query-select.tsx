"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { startTransition } from "react";
import { Select } from "@/components/ui/primitives";

export function QuerySelect({
  name,
  value,
  options,
  className,
}: {
  name: string;
  value: string;
  options: { label: string; value: string }[];
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <Select
      value={value}
      className={className}
      onChange={(event) => {
        const params = new URLSearchParams(searchParams.toString());
        const nextValue = event.target.value;

        if (nextValue) {
          params.set(name, nextValue);
        } else {
          params.delete(name);
        }

        if (name !== "page") {
          params.delete("page");
        }

        startTransition(() => {
          router.push(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`);
        });
      }}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  );
}
