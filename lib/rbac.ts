import type { UserRole } from "@/lib/types";

export function getDefaultRoute(role: UserRole) {
  switch (role) {
    case "pt_wcf":
      return "/dashboard";
    case "pengawas":
      return "/approval";
    default:
      return "/tasks";
  }
}

export function ensureRole<T extends readonly UserRole[]>(role: UserRole, allowed: T) {
  return allowed.includes(role);
}
