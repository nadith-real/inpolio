import { useEffect } from "react";
import type { Appearance } from "@/types";

export function applyAppearance(appearance: Appearance) {
  const root = document.documentElement;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = appearance === "dark" || (appearance === "system" && prefersDark);
  root.classList.toggle("dark", dark);
}

export function useTheme(appearance: Appearance) {
  useEffect(() => {
    applyAppearance(appearance);
    if (appearance !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyAppearance("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [appearance]);
}
