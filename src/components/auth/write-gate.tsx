import type { ReactNode } from "react";
import { useStore } from "@/lib/store";

export function WriteGate({ children }: { children: ReactNode }) {
  const { can } = useStore();
  if (!can("write")) return null;
  return <>{children}</>;
}
