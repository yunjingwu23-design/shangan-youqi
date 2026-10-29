import type { NextRequest } from "next/server";
import { cookieName } from "./security";
// Instance-local guard. Deployments should additionally enable platform rate limits.
const limits = new Map<string, { count: number; until: number }>();
let activeExports = 0;
export function consumeBudget(req: NextRequest) {
  const key = req.cookies.get(cookieName)!.value;
  const now = Date.now();
  for (const [k, v] of limits) if (v.until < now) limits.delete(k);
  const entry = limits.get(key) || { count: 0, until: now + 60000 };
  entry.count++;
  limits.set(key, entry);
  return entry.count <= 12;
}
export function reserveExport() {
  if (activeExports >= 2) return null;
  activeExports++;
  return () => {
    activeExports = Math.max(0, activeExports - 1);
  };
}
